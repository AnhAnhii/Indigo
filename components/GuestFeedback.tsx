
import React, { useState } from 'react';
import { Star, Send, ThumbsUp, Frown, Meh, Smile, Heart, CheckCircle2 } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';

export const GuestFeedback: React.FC = () => {
    const { submitFeedback } = useGlobalContext();
    const [step, setStep] = useState(1);
    const [rating, setRating] = useState(0); // 1-5
    const [npsScore, setNpsScore] = useState<number | null>(null); // 0-10
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Cảm ơn quý khách!</h2>
                            <p className="text-gray-600 mb-6">Chúng tôi rất vui vì bạn đã có trải nghiệm tuyệt vời tại Indigo Sapa.</p>
                            
                            {/* GOOGLE NUDGE */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">Bạn có muốn chia sẻ điều này lên Google Maps không?</p>
                                <a 
                                    href="https://www.google.com/maps" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    Review trên Google Maps
                                </a>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đã ghi nhận!</h2>
                            <p className="text-gray-600 mb-4">Thành thật xin lỗi vì trải nghiệm chưa trọn vẹn. Quản lý nhà hàng đã nhận được phản hồi và sẽ liên hệ sớm để khắc phục.</p>
                        </>
                    )}
                    <button onClick={() => window.location.reload()} className="text-teal-600 font-bold text-sm mt-4 hover:underline">Quay lại trang chủ</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1 my-4">
                
                {/* Header */}
                <div className="bg-teal-600 p-6 text-white text-center relative">
                    <h1 className="text-xl font-bold">Đánh giá trải nghiệm</h1>
                    <p className="text-teal-100 text-sm opacity-90">Tại Indigo Sapa Restaurant</p>
                    <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
                        <div className="bg-white px-4 py-1 rounded-full shadow-sm text-xs font-bold text-gray-500 uppercase tracking-widest border">
                            Bước {step}/2
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-12 flex-1 flex flex-col">
                    
                    {step === 1 && (
                        <div className="text-center space-y-8 animate-in slide-in-from-right duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Bữa ăn hôm nay thế nào?</h3>
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
                                    {rating === 5 ? "Tuyệt vời! 😍" : rating === 4 ? "Rất tốt! 😄" : rating === 3 ? "Bình thường 🙂" : rating === 2 ? "Tệ 😕" : rating === 1 ? "Rất tệ 😡" : ""}
                                </p>
                            </div>

                            {/* NPS Question */}
                            <div className="pt-6 border-t">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Khả năng bạn giới thiệu chúng tôi?</h3>
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
                                    <span>Không bao giờ</span>
                                    <span>Chắc chắn</span>
                                </div>
                            </div>

                            {rating > 0 && npsScore !== null && (
                                <button onClick={() => setStep(2)} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-teal-700 mt-4 animate-bounce">Tiếp tục</button>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Lời nhắn của bạn (Tùy chọn)</label>
                                <textarea 
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={rating >= 4 ? "Điều gì làm bạn hài lòng nhất?" : "Chúng tôi cần cải thiện điều gì?"}
                                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 outline-none min-h-[100px]"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tên của bạn</label>
                                    <input 
                                        type="text" 
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Số điện thoại (Để nhận ưu đãi)</label>
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
                                {isSubmitting ? 'Đang gửi...' : <>Gửi đánh giá <Send size={18}/></>}
                            </button>
                            <button onClick={() => setStep(1)} className="w-full text-gray-400 text-xs font-bold hover:text-gray-600 py-2">Quay lại</button>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Powered by Indigo AI System</p>
        </div>
    );
};
