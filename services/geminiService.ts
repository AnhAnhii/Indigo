
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

        // PROMPT NÂNG CAO CHO NHÀ HÀNG VIỆT NAM V2 (Tập trung vào chữ viết tay khó đọc và Logic chia bàn)
        const prompt = `
            Bạn là một Captain (Đội trưởng) nhà hàng chuyên nghiệp, chuyên giải mã các tờ Order viết tay "gà bới".
            Nhiệm vụ: Chuyển đổi ảnh thực đơn thành JSON.

            === QUY TẮC SỐ 1: TÌM TỔNG SỐ BÀN (TABLE COUNT) - ƯU TIÊN CAO NHẤT ===
            Chữ viết tay số bàn thường nằm ở góc trên, bên cạnh tên đoàn hoặc số khách.
            Hãy tìm các mẫu sau:
            1. Ký hiệu "x": "x8", "x 8", "x4", "x 4". Đây là CHẮC CHẮN số bàn. (VD: x8 => 8 bàn).
            2. Phép cộng chia bàn: "1x5 + 7x4" hoặc "1x5, 7x4" hoặc "3x6, 2x5".
               -> HÃY CỘNG TỔNG LẠI: 1 + 7 = 8 bàn. 3 + 2 = 5 bàn.
               -> Lưu chuỗi gốc "1x5, 7x4" vào trường "tableSplit".
            3. Ký hiệu "T": "8T", "4T" (Table).
            4. Nếu không tìm thấy các ký hiệu trên, mới dùng công thức ước lượng: Table = ceil(Guest / 6).

            === QUY TẮC SỐ 2: PAX & GROUP NAME ===
            - Tìm dòng chứa chữ "Pax". VD: "33 pax Do Thai".
            - Tách: guestCount = 33.
            - groupName: "33 pax Do Thai" (Giữ nguyên để xác định loại khách Âu/Á/Hàn/Do Thái).

            === QUY TẮC SỐ 3: LOCATION ===
            - Tìm mã bàn: A1, B2, C1, VIP...
            - Tìm dải bàn: "A1 (1->5)" hoặc "A1-A5".

            === QUY TẮC SỐ 4: MÓN ĂN (ITEMS) ===
            - BỎ QUA: "NB:", "Lưu ý:", "Note:", "Nội bộ".
            - SỐ LƯỢNG (QUANTITY):
              + Món Chung (Lẩu, Gà, Cá, Rau, Khoai, Đĩa...): Nếu không ghi số cụ thể, mặc định Qty = TABLE COUNT.
              + Món Riêng (Súp, Suất, Bát, Cốc...): Nếu không ghi số cụ thể, mặc định Qty = GUEST COUNT.

            OUTPUT JSON FORMAT:
            [
                {
                    "groupName": "33 pax Do Thai",
                    "location": "A1", 
                    "guestCount": 33,
                    "tableCount": 8,
                    "tableSplit": "1x5, 7x4", 
                    "items": [
                        { "name": "Khoai lang chiên", "quantity": 8, "unit": "Đĩa" },
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
                    quantity: Number(i.quantity) || 1
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
            Bạn là chuyên gia an ninh sinh trắc học (Biometric Security).
            
            NHIỆM VỤ: Xác thực danh tính từ 2 bức ảnh.
            - Ảnh 1: Ảnh chụp từ Camera chấm công (Captured).
            - Ảnh 2: Ảnh hồ sơ nhân viên (Reference).

            QUY TẮC CỐT LÕI (HARD RULES):
            1. PHÁT HIỆN KHUÔN MẶT (FACE DETECTION):
               - Kiểm tra Ảnh 1. Nếu là hình ảnh đồ vật (ghế, bàn, tường, trần nhà), động vật, hoặc quá tối/mờ không thấy rõ mặt người -> TRẢ VỀ "hasFace": false.
               - Nếu không có mặt người -> "match": false, "confidence": 0.
            
            2. SO SÁNH (VERIFICATION):
               - Chỉ so sánh nếu "hasFace": true.
               - So sánh đặc điểm khuôn mặt giữa Ảnh 1 và Ảnh 2.
            
            OUTPUT JSON ONLY:
            {
                "hasFace": boolean, // Có phát hiện mặt người trong Ảnh 1 không?
                "match": boolean, // true nếu cùng một người, false nếu khác người hoặc hasFace=false
                "confidence": number // 0-100 (Độ tin cậy. Nếu hasFace=false thì confidence=0)
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
        console.error("Face Verification Error:", error);
        return { match: false, confidence: 0, hasFace: false };
    }
};

export const analyzeVoiceCheckIn = async (audioBase64: string, challengePhrase: string, employeeList: string[]): Promise<{ success: boolean, message: string, detectedName?: string }> => {
    const ai = getAiInstance();
    if (!ai) return { success: false, message: "Lỗi cấu hình AI." };

    try {
        const cleanAudio = audioBase64.split(',')[1] || audioBase64;

        const prompt = `
            Bạn là hệ thống chấm công bằng giọng nói (Voice Attendance).
            
            NHIỆM VỤ:
            Phân tích đoạn ghi âm người dùng nói để xác thực chấm công.
            
            DỮ LIỆU ĐẦU VÀO:
            1. Challenge Phrase (Mã kiểm tra): "${challengePhrase}" (Người dùng PHẢI đọc đúng cụm từ này).
            2. Danh sách nhân viên hợp lệ: ${JSON.stringify(employeeList)}.

            QUY TẮC XỬ LÝ:
            1. Kiểm tra xem người dùng có đọc đúng "Challenge Phrase" không? (Chấp nhận sai sót nhỏ về phát âm nhưng phải đúng từ khóa chính).
            2. Kiểm tra xem người dùng có xưng tên không? Nếu có, tên đó có nằm trong danh sách nhân viên không? (So sánh gần đúng).
            3. Xác định ý định: Chấm công, Vào ca, Đi làm, Về, Check out.
            
            OUTPUT JSON ONLY:
            {
                "isChallengeCorrect": boolean,
                "detectedName": string | null, // Tên nhân viên nhận diện được (hoặc null)
                "intent": "CHECK_IN" | "CHECK_OUT" | "UNKNOWN",
                "confidence": number, // 0-100
                "reason": "Giải thích ngắn gọn tiếng Việt"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'audio/webm', data: cleanAudio } } 
                    ]
                }
            ]
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{.*\}/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
        const result = JSON.parse(jsonStr);

        if (result.isChallengeCorrect && result.detectedName && result.confidence > 70) {
            return { success: true, message: "Xác thực thành công", detectedName: result.detectedName };
        } else {
            return { success: false, message: result.reason || "Không nghe rõ hoặc sai mã kiểm tra." };
        }

    } catch (error) {
        console.error("Voice Analysis Error:", error);
        return { success: false, message: "Lỗi phân tích giọng nói." };
    }
};
