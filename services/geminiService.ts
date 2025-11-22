
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  let apiKey = '';
  
  // 1. Ưu tiên lấy từ VITE_API_KEY (Chuẩn cho Vercel/Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  // 2. Fallback sang process.env (Cho các môi trường khác)
  if (!apiKey) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
      }
    } catch (e) {}
  }
  
  return apiKey;
};

const getAiInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
      console.error("CRITICAL ERROR: Không tìm thấy API Key. Vui lòng cấu hình VITE_API_KEY trong Vercel Settings.");
      // alert("Lỗi Hệ Thống: Chưa cấu hình API Key AI. Vui lòng liên hệ kỹ thuật viên."); 
      // Comment alert to prevent spamming user if key is missing
      return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const askAiAssistant = async (prompt: string, contextData: string): Promise<string> => {
  const ai = getAiInstance();
  if (!ai) return "Lỗi: Chưa cấu hình API Key.";

  try {
    const systemPrompt = `Bạn là trợ lý quản lý nhà hàng. Trả lời ngắn gọn bằng tiếng Việt. Dữ liệu: ${contextData}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n" + prompt }] }]
    });
    return response.text || "Lỗi.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Lỗi kết nối AI.";
  }
};

export const parseMenuImage = async (base64Image: string): Promise<any[]> => {
    const ai = getAiInstance();
    if (!ai) {
        console.error("Aborting image parse: No API instance");
        return [];
    }

    try {
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const prompt = `
            Bạn là Captain (Đội trưởng) nhà hàng chuyên xử lý Order viết tay.
            
            NHIỆM VỤ: Trích xuất dữ liệu JSON từ ảnh thực đơn.
            
            1. XÁC ĐỊNH VỊ TRÍ / SỐ BÀN (QUAN TRỌNG - LOCATION):
            - Nhìn vào PHẦN ĐẦU (Header) của tờ giấy.
            - Tìm các mã bàn viết tay thường là: A1, A2, B1, B2, C1, C2...
            - Nếu có dải bàn gộp, hãy lấy toàn bộ. Ví dụ: "A1 (1->5)", "B2 (1-4)", "C1 + C2".
            - Nếu không xác định được dải số, chỉ cần lấy mã khu vực (VD: "A1", "B2").
            - Điền vào trường "location".

            2. XÁC ĐỊNH SỐ LƯỢNG BÀN (TABLE COUNT):
            - Tìm ký hiệu nhân số lượng bàn như "x8", "x 8", "8 bàn".
            - Tìm các phép chia bàn như "1 x 5" (1 bàn 5), "3 x 4" (3 bàn 4).
            - Tính tổng số bàn. Ví dụ "1x5 + 3x4" => tableCount = 4. "x8" => tableCount = 8.
            - Điền vào trường "tableCount".

            3. XÁC ĐỊNH KHÁCH (PAX):
            - Tìm dòng chứa chữ "Pax" (VD: "33 pax Do Thái").
            - Tách số khách vào "guestCount" (VD: 33).
            - Lấy toàn bộ dòng đó vào "groupName" để sau này phân tích loại khách (Âu/Á/Hàn...).
            - BỎ QUA tên người dẫn đoàn hoặc tên công ty (VD: Mr.Hiep, VN247...).

            4. DANH SÁCH MÓN ĂN:
            - BỎ QUA tuyệt đối các dòng: "NB:", "N.B", "Lưu ý", "Nội bộ".
            - Món Chung (Lẩu, Gà, Cá, Rau, Mẹt...): Nếu không ghi số lượng cụ thể, Số lượng = TABLE COUNT.
            - Món Riêng (Súp, Suất, Bát...): Số lượng = GUEST COUNT.
            - Món có số lượng cụ thể (VD: "4 Khoai"): Số lượng = 4.

            OUTPUT JSON FORMAT (Array of objects):
            [
                {
                    "groupName": "33 pax Do Thái",
                    "location": "A1 (1->5)", 
                    "guestCount": 33,
                    "tableCount": 8,
                    "items": [
                        { "name": "Khoai lang chiên", "quantity": 4, "unit": "Đĩa" }
                    ]
                }
            ]
            Chỉ trả về JSON.
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
        // Logic trích xuất JSON thông minh từ lời dẫn của AI
        let jsonString = text;
        
        // 1. Thử tìm mảng JSON [ ... ]
        const arrayMatch = text.match(/\[\s*\{.*\}\s*\]/s);
        if (arrayMatch) {
            jsonString = arrayMatch[0];
        } else {
            // 2. Nếu không thấy mảng, thử tìm object { ... } và bọc vào mảng
            const objectMatch = text.match(/\{.*\}/s);
            if (objectMatch) {
                jsonString = `[${objectMatch[0]}]`;
            } else {
                // 3. Cố gắng clean markdown
                jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            }
        }
        
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            console.log("Raw AI Text:", text);
            return [];
        }
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return [];
    }
}
