
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, 
  SystemSettings, MenuItem, PrepTask,
  ServingGroup, ServingItem, SauceItem
} from '../types';
import { sheetService } from '../services/sheetService';

interface GlobalContextType {
  employees: Employee[];
  addEmployee: (emp: Employee) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  registerEmployeeFace: (id: string, image: string) => void;
  
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
  addServingItem: (groupId: string, item: ServingItem) => void;
  updateServingItem: (groupId: string, itemId: string, updates: Partial<ServingItem>) => void;
  deleteServingItem: (groupId: string, itemId: string) => void;
  incrementServedItem: (groupId: string, itemId: string) => void;
  decrementServedItem: (groupId: string, itemId: string) => void;
  completeServingGroup: (groupId: string) => void;

  toggleSauceItem: (groupId: string, sauceName: string) => void;

  currentUser: Employee | null;
  login: (idOrPhone: string, pass: string) => boolean;
  logout: () => void;

  isLoading: boolean;
  lastUpdated: string;
  reloadData: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// MOCK DATA
const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Nguyễn Văn A', role: EmployeeRole.MANAGER, hourlyRate: 60000, phone: '0901234567', email: 'admin@restaurant.com', password: 'admin' },
];
const INITIAL_SETTINGS: SystemSettings = {
    location: { latitude: 21.0285, longitude: 105.8542, radiusMeters: 100, name: "Nhà hàng Trung tâm" },
    wifis: [],
    rules: { startHour: '08:00', endHour: '17:00', allowedLateMinutes: 15 }
};

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('--:--');
  
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [logs, setLogs] = useState<TimesheetLog[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [servingGroups, setServingGroups] = useState<ServingGroup[]>([]);
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([
      { id: '1', task: 'Kiểm tra Bếp ga', isCompleted: false, assignee: 'Bếp' }
  ]);
  
  const [currentUser, setCurrentUser] = useState<Employee | null>(INITIAL_EMPLOYEES[0]); // Default Admin

  const loadData = useCallback(async () => {
      setIsLoading(true);
      const data = await sheetService.fetchAllData();
      if (data) {
          if (data.employees?.length > 0) setEmployees(data.employees);
          if (data.logs) setLogs(data.logs);
          if (data.servingGroups) setServingGroups(data.servingGroups);
          if (data.settings) setSettings(data.settings);
      }
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      setIsLoading(false);
  }, []);

  useEffect(() => {
      loadData();
      const intervalId = setInterval(() => loadData(), 60000);
      return () => clearInterval(intervalId);
  }, [loadData]);

  // --- CORE LOGIC: GENERATE PREP LIST ---
  const generatePrepList = (group: ServingGroup): SauceItem[] => {
      const prepList: SauceItem[] = [];
      const menuNames = group.items.map(i => i.name.toLowerCase());
      const groupNameLower = group.name.toLowerCase();

      // 1. Pax Type Detection (Strict Regex)
      // Tìm chữ sau "pax" cho đến khi gặp xuống dòng hoặc ký tự đặc biệt
      let paxType = "";
      const paxMatch = groupNameLower.match(/pax\s+([^\n\r(]+)/);
      if (paxMatch && paxMatch[1]) {
          paxType = paxMatch[1].trim();
      }

      const isEuro = /âu|eu|euro/.test(paxType);
      const isKorean = /hàn|han|korea|kor/.test(paxType);
      const isVietnamese = /việt|viet|vn/.test(paxType); // Chỉ bắt chữ Việt trong dòng Pax

      // 2. Table Calculation
      let tableCount = group.tableCount || 0;
      if (tableCount === 0) {
          // Fallback: Try to find a shared item quantity or estimate
          const sharedItem = group.items.find(i => i.name.toLowerCase().includes('lẩu'));
          if (sharedItem) tableCount = sharedItem.totalQuantity;
          else tableCount = Math.ceil(group.guestCount / 6);
      }
      const paxPerTable = group.guestCount / (tableCount || 1);

      // 3. Helper: Standard Quantity Rule (<4 = 1, >4 = 2, Max 2)
      const getStandardBowls = (tables: number, paxPerT: number) => {
          const perTable = paxPerT > 4 ? 2 : 1;
          return perTable * tables;
      };

      // --- APPLY RULES ---

      // A. Nước mắm (Chỉ khách Việt/Việt Kiều)
      if (isVietnamese) {
          prepList.push({ 
              name: "Nước mắm", 
              quantity: getStandardBowls(tableCount, paxPerTable), 
              unit: "Bát", isCompleted: false, note: "Khách Việt" 
          });
      }

      // B. Xì dầu (Tất cả khách)
      let soyQty = getStandardBowls(tableCount, paxPerTable);
      let soyNote = "Tiêu chuẩn";
      // Ngoại lệ: Khách Âu -> Luôn là 1 bát/bàn
      if (isEuro) { soyQty = 1 * tableCount; soyNote = "Khách Âu (1 bát/bàn)"; }
      // Ngoại lệ: Có món Gỏi -> 4 bát/bàn (Nếu không phải Âu)
      if (!isEuro && menuNames.some(n => n.includes('gỏi'))) { 
          soyQty = 4 * tableCount; soyNote = "Món Gỏi (4 bát/bàn)"; 
      }
      prepList.push({ name: "Xì dầu", quantity: soyQty, unit: "Bát", isCompleted: false, note: soyNote });

      // C. Nước chấm nem (Có món Nem)
      if (menuNames.some(n => n.includes('nem'))) {
          let nemQty = getStandardBowls(tableCount, paxPerTable);
          let nemNote = "Có món Nem";
          if (isEuro) { nemQty = 1 * tableCount; nemNote = "Khách Âu (1 bát/bàn)"; }
          prepList.push({ name: "Nước chấm nem", quantity: nemQty, unit: "Bát", isCompleted: false, note: nemNote });
      }

      // D. Nước chấm cá (Cá hồi/tầm nướng)
      if (menuNames.some(n => (n.includes('cá hồi') || n.includes('cá tầm')) && n.includes('nướng'))) {
          prepList.push({ name: "Nước chấm cá", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Cá nướng" });
      }

      // E. Ớt tươi (Trừ khách Âu)
      if (!isEuro) {
          prepList.push({ name: "Ớt tươi", quantity: soyQty, unit: "Bát", isCompleted: false });
      }

      // F. Muối vừng (Cơm lam, rau luộc)
      if (menuNames.some(n => n.includes('cơm lam') || n.includes('rau luộc') || n.includes('củ luộc'))) {
           prepList.push({ name: "Muối vừng", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
      }

      // G. Chẩm chéo (Gà nướng, trừ Mật ong/Đồng quê)
      if (menuNames.some(n => n.includes('gà nướng') && !n.includes('mật ong') && !n.includes('đồng quê'))) {
           prepList.push({ name: "Chẩm chéo", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Gà nướng" });
      }

      // H. Tương bần (Lợn hấp)
      if (menuNames.some(n => n.includes('lợn hấp'))) {
           prepList.push({ name: "Tương bần", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
      }

      // I. Nước chấm gỏi (Gỏi cá hồi -> Luôn 1 bát/bàn)
      if (menuNames.some(n => n.includes('gỏi cá hồi'))) {
           prepList.push({ name: "Nước chấm gỏi", quantity: 1 * tableCount, unit: "Bát", isCompleted: false, note: "1 bát/bàn" });
      }

      // J. Bếp ga (Lẩu -> Theo số bàn)
      if (menuNames.some(n => n.includes('lẩu'))) {
           prepList.push({ name: "Bếp ga", quantity: 1 * tableCount, unit: "Chiếc", isCompleted: false });
      }

      // K. Muối tiêu (Chỉ khách Âu -> 1 phần/bàn)
      if (isEuro) {
           prepList.push({ name: "Muối tiêu", quantity: 1 * tableCount, unit: "Phần", isCompleted: false, note: "Khách Âu" });
      }

      // L. Tương ớt (Khoai chiên)
      if (menuNames.some(n => (n.includes('khoai lang') || n.includes('khoai tây')) && n.includes('chiên'))) {
           prepList.push({ name: "Tương ớt", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Khoai chiên" });
      }

      // M. Sốt ba chỉ quay (Khách Hàn + Có món Ba chỉ quay)
      // Logic nới lỏng: chứa "ba chỉ" VÀ "quay", hoặc "heo quay", "lợn quay"
      const hasPorkBelly = menuNames.some(n => (n.includes('ba chỉ') && n.includes('quay')) || n.includes('heo quay') || n.includes('lợn quay'));
      if (isKorean && hasPorkBelly) {
           prepList.push({ name: "Sốt ba chỉ quay", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false, note: "Khách Hàn - Ba chỉ" });
      }

      // N. Rau xà lách (Khách Hàn -> Luôn 1 đĩa/bàn)
      if (isKorean) {
           prepList.push({ name: "Rau xà lách", quantity: 1 * tableCount, unit: "Đĩa", isCompleted: false, note: "Khách Hàn" });
      }

      return prepList;
  };

  // DATA OPERATIONS
  const addServingGroup = (group: ServingGroup) => {
      const prepList = generatePrepList(group);
      const groupWithPrep = { ...group, prepList };
      setServingGroups(prev => [groupWithPrep, ...prev]);
      sheetService.addServingGroup(groupWithPrep); 
  };

  const updateServingGroup = (groupId: string, updates: Partial<ServingGroup>) => {
    setServingGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        const updatedGroup = { ...g, ...updates };
        updatedGroup.prepList = generatePrepList(updatedGroup);
        return updatedGroup;
    }));
  };

  const addServingItem = (groupId: string, item: ServingItem) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const updatedGroup = { ...g, items: [...g.items, item] };
          updatedGroup.prepList = generatePrepList(updatedGroup);
          return updatedGroup;
      }));
  };

  const updateServingItem = (groupId: string, itemId: string, updates: Partial<ServingItem>) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const newItems = g.items.map(i => i.id === itemId ? { ...i, ...updates } : i);
          const updatedGroup = { ...g, items: newItems };
          updatedGroup.prepList = generatePrepList(updatedGroup);
          return updatedGroup;
      }));
  };

  const deleteServingItem = (groupId: string, itemId: string) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const updatedGroup = { ...g, items: g.items.filter(i => i.id !== itemId) };
          updatedGroup.prepList = generatePrepList(updatedGroup);
          return updatedGroup;
      }));
  };

  const toggleSauceItem = (groupId: string, sauceName: string) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId || !g.prepList) return g;
          const newPrepList = g.prepList.map(s => s.name === sauceName ? { ...s, isCompleted: !s.isCompleted } : s);
          return { ...g, prepList: newPrepList };
      }));
  };

  const incrementServedItem = (groupId: string, itemId: string) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const items = g.items.map(i => i.id === itemId ? { ...i, servedQuantity: i.servedQuantity + 1 } : i);
          return { ...g, items };
      }));
  };

  const decrementServedItem = (groupId: string, itemId: string) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const items = g.items.map(i => i.id === itemId ? { ...i, servedQuantity: Math.max(0, i.servedQuantity - 1) } : i);
          return { ...g, items };
      }));
  };

  const completeServingGroup = (groupId: string) => {
      setServingGroups(prev => prev.map(g => g.id === groupId ? { ...g, status: 'COMPLETED' } : g));
  };

  // Auth & Misc
  const login = (id: string, pass: string) => { setCurrentUser(employees[0]); return true; }; // Mock
  const logout = () => {}; 
  const addEmployee = (e: Employee) => setEmployees(p => [...p, e]);
  const updateEmployee = (e: Employee) => setEmployees(p => p.map(x => x.id === e.id ? e : x));
  const deleteEmployee = (id: string) => setEmployees(p => p.filter(x => x.id !== id));
  const registerEmployeeFace = (id: string, img: string) => {};
  const addAttendanceLog = (l: TimesheetLog) => setLogs(p => [l, ...p]);
  const updateAttendanceLog = (l: TimesheetLog) => setLogs(p => p.map(x => x.id === l.id ? l : x));
  const addRequest = (r: EmployeeRequest) => setRequests(p => [r, ...p]);
  const updateRequestStatus = (id: string, s: RequestStatus) => setRequests(p => p.map(x => x.id === id ? { ...x, status: s } : x));
  const updateSettings = (s: SystemSettings) => setSettings(s);
  const togglePrepTask = (id: string) => setPrepTasks(p => p.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t));

  return (
    <GlobalContext.Provider value={{ 
      employees, addEmployee, updateEmployee, deleteEmployee, registerEmployeeFace,
      logs, addAttendanceLog, updateAttendanceLog,
      requests, addRequest, updateRequestStatus,
      settings, updateSettings,
      menuItems: [], prepTasks, togglePrepTask,
      servingGroups, addServingGroup, updateServingGroup,
      addServingItem, updateServingItem, deleteServingItem,
      incrementServedItem, decrementServedItem, completeServingGroup,
      toggleSauceItem,
      currentUser, login, logout,
      isLoading, lastUpdated, reloadData: loadData
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) throw new Error('useGlobalContext must be used within a GlobalProvider');
  return context;
};
