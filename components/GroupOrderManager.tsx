
import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, Plus, Camera, X, CheckCircle2, Circle, Clock, Users, MapPin, Sparkles, Loader2, Save, Trash2, ArrowRight, Edit2 } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { GroupOrder, GroupOrderItem } from '../types';
import { parseMenuImage } from '../services/geminiService';

export const GroupOrderManager: React.FC = () => {
    const { groupOrders, upsertGroupOrder, toggleGroupOrderItem, completeGroupOrder } = useGlobalContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Import Logic
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Multi-Import State: Stores multiple pending orders found in one image
    const [pendingImports, setPendingImports] = useState<GroupOrder[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null); // Index of the order currently being fine-tuned

    const fileInputRef = useRef<HTMLInputElement>(null);

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
            const results = await parseMenuImage(base64);
            if (results && results.length > 0) {
                // Map API results to GroupOrder structure
                const mappedOrders: GroupOrder[] = results.map((grp: any) => ({
                    id: Date.now().toString() + Math.random().toString().substr(2, 5), // Temp ID
                    groupName: grp.groupName || 'Đoàn mới',
                    location: grp.location || '',
                    guestCount: grp.guestCount || 0,
                    status: 'SERVING',
                    createdAt: new Date().toISOString(),
                    items: (grp.items || []).map((i: any) => ({
                        name: i.name,
                        quantity: i.quantity,
                        unit: i.unit,
                        note: i.note,
                        isServed: false
                    }))
                }));
                setPendingImports(mappedOrders);
            } else {
                // Fallback if AI fails to parse
                setPendingImports([{
                    id: Date.now().toString(),
                    groupName: '',
                    location: '',
                    guestCount: 0,
                    items: [],
                    status: 'SERVING',
                    createdAt: new Date().toISOString()
                }]);
                setEditingIndex(0); // Auto open for edit
                alert("Không nhận diện được thực đơn. Vui lòng nhập tay.");
            }
        } catch (error) {
            console.error("AI Error:", error);
            alert("Lỗi phân tích ảnh.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveAll = () => {
        // Validation check
        const invalidOrder = pendingImports.find(o => !o.groupName);
        if (invalidOrder) {
            alert("Có đoàn chưa nhập tên. Vui lòng kiểm tra lại.");
            return;
        }

        // Save individually
        pendingImports.forEach(order => {
            // Assign a fresh ID to ensure uniqueness in DB if needed, or use the Temp ID
            // For safety, we keep the temp ID generated during parsing
            upsertGroupOrder(order);
        });

        resetModal();
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setImagePreview(null);
        setPendingImports([]);
        setEditingIndex(null);
    };

    // --- CRUD for Pending Imports ---

    const updatePendingOrder = (index: number, field: keyof GroupOrder, value: any) => {
        const newImports = [...pendingImports];
        newImports[index] = { ...newImports[index], [field]: value };
        setPendingImports(newImports);
    };

    const removePendingOrder = (index: number) => {
        const newImports = pendingImports.filter((_, i) => i !== index);
        setPendingImports(newImports);
        if (editingIndex === index) setEditingIndex(null);
    };

    const addManualOrder = () => {
        setPendingImports([...pendingImports, {
            id: Date.now().toString(),
            groupName: 'Đoàn mới',
            location: '',
            guestCount: 0,
            items: [],
            status: 'SERVING',
            createdAt: new Date().toISOString()
        }]);
        setEditingIndex(pendingImports.length); // Open the new one
    };

    // --- CRUD for Items inside a Pending Order ---

    const addItemToOrder = (orderIndex: number) => {
        const order = pendingImports[orderIndex];
        const newItems = [...order.items, { name: '', quantity: 1, unit: 'Phần', isServed: false }];
        updatePendingOrder(orderIndex, 'items', newItems);
    };

    const updateItemInOrder = (orderIndex: number, itemIndex: number, field: keyof GroupOrderItem, value: any) => {
        const order = pendingImports[orderIndex];
        const newItems = [...order.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        updatePendingOrder(orderIndex, 'items', newItems);
    };

    const removeItemInOrder = (orderIndex: number, itemIndex: number) => {
        const order = pendingImports[orderIndex];
        const newItems = order.items.filter((_, i) => i !== itemIndex);
        updatePendingOrder(orderIndex, 'items', newItems);
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="text-indigo-600" /> Quản Lý Thực Đơn Đoàn
                    </h2>
                    <p className="text-gray-500">Theo dõi tiến độ ra đồ cho khách đoàn.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} /> Thêm Đoàn Mới (AI Import)
                </button>
            </div>

            {/* ORDERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groupOrders.length === 0 && (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <ClipboardList size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">Hiện không có đoàn nào đang phục vụ.</p>
                    </div>
                )}

                {groupOrders.map(order => {
                    const totalItems = order.items.length;
                    const servedItems = order.items.filter(i => i.isServed).length;
                    const progress = totalItems > 0 ? (servedItems / totalItems) * 100 : 0;
                    const isDone = servedItems === totalItems && totalItems > 0;

                    return (
                        <div key={order.id} className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all ${isDone ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-200'}`}>
                            {/* Header */}
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{order.groupName}</h3>
                                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><MapPin size={12}/> {order.location || 'Chưa xếp bàn'}</span>
                                        <span className="flex items-center gap-1"><Users size={12}/> {order.guestCount} khách</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-black ${isDone ? 'text-green-600' : 'text-indigo-600'}`}>
                                        {servedItems}/{totalItems}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Món đã ra</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-gray-100">
                                <div 
                                    className={`h-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>

                            {/* Items List */}
                            <div className="p-2 flex-1 overflow-y-auto max-h-[300px]">
                                {order.items.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => toggleGroupOrderItem(order.id, idx)}
                                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border mb-2 last:mb-0 ${item.isServed ? 'bg-green-50 border-green-100' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                                    >
                                        <div className={`mt-0.5 shrink-0 transition-all ${item.isServed ? 'text-green-600 scale-110' : 'text-gray-300'}`}>
                                            {item.isServed ? <CheckCircle2 size={24} className="fill-green-100"/> : <Circle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className={`font-bold text-sm ${item.isServed ? 'text-green-900 line-through opacity-60' : 'text-gray-800'}`}>
                                                {item.name}
                                            </div>
                                            {item.note && <div className="text-xs text-red-500 italic mt-0.5">{item.note}</div>}
                                        </div>
                                        <div className="font-bold text-sm text-gray-600 whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                                            {item.quantity} {item.unit}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Action */}
                            <div className="p-3 border-t bg-gray-50 flex justify-end">
                                {isDone ? (
                                    <button 
                                        onClick={() => { if(window.confirm("Kết thúc phục vụ đoàn này?")) completeGroupOrder(order.id); }}
                                        className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={16}/> Hoàn tất phục vụ
                                    </button>
                                ) : (
                                    <div className="w-full text-center text-xs text-gray-400 font-medium py-2 flex items-center justify-center gap-1">
                                        <Clock size={12}/> Bắt đầu: {new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* IMPORT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                <Sparkles className="text-indigo-600"/> Thêm Đoàn Mới (AI Scan)
                            </h3>
                            <button onClick={resetModal} className="p-2 hover:bg-gray-200 rounded-full"><X/></button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Image Upload & Preview */}
                            <div className="w-full md:w-1/3 bg-gray-900 p-4 flex flex-col items-center justify-center relative border-r border-gray-200 shrink-0">
                                {imagePreview ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src={imagePreview} className="max-w-full max-h-full object-contain rounded-lg shadow-lg"/>
                                        {isAnalyzing && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-lg">
                                                <Loader2 size={40} className="animate-spin mb-2 text-indigo-400"/>
                                                <p className="font-bold animate-pulse text-center">AI đang đọc thực đơn...<br/><span className="text-xs text-gray-300 font-normal">Tìm kiếm nhiều đoàn trong ảnh</span></p>
                                            </div>
                                        )}
                                        {!isAnalyzing && (
                                            <button 
                                                onClick={() => { setImagePreview(null); setPendingImports([]); }}
                                                className="absolute bottom-4 bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-gray-100 text-xs"
                                            >
                                                Chọn ảnh khác
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-full border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500 hover:bg-gray-800 transition-all cursor-pointer p-6 text-center"
                                    >
                                        <Camera size={48} className="mb-4"/>
                                        <p className="font-bold text-lg">Chụp/Tải ảnh Menu</p>
                                        <p className="text-sm mt-2 opacity-70">Hỗ trợ nhận diện nhiều đoàn cùng lúc</p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange}/>
                            </div>

                            {/* Right: Detected Orders List & Editor */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                                {pendingImports.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                        <div className="bg-white p-4 rounded-full mb-4 shadow-sm"><ClipboardList size={32} /></div>
                                        <p>Chưa có dữ liệu.</p>
                                        <button onClick={addManualOrder} className="mt-4 text-indigo-600 font-bold hover:underline">
                                            + Thêm thủ công
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* List of Detected Groups */}
                                        <div className="p-4 border-b bg-white shadow-sm flex items-center justify-between shrink-0">
                                            <span className="font-bold text-gray-700">Đã tìm thấy {pendingImports.length} đoàn:</span>
                                            <button onClick={addManualOrder} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-bold border border-indigo-200">+ Thêm đoàn</button>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {pendingImports.map((order, idx) => (
                                                <div key={idx} className={`bg-white rounded-xl border transition-all ${editingIndex === idx ? 'border-indigo-500 shadow-md ring-1 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}>
                                                    
                                                    {/* Card Header (Click to Expand/Edit) */}
                                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${editingIndex === idx ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{idx + 1}</div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900">{order.groupName || 'Chưa đặt tên'}</h4>
                                                                <p className="text-xs text-gray-500">{order.items.length} món • {order.location || 'Chưa xếp bàn'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); removePendingOrder(idx); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                                            <ArrowRight size={16} className={`text-gray-400 transition-transform ${editingIndex === idx ? 'rotate-90' : ''}`}/>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Editor */}
                                                    {editingIndex === idx && (
                                                        <div className="p-4 border-t bg-gray-50/50 animate-in slide-in-from-top-2">
                                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 block mb-1">Tên đoàn</label>
                                                                    <input type="text" value={order.groupName} onChange={(e) => updatePendingOrder(idx, 'groupName', e.target.value)} className="w-full border rounded p-2 text-sm font-bold"/>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 block mb-1">Vị trí</label>
                                                                    <input type="text" value={order.location} onChange={(e) => updatePendingOrder(idx, 'location', e.target.value)} className="w-full border rounded p-2 text-sm"/>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 block mb-1">Số khách</label>
                                                                    <input type="number" value={order.guestCount} onChange={(e) => updatePendingOrder(idx, 'guestCount', Number(e.target.value))} className="w-full border rounded p-2 text-sm"/>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {order.items.map((item, itemIdx) => (
                                                                    <div key={itemIdx} className="flex gap-2 items-start bg-white p-2 rounded border border-gray-200">
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.name} 
                                                                            onChange={(e) => updateItemInOrder(idx, itemIdx, 'name', e.target.value)}
                                                                            className="flex-1 text-sm font-bold outline-none placeholder-gray-300"
                                                                            placeholder="Tên món"
                                                                        />
                                                                        <input 
                                                                            type="number" 
                                                                            value={item.quantity} 
                                                                            onChange={(e) => updateItemInOrder(idx, itemIdx, 'quantity', Number(e.target.value))}
                                                                            className="w-12 text-center text-sm border-b border-gray-200 outline-none"
                                                                        />
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.unit} 
                                                                            onChange={(e) => updateItemInOrder(idx, itemIdx, 'unit', e.target.value)}
                                                                            className="w-16 text-center text-sm text-gray-500 border-b border-gray-200 outline-none"
                                                                        />
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.note || ''} 
                                                                            onChange={(e) => updateItemInOrder(idx, itemIdx, 'note', e.target.value)}
                                                                            className="flex-1 text-xs text-red-500 outline-none placeholder-red-100"
                                                                            placeholder="Ghi chú..."
                                                                        />
                                                                        <button onClick={() => removeItemInOrder(idx, itemIdx)} className="text-gray-300 hover:text-red-500"><X size={14}/></button>
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => addItemToOrder(idx)} className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-dashed border-indigo-300">+ Thêm món</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={resetModal} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                            <button 
                                onClick={handleSaveAll}
                                disabled={pendingImports.length === 0}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                            >
                                <Save size={20}/> Lưu tất cả ({pendingImports.length} đoàn)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
