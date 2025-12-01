
import React, { useState, useRef, useMemo } from 'react';
import { Users, MapPin, PlusCircle, Search, LayoutGrid, ConciergeBell, Clock, Calendar, CheckCircle2, MoreHorizontal, Edit2, Trash2, X, Camera, Loader2, Sparkles, ShieldAlert, RefreshCw, Save, Image as ImageIcon, BellRing, ArrowLeft } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { ServingGroup } from '../types';
import { parseMenuImage } from '../services/geminiService';

const RESTAURANT_ZONES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'BC', 'VIP'];

interface ReceptionViewProps {
    onBack?: () => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({ onBack }) => {
    const { servingGroups, addServingGroup, startServingGroup } = useGlobalContext();
    const [selectedZone, setSelectedZone] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<ServingGroup> | null>(null);
    
    // AI Scan State
    const [scanStep, setScanStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');
    const [detectedGroups, setDetectedGroups] = useState<any[]>([]);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- FILTER LOGIC ---
    const activeGroups = useMemo(() => {
        return servingGroups.filter(g => {
            if (g.status === 'COMPLETED') return false;
            if (selectedZone !== 'ALL' && !g.location.toUpperCase().includes(selectedZone)) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return g.name.toLowerCase().includes(term) || g.location.toLowerCase().includes(term);
            }
            return true;
        }).sort((a, b) => {
            // Sort by arrival time (newest first)
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeB.localeCompare(timeA);
        });
    }, [servingGroups, selectedZone, searchTerm]);

    const totalGuests = activeGroups.reduce((sum, g) => sum + g.guestCount, 0);

    // --- HANDLERS ---

    const handleOpenAdd = () => {
        setEditingGroup({
            name: '', location: '', guestCount: 2, tableCount: 1, tableSplit: ''
        });
        setScanStep('UPLOAD');
        setIsModalOpen(true);
    };

    const handleNotifyArrival = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        startServingGroup(id); 
    };

    const handleSaveManual = () => {
        if (!editingGroup?.name || !editingGroup?.location) return;
        
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
        
        const newGroup: ServingGroup = {
            id: Date.now().toString(),
            name: editingGroup.name,
            location: editingGroup.location,
            guestCount: editingGroup.guestCount || 0,
            tableCount: editingGroup.tableCount || 1,
            tableSplit: editingGroup.tableSplit || '',
            startTime: null, // Null initially so "Notify" button appears
            date: todayStr,
            status: 'ACTIVE',
            items: [],
            prepList: []
        };
        addServingGroup(newGroup);
        setIsModalOpen(false);
    };

