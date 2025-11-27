
import { supabase } from './supabaseClient';
import { 
    Employee, TimesheetLog, EmployeeRequest, 
    ServingGroup, HandoverLog, WorkSchedule, 
    PrepTask, SystemSettings, WifiConfig
} from '../types';

// --- MAPPERS (Snake_case DB <-> CamelCase App) ---

const mapEmployeeFromDB = (row: any): Employee => ({
    id: row.id,
    name: row.name,
    role: row.role,
    hourlyRate: Number(row.hourly_rate),
    allowance: Number(row.allowance),
    phone: row.phone,
    email: row.email,
    password: row.password,
    avatar: row.avatar
});

const mapLogFromDB = (row: any): TimesheetLog => {
    // DECODE COMPOSITE SHIFT CODE (FORMAT: "CODE|SESSION")
    const rawShiftCode = row.shift_code || '';
    const [code, session] = rawShiftCode.includes('|') ? rawShiftCode.split('|') : [rawShiftCode, undefined];

    return {
        id: row.id,
        employeeName: row.employee_name,
        employeeId: row.employee_id,
        date: row.date,
        checkIn: row.check_in,
        checkOut: row.check_out,
        totalHours: Number(row.total_hours),
        status: row.status,
        lateMinutes: Number(row.late_minutes),
        device: row.device,
        shiftCode: code,
        session: session as 'MORNING' | 'AFTERNOON' | undefined
    };
};

const mapGroupFromDB = (row: any): ServingGroup => ({
    id: row.id,
    name: row.name,
    location: row.location,
    guestCount: Number(row.guest_count),
    tableCount: Number(row.table_count),
    tableSplit: row.table_split,
    startTime: row.start_time,
    date: row.date,
    status: row.status,
    items: row.items || [],
    prepList: row.prep_list || [],
    completionTime: row.completion_time
});

const mapRequestFromDB = (row: any): EmployeeRequest => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    avatar: row.avatar,
    type: row.type,
    date: row.date,
    reason: row.reason,
    status: row.status,
    targetShift: row.target_shift,
    createdAt: row.created_at,
    isMine: row.is_mine
});

// --- SERVICE METHODS ---

export const supabaseService = {
    
    // --- FETCH ALL ---
    fetchAllData: async () => {
        const [
            { data: employees },
            { data: logs },
            { data: requests },
            { data: groups },
            { data: settings },
            { data: handovers },
            { data: schedules },
            { data: tasks },
            { data: dismissed }
        ] = await Promise.all([
            supabase.from('employees').select('*'),
            supabase.from('attendance_logs').select('*'),
            supabase.from('requests').select('*'),
            supabase.from('serving_groups').select('*'),
            supabase.from('system_settings').select('settings').eq('id', 1).single(),
            supabase.from('handover_logs').select('*'),
            supabase.from('work_schedules').select('*'),
            supabase.from('prep_tasks').select('*'),
            supabase.from('dismissed_alerts').select('*')
        ]);

        return {
            employees: employees?.map(mapEmployeeFromDB) || [],
            logs: logs?.map(mapLogFromDB) || [],
            requests: requests?.map(mapRequestFromDB) || [],
            servingGroups: groups?.map(mapGroupFromDB) || [],
            settings: settings?.settings || {},
            handoverLogs: handovers?.map((h: any) => ({...h, id: String(h.id)})) || [],
            schedules: schedules?.map((s: any) => ({
                id: s.id, employeeId: s.employee_id, date: s.date, shiftCode: s.shift_code
            })) || [],
            prepTasks: tasks?.map((t: any) => ({
                id: t.id, task: t.task, isCompleted: t.is_completed, assignee: t.assignee
            })) || [],
            dismissedAlerts: dismissed || []
        };
    },

    // --- EMPLOYEES ---
    upsertEmployee: async (emp: Employee) => {
        const { error } = await supabase.from('employees').upsert({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            hourly_rate: emp.hourlyRate,
            allowance: emp.allowance,
            phone: emp.phone,
            email: emp.email,
            password: emp.password,
            avatar: emp.avatar
        });
        if(error) console.error("Supabase Error:", error);
    },

    deleteEmployee: async (id: string) => {
        await supabase.from('employees').delete().eq('id', id);
    },

    // --- LOGS ---
    upsertLog: async (log: TimesheetLog) => {
        // ENCODE SESSION INTO SHIFT CODE
        const encodedShiftCode = log.session ? `${log.shiftCode}|${log.session}` : log.shiftCode;

        await supabase.from('attendance_logs').upsert({
            id: log.id,
            employee_id: log.employeeId,
            employee_name: log.employeeName,
            date: log.date,
            check_in: log.checkIn,
            check_out: log.checkOut,
            total_hours: log.totalHours,
            status: log.status,
            late_minutes: log.lateMinutes,
            device: log.device,
            shift_code: encodedShiftCode
        });
    },

    // --- SERVING GROUPS ---
    upsertServingGroup: async (group: ServingGroup) => {
        await supabase.from('serving_groups').upsert({
            id: group.id,
            name: group.name,
            location: group.location,
            guest_count: group.guestCount,
            table_count: group.tableCount,
            table_split: group.tableSplit,
            start_time: group.startTime,
            date: group.date,
            status: group.status,
            items: group.items, // Auto JSONB conversion
            prep_list: group.prepList,
            completion_time: group.completionTime
        });
    },

    deleteServingGroup: async (id: string) => {
        await supabase.from('serving_groups').delete().eq('id', id);
    },

    // --- REQUESTS ---
    upsertRequest: async (req: EmployeeRequest) => {
        await supabase.from('requests').upsert({
            id: req.id,
            employee_id: req.employeeId,
            employee_name: req.employeeName,
            avatar: req.avatar,
            type: req.type,
            date: req.date,
            reason: req.reason,
            status: req.status,
            target_shift: req.targetShift,
            created_at: req.createdAt,
            is_mine: req.isMine
        });
    },

    // --- SETTINGS ---
    saveSettings: async (settings: SystemSettings) => {
        await supabase.from('system_settings').upsert({
            id: 1,
            settings: settings
        });
    },

    // --- HANDOVER ---
    addHandover: async (log: HandoverLog) => {
        await supabase.from('handover_logs').insert({
            id: log.id,
            date: log.date,
            shift: log.shift,
            author: log.author,
            content: log.content,
            type: log.type,
            created_at: log.createdAt
        });
    },

    // --- SCHEDULES ---
    upsertSchedule: async (schedule: WorkSchedule) => {
        await supabase.from('work_schedules').upsert({
            id: schedule.id,
            employee_id: schedule.employeeId,
            date: schedule.date,
            shift_code: schedule.shiftCode
        });
    },

    // --- TASKS & ALERTS ---
    upsertPrepTask: async (task: PrepTask) => {
        await supabase.from('prep_tasks').upsert({
            id: task.id,
            task: task.task,
            is_completed: task.isCompleted,
            assignee: task.assignee
        });
    },

    deletePrepTask: async (id: string) => {
        await supabase.from('prep_tasks').delete().eq('id', id);
    },

    dismissAlert: async (id: string) => {
        await supabase.from('dismissed_alerts').upsert({
            id: id,
            timestamp: new Date().toISOString()
        });
    }
};
