
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, 
  SystemSettings, MenuItem, PrepTask,
  ServingGroup, ServingItem, SauceItem,
  HandoverLog, WorkSchedule, SystemAlert, RequestType
} from '../types';
import { supabase } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';

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
  completeServingGroup: (groupId: string) => void;

  toggleSauceItem: (groupId: string, sauceName: string) => void;

  handoverLogs: HandoverLog[];
  addHandoverLog: (log: HandoverLog) => void;

  schedules: WorkSchedule[];
  assignShift: (employeeId: string, date: string, shiftCode: string) => void;

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
  unlockAudio: () => void; // NEW FUNCTION
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
    }
};

const STORAGE_SESSION_KEY = 'RS_SESSION_V2';
const SESSION_DURATION_DAYS = 7;

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
  
  const [activeAlerts, setActiveAlerts] = useState<SystemAlert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null); 

  // Refs for Access inside Callbacks/Intervals without Staleness
  const currentUserRef = useRef(currentUser);
  const servingGroupsRef = useRef(servingGroups);
  const settingsRef = useRef(settings); 

  // --- AUDIO CONTEXT SYSTEM (FIX FOR IOS) ---
  const audioContextRef = useRef<AudioContext | null>(null);

  const unlockAudio = useCallback(() => {
      try {
          if (!audioContextRef.current) {
              // @ts-ignore
              const AudioContextClass = window.AudioContext || window.webkitAudioContext;
              if (AudioContextClass) {
                  audioContextRef.current = new AudioContextClass();
              }
          }
          const ctx = audioContextRef.current;
          if (ctx) {
              if (ctx.state === 'suspended') {
                  ctx.resume();
              }
              // Play a silent buffer to unlock the audio engine on iOS
              const buffer = ctx.createBuffer(1, 1, 22050);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(0);
          }
      } catch (e) {
          console.warn("Audio unlock failed:", e);
      }
  }, []);

  const playSound = () => {
      try {
          if (!audioContextRef.current) unlockAudio();
          
          const ctx = audioContextRef.current;
          if (ctx && ctx.state === 'running') {
              const oscillator = ctx.createOscillator();
              const gainNode = ctx.createGain();

              oscillator.connect(gainNode);
              gainNode.connect(ctx.destination);

              // Sound Config: High pitch beep
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(880, ctx.currentTime); 
              oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
              
              gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);

              oscillator.start();
              oscillator.stop(ctx.currentTime + 0.5);
          }
      } catch (e) { 
          console.warn("Sound play error (Oscillator):", e); 
      }
  };

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { servingGroupsRef.current = servingGroups; }, [servingGroups]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // --- NOTIFICATION CORE SYSTEM ---
  const dispatchNotification = async (title: string, body: string) => {
      // 1. Play Sound (Oscillator)
      playSound(); 

      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;

      // 2. Try Service Worker (Best for Mobile)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
              navigator.serviceWorker.controller.postMessage({
                  type: 'SHOW_NOTIFICATION',
                  title: title,
                  body: body
              });
              return;
          } catch (e) {
              console.error("SW PostMessage failed:", e);
          }
      }

      // 3. Fallback: Direct Registration
      try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
              await registration.showNotification(title, {
                  body: body,
                  icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
                  badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
                  // @ts-ignore
                  vibrate: [200, 100, 200], 
                  tag: 'indigo-app-' + Date.now()
              });
              return;
          }
      } catch (e) {}

      // 4. Last Resort: Legacy API
      try {
          if (Notification.permission === 'granted') {
              new Notification(title, { body: body, icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png' });
          }
      } catch (e) {}
  };

  const requestNotificationPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
          try {
              const result = await Notification.requestPermission();
              if (result === 'granted') {
                  unlockAudio(); // Unlock audio immediately when permission granted
                  playSound();
              }
              return result;
          } catch (e) {
              return 'denied';
          }
      }
      return 'denied';
  };

  const testNotification = async () => {
      try {
          unlockAudio(); // Ensure audio is unlocked
          const permission = await requestNotificationPermission();
          
          if (permission === 'granted') {
              await dispatchNotification(
                  "🔔 Kiểm tra thành công", 
                  "Âm thanh và thông báo đang hoạt động!"
              );
              alert("Đã gửi lệnh thông báo. Bạn có nghe thấy tiếng BÍP không?");
          } else {
              alert(`Quyền thông báo đang bị chặn (Status: ${permission}). Hãy bật trong Cài đặt.`);
          }
      } catch (e: any) {
          alert("Lỗi: " + e.message);
      }
  };

  // --- DATA LOADING & SYNC ---
  const loadData = useCallback(async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      try {
          const data = await supabaseService.fetchAllData();
          setEmployees(data.employees);
          setLogs(data.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          setRequests(data.requests);
          setServingGroups(data.servingGroups);
          setHandoverLogs(data.handoverLogs);
          setSchedules(data.schedules);
          setPrepTasks(data.prepTasks);
          if (data.settings && Object.keys(data.settings).length > 0) {
              setSettings(prev => ({...INITIAL_SETTINGS, ...data.settings}));
          }
          const dismissedSet = new Set<string>(data.dismissedAlerts.map((a: any) => String(a.id)));
          setDismissedAlertIds(dismissedSet);
          if (!isBackground) setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
          return data.employees; 
      } catch (error) {
          console.error("Sync Error:", error);
          return [];
      } finally {
          if (!isBackground) setIsLoading(false);
      }
  }, []);

  // --- REALTIME SUBSCRIPTION ---
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
                  } else {
                      localStorage.removeItem(STORAGE_SESSION_KEY);
                  }
              } catch (e) { localStorage.removeItem(STORAGE_SESSION_KEY); }
          }
          setIsRestoringSession(false);
      };

      initApp();

      const channel = supabase.channel('app-db-changes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public' }, (payload) => {
              const user = currentUserRef.current;
              const config = settingsRef.current.notificationConfig || INITIAL_SETTINGS.notificationConfig;
              
              if (payload.table === 'requests' && user?.role === EmployeeRole.MANAGER) {
                  if (config.enableStaffRequest) {
                      const newReq = payload.new as any;
                      if (String(newReq.employee_id) !== String(user.id)) {
                          dispatchNotification("Đơn từ mới", `${newReq.employee_name}: ${newReq.type}`);
                      }
                  }
              }

              if (payload.table === 'serving_groups') {
                  if (config.enableGuestArrival) {
                      const newGroup = payload.new as any;
                      dispatchNotification("Khách mới", `${newGroup.name} - Bàn ${newGroup.location}`);
                  }
              }

              if (payload.table === 'handover_logs') {
                  if (config.enableHandover) {
                       const log = payload.new as any;
                       dispatchNotification("Sổ Giao Ca", `${log.type === 'ISSUE' ? '⚠️' : '📝'} Tin nhắn mới từ ${log.author}`);
                  }
              }
              loadData(true);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'serving_groups' }, (payload) => {
              const newGroupData = payload.new as any;
              const oldGroupLocal = servingGroupsRef.current.find(g => String(g.id) === String(newGroupData.id));
              const config = settingsRef.current.notificationConfig || INITIAL_SETTINGS.notificationConfig;

              if (config.enableGuestArrival) {
                  const wasNotStarted = !oldGroupLocal || !oldGroupLocal.startTime;
                  const isNowStarted = !!newGroupData.start_time;

                  if (wasNotStarted && isNowStarted) {
                      dispatchNotification("KHÁCH ĐÃ VÀO!", `Đoàn ${newGroupData.name} @ ${newGroupData.location}`);
                  }
              }
              loadData(true);
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public' }, () => {
              loadData(true);
          })
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') setConnectionStatus('CONNECTED');
              else setConnectionStatus(status === 'CLOSED' ? 'DISCONNECTED' : 'CONNECTING');
          });

      return () => { supabase.removeChannel(channel); };
  }, []); 

  // --- SYSTEM ALERTS ---
  const runSystemChecks = () => {
      const config = settingsRef.current.notificationConfig || INITIAL_SETTINGS.notificationConfig;
      
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const lateThreshold = settings.servingConfig?.lateAlertMinutes || 15;
      const newAlerts: SystemAlert[] = [];

      servingGroups.forEach(group => {
          if (group.status === 'ACTIVE' && group.startTime) {
              const [sH, sM] = group.startTime.split(':').map(Number);
              let diff = currentTotalMinutes - (sH * 60 + sM);
              if (diff < -1000) diff += 1440; 
              
              if (diff >= lateThreshold) {
                  const missingItems = group.items.filter(i => i.servedQuantity < i.totalQuantity);
                  if (missingItems.length > 0) {
                      const alertId = `alert_serving_${group.id}`;
                      const missingNames = missingItems.map(i => `${i.name} (x${i.totalQuantity - i.servedQuantity})`).join(', ');
                      const alertDetails = `Chưa ra: ${missingNames}`;
                      const alertTitle = `Bàn ${group.location} - ${group.name} (${diff}p)`;

                      if (config.enableSystemAlert) {
                          if (!dismissedAlertIds.has(alertId) && !activeAlerts.find(a => a.id === alertId)) {
                              dispatchNotification("Ra đồ chậm!", `${alertTitle}`);
                          }
                      }
                      
                      newAlerts.push({
                          id: alertId, 
                          type: 'LATE_SERVING',
                          message: alertTitle,
                          details: alertDetails,
                          groupId: group.id, 
                          severity: 'HIGH', 
                          timestamp: now.toLocaleTimeString('vi-VN')
                      });
                  }
              }
          }
      });
      
      setActiveAlerts(prev => {
         const prevIds = prev.map(a => a.id).sort().join(',');
         const newIds = newAlerts.map(a => a.id).sort().join(',');
         return prevIds !== newIds ? newAlerts : prev;
      });
  };

  useEffect(() => {
      const interval = setInterval(runSystemChecks, 60000); // Check every minute
      return () => clearInterval(interval);
  }, [servingGroups, logs, settings]);


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
      if (req) { 
          const updated = { ...req, status }; 
          setRequests(prev => prev.map(r => r.id === id ? updated : r)); 
          supabaseService.upsertRequest(updated); 
          if (status === RequestStatus.APPROVED) {
              if (req.type === RequestType.LEAVE) assignShift(req.employeeId, req.date, 'OFF');
              else if (req.type === RequestType.SHIFT_SWAP && req.targetShift) assignShift(req.employeeId, req.date, req.targetShift);
          }
      } 
  };
  const updateSettings = (s: SystemSettings) => { setSettings(s); supabaseService.saveSettings(s); };
  const addServingGroup = (g: ServingGroup) => { 
      const prepList = generatePrepList(g); 
      const newGroup = { ...g, prepList }; 
      setServingGroups(prev => [newGroup, ...prev]); 
      supabaseService.upsertServingGroup(newGroup); 
  };
  const deleteServingGroup = (id: string) => { setServingGroups(prev => prev.filter(g => g.id !== id)); supabaseService.deleteServingGroup(id); };
  const modifyGroup = useCallback((groupId: string, modifier: (g: ServingGroup) => ServingGroup) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const updated = modifier(g);
          supabaseService.upsertServingGroup(updated).catch(e => console.error(e));
          return updated;
      }));
  }, []);
  const updateServingGroup = (id: string, updates: Partial<ServingGroup>) => modifyGroup(id, g => ({ ...g, ...updates }));
  const startServingGroup = (id: string) => {
      const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      const group = servingGroups.find(g => String(g.id) === String(id));
      if (group) dispatchNotification("Đã xác nhận!", `Đoàn ${group.name} bắt đầu phục vụ.`);
      modifyGroup(id, g => ({ ...g, startTime: time }));
  };
  const addServingItem = (gId: string, item: ServingItem) => modifyGroup(gId, g => ({ ...g, items: [...g.items, item] }));
  const updateServingItem = (gId: string, iId: string, ups: Partial<ServingItem>) => modifyGroup(gId, g => ({ ...g, items: g.items.map(i => i.id === iId ? { ...i, ...ups } : i) }));
  const deleteServingItem = (gId: string, iId: string) => modifyGroup(gId, g => ({ ...g, items: g.items.filter(i => i.id !== iId) }));
  const incrementServedItem = (gId: string, iId: string) => modifyGroup(gId, g => ({ ...g, items: g.items.map(i => i.id === iId ? { ...i, servedQuantity: i.servedQuantity + 1 } : i) }));
  const decrementServedItem = (gId: string, iId: string) => modifyGroup(gId, g => ({ ...g, items: g.items.map(i => i.id === iId ? { ...i, servedQuantity: Math.max(0, i.servedQuantity - 1) } : i) }));
  const completeServingGroup = (id: string) => { const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false}); modifyGroup(id, g => ({ ...g, status: 'COMPLETED', completionTime: time })); };
  const toggleSauceItem = (gId: string, sName: string) => modifyGroup(gId, g => g.prepList ? { ...g, prepList: g.prepList.map(s => s.name === sName ? { ...s, isCompleted: !s.isCompleted } : s) } : g);
  const addHandoverLog = (log: HandoverLog) => { setHandoverLogs(prev => [log, ...prev]); supabaseService.addHandover(log); };
  const assignShift = (employeeId: string, date: string, shiftCode: string) => { const s: WorkSchedule = { id: `${employeeId}_${date}`, employeeId, date, shiftCode }; setSchedules(prev => [...prev.filter(x => x.id !== s.id), s]); supabaseService.upsertSchedule(s); };
  const dismissAlert = (id: string) => { setDismissedAlertIds(prev => new Set(prev).add(id)); supabaseService.dismissAlert(id); };
  const addPrepTask = (task: PrepTask) => { setPrepTasks(prev => [task, ...prev]); supabaseService.upsertPrepTask(task); };
  const togglePrepTask = (id: string) => { const t = prepTasks.find(x => x.id === id); if (t) { const u = { ...t, isCompleted: !t.isCompleted }; setPrepTasks(prev => prev.map(x => x.id === id ? u : x)); supabaseService.upsertPrepTask(u); } };
  const deletePrepTask = (id: string) => { setPrepTasks(prev => prev.filter(x => x.id !== id)); supabaseService.deletePrepTask(id); };

  const login = (idOrPhone: string, pass: string) => {
      const cleanInput = idOrPhone.replace(/\D/g, '');
      const user = employees.find(e => {
          if (e.password !== pass) return false;
          if (e.id === idOrPhone) return true;
          const empPhone = e.phone.replace(/\D/g, '');
          return cleanInput && empPhone && cleanInput === empPhone;
      });
      if (user) {
          setCurrentUser(user);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ userId: user.id, timestamp: Date.now() }));
          return true;
      }
      return false;
  };
  const logout = () => { setCurrentUser(null); localStorage.removeItem(STORAGE_SESSION_KEY); };
  const generatePrepList = (group: ServingGroup): SauceItem[] => {
      const groupNameLower = group.name.toLowerCase();
      const itemsLower = group.items.map(i => i.name.toLowerCase());
      const isEuro = /âu|eu|euro/i.test(groupNameLower);
      let tableCount = group.tableCount || Math.ceil(group.guestCount / 6);
      return [
          { name: "Xì dầu", quantity: tableCount * (isEuro ? 1 : 2), unit: "Bát", isCompleted: false, note: isEuro ? "Khách Âu" : "" },
          { name: "Nước mắm", quantity: tableCount * 2, unit: "Bát", isCompleted: false, note: "Tiêu chuẩn" },
          ...(itemsLower.some(n => n.includes('lẩu')) ? [{ name: "Bếp ga", quantity: tableCount, unit: "Chiếc", isCompleted: false }] : [])
      ];
  };

  return (
    <GlobalContext.Provider value={{ 
      employees, addEmployee, updateEmployee, deleteEmployee, registerEmployeeFace, changePassword,
      logs, addAttendanceLog, updateAttendanceLog,
      requests, addRequest, updateRequestStatus,
      settings, updateSettings,
      menuItems: [], 
      prepTasks, addPrepTask, togglePrepTask, deletePrepTask,
      servingGroups, addServingGroup, updateServingGroup, deleteServingGroup, startServingGroup, 
      addServingItem, updateServingItem, deleteServingItem, incrementServedItem, decrementServedItem, completeServingGroup, toggleSauceItem,
      handoverLogs, addHandoverLog,
      schedules, assignShift, 
      activeAlerts, dismissedAlertIds, dismissAlert,
      currentUser, login, logout,
      isLoading, isRestoringSession, lastUpdated, connectionStatus,
      reloadData: () => loadData(false),
      testNotification, 
      requestNotificationPermission,
      unlockAudio
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
