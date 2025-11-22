
// --- CẤU HÌNH LIÊN KẾT GOOGLE SHEET ---
const HARDCODED_API_URL: string = "https://script.google.com/macros/s/AKfycbyvvVN6jTx3HGONBGfge7OXHD7IXkL2xTCP97qnxNtHO72efA5s4TVBknGpyOCmWa4w/exec"; 

export const sheetService = {
    getApiUrl: () => {
        const url = HARDCODED_API_URL as string;
        if (!url || url.length < 10) {
            console.warn("Cảnh báo: Link API Google Sheet chưa hợp lệ.");
        }
        return url;
    },
    
    setApiUrl: (url: string) => {
        console.log("API URL (Read-only in code):", url);
    },

    // --- GET ALL DATA ---
    fetchAllData: async () => {
        const url = HARDCODED_API_URL as string;
        if (!url) return null;
        try {
            const response = await fetch(`${url}?action=GET_ALL&t=${Date.now()}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn("Lỗi kết nối Google Sheet:", error);
            return null;
        }
    },

    // --- GENERIC POST HELPER ---
    postData: async (action: string, data: any) => {
        const url = HARDCODED_API_URL as string;
        if (!url) return;
        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data })
            });
        } catch (error) {
            console.error(`Lỗi gửi action ${action}:`, error);
        }
    },

    // --- ATTENDANCE ---
    logAttendance: async (logData: any) => {
        await sheetService.postData('LOG_ATTENDANCE', logData);
    },

    // --- EMPLOYEES ---
    syncEmployee: async (employeeData: any) => {
        // Ensure allowance is sent
        await sheetService.postData('SYNC_EMPLOYEE', {
            ...employeeData,
            allowance: employeeData.allowance || 0
        });
    },

    deleteEmployee: async (id: string) => {
        await sheetService.postData('DELETE_EMPLOYEE', { id });
    },

    registerFace: async (employeeId: string, faceImageBase64: string) => {
         await sheetService.postData('SYNC_EMPLOYEE', { id: employeeId, avatar: faceImageBase64 });
    },

    // --- SERVING GROUPS ---
    syncServingGroup: async (groupData: any) => {
        await sheetService.postData('SYNC_GROUP', groupData);
    },

    deleteServingGroup: async (id: string) => {
        await sheetService.postData('DELETE_GROUP', { id });
    },

    // --- REQUESTS ---
    syncRequest: async (requestData: any) => {
        await sheetService.postData('SYNC_REQUEST', requestData);
    },

    // --- SETTINGS ---
    saveSettings: async (settingsData: any) => {
        await sheetService.postData('SAVE_SETTINGS', settingsData);
    },

    // --- HANDOVER ---
    logHandover: async (handoverData: any) => {
        await sheetService.postData('LOG_HANDOVER', handoverData);
    },

    // --- SCHEDULES ---
    syncSchedule: async (scheduleData: any) => {
        await sheetService.postData('SYNC_SCHEDULE', scheduleData);
    }
};
