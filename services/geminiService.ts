
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

        // PROMPT V17: STRICT LOCATION ZONES + V16 GROUP NAME + V15 NEM LOGIC
        const prompt = `
            Bạn là Quản lý nhà hàng (AI Order Parser). Nhiệm vụ: Số hóa phiếu order từ ảnh menu.

            QUY TẮC V17 - NHẬN DIỆN VỊ TRÍ & LOGIC CŨ:

            1. VỊ TRÍ (location) - TỰ ĐỘNG NHẬN DIỆN THEO KHU VỰC:
               - Hãy tìm thông tin bàn/khu vực ở phần đầu phiếu.
               - CHỈ CHẤP NHẬN các khu vực sau:
                 + Khu A1, A2, B1, B2, C1, C2: Số bàn từ 1 đến 14. (Ví dụ: "A1-5", "Bàn 10 C2", "C1 2").
                 + Khu Ban công (BC): Số bàn từ 1 đến 6. (Ví dụ: "BC 3", "Ban công 1", "BC-2").
               - Nếu tìm thấy chữ viết tay khớp quy tắc trên -> Điền vào field "location".
               - Nếu không tìm thấy hoặc không thuộc các khu trên -> Để chuỗi rỗng "".

            2. TÊN ĐOÀN (groupName):
               - Cấu trúc: "{Số khách} {Loại khách} ({Tên Cty/Người đặt})".
               - Ví dụ: "17 Âu (Vido)", "33 Do Thái (Mr. Vương)".

            3. LOGIC MÓN NEM (V15):
               - Món Nem (Rau/Tôm/Thập cẩm...): KHÔNG TÁCH DÒNG.
               - Quantity = Tổng số bàn.
               - Note: Tạo hướng dẫn chia (VD: "2 đĩa cho bàn 7 người • 1 đĩa cho bàn 6 người").

            4. LOGIC CHUNG:
               - Súp/Cháo: Quantity = Tổng khách (Unit: Bát).
               - Món khác (Lẩu, Gà, Rau...): Quantity = Tổng số bàn (Unit: Đĩa/Nồi).
               - Bỏ qua các dòng ghi chú nội bộ (NB, Nbo...) ở cuối phiếu.

            OUTPUT JSON (Array):
            [
                {
                    "groupName": "17 Âu (Vido)", 
                    "location": "A1-5", 
                    "guestCount": 17,
                    "tableCount": 3,
                    "tableSplit": "2x7, 1x3", 
                    "confidence": 95,
                    "warnings": [], 
                    "items": [
                        { 
                            "name": "Nem thập cẩm", 
                            "quantity": 3, 
                            "unit": "Đĩa", 
                            "note": "2 đĩa cho bàn 7 người • 1 đĩa cho bàn 3 người" 
                        }
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
                confidence: Number(g.confidence) || 70,
                warnings: Array.isArray(g.warnings) ? g.warnings : [],
                items: Array.isArray(g.items) ? g.items.map((i: any) => ({
                    ...i,
                    quantity: Number(i.quantity) || 1,
                    unit: i.unit || 'Phần',
                    note: i.note || ''
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

export const analyzeFeedback = async (comment: string, rating: number): Promise<{ sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', tags: string[] }> => {
    const ai = getAiInstance();
    if (!ai || !comment) return { sentiment: rating >= 4 ? 'POSITIVE' : rating <= 2 ? 'NEGATIVE' : 'NEUTRAL', tags: [] };

    try {
        const prompt = `
            Phân tích feedback khách hàng nhà hàng.
            Comment: "${comment}"
            Rating: ${rating} sao.
            
            Yêu cầu:
            1. Xác định Sentiment (POSITIVE, NEUTRAL, NEGATIVE). Nếu rating thấp (1-2) thì auto NEGATIVE.
            2. Trích xuất Tags (Món ăn, Phục vụ, Không gian, Giá cả, Vệ sinh).
            
            OUTPUT JSON ONLY: { "sentiment": string, "tags": string[] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{.*\}/s);
        return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    } catch (e) {
        return { sentiment: 'NEUTRAL', tags: [] };
    }
};

