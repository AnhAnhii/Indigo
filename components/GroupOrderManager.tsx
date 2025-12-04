
import React, { useState, useRef, useMemo } from 'react';
import { ClipboardList, Plus, Camera, X, CheckCircle2, Clock, Users, MapPin, Loader2, Edit2, Search, History, LayoutList, Zap, RefreshCw, ChevronDown, ChevronUp, Trash2, Save } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { GroupOrder, GroupOrderItem } from '../types';
import { parseMenuImage } from '../services/geminiService';
import { calculateAutoNotes } from '../utils/menuSplitLogic';

export const GroupOrderManager: React.FC = () => {
    const { groupOrders, upsertGroupOrder, toggleGroupOrderItem, completeGroupOrder, settings } = useGlobalContext();
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    // Import Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [pendingImports, setPendingImports] = useState<GroupOrder[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Edit Table Allocation Modal (Post-creation)
    const [isEditAllocOpen, setIsEditAllocOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [editAllocValue, setEditAllocValue] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper for UUID
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString() + Math.random().toString(36).substring(2);
    };

    // Filter Logic
    const activeOrders = useMemo(() => {
        return (groupOrders as GroupOrder[])
            .filter(o => o.status !== 'COMPLETED')
            .filter(o => 
                o.groupName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                o.location.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [groupOrders, searchTerm]);

    const historyGroups = useMemo(() => {
        const history = (groupOrders as GroupOrder[]).filter(o => o.status === 'COMPLETED')
            .filter(o => o.groupName.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const groups: Record<string, GroupOrder[]> = {};
        
        history.forEach(order => {
            const date = new Date(order.createdAt);
            const today = new Date();
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            
            let key = date.toLocaleDateString('vi-VN');
            if (date.toDateString() === today.toDateString()) key = 'Hôm nay';
            else if (date.toDateString() === yesterday.toDateString()) key = 'Hôm qua';
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(order);
        });
        return groups;
    }, [groupOrders, searchTerm]);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    // --- INSTANT LOGIC (NO AI) ---
    const handleInstantRefreshNotes = (index: number) => {
        const order = pendingImports[index];
        if (!order.tableAllocation) { alert("Vui lòng nhập cấu trúc bàn (VD: 2x6)"); return; }
        
        const updatedItems = calculateAutoNotes(order.items, order.tableAllocation);
        const newImports = [...pendingImports];
        newImports[index] = { ...newImports[index], items: updatedItems };
        setPendingImports(newImports);
    };

    const handleInstantUpdateAlloc = () => {
        const order = groupOrders.find(o => o.id === selectedOrderId);
        if (!order) return;
        
        // Client-side Logic
        const updatedItems = calculateAutoNotes(order.items, editAllocValue);
        const updatedOrder = { ...order, tableAllocation: editAllocValue, items: updatedItems };
        upsertGroupOrder(updatedOrder);
        setIsEditAllocOpen(false);
    };

    // --- IMPORT LOGIC ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                setImagePreview(base64);
                processImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const processImage = async (base64: string) => {
        setIsAnalyzing(true);
        try {
            // Pass custom prompt from settings if available
            const customPrompt = settings.aiConfig?.groupMenuPrompt;
            const results = await parseMenuImage(base64, customPrompt);
            
            const mappedOrders: GroupOrder[] = (results && results.length > 0) ? results.map((grp: any) => {
                // Apply Smart Quantity Logic IMMEDIATELY upon import
                const rawItems = (grp.items || []).map((i: any) => ({
                    name: i.name,
                    quantity: i.quantity,
                    unit: i.unit,
                    note: i.note,
                    isServed: false
                }));
                
                const smartItems = grp.tableAllocation ? calculateAutoNotes(rawItems, grp.tableAllocation) : rawItems;

                return {
                    id: generateUUID(),
                    groupName: grp.groupName || 'Đoàn mới',
                    location: grp.location || '',
                    guestCount: grp.guestCount || 0,
                    tableAllocation: grp.tableAllocation || '',
                    status: 'SERVING',
                    createdAt: new Date().toISOString(),
                    items: smartItems
                };
            }) : [{
                id: generateUUID(),
                groupName: '',
                location: '',
                guestCount: 0,
                tableAllocation: '',
                items: [],
                status: 'SERVING',
                createdAt: new Date().toISOString()
            }];
            setPendingImports(mappedOrders);
            setEditingIndex(0);
        } catch (error) {
            alert("Lỗi phân tích ảnh.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveAll = () => {
        if (pendingImports.some(o => !o.groupName)) { alert("Vui lòng nhập tên đoàn."); return; }
        pendingImports.forEach(order => upsertGroupOrder(order));
        setIsModalOpen(false);
        setImagePreview(null);
        setPendingImports([]);
    };

    const updatePendingOrder = (index: number, field: keyof GroupOrder, value: any) => {
        const newImports = [...pendingImports];
        newImports[index] = { ...newImports[index], [field]: value };
        setPendingImports(newImports);
    };

    const updateItemInOrder = (orderIndex: number, itemIndex: number, field: keyof GroupOrderItem, value: any) => {
        const order = pendingImports[orderIndex];
        const newItems = [...order.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        updatePendingOrder(orderIndex, 'items', newItems);
    };

    const confirmComplete = (orderId: string) => {
        if (window.confirm("Xác nhận hoàn thành đoàn này?")) {
            // Optimistic UI update handled in context
            // Small delay to show ripple effect
            setTimeout(() => completeGroupOrder(orderId), 100);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-24">
            
            {/* --- HEADER & TABS --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 sticky top-0 z-20">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="text-teal-600"/> Thực Đơn Đoàn
                    </h2>
                    <button 
                        onClick={() => {
                            setPendingImports([{ id: generateUUID(), groupName: 'Đoàn mới', location: '', guestCount: 0, tableAllocation: '', items: [], status: 'SERVING', createdAt: new Date().toISOString() }]);
                            setEditingIndex(0);
                            setIsModalOpen(true);
                        }}
                        className="bg-gray-900 text-white p-2.5 rounded-full shadow-lg hover:bg-black active:scale-90 transition-transform"
                    >
                        <Plus size={20}/>
                    </button>
                </div>

                <div className="bg-gray-100 p-1 rounded-xl flex mb-3">
                    <button 
                        onClick={() => setActiveTab('ACTIVE')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ACTIVE' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
                    >
                        <LayoutList size={16}/> Đang phục vụ ({activeOrders.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
                    >
                        <History size={16}/> Lịch sử
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Tìm tên đoàn, bàn..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-teal-500"
                    />
                </div>
            </div>

            {/* --- ACTIVE TAB --- */}
            {activeTab === 'ACTIVE' && (
                <div className="space-y-3">
                    {activeOrders.length === 0 && (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                            <ClipboardList size={40} className="mx-auto mb-2 opacity-30"/>
                            <p>Không có đoàn nào đang phục vụ.</p>
                        </div>
                    )}
                    {activeOrders.map(order => {
                        const total = order.items.length;
                        const served = order.items.filter(i => i.isServed).length;
                        const percent = total > 0 ? (served / total) * 100 : 0;
                        const isExpanded = expandedIds.has(order.id);

                        return (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                                {/* Header (Clickable) */}
                                <div 
                                    onClick={() => toggleExpand(order.id)}
                                    className="p-4 cursor-pointer active:bg-gray-50"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{order.groupName}</h3>
                                            <div className="text-xs font-mono text-gray-400 mt-0.5 flex items-center">
                                                <Clock size={10} className="mr-1"/> {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                        <div className="bg-gray-100 p-1.5 rounded-full text-gray-500">
                                            {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded text-xs font-bold border border-teal-100 flex items-center">
                                            <MapPin size={10} className="mr-1"/> {order.location || 'N/A'}
                                        </span>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200 flex items-center">
                                            <Users size={10} className="mr-1"/> {order.guestCount}
                                        </span>
                                        {order.tableAllocation && (
                                            <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold border border-indigo-100 truncate max-w-[200px]">
                                                {order.tableAllocation}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-teal-500'}`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Tiến độ</span>
                                        <span className={`text-[10px] font-bold ${percent === 100 ? 'text-green-600' : 'text-teal-600'}`}>{served}/{total} món</span>
                                    </div>
                                </div>

                                {/* Body (Expanded) */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="p-3">
                                            {/* Item List - Compact Mode */}
                                            <div className="space-y-1.5">
                                                {order.items.map((item, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => toggleGroupOrderItem(order.id, idx)}
                                                        className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer select-none ${item.isServed ? 'bg-gray-100 border-transparent opacity-60' : 'bg-white border-gray-200 hover:border-teal-300 shadow-sm'}`}
                                                    >
                                                        <div className={`mt-0.5 w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${item.isServed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                                            {item.isServed && <CheckCircle2 size={16}/>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`font-bold text-sm truncate ${item.isServed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.name}</span>
                                                                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-black shrink-0 ml-2">{item.quantity} {item.unit}</span>
                                                            </div>
                                                            {item.note && (
                                                                <div className={`text-xs mt-0.5 font-medium truncate ${item.isServed ? 'text-gray-400' : 'text-orange-600'}`}>
                                                                    {item.note}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                                                <button 
                                                    onClick={() => { setSelectedOrderId(order.id); setEditAllocValue(order.tableAllocation || ''); setIsEditAllocOpen(true); }}
                                                    className="flex-1 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                                                >
                                                    <Edit2 size={14}/> Sửa chia bàn
                                                </button>
                                                <button 
                                                    onClick={() => confirmComplete(order.id)}
                                                    className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                                                >
                                                    <CheckCircle2 size={14}/> Hoàn tất
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- HISTORY TAB --- */}
            {activeTab === 'HISTORY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    {Object.keys(historyGroups).length === 0 && (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                            <History size={40} className="mx-auto mb-2 opacity-30"/>
                            <p>Chưa có lịch sử phục vụ.</p>
                        </div>
                    )}
                    {Object.entries(historyGroups).map(([dateLabel, orders]) => (
                        <div key={dateLabel}>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2 bg-gray-200 px-2 py-1 rounded w-fit">{dateLabel}</h3>
                            <div className="space-y-2">
                                {(orders as GroupOrder[]).map(order => (
                                    <div key={order.id} className="bg-white p-3 rounded-xl border border-gray-200 opacity-80 hover:opacity-100 transition-opacity flex justify-between items-center group">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm group-hover:text-teal-700">{order.groupName}</h4>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {order.items.length} món • {order.guestCount} khách • {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded font-bold uppercase tracking-wider border border-green-100">Done</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL IMPORT --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                                <Camera className="text-teal-600"/> Nhập Liệu Tự Động (AI)
                            </h3>
                            <button onClick={() => { setIsModalOpen(false); setPendingImports([]); setImagePreview(null); }} className="p-2 bg-white rounded-full text-gray-500 hover:text-red-500 shadow-sm"><X size={20}/></button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Image Upload Area */}
                            <div className="w-full md:w-1/3 bg-gray-100 p-4 flex flex-col border-r border-gray-200 shrink-0">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex-1 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${imagePreview ? 'bg-black' : 'hover:border-teal-500 hover:bg-teal-50'}`}
                                >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} className="w-full h-full object-contain opacity-80" />
                                            {isAnalyzing && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-sm">
                                                    <Loader2 size={40} className="animate-spin mb-3 text-teal-400"/>
                                                    <p className="font-bold tracking-widest uppercase text-sm">AI Đang Đọc...</p>
                                                </div>
                                            )}
                                            {!isAnalyzing && <div className="absolute bottom-4 bg-white/20 backdrop-blur text-white px-4 py-1 rounded-full text-xs font-bold border border-white/30">Bấm để thay đổi</div>}
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform"><Camera size={32} className="text-teal-600"/></div>
                                            <p className="font-bold text-gray-600">Chụp ảnh Order / Bill</p>
                                            <p className="text-xs text-gray-400 mt-1">Hỗ trợ ảnh viết tay & in</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>

                            {/* Right: Results Editor */}
                            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                {pendingImports.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                        <p>Chưa có dữ liệu. Vui lòng tải ảnh lên hoặc nhập tay.</p>
                                        <button onClick={() => {
                                            setPendingImports([{ id: generateUUID(), groupName: 'Đoàn mới', location: '', guestCount: 0, tableAllocation: '', items: [], status: 'SERVING', createdAt: new Date().toISOString() }]);
                                            setEditingIndex(0);
                                        }} className="mt-4 text-teal-600 font-bold hover:underline">Tạo thủ công</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-2 bg-teal-50 border-b border-teal-100 flex gap-2 overflow-x-auto no-scrollbar">
                                            {pendingImports.map((grp, idx) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => setEditingIndex(idx)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${editingIndex === idx ? 'bg-white border-teal-500 text-teal-700 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-teal-100'}`}
                                                >
                                                    {grp.groupName || `Đoàn ${idx+1}`}
                                                </button>
                                            ))}
                                            <button onClick={() => {
                                                const newIdx = pendingImports.length;
                                                setPendingImports([...pendingImports, { id: generateUUID(), groupName: 'Đoàn mới', location: '', guestCount: 0, tableAllocation: '', items: [], status: 'SERVING', createdAt: new Date().toISOString() }]);
                                                setEditingIndex(newIdx);
                                            }} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600"><Plus size={16}/></button>
                                        </div>

                                        {editingIndex !== null && pendingImports[editingIndex] && (
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                {/* Group Info Form */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                    <div className="col-span-2 md:col-span-2">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tên đoàn</label>
                                                        <input type="text" value={pendingImports[editingIndex].groupName} onChange={(e) => updatePendingOrder(editingIndex, 'groupName', e.target.value)} className="w-full border-b-2 border-gray-300 focus:border-teal-500 outline-none bg-transparent font-bold text-gray-800 py-1" placeholder="Nhập tên..."/>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Khu vực / Bàn</label>
                                                        <input type="text" value={pendingImports[editingIndex].location} onChange={(e) => updatePendingOrder(editingIndex, 'location', e.target.value)} className="w-full border-b-2 border-gray-300 focus:border-teal-500 outline-none bg-transparent font-medium py-1"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Số khách</label>
                                                        <input type="number" value={pendingImports[editingIndex].guestCount} onChange={(e) => updatePendingOrder(editingIndex, 'guestCount', Number(e.target.value))} className="w-full border-b-2 border-gray-300 focus:border-teal-500 outline-none bg-transparent font-medium py-1"/>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-4 flex items-end gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Phân chia bàn (VD: 2x10, 1x6)</label>
                                                            <input 
                                                                type="text" 
                                                                value={pendingImports[editingIndex].tableAllocation || ''} 
                                                                onChange={(e) => updatePendingOrder(editingIndex, 'tableAllocation', e.target.value)} 
                                                                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                                                placeholder="2 bàn 10..."
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleInstantRefreshNotes(editingIndex)}
                                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-700 shadow-sm flex items-center gap-1 h-[38px] transition-colors active:scale-95"
                                                        >
                                                            <Zap size={14} className="fill-yellow-300 text-yellow-300"/> Tính Lại
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Items List */}
                                                <div className="space-y-2">
                                                    {pendingImports[editingIndex].items.map((item, iIdx) => (
                                                        <div key={iIdx} className="flex gap-2 items-start group">
                                                            <input type="text" value={item.name} onChange={(e) => updateItemInOrder(editingIndex, iIdx, 'name', e.target.value)} className="flex-1 border-b border-gray-200 focus:border-teal-500 outline-none py-2 text-sm font-medium bg-transparent" placeholder="Tên món"/>
                                                            <input type="text" value={item.note || ''} onChange={(e) => updateItemInOrder(editingIndex, iIdx, 'note', e.target.value)} className="flex-1 border-b border-gray-200 focus:border-teal-500 outline-none py-2 text-xs text-orange-600 italic bg-transparent" placeholder="Ghi chú..."/>
                                                            <input type="number" value={item.quantity} onChange={(e) => updateItemInOrder(editingIndex, iIdx, 'quantity', Number(e.target.value))} className="w-12 border border-gray-200 rounded py-1.5 text-center text-sm font-bold"/>
                                                            <input type="text" value={item.unit} onChange={(e) => updateItemInOrder(editingIndex, iIdx, 'unit', e.target.value)} className="w-16 border border-gray-200 rounded py-1.5 text-center text-xs"/>
                                                            <button onClick={() => {
                                                                const newItems = pendingImports[editingIndex].items.filter((_, idx) => idx !== iIdx);
                                                                updatePendingOrder(editingIndex, 'items', newItems);
                                                            }} className="p-2 text-gray-300 hover:text-red-500"><X size={16}/></button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => {
                                                        const newItems = [...pendingImports[editingIndex].items, { name: '', quantity: 1, unit: 'Phần', isServed: false }];
                                                        updatePendingOrder(editingIndex, 'items', newItems);
                                                    }} className="mt-2 text-teal-600 text-sm font-bold hover:underline">+ Thêm món</button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200">Hủy bỏ</button>
                            <button onClick={handleSaveAll} disabled={pendingImports.length === 0} className="bg-teal-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                                <Save size={18}/> Lưu & Phục vụ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL EDIT ALLOCATION --- */}
            {isEditAllocOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-4 text-gray-900">Điều chỉnh cấu trúc bàn</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Cấu trúc mới</label>
                                <input 
                                    type="text" 
                                    value={editAllocValue}
                                    onChange={(e) => setEditAllocValue(e.target.value)}
                                    placeholder="VD: 3 bàn 6 người..."
                                    className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                                <p className="text-xs text-gray-500 mt-2">Hệ thống sẽ tự động tính toán lại số đĩa/tô cho các món ăn.</p>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsEditAllocOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-100">Hủy</button>
                                <button 
                                    onClick={handleInstantUpdateAlloc}
                                    disabled={!editAllocValue.trim()}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <RefreshCw size={16}/> Cập nhật ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
