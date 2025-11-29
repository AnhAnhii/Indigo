
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Star, MapPin } from 'lucide-react';

type Language = 'VI' | 'EN' | 'KO' | 'FR' | 'ZH_TW' | 'ZH_CN' | 'ID' | 'MS' | 'PH' | 'TH' | 'HE';

const LANG_OPTIONS: {code: Language, label: string, sub: string, flag: string}[] = [
    { code: 'VI', label: 'Tiếng Việt', sub: 'Vietnam', flag: '🇻🇳' },
    { code: 'EN', label: 'English', sub: 'Global', flag: '🇬🇧' },
    { code: 'KO', label: 'Tiếng Hàn', sub: 'Korea', flag: '🇰🇷' },
    { code: 'ZH_CN', label: 'Trung Quốc', sub: 'China', flag: '🇨🇳' },
    { code: 'ZH_TW', label: 'Đài Loan', sub: 'Taiwan', flag: '🇹🇼' },
    { code: 'FR', label: 'Pháp', sub: 'France', flag: '🇫🇷' },
    { code: 'TH', label: 'Thái Lan', sub: 'Thailand', flag: '🇹🇭' },
    { code: 'ID', label: 'Indo', sub: 'Indonesia', flag: '🇮🇩' },
    { code: 'MS', label: 'Malay', sub: 'Malaysia', flag: '🇲🇾' },
    { code: 'PH', label: 'Philipin', sub: 'Philippines', flag: '🇵🇭' },
    { code: 'HE', label: 'Do Thái', sub: 'Israel', flag: '🇮🇱' },
];

export const StaffReviewQr: React.FC = () => {
    const { currentUser } = useGlobalContext();
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [selectedLang, setSelectedLang] = useState<Language>('VI');

    useEffect(() => {
        if (currentUser) {
            // Append lang parameter to the URL
            const redirectUrl = `${window.location.origin}?mode=review_redirect&staffId=${currentUser.id}&lang=${selectedLang}`;
            
            QRCode.toDataURL(redirectUrl, { 
                width: 400, 
                margin: 2, 
                color: { dark: '#0d9488', light: '#ffffff' },
                errorCorrectionLevel: 'M'
            })
            .then(setQrDataUrl)
            .catch(console.error);
        }
    }, [currentUser, selectedLang]);

    if (!currentUser) return null;

    return (
        <div className="flex flex-col h-full md:h-auto max-w-md mx-auto space-y-4 pt-2">
            {/* Header */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 text-center">
                <h2 className="text-xl font-extrabold text-gray-900">Xin Đánh Giá Google</h2>
                <p className="text-gray-500 text-xs mt-1">Mời khách quét mã theo ngôn ngữ</p>
            </div>

            {/* QR Card - Always Visible */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 relative overflow-hidden group text-center shrink-0">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-indigo-500"></div>
                
                <div className="flex justify-center mb-4">
                    <div className="relative p-2 bg-white rounded-2xl shadow-inner border border-gray-100">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 object-contain mix-blend-multiply" />
                        ) : (
                            <div className="w-48 h-48 bg-gray-50 animate-pulse rounded-lg flex items-center justify-center text-gray-400 text-xs">Đang tạo...</div>
                        )}
                        
                        {/* Center Icon */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center z-10 border border-gray-100">
                             <span className="text-2xl">{LANG_OPTIONS.find(l => l.code === selectedLang)?.flag}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 inline-flex items-center gap-2 max-w-full">
                    <div className="w-6 h-6 rounded-full bg-teal-200 flex items-center justify-center text-teal-800 font-bold text-xs shrink-0 overflow-hidden">
                        {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover"/> : currentUser.name.charAt(0)}
                    </div>
                    <div className="text-left overflow-hidden">
                        <p className="font-bold text-teal-800 text-xs truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-teal-600 truncate opacity-80">Indigo Sapa</p>
                    </div>
                </div>
            </div>

            {/* Language Grid - Scrollable Area */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex-1 overflow-y-auto min-h-[200px]">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-center tracking-wider">Chọn ngôn ngữ khách hàng</p>
                <div className="grid grid-cols-3 gap-2 pb-2">
                    {LANG_OPTIONS.map((opt) => (
                        <button
                            key={opt.code}
                            onClick={() => setSelectedLang(opt.code)}
                            className={`py-3 px-1 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 active:scale-95 touch-manipulation ${
                                selectedLang === opt.code 
                                ? 'bg-white text-teal-700 shadow-md ring-2 ring-teal-500 border-transparent' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                        >
                            <span className="text-2xl leading-none filter drop-shadow-sm">{opt.flag}</span>
                            <span className="text-[10px] leading-tight text-center">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
