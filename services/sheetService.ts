
// --- DEPRECATED SERVICE ---
// Hệ thống đã chuyển sang sử dụng Supabase (supabaseService.ts).
// File này được giữ lại để tránh lỗi import nhưng các hàm đã bị vô hiệu hóa.

const warn = () => console.warn("Google Sheets integration is deprecated. Using Supabase.");

export const sheetService = {
    getApiUrl: () => "",
    setApiUrl: () => warn(),
    fetchAllData: async () => { warn(); return null; },
    postData: async () => { warn(); },
    logAttendance: async () => { warn(); },
    syncEmployee: async () => { warn(); },
    deleteEmployee: async () => { warn(); },
    registerFace: async () => { warn(); },
    syncServingGroup: async () => { warn(); },
    deleteServingGroup: async () => { warn(); },
    syncRequest: async () => { warn(); },
    saveSettings: async () => { warn(); },
    logHandover: async () => { warn(); },
    syncSchedule: async () => { warn(); },
    dismissAlert: async () => { warn(); },
    syncPrepTask: async () => { warn(); },
    deletePrepTask: async () => { warn(); }
};
