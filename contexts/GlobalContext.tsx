
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, RequestType, 
  SystemSettings, WifiConfig, MenuItem, MenuStatus, PrepTask,
  ServingGroup, ServingItem
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

  // Kitchen Ops
  menuItems: MenuItem[];
  toggleMenuStatus: (id: string) => void;
  prepTasks: PrepTask[];
  togglePrepTask: (id: string) => void;

  // Serving Ops
  servingGroups: ServingGroup[];
  addServingGroup: (group: ServingGroup) => void;
  updateServingGroup: (groupId: string, updates: Partial<ServingGroup>) => void;
  
  // Item CRUD
  addServingItem: (groupId: string, item: ServingItem) => void;
  updateServingItem: (groupId: string, itemId: string, updates: Partial<ServingItem>) => void;
  deleteServingItem: (groupId: string, itemId: string) => void;

  incrementServedItem: (groupId: string, itemId: string) => void;
  decrementServedItem: (groupId: string, itemId: string) => void;
  completeServingGroup: (groupId: string) => void;

  // AUTH
  currentUser: Employee | null;
  login: (idOrPhone: string, pass: string) => boolean;
  logout: () => void;

  isLoading: boolean;
  reloadData: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Initial Mock Data (Fallback if Sheet is not connected)
const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Nguyễn Văn A', role: EmployeeRole.MANAGER, hourlyRate: 60000, phone: '0901234567', email: 'vana@restaurant.com', password: '123456' },
  { id: '2', name: 'Trần Thị B', role: EmployeeRole.CHEF, hourlyRate: 45000, phone: '0901234568', email: 'thib@restaurant.com', password: '123456' },
  { id: '3', name: 'Lê Văn C', role: EmployeeRole.WAITER, hourlyRate: 25000, phone: '0901234569', email: 'vanc@restaurant.com', password: '123456' },
];

const INITIAL_LOGS: TimesheetLog[] = [];

const INITIAL_REQUESTS: EmployeeRequest[] = [];

const INITIAL_SETTINGS: SystemSettings = {
    location: {
        latitude: 21.0285,
        longitude: 105.8542,
        radiusMeters: 100,
        name: "Nhà hàng Trung tâm"
    },
    wifis: [
        { id: '1', name: 'Restaurant_Guest', bssid: '00:11:22:33:44:55', isActive: true },
        { id: '2', name: 'Restaurant_Staff', bssid: 'AA:BB:CC:DD:EE:FF', isActive: true }
    ],
    rules: {
        startHour: '08:00',
        endHour: '17:00',
        allowedLateMinutes: 15
    }
};

const INITIAL_MENU: MenuItem[] = [
    { id: '1', name: 'Phở Bò Đặc Biệt', category: 'Món Chính', price: 65000, status: MenuStatus.AVAILABLE },
    { id: '2', name: 'Bún Chả Hà Nội', category: 'Món Chính', price: 55000, status: MenuStatus.AVAILABLE },
];

const INITIAL_TASKS: PrepTask[] = [
    { id: '1', task: 'Ninh nước dùng phở (6 tiếng)', isCompleted: false, assignee: 'Bếp trưởng' },
];

