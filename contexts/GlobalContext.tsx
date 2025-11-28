
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
  Employee, TimesheetLog, EmployeeRequest, 
  AttendanceStatus, EmployeeRole, RequestStatus, 
  SystemSettings, MenuItem, PrepTask,
  ServingGroup, ServingItem, SauceItem,
  HandoverLog, WorkSchedule, SystemAlert, RequestType,
  SystemLog, OnlineUser, Task, TaskStatus, Feedback
} from '../types';
import { supabase } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';
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
  
  tasks: Task[];
  addTask: (task: Task) => void;
  claimTask: (taskId: string, employeeId: string, participantIds?: string[]) => void;
  submitTaskProof: (taskId: string, proofImage: string) => void;
  verifyTask: (taskId: string, managerId: string) => void;
  rejectTask: (taskId: string, reason: string, penalty: number) => void;
  deleteTask: (taskId: string) => void;

  feedbacks: Feedback[];
  submitFeedback: (data: any) => Promise<void>;
  trackReviewClick: (staffId: string) => Promise<void>; // New function

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
  
  submitGuestOrder: (tableId: string, cartItems: {item: MenuItem, quantity: number}[]) => Promise<void>;

  // DEV FEATURES
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
  
  const [activeAlerts, setActiveAlerts] = useState<SystemAlert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null); 
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission>('default');

  // DEV FEATURES STATE
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const currentUserRef = useRef(currentUser);
  const servingGroupsRef = useRef(servingGroups);
  const settingsRef = useRef(settings); 
  const tasksRef = useRef(tasks);
  const employeesRef = useRef(employees);

  // --- AUDIO CONTEXT SYSTEM (FIX FOR IOS) ---
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
                  
                  // Play silent buffer to unlock iOS
                  const buffer = ctx.createBuffer(1, 1, 22050);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.start(0);
              }
          }
      } catch (e) {
          console.warn("Audio unlock failed:", e);
      }
  }, []);

  // GLOBAL AUTO-UNLOCK LISTENER
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

      if (typeof Notification !== 'undefined') {
          setNotificationPermissionStatus(Notification.permission);
      }

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
                  // Success: Ascending Arpeggio
                  oscillator.type = 'sine';
                  oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                  oscillator.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
                  oscillator.frequency.linearRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
                  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.6);
                  oscillator.start();
                  oscillator.stop(ctx.currentTime + 0.6);
              } else if (type === 'ERROR') {
                  // Error: Low Descending
                  oscillator.type = 'sawtooth';
                  oscillator.frequency.setValueAtTime(150, ctx.currentTime);
                  oscillator.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
                  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.4);
                  oscillator.start();
                  oscillator.stop(ctx.currentTime + 0.4);
              } else {
                  // Alert: High pitch beep sequence
                  oscillator.type = 'sine';
                  oscillator.frequency.setValueAtTime(880, ctx.currentTime); 
                  oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
                  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
                  oscillator.start();
                  oscillator.stop(ctx.currentTime + 0.5);
              }
          } else {
              unlockAudio();
          }
      } catch (e) { 
          console.warn("Sound play error (Oscillator):", e); 
      }
  };

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { servingGroupsRef.current = servingGroups; }, [servingGroups]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);

  // --- LOGGING HELPER ---
  const addSystemLog = (event: string, details: string, type: 'INFO' | 'WARNING' | 'ERROR' | 'DB_CHANGE') => {
      setSystemLogs(prev => [{
          id: Date.now().toString() + Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          event,
          details,
          type
      }, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  // --- OMNI-CHANNEL NOTIFICATION SYSTEM ---
  const dispatchNotification = async (title: string, body: string, type: 'ALERT' | 'SUCCESS' | 'ERROR' = 'ALERT') => {
      console.log(`[Notification Dispatch] Title: ${title} | Body: ${body}`);
      playSound(type); 

      if (Notification.permission !== 'granted') {
          console.warn("Notification permission not granted");
          return;
      }

      const tag = 'indigo-' + Date.now();
      const options = {
          body: body,
          icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
          tag: tag, 
          renotify: true, 
          requireInteraction: true 
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: title,
              body: body, 
              tag: tag
          });
      }

      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
              if (registration) {
                  registration.showNotification(title, options)
                      .catch(e => console.error("SW ShowNotification Failed:", e));
              }
          });
      }

      try {
          const n = new Notification(title, options);
          n.onclick = () => { window.focus(); n.close(); };
      } catch (e) {}
  };

  const requestNotificationPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
          try {
              unlockAudio();
              const result = await Notification.requestPermission();
              setNotificationPermissionStatus(result);
              if (result === 'granted') {
                  playSound();
              } 
              return result;
          } catch (e) {
              console.error(e);
              return 'denied';
          }
      }
      return 'denied';
  };

  const testNotification = async () => {
      try {
          unlockAudio();
          const permission = await requestNotificationPermission();
          
          if (permission === 'granted') {
              const time = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
              dispatchNotification(
                  "🔔 TEST HỆ THỐNG", 
                  `Đoàn: Gia đình Anh Nam (VIP)\nBàn: A1, A2 • Khách: 12 pax\nGiờ vào: ${time}\nĐây là dòng kiểm tra hiển thị văn bản nhiều dòng.`
              );
              alert("Đã gửi lệnh thông báo test.\nHãy kiểm tra âm thanh và banner.");
          } else {
              alert(`⚠️ QUYỀN THÔNG BÁO BỊ CHẶN!\n\nDo bạn đã từng bấm 'Chặn' (Block), ứng dụng không thể tự bật lại.\n\nCách khắc phục:\n1. Bấm vào biểu tượng Ổ khóa (🔒) hoặc Setting trên thanh địa chỉ.\n2. Chọn 'Quyền riêng tư' hoặc 'Cài đặt trang web'.\n3. Tìm mục 'Thông báo' và chọn 'Cho phép'.\n4. Tải lại trang.`);
          }
      } catch (e: any) {
          alert("Lỗi khi test: " + e.message);
      }
  };

  // --- DATA LOADING & SYNC ---
  const loadData = useCallback(async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      try {
          const data = await supabaseService.fetchAllData();
          
          const processedEmployees = data.employees.map(e => 
            e.id === 'admin' ? { ...e, role: EmployeeRole.DEV } : e
          );

          setEmployees(processedEmployees);
          setLogs(data.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          setRequests(data.requests);
          setServingGroups(data.servingGroups);
          setHandoverLogs(data.handoverLogs);
          setSchedules(data.schedules);
          setPrepTasks(data.prepTasks);
          setTasks(data.tasks); // Load tasks directly from DB
          setFeedbacks(data.feedbacks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

          if (data.settings && Object.keys(data.settings).length > 0) {
              setSettings(prev => ({...INITIAL_SETTINGS, ...data.settings}));
          }
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
                  } else {
                      localStorage.removeItem(STORAGE_SESSION_KEY);
                  }
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
                const presenceList = newState[key] as any[];
                presenceList.forEach(p => {
                    users.push({
                        userId: p.user_id,
                        name: p.name,
                        role: p.role,
                        onlineAt: p.online_at,
                        platform: p.platform
                    });
                });
            }
            users.sort((a, b) => new Date(b.onlineAt).getTime() - new Date(a.onlineAt).getTime());
            setOnlineUsers(users);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
              newPresences.forEach((p: any) => addSystemLog('USER_ONLINE', `${p.name} (${p.role}) vừa truy cập`, 'INFO'));
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
             leftPresences.forEach((p: any) => addSystemLog('USER_OFFLINE', `${p.name} đã rời đi`, 'INFO'));
          })

          .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
              addSystemLog('DB_CHANGE', `Table: ${payload.table} | Event: ${payload.eventType}`, 'DB_CHANGE');
              
              const config = settingsRef.current.notificationConfig || INITIAL_SETTINGS.notificationConfig;
              
              if (payload.table === 'serving_groups') {
                   // ... existing notification logic ...
                  if (payload.eventType === 'INSERT' && config.enableGuestArrival) {
                      const newGroup = payload.new as any;
                      dispatchNotification("🔔 KHÁCH MỚI ĐẾN", `Đoàn: ${newGroup.name}\nBàn: ${newGroup.location}`);
                  }
                  if (payload.eventType === 'UPDATE' && config.enableGuestArrival) {
                      const newGroupData = payload.new as any;
                      const oldGroupLocal = servingGroupsRef.current.find(g => String(g.id) === String(newGroupData.id));
                      if ((!oldGroupLocal || !oldGroupLocal.startTime) && !!newGroupData.start_time) {
                          dispatchNotification("🚀 KHÁCH ĐÃ VÀO", `Đoàn: ${newGroupData.name}\nBàn: ${newGroupData.location}`);
                      }
                  }
              }
              
              // --- TASK / KPI NOTIFICATIONS (UPDATED) ---
              if (payload.table === 'tasks') {
                  const newTask = payload.new as any;
                  const oldTask = payload.old as any;
                  const myId = currentUserRef.current?.id;

                  if (myId) {
                      // 1. New Task Available (Strict Check for ALL new tasks)
                      if (payload.eventType === 'INSERT' && newTask.status === 'OPEN') {
                           if (newTask.creator_id !== myId) {
                               dispatchNotification("📋 NHIỆM VỤ MỚI", `Có việc mới: ${newTask.title}\nNhấn để nhận ngay!`, 'ALERT');
                           }
                      }

                      // 2. Task Updates
                      if (payload.eventType === 'UPDATE') {
                           // Check if I am involved (Assignee or Participant)
                           const participants = newTask.participants || [];
                           const isParticipant = participants.includes(myId);
                           const isAssignee = newTask.assignee_id === myId;
                           const isCreator = newTask.creator_id === myId;

                           // --- INVITATION NOTIFICATION (New Logic) ---
                           // Check if I was just added to the participants list by someone else
                           if (isParticipant && newTask.assignee_id !== myId) {
                               // Find local version to check if I was already in it
                               const localTask = tasksRef.current.find(t => t.id === newTask.id);
                               const wasInList = localTask?.participants?.includes(myId);
                               
                               // If I wasn't in list before, or status changed to IN_PROGRESS and I'm in list
                               if (!wasInList && newTask.status === 'IN_PROGRESS') {
                                   dispatchNotification("🤝 LỜI MỜI HỢP TÁC", `Bạn được ${newTask.assignee_name} thêm vào nhóm nhiệm vụ "${newTask.title}". Hãy cùng hoàn thành nhé!`, 'SUCCESS');
                               }
                           }

                           // --- STATUS NOTIFICATIONS ---
                           if (isAssignee || isParticipant) {
                               // Verified (Approved)
                               if (newTask.status === 'VERIFIED' && oldTask.status !== 'VERIFIED') {
                                   dispatchNotification("✅ ĐÃ ĐƯỢC DUYỆT", `Nhiệm vụ "${newTask.title}" đã hoàn thành!\n+${newTask.xp_reward} XP`, 'SUCCESS');
                               }
                               // Rejected
                               if (newTask.status === 'REJECTED' && oldTask.status !== 'REJECTED') {
                                    dispatchNotification("⚠️ CẦN LÀM LẠI", `Nhiệm vụ "${newTask.title}" bị từ chối.\nLý do: ${newTask.rejection_reason}\nPhạt: -${newTask.penalty_xp} XP`, 'ERROR');
                               }
                           }
                           
                           // If I am the creator (Manager)
                           if (isCreator) {
                                if (newTask.status === 'COMPLETED' && oldTask.status !== 'COMPLETED') {
                                    dispatchNotification("📸 BÁO CÁO MỚI", `${newTask.assignee_name} đã nộp bằng chứng cho "${newTask.title}". Hãy kiểm tra ngay!`);
                                }
                           }
                      }
                  }
              }

              // --- FEEDBACK NOTIFICATIONS ---
              if (payload.table === 'feedback') {
                  const fb = payload.new as any;
                  if (payload.eventType === 'INSERT') {
                      if (fb.type === 'GOOGLE_REVIEW_CLICK') {
                          // Optional: Notify manager about review attempt
                      } else {
                          if (fb.rating <= 2 || fb.sentiment === 'NEGATIVE') {
                              dispatchNotification("🚨 BÁO ĐỘNG ĐỎ", `Khách hàng vừa đánh giá ${fb.rating} sao!\n"${fb.comment || 'Không có lời bình'}"`, 'ERROR');
                          } else {
                              dispatchNotification("💬 FEEDBACK MỚI", `Khách đánh giá ${fb.rating} sao.\n"${fb.comment || ''}"`, 'SUCCESS');
                          }
                      }
                  }
              }

              loadData(true);
          })
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                setConnectionStatus('CONNECTED');
                addSystemLog('SYSTEM', 'Connected to Realtime Server', 'INFO');
              }
              else setConnectionStatus(status === 'CLOSED' ? 'DISCONNECTED' : 'CONNECTING');
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
                              dispatchNotification("⚠️ RA ĐỒ CHẬM!", `${alertTitle}\n${alertDetails}`, 'ERROR');
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
      if (group) dispatchNotification("✅ ĐÃ XÁC NHẬN", `Đoàn: ${group.name}\nBàn: ${group.location} | Giờ: ${time}`);
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

  // --- TASK & GAMIFICATION METHODS ---
  const addTask = (task: Task) => {
      setTasks(prev => [task, ...prev]);
      supabaseService.upsertTask(task);
  };

  const claimTask = (taskId: string, employeeId: string, participantIds: string[] = []) => {
      const task = tasks.find(t => t.id === taskId);
      const employee = employees.find(e => e.id === employeeId);
      if (task && task.status === TaskStatus.OPEN && employee) {
          const allParticipants = [employeeId, ...participantIds];
          const updated = { 
              ...task, 
              status: TaskStatus.IN_PROGRESS, 
              assigneeId: employeeId, 
              assigneeName: employee.name,
              participants: allParticipants
          };
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
          supabaseService.upsertTask(updated);
          
          // NOTIFY LEADER IMMEDIATELY
          if (currentUser?.id === employeeId) {
              dispatchNotification("🚀 ĐÃ NHẬN VIỆC", `Bạn đã nhận nhiệm vụ "${task.title}". Hãy bắt đầu ngay!`, 'SUCCESS');
          }
      }
  };

  const submitTaskProof = (taskId: string, proofImage: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const updated = { ...task, status: TaskStatus.COMPLETED, proofImage };
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
          supabaseService.upsertTask(updated);
      }
  };

  const verifyTask = (taskId: string, managerId: string) => {
      // USE REFS TO GET LATEST DATA TO AVOID STALE STATE
      const task = tasksRef.current.find(t => t.id === taskId);
      
      if (task && task.status === TaskStatus.COMPLETED) {
          const updated = { ...task, status: TaskStatus.VERIFIED, verifiedBy: managerId };
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
          supabaseService.upsertTask(updated);

          // ADD XP TO ALL PARTICIPANTS
          const recipients = task.participants && task.participants.length > 0 
                             ? task.participants 
                             : (task.assigneeId ? [task.assigneeId] : []);

          recipients.forEach(empId => {
              const emp = employeesRef.current.find(e => e.id === empId);
              if (emp) {
                  const currentXp = emp.xp || 0;
                  const newXp = currentXp + task.xpReward;
                  const newLevel = Math.floor(newXp / 100) + 1; // Simple leveling
                  const updatedEmp = { ...emp, xp: newXp, level: newLevel };
                  updateEmployee(updatedEmp);
                  
                  // Optional: Log/Notify individual
                  console.log(`XP Added: ${emp.name} +${task.xpReward}`);
              }
          });
      }
  };

  const rejectTask = (taskId: string, reason: string, penalty: number) => {
      const task = tasksRef.current.find(t => t.id === taskId);
      if (task) {
          const updated = { 
              ...task, 
              status: TaskStatus.REJECTED, 
              rejectionReason: reason, 
              penaltyXp: penalty 
          }; 
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
          supabaseService.upsertTask(updated);

          // DEDUCT XP FROM ALL
          const recipients = task.participants && task.participants.length > 0 
                             ? task.participants 
                             : (task.assigneeId ? [task.assigneeId] : []);

           recipients.forEach(empId => {
               const emp = employeesRef.current.find(e => e.id === empId);
               if (emp && penalty > 0) {
                   const currentXp = emp.xp || 0;
                   const newXp = Math.max(0, currentXp - penalty);
                   const newLevel = Math.floor(newXp / 100) + 1;
                   const updatedEmp = { ...emp, xp: newXp, level: newLevel };
                   updateEmployee(updatedEmp);
               }
           });
      }
  };

  const deleteTask = (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      supabaseService.deleteTask(taskId);
  }

  // --- FEEDBACK SUBMISSION ---
  const submitFeedback = async (data: any) => {
      // 1. Analyze Sentiment using AI
      const aiAnalysis = await analyzeFeedback(data.comment || '', data.rating);
      
      const newFeedback: Feedback = {
          id: Date.now().toString(),
          type: 'INTERNAL_FEEDBACK',
          customerName: data.name,
          phone: data.phone,
          rating: data.rating,
          npsScore: data.npsScore,
          comment: data.comment,
          tags: aiAnalysis.tags,
          sentiment: aiAnalysis.sentiment,
          createdAt: new Date().toISOString(),
          isResolved: data.rating > 2 // 1-2 stars need resolution
      };

      setFeedbacks(prev => [newFeedback, ...prev]);
      supabaseService.upsertFeedback(newFeedback);

      // 2. Alert Logic
      if (newFeedback.rating <= 2 || newFeedback.sentiment === 'NEGATIVE') {
          const alertId = `alert_feedback_${newFeedback.id}`;
          const alertTitle = `Khách đánh giá thấp (${newFeedback.rating} sao)`;
          const alertDetails = `"${newFeedback.comment}" - ${newFeedback.customerName || 'Ẩn danh'}`;
          
          dispatchNotification("🚨 BÁO ĐỘNG ĐỎ", alertTitle + "\n" + alertDetails, 'ERROR');
          
          setActiveAlerts(prev => [...prev, {
              id: alertId,
              type: 'BAD_FEEDBACK',
              message: alertTitle,
              details: alertDetails,
              severity: 'HIGH',
              timestamp: new Date().toLocaleTimeString('vi-VN')
          }]);
      }
  };

  // --- TRACK GOOGLE REVIEW CLICK ---
  const trackReviewClick = async (staffId: string) => {
      const staff = employees.find(e => e.id === staffId);
      const newRecord: Feedback = {
          id: Date.now().toString(),
          type: 'GOOGLE_REVIEW_CLICK',
          createdAt: new Date().toISOString(),
          isResolved: true,
          staffId: staffId,
          staffName: staff?.name,
          rating: 5 // Assume 5 stars if they agreed to review
      };
      setFeedbacks(prev => [newRecord, ...prev]);
      await supabaseService.upsertFeedback(newRecord);
  };

  // --- GUEST ORDER ---
  const submitGuestOrder = async (tableId: string, cartItems: {item: MenuItem, quantity: number}[]) => {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', hour12: false});
      
      const newItems: ServingItem[] = cartItems.map((cartItem, idx) => ({
          id: `${Date.now()}_${idx}`,
          name: cartItem.item.name,
          totalQuantity: cartItem.quantity,
          servedQuantity: 0,
          unit: 'Phần',
          note: 'Khách tự gọi'
      }));

      const existingGroup = servingGroups.find(g => 
          g.status === 'ACTIVE' && 
          g.location === tableId && 
          g.date === todayStr
      );

      if (existingGroup) {
          const updatedItems = [...existingGroup.items, ...newItems];
          modifyGroup(existingGroup.id, g => ({ ...g, items: updatedItems }));
      } else {
          const newGroup: ServingGroup = {
              id: Date.now().toString(),
              name: `Khách bàn ${tableId}`,
              location: tableId,
              guestCount: 0, 
              startTime: timeStr,
              date: todayStr,
              status: 'ACTIVE',
              items: newItems,
              tableCount: 1,
              tableSplit: ''
          };
          addServingGroup(newGroup);
      }
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
          const finalUser = user.id === 'admin' ? { ...user, role: EmployeeRole.DEV } : user;
          setCurrentUser(finalUser);
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
      tasks, addTask, claimTask, submitTaskProof, verifyTask, rejectTask, deleteTask,
      feedbacks, submitFeedback, trackReviewClick,
      activeAlerts, dismissedAlertIds, dismissAlert,
      currentUser, login, logout,
      isLoading, isRestoringSession, lastUpdated, connectionStatus,
      reloadData: () => loadData(false),
      testNotification, 
      requestNotificationPermission,
      unlockAudio,
      notificationPermissionStatus,
      submitGuestOrder,
      onlineUsers, systemLogs
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