export const generateMarketingContent = async (topic: string): Promise<{ story: string, trend: string, professional: string, review: string, fun: string, chef: string }> => {
    const ai = getAiInstance();
    if (!ai) return { story: 'Lỗi AI', trend: 'Lỗi AI', professional: 'Lỗi AI', review: 'Lỗi AI', fun: 'Lỗi AI', chef: 'Lỗi AI' };

    try {
        // STYLE: "HEM SAIGON" BUT FOR "INDIGO SAPA" + 3 NEW STYLES
        const prompt = `
            Bạn là Content Creator cho nhà hàng 'Indigo Restaurant' - Lá Chàm Sapa.
            Hãy viết 6 nội dung Facebook khác nhau về chủ đề: "${topic}".

            YÊU CẦU CHUNG: Giọng văn đặc trưng Sapa (mù sương, ấm cúng, đặc sản Tây Bắc). Hashtag: #IndigoSapa #SapaFood.

            OUTPUT JSON BẮT BUỘC (6 Keys):
            {
                "story": "Style 'Tâm tình & Hoài niệm' (giống Hẻm Saigon): Kể chuyện nhỏ, cảm xúc, dùng từ 'nhà mình', 'thương', 'lai rai'.",
                "trend": "Style 'Bắt Trend Gen Z': Ngắn gọn, dùng slang (vibe, chill, keo lì), rủ rê bạn bè.",
                "professional": "Style 'Trang trọng': Lịch sự, tập trung vào dịch vụ cao cấp và sự tinh tế.",
                "review": "Style 'Food Blogger': Mô tả chi tiết hương vị, màu sắc, cảm giác khi ăn (tan trong miệng, đậm đà).",
                "fun": "Style 'Thả thính/Hài hước': Dùng chơi chữ (pun) hoặc câu thả thính liên quan đến món ăn.",
                "chef": "Style 'Bếp Trưởng': Góc nhìn người nấu, nói về nguyên liệu tuyển chọn và tâm huyết trong từng công đoạn."
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    } catch (e) {
        console.error(e);
        return { 
            story: 'Lỗi tạo nội dung.', 
            trend: 'Vui lòng thử lại.', 
            professional: 'Kiểm tra kết nối.', 
            review: 'Error.', 
            fun: 'Error.', 
            chef: 'Error.' 
        };
    }
};

export const generateFunCaption = async (imageBase64: string): Promise<string> => {
    const ai = getAiInstance();
    if (!ai) return "AI đang ngủ...";

    try {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        const prompt = `
            Bạn là một "Thầy Bói Vui Tính" tại nhà hàng Sapa.
            Hãy nhìn bức ảnh selfie của khách hàng và đưa ra một lời bình hài hước, duyên dáng và mang đậm chất Tây Bắc.
            
            Ví dụ:
            - "Thần thái này chắc chắn lát nữa sẽ gọi thêm Rượu Táo Mèo!"
            - "Gương mặt phúc hậu, ăn Lẩu Cá Tầm là chuẩn bài!"
            - "Trông bạn rạng rỡ như hoa Ban nở giữa rừng!"
            
            Yêu cầu: Ngắn gọn (dưới 20 từ), vui vẻ, khen ngợi khách.
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

        return response.text || "Bạn thật tuyệt vời!";
    } catch (e) {
        return "Nụ cười tỏa nắng Sapa!";
    }
};

export const generateMenuItemDetails = async (vietnameseName: string): Promise<any> => {
    const ai = getAiInstance();
    if (!ai) return null;

    try {
        const prompt = `
            Bạn là Bếp trưởng nhà hàng Quốc tế tại Sapa.
            Nhiệm vụ: Dịch và tạo mô tả hấp dẫn cho món ăn: "${vietnameseName}".

            Yêu cầu:
            1. Dịch tên món sang Anh, Hàn, Pháp chuẩn thực đơn nhà hàng.
            2. Viết mô tả ngắn (1-2 câu) hấp dẫn, kích thích vị giác cho từng ngôn ngữ.
            3. Gợi ý Danh mục (Món chính, Khai vị, Đồ uống, Tráng miệng, Lẩu, Nướng...).
            4. Gợi ý Đơn vị tính (Đĩa, Nồi, Bát, Ly, Kg...).

            OUTPUT JSON ONLY:
            {
                "nameEn": "...",
                "nameKo": "...",
                "nameFr": "...",
                "description": "...",
                "descriptionEn": "...",
                "descriptionKo": "...",
                "descriptionFr": "...",
                "category": "...",
                "unit": "..."
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = response.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    } catch (e) {
        console.error("AI Menu Gen Error:", e);
        return null;
    }
};