
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
      console.error("CRITICAL ERROR: Không tìm thấy API Key. Vui lòng cấu hình VITE_API_KEY trong Vercel Settings.");
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

        // PROMPT V3: Tối ưu cho chữ viết tay Tiếng Việt & Ký hiệu Order
        const prompt = `
            Bạn là Captain nhà hàng chuyên đọc phiếu Order viết tay (Handwriting OCR).
            
            NHIỆM VỤ: Trích xuất thông tin Order từ ảnh chụp.

            1. PHÂN TÍCH LOGIC SỐ BÀN (QUAN TRỌNG NHẤT):
               - Tìm các ký hiệu góc tờ giấy: "x8", "8T", "T8", "Bàn 8".
               - Tìm phép cộng bàn: "1x5 + 7x4" => Tổng 8 bàn. "3x6, 2x5" => Tổng 5 bàn.
               - Nếu ghi "33 pax", "33k" => Khách = 33. Nếu không ghi số bàn, ước tính = ceil(33/6).

            2. PHÂN TÍCH MÓN ĂN (ITEMS):
               - Bỏ qua các dòng: "Note:", "NB:", "Lưu ý", "Tổng cộng".
               - Chữ viết tắt: "G" = Gà, "C" = Cơm, "R" = Rau.
               - Số lượng: Thường đứng đầu dòng "2 Gà" hoặc cuối dòng "Gà x 2".
            
            3. SUY LUẬN (Chain of Thought):
               - Nếu thấy "Do Thai" -> groupName chứa "Do Thai".
               - Nếu thấy "Han" -> groupName chứa "Han".
               - Nếu món là "Lẩu", "Gà luộc", "Cá" -> Số lượng thường = Số bàn (tableCount).
               - Nếu món là "Súp", "Bát cơm" -> Số lượng thường = Số khách (guestCount).

            OUTPUT JSON (Array):
            [
                {
                    "groupName": "Tên đoàn (VD: 33 pax Do Thai)",
                    "location": "Vị trí (VD: A1)", 
                    "guestCount": 33,
                    "tableCount": 8,
                    "tableSplit": "1x5, 7x4", 
                    "items": [
                        { "name": "Khoai chiên", "quantity": 8, "unit": "Đĩa" },
                        { "name": "Súp gà", "quantity": 33, "unit": "Bát" }
                    ]
                }
            ]
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
        
        // Clean JSON formatting
        let jsonString = text;
        const arrayMatch = text.match(/\[\s*\{.*\}\s*\]/s);
        
        if (arrayMatch) {
            jsonString = arrayMatch[0];
        } else {
            const objectMatch = text.match(/\{.*\}/s);
            if (objectMatch) {
                jsonString = `[${objectMatch[0]}]`;
            } else {
                jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            }
        }
        
        try {
            const result = JSON.parse(jsonString);
            return result.map((g: any) => ({
                ...g,
                guestCount: Number(g.guestCount) || 0,
                tableCount: Number(g.tableCount) || 1,
                tableSplit: g.tableSplit || '', 
                items: Array.isArray(g.items) ? g.items.map((i: any) => ({
                    ...i,
                    quantity: Number(i.quantity) || 1,
                    unit: i.unit || 'Phần'
                })) : []
            }));
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return [];
        }
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return [];
    }
}

export const verifyFaceIdentity = async (capturedImage: string, referenceImage: string): Promise<{ match: boolean, confidence: number, hasFace: boolean }> => {
    const ai = getAiInstance();
    if (!ai) return { match: false, confidence: 0, hasFace: false };

    try {
        const cleanCaptured = capturedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        const cleanReference = referenceImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const prompt = `
            Bạn là chuyên gia an ninh sinh trắc học.
            So sánh 2 ảnh khuôn mặt.
            OUTPUT JSON ONLY:
            {
                "hasFace": boolean, 
                "match": boolean, 
                "confidence": number 
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: cleanCaptured } },
                        { inlineData: { mimeType: 'image/jpeg', data: cleanReference } }
                    ]
                }
            ]
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{.*\}/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
        const result = JSON.parse(jsonStr);

        return {
            match: result.match === true,
            confidence: result.confidence || 0,
            hasFace: result.hasFace === true
        };

    } catch (error) {
        return { match: false, confidence: 0, hasFace: false };
    }
};

export const analyzeVoiceCheckIn = async (audioBase64: string, challengePhrase: string, employeeList: string[]): Promise<{ success: boolean, message: string, detectedName?: string }> => {
    const ai = getAiInstance();
    if (!ai) return { success: false, message: "Lỗi cấu hình AI." };

    try {
        const cleanAudio = audioBase64.split(',')[1] || audioBase64;
        const prompt = `
            Phân tích giọng nói chấm công.
            Challenge: "${challengePhrase}".
            Nhân viên: ${JSON.stringify(employeeList)}.
            OUTPUT JSON: {"isChallengeCorrect": boolean, "detectedName": string | null, "confidence": number, "reason": string}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'audio/webm', data: cleanAudio } }] }
            ]
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{.*\}/s);
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

        if (result.isChallengeCorrect && result.detectedName && result.confidence > 70) {
            return { success: true, message: "OK", detectedName: result.detectedName };
        } else {
            return { success: false, message: result.reason || "Lỗi xác thực." };
        }
    } catch (error) {
        return { success: false, message: "Lỗi phân tích giọng nói." };
    }
};
