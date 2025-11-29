
import React, { useEffect, useState } from 'react';
import { Star, Loader2, MapPin, Globe } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { LOGO_URL } from '../App';

interface ReviewRedirectProps {
    staffId: string;
}

const GOOGLE_REVIEW_LINK = "https://share.google/gtcyxA8neU95Oq2N1";

type Language = 'VI' | 'EN' | 'KO' | 'FR' | 'ZH_TW' | 'ZH_CN' | 'ID' | 'MS' | 'PH' | 'TH' | 'HE';

const TRANSLATIONS: Record<Language, { thank: string, ask: string, servedBy: string, redirecting: string, btn: string }> = {
    VI: {
        thank: "Cảm ơn quý khách!",
        ask: "Bạn đã có trải nghiệm tuyệt vời tại Indigo Sapa chứ?",
        servedBy: "Đang phục vụ bạn",
        redirecting: "Đang chuyển hướng...",
        btn: "Đánh giá trên Google"
    },
    EN: {
        thank: "Thank you!",
        ask: "Did you have a great experience at Indigo Sapa?",
        servedBy: "Served by",
        redirecting: "Redirecting...",
        btn: "Review on Google"
    },
    KO: {
        thank: "감사합니다!",
        ask: "인디고 사파에서 즐거운 시간을 보내셨나요?",
        servedBy: "담당 직원",
        redirecting: "이동 중...",
        btn: "Google 리뷰 작성"
    },
    FR: {
        thank: "Merci beaucoup!",
        ask: "Avez-vous passé un excellent moment à Indigo Sapa?",
        servedBy: "Servi par",
        redirecting: "Redirection...",
        btn: "Avis sur Google"
    },
    ZH_TW: { // Traditional Chinese (Taiwan/Hong Kong)
        thank: "感謝您！",
        ask: "您在 Indigo Sapa 有美好的體驗嗎？",
        servedBy: "服務人員",
        redirecting: "正在跳轉...",
        btn: "在 Google 上評價"
    },
    ZH_CN: { // Simplified Chinese (Mainland China)
        thank: "谢谢！",
        ask: "您在 Indigo Sapa 用餐愉快吗？",
        servedBy: "服务人员",
        redirecting: "正在跳转...",
        btn: "在 Google 上评价"
    },
    ID: { // Indonesia
        thank: "Terima kasih!",
        ask: "Apakah Anda memiliki pengalaman hebat di Indigo Sapa?",
        servedBy: "Dilayani oleh",
        redirecting: "Mengalihkan...",
        btn: "Ulas di Google"
    },
    MS: { // Malaysia
        thank: "Terima kasih!",
        ask: "Adakah anda mempunyai pengalaman hebat di Indigo Sapa?",
        servedBy: "Dilayan oleh",
        redirecting: "Mengalihkan...",
        btn: "Ulasan di Google"
    },
    PH: { // Philippines (Tagalog)
        thank: "Salamat!",
        ask: "Naging maganda ba ang karanasan mo sa Indigo Sapa?",
        servedBy: "Inililingkod ni",
        redirecting: "Redirekta...",
        btn: "Mag-review sa Google"
    },
    TH: { // Thailand
        thank: "ขอบคุณ!",
        ask: "คุณประทับใจกับ Indigo Sapa ไหม?",
        servedBy: "บริการโดย",
        redirecting: "กำลังเปลี่ยนหน้า...",
        btn: "รีวิวบน Google"
    },
    HE: { // Hebrew
        thank: "תודה רבה!",
        ask: "האם נהנית ב-Indigo Sapa?",
        servedBy: "מוגש על ידי",
        redirecting: "מפנה...",
        btn: "דרג בגוגל"
    }
};

