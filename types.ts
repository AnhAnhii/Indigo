
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  EMPLOYEES = 'EMPLOYEES',
  ATTENDANCE = 'ATTENDANCE',
  SCHEDULE = 'SCHEDULE',
  REQUESTS = 'REQUESTS',
  PAYROLL = 'PAYROLL',
  TIMESHEET = 'TIMESHEET',
  SETTINGS = 'SETTINGS',
  AI_ASSISTANT = 'AI_ASSISTANT',
  KITCHEN = 'KITCHEN',
  GROUP_MENU = 'GROUP_MENU', // NEW FEATURE
  HANDOVER = 'HANDOVER',
  PROFILE = 'PROFILE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  QR_STATION = 'QR_STATION', 
  DEV_TOOLS = 'DEV_TOOLS',
  GUEST_MENU = 'GUEST_MENU',
  TASKS = 'TASKS',
  FEEDBACK = 'FEEDBACK',
  REVIEW_QR = 'REVIEW_QR',
  MARKETING = 'MARKETING'
}

export enum EmployeeRole {
  DEV = 'Developer',
  MANAGER = 'Quản lý',
  DEPARTMENT_HEAD = 'Trưởng bộ phận',
  CHEF = 'Bếp trưởng',
  WAITER = 'Phục vụ',
  BARTENDER = 'Pha chế',
}

export enum AttendanceStatus {
  PRESENT = 'Có mặt',
  LATE = 'Đi muộn',
  ABSENT = 'Vắng mặt',
  ON_LEAVE = 'Nghỉ phép',
  EARLY_LEAVE = 'Về sớm'
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  avatar?: string;
  hourlyRate: number;
  allowance?: number; 
  phone: string;
  email: string;
  password?: string;
  xp?: number; // Gamification XP
  level?: number; // Gamification Level
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  timestamp: Date;
  type: 'CHECK_IN' | 'CHECK_OUT';
  locationVerified: boolean;
  faceVerified: boolean;
  deviceInfo: string;
  imageUrl?: string; 
}

export interface TimesheetLog {
    id: string;
    employeeName: string;
    employeeId: string; 
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    totalHours: number;
    status: AttendanceStatus;
    lateMinutes: number;
    device: string;
    shiftCode?: string; 
    session?: 'MORNING' | 'AFTERNOON';
}

export enum ShiftType {
  CA_C = 'Ca C',    
  CA_D = 'Ca D',    
  CA_B1 = 'Ca B1',  
  CA_B2 = 'Ca B2',  
  OFF = 'Nghỉ'
}

export interface ShiftConfig {
    code: string;      
    name: string;
    startTime: string; 
    endTime: string;   
    isSplitShift: boolean; 
    breakStart?: string;   
    breakEnd?: string;     
}

export interface WorkSchedule {
    id: string;
    employeeId: string;
    date: string; 
    shiftCode: string; 
}

export enum RequestType {
  LEAVE = 'Xin nghỉ phép',
  SHIFT_SWAP = 'Xin đổi ca',
  FORGOT_CHECKIN = 'Quên chấm công',
  OVERTIME = 'Đăng ký tăng ca'
}

export enum RequestStatus {
  PENDING = 'Chờ duyệt',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Từ chối'
}

export interface EmployeeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
  type: RequestType;
  date: string;
  reason: string;
  status: RequestStatus;
  targetShift?: string; 
  createdAt: string;
  isMine: boolean;
  approvedBy?: string; // New: Who approved
  approvedAt?: string; // New: When
}

export interface HandoverLog {
    id: string;
    date: string;
    shift: string; 
    author: string;
    content: string;
    type: 'ISSUE' | 'NOTE' | 'VIP';
    image?: string; 
    isPinned?: boolean; // New: Pin important note
    createdAt: string;
}

export interface WifiConfig {
    id: string;
    name: string;
    bssid: string;
    isActive: boolean;
}

export interface WorkRule {
    allowedLateMinutes: number;
}

export interface LocationConfig {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    name: string;
}

export interface NotificationConfig {
    enableGuestArrival: boolean;
    enableStaffRequest: boolean;
    enableHandover: boolean;
    enableSystemAlert: boolean;
}

export interface TimeConfig {
    ntpServer: string;
    timezone: string;
}

