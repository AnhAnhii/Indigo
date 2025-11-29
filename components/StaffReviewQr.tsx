
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useGlobalContext } from '../contexts/GlobalContext';

type Language = 'VI' | 'EN' | 'KO' | 'FR' | 'ZH_TW' | 'ZH_CN' | 'ID' | 'MS' | 'PH' | 'TH' | 'HE';

const LANG_OPTIONS: {code: Language, label: string, flag: string}[] = [
    { code: 'VI', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: 'KO', label: 'Tiếng Hàn', flag: '🇰🇷' },
    { code: 'ZH_CN', label: 'Trung Quốc', flag: '🇨🇳' },
    { code: 'ZH_TW', label: 'Đài Loan', flag: '🇹🇼' },
    { code: 'FR', label: 'Pháp', flag: '🇫🇷' },
    { code: 'TH', label: 'Thái Lan', flag: '🇹🇭' },
    { code: 'ID', label: 'Indo', flag: '🇮🇩' },
    { code: 'MS', label: 'Malay', flag: '🇲🇾' },
    { code: 'PH', label: 'Philipin', flag: '🇵🇭' },
    { code: 'HE', label: 'Do Thái', flag: '🇮🇱' },
];

const QUESTIONS: Record<Language, string> = {
    VI: "Bạn có trải nghiệm tốt tại Indigo Restaurant - Lá Chàm Sapa chứ?",
    EN: "Did you have a good experience at Indigo Restaurant - La Cham Sapa?",
    KO: "인디고 레스토랑 - 라 참 사파에서 좋은 경험을 하셨나요?",
    ZH_CN: "您在 Indigo Restaurant - La Cham Sapa 用餐愉快吗？",
    ZH_TW: "您在 Indigo Restaurant - La Cham Sapa 用餐愉快嗎？",
    FR: "Avez-vous passé un bon moment au restaurant Indigo - La Cham Sapa ?",
    TH: "คุณประทับใจกับร้าน Indigo Restaurant - La Cham Sapa ไหม?",
    ID: "Apakah Anda memiliki pengalaman yang baik di Indigo Restaurant - La Cham Sapa?",
    MS: "Adakah anda mempunyai pengalaman yang baik di Indigo Restaurant - La Cham Sapa?",
    PH: "Naging maganda ba ang karanasan mo sa Indigo Restaurant - La Cham Sapa?",
    HE: "האם נהנית ב-Indigo Restaurant - La Cham Sapa?"
};

export const StaffReviewQr: React.FC = () => {
    const { currentUser } = useGlobalContext();
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>('VI');

    useEffect(() => {
        if (currentUser) {
            const redirectUrl = `${window.location.origin}?mode=review_redirect&staffId=${currentUser.id}&lang=${selectedLang}`;
            
            // Generate QR with High error correction level (H) to allow center image overlay
            QRCode.toDataURL(redirectUrl, { 
                width: 1000, 
                margin: 1, 
                color: { dark: '#1e1b4b', light: '#fdfbf7' }, // Deep Indigo dots on Off-white paper
                errorCorrectionLevel: 'H'
            })
            .then(setQrDataUrl)
            .catch(console.error);
        }
    }, [currentUser, selectedLang]);

    if (!currentUser) return null;

    return (
        <div className="flex flex-col h-full w-full max-w-lg mx-auto relative overflow-hidden bg-[#fdfbf7] rounded-xl shadow-sm border border-[#e5e7eb]">
            {/* Vintage Paper Texture Background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}></div>
            
            {/* 1. TOP MESSAGE AREA (Fixed height, shrinkable text) */}
            <div className="shrink-0 pt-4 px-4 text-center z-10">
                <div className="relative p-2">
                    {/* Decorative Top Line */}
                    <div className="w-12 h-1 bg-[#b45309] mx-auto mb-3 opacity-70 rounded-full"></div>
                    
                    <p className="text-lg md:text-xl font-bold text-[#1e1b4b] leading-snug font-serif italic line-clamp-3" dir="auto">
                        "{QUESTIONS[selectedLang]}"
                    </p>
                </div>
            </div>

            {/* 2. CENTER QR WITH RETRO BROCADE BORDER (Flexible height) */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 relative z-0 min-h-0">
                
                {/* RETRO BROCADE FRAME - Responsive Sizing */}
                <div 
                    className="relative p-3 shadow-2xl shrink-0 aspect-square max-h-[55vh] w-auto max-w-full flex items-center justify-center"
                    style={{
                        // Vintage Woven Fabric Pattern
                        background: `
                            repeating-linear-gradient(
                                90deg,
                                #7f1d1d, 
                                #7f1d1d 10px, 
                                #1e1b4b 10px, 
                                #1e1b4b 20px, 
                                #b45309 20px, 
                                #b45309 25px, 
                                #1e1b4b 25px, 
                                #1e1b4b 35px
                            )
                        `,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                        border: '4px solid #1e1b4b'
                    }}
                >
                    {/* Inner White Frame (Paper look) */}
                    <div className="bg-[#fdfbf7] p-2 relative w-full h-full flex items-center justify-center">
                        {/* Stitched Border Effect */}
                        <div className="absolute inset-1.5 border-2 border-dashed border-[#b45309] opacity-50 pointer-events-none"></div>

                        {qrDataUrl ? (
                            <div className="relative w-full h-full">
                                {/* QR Code Image */}
                                <img 
                                    src={qrDataUrl} 
                                    alt="QR Code" 
                                    className="w-full h-full object-contain mix-blend-multiply" 
                                />
                                
                                {/* Center Avatar Overlay - Stamp Style */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] bg-[#fdfbf7] rounded-full p-[2%] shadow-md border border-[#1e1b4b] flex items-center justify-center">
                                    {currentUser.avatar ? (
                                        <img 
                                            src={currentUser.avatar} 
                                            alt="Avatar" 
                                            className="w-full h-full rounded-full object-cover border border-gray-200" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#1e1b4b] rounded-full flex items-center justify-center text-[#fdfbf7] font-bold text-xl font-serif">
                                            {currentUser.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#f3f4f6]">
                                <div className="animate-spin w-8 h-8 border-4 border-[#1e1b4b] border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mt-4 text-center shrink-0">
                    <p className="font-bold text-[#1e1b4b] text-base font-serif tracking-wide border-b-2 border-[#b45309] inline-block pb-0.5">
                        {currentUser.name}
                    </p>
                    <p className="text-[10px] text-[#7f1d1d] uppercase tracking-widest font-bold mt-1">Indigo Sapa</p>
                </div>
            </div>

            {/* 3. BOTTOM LANGUAGE SELECTOR (Fixed height) */}
            <div className="shrink-0 pb-2 bg-[#fdfbf7] border-t border-[#e5e7eb] z-10">
                <div className="flex gap-4 overflow-x-auto py-3 px-4 no-scrollbar justify-start md:justify-center items-center snap-x">
                    {LANG_OPTIONS.map((opt) => (
                        <button
                            key={opt.code}
                            onClick={() => setSelectedLang(opt.code)}
                            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-2xl transition-all duration-300 snap-center ${
                                selectedLang === opt.code 
                                ? 'bg-white shadow-xl scale-125 z-10 -translate-y-1 border-2 border-[#b45309] grayscale-0' 
                                : 'bg-transparent opacity-60 hover:opacity-100 grayscale hover:grayscale-0 hover:scale-110'
                            }`}
                            title={opt.label}
                        >
                            {opt.flag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
