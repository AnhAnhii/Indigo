
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, 
  SystemSettings, MenuItem, PrepTask,
  ServingGroup, ServingItem, SauceItem,
  HandoverLog, WorkSchedule, SystemAlert, RequestType,
  SystemLog, OnlineUser, Task, TaskStatus, Feedback, PayrollAdjustment
} from '../types';
import { supabase } from '../services/supabaseClient';
import { 
    supabaseService, 
    mapGroupFromDB, 
    mapTaskFromDB, 
    mapEmployeeFromDB, 
    mapLogFromDB, 
    mapFeedbackFromDB,
    mapMenuItemFromDB,
    mapRequestFromDB,
    mapAdjustmentFromDB
} from '../services/supabaseService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { analyzeFeedback } from '../services/geminiService';

interface GlobalContextType {
  employees: Employee[];
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  registerEmployeeFace: (id: string, image: string) => void;
  changePassword: (id: string, newPass: string) => void;
  
  logs: TimesheetLog[];
  addAttendanceLog: (log: TimesheetLog) => void;
  updateAttendanceLog: (log: TimesheetLog) => void;
  
  requests: EmployeeRequest[];
  addRequest: (req: EmployeeRequest) => void;
  updateRequestStatus: (id: string, status: RequestStatus) => void;
  
  settings: SystemSettings;
  updateSettings: (newSettings: SystemSettings) => void;

  menuItems: MenuItem[];
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;

  prepTasks: PrepTask[];
  addPrepTask: (task: PrepTask) => void;
  togglePrepTask: (id: string) => void;
  deletePrepTask: (id: string) => void;
  
  servingGroups: ServingGroup[];
  addServingGroup: (group: ServingGroup) => void;
  updateServingGroup: (groupId: string, updates: Partial<ServingGroup>) => void;
  deleteServingGroup: (groupId: string) => void; 
  startServingGroup: (groupId: string) => void; 
  addServingItem: (groupId: string, item: ServingItem) => void;
  updateServingItem: (groupId: string, itemId: string, updates: Partial<ServingItem>) => void;
  deleteServingItem: (groupId: string, itemId: string) => void;
  incrementServedItem: (groupId: string, itemId: string) => void;
  decrementServedItem: (groupId: string, itemId: string) => void;
  adjustServingItemQuantity: (groupId: string, itemId: string, delta: number) => void;
  completeServingGroup: (groupId: string) => void;

  toggleSauceItem: (groupId: string, sauceName: string) => void;

  handoverLogs: HandoverLog[];
  addHandoverLog: (log: HandoverLog) => void;
  togglePinHandover: (id: string) => void;

  schedules: WorkSchedule[];
  assignShift: (employeeId: string, date: string, shiftCode: string) => void;
  
  tasks: Task[];
  addTask: (task: Task) => void;
  claimTask: (taskId: string, employeeId: string, participantIds?: string[]) => void;
  submitTaskProof: (taskId: string, proofImage: string) => void;
  verifyTask: (taskId: string, managerId: string) => void;
  rejectTask: (taskId: string, reason: string, penalty: number) => void;
  deleteTask: (taskId: string) => void;

  feedbacks: Feedback[];
  submitFeedback: (data: any) => Promise<void>;
  trackReviewClick: (staffId: string) => Promise<void>; 

  payrollAdjustments: PayrollAdjustment[];
  addPayrollAdjustment: (adj: PayrollAdjustment) => void;
  deletePayrollAdjustment: (id: string) => void;

  activeAlerts: SystemAlert[];
  dismissedAlertIds: Set<string>; 
  dismissAlert: (id: string) => void;

  currentUser: Employee | null;
  login: (idOrPhone: string, pass: string) => boolean;
  logout: () => void;

  isLoading: boolean;
  isRestoringSession: boolean; 
  lastUpdated: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  reloadData: () => void;
  testNotification: () => void;
  requestNotificationPermission: () => Promise<string>; 
  unlockAudio: () => void;
  notificationPermissionStatus: NotificationPermission;
  
  submitGuestOrder: (tableId: string, cartItems: {item: MenuItem, quantity: number}[], guestCount: number, note: string) => Promise<void>;
  requestAssistance: (tableId: string, type: string) => void;

