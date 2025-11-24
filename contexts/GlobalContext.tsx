
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, 
  SystemSettings, MenuItem, PrepTask,
  ServingGroup, ServingItem, SauceItem,
  HandoverLog, WorkSchedule, SystemAlert, RequestType
} from '../types';
import { sheetService } from '../services/sheetService';
import { sendWebhookMessage } from '../services/integrationService';

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
  dismissedAlertIds: Set<string>; // EXPORT THIS
  dismissAlert: (id: string) => void; // EXPORT THIS

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

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Nguyễn Văn A', role: EmployeeRole.MANAGER, hourlyRate: 60000, allowance: 2000000, phone: '0901234567', email: 'admin@restaurant.com', password: '123456' },
];

const INITIAL_SETTINGS: SystemSettings = {
    location: { latitude: 21.0285, longitude: 105.8542, radiusMeters: 100, name: "Nhà hàng Trung tâm" },
    wifis: [],
    rules: { allowedLateMinutes: 15 },
    servingConfig: { lateAlertMinutes: 5 }, // UPDATE: Default to 5 mins for easier testing
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
  
  const [activeAlerts, setActiveAlerts] = useState<SystemAlert[]>([]);
  
  // --- CLOUD SYNC STATE (Replaces LocalStorage) ---
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);

  const [pendingRequestIds, setPendingRequestIds] = useState<Set<string>>(new Set());
  const [deletedGroupIds, setDeletedGroupIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<Employee | null>(null); 

  const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      try {
          let d = dateStr;
          if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                   if (parts[2].length === 4) d = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
          }
          const date = new Date(d);
          if (isNaN(date.getTime())) return dateStr.split('T')[0];

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
      if (strVal.includes('T') === false && strVal.includes(':') && strVal.length >= 4) return strVal;
      return null;
  };

  // --- DISMISS ALERT (SYNC TO CLOUD) ---
  const dismissAlert = (id: string) => {
      // Optimistic update
      setDismissedAlertIds(prev => new Set(prev).add(String(id)));
      // Send to Sheet (This ensures it persists across devices)
      sheetService.dismissAlert(String(id));
  };

  // --- SYSTEM ALERTS: SERVING & ATTENDANCE ---
  const runSystemChecks = useCallback(() => {
      const now = new Date();
      const todayStr = normalizeDate(now.toISOString());
      
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinutes;

      // USE CONFIGURABLE THRESHOLD (Default 15 mins if missing)
      const lateThreshold = settings.servingConfig?.lateAlertMinutes || 15;

      const newAlerts: SystemAlert[] = [];

      // 1. CHECK SERVING (LATE ORDERS)
      servingGroups.forEach(group => {
          // Chỉ kiểm tra các nhóm đang ACTIVE (Đang ăn)
          if (group.status === 'ACTIVE' && group.startTime) {
              try {
                  const timeParts = String(group.startTime).split(':');
                  if (timeParts.length >= 2) {
                      const startH = parseInt(timeParts[0]);
                      const startM = parseInt(timeParts[1]);
                      
                      if (!isNaN(startH) && !isNaN(startM)) {
                          const startTotalMinutes = startH * 60 + startM;
                          
                          // Tính thời gian chênh lệch
                          let diffMinutes = currentTotalMinutes - startTotalMinutes;
                          
                          // Xử lý trường hợp qua đêm (VD: Vào 23:00, Hiện tại 00:10 -> -1370 phút)
                          if (diffMinutes < -1000) {
                              diffMinutes += 1440; // Cộng thêm 24h
                          }

                          // Nếu thời gian chờ lớn hơn ngưỡng cho phép
                          if (diffMinutes >= lateThreshold) {
                              // TÌM CÁC MÓN CÒN THIẾU
                              const missingDetails: string[] = [];
                              
                              group.items.forEach(i => {
                                  const served = Number(i.servedQuantity) || 0;
                                  const total = Number(i.totalQuantity) || 0;
                                  if (served < total) {
                                      const remaining = total - served;
                                      missingDetails.push(`${i.name} (thiếu ${remaining})`);
                                  }
                              });

                              if (missingDetails.length > 0) {
                                  const alertId = `alert_serving_${String(group.id)}`; 
                                  const missingText = missingDetails.join(', ');
                                  
                                  newAlerts.push({
                                      id: alertId,
                                      type: 'LATE_SERVING',
                                      message: `Đoàn ${group.name} chờ món quá lâu`,
                                      details: `Đã đợi ${diffMinutes} phút (Quy định: ${lateThreshold}p). Thiếu: ${missingText}`,
                                      groupId: String(group.id),
                                      severity: 'HIGH',
                                      timestamp: now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})
                                  });
                              }
                          }
                      }
                  }
              } catch (e) { console.error("Error checking serving alert:", e); }
          }
      });

      // 2. CHECK ATTENDANCE VIOLATIONS (LATE, EARLY, ABSENT)
      logs.forEach(log => {
          if (log.date === todayStr) {
              if (log.status === AttendanceStatus.LATE) {
                  newAlerts.push({
                      id: `alert_late_${String(log.id)}`,
                      type: 'ATTENDANCE_VIOLATION',
                      message: `Phát hiện đi muộn: ${log.employeeName}`,
                      details: `Muộn ${log.lateMinutes} phút (Check-in: ${log.checkIn})`,
                      severity: 'MEDIUM',
                      timestamp: now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})
                  });
              }
              if (log.status === AttendanceStatus.EARLY_LEAVE) {
                  newAlerts.push({
                      id: `alert_early_${String(log.id)}`,
                      type: 'ATTENDANCE_VIOLATION',
                      message: `Phát hiện về sớm: ${log.employeeName}`,
                      details: `Về lúc ${log.checkOut} (Sớm hơn quy định)`,
                      severity: 'MEDIUM',
                      timestamp: now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})
                  });
              }
          }
      });

      // B. Detect Absences
      schedules.forEach(schedule => {
          if (schedule.date === todayStr && schedule.shiftCode !== 'OFF') {
              const empLog = logs.find(l => String(l.employeeId) === String(schedule.employeeId) && l.date === todayStr);
              
              if (!empLog) {
                  const shift = settings.shiftConfigs.find(s => s.code === schedule.shiftCode);
                  if (shift) {
                      const [sH, sM] = shift.startTime.split(':').map(Number);
                      const shiftStartMins = sH * 60 + sM;
                      
                      // If current time is 30 mins past shift start AND no log
                      if (currentTotalMinutes > (shiftStartMins + 30)) {
                          const emp = employees.find(e => String(e.id) === String(schedule.employeeId));
                          newAlerts.push({
                              id: `alert_absent_${String(schedule.id)}`,
                              type: 'ATTENDANCE_VIOLATION',
                              message: `Cảnh báo vắng mặt: ${emp ? emp.name : 'Nhân viên'}`,
                              details: `Ca ${shift.name} (${shift.startTime}) chưa thấy Check-in!`,
                              severity: 'HIGH',
                              timestamp: now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})
                          });
                      }
                  }
              }
          }
      });

      setActiveAlerts(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(newAlerts);
          if (prevStr !== newStr) return newAlerts;
          return prev;
      });

  }, [servingGroups, logs, schedules, settings, employees]); 

  useEffect(() => {
      runSystemChecks();
      const interval = setInterval(runSystemChecks, 5000); // Check every 5s (Faster check)
      return () => clearInterval(interval);
  }, [runSystemChecks]);


  const loadData = useCallback(async () => {
      setIsLoading(true);
      try {
        const data = await sheetService.fetchAllData();
        if (data) {
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

            if (data.logs && Array.isArray(data.logs)) {
                const parsedLogs = data.logs.map((l: any) => ({
                    ...l,
                    id: String(l.id),
                    employeeId: String(l.employeeId),
                    date: normalizeDate(l.date),
                    checkIn: cleanGoogleSheetTime(l.checkIn),
                    checkOut: cleanGoogleSheetTime(l.checkOut),
                    lateMinutes: Number(l.lateMinutes) || 0,
                    totalHours: Number(l.totalHours) || 0
                }));
                setLogs(parsedLogs);
            }

            if (data.requests && Array.isArray(data.requests)) {
                setRequests(prevLocalRequests => {
                    const serverRequests = data.requests.map((r:any) => ({...r, id: String(r.id), employeeId: String(r.employeeId)}));
                    const pendingLocal = prevLocalRequests.filter(r => pendingRequestIds.has(r.id));
                    const stillPending = pendingLocal.filter(localReq => !serverRequests.some((serverReq: any) => String(serverReq.id) === String(localReq.id)));
                    return [...stillPending, ...serverRequests];
                });
                setPendingRequestIds(prev => {
                    const newSet = new Set(prev);
                    data.requests.forEach((r: any) => { if (newSet.has(String(r.id))) newSet.delete(String(r.id)); });
                    return newSet;
                });
            }

            if (data.servingGroups && Array.isArray(data.servingGroups)) {
                const freshGroups = data.servingGroups
                    .filter((g: any) => !deletedGroupIds.has(String(g.id)))
                    .map((g: any) => {
                        let parsedItems = [];
                        let parsedPrepList = [];
                        let rawItems = g.items;
                        let rawPrepList = g.prepList;

                        if (typeof rawItems === 'string') {
                            try { rawItems = JSON.parse(rawItems); } catch (e) { rawItems = []; }
                        }
                        
                        if (typeof rawPrepList === 'string') {
                            try { rawPrepList = JSON.parse(rawPrepList); } catch (e) { rawPrepList = []; }
                        }

                        if (Array.isArray(rawItems)) {
                            parsedItems = rawItems.map((i: any) => ({
                                ...i,
                                totalQuantity: Number(i.totalQuantity) || 0,
                                servedQuantity: Number(i.servedQuantity) || 0
                            }));
                        }
                        
                        if (Array.isArray(rawPrepList)) {
                            parsedPrepList = rawPrepList;
                        }

                        return {
                            ...g,
                            id: String(g.id),
                            date: normalizeDate(g.date),
                            startTime: cleanGoogleSheetTime(g.startTime),
                            completionTime: cleanGoogleSheetTime(g.completionTime),
                            items: parsedItems,
                            prepList: parsedPrepList
                        };
                    });

                setServingGroups(prevGroups => {
                    const serverGroupsMap = new Map(freshGroups.map((g: any) => [g.id, g]));
                    const merged = prevGroups.map(localG => {
                        const serverG = serverGroupsMap.get(localG.id) as any;
                        if (!serverG) return localG;
                        
                        const mergedGroup = { ...serverG };

                        if (localG.status === 'COMPLETED' && serverG.status !== 'COMPLETED') {
                            mergedGroup.status = 'COMPLETED';
                            mergedGroup.completionTime = localG.completionTime;
                        }

                        if (localG.startTime && !serverG.startTime) {
                            mergedGroup.startTime = localG.startTime;
                        }

                        if ((!mergedGroup.items || mergedGroup.items.length === 0) && localG.items && localG.items.length > 0) {
                            mergedGroup.items = localG.items;
                        }
                        
                         if ((!mergedGroup.prepList || mergedGroup.prepList.length === 0) && localG.prepList && localG.prepList.length > 0) {
                            mergedGroup.prepList = localG.prepList;
                        }

                        return mergedGroup;
                    });
                    
                    freshGroups.forEach((serverG: any) => {
                        if (!merged.find(m => m.id === serverG.id)) {
                            merged.push(serverG);
                        }
                    });
                    return merged;
                });
                
                setDeletedGroupIds(prev => {
                    const newSet = new Set(prev);
                    const serverIds = new Set(data.servingGroups.map((g: any) => String(g.id)));
                    prev.forEach(id => { if (!serverIds.has(id)) newSet.delete(id); });
                    return newSet;
                });
            }

            if (data.handoverLogs) setHandoverLogs(data.handoverLogs.map((h:any) => ({...h, id: String(h.id)})));
            
            if (data.schedules && Array.isArray(data.schedules)) {
                const parsedSchedules = data.schedules.map((s: any) => ({
                    ...s,
                    id: String(s.id),
                    employeeId: String(s.employeeId),
                    date: normalizeDate(s.date)
                }));
                setSchedules(parsedSchedules);
            }

            // --- SYNC DISMISSED ALERTS FROM CLOUD ---
            if (data.dismissedAlerts && Array.isArray(data.dismissedAlerts)) {
                const dismissedSet = new Set<string>(data.dismissedAlerts.map((a: any) => String(a.id)));
                setDismissedAlertIds(dismissedSet);
            }

            if (data.prepTasks && Array.isArray(data.prepTasks)) {
                setPrepTasks(data.prepTasks.map((t: any) => ({
                    ...t,
                    id: String(t.id)
                })));
            }
            
            if (data.settings) {
               const raw = data.settings;
               const mergedSettings: SystemSettings = {
                   location: { ...INITIAL_SETTINGS.location, ...(raw.location || {}) },
                   wifis: Array.isArray(raw.wifis) ? raw.wifis : INITIAL_SETTINGS.wifis,
                   rules: { ...INITIAL_SETTINGS.rules, ...(raw.rules || {}) },
                   shiftConfigs: Array.isArray(raw.shiftConfigs) ? raw.shiftConfigs : INITIAL_SETTINGS.shiftConfigs,
                   servingConfig: { ...INITIAL_SETTINGS.servingConfig, ...(raw.servingConfig || {}) },
                   webhook: raw.webhook || undefined
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
      if (menuNames.some(n => n.includes('cơm lam') || n.includes('khoai luộc') || n.includes('củ luộc') || n.includes('rau củ'))) prepList.push({ name: "Muối vừng", quantity: getStandardBowls(tableCount, paxPerTable), unit: "Bát", isCompleted: false });
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
          employeeId: String(employeeId),
          date,
          shiftCode
      };
      setSchedules(prev => {
          const filtered = prev.filter(s => !(s.employeeId === String(employeeId) && s.date === date));
          return [...filtered, newSchedule];
      });
      sheetService.syncSchedule(newSchedule);
  };

  const addAttendanceLog = (l: TimesheetLog) => { setLogs(p => [l, ...p]); sheetService.logAttendance(l); };
  const updateAttendanceLog = (l: TimesheetLog) => { setLogs(p => p.map(x => x.id === l.id ? l : x)); sheetService.logAttendance(l); };
  
  const addRequest = (r: EmployeeRequest) => { 
      setPendingRequestIds(prev => new Set(prev).add(r.id));
      setRequests(p => [r, ...p]); 
      sheetService.syncRequest(r); 
  };

  const updateRequestStatus = (id: string, s: RequestStatus) => {
      setRequests(p => p.map(x => { 
          if (x.id === id) { 
              const updated = { ...x, status: s }; 
              
              // --- AUTOMATION: UPDATE SCHEDULE IF APPROVED ---
              if (s === RequestStatus.APPROVED) {
                  if (updated.type === RequestType.LEAVE) {
                      assignShift(updated.employeeId, updated.date, 'OFF');
                  } else if (updated.type === RequestType.SHIFT_SWAP && updated.targetShift) {
                      assignShift(updated.employeeId, updated.date, updated.targetShift);
                  }
              }
              // -----------------------------------------------

              sheetService.syncRequest(updated); 
              return updated; 
          } 
          return x; 
      })); 
  };
  
  const updateSettings = (s: SystemSettings) => { setSettings(s); sheetService.saveSettings(s); };
  const syncGroupState = (group: ServingGroup) => { sheetService.syncServingGroup(group); }
  
  const addServingGroup = (group: ServingGroup) => { 
      const prepList = generatePrepList(group); 
      const groupWithData = { 
          ...group, 
          prepList,
          startTime: null, 
          date: group.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
      }; 
      setServingGroups(prev => [groupWithData, ...prev]); 
      syncGroupState(groupWithData); 
  };

  const updateServingGroup = (groupId: string, updates: Partial<ServingGroup>) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const updatedGroup = { ...g, ...updates }; if (updates.items || updates.guestCount || updates.tableCount || updates.name) { updatedGroup.prepList = generatePrepList(updatedGroup); } syncGroupState(updatedGroup); return updatedGroup; })); };
  
  const deleteServingGroup = (groupId: string) => { 
      setDeletedGroupIds(prev => new Set(prev).add(groupId)); 
      setServingGroups(prev => prev.filter(g => g.id !== groupId)); 
      sheetService.deleteServingGroup(groupId); 
  };

  const startServingGroup = (groupId: string) => {
      const timeStr = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      updateServingGroup(groupId, { startTime: timeStr });
  };
  
  const addServingItem = (groupId: string, item: ServingItem) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const updatedGroup = { ...g, items: [...g.items, item] }; updatedGroup.prepList = generatePrepList(updatedGroup); syncGroupState(updatedGroup); return updatedGroup; })); };
  const updateServingItem = (groupId: string, itemId: string, updates: Partial<ServingItem>) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const newItems = g.items.map(i => i.id === itemId ? { ...i, ...updates } : i); const updatedGroup = { ...g, items: newItems }; updatedGroup.prepList = generatePrepList(updatedGroup); syncGroupState(updatedGroup); return updatedGroup; })); };
  const deleteServingItem = (groupId: string, itemId: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const updatedGroup = { ...g, items: g.items.filter(i => i.id !== itemId) }; updatedGroup.prepList = generatePrepList(updatedGroup); syncGroupState(updatedGroup); return updatedGroup; })); };
  const toggleSauceItem = (groupId: string, sauceName: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId || !g.prepList) return g; const newPrepList = g.prepList.map(s => s.name === sauceName ? { ...s, isCompleted: !s.isCompleted } : s); const updatedGroup = { ...g, prepList: newPrepList }; syncGroupState(updatedGroup); return updatedGroup; })); };
  const incrementServedItem = (groupId: string, itemId: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const items = g.items.map(i => i.id === itemId ? { ...i, servedQuantity: i.servedQuantity + 1 } : i); const updatedGroup = { ...g, items }; syncGroupState(updatedGroup); return updatedGroup; })); };
  const decrementServedItem = (groupId: string, itemId: string) => { setServingGroups(prev => prev.map(g => { if (g.id !== groupId) return g; const items = g.items.map(i => i.id === itemId ? { ...i, servedQuantity: Math.max(0, i.servedQuantity - 1) } : i); const updatedGroup = { ...g, items }; syncGroupState(updatedGroup); return updatedGroup; })); };
  const completeServingGroup = (groupId: string) => { 
      const nowStr = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      setServingGroups(prev => prev.map(g => { 
          if (g.id === groupId) { 
              const updated = { ...g, status: 'COMPLETED' as const, completionTime: nowStr }; 
              syncGroupState(updated); 
              return updated; 
          } 
          return g; 
      })); 
  };
  const addHandoverLog = (log: HandoverLog) => { setHandoverLogs(prev => [log, ...prev]); sheetService.logHandover(log); }

  const login = (idOrPhone: string, pass: string) => { 
      const inputClean = idOrPhone.replace(/\D/g, '');
      let user = employees.find(e => {
          if (String(e.password || '123456') !== String(pass)) return false;
          if (String(e.id) === idOrPhone) return true;
          const empPhoneClean = String(e.phone || '').replace(/\D/g, '');
          if (inputClean !== '' && empPhoneClean !== '') {
              return Number(inputClean) === Number(empPhoneClean);
          }
          return false;
      });
      if (!user && idOrPhone === '1' && pass === '123456') user = INITIAL_EMPLOYEES[0];
      if (user) { setCurrentUser(user); return true; }
      return false;
  }; 
  
  const logout = () => { setCurrentUser(null); }; 
  
  const togglePrepTask = (id: string) => {
      setPrepTasks(prev => {
          const newTasks = prev.map(t => {
              if (t.id === id) {
                  const updatedTask = { ...t, isCompleted: !t.isCompleted };
                  sheetService.syncPrepTask(updatedTask);
                  return updatedTask;
              }
              return t;
          });
          return newTasks;
      });
  };

  const addPrepTask = (task: PrepTask) => {
      setPrepTasks(prev => [task, ...prev]);
      sheetService.syncPrepTask(task);
  }

  const deletePrepTask = (id: string) => {
      setPrepTasks(prev => prev.filter(t => t.id !== id));
      sheetService.deletePrepTask(id);
  }

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
      isLoading, lastUpdated, reloadData: loadData
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
