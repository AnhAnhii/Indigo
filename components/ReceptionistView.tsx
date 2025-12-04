
import React, { useState, useMemo } from 'react';
import { BellRing, Search, Users, MapPin, Clock, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { AppView } from '../types';

export const ReceptionistView: React.FC = () => {
    const { groupOrders, notifyGuestArrival } = useGlobalContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    // Filter logic: Show PENDING or SERVING.
    // Sort: PENDING first (prioritize new guests), then by creation time.
    const displayedOrders = useMemo(() => {
        return groupOrders
            .filter(o => o.status !== 'COMPLETED')
            .filter(o => 
                o.groupName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                o.location.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                // Notified ones go to bottom
                const aNotified = !!a.guestArrivalNotifiedAt;
                const bNotified = !!b.guestArrivalNotifiedAt;
                if (aNotified !== bNotified) return aNotified ? 1 : -1;
                // Then newest created first
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [groupOrders, searchTerm]);

    const handleNotify = async (orderId: string) => {
        setLoadingIds(prev => new Set(prev).add(orderId));
        await notifyGuestArrival(orderId);
        setLoadingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(orderId);
            return newSet;
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BellRing className="text-teal-600" /> Báo Khách Đến
                    </h2>
                    <p className="text-gray-500 text-sm">Thông báo cho Bếp & Phục vụ khi đoàn khách có mặt.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm tên đoàn, bàn..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedOrders.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Users size={48} className="mx-auto mb-3 opacity-30"/>
                        <p>Không có đoàn khách nào đang chờ.</p>
                    </div>
                )}

                {displayedOrders.map(order => {
                    const isNotified = !!order.guestArrivalNotifiedAt;
                    const isLoading = loadingIds.has(order.id);
                    const notifiedTime = order.guestArrivalNotifiedAt 
                        ? new Date(order.guestArrivalNotifiedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) 
                        : null;

                    return (
                        <div key={order.id} className={`bg-white p-5 rounded-xl border shadow-sm transition-all relative overflow-hidden ${isNotified ? 'border-gray-200 bg-gray-50' : 'border-teal-100 hover:shadow-md'}`}>
                            {isNotified && (
                                <div className="absolute top-0 right-0 bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                    Đã báo {notifiedTime}
                                </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`font-bold text-lg ${isNotified ? 'text-gray-600' : 'text-gray-900'}`}>{order.groupName}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><Users size={14}/> {order.guestCount} khách</span>
                                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium"><MapPin size={12}/> {order.location}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <div className="text-xs text-gray-400 flex items-center">
                                    <Clock size={12} className="mr-1"/> Tạo lúc {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                                </div>
                                
                                <button 
                                    onClick={() => handleNotify(order.id)}
                                    disabled={isNotified || isLoading}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${
                                        isNotified 
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                        : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95 shadow-teal-200'
                                    }`}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : isNotified ? <CheckCircle2 size={16}/> : <BellRing size={16}/>}
                                    {isNotified ? 'Đã báo khách' : 'Báo Khách Đến'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