const INITIAL_SERVING_GROUPS: ServingGroup[] = [];

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [logs, setLogs] = useState<TimesheetLog[]>(INITIAL_LOGS);
  const [requests, setRequests] = useState<EmployeeRequest[]>(INITIAL_REQUESTS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>(INITIAL_TASKS);
  const [servingGroups, setServingGroups] = useState<ServingGroup[]>(INITIAL_SERVING_GROUPS);

  // --- BYPASS LOGIN: Set default user to Admin immediately ---
  const [currentUser, setCurrentUser] = useState<Employee | null>(INITIAL_EMPLOYEES[0]);

  const loadData = useCallback(async () => {
      setIsLoading(true);
      const data = await sheetService.fetchAllData();
      if (data) {
          if (data.employees && data.employees.length > 0) setEmployees(data.employees);
          if (data.logs) setLogs(data.logs);
          if (data.servingGroups) setServingGroups(data.servingGroups);
          if (data.settings) setSettings(data.settings);
      }
      
      // Check Local Storage for logged in user, OR ensure Admin is set if mock data was used
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
          try {
              const user = JSON.parse(savedUser);
              setCurrentUser(user);
          } catch(e) {
              localStorage.removeItem('currentUser');
          }
      } else {
          // Ensure we always have a user for testing
          setCurrentUser(INITIAL_EMPLOYEES[0]);
      }
      
      setIsLoading(false);
  }, []);

  useEffect(() => {
      loadData();
  }, [loadData]);

  // --- AUTH LOGIC ---
  const login = (idOrPhone: string, pass: string): boolean => {
      const user = employees.find(e => 
          (e.id === idOrPhone || e.phone === idOrPhone) && 
          (e.password === pass || (!e.password && pass === '123456')) 
      );

      if (user) {
          setCurrentUser(user);
          localStorage.setItem('currentUser', JSON.stringify(user));
          return true;
      }
      return false;
  };

  const logout = () => {
      // Disable logout for now to keep system accessible
      alert("Chế độ Test: Đã tắt chức năng đăng xuất.");
      // setCurrentUser(null);
      // localStorage.removeItem('currentUser');
  };

  // --- DATA OPERATIONS ---
  const addEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);
  const updateEmployee = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  const deleteEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));
  
  const registerEmployeeFace = (id: string, image: string) => {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, avatar: 'Registered' } : e));
      sheetService.registerFace(id, image);
  };

  const addAttendanceLog = (log: TimesheetLog) => {
      setLogs(prev => [log, ...prev]);
      sheetService.logAttendance(log);
  };

  const updateAttendanceLog = (updatedLog: TimesheetLog) => {
      setLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
      sheetService.logAttendance(updatedLog);
  };

  const addRequest = (req: EmployeeRequest) => setRequests(prev => [req, ...prev]);
  const updateRequestStatus = (id: string, status: RequestStatus) => setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));

  const updateSettings = (newSettings: SystemSettings) => {
      setSettings(newSettings);
      sheetService.saveSettings(newSettings);
  };

  const toggleMenuStatus = (id: string) => {
      setMenuItems(prev => prev.map(item => {
          if (item.id === id) {
              let nextStatus = MenuStatus.AVAILABLE;
              if (item.status === MenuStatus.AVAILABLE) nextStatus = MenuStatus.LOW_STOCK;
              else if (item.status === MenuStatus.LOW_STOCK) nextStatus = MenuStatus.SOLD_OUT;
              return { ...item, status: nextStatus };
          }
          return item;
      }));
  };

  const togglePrepTask = (id: string) => {
      setPrepTasks(prev => prev.map(task => 
          task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      ));
  };

  const addServingGroup = (group: ServingGroup) => {
      setServingGroups(prev => [group, ...prev]);
      sheetService.addServingGroup(group); 
  }

  const updateServingGroup = (groupId: string, updates: Partial<ServingGroup>) => {
    setServingGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g));
  }

  const addServingItem = (groupId: string, item: ServingItem) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          return { ...g, items: [...g.items, item] };
      }));
  }

  const updateServingItem = (groupId: string, itemId: string, updates: Partial<ServingItem>) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          const newItems = g.items.map(i => i.id === itemId ? { ...i, ...updates } : i);
          return { ...g, items: newItems };
      }));
  }

  const deleteServingItem = (groupId: string, itemId: string) => {
      setServingGroups(prev => prev.map(g => {
          if (g.id !== groupId) return g;
          return { ...g, items: g.items.filter(i => i.id !== itemId) };
      }));
  }

  const incrementServedItem = (groupId: string, itemId: string) => {
      setServingGroups(prev => prev.map(group => {
          if (group.id !== groupId) return group;
          const updatedItems = group.items.map(item => {
              if (item.id === itemId) {
                  if (item.servedQuantity >= item.totalQuantity) return item;
                  return { ...item, servedQuantity: item.servedQuantity + 1 };
              }
              return item;
          });
          return { ...group, items: updatedItems };
      }));
  }

  const decrementServedItem = (groupId: string, itemId: string) => {
      setServingGroups(prev => prev.map(group => {
          if (group.id !== groupId) return group;
          const updatedItems = group.items.map(item => {
              if (item.id === itemId) {
                  if (item.servedQuantity <= 0) return item;
                  return { ...item, servedQuantity: item.servedQuantity - 1 };
              }
              return item;
          });
          return { ...group, items: updatedItems };
      }));
  }

  const completeServingGroup = (groupId: string) => {
    setServingGroups(prev => prev.map(g => g.id === groupId ? { ...g, status: 'COMPLETED' } : g));
  }

  return (
    <GlobalContext.Provider value={{ 
      employees, addEmployee, updateEmployee, deleteEmployee, registerEmployeeFace,
      logs, addAttendanceLog, updateAttendanceLog,
      requests, addRequest, updateRequestStatus,
      settings, updateSettings,
      menuItems, toggleMenuStatus,
      prepTasks, togglePrepTask,
      servingGroups, addServingGroup, updateServingGroup,
      addServingItem, updateServingItem, deleteServingItem,
      incrementServedItem, decrementServedItem, completeServingGroup,
      currentUser, login, logout,
      isLoading,
      reloadData: loadData
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
