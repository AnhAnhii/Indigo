

// --- CẤU HÌNH LIÊN KẾT (DÁN LINK GOOGLE APPS SCRIPT WEB APP CỦA BẠN VÀO ĐÂY) ---
// Lưu ý: Nếu URL không hợp lệ, hệ thống sẽ chạy ở chế độ Offline
const HARDCODED_API_URL: string = "https://script.google.com/macros/s/AKfycbwMGxO1gIXvqMfYDMe_uq8K-fXH7frsU_D4vn4tPHjGqXzEZtHuIENGZAYva9yXw4YNfg/exec"; 

export const sheetService = {
    getApiUrl: () => {
        // Cast as string to prevent TypeScript from narrowing type to "never" if constant is empty
        if (!HARDCODED_API_URL || (HARDCODED_API_URL as string).includes("AKfycbx2X9")) {
            console.warn("Cảnh báo: Chưa cấu hình Link API Google Sheet trong services/sheetService.ts");
        }
        return HARDCODED_API_URL;
    },
    
    setApiUrl: (url: string) => {
        console.log("API URL:", url);
    },

    // Lấy toàn bộ dữ liệu khi khởi động App
    fetchAllData: async () => {
        const url = HARDCODED_API_URL;
        if (!url) return null;
        
        try {
            // Thêm tham số t để tránh cache
            const response = await fetch(`${url}?action=GET_ALL&t=${Date.now()}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn("Không thể kết nối Google Sheet (Dùng dữ liệu Offline):", error);
            return null;
        }
    },

    // Ghi nhận chấm công (FaceID / QR)
    logAttendance: async (logData: any) => {
        const url = HARDCODED_API_URL;
        if (!url) return;
        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'LOG_ATTENDANCE',
                    data: logData
                })
            });
        } catch (error) {
            console.error("Lỗi ghi chấm công:", error);
        }
    },

    // Đăng ký khuôn mặt nhân viên
    registerFace: async (employeeId: string, faceImageBase64: string) => {
         const url = HARDCODED_API_URL;
         if (!url) return;
         try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'REGISTER_FACE',
                    data: { employeeId, image: faceImageBase64 }
                })
            });
        } catch (error) {
            console.error("Lỗi đăng ký Face:", error);
        }
    },

    // Thêm Khách đoàn mới
    addServingGroup: async (groupData: any) => {
        const url = HARDCODED_API_URL;
        if (!url) return;
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ADD_GROUP',
                data: groupData
            })
        });
    },

    // Lưu Cấu hình Hệ thống (Settings)
    saveSettings: async (settingsData: any) => {
        const url = HARDCODED_API_URL;
        if (!url) return;
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SAVE_SETTINGS',
                data: settingsData
            })
        });
    }
};