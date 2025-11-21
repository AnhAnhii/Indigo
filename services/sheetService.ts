
// --- CẤU HÌNH LIÊN KẾT GOOGLE SHEET ---
// Đây là link Web App bạn đã deploy. 
// Khi deploy lên Vercel, file này sẽ được đóng gói, giúp mọi nhân viên truy cập đều kết nối về đúng Sheet này.
const HARDCODED_API_URL: string = "https://script.google.com/macros/s/AKfycbwMGxO1gIXvqMfYDMe_uq8K-fXH7frsU_D4vn4tPHjGqXzEZtHuIENGZAYva9yXw4YNfg/exec"; 

export const sheetService = {
    getApiUrl: () => {
        // Kiểm tra an toàn để tránh lỗi TypeScript narrowing
        const url = HARDCODED_API_URL as string;
        if (!url || url.length < 10) {
            console.warn("Cảnh báo: Link API Google Sheet chưa hợp lệ.");
        }
        return url;
    },
    
    setApiUrl: (url: string) => {
        console.log("API URL (Read-only in code):", url);
    },

    // Lấy toàn bộ dữ liệu khi khởi động App
    fetchAllData: async () => {
        const url = HARDCODED_API_URL as string;
        if (!url) return null;
        
        try {
            // Thêm tham số t để tránh cache trình duyệt
            const response = await fetch(`${url}?action=GET_ALL&t=${Date.now()}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn("Không thể kết nối Google Sheet (Sẽ dùng dữ liệu mẫu Offline):", error);
            return null;
        }
    },

    // Ghi nhận chấm công (FaceID / QR)
    logAttendance: async (logData: any) => {
        const url = HARDCODED_API_URL as string;
        if (!url) return;
        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors', // Chế độ no-cors quan trọng để tránh lỗi CORS từ Google
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
         const url = HARDCODED_API_URL as string;
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
        const url = HARDCODED_API_URL as string;
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

    // Lưu Cấu hình Hệ thống (Settings) - Giúp đồng bộ cài đặt Wifi/GPS cho mọi nhân viên
    saveSettings: async (settingsData: any) => {
        const url = HARDCODED_API_URL as string;
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
