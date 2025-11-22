
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, 
  SystemSettings, MenuItem, PrepTask,
  ServingGroup, ServingItem, SauceItem,
  HandoverLog, WorkSchedule
} from '../types';
import { sheetService } from '../services/sheetService';

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
  togglePrepTask: (id: string) => void;
  
  servingGroups: ServingGroup[];
  addServingGroup: (group: ServingGroup) => void;
  updateServingGroup: (groupId: string, updates: Partial<ServingGroup>) => void;
  deleteServingGroup: (groupId: string) => void; // New
  addServingItem: (groupId: string, item: ServingItem) => void;
  updateServingItem: (groupId: string, itemId: string, updates: Partial<ServingItem>) => void;
  deleteServingItem: (groupId: string, itemId: string) => void;
  incrementServedItem: (groupId: string, itemId: string) => void;
  decrementServedItem: (groupId: string, itemId: string) => void;
  completeServingGroup: (groupId: string) => void;

  toggleSauceItem: (groupId: string, sauceName: string) => void;

  handoverLogs: HandoverLog[];
  addHandoverLog: (log: HandoverLog) => void;

  // SCHEDULES
  schedules: WorkSchedule[];
  assignShift: (employeeId: string, date: string, shiftCode: string) => void;

  currentUser: Employee | null;
  login: (idOrPhone: string, pass: string) => boolean;
  logout: () => void;

  isLoading: boolean;
  lastUpdated: string;
  reloadData: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

// MOCK DATA
const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Nguyễn Văn A', role: EmployeeRole.MANAGER, hourlyRate: 60000, allowance: 2000000, phone: '0901234567', email: 'admin@restaurant.com', password: '123456' },
];

