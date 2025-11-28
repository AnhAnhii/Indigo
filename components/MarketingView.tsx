
import React, { useState } from 'react';
import { Sparkles, PenTool, Copy, Facebook, Loader2, Feather, Zap, Briefcase, Camera, Smile, ChefHat } from 'lucide-react';
import { generateMarketingContent } from '../services/geminiService';

export const MarketingView: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<{ story: string, trend: string, professional: string, review: string, fun: string, chef: string } | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setIsLoading(true);
        setResults(null);
        try {
            const data = await generateMarketingContent(topic);
            setResults(data);
        } catch (e) {
            alert("Lỗi khi tạo nội dung. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Đã sao chép vào bộ nhớ tạm!");
    };

    const handleOpenFacebook = () => {
        window.open('https://facebook.com', '_blank');
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="text-purple-600 fill-purple-100" /> Trợ Lý Marketing AI
                    </h2>
                    <p className="text-gray-500">Sáng tạo nội dung Facebook/Instagram với 6 phong cách độc đáo.</p>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <label className="block text-sm font-bold text-gray-700 mb-2">Bạn muốn viết về chủ đề gì hôm nay?</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        placeholder="VD: Lẩu cá tầm, Trời mưa Sapa, Khuyến mãi 2/9, Món mới..."
                        className="flex-1 border-2 border-purple-100 rounded-xl px-4 py-3 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-800 font-medium"
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !topic.trim()}
                        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 disabled:opacity-70 disabled:shadow-none transition-all flex items-center gap-2 shrink-0"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20}/> : <PenTool size={20}/>}
                        {isLoading ? 'Đang viết...' : 'Sáng tạo'}
                    </button>
                </div>
                
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2 no-scrollbar">
                    {['Lẩu Cá Tầm', 'Thắng Cố', 'Rượu Táo Mèo', 'Sapa Mù Sương', 'Check-in'].map(t => (
                        <button key={t} onClick={() => setTopic(t)} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors whitespace-nowrap">
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Section */}
            {results && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-500">
                    
                    {/* 1. Storyline Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                        <div className="bg-teal-50 p-4 border-b border-teal-100 flex items-center gap-2">
                            <Feather className="text-teal-600" size={20}/>
                            <h3 className="font-bold text-teal-800">Câu chuyện cảm xúc</h3>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-1 italic">
                            "{results.story}"
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => handleCopy(results.story)} className="text-gray-500 hover:text-teal-600 text-xs font-bold flex items-center gap-1"><Copy size={14}/> Sao chép</button>
                            <span className="text-[10px] text-gray-400">Storytelling</span>
                        </div>
                    </div>

                    {/* 2. Trendy Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow transform md:-translate-y-2 relative">
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">HOT</div>
                        <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center gap-2">
                            <Zap className="text-orange-600" size={20}/>
                            <h3 className="font-bold text-orange-800">Bắt Trend Gen Z</h3>
                        </div>
                        <div className="p-5 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap flex-1 font-medium">
                            {results.trend}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => handleCopy(results.trend)} className="text-gray-500 hover:text-orange-600 text-xs font-bold flex items-center gap-1"><Copy size={14}/> Sao chép</button>
                            <span className="text-[10px] text-gray-400">Social Trend</span>
                        </div>
                    </div>

                    {/* 3. Professional Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                        <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-2">
                            <Briefcase className="text-blue-600" size={20}/>
                            <h3 className="font-bold text-blue-800">Chuyên nghiệp</h3>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                            {results.professional}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => handleCopy(results.professional)} className="text-gray-500 hover:text-blue-600 text-xs font-bold flex items-center gap-1"><Copy size={14}/> Sao chép</button>
                            <span className="text-[10px] text-gray-400">Formal</span>
                        </div>
                    </div>

                    {/* 4. Food Review Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                        <div className="bg-pink-50 p-4 border-b border-pink-100 flex items-center gap-2">
                            <Camera className="text-pink-600" size={20}/>
                            <h3 className="font-bold text-pink-800">Góc Food Blogger</h3>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                            {results.review}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => handleCopy(results.review)} className="text-gray-500 hover:text-pink-600 text-xs font-bold flex items-center gap-1"><Copy size={14}/> Sao chép</button>
                            <span className="text-[10px] text-gray-400">Review</span>
                        </div>
                    </div>

                    {/* 5. Fun/Thả thính Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                        <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex items-center gap-2">
                            <Smile className="text-yellow-600" size={20}/>
                            <h3 className="font-bold text-yellow-800">Thả thính / Vui vẻ</h3>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-1 italic">
                            {results.fun}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => handleCopy(results.fun)} className="text-gray-500 hover:text-yellow-600 text-xs font-bold flex items-center gap-1"><Copy size={14}/> Sao chép</button>
                            <span className="text-[10px] text-gray-400">Fun & Pun</span>
                        </div>
                    </div>

                    {/* 6. Chef's Voice Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                        <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center gap-2">
                            <ChefHat className="text-gray-700" size={20}/>
                            <h3 className="font-bold text-gray-800">Tâm sự Bếp Trưởng</h3>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                            {results.chef}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <button onClick={() => handleCopy(results.chef)} className="text-gray-500 hover:text-black text-xs font-bold flex items-center gap-1"><Copy size={14}/> Sao chép</button>
                            <span className="text-[10px] text-gray-400">Behind the scenes</span>
                        </div>
                    </div>

                </div>
            )}

            {results && (
                <div className="flex justify-center pt-8">
                    <button onClick={handleOpenFacebook} className="bg-[#1877F2] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-transform hover:scale-105">
                        <Facebook size={20}/> Mở Facebook đăng bài ngay
                    </button>
                </div>
            )}
        </div>
    );
};
