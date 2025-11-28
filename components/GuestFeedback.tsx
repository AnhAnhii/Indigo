
import React, { useState } from 'react';
import { Star, Send, Heart, CheckCircle2, Globe } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';

type Language = 'VI' | 'EN' | 'KO' | 'FR';

const TRANSLATIONS = {
    VI: {
        title: "Đánh giá trải nghiệm",
        subtitle: "Tại Indigo Sapa Restaurant",
        step: "Bước",
        q1: "Bữa ăn hôm nay thế nào?",
        rating: ["Rất tệ 😡", "Tệ 😕", "Bình thường 🙂", "Rất tốt! 😄", "Tuyệt vời! 😍"],
        q2: "Khả năng bạn giới thiệu chúng tôi?",
        npsLow: "Không bao giờ",
        npsHigh: "Chắc chắn",
        continue: "Tiếp tục",
        commentLabel: "Lời nhắn của bạn (Tùy chọn)",
        commentPhPos: "Điều gì làm bạn hài lòng nhất?",
        commentPhNeg: "Chúng tôi cần cải thiện điều gì?",
        nameLabel: "Tên của bạn",
        phoneLabel: "Số điện thoại (Để nhận ưu đãi)",
        submit: "Gửi đánh giá",
        sending: "Đang gửi...",
        back: "Quay lại",
        thankTitle: "Cảm ơn quý khách!",
        thankMsg: "Chúng tôi rất vui vì bạn đã có trải nghiệm tuyệt vời tại Indigo Sapa.",
        receivedTitle: "Đã ghi nhận!",
        receivedMsg: "Thành thật xin lỗi vì trải nghiệm chưa trọn vẹn. Quản lý nhà hàng đã nhận được phản hồi và sẽ liên hệ sớm để khắc phục.",
        googleAsk: "Bạn có muốn chia sẻ điều này lên Google Maps không?",
        googleBtn: "Review trên Google Maps",
        homeBtn: "Quay lại trang chủ"
    },
    EN: {
        title: "Experience Review",
        subtitle: "At Indigo Sapa Restaurant",
        step: "Step",
        q1: "How was your meal today?",
        rating: ["Very Bad 😡", "Bad 😕", "Okay 🙂", "Very Good! 😄", "Excellent! 😍"],
        q2: "How likely are you to recommend us?",
        npsLow: "Never",
        npsHigh: "Definitely",
        continue: "Continue",
        commentLabel: "Your comments (Optional)",
        commentPhPos: "What did you like the most?",
        commentPhNeg: "What can we improve?",
        nameLabel: "Your Name",
        phoneLabel: "Phone Number (For offers)",
        submit: "Submit Review",
        sending: "Sending...",
        back: "Back",
        thankTitle: "Thank you!",
        thankMsg: "We are glad you had a great experience at Indigo Sapa.",
        receivedTitle: "Received!",
        receivedMsg: "We sincerely apologize if the experience wasn't perfect. Our manager has received your feedback and will contact you shortly.",
        googleAsk: "Would you like to share this on Google Maps?",
        googleBtn: "Review on Google Maps",
        homeBtn: "Back to Home"
    },
    KO: {
        title: "경험 평가",
        subtitle: "인디고 사파 레스토랑",
        step: "단계",
        q1: "오늘 식사는 어떠셨나요?",
        rating: ["매우 나쁨 😡", "나쁨 😕", "보통 🙂", "매우 좋음! 😄", "훌륭함! 😍"],
        q2: "친구에게 추천하실 의향이 있나요?",
        npsLow: "전혀 없음",
        npsHigh: "확실함",
        continue: "계속",
        commentLabel: "메시지 (선택 사항)",
        commentPhPos: "가장 마음에 드셨던 점은 무엇인가요?",
        commentPhNeg: "개선해야 할 점은 무엇인가요?",
        nameLabel: "성함",
        phoneLabel: "전화번호 (혜택 수신용)",
        submit: "평가 제출",
        sending: "전송 중...",
        back: "뒤로",
        thankTitle: "감사합니다!",
        thankMsg: "인디고 사파에서 즐거운 시간을 보내셨다니 기쁩니다.",
        receivedTitle: "접수되었습니다!",
        receivedMsg: "완벽하지 못한 경험에 대해 진심으로 사과드립니다. 매니저가 피드백을 확인했으며 곧 연락드리겠습니다.",
        googleAsk: "Google 지도에 공유하시겠습니까?",
        googleBtn: "Google 지도 리뷰",
        homeBtn: "홈으로 돌아가기"
    },
    FR: {
        title: "Évaluer l'expérience",
        subtitle: "Au restaurant Indigo Sapa",
        step: "Étape",
        q1: "Comment était votre repas aujourd'hui ?",
        rating: ["Très mauvais 😡", "Mauvais 😕", "Moyen 🙂", "Très bien ! 😄", "Excellent ! 😍"],
        q2: "Quelle est la probabilité que vous nous recommandiez ?",
        npsLow: "Jamais",
        npsHigh: "Certainement",
        continue: "Continuer",
        commentLabel: "Votre message (Optionnel)",
        commentPhPos: "Qu'avez-vous le plus aimé ?",
        commentPhNeg: "Que pouvons-nous améliorer ?",
        nameLabel: "Votre nom",
        phoneLabel: "Numéro de téléphone (Pour les offres)",
        submit: "Envoyer l'avis",
        sending: "Envoi...",
        back: "Retour",
        thankTitle: "Merci !",
        thankMsg: "Nous sommes ravis que vous ayez passé un excellent moment à Indigo Sapa.",
        receivedTitle: "Bien reçu !",
        receivedMsg: "Nous nous excusons sincèrement si l'expérience n'a pas été parfaite. Notre responsable a reçu vos commentaires et vous contactera sous peu.",
        googleAsk: "Voulez-vous partager cela sur Google Maps ?",
        googleBtn: "Avis sur Google Maps",
        homeBtn: "Retour à l'accueil"
    }
};