  onlineUsers: OnlineUser[];
  systemLogs: SystemLog[];
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

const INITIAL_SETTINGS: SystemSettings = {
    location: { latitude: 21.0285, longitude: 105.8542, radiusMeters: 100, name: "Nhà hàng Trung tâm" },
    wifis: [],
    rules: { allowedLateMinutes: 15 },
    servingConfig: { lateAlertMinutes: 15 },
    shiftConfigs: [],
    notificationConfig: {
        enableGuestArrival: true,
        enableStaffRequest: true,
        enableHandover: true,
        enableSystemAlert: true
    },
    timeConfig: {
        ntpServer: 'pool.ntp.org',
        timezone: 'Asia/Ho_Chi_Minh'
    }
};

const STORAGE_SESSION_KEY = 'RS_SESSION_V2';
const SESSION_DURATION_DAYS = 7;

const calculateRpgLevel = (xp: number) => {
    return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
};

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true); 
  const [lastUpdated, setLastUpdated] = useState<string>('--:--');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('CONNECTING');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<TimesheetLog[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [servingGroups, setServingGroups] = useState<ServingGroup[]>([]);
  const [handoverLogs, setHandoverLogs] = useState<HandoverLog[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<PayrollAdjustment[]>([]);
  
  const [activeAlerts, setActiveAlerts] = useState<SystemAlert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null); 
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission>('default');

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const currentUserRef = useRef(currentUser);
  const servingGroupsRef = useRef(servingGroups);
  const settingsRef = useRef(settings); 
  const tasksRef = useRef(tasks);
  const employeesRef = useRef(employees);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

  const unlockAudio = useCallback(() => {
      if (audioUnlockedRef.current) return;
      try {
          // @ts-ignore
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
              if (!audioContextRef.current) {
                  audioContextRef.current = new AudioContextClass();
              }
              const ctx = audioContextRef.current;
              if (ctx) {
                  if (ctx.state === 'suspended') {
                      ctx.resume().then(() => {
                          console.log("AudioContext resumed successfully");
                          audioUnlockedRef.current = true;
                      }).catch(e => console.warn("Audio resume failed:", e));
                  } else if (ctx.state === 'running') {
                       audioUnlockedRef.current = true;
                  }
                  const buffer = ctx.createBuffer(1, 1, 22050);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.start(0);
              }
          }
      } catch (e) { console.warn("Audio unlock failed:", e); }
  }, []);

  useEffect(() => {
      const handleUserInteraction = () => {
          unlockAudio();
          if (audioUnlockedRef.current) {
              window.removeEventListener('click', handleUserInteraction);
              window.removeEventListener('touchstart', handleUserInteraction);
              window.removeEventListener('keydown', handleUserInteraction);
          }
      };
      window.addEventListener('click', handleUserInteraction);
      window.addEventListener('touchstart', handleUserInteraction);
      window.addEventListener('keydown', handleUserInteraction);
      if (typeof Notification !== 'undefined') setNotificationPermissionStatus(Notification.permission);
      return () => {
          window.removeEventListener('click', handleUserInteraction);
          window.removeEventListener('touchstart', handleUserInteraction);
          window.removeEventListener('keydown', handleUserInteraction);
      };
  }, [unlockAudio]);

  const playSound = (type: 'ALERT' | 'SUCCESS' | 'ERROR' = 'ALERT') => {
      try {
          if (!audioContextRef.current) unlockAudio();
          const ctx = audioContextRef.current;
          if (ctx && ctx.state === 'running') {
              const oscillator = ctx.createOscillator();
              const gainNode = ctx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(ctx.destination);
              if (type === 'SUCCESS') {
                  oscillator.type = 'sine';
                  oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
                  oscillator.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.1);
                  oscillator.frequency.linearRampToValueAtTime(783.99, ctx.currentTime + 0.2);
                  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.6);
                  oscillator.start(); oscillator.stop(ctx.currentTime + 0.6);
              } else if (type === 'ERROR') {
                  oscillator.type = 'sawtooth';
                  oscillator.frequency.setValueAtTime(150, ctx.currentTime);
                  oscillator.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
                  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.4);
                  oscillator.start(); oscillator.stop(ctx.currentTime + 0.4);
              } else {
                  // ALERT: Repeated Beep
                  oscillator.type = 'square'; 
                  oscillator.frequency.setValueAtTime(880, ctx.currentTime); 
                  oscillator.frequency.setValueAtTime(0, ctx.currentTime + 0.1);
                  oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
                  oscillator.frequency.setValueAtTime(0, ctx.currentTime + 0.3);
                  oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
                  
                  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
                  oscillator.start(); oscillator.stop(ctx.currentTime + 0.6);
              }
          } else { unlockAudio(); }
      } catch (e) {}
  };

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { servingGroupsRef.current = servingGroups; }, [servingGroups]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);

  const addSystemLog = (event: string, details: string, type: 'INFO' | 'WARNING' | 'ERROR' | 'DB_CHANGE') => {
      setSystemLogs(prev => [{
          id: Date.now().toString() + Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          event, details, type
      }, ...prev].slice(0, 100));
  };

  const dispatchNotification = async (title: string, body: string, type: 'ALERT' | 'SUCCESS' | 'ERROR' = 'ALERT') => {
      console.log(`[Notification] ${title}: ${body}`);
      playSound(type); 
      
      if (Notification.permission !== 'granted') return;
      
      const tag = 'indigo-' + Date.now();
      const options: NotificationOptions = {
          body: body,
          icon: 'https://github.com/AnhAnhii/png/blob/main/487238068_1200682658427927_3815163928792374270_n-removebg-preview.png?raw=true',
          badge: 'https://github.com/AnhAnhii/png/blob/main/487238068_1200682658427927_3815163928792374270_n-removebg-preview.png?raw=true',
          tag: tag, 
          requireInteraction: true,
          silent: false
      };

      // Try Service Worker first (Better for Mobile)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
              navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag });
              return;
          } catch(e) { console.error("SW notification failed, falling back", e); }
      }
      
      // Fallback to native
      try { 
          const n = new Notification(title, options); 
          n.onclick = () => { window.focus(); n.close(); }; 
      } catch (e) { console.error("Native notification failed", e); }
  };

  const requestNotificationPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
          try {
              unlockAudio();
              const result = await Notification.requestPermission();
              setNotificationPermissionStatus(result);
              if (result === 'granted') playSound();
              return result;
          } catch (e) { return 'denied'; }
      }
      return 'denied';
  };

  const testNotification = async () => {
      try {
          unlockAudio();
          const permission = await requestNotificationPermission();
          if (permission === 'granted') {
              dispatchNotification("🔔 TEST HỆ THỐNG", "Hệ thống thông báo hoạt động tốt.");
              alert("Đã gửi lệnh thông báo test.");
          } else {
              alert("Quyền thông báo bị chặn. Vui lòng mở lại trong cài đặt trình duyệt.");
          }
      } catch (e: any) { alert("Lỗi: " + e.message); }
  };

  const loadData = useCallback(async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      try {
          const data = await supabaseService.fetchAllData();
          const processedEmployees = data.employees.map(e => e.id === 'admin' ? { ...e, role: EmployeeRole.DEV } : e);
          setEmployees(processedEmployees);
          setLogs(data.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          setRequests(data.requests);
          setServingGroups(data.servingGroups);
          setHandoverLogs(data.handoverLogs.sort((a: HandoverLog, b: HandoverLog) => {
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              return new Date(b.date).getTime() - new Date(a.date).getTime();
          }));
          setSchedules(data.schedules);
          setPrepTasks(data.prepTasks);
          setTasks(data.tasks); 
          setFeedbacks(data.feedbacks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          setMenuItems(data.menuItems);
          setPayrollAdjustments(data.adjustments);

          if (data.settings && Object.keys(data.settings).length > 0) setSettings(prev => ({...INITIAL_SETTINGS, ...data.settings}));
          const dismissedSet = new Set<string>(data.dismissedAlerts.map((a: any) => String(a.id)));
          setDismissedAlertIds(dismissedSet);
          if (!isBackground) setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
          return processedEmployees; 
      } catch (error) {
          console.error("Sync Error:", error);
          return [];
      } finally {
          if (!isBackground) setIsLoading(false);
      }
  }, []);

  useEffect(() => {
      const initApp = async () => {
          const loadedEmployees = await loadData(false);
          const sessionJson = localStorage.getItem(STORAGE_SESSION_KEY);
          if (sessionJson) {
              try {
                  const session = JSON.parse(sessionJson);
                  if (Date.now() - session.timestamp < SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000) {
                      const user = loadedEmployees.find(e => e.id === session.userId);
                      if (user) setCurrentUser(user);
                  } else { localStorage.removeItem(STORAGE_SESSION_KEY); }
              } catch (e) { localStorage.removeItem(STORAGE_SESSION_KEY); }
          }
          setIsRestoringSession(false);
      };
      initApp();

      const channel = supabase.channel('app-db-changes');
      channelRef.current = channel;

      channel
          .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: OnlineUser[] = [];
            for (const key in newState) {
                (newState[key] as any[]).forEach(p => users.push({ userId: p.user_id, name: p.name, role: p.role, onlineAt: p.online_at, platform: p.platform }));
            }
            setOnlineUsers(users.sort((a, b) => new Date(b.onlineAt).getTime() - new Date(a.onlineAt).getTime()));
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => newPresences.forEach((p: any) => addSystemLog('USER_ONLINE', `${p.name} vừa truy cập`, 'INFO')))
          .on('presence', { event: 'leave' }, ({ leftPresences }) => leftPresences.forEach((p: any) => addSystemLog('USER_OFFLINE', `${p.name} rời đi`, 'INFO')))
          .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
              addSystemLog('DB_CHANGE', `${payload.table} : ${payload.eventType}`, 'DB_CHANGE');
              const config = settingsRef.current.notificationConfig || INITIAL_SETTINGS.notificationConfig;
              const { table, eventType, new: newRecord, old: oldRecord } = payload;

              if (table === 'serving_groups') {
                  if (eventType === 'DELETE') {
                      setServingGroups(prev => prev.filter(g => g.id !== oldRecord.id));
                  } else {
                      const mappedGroup = mapGroupFromDB(newRecord);
                      
                      // Notification Logic
                      if (eventType === 'INSERT') {
                          if (config.enableGuestArrival) dispatchNotification("🔔 ĐÃ THÊM ĐOÀN MỚI", `Đoàn: ${mappedGroup.name}\nBàn: ${mappedGroup.location}`);
                      } else if (eventType === 'UPDATE') {
                          const oldGroupLocal = servingGroupsRef.current.find(g => String(g.id) === String(mappedGroup.id));
                          if (config.enableGuestArrival && !!mappedGroup.startTime && (!oldGroupLocal || oldGroupLocal.startTime !== mappedGroup.startTime)) {
                              dispatchNotification("🚀 KHÁCH ĐÃ ĐẾN", `Đoàn: ${mappedGroup.name}\nBàn: ${mappedGroup.location}`);
                          }
                          if (oldGroupLocal) {
                              const oldQty = oldGroupLocal.items.reduce((sum, i) => sum + i.totalQuantity, 0);
                              const newQty = mappedGroup.items.reduce((sum, i) => sum + i.totalQuantity, 0);
                              if (newQty > oldQty) dispatchNotification("🍳 KHÁCH GỌI MÓN", `Bàn ${mappedGroup.location}: Khách vừa đặt thêm món.`, 'ALERT');
                          }
                      }

                      // SIMPLE MERGE: ALWAYS TRUST SERVER
                      setServingGroups(prev => {
                          if (eventType === 'INSERT') {
                              if (prev.some(g => g.id === mappedGroup.id)) return prev;
                              return [mappedGroup, ...prev];
                          }
                          return prev.map(g => g.id === mappedGroup.id ? mappedGroup : g);
                      });
                  }
              }
              else if (table === 'feedback') {
                  const mappedFeedback = mapFeedbackFromDB(newRecord);
                  if (eventType === 'INSERT') {
                      setFeedbacks(prev => prev.some(f => f.id === mappedFeedback.id) ? prev : [mappedFeedback, ...prev]);
                      if (mappedFeedback.type === 'CALL_WAITER') {
                          const alertMsg = `Bàn: ${mappedFeedback.customerName} - ${mappedFeedback.comment}`;
                          dispatchNotification("🔔 KHÁCH GỌI", alertMsg, 'ERROR'); 
                          setActiveAlerts(prev => [{ id: `call_${mappedFeedback.id}`, type: 'GUEST_CALL', message: "KHÁCH GỌI HỖ TRỢ", details: alertMsg, severity: 'HIGH', timestamp: new Date().toLocaleTimeString('vi-VN') }, ...prev]);
                      } else if (mappedFeedback.type === 'INTERNAL_FEEDBACK') {
                          if ((mappedFeedback.rating || 0) <= 2 || mappedFeedback.sentiment === 'NEGATIVE') {
                              dispatchNotification("🚨 BÁO ĐỘNG ĐỎ", `Khách đánh giá thấp: ${mappedFeedback.rating} sao`, 'ERROR');
                          }
                      }
                  }
              }
              else if (table === 'tasks') {
                  if (eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== oldRecord.id));
                  else {
                      const mappedTask = mapTaskFromDB(newRecord);
                      setTasks(prev => eventType === 'INSERT' 
                          ? (prev.some(t => t.id === mappedTask.id) ? prev : [mappedTask, ...prev]) 
                          : prev.map(t => t.id === mappedTask.id ? mappedTask : t));
                  }
              }
              else if (table === 'employees') {
                  if (eventType === 'DELETE') setEmployees(prev => prev.filter(e => e.id !== oldRecord.id));
                  else {
                      const mappedEmp = mapEmployeeFromDB(newRecord);
                      if (mappedEmp.id === 'admin') mappedEmp.role = EmployeeRole.DEV;
                      setEmployees(prev => eventType === 'INSERT' 
                          ? (prev.some(e => e.id === mappedEmp.id) ? prev : [...prev, mappedEmp]) 
                          : prev.map(e => e.id === mappedEmp.id ? mappedEmp : e));
                      if (currentUserRef.current?.id === mappedEmp.id) setCurrentUser(mappedEmp);
                  }
              }
              else if (table === 'attendance_logs') {
                  if (eventType !== 'DELETE') {
                      const mappedLog = mapLogFromDB(newRecord);
                      setLogs(prev => eventType === 'INSERT' 
                          ? (prev.some(l => l.id === mappedLog.id) ? prev : [mappedLog, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())) 
                          : prev.map(l => l.id === mappedLog.id ? mappedLog : l));
                  }
              }
              else if (table === 'payroll_adjustments') {
                  if (eventType === 'DELETE') setPayrollAdjustments(prev => prev.filter(a => a.id !== oldRecord.id));
                  else {
                      const mappedAdj = mapAdjustmentFromDB(newRecord);
                      setPayrollAdjustments(prev => eventType === 'INSERT' 
                          ? (prev.some(a => a.id === mappedAdj.id) ? prev : [...prev, mappedAdj]) 
                          : prev.map(a => a.id === mappedAdj.id ? mappedAdj : a));
                  }
              }
              else if (table === 'requests') {
                  const mappedReq = mapRequestFromDB(newRecord);
                  if(eventType === 'INSERT') {
                      setRequests(prev => prev.some(r => r.id === mappedReq.id) ? prev : [mappedReq, ...prev]);
                      if (config.enableStaffRequest) dispatchNotification("📝 ĐƠN TỪ MỚI", `${mappedReq.employeeName} gửi đơn ${mappedReq.type}`);
                  } else if (eventType === 'UPDATE') {
                      setRequests(prev => prev.map(r => r.id === mappedReq.id ? mappedReq : r));
                  }
              }
          })
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                setConnectionStatus('CONNECTED');
                addSystemLog('SYSTEM', 'Connected to Realtime Server', 'INFO');
              } else setConnectionStatus(status === 'CLOSED' ? 'DISCONNECTED' : 'CONNECTING');
          });
      return () => { supabase.removeChannel(channel); };
  }, []); 

  useEffect(() => {
      if (currentUser && channelRef.current) {
          const trackPresence = async () => {
              await channelRef.current?.track({
                  user_id: currentUser.id,
                  name: currentUser.name,
                  role: currentUser.role,
                  online_at: new Date().toISOString(),
                  platform: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
              });
          };
          trackPresence();
      }
  }, [currentUser, connectionStatus]);

  // --- CRUD HELPERS ---
  const addEmployee = (e: Employee) => { setEmployees(prev => [...prev, e]); supabaseService.upsertEmployee(e); };
  const updateEmployee = (e: Employee) => { setEmployees(prev => prev.map(x => x.id === e.id ? e : x)); if (currentUser?.id === e.id) setCurrentUser(e); supabaseService.upsertEmployee(e); };
  const deleteEmployee = (id: string) => { setEmployees(prev => prev.filter(x => x.id !== id)); supabaseService.deleteEmployee(id); };
  const registerEmployeeFace = (id: string, img: string) => { const emp = employees.find(e => e.id === id); if (emp) updateEmployee({ ...emp, avatar: img }); };
  const changePassword = (id: string, newPass: string) => { const emp = employees.find(e => e.id === id); if (emp) updateEmployee({ ...emp, password: newPass }); };
  const addAttendanceLog = (log: TimesheetLog) => { setLogs(prev => [log, ...prev]); supabaseService.upsertLog(log); };
  const updateAttendanceLog = (log: TimesheetLog) => { setLogs(prev => prev.map(l => l.id === log.id ? log : l)); supabaseService.upsertLog(log); };
  const addRequest = (req: EmployeeRequest) => { setRequests(prev => [req, ...prev]); supabaseService.upsertRequest(req); };
  
  const updateRequestStatus = (id: string, status: RequestStatus) => { 
      const req = requests.find(r => r.id === id); 
      if (req && currentUser) { 
          const updated = { 
              ...req, 
              status, 
              approvedBy: currentUser.name, 
              approvedAt: new Date().toLocaleString('vi-VN') 
          }; 
          setRequests(prev => prev.map(r => r.id === id ? updated : r)); 
          supabaseService.upsertRequest(updated); 
          if (status === RequestStatus.APPROVED) {
              if (req.type === RequestType.LEAVE) assignShift(req.employeeId, req.date, 'OFF');
              else if (req.type === RequestType.SHIFT_SWAP && req.targetShift) assignShift(req.employeeId, req.date, req.targetShift);
          }
      } 
  };

  const updateSettings = (s: SystemSettings) => { setSettings(s); supabaseService.saveSettings(s); };
  const addServingGroup = (group: ServingGroup) => { const prepList = generatePrepList(group); const newGroup = { ...group, prepList }; setServingGroups(prev => [newGroup, ...prev]); supabaseService.upsertServingGroup(newGroup); };
  const deleteServingGroup = (id: string) => { setServingGroups(prev => prev.filter(g => g.id !== id)); supabaseService.deleteServingGroup(id); };
  
  // SIMPLIFIED MODIFY GROUP - OPTIMISTIC UPDATE + DIRECT SAVE
  const modifyGroup = useCallback(async (groupId: string, modifier: (g: ServingGroup) => ServingGroup) => {
      let updatedGroup: ServingGroup | undefined;
      
      // 1. Optimistic Update (Immediate UI feedback)
      setServingGroups(prev => prev.map(g => { 
          if (g.id !== groupId) return g; 
          updatedGroup = modifier(g);
          return updatedGroup; 
      }));

      // 2. Fire & Forget Save (No complex debouncing/locking here, relying on UI debounce)
      if (updatedGroup) {
          try {
              await supabaseService.upsertServingGroup(updatedGroup);
          } catch (e) {
              console.error("DB Save Error:", e);
              // In a more complex app, we might revert state here, but for now we assume eventual consistency via realtime
          }
      }
  }, []);

  const updateServingGroup = (id: string, updates: Partial<ServingGroup>) => modifyGroup(id, g => ({ ...g, ...updates }));
  
  const startServingGroup = (id: string) => {
      const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      const group = servingGroups.find(g => g.id === id);
      if (group) dispatchNotification("🚀 KHÁCH ĐÃ ĐẾN", `Đoàn: ${group.name}\nBàn: ${group.location}`, 'SUCCESS');
      modifyGroup(id, g => ({ ...g, startTime: time }));
  };

  const addServingItem = (gId: string, item: ServingItem) => modifyGroup(gId, g => ({ ...g, items: [...g.items, item] }));
  const updateServingItem = (gId: string, iId: string, ups: Partial<ServingItem>) => modifyGroup(gId, g => ({ ...g, items: g.items.map(i => i.id === iId ? { ...i, ...ups } : i) }));
  const deleteServingItem = (gId: string, iId: string) => modifyGroup(gId, g => ({ ...g, items: g.items.filter(i => i.id !== iId) }));
  
  const incrementServedItem = (gId: string, iId: string) => adjustServingItemQuantity(gId, iId, 1);
  const decrementServedItem = (gId: string, iId: string) => adjustServingItemQuantity(gId, iId, -1);
  
  // ADJUST QUANTITY - Simple Optimistic + Save
  const adjustServingItemQuantity = (gId: string, iId: string, delta: number) => {
      modifyGroup(gId, g => ({ 
          ...g, 
          items: g.items.map(i => i.id === iId ? { ...i, servedQuantity: Math.max(0, i.servedQuantity + delta) } : i) 
      }));
  };

  const completeServingGroup = (id: string) => { 
      const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false}); 
      modifyGroup(id, g => ({ ...g, status: 'COMPLETED', completionTime: time })); 
  };
  
  const toggleSauceItem = (gId: string, sName: string) => modifyGroup(gId, g => g.prepList ? { ...g, prepList: g.prepList.map(s => s.name === sName ? { ...s, isCompleted: !s.isCompleted } : s) } : g);
  
  const addHandoverLog = (log: HandoverLog) => { setHandoverLogs(prev => [log, ...prev]); supabaseService.addHandover(log); };
  const togglePinHandover = (id: string) => { 
      const log = handoverLogs.find(l => l.id === id);
      if(log) {
          const updated = { ...log, isPinned: !log.isPinned };
          setHandoverLogs(prev => prev.map(l => l.id === id ? updated : l).sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return new Date(b.date).getTime() - new Date(a.date).getTime(); }));
          supabaseService.addHandover(updated); 
      }
  };

  const assignShift = (employeeId: string, date: string, shiftCode: string) => { const s: WorkSchedule = { id: `${employeeId}_${date}`, employeeId, date, shiftCode }; setSchedules(prev => [...prev.filter(x => x.id !== s.id), s]); supabaseService.upsertSchedule(s); };
  const dismissAlert = (id: string) => { setDismissedAlertIds(prev => new Set(prev).add(id)); supabaseService.dismissAlert(id); };
  const addPrepTask = (task: PrepTask) => { setPrepTasks(prev => [task, ...prev]); supabaseService.upsertPrepTask(task); };
  const togglePrepTask = (id: string) => { const t = prepTasks.find(x => x.id === id); if (t) { const u = { ...t, isCompleted: !t.isCompleted }; setPrepTasks(prev => prev.map(x => x.id === id ? u : x)); supabaseService.upsertPrepTask(u); } };
  const deletePrepTask = (id: string) => { setPrepTasks(prev => prev.filter(x => x.id !== id)); supabaseService.deletePrepTask(id); };
  const addMenuItem = (item: MenuItem) => { setMenuItems(prev => [...prev, item]); supabaseService.upsertMenuItem(item); };
  const updateMenuItem = (item: MenuItem) => { setMenuItems(prev => prev.map(i => i.id === item.id ? item : i)); supabaseService.upsertMenuItem(item); };
  const deleteMenuItem = (id: string) => { setMenuItems(prev => prev.filter(i => i.id !== id)); supabaseService.deleteMenuItem(id); };
  const addTask = (task: Task) => { setTasks(prev => [task, ...prev]); supabaseService.upsertTask(task); };
  
  const addPayrollAdjustment = (adj: PayrollAdjustment) => { setPayrollAdjustments(prev => [...prev, adj]); supabaseService.upsertAdjustment(adj); };
  const deletePayrollAdjustment = (id: string) => { setPayrollAdjustments(prev => prev.filter(a => a.id !== id)); supabaseService.deleteAdjustment(id); };

  const claimTask = (taskId: string, employeeId: string, participantIds: string[] = []) => { const task = tasks.find(t => t.id === taskId); const employee = employees.find(e => e.id === employeeId); if (task && task.status === TaskStatus.OPEN && employee) { const allParticipants = [employeeId, ...participantIds]; const updated = { ...task, status: TaskStatus.IN_PROGRESS, assigneeId: employeeId, assigneeName: employee.name, participants: allParticipants }; setTasks(prev => prev.map(t => t.id === taskId ? updated : t)); supabaseService.upsertTask(updated); if (currentUser?.id === employeeId) dispatchNotification("🚀 ĐÃ NHẬN VIỆC", `Bạn đã nhận nhiệm vụ "${task.title}"`, 'SUCCESS'); } };
  const submitTaskProof = (taskId: string, proofImage: string) => { const task = tasks.find(t => t.id === taskId); if (task) { const updated = { ...task, status: TaskStatus.COMPLETED, proofImage }; setTasks(prev => prev.map(t => t.id === taskId ? updated : t)); supabaseService.upsertTask(updated); } };
  const verifyTask = (taskId: string, managerId: string) => { const task = tasksRef.current.find(t => t.id === taskId); if (task && task.status === TaskStatus.COMPLETED) { const updated = { ...task, status: TaskStatus.VERIFIED, verifiedBy: managerId }; setTasks(prev => prev.map(t => t.id === taskId ? updated : t)); supabaseService.upsertTask(updated); const recipients = task.participants && task.participants.length > 0 ? task.participants : (task.assigneeId ? [task.assigneeId] : []); recipients.forEach(empId => { const emp = employeesRef.current.find(e => e.id === empId); if (emp) { const currentXp = (emp.xp || 0); const newXp = currentXp + task.xpReward; const newLevel = calculateRpgLevel(newXp); const updatedEmp = { ...emp, xp: newXp, level: newLevel }; updateEmployee(updatedEmp); if (empId === currentUserRef.current?.id) dispatchNotification("🎉 CHÚC MỪNG!", `Bạn nhận được +${task.xpReward} XP.`, 'SUCCESS'); } }); } };
  const rejectTask = (taskId: string, reason: string, penalty: number) => { const task = tasksRef.current.find(t => t.id === taskId); if (task) { const updated = { ...task, status: TaskStatus.REJECTED, rejectionReason: reason, penaltyXp: penalty }; setTasks(prev => prev.map(t => t.id === taskId ? updated : t)); supabaseService.upsertTask(updated); const recipients = task.participants && task.participants.length > 0 ? task.participants : (task.assigneeId ? [task.assigneeId] : []); recipients.forEach(empId => { const emp = employeesRef.current.find(e => e.id === empId); if (emp && penalty > 0) { const currentXp = emp.xp || 0; const newXp = Math.max(0, currentXp - penalty); const newLevel = calculateRpgLevel(newXp); const updatedEmp = { ...emp, xp: newXp, level: newLevel }; updateEmployee(updatedEmp); } }); } };
  const deleteTask = (taskId: string) => { setTasks(prev => prev.filter(t => t.id !== taskId)); supabaseService.deleteTask(taskId); }
  const submitFeedback = async (data: any) => { const aiAnalysis = await analyzeFeedback(data.comment || '', data.rating); const newFeedback: Feedback = { id: Date.now().toString(), type: 'INTERNAL_FEEDBACK', customerName: data.name, phone: data.phone, rating: data.rating, npsScore: data.npsScore, comment: data.comment, tags: aiAnalysis.tags, sentiment: aiAnalysis.sentiment, createdAt: new Date().toISOString(), isResolved: data.rating > 2, staffId: '', staffName: '' }; setFeedbacks(prev => [newFeedback, ...prev]); supabaseService.upsertFeedback(newFeedback); if (newFeedback.rating <= 2 || newFeedback.sentiment === 'NEGATIVE') dispatchNotification("🚨 BÁO ĐỘNG ĐỎ", `Khách đánh giá thấp: ${newFeedback.rating} sao`, 'ERROR'); };
  const trackReviewClick = async (staffId: string) => { const staff = employees.find(e => e.id === staffId); const newRecord: Feedback = { id: Date.now().toString(), type: 'GOOGLE_REVIEW_CLICK', createdAt: new Date().toISOString(), isResolved: true, staffId: staffId, staffName: staff?.name, rating: 5 }; setFeedbacks(prev => [newRecord, ...prev]); await supabaseService.upsertFeedback(newRecord); };
  const requestAssistance = (tableId: string, type: string) => { const newFeedback: Feedback = { id: Date.now().toString(), type: 'CALL_WAITER', customerName: `Bàn ${tableId}`, comment: type, createdAt: new Date().toISOString(), isResolved: false }; supabaseService.upsertFeedback(newFeedback); };
  
  const submitGuestOrder = async (tableId: string, cartItems: {item: MenuItem, quantity: number}[], guestCount: number, note: string) => {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      const newItems: ServingItem[] = cartItems.map((cartItem, idx) => ({ id: `${Date.now()}_${idx}`, name: cartItem.item.name, totalQuantity: cartItem.quantity, servedQuantity: 0, unit: cartItem.item.unit || 'Phần', note: 'Khách tự gọi' }));
      const existingGroup = servingGroups.find(g => g.status === 'ACTIVE' && g.location === tableId && g.date === todayStr);
      const nameSuffix = note ? ` (${note})` : '';
      if (existingGroup) { 
          const updatedItems = [...existingGroup.items, ...newItems]; 
          const newGuestCount = guestCount > 0 ? guestCount : existingGroup.guestCount; 
          modifyGroup(existingGroup.id, g => ({ ...g, items: updatedItems, guestCount: newGuestCount, name: g.name.includes('(') ? g.name : `${g.name}${nameSuffix}` })); 
      } 
      else { const newGroup: ServingGroup = { id: Date.now().toString(), name: `Khách bàn ${tableId}${nameSuffix}`, location: tableId, guestCount: guestCount || 0, startTime: timeStr, date: todayStr, status: 'ACTIVE', items: newItems, tableCount: 1, tableSplit: '' }; addServingGroup(newGroup); }
  };

  const login = (idOrPhone: string, pass: string) => { const cleanInput = idOrPhone.replace(/\D/g, ''); const user = employees.find(e => { if (e.password !== pass) return false; if (e.id === idOrPhone) return true; const empPhone = e.phone.replace(/\D/g, ''); return cleanInput && empPhone && cleanInput === empPhone; }); if (user) { const finalUser = user.id === 'admin' ? { ...user, role: EmployeeRole.DEV } : user; setCurrentUser(finalUser); localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ userId: user.id, timestamp: Date.now() })); return true; } return false; };
  const logout = () => { setCurrentUser(null); localStorage.removeItem(STORAGE_SESSION_KEY); };
  const generatePrepList = (group: ServingGroup): SauceItem[] => { const tableCount = group.tableCount || Math.ceil(group.guestCount / 6); const itemsLower = group.items.map(i => i.name.toLowerCase()); return [{ name: "Xì dầu", quantity: tableCount, unit: "Bát", isCompleted: false }, { name: "Nước mắm", quantity: tableCount * 2, unit: "Bát", isCompleted: false }, ...(itemsLower.some(n => n.includes('lẩu')) ? [{ name: "Bếp ga", quantity: tableCount, unit: "Chiếc", isCompleted: false }] : [])]; };

  return (
    <GlobalContext.Provider value={{ 
      employees, addEmployee, updateEmployee, deleteEmployee, registerEmployeeFace, changePassword,
      logs, addAttendanceLog, updateAttendanceLog,
      requests, addRequest, updateRequestStatus,
      settings, updateSettings,
      menuItems, addMenuItem, updateMenuItem, deleteMenuItem,
      prepTasks, addPrepTask, togglePrepTask, deletePrepTask,
      servingGroups, addServingGroup, updateServingGroup, deleteServingGroup, startServingGroup, 
      addServingItem, updateServingItem, deleteServingItem, incrementServedItem, decrementServedItem, adjustServingItemQuantity, completeServingGroup, toggleSauceItem,
      handoverLogs, addHandoverLog, togglePinHandover,
      schedules, assignShift, 
      tasks, addTask, claimTask, submitTaskProof, verifyTask, rejectTask, deleteTask,
      feedbacks, submitFeedback, trackReviewClick,
      payrollAdjustments, addPayrollAdjustment, deletePayrollAdjustment,
      activeAlerts, dismissedAlertIds, dismissAlert,
      currentUser, login, logout,
      isLoading, isRestoringSession, lastUpdated, connectionStatus,
      reloadData: () => loadData(false),
      testNotification, requestNotificationPermission, unlockAudio, notificationPermissionStatus,
      submitGuestOrder, requestAssistance,
      onlineUsers, systemLogs
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