export interface SystemSettings {
    location: LocationConfig;
    wifis: WifiConfig[];
    rules: WorkRule;
    servingConfig?: { lateAlertMinutes: number }; // Deprecated but kept to avoid settings break
    shiftConfigs: ShiftConfig[];
    notificationConfig: NotificationConfig; 
    timeConfig: TimeConfig; 
    webhook?: {
        url: string;
        enabled: boolean;
        token?: string;
    };
}

export interface MenuItem {
    id: string;
    name: string;
    nameEn?: string;
    nameKo?: string; // Korean
    nameFr?: string; // French
    category: string; 
    price: number;
    unit?: string; 
    description?: string;
    descriptionEn?: string;
    descriptionKo?: string;
    descriptionFr?: string;
    image?: string;
    isAvailable: boolean;
}

export interface PrepTask {
    id: string;
    task: string;
    isCompleted: boolean;
    assignee: string;
}

export interface SystemAlert {
    id: string;
    type: 'LATE_SERVING' | 'ATTENDANCE_VIOLATION' | 'BAD_FEEDBACK' | 'GUEST_CALL';
    message: string;
    details: string;
    groupId?: string; 
    severity: 'HIGH' | 'MEDIUM';
    timestamp: string;
}

export interface SystemLog {
    id: string;
    timestamp: string;
    event: string;
    details: string;
    type: 'INFO' | 'WARNING' | 'ERROR' | 'DB_CHANGE';
}

export interface OnlineUser {
    userId: string;
    name: string;
    role: string;
    onlineAt: string;
    platform?: string;
}

// --- TASK & GAMIFICATION TYPES ---

export enum TaskType {
    OPENING = 'OPENING',
    CLOSING = 'CLOSING',
    ADHOC = 'ADHOC'
}

export enum TaskStatus {
    OPEN = 'OPEN', // Available to pick
    IN_PROGRESS = 'IN_PROGRESS', // Picked by someone
    COMPLETED = 'COMPLETED', // Staff marked done, uploaded photo
    VERIFIED = 'VERIFIED',    // Manager approved
    REJECTED = 'REJECTED'     // Manager rejected
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    assigneeId?: string; // Leader ID if party, or Solo ID
    assigneeName?: string; 
    participants?: string[]; // Array of Employee IDs (Including Leader)
    maxParticipants?: number; // 1 = Solo, >1 = Party
    creatorId: string;
    type: TaskType;
    status: TaskStatus;
    difficulty: 1 | 2 | 3; // 1 Star to 3 Stars
    xpReward: number;
    penaltyXp?: number; // XP deducted if rejected
    rejectionReason?: string;
    proofImage?: string; // Base64
    createdAt: string;
    deadline?: string;
    verifiedBy?: string;
    shiftCode?: string; // e.g., CA_C, CA_D
    requiredShifts?: string[]; // New: List of shift codes that can claim this task
}

// --- CUSTOMER FEEDBACK TYPES ---

export interface Feedback {
    id: string;
    type: 'INTERNAL_FEEDBACK' | 'GOOGLE_REVIEW_CLICK' | 'CALL_WAITER'; 
    customerName?: string;
    phone?: string;
    rating?: number; // 1-5 Stars
    npsScore?: number; // 0-10 Net Promoter Score
    comment?: string;
    tags?: string[]; 
    sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'; 
    createdAt: string;
    isResolved: boolean; 
    staffId?: string; // Staff who requested the review
    staffName?: string;
}

// --- PAYROLL ADJUSTMENT (NEW) ---
export interface PayrollAdjustment {
    id: string;
    employeeId: string;
    month: string; // Format: "YYYY-MM"
    type: 'BONUS' | 'FINE' | 'ADVANCE'; // Thưởng | Phạt | Ứng lương
    amount: number;
    reason: string;
    date: string;
}

// --- GROUP MENU MANAGER (NEW V2) ---
export interface GroupOrderItem {
    name: string;
    quantity: number;
    unit: string;
    note?: string;
    isServed: boolean;
}

export interface GroupOrder {
    id: string;
    groupName: string;
    location: string; // Table or Area
    guestCount: number;
    items: GroupOrderItem[];
    status: 'PENDING' | 'SERVING' | 'COMPLETED';
    createdAt: string;
}

export const RESTAURANT_LOCATION = {
  latitude: 21.0285,
  longitude: 105.8542,
  radiusMeters: 100 
};
