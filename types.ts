
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
  SERVING = 'SERVING',
}

export enum EmployeeRole {
  MANAGER = 'Quản lý',
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
  phone: string;
  email: string;
  password?: string;
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
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    totalHours: number;
    status: AttendanceStatus;
    lateMinutes: number;
    device: string;
}

export enum ShiftType {
  MORNING = 'Sáng',   // 06:00 - 14:00
  AFTERNOON = 'Chiều', // 14:00 - 22:00
  NIGHT = 'Tối',      // 18:00 - 02:00 (Next day)
  SPLIT = 'Gãy',      // 10:00 - 14:00 & 18:00 - 22:00
  OFF = 'Nghỉ'
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
  createdAt: string;
  isMine: boolean;
}

export interface WifiConfig {
    id: string;
    name: string;
    bssid: string;
    isActive: boolean;
}

export interface WorkRule {
    startHour: string; // "08:00"
    endHour: string;   // "17:00"
    allowedLateMinutes: number;
}

export interface LocationConfig {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    name: string;
}

export interface SystemSettings {
    location: LocationConfig;
    wifis: WifiConfig[];
    rules: WorkRule;
}

// --- KITCHEN & MENU OPS (UPDATED) ---

export interface MenuItem {
    id: string;
    name: string;
    category: string;
    price: number;
}

// New structure for Preparation Checklist
export interface SauceItem {
    name: string;
    quantity: number;
    unit: string;
    isCompleted: boolean;
    note?: string; 
}

export interface PrepTask {
    id: string;
    task: string;
    isCompleted: boolean;
    assignee: string;
}

// --- SERVING & GROUP OPS ---
export interface ServingItem {
    id: string;
    name: string;
    totalQuantity: number; 
    servedQuantity: number;
    unit: string;
}

export interface ServingGroup {
    id: string;
    name: string; 
    location: string;
    guestCount: number; 
    startTime: string; 
    items: ServingItem[];
    status: 'ACTIVE' | 'COMPLETED';
    
    // Logic Fields
    tableCount?: number; // Số bàn (x8, 1x5...)
    prepList?: SauceItem[]; // Checklist nước chấm/đồ dùng
}

export const RESTAURANT_LOCATION = {
  latitude: 21.0285,
  longitude: 105.8542,
  radiusMeters: 100 
};