    // AI SCAN LOGIC (Reuse from ServingChecklist but simplified)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scale = MAX_WIDTH / img.width;
                canvas.width = scale < 1 ? MAX_WIDTH : img.width;
                canvas.height = scale < 1 ? img.height * scale : img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setCapturedImage(compressedBase64);
                analyzeImage(compressedBase64);
            };
        }
    };

    const analyzeImage = async (base64: string) => {
        setIsScanning(true);
        try {
            const rawGroups = await parseMenuImage(base64);
            // Map raw to temp structure
            setDetectedGroups(rawGroups);
            setScanStep('REVIEW');
        } catch (e) {
            alert("Lỗi phân tích ảnh.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleConfirmScan = () => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
        
        detectedGroups.forEach((g: any) => {
            addServingGroup({
                id: Date.now().toString() + Math.random().toString().substr(2, 5),
                name: g.groupName || g.name || 'Khách mới',
                location: g.location || '',
                guestCount: Number(g.guestCount) || 0,
                tableCount: Number(g.tableCount) || 1,
                tableSplit: g.tableSplit || '',
                startTime: null, // Allow notify later
                date: todayStr,
                status: 'ACTIVE',
                items: g.items?.map((i: any) => ({ 
                    ...i, 
                    id: Date.now().toString() + Math.random().toString().substr(2, 5) 
                })) || []
            });
        });
        setIsModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-20 relative">
            
            {/* BACK BUTTON FOR FULLSCREEN MODE */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-6 left-6 z-50 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white text-gray-500 hover:text-gray-900 transition-colors backdrop-blur-sm border border-gray-200"
                    title="Thoát chế độ Lễ tân"
                >
                    <ArrowLeft size={24} />
                </button>
            )}

            <div className={`space-y-6 max-w-[1600px] mx-auto ${onBack ? 'mt-8' : ''}`}>
                {/* HEADER & STATS */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className={onBack ? "pl-10 md:pl-0" : ""}>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ConciergeBell className="text-teal-600" /> Lễ Tân & Đón Khách
                        </h2>
                        <p className="text-gray-500">Quản lý sơ đồ bàn và khách vào.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-4 border-r border-gray-200">
                            <div className="text-2xl font-black text-indigo-600">{totalGuests}</div>
                            <div className="text-xs text-gray-400 font-bold uppercase">Khách</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-2xl font-black text-teal-600">{activeGroups.length}</div>
                            <div className="text-xs text-gray-400 font-bold uppercase">Đoàn</div>
                        </div>
                        <button 
                            onClick={handleOpenAdd}
                            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex items-center gap-2 transition-all active:scale-95 ml-4"
                        >
                            <PlusCircle size={20}/> Nhận khách mới
                        </button>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Tìm tên đoàn, số bàn..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full">
                        <button onClick={() => setSelectedZone('ALL')} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${selectedZone === 'ALL' ? 'bg-gray-800 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={16} /> Tất cả</button>
                        {RESTAURANT_ZONES.map(zone => (
                            <button key={zone} onClick={() => setSelectedZone(zone)} className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${selectedZone === zone ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {zone}
                            </button>
                        ))}
                    </div>
                </div>

                {/* GRID OF TABLES */}
                {activeGroups.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Users size={40} />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Sảnh đang trống</p>
                        <p className="text-gray-400">Chưa có khách nào tại khu vực này.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeGroups.map(group => (
                            <div key={group.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg font-black text-xl border border-teal-100 min-w-[3rem] text-center">
                                        {group.location}
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        {group.startTime ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-gray-500 flex items-center bg-gray-100 px-2 py-1 rounded">
                                                    <Clock size={12} className="mr-1"/> {group.startTime}
                                                </span>
                                                <button 
                                                    onClick={(e) => handleNotifyArrival(e, group.id)}
                                                    className="p-1 text-blue-500 hover:bg-blue-50 rounded bg-white border border-blue-100 shadow-sm transition-colors"
                                                    title="Báo lại khách đến"
                                                >
                                                    <BellRing size={14} className="fill-blue-100" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={(e) => handleNotifyArrival(e, group.id)}
                                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-700 animate-pulse"
                                            >
                                                <BellRing size={14} /> Báo khách đến
                                            </button>
                                        )}
                                        <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded mt-1 w-fit">
                                            {group.tableCount} bàn
                                        </div>
                                    </div>
                                </div>
                                
                                <h3 className="font-bold text-gray-900 text-lg truncate mb-1" title={group.name}>{group.name}</h3>
                                <div className="flex items-center text-gray-500 text-sm mb-4">
                                    <Users size={14} className="mr-1.5"/> 
                                    <span className="font-bold text-gray-700 mr-1">{group.guestCount}</span> khách
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODAL: ADD / SCAN */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-xl text-gray-900">Tiếp nhận khách mới</h3>
                                <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition-colors"><X size={20}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {/* TABS FOR ADD MODE */}
                                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                                    <button onClick={() => setScanStep('UPLOAD')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${scanStep !== 'manual' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>Quét AI (Menu/Phiếu)</button>
                                    <button onClick={() => setScanStep('manual' as any)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${scanStep === 'manual' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>Nhập thủ công</button>
                                </div>

                                {/* MANUAL FORM */}
                                {scanStep === 'manual' as any && editingGroup && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tên đoàn / Khách</label>
                                                <input type="text" value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:border-teal-500 outline-none" placeholder="VD: Anh Nam..." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Vị trí bàn</label>
                                                <input type="text" value={editingGroup.location} onChange={e => setEditingGroup({...editingGroup, location: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold focus:border-teal-500 outline-none" placeholder="VD: A1, VIP..." />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Số khách</label>
                                                <input type="number" value={editingGroup.guestCount} onChange={e => setEditingGroup({...editingGroup, guestCount: Number(e.target.value)})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-center focus:border-teal-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Số bàn</label>
                                                <input type="number" value={editingGroup.tableCount} onChange={e => setEditingGroup({...editingGroup, tableCount: Number(e.target.value)})} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-center focus:border-teal-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Chia bàn</label>
                                                <input type="text" value={editingGroup.tableSplit || ''} onChange={e => setEditingGroup({...editingGroup, tableSplit: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-teal-500 outline-none" placeholder="1x6, 1x4" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SCAN AI FLOW */}
                                {scanStep !== 'manual' as any && (
                                    <>
                                        {scanStep === 'UPLOAD' && (
                                            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${isScanning ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isScanning} />
                                                {isScanning ? (
                                                    <> <Loader2 size={48} className="text-teal-600 animate-spin mb-4" /> <p className="font-bold text-teal-800">Đang đọc phiếu...</p> </>
                                                ) : (
                                                    <> <Camera size={48} className="text-gray-300 mb-4" /> <p className="font-bold text-gray-600">Chạm để chụp Phiếu Order</p> <p className="text-xs text-gray-400 mt-2">AI sẽ tự động nhập tên, bàn và thực đơn</p> </>
                                                )}
                                            </div>
                                        )}

                                        {scanStep === 'REVIEW' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-green-700 flex items-center"><Sparkles size={16} className="mr-2"/> Kết quả quét ({detectedGroups.length} đoàn)</h4>
                                                    <button onClick={() => setScanStep('UPLOAD')} className="text-xs text-gray-500 underline flex items-center"><RefreshCw size={12} className="mr-1"/> Quét lại</button>
                                                </div>
                                                {detectedGroups.map((g, idx) => (
                                                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm space-y-2">
                                                        <div className="flex gap-2">
                                                            <input value={g.name} onChange={e => {const d = [...detectedGroups]; d[idx].name = e.target.value; setDetectedGroups(d)}} className="flex-1 border p-2 rounded font-bold" placeholder="Tên đoàn"/>
                                                            <input value={g.location} onChange={e => {const d = [...detectedGroups]; d[idx].location = e.target.value; setDetectedGroups(d)}} className="w-20 border p-2 rounded text-center font-bold text-teal-700" placeholder="Bàn"/>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1 flex items-center bg-white px-2 border rounded"><Users size={12} className="mr-2 text-gray-400"/><input type="number" value={g.guestCount} onChange={e => {const d = [...detectedGroups]; d[idx].guestCount = Number(e.target.value); setDetectedGroups(d)}} className="w-full outline-none font-bold"/></div>
                                                            <div className="flex-1 flex items-center bg-white px-2 border rounded"><LayoutGrid size={12} className="mr-2 text-gray-400"/><input type="number" value={g.tableCount} onChange={e => {const d = [...detectedGroups]; d[idx].tableCount = Number(e.target.value); setDetectedGroups(d)}} className="w-full outline-none font-bold"/></div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 bg-white p-2 rounded border border-dashed">
                                                            Menu: {g.items?.length || 0} món được tìm thấy.
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 bg-white border hover:bg-gray-100">Hủy</button>
                                {scanStep === 'manual' as any && (
                                    <button onClick={handleSaveManual} className="px-8 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md flex items-center"><Save size={18} className="mr-2"/> Lưu thông tin</button>
                                )}
                                {scanStep === 'REVIEW' && (
                                    <button onClick={handleConfirmScan} className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center"><CheckCircle2 size={18} className="mr-2"/> Xác nhận nhập</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