const LANG_OPTIONS: {code: Language, label: string, flag: string}[] = [
    { code: 'VI', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: 'KO', label: '한국어', flag: '🇰🇷' },
    { code: 'FR', label: 'Français', flag: '🇫🇷' },
];

export const GuestFeedback: React.FC = () => {
    const { submitFeedback } = useGlobalContext();
    const [language, setLanguage] = useState<Language>('VI');
    const [step, setStep] = useState(1);
    const [rating, setRating] = useState(0); // 1-5
    const [npsScore, setNpsScore] = useState<number | null>(null); // 0-10
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    const t = TRANSLATIONS[language];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await submitFeedback({
            rating,
            npsScore: npsScore || 0,
            comment,
            name: customerName,
            phone
        });
        setIsSubmitting(false);
        setStep(3);
    };

    const handleRatingSelect = (r: number) => {
        setRating(r);
        setTimeout(() => setStep(2), 300);
    };

    if (step === 3) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl animate-in zoom-in">
                    {rating >= 4 ? (
                        <>
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                <Heart size={40} className="fill-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.thankTitle}</h2>
                            <p className="text-gray-600 mb-6">{t.thankMsg}</p>
                            
                            {/* GOOGLE NUDGE */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">{t.googleAsk}</p>
                                <a 
                                    href="https://www.google.com/maps" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    {t.googleBtn}
                                </a>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.receivedTitle}</h2>
                            <p className="text-gray-600 mb-4">{t.receivedMsg}</p>
                        </>
                    )}
                    <button onClick={() => window.location.reload()} className="text-teal-600 font-bold text-sm mt-4 hover:underline">{t.homeBtn}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1 my-4">
                
                {/* Header */}
                <div className="bg-teal-600 p-6 text-white text-center relative">
                    <h1 className="text-xl font-bold">{t.title}</h1>
                    <p className="text-teal-100 text-sm opacity-90">{t.subtitle}</p>
                    
                    {/* LANG SWITCHER */}
                    <div className="absolute top-4 right-4">
                        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="text-white/80 hover:text-white bg-white/10 p-1.5 rounded-full">
                            <Globe size={20}/>
                        </button>
                        {isLangMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsLangMenuOpen(false)}></div>
                                <div className="absolute right-0 top-10 bg-white rounded-lg shadow-xl p-1 w-32 z-20 text-gray-800 text-left">
                                    {LANG_OPTIONS.map(opt => (
                                        <button 
                                            key={opt.code}
                                            onClick={() => { setLanguage(opt.code); setIsLangMenuOpen(false); }}
                                            className={`w-full px-3 py-2 text-sm font-bold flex items-center gap-2 hover:bg-gray-50 rounded ${language === opt.code ? 'text-teal-600' : ''}`}
                                        >
                                            <span>{opt.flag}</span> {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
                        <div className="bg-white px-4 py-1 rounded-full shadow-sm text-xs font-bold text-gray-500 uppercase tracking-widest border">
                            {t.step} {step}/2
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-12 flex-1 flex flex-col">
                    
                    {step === 1 && (
                        <div className="text-center space-y-8 animate-in slide-in-from-right duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4">{t.q1}</h3>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                            key={star}
                                            onClick={() => handleRatingSelect(star)}
                                            className="transition-transform hover:scale-110 focus:outline-none"
                                        >
                                            <Star 
                                                size={40} 
                                                className={`${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} transition-colors`} 
                                                strokeWidth={1.5}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm font-bold text-yellow-500 mt-2 h-5">
                                    {rating > 0 ? t.rating[rating - 1] : ""}
                                </p>
                            </div>

                            {/* NPS Question */}
                            <div className="pt-6 border-t">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">{t.q2}</h3>
                                <div className="grid grid-cols-11 gap-1 mb-2">
                                    {[0,1,2,3,4,5,6,7,8,9,10].map(score => (
                                        <button
                                            key={score}
                                            onClick={() => setNpsScore(score)}
                                            className={`aspect-square rounded text-xs font-bold transition-all ${npsScore === score ? 'bg-indigo-600 text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
                                    <span>{t.npsLow}</span>
                                    <span>{t.npsHigh}</span>
                                </div>
                            </div>

                            {rating > 0 && npsScore !== null && (
                                <button onClick={() => setStep(2)} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-teal-700 mt-4 animate-bounce">{t.continue}</button>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t.commentLabel}</label>
                                <textarea 
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={rating >= 4 ? t.commentPhPos : t.commentPhNeg}
                                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none min-h-[100px]"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{t.nameLabel}</label>
                                    <input 
                                        type="text" 
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{t.phoneLabel}</label>
                                    <input 
                                        type="tel" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex items-center justify-center gap-2 mt-auto"
                            >
                                {isSubmitting ? t.sending : <>{t.submit} <Send size={18}/></>}
                            </button>
                            <button onClick={() => setStep(1)} className="w-full text-gray-400 text-xs font-bold hover:text-gray-600 py-2">{t.back}</button>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Powered by Indigo AI System</p>
        </div>
    );
};
