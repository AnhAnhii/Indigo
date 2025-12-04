
import { supabase } from './supabaseClient';
import { 
    Employee, TimesheetLog, EmployeeRequest, 
    HandoverLog, WorkSchedule, 
    PrepTask, SystemSettings, WifiConfig, Task, Feedback, MenuItem, PayrollAdjustment, GroupOrder
} from '../types';

// --- MAPPERS (Snake_case DB <-> CamelCase App) ---

export const mapEmployeeFromDB = (row: any): Employee => ({
    id: row.id,
    name: row.name,
    role: row.role,
    hourlyRate: Number(row.hourly_rate),
    allowance: Number(row.allowance),
    phone: row.phone,
    email: row.email,
    password: row.password,
    avatar: row.avatar,
    xp: Number(row.xp) || 0,
    level: Number(row.level) || 1
});

export const mapLogFromDB = (row: any): TimesheetLog => {
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

export const mapRequestFromDB = (row: any): EmployeeRequest => ({
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
    isMine: row.is_mine,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at
});

export const mapTaskFromDB = (row: any): Task => ({
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    participants: row.participants || [],
    maxParticipants: Number(row.max_participants) || 1,
    creatorId: row.creator_id,
    type: row.type,
    status: row.status,
    difficulty: row.difficulty,
    xpReward: Number(row.xp_reward),
    penaltyXp: Number(row.penalty_xp),
    rejectionReason: row.rejection_reason,
    proofImage: row.proof_image,
    createdAt: row.created_at,
    deadline: row.deadline,
    verifiedBy: row.verified_by,
    shiftCode: row.shift_code,
    requiredShifts: row.required_shifts || []
});

export const mapFeedbackFromDB = (row: any): Feedback => ({
    id: row.id,
    type: row.type || 'INTERNAL_FEEDBACK',
    customerName: row.customer_name,
    phone: row.phone,
    rating: row.rating,
    npsScore: row.nps_score,
    comment: row.comment,
    tags: row.tags || [],
    sentiment: row.sentiment,
    createdAt: row.created_at,
    isResolved: row.is_resolved,
    staffId: row.staff_id,
    staffName: row.staff_name
});

export const mapMenuItemFromDB = (row: any): MenuItem => ({
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    nameKo: row.name_ko,
    nameFr: row.name_fr,
    price: Number(row.price),
    unit: row.unit || 'Phần',
    category: row.category,
    description: row.description,
    descriptionEn: row.description_en,
    descriptionKo: row.description_ko,
    descriptionFr: row.description_fr,
    image: row.image,
    isAvailable: row.is_available
});

export const mapAdjustmentFromDB = (row: any): PayrollAdjustment => ({
    id: row.id,
    employeeId: row.employee_id,
    month: row.month,
    type: row.type,
    amount: Number(row.amount),
    reason: row.reason,
    date: row.date
});

export const mapGroupOrderFromDB = (row: any): GroupOrder => ({
    id: row.id,
    groupName: row.group_name,
    location: row.location,
    guestCount: row.guest_count,
    tableAllocation: row.table_allocation,
    items: row.items || [],
    status: row.status,
    createdAt: row.created_at
});


// --- SERVICE METHODS ---

export const supabaseService = {
    
    // --- FETCH ALL ---
    fetchAllData: async () => {
        try {
            const [
                { data: employees },
                { data: logs },
                { data: requests },
                { data: settings },
                { data: handovers },
                { data: schedules },
                { data: tasks },
                { data: dismissed },
                { data: staffTasks },
                { data: feedbacks },
                { data: menuItems },
                { data: adjustments }
            ] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('attendance_logs').select('*'),
                supabase.from('requests').select('*'),
                supabase.from('system_settings').select('settings, ai_config').eq('id', 1).single(),
                supabase.from('handover_logs').select('*'),
                supabase.from('work_schedules').select('*'),
                supabase.from('prep_tasks').select('*'),
                supabase.from('dismissed_alerts').select('*'),
                supabase.from('tasks').select('*'),
                supabase.from('feedback').select('*'),
                supabase.from('menu_items').select('*'),
                supabase.from('payroll_adjustments').select('*')
            ]);

            // Fail-safe fetch for group_orders
            let groupOrdersData: any[] = [];
            try {
                // Fetch ALL orders (active + history) without status filter
                const { data, error } = await supabase.from('group_orders').select('*'); 
                if (!error && data) {
                    groupOrdersData = data;
                } else if (error) {
                    console.warn("Group Orders Fetch Warning:", error.message);
                }
            } catch (e) {
                console.warn("Group Orders Fetch Exception:", e);
            }

            const rawSettings = settings?.settings || {};
            const aiConfig = settings?.ai_config || {};

            return {
                employees: employees?.map(mapEmployeeFromDB) || [],
                logs: logs?.map(mapLogFromDB) || [],
                requests: requests?.map(mapRequestFromDB) || [],
                settings: { ...rawSettings, aiConfig }, // Merge AI Config
                handoverLogs: handovers?.map((h: any) => ({
                    ...h, 
                    id: String(h.id),
                    isPinned: h.is_pinned
                })) || [],
                schedules: schedules?.map((s: any) => ({
                    id: s.id, employeeId: s.employee_id, date: s.date, shiftCode: s.shift_code
                })) || [],
                prepTasks: tasks?.map((t: any) => ({
                    id: t.id, task: t.task, isCompleted: t.is_completed, assignee: t.assignee
                })) || [],
                dismissedAlerts: dismissed || [],
                tasks: staffTasks?.map(mapTaskFromDB) || [],
                feedbacks: feedbacks?.map(mapFeedbackFromDB) || [],
                menuItems: menuItems?.map(mapMenuItemFromDB) || [],
                adjustments: adjustments?.map(mapAdjustmentFromDB) || [],
                // Ensure array type for groupOrders
                groupOrders: (groupOrdersData || []).map(mapGroupOrderFromDB)
            };
        } catch (error) {
            console.error("CRITICAL SYNC ERROR:", error);
            return {
                employees: [], logs: [], requests: [], settings: {}, handoverLogs: [], 
                schedules: [], prepTasks: [], dismissedAlerts: [], tasks: [], 
                feedbacks: [], menuItems: [], adjustments: [], groupOrders: []
            };
        }
    },

    // ... (Keep existing CRUD methods unchanged, except ensure GroupOrder methods use mapGroupOrderFromDB fields if needed)
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
            avatar: emp.avatar,
            xp: emp.xp,
            level: emp.level
        });
        if(error) console.error("Supabase Error:", error);
    },

    deleteEmployee: async (id: string) => {
        await supabase.from('employees').delete().eq('id', id);
    },

    upsertLog: async (log: TimesheetLog) => {
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
            is_mine: req.isMine,
            approved_by: req.approvedBy,
            approved_at: req.approvedAt
        });
    },

    saveSettings: async (settings: SystemSettings) => {
        // Separate AI Config if present
        const { aiConfig, ...jsonSettings } = settings;
        
        await supabase.from('system_settings').upsert({
            id: 1,
            settings: jsonSettings,
            ai_config: aiConfig || {}
        });
    },

    addHandover: async (log: HandoverLog) => {
        await supabase.from('handover_logs').upsert({
            id: log.id,
            date: log.date,
            shift: log.shift,
            author: log.author,
            content: log.content,
            type: log.type,
            image: log.image,
            is_pinned: log.isPinned,
            created_at: log.createdAt
        });
    },

    upsertSchedule: async (schedule: WorkSchedule) => {
        await supabase.from('work_schedules').upsert({
            id: schedule.id,
            employee_id: schedule.employeeId,
            date: schedule.date,
            shift_code: schedule.shiftCode
        });
    },

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
    },

    upsertTask: async (task: Task) => {
        await supabase.from('tasks').upsert({
            id: task.id,
            title: task.title,
            description: task.description,
            assignee_id: task.assigneeId,
            assignee_name: task.assigneeName,
            participants: task.participants,
            max_participants: task.maxParticipants,
            creator_id: task.creatorId,
            type: task.type,
            status: task.status,
            difficulty: task.difficulty,
            xp_reward: task.xpReward,
            penalty_xp: task.penaltyXp,
            rejection_reason: task.rejectionReason,
            proof_image: task.proofImage,
            created_at: task.createdAt,
            deadline: task.deadline,
            verified_by: task.verifiedBy,
            shift_code: task.shiftCode,
            required_shifts: task.requiredShifts
        });
    },

    deleteTask: async (id: string) => {
        await supabase.from('tasks').delete().eq('id', id);
    },

    upsertFeedback: async (feedback: Feedback) => {
        await supabase.from('feedback').upsert({
            id: feedback.id,
            type: feedback.type,
            customer_name: feedback.customerName,
            phone: feedback.phone,
            rating: feedback.rating,
            nps_score: feedback.npsScore,
            comment: feedback.comment,
            tags: feedback.tags,
            sentiment: feedback.sentiment,
            created_at: feedback.createdAt,
            is_resolved: feedback.isResolved,
            staff_id: feedback.staffId,
            staff_name: feedback.staffName
        });
    },

    upsertMenuItem: async (item: MenuItem) => {
        await supabase.from('menu_items').upsert({
            id: item.id,
            name: item.name,
            name_en: item.nameEn,
            name_ko: item.nameKo,
            name_fr: item.nameFr,
            price: item.price,
            unit: item.unit,
            category: item.category,
            description: item.description,
            description_en: item.descriptionEn,
            description_ko: item.descriptionKo,
            description_fr: item.descriptionFr,
            image: item.image,
            is_available: item.isAvailable,
            created_at: new Date().toISOString()
        });
    },

    deleteMenuItem: async (id: string) => {
        await supabase.from('menu_items').delete().eq('id', id);
    },

    upsertAdjustment: async (adj: PayrollAdjustment) => {
        await supabase.from('payroll_adjustments').upsert({
            id: adj.id,
            employee_id: adj.employeeId,
            month: adj.month,
            type: adj.type,
            amount: adj.amount,
            reason: adj.reason,
            date: adj.date
        });
    },

    deleteAdjustment: async (id: string) => {
        await supabase.from('payroll_adjustments').delete().eq('id', id);
    },

    // --- GROUP ORDERS (NEW) ---
    upsertGroupOrder: async (order: GroupOrder) => {
        const { error } = await supabase.from('group_orders').upsert({
            id: order.id,
            group_name: order.groupName,
            location: order.location,
            guest_count: order.guestCount,
            table_allocation: order.tableAllocation, // Map to DB column
            items: order.items,
            status: order.status,
            created_at: order.createdAt
        });
        if (error) console.error("Group Order Upsert Failed:", JSON.stringify(error, null, 2));
    },

    updateGroupOrderStatus: async (id: string, status: string) => {
        await supabase.from('group_orders').update({ status }).eq('id', id);
    }
};
