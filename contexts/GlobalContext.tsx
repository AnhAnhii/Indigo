
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
  lastUpdated: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  reloadData: () => void;
  testNotification: () => void;
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

// SIMPLE BEEP SOUND (Base64 MP3)
const NOTIFICATION_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAJQAAAA0AAAA0AAAA0AAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAJLAAABAAAAIAAAACUAAAAnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const STORAGE_USER_ID_KEY = 'RS_USER_ID';

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true); // Default true to handle initial check
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

  // REFs to hold latest state without triggering re-renders in useEffect
  const currentUserRef = useRef(currentUser);
  const servingGroupsRef = useRef(servingGroups);

  useEffect(() => {
      currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
      servingGroupsRef.current = servingGroups;
  }, [servingGroups]);

  // --- NOTIFICATION HELPERS ---
  const playSound = () => {
      try {
          // Use AudioContext or HTML5 Audio
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
          audio.volume = 0.5;
          audio.play().catch(e => console.log("Audio autoplay blocked (User must interact first):", e));
      } catch (e) {
          console.error("Sound Error:", e);
      }
  };

  const sendNotification = (title: string, body: string) => {
      // 1. Play Sound (Always safe to try)
      playSound();

      // 2. Browser Notification (SAFE CHECK for iOS/Mobile)
      if (typeof window !== 'undefined' && 'Notification' in window) {
          // Use window['Notification'] to avoid ReferenceError on some iOS versions/browsers
          const NotificationAPI = window['Notification'] as any;
          if (NotificationAPI.permission === 'granted') {
              try {
                  new NotificationAPI(title, {
                      body: body,
                      icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png'
                  });
              } catch (e) {
                  console.error("Notification Creation Error:", e);
              }
          }
      } else {
          console.log("Notifications not supported on this device/browser.");
      }
  };

  const requestNotificationPermission = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
          const NotificationAPI = window['Notification'] as any;
          if (NotificationAPI.permission !== 'granted' && NotificationAPI.permission !== 'denied') {
              try {
                  NotificationAPI.requestPermission().then((permission: any) => {
                      if (permission === 'granted') {
                          console.log("Notification permission granted.");
                      }
                  });
              } catch (e) {
                  console.error("Permission Request Error:", e);
              }
          }
      }
  };

  // --- INITIAL DATA LOAD ---
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

          // --- SESSION RESTORATION LOGIC ---
          const storedUserId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_USER_ID_KEY) : null;
          const targetUserId = currentUserRef.current?.id || storedUserId;

          if (targetUserId) {
              const foundUser = data.employees.find(e => e.id === targetUserId);
              if (foundUser) {
                  setCurrentUser(foundUser);
              } else if (storedUserId) {
                  // ID exists in storage but not in DB (deleted user) -> Clear storage
                  localStorage.removeItem(STORAGE_USER_ID_KEY);
                  setCurrentUser(null);
              }
          }

          if (!isBackground) setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      } catch (error) {
          console.error("Sync Error:", error);
      } finally {
          if (!isBackground) setIsLoading(false);
      }
  }, []);

  // --- REALTIME SUBSCRIPTIONS & NOTIFICATIONS ---
  useEffect(() => {
      loadData(false);
      requestNotificationPermission();

      const channel = supabase.channel('app-db-changes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public' }, (payload) => {
              const user = currentUserRef.current;
              
              // --- NOTIFICATION LOGIC ---
              // 1. New Request -> Notify Admin
              if (payload.table === 'requests' && user?.role === EmployeeRole.MANAGER) {
                  const newReq = payload.new as any;
                  if (String(newReq.employee_id) !== String(user.id)) {
                      sendNotification("Đơn từ mới", `${newReq.employee_name} vừa gửi đơn: ${newReq.type}`);
                  }
              }

              // 2. New Serving Group -> Notify Everyone (Kitchen/Waiter)
              if (payload.table === 'serving_groups') {
                  const newGroup = payload.new as any;
                  sendNotification("Đoàn khách mới", `${newGroup.name} tại bàn ${newGroup.location} (${newGroup.guest_count} khách)`);
              }

              // 3. New Alert/Handover -> General
              if (payload.table === 'handover_logs') {
                  sendNotification("Sổ Giao Ca", `Có ghi chú mới từ ${payload.new.author}`);
              }

              loadData(true);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public' }, (payload) => {
              // --- CHECK GUEST ARRIVAL (UPDATE on Serving Group) ---
              if (payload.table === 'serving_groups') {
                  const newGroupData = payload.new as any;
                  const oldGroupLocal = servingGroupsRef.current.find(g => g.id === newGroupData.id);
                  
                  // Check if startTime changed from null/empty to a value
                  // This means "Báo khách đến" was triggered
                  if (oldGroupLocal && !oldGroupLocal.startTime && newGroupData.start_time) {
                      sendNotification(
                          "🔔 KHÁCH ĐÃ ĐẾN!", 
                          `Đoàn ${newGroupData.name} đã vào bàn ${newGroupData.location}. Bắt đầu phục vụ!`
                      );
                  }
              }
              loadData(true);
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public' }, () => {
              loadData(true);
          })
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') setConnectionStatus('CONNECTED');
              else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnectionStatus('DISCONNECTED');
              else setConnectionStatus('CONNECTING');
          });

      return () => {
          supabase.removeChannel(channel);
      };
  }, []); // Empty dependency array ensures connection is established ONCE and persists

  // --- ACTIONS ---

  const addEmployee = (e: Employee) => {
      setEmployees(prev => [...prev, e]);
      supabaseService.upsertEmployee(e);
  };

  const updateEmployee = (e: Employee) => {
      setEmployees(prev => prev.map(x => x.id === e.id ? e : x));
      if (currentUser?.id === e.id) setCurrentUser(e);
      supabaseService.upsertEmployee(e);
  };

  const deleteEmployee = (id: string) => {
      setEmployees(prev => prev.filter(x => x.id !== id));
      supabaseService.deleteEmployee(id);
  };

  const registerEmployeeFace = (id: string, img: string) => {
      const emp = employees.find(e => e.id === id);
      if (emp) updateEmployee({ ...emp, avatar: img });
  };

  const changePassword = (id: string, newPass: string) => {
      const emp = employees.find(e => e.id === id);
      if (emp) updateEmployee({ ...emp, password: newPass });
  };

  const addAttendanceLog = (log: TimesheetLog) => {
      setLogs(prev => [log, ...prev]);
      supabaseService.upsertLog(log);
  };

  const updateAttendanceLog = (log: TimesheetLog) => {
      setLogs(prev => prev.map(l => l.id === log.id ? log : l));
      supabaseService.upsertLog(log);
  };

  const addRequest = (req: EmployeeRequest) => {
      setRequests(prev => [req, ...prev]);
      supabaseService.upsertRequest(req);
  };

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

  const updateSettings = (s: SystemSettings) => {
      setSettings(s);
      supabaseService.saveSettings(s);
  };

  const addServingGroup = (g: ServingGroup) => {
      const prepList = generatePrepList(g);
      const newGroup = { ...g, prepList };
      setServingGroups(prev => [newGroup, ...prev]);
      supabaseService.upsertServingGroup(newGroup);
  };

  const deleteServingGroup = (id: string) => {
      setServingGroups(prev => prev.filter(g => g.id !== id));
      supabaseService.deleteServingGroup(id);
  };

  // --- ATOMIC MODIFIERS FOR SERVING GROUPS ---
  const modifyGroup = useCallback((groupId: string, modifier: (g: ServingGroup) => ServingGroup) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const updated = modifier(g);
          supabaseService.upsertServingGroup(updated).catch(err => console.error("Supabase Sync Error", err));
          return updated;
      }));
  }, []);

  const updateServingGroup = (id: string, updates: Partial<ServingGroup>) => {
      modifyGroup(id, g => ({ ...g, ...updates }));
  };

  const startServingGroup = (id: string) => {
      const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      modifyGroup(id, g => ({ ...g, startTime: time }));
  };

  const addServingItem = (groupId: string, item: ServingItem) => {
      modifyGroup(groupId, g => ({ ...g, items: [...g.items, item] }));
  };

  const updateServingItem = (groupId: string, itemId: string, updates: Partial<ServingItem>) => {
      modifyGroup(groupId, g => ({
          ...g,
          items: g.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
      }));
  };

  const deleteServingItem = (groupId: string, itemId: string) => {
      modifyGroup(groupId, g => ({
          ...g,
          items: g.items.filter(i => i.id !== itemId)
      }));
  };

  const incrementServedItem = (groupId: string, itemId: string) => {
      modifyGroup(groupId, g => ({
          ...g,
          items: g.items.map(i => i.id === itemId ? { ...i, servedQuantity: i.servedQuantity + 1 } : i)
      }));
  };

  const decrementServedItem = (groupId: string, itemId: string) => {
      modifyGroup(groupId, g => ({
          ...g,
          items: g.items.map(i => i.id === itemId ? { ...i, servedQuantity: Math.max(0, i.servedQuantity - 1) } : i)
      }));
  };

  const completeServingGroup = (id: string) => {
      const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      modifyGroup(id, g => ({ ...g, status: 'COMPLETED', completionTime: time }));
  };

  const toggleSauceItem = (groupId: string, sauceName: string) => {
      modifyGroup(groupId, g => {
          if (!g.prepList) return g;
          return {
              ...g,
              prepList: g.prepList.map(s => s.name === sauceName ? { ...s, isCompleted: !s.isCompleted } : s)
          };
      });
  };

  const addHandoverLog = (log: HandoverLog) => {
      setHandoverLogs(prev => [log, ...prev]);
      supabaseService.addHandover(log);
  };

  const assignShift = (employeeId: string, date: string, shiftCode: string) => {
      const schedule: WorkSchedule = { id: `${employeeId}_${date}`, employeeId, date, shiftCode };
      setSchedules(prev => [...prev.filter(s => s.id !== schedule.id), schedule]);
      supabaseService.upsertSchedule(schedule);
  };

  const dismissAlert = (id: string) => {
      setDismissedAlertIds(prev => new Set(prev).add(id));
      supabaseService.dismissAlert(id);
  };

  const addPrepTask = (task: PrepTask) => {
      setPrepTasks(prev => [task, ...prev]);
      supabaseService.upsertPrepTask(task);
  };

  const togglePrepTask = (id: string) => {
      const task = prepTasks.find(t => t.id === id);
      if (task) {
          const updated = { ...task, isCompleted: !task.isCompleted };
          setPrepTasks(prev => prev.map(t => t.id === id ? updated : t));
          supabaseService.upsertPrepTask(updated);
      }
  };

  const deletePrepTask = (id: string) => {
      setPrepTasks(prev => prev.filter(t => t.id !== id));
      supabaseService.deletePrepTask(id);
  };

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
          // SAVE SESSION
          localStorage.setItem(STORAGE_USER_ID_KEY, user.id);
          requestNotificationPermission();
          return true;
      }
      return false;
  };

  const logout = () => {
      setCurrentUser(null);
      // CLEAR SESSION
      localStorage.removeItem(STORAGE_USER_ID_KEY);
  };

  const generatePrepList = (group: ServingGroup): SauceItem[] => {
      const prepList: SauceItem[] = [];
      const menuNames = group.items.map(i => i.name.toLowerCase());
      const groupNameLower = group.name.toLowerCase();
      const paxMatch = groupNameLower.match(/pax\s+([^\s0-9]+)/); 
      const paxType = paxMatch && paxMatch[1] ? paxMatch[1].trim() : "";
      const isEuro = /âu|eu|euro/i.test(paxType);
      const isVietnamese = /việt|viet|vn/i.test(paxType);

      let tableCount = group.tableCount || 0;
      if (tableCount === 0) {
          const sharedItem = group.items.find(i => i.name.toLowerCase().includes('lẩu'));
          if (sharedItem) tableCount = sharedItem.totalQuantity;
          else tableCount = Math.ceil(group.guestCount / 6);
      }
      const paxPerTable = group.guestCount / (tableCount || 1);
      const getStandardBowls = (tables: number, paxPerT: number) => (paxPerT > 4 ? 2 : 1) * tables;

      if (isVietnamese) prepList.push({ name: "Nước mắm", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Khách Việt" });
      
      let soyQty = getStandardBowls(tableCount, paxPerTable);
      let soyNote = "Tiêu chuẩn";
      if (isEuro) { soyQty = 1 * tableCount; soyNote = "Khách Âu (1 bát/bàn)"; }
      if (!isEuro && menuNames.some(n => n.includes('gỏi'))) { soyQty = 4 * tableCount; soyNote = "Món Gỏi (4 bát/bàn)"; }
      prepList.push({ name: "Xì dầu", quantity: soyQty, unit: "Bát", isCompleted: false, note: soyNote });

      if (menuNames.some(n => n.includes('nem'))) prepList.push({ name: "Nước chấm nem", quantity: isEuro ? tableCount : getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: isEuro ? "Khách Âu" : "Có món Nem" });
      if (menuNames.some(n => (n.includes('cá hồi') || n.includes('cá tầm')) && n.includes('nướng'))) prepList.push({ name: "Nước chấm cá", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Cá nướng" });
      if (!isEuro) prepList.push({ name: "Ớt tươi", quantity: soyQty, unit: "Bát", isCompleted: false });
      if (menuNames.some(n => n.includes('cơm lam') || n.includes('khoai luộc'))) prepList.push({ name: "Muối vừng", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
      if (menuNames.some(n => n.includes('gà nướng') && !n.includes('mật ong'))) prepList.push({ name: "Chẩm chéo", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Gà nướng" });
      if (menuNames.some(n => n.includes('lợn hấp'))) prepList.push({ name: "Tương bần", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
      if (menuNames.some(n => n.includes('lẩu'))) prepList.push({ name: "Bếp ga", quantity: 1 * tableCount, unit: "Chiếc", isCompleted: false });
      
      return prepList;
  };

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
                      const missingText = missing.map(i => `${i.name} (thiếu ${i.totalQuantity - i.servedQuantity})`).join(', ');
                      const alertId = `alert_serving_${group.id}`;
                      
                      // Notify if this is a NEW alert that hasn't been dismissed
                      if (!dismissedAlertIds.has(alertId) && !activeAlerts.find(a => a.id === alertId)) {
                          sendNotification("Cảnh báo ra đồ chậm", `Đoàn ${group.name} đã đợi ${diff} phút!`);
                      }

                      newAlerts.push({
                          id: alertId,
                          type: 'LATE_SERVING',
                          message: `Đoàn ${group.name} chờ món quá lâu`,
                          details: `Đã đợi ${diff} phút. Thiếu: ${missingText}`,
                          groupId: group.id,
                          severity: 'HIGH',
                          timestamp: now.toLocaleTimeString('vi-VN')
                      });
                  }
              }
          }
      });

      logs.filter(l => l.date === todayStr).forEach(log => {
          if (log.status === AttendanceStatus.LATE) {
              newAlerts.push({
                  id: `alert_late_${log.id}`, type: 'ATTENDANCE_VIOLATION',
                  message: `Phát hiện đi muộn: ${log.employeeName}`,
                  details: `Muộn ${log.lateMinutes} phút`, severity: 'MEDIUM', timestamp: now.toLocaleTimeString('vi-VN')
              });
          }
      });

      setActiveAlerts(prev => {
          if (prev.length !== newAlerts.length) return newAlerts;
          const prevIds = prev.map(a => a.id).sort().join(',');
          const newIds = newAlerts.map(a => a.id).sort().join(',');
          return prevIds !== newIds ? newAlerts : prev;
      });
  };

  useEffect(() => {
      const timer = setInterval(runSystemChecks, 5000);
      return () => clearInterval(timer);
  }, [servingGroups, logs, settings]);

  return (
    <GlobalContext.Provider value={{ 
      employees, addEmployee, updateEmployee, deleteEmployee, registerEmployeeFace, changePassword,
      logs, addAttendanceLog, updateAttendanceLog,
      requests, addRequest, updateRequestStatus,
      settings, updateSettings,
      menuItems: [], 
      prepTasks, addPrepTask, togglePrepTask, deletePrepTask,
      servingGroups, addServingGroup, updateServingGroup, deleteServingGroup,
      startServingGroup, 
      addServingItem, updateServingItem, deleteServingItem,
      incrementServedItem, decrementServedItem, completeServingGroup,
      toggleSauceItem,
      handoverLogs, addHandoverLog,
      schedules, assignShift, 
      activeAlerts, dismissedAlertIds, dismissAlert,
      currentUser, login, logout,
      isLoading, lastUpdated,
      connectionStatus,
      reloadData: () => loadData(false),
      testNotification: () => sendNotification("Hệ thống hoạt động tốt", "Bạn đã cấu hình thông báo thành công!")
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
