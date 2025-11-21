import { GoogleGenAI } from "@google/genai";

// Safely retrieve API Key in browser environment (Supports both Vite and Webpack/Node)
const getApiKey = () => {
  try {
    // 1. Try Vite standard (import.meta.env)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }

    // 2. Try Node/Webpack standard (process.env)
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
    }
  } catch (e) {
    console.warn("Environment variable access error", e);
  }
  return '';
};

// Helper to get AI instance safely
const getAiInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
      console.warn("API Key not found in environment variables.");
      return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const askAiAssistant = async (
  prompt: string, 
  contextData: string
): Promise<string> => {
  const ai = getAiInstance();
  if (!ai) {
    return "Lỗi: Chưa cấu hình API Key. Vui lòng kiểm tra biến môi trường (VITE_API_KEY hoặc API_KEY).";
  }

  try {
    const systemPrompt = `
      Bạn là một trợ lý quản lý nhân sự và vận hành nhà hàng chuyên nghiệp tại Việt Nam.
      
      KIẾN THỨC NGÀNH F&B CẦN BIẾT:
      - Ca Sáng (Morning): Thường từ 6h - 14h.
      - Ca Chiều (Afternoon): Thường từ 14h - 22h.
      - Ca Gãy (Split Shift): Nhân viên làm 2 khoảng (ví dụ 10h-14h và 18h-22h), rất phổ biến cho sinh viên hoặc giờ cao điểm.
      - Ca Tối/Đêm (Night): Thường cho quán bar/pub.
      
      Nhiệm vụ của bạn:
      1. Giúp quản lý lịch làm việc, đề xuất phân ca dựa trên giờ cao điểm.
      2. Tư vấn về đơn xin nghỉ, luật lao động cơ bản (ví dụ: làm ca gãy có phụ cấp không).
      3. Phân tích chi phí nhân sự.
      
      Phong cách: Hữu ích, chuyên nghiệp, ngắn gọn và thân thiện.
      
      Dữ liệu ngữ cảnh hiện tại (Nhân viên/Chấm công/Lịch):
      ${contextData}

      QUAN TRỌNG: Hãy trả lời yêu cầu của người dùng HOÀN TOÀN BẰNG TIẾNG VIỆT.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\nYêu cầu người dùng: " + prompt }] }
      ]
    });

    return response.text || "Xin lỗi, tôi không thể tạo câu trả lời lúc này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.";
  }
};

export const analyzeShiftSchedule = async (scheduleData: any): Promise<string> => {
    const ai = getAiInstance();
    if (!ai) return "Thiếu API Key.";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Phân tích lịch làm việc này để tìm các vấn đề về thiếu nhân sự vào giờ cao điểm (trưa/tối) hoặc phân bổ Ca Gãy chưa hợp lý, trả lời bằng tiếng Việt: ${JSON.stringify(scheduleData)}`
        });
        return response.text || "Không có phân tích nào.";
    } catch (error) {
        return "Lỗi phân tích lịch.";
    }
}

export const parseMenuImage = async (base64Image: string): Promise<any[]> => {
    const ai = getAiInstance();
    if (!ai) {
        console.warn("Missing API Key for Vision");
        return [];
    }

    try {
        // Remove data url prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const prompt = `
            Bạn là một Captain (Đội trưởng) nhà hàng chuyên xử lý các thực đơn viết tay phức tạp cho khách đoàn.
            
            NHIỆM VỤ: Phân tích ảnh thực đơn và trích xuất dữ liệu phục vụ.
            LƯU Ý: Ảnh có thể chứa NHIỀU thực đơn khác nhau. Hãy tách chúng ra.

            QUY TẮC ĐỌC CHỮ VIẾT TAY & KÝ HIỆU:
            
            1. **XÁC ĐỊNH TỔNG SỐ BÀN (QUAN TRỌNG NHẤT):**
               - Tìm các ký hiệu như **"x8"**, **"x 8"**, **"8 bàn"** thường viết ở đầu trang hoặc cạnh số khách.
               - **Đây là số lượng đĩa cần ra cho các món dùng chung (Lẩu, Đĩa to, Rau...).**

            2. **XÁC ĐỊNH SỐ KHÁCH & CẤU TRÚC BÀN:**
               - Tìm dòng chứa "Pax" (Ví dụ: "33 pax do thái"). Đây là tên đoàn và tổng khách.
               - **Logic chia bàn:** Tìm chuỗi dạng "A x B" (Ví dụ: "1 x 5", "7 x 4").
                 - Nghĩa là: 1 bàn 5 người, và 7 bàn 4 người.
                 - Tổng số bàn = 1 + 7 = 8 bàn. (Khớp với ký hiệu x8).
               
            3. **BỘ LỌC LOẠI TRỪ (IGNORE):**
               - **TUYỆT ĐỐI BỎ QUA** các dòng bắt đầu bằng **"NB:"**, **"N.B"**, **"Lưu ý:"**.
               - Ví dụ: "NB: lẩu gà & tầm" -> Đây là ghi chú nội bộ cho bếp, KHÔNG PHẢI MÓN CẦN BÊ RA cho khách. Đừng đưa vào danh sách items.

            4. **TÍNH TOÁN SỐ LƯỢNG MÓN (QUANTITY):**
               - **Món Chung (Shared Items):** (Món đĩa to, Lẩu, Rau, Gà luộc...)
                 => Số lượng = **TỔNG SỐ BÀN** (Tìm được ở bước 1).
               - **Món Riêng (Individual Items):** (Súp, Bát, Suất, Đồ uống...)
                 => Số lượng = **TỔNG SỐ KHÁCH (Pax)**.
               - **Ngoại lệ:** Nếu bên cạnh món ăn có ghi số lượng cụ thể (ví dụ: "Coca x10") thì lấy số đó.

            OUTPUT JSON FORMAT:
            [
                {
                    "groupName": "33 Pax Do Thái", (Kết hợp số pax và tên đoàn nếu có)
                    "location": "Vị trí/Phòng" (Nếu tìm thấy),
                    "guestCount": 33,
                    "items": [
                        { "name": "Khoai lang chiên", "quantity": 4, "unit": "Đĩa" }, (Ví dụ nếu tính theo bàn)
                        { "name": "Súp gà", "quantity": 33, "unit": "Bát" }
                    ]
                }
            ]
            
            Chỉ trả về JSON. Không giải thích thêm.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
                    ]
                }
            ]
        });

        const text = response.text || "[]";
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return [];
        }
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return [];
    }
}