
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  let apiKey = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

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
      console.warn("API Key not found. AI features will be disabled.");
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
    return "Lỗi kết nối AI.";
  }
};

export const parseMenuImage = async (base64Image: string): Promise<any[]> => {
    const ai = getAiInstance();
    if (!ai) return [];

    try {
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const prompt = `
            Bạn là Captain nhà hàng chuyên xử lý thực đơn viết tay.
            
            NHIỆM VỤ: Trích xuất dữ liệu từ ảnh thực đơn viết tay.
            
            QUY TẮC ĐỌC SỐ BÀN (QUAN TRỌNG NHẤT):
            - Tìm các ký hiệu như "x8", "x 8" ở đầu tờ giấy hoặc cạnh số khách. Đó là TỔNG SỐ BÀN.
            - Tìm các phép chia bàn như "1 x 5", "7 x 4" (nghĩa là 1 bàn 5 và 7 bàn 4). TỔNG SỐ BÀN = 1 + 7 = 8.
            - Nếu tìm thấy thông tin này, hãy điền vào trường "tableCount".

            QUY TẮC ĐỌC PAX (KHÁCH):
            - Tìm dòng chứa chữ "Pax". Ví dụ "33 pax Do Thái".
            - "guestCount": 33.
            - "groupName": Trích xuất toàn bộ dòng này ("33 pax Do Thái") để hệ thống xử lý loại khách sau này.
            - BỎ QUA các dòng tên công ty hoặc tên người ở dòng dưới (ví dụ "Mr.Hiep (VN247)" -> Đừng quan tâm).

            QUY TẮC MÓN ĂN:
            - BỎ QUA dòng bắt đầu bằng "NB:", "N.B", "Lưu ý" (Ví dụ "NB: Lẩu gà & tầm" là ghi chú bếp, không phải món khách gọi).
            - Món Chung (Lẩu, Gà, Cá, Rau...): Nếu không ghi số lượng, mặc định số lượng = TỔNG SỐ BÀN.
            - Món Riêng (Súp, Suất...): Số lượng = TỔNG SỐ KHÁCH.
            
            OUTPUT JSON FORMAT:
            [
                {
                    "groupName": "33 pax Do Thái",
                    "location": "Vị trí/Phòng",
                    "guestCount": 33,
                    "tableCount": 8, (Số bàn tìm được)
                    "items": [
                        { "name": "Khoai lang chiên", "quantity": 4, "unit": "Đĩa" }
                    ]
                }
            ]
            Chỉ trả về JSON thuần túy.
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
        const jsonMatch = text.match(/\[.*\]/s);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return [];
        }
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return [];
    }
}