const INITIAL_SETTINGS: SystemSettings = {
    location: { latitude: 21.0285, longitude: 105.8542, radiusMeters: 100, name: "Nhà hàng Trung tâm" },
    wifis: [],
    rules: { allowedLateMinutes: 15 },
    shiftConfigs: [
        { 
            code: 'Ca C', name: 'Ca C (Gãy)', 
            startTime: '08:00', endTime: '21:00', 
            isSplitShift: true, breakStart: '14:00', breakEnd: '17:00' 
        },
        { 
            code: 'Ca D', name: 'Ca D (Thông)', 
            startTime: '11:00', endTime: '21:00', 
            isSplitShift: false 
        },
        { 
            code: 'Ca B1', name: 'Ca B1 (Chiều)', 
            startTime: '13:00', endTime: '22:30', 
            isSplitShift: false 
        },
        { 
            code: 'Ca B2', name: 'Ca B2 (Tối)', 
            startTime: '13:30', endTime: '23:00', 
            isSplitShift: false 
        }
    ]
};

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('--:--');
  
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [logs, setLogs] = useState<TimesheetLog[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [servingGroups, setServingGroups] = useState<ServingGroup[]>([]);
  const [handoverLogs, setHandoverLogs] = useState<HandoverLog[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  
  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const [deletedGroupIds, setDeletedGroupIds] = useState<Set<string>>(new Set()); // Prevent zombies
  
  const [currentUser, setCurrentUser] = useState<Employee | null>(null); 

  // --- HELPERS ---

  // 1. Chuẩn hóa ngày (Fix lỗi lệch ngày do múi giờ)
  const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      try {
          const date = new Date(dateStr);
          return new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Ho_Chi_Minh',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
          }).format(date);
      } catch (e) {
          return dateStr.split('T')[0];
      }
  };

  // 2. Làm sạch giờ
  const cleanGoogleSheetTime = (val: any): string | null => {
      if (!val) return null;
      const strVal = String(val).trim();
      if (strVal === '' || strVal === '0' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
          return null;
      }
      if (strVal.includes('1899') && (strVal.includes('T00:00:00') || strVal.includes('T00:00:00.000Z'))) {
          return null;
      }
      if (strVal.includes('T')) {
          try {
              const date = new Date(strVal);
              if (isNaN(date.getTime())) return null;
              return date.toLocaleTimeString('vi-VN', {
                  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh'
              });
          } catch (e) { return null; }
      }
      if (strVal.includes(':') && strVal.length >= 4) return strVal;
      return null;
  };

  const loadData = useCallback(async () => {
      setIsLoading(true);
      try {
        const data = await sheetService.fetchAllData();
        if (data) {
            // 1. EMPLOYEES
            if (data.employees && Array.isArray(data.employees)) {
                const parsedEmployees = data.employees.map((e: any) => ({
                    ...e,
                    hourlyRate: Number(e.hourlyRate) || 0,
                    allowance: Number(e.allowance) || 0,
                    id: String(e.id)
                }));
                setEmployees(parsedEmployees);
                if (currentUser) {
                    const me = parsedEmployees.find((e: any) => String(e.id) === String(currentUser.id));
                    if (me) setCurrentUser(me);
                }
            }

            // 2. LOGS
            if (data.logs && Array.isArray(data.logs)) {
                const parsedLogs = data.logs.map((l: any) => ({
                    ...l,
                    date: normalizeDate(l.date),
                    checkIn: cleanGoogleSheetTime(l.checkIn),
                    checkOut: cleanGoogleSheetTime(l.checkOut),
                    lateMinutes: Number(l.lateMinutes) || 0,
                    totalHours: Number(l.totalHours) || 0
                }));
                setLogs(parsedLogs);
            }

            // 3. REQUESTS
            if (data.requests && Array.isArray(data.requests)) {
                setRequests(prevLocalRequests => {
                    const serverRequests = data.requests;
                    const pendingLocal = prevLocalRequests.filter(r => pendingRequestIds.has(r.id));
                    const stillPending = pendingLocal.filter(localReq => !serverRequests.some((serverReq: any) => String(serverReq.id) === String(localReq.id)));
                    return [...stillPending, ...serverRequests];
                });
                setPendingRequestIds(prev => {
                    const newSet = new Set(prev);
                    data.requests.forEach((r: any) => { if (newSet.has(r.id)) newSet.delete(r.id); });
                    return newSet;
                });
            }

            // 4. SERVING GROUPS (With Zombie Protection)
            if (data.servingGroups && Array.isArray(data.servingGroups)) {
                const freshGroups = data.servingGroups.filter((g: any) => !deletedGroupIds.has(g.id));
                setServingGroups(freshGroups);
                
                // Cleanup deleted set if items are gone from server
                setDeletedGroupIds(prev => {
                    const newSet = new Set(prev);
                    const serverIds = new Set(data.servingGroups.map((g: any) => g.id));
                    prev.forEach(id => { if (!serverIds.has(id)) newSet.delete(id); });
                    return newSet;
                });
            }

            if (data.handoverLogs) setHandoverLogs(data.handoverLogs);
            
            // 5. SCHEDULES (Mới)
            if (data.schedules && Array.isArray(data.schedules)) {
                const parsedSchedules = data.schedules.map((s: any) => ({
                    ...s,
                    date: normalizeDate(s.date)
                }));
                setSchedules(parsedSchedules);
            }
            
            if (data.settings) {
               const raw = data.settings;
               const mergedSettings: SystemSettings = {
                   location: { ...INITIAL_SETTINGS.location, ...(raw.location || {}) },
                   wifis: Array.isArray(raw.wifis) ? raw.wifis : INITIAL_SETTINGS.wifis,
                   rules: { ...INITIAL_SETTINGS.rules, ...(raw.rules || {}) },
                   shiftConfigs: Array.isArray(raw.shiftConfigs) ? raw.shiftConfigs : INITIAL_SETTINGS.shiftConfigs
               };
               setSettings(mergedSettings);
            }
        }
        setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      } catch (error) {
          console.error("Lỗi đồng bộ dữ liệu:", error);
      } finally {
          setIsLoading(false);
      }
  }, [currentUser, pendingRequestIds, deletedGroupIds]);

  useEffect(() => {
      loadData();
      const intervalId = setInterval(() => loadData(), 60000);
      return () => clearInterval(intervalId);
  }, []);

  const generatePrepList = (group: ServingGroup): SauceItem[] => {
      const prepList: SauceItem[] = [];
      const menuNames = group.items.map(i => i.name.toLowerCase());
      const groupNameLower = group.name.toLowerCase();
      const paxMatch = groupNameLower.match(/pax\s+([^\s0-9]+)/); 
      const paxType = paxMatch && paxMatch[1] ? paxMatch[1].trim() : "";
      
      const isEuro = /âu|eu|euro/i.test(paxType);
      const isKorean = /hàn|han|korea|kor/i.test(paxType);
      const isVietnamese = /việt|viet|vn/i.test(paxType);

      let tableCount = group.tableCount || 0;
      if (tableCount === 0) {
          const sharedItem = group.items.find(i => i.name.toLowerCase().includes('lẩu'));
          if (sharedItem) tableCount = sharedItem.totalQuantity;
          else tableCount = Math.ceil(group.guestCount / 6);
      }
      const paxPerTable = group.guestCount / (tableCount || 1);

      const getStandardBowls = (tables: number, paxPerT: number) => {
          const perTable = paxPerT > 4 ? 2 : 1;
          return perTable * tables;
      };

      if (isVietnamese) prepList.push({ name: "Nước mắm", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Khách Việt" });
      
      let soyQty = getStandardBowls(tableCount, paxPerTable);
      let soyNote = "Tiêu chuẩn";
      if (isEuro) { soyQty = 1 * tableCount; soyNote = "Khách Âu (1 bát/bàn)"; }
      if (!isEuro && menuNames.some(n => n.includes('gỏi'))) { soyQty = 4 * tableCount; soyNote = "Món Gỏi (4 bát/bàn)"; }
      prepList.push({ name: "Xì dầu", quantity: soyQty, unit: "Bát", isCompleted: false, note: soyNote });

      if (menuNames.some(n => n.includes('nem'))) {
          let nemQty = getStandardBowls(tableCount, paxPerTable);
          let nemNote = "Có món Nem";
          if (isEuro) { nemQty = 1 * tableCount; nemNote = "Khách Âu (1 bát/bàn)"; }
          prepList.push({ name: "Nước chấm nem", quantity: nemQty, unit: "Bát", isCompleted: false, note: nemNote });
      }
      if (menuNames.some(n => (n.includes('cá hồi') || n.includes('cá tầm')) && n.includes('nướng'))) prepList.push({ name: "Nước chấm cá", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Cá nướng" });
      if (!isEuro) prepList.push({ name: "Ớt tươi", quantity: soyQty, unit: "Bát", isCompleted: false });
      if (menuNames.some(n => n.includes('cơm lam') || n.includes('rau luộc') || n.includes('củ luộc'))) prepList.push({ name: "Muối vừng", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
      if (menuNames.some(n => n.includes('gà nướng') && !n.includes('mật ong') && !n.includes('đồng quê'))) prepList.push({ name: "Chẩm chéo", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Gà nướng" });
      if (menuNames.some(n => n.includes('lợn hấp'))) prepList.push({ name: "Tương bần", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
      if (menuNames.some(n => n.includes('gỏi cá hồi'))) prepList.push({ name: "Nước chấm gỏi", quantity: 1 * tableCount, unit: "Bát", isCompleted: false, note: "1 bát/bàn" });
      if (menuNames.some(n => n.includes('lẩu'))) prepList.push({ name: "Bếp ga", quantity: 1 * tableCount, unit: "Chiếc", isCompleted: false });
      if (isEuro) prepList.push({ name: "Muối tiêu", quantity: 1 * tableCount, unit: "Phần", isCompleted: false, note: "Khách Âu" });
      if (menuNames.some(n => (n.includes('khoai lang') || n.includes('khoai tây')) && n.includes('chiên'))) prepList.push({ name: "Tương ớt", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Khoai chiên" });
      
      const hasPorkBelly = menuNames.some(n => (n.includes('ba chỉ') && (n.includes('quay') || n.includes('nướng'))) || n.includes('heo quay') || n.includes('lợn quay'));
      if (isKorean && hasPorkBelly) prepList.push({ name: "Sốt ba chỉ quay", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Khách Hàn - Ba chỉ" });
      if (isKorean) prepList.push({ name: "Rau xà lách", quantity: 1 * tableCount, unit: "Đĩa", isCompleted: false, note: "Khách Hàn" });

      return prepList;
  };

  const addEmployee = (e: Employee) => {
      const empWithDefaults = { ...e, password: e.password || '123456', allowance: Number(e.allowance) || 0 };
      setEmployees(p => [...p, empWithDefaults]);
      sheetService.syncEmployee(empWithDefaults);
  };

  const updateEmployee = (e: Employee) => {
      const cleanEmp = { ...e, allowance: Number(e.allowance) || 0 };
      setEmployees(p => p.map(x => x.id === e.id ? { ...x, ...cleanEmp } : x));
      if (currentUser && currentUser.id === e.id) setCurrentUser(prev => prev ? { ...prev, ...cleanEmp } : prev);
      sheetService.syncEmployee(cleanEmp);
  };

  const deleteEmployee = (id: string) => {
      setEmployees(p => p.filter(x => x.id !== id));
      sheetService.deleteEmployee(id);
  };

  const registerEmployeeFace = (id: string, img: string) => {
      const updated = employees.find(e => e.id === id);
      if (updated) { const newEmp = { ...updated, avatar: img }; updateEmployee(newEmp); }
  };

  const changePassword = (id: string, newPass: string) => {
      const updated = employees.find(e => e.id === id);
      if (updated) { const newEmp = { ...updated, password: newPass }; updateEmployee(newEmp); }
  }

  const assignShift = (employeeId: string, date: string, shiftCode: string) => {
      const newSchedule: WorkSchedule = {
          id: `${employeeId}_${date}`,
          employeeId,
          date,
          shiftCode
      };
      
      // Optimistic UI Update
      setSchedules(prev => {
          // Remove old shift for that day if exists
          const filtered = prev.filter(s => !(s.employeeId === employeeId && s.date === date));
          return [...filtered, newSchedule];
      });
      
      // Sync to Backend
      sheetService.syncSchedule(newSchedule);
  };

  const addAttendanceLog = (l: TimesheetLog) => { setLogs(p => [l, ...p]); sheetService.logAttendance(l); };
  const updateAttendanceLog = (l: TimesheetLog) => { setLogs(p => p.map(x => x.id === l.id ? l : x)); sheetService.logAttendance(l); };
  
  const addRequest = (r: EmployeeRequest) => { 
      setPendingRequestIds(prev => new Set(prev).add(r.id));
      setRequests(p => [r, ...p]); 
      sheetService.syncRequest(r); 
  };

  const updateRequestStatus = (id: string, s: RequestStatus) => { setRequests(p => p.map(x => { if (x.id === id) { const updated = { ...x, status: s }; sheetService.syncRequest(updated); return updated; } return x; })); };
  const updateSettings = (s: SystemSettings) => { setSettings(s); sheetService.saveSettings(s); };
  const syncGroupState = (group: ServingGroup) => { sheetService.syncServingGroup(group); }
  
  const addServingGroup = (group: ServingGroup) => { 
      const prepList = generatePrepList(group); 
      const groupWithData = { 
          ...group, 
          prepList,
          date: group.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
      }; 
      setServingGroups(prev => [groupWithData, ...prev]); 
      syncGroupState(groupWithData); 
  };

  const updateServingGroup = (groupId: string, updates: Partial<ServingGroup>) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const updatedGroup = { ...g, ...updates }; if (updates.items || updates.guestCount || updates.tableCount || updates.name) { updatedGroup.prepList = generatePrepList(updatedGroup); } syncGroupState(updatedGroup); return updatedGroup; })); };
  
  // FIX: Track Deleted IDs locally
  const deleteServingGroup = (groupId: string) => { 
      setDeletedGroupIds(prev => new Set(prev).add(groupId)); // Block this ID from reappearing
      setServingGroups(prev => prev.filter(g => g.id !== groupId)); 
      sheetService.deleteServingGroup(groupId); 
  };
  
  const addServingItem = (groupId: string, item: ServingItem) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const updatedGroup = { ...g, items: [...g.items, item] }; updatedGroup.prepList = generatePrepList(updatedGroup); syncGroupState(updatedGroup); return updatedGroup; })); };
  const updateServingItem = (groupId: string, itemId: string, updates: Partial<ServingItem>) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const newItems = g.items.map(i => i.id === itemId ? { ...i, ...updates } : i); const updatedGroup = { ...g, items: newItems }; updatedGroup.prepList = generatePrepList(updatedGroup); syncGroupState(updatedGroup); return updatedGroup; })); };
  const deleteServingItem = (groupId: string, itemId: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const updatedGroup = { ...g, items: g.items.filter(i => i.id !== itemId) }; updatedGroup.prepList = generatePrepList(updatedGroup); syncGroupState(updatedGroup); return updatedGroup; })); };
  const toggleSauceItem = (groupId: string, sauceName: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId || !g.prepList) return g; const newPrepList = g.prepList.map(s => s.name === sauceName ? { ...s, isCompleted: !s.isCompleted } : s); const updatedGroup = { ...g, prepList: newPrepList }; syncGroupState(updatedGroup); return updatedGroup; })); };
  const incrementServedItem = (groupId: string, itemId: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const items = g.items.map(i => i.id === itemId ? { ...i, servedQuantity: i.servedQuantity + 1 } : i); const updatedGroup = { ...g, items }; syncGroupState(updatedGroup); return updatedGroup; })); };
  const decrementServedItem = (groupId: string, itemId: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const items = g.items.map(i => i.id === itemId ? { ...i, servedQuantity: Math.max(0, i.servedQuantity - 1) } : i); const updatedGroup = { ...g, items }; syncGroupState(updatedGroup); return updatedGroup; })); };
  const completeServingGroup = (groupId: string) => { setServingGroups(prev => prev.map(g => { if (g.id === groupId) { const updated = { ...g, status: 'COMPLETED' as const }; syncGroupState(updated); return updated; } return g; })); };
  const addHandoverLog = (log: HandoverLog) => { setHandoverLogs(prev => [log, ...prev]); sheetService.logHandover(log); }

  const login = (idOrPhone: string, pass: string) => { 
      let user = employees.find(e => (String(e.id) === String(idOrPhone) || e.phone === idOrPhone) && (String(e.password || '123456') === String(pass)));
      if (!user && idOrPhone === '1' && pass === '123456') user = INITIAL_EMPLOYEES[0];
      if (user) { setCurrentUser(user); return true; }
      return false;
  }; 
  
  const logout = () => { setCurrentUser(null); }; 
  const togglePrepTask = (id: string) => setPrepTasks(p => p.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t));

  return (
    <GlobalContext.Provider value={{ 
      employees, addEmployee, updateEmployee, deleteEmployee, registerEmployeeFace, changePassword,
      logs, addAttendanceLog, updateAttendanceLog,
      requests, addRequest, updateRequestStatus,
      settings, updateSettings,
      menuItems: [], prepTasks, togglePrepTask,
      servingGroups, addServingGroup, updateServingGroup, deleteServingGroup,
      addServingItem, updateServingItem, deleteServingItem,
      incrementServedItem, decrementServedItem, completeServingGroup,
      toggleSauceItem,
      handoverLogs, addHandoverLog,
      schedules, assignShift, // NEW
      currentUser, login, logout,
      isLoading, lastUpdated, reloadData: loadData
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