const LANG_OPTIONS: {code: Language, flag: string, label: string}[] = [
    { code: 'VI', flag: '🇻🇳', label: 'Tiếng Việt' },
    { code: 'EN', flag: '🇬🇧', label: 'English' },
    { code: 'KO', flag: '🇰🇷', label: '한국어' },
    { code: 'ZH_CN', flag: '🇨🇳', label: '中文' },
    { code: 'ZH_TW', flag: '🇹🇼', label: '台灣' },
    { code: 'FR', flag: '🇫🇷', label: 'Français' },
    { code: 'TH', flag: '🇹🇭', label: 'ไทย' },
    { code: 'ID', flag: '🇮🇩', label: 'Indo' },
    { code: 'MS', flag: '🇲🇾', label: 'Malay' },
    { code: 'PH', flag: '🇵🇭', label: 'Pilipino' },
    { code: 'HE', flag: '🇮🇱', label: 'עברית' },
];

export const ReviewRedirect: React.FC<ReviewRedirectProps> = ({ staffId }) => {
    const { employees, trackReviewClick } = useGlobalContext();
    const [staffName, setStaffName] = useState('Staff');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [language, setLanguage] = useState<Language>('VI');

    const t = TRANSLATIONS[language];

    useEffect(() => {
        // 1. Get Staff Info
        const staff = employees.find(e => e.id === staffId);
        if (staff) {
            setStaffName(staff.name);
            setAvatar(staff.avatar || null);
        }

        // 2. Auto-detect language from URL
        const params = new URLSearchParams(window.location.search);
        const langParam = params.get('lang');
        if (langParam && Object.keys(TRANSLATIONS).includes(langParam)) {
            setLanguage(langParam as Language);
        }
    }, [employees, staffId]);

    const handleRedirect = async () => {
        setIsRedirecting(true);
        // Track the click before redirecting
        try {
            await trackReviewClick(staffId);
        } catch (e) {
            console.error("Tracking failed", e);
        }
        // Force redirect after short delay
        setTimeout(() => {
            window.location.href = GOOGLE_REVIEW_LINK;
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-700 to-indigo-900 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden font-sans">
            
            {/* Top Language Bar - Mobile Scrollable */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20">
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar mask-gradient-x justify-start md:justify-center">
                    {LANG_OPTIONS.map(opt => (
                        <button 
                            key={opt.code}
                            onClick={() => setLanguage(opt.code)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all shrink-0 active:scale-95 ${
                                language === opt.code 
                                ? 'bg-white/20 border-white/50 text-white font-bold shadow-md' 
                                : 'bg-black/10 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                        >
                            <span className="text-lg">{opt.flag}</span>
                            <span className="text-xs">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-sm relative z-10 mt-12">
                <div className="bg-white/95 backdrop-blur-xl text-gray-800 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden border border-white/20">
                    {/* Decorative Top Gradient */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-blue-500 to-indigo-500"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center" dir="auto">
                        <img src={LOGO_URL} alt="Logo" className="w-16 h-16 object-contain mb-6 drop-shadow-sm" />
                        
                        <h2 className="text-2xl font-black mb-2 tracking-tight text-gray-900">{t.thank}</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed px-2 font-medium">{t.ask}</p>

                        <div className="mb-8 w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full border-2 border-white shadow-md overflow-hidden shrink-0 relative">
                                {avatar ? (
                                    <img src={avatar} alt={staffName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center font-bold text-xl text-gray-400">
                                        {staffName.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="text-left overflow-hidden">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-0.5">{t.servedBy}</p>
                                <p className="font-bold text-gray-900 text-lg truncate">{staffName}</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleRedirect}
                            disabled={isRedirecting}
                            className="w-full bg-[#4285F4] text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#3367D6] transition-all active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            {isRedirecting ? (
                                <>
                                    <Loader2 size={22} className="animate-spin" /> {t.redirecting}
                                </>
                            ) : (
                                <>
                                    <Star className="fill-yellow-400 text-yellow-400 group-hover:scale-110 transition-transform" size={22}/>
                                    {t.btn}
                                </>
                            )}
                        </button>
                        
                        <div className="mt-6 flex justify-center text-xs font-medium text-gray-400 items-center gap-1.5 opacity-80">
                            <MapPin size={12} /> Indigo Restaurant Sapa
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full blur-[100px] opacity-30 -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30 -ml-16 -mb-16 pointer-events-none"></div>
        </div>
    );
};
