
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
    shiftConfigs: []
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

  const currentUserRef = useRef(currentUser);
  const servingGroupsRef = useRef(servingGroups);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { servingGroupsRef.current = servingGroups; }, [servingGroups]);

  // --- NOTIFICATION CORE ---
  const playSound = () => {
      try {
          if (!audioRef.current) {
              audioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
              audioRef.current.volume = 0.8;
          }
          const promise = audioRef.current.play();
          if (promise !== undefined) {
              promise.catch(() => console.log("Audio autoplay prevented."));
          }
      } catch (e) { console.error("Sound Error:", e); }
  };

  const sendNotification = async (title: string, body: string) => {
      playSound();

      if (!('Notification' in window)) return;

      if (Notification.permission === 'granted') {
          // METHOD 1: Try Service Worker PostMessage (Best for iOS/PWA)
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                  type: 'SHOW_NOTIFICATION',
                  title: title,
                  body: body
              });
              return;
          }

          // METHOD 2: Fallback to Registration showNotification
          try {
              const registration = await navigator.serviceWorker.ready;
              if (registration) {
                  await registration.showNotification(title, {
                      body: body,
                      icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
                      badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
                      vibrate: [200, 100, 200],
                      tag: 'indigo-' + Date.now()
                  } as any);
                  return;
              }
          } catch (e) { console.error("SW Notification failed", e); }

          // METHOD 3: Fallback to legacy Notification API (Desktop mostly)
          try {
              new Notification(title, { 
                  body: body,
                  icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png'
              });
          } catch (e) { console.error("Legacy Notification failed", e); }
      }
  };

  const requestNotificationPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
          const result = await Notification.requestPermission();
          if (result === 'granted') {
              playSound(); // Play sound to unlock audio context on iOS
          }
          return result;
      }
      return 'denied';
  };

  const testNotification = async () => {
      // 1. Force Request Permission again if needed
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
          // 2. Fire test notification
          sendNotification(
              "🔔 Kiểm tra hệ thống", 
              "Thông báo hoạt động tốt! Bạn sẽ nhận tin khi có khách mới."
          );
      } else {
          alert("Bạn đã chặn thông báo. Vui lòng vào Cài đặt điện thoại -> Safari/Chrome -> Cho phép thông báo.");
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
              setSettings(prev => ({...prev, ...data.settings}));
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

  // --- INIT & REALTIME SUBSCRIPTION ---
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
              // NOTIFICATION: NEW REQUEST
              if (payload.table === 'requests' && user?.role === EmployeeRole.MANAGER) {
                  const newReq = payload.new as any;
                  if (String(newReq.employee_id) !== String(user.id)) {
                      sendNotification("Đơn từ mới", `${newReq.employee_name}: ${newReq.type}`);
                  }
              }
              // NOTIFICATION: NEW GUEST GROUP
              if (payload.table === 'serving_groups') {
                  const newGroup = payload.new as any;
                  sendNotification("Đoàn khách mới", `${newGroup.name} - Bàn ${newGroup.location}`);
              }
              // NOTIFICATION: HANDOVER
              if (payload.table === 'handover_logs') {
                  sendNotification("Sổ Giao Ca", `Tin nhắn mới từ ${payload.new.author}`);
              }
              loadData(true);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'serving_groups' }, (payload) => {
              const newGroupData = payload.new as any;
              const oldGroupLocal = servingGroupsRef.current.find(g => String(g.id) === String(newGroupData.id));
              
              // NOTIFICATION: GUEST ARRIVED (Start Time Updated)
              // Only notify if status changed to ACTIVE or start_time was just added
              if (newGroupData.start_time && (!oldGroupLocal || !oldGroupLocal.startTime)) {
                  // Check if I am the one who triggered it (to avoid double notify self, 
                  // but we want feedback so notify anyway)
                  sendNotification("KHÁCH ĐÃ VÀO!", `Đoàn ${newGroupData.name} @ ${newGroupData.location}`);
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

  // --- ALERT SYSTEM ---
  const runSystemChecks = () => {
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const lateThreshold = settings.servingConfig?.lateAlertMinutes || 15;
      const newAlerts: SystemAlert[] = [];

      servingGroups.forEach(group => {
          if (group.status === 'ACTIVE' && group.startTime) {
              const [sH, sM] = group.startTime.split(':').map(Number);
              let diff = currentTotalMinutes - (sH * 60 + sM);
              if (diff < -1000) diff += 1440; 
              if (diff >= lateThreshold) {
                  const missing = group.items.filter(i => i.servedQuantity < i.totalQuantity);
                  if (missing.length > 0) {
                      const alertId = `alert_serving_${group.id}`;
                      if (!dismissedAlertIds.has(alertId) && !activeAlerts.find(a => a.id === alertId)) {
                          sendNotification("Ra đồ chậm!", `Bàn ${group.location} đợi ${diff} phút rồi!`);
                      }
                      newAlerts.push({
                          id: alertId, type: 'LATE_SERVING',
                          message: `Đoàn ${group.name} chờ lâu`,
                          details: `Đã đợi ${diff} phút.`, groupId: group.id, severity: 'HIGH', timestamp: now.toLocaleTimeString('vi-VN')
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
      // OPTIMISTIC LOCAL NOTIFICATION
      const group = servingGroups.find(g => g.id === id);
      if (group) sendNotification("Bắt đầu phục vụ!", `Đã xác nhận đoàn ${group.name} vào bàn.`);
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
      requestNotificationPermission 
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
