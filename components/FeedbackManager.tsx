
import React, { useMemo } from 'react';
import { Star, TrendingUp, Trophy, Search, User } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';

export const FeedbackManager: React.FC = () => {
    const { feedbacks, employees } = useGlobalContext();

    // REVIEW CLICK ANALYTICS
    const reviewStats = useMemo(() => {
        const reviewClicks = feedbacks.filter(f => f.type === 'GOOGLE_REVIEW_CLICK');
        const total = reviewClicks.length;

        // Group by Staff
        const staffStats: Record<string, number> = {};
        reviewClicks.forEach(r => {
            if (r.staffId) {
                staffStats[r.staffId] = (staffStats[r.staffId] || 0) + 1;
            }
        });

        // Convert to array and sort
        const leaderboard = Object.entries(staffStats)
            .map(([staffId, count]) => {
                const emp = employees.find(e => e.id === staffId);
                return {
                    staffId,
                    name: emp?.name || 'Unknown Staff',
                    avatar: emp?.avatar,
                    role: emp?.role,
                    count
                };
            })
            .sort((a, b) => b.count - a.count);

        return { total, leaderboard };
    }, [feedbacks, employees]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quản lý Đánh giá (Google Review)</h2>
                    <p className="text-gray-500">Theo dõi hiệu suất xin đánh giá của nhân viên.</p>
                </div>
            </div>

            {/* Overall Stats */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <p className="text-indigo-100 font-medium mb-1">Tổng lượt khách quét QR Review</p>
                        <h3 className="text-4xl font-extrabold">{reviewStats.total}</h3>
                        <p className="text-xs text-indigo-200 mt-2 flex items-center">
                            <TrendingUp size={14} className="mr-1"/> Dữ liệu Real-time
                        </p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <Star size={32} className="fill-yellow-400 text-yellow-400" />
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={20}/> Bảng Xếp Hạng Nhân Viên
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                        <input type="text" placeholder="Tìm nhân viên..." className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500 w-48"/>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {reviewStats.leaderboard.length === 0 && (
                        <div className="p-8 text-center text-gray-400 italic">Chưa có dữ liệu nào.</div>
                    )}
                    {reviewStats.leaderboard.map((item, idx) => (
                        <div key={item.staffId} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                            <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-400'}`}>
                                {idx + 1}
                            </div>
                            
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                                {item.avatar ? (
                                    <img src={item.avatar} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-gray-400 text-lg">{item.name.charAt(0)}</span>
                                )}
                            </div>

                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{item.name}</h4>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <User size={12}/> {item.role}
                                </p>
                            </div>

                            <div className="text-right">
                                <div className="text-xl font-bold text-indigo-600">{item.count}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold">Lượt Click</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
