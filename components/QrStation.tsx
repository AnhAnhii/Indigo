
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, RefreshCw, ShieldCheck, Clock, Utensils, Printer, Layers, PenTool } from 'lucide-react';
import { AppView } from '../types';

interface QrStationProps {
    onBack: () => void;
}

// Cấu hình khu vực bàn theo mô hình thực tế
const RESTAURANT_AREAS: Record<string, string[]> = {
    'Khu A (Trong nhà)': ['A1', 'A2', 'A3', 'A4', 'A5'],
    'Khu B (Cửa sổ)': ['B1', 'B2', 'B3', 'B4'],
    'Khu C (Tầng 2)': ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
    'Ban công (Ngoài trời)': ['BC1', 'BC2', 'BC3', 'BC4'],
    'Phòng VIP': ['VIP1', 'VIP2']
};

export const QrStation: React.FC<QrStationProps> = ({ onBack }) => {
    const [mode, setMode] = useState<'CHECKIN' | 'TABLE_MENU'>('CHECKIN');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState(10);
    
    // State cho việc chọn bàn
    const [activeZone, setActiveZone] = useState<string>(Object.keys(RESTAURANT_AREAS)[0]);
    const [selectedTable, setSelectedTable] = useState('A1');
    const [customTable, setCustomTable] = useState('');
    const [useCustomTable, setUseCustomTable] = useState(false);

    // 1. Check-in QR Logic
    const generateCheckinQr = async () => {
        const now = Date.now();
        const salt = Math.random().toString(36).substring(7);
        const token = `RES_SYNC|${now}|${salt}`;
        try {
            const url = await QRCode.toDataURL(token, { width: 400, margin: 2, color: { dark: '#0d9488' } });
            setQrDataUrl(url);
            setTimeLeft(10);
        } catch (err) { console.error(err); }
    };

    // 2. Table Menu QR Logic
    const generateTableQr = async (tableId: string) => {
        if (!tableId) return;
        const appUrl = window.location.origin;
        // Tạo URL có tham số ?table=XYZ
        const menuUrl = `${appUrl}?table=${encodeURIComponent(tableId)}`;
        try {
            const url = await QRCode.toDataURL(menuUrl, { width: 400, margin: 2, color: { dark: '#4f46e5' } });
            setQrDataUrl(url);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        let qrInterval: any;
        
        if (mode === 'CHECKIN') {
            generateCheckinQr();
            qrInterval = setInterval(generateCheckinQr, 10000);
        } else {
            // Nếu đang dùng nhập tay thì dùng giá trị custom, không thì dùng selectedTable
            const targetTable = useCustomTable ? customTable : selectedTable;
            generateTableQr(targetTable);
        }
        
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

        return () => {
            clearInterval(qrInterval);
            clearInterval(clockInterval);
        };
    }, [mode, selectedTable, customTable, useCustomTable]);

    const handlePrint = () => {
        const targetTable = useCustomTable ? customTable : selectedTable;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>QR Menu - Bàn ${targetTable}</title>
                    <style>
                        body { text-align: center; font-family: sans-serif; padding: 20px; }
                        .container { border: 2px dashed #000; padding: 20px; display: inline-block; border-radius: 10px; }
                        h1 { margin: 10px 0; font-size: 40px; }
                        p { margin: 5px 0; font-size: 18px; color: #555; }
                        img { width: 300px; height: 300px; }
                        .footer { margin-top: 15px; font-weight: bold; font-size: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <p>Quét mã để gọi món</p>
                        <img src="${qrDataUrl}" />
                        <h1>Bàn ${targetTable}</h1>
                        <div class="footer">Indigo Restaurant</div>
                    </div>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Animation */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-teal-500 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <button 
                onClick={onBack}
                className="absolute top-6 left-6 text-white/50 hover:text-white flex items-center gap-2 z-20 transition-colors"
            >
                <ArrowLeft size={24} /> <span className="text-sm font-bold">Thoát</span>
            </button>

            {/* Mode Switcher */}
            <div className="absolute top-6 right-6 bg-gray-800 rounded-lg p-1 flex z-20 shadow-lg">
                <button 
                    onClick={() => setMode('CHECKIN')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'CHECKIN' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Chấm công
                </button>
                <button 
                    onClick={() => setMode('TABLE_MENU')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'TABLE_MENU' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Menu Bàn
                </button>
            </div>

            <div className={`bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full text-center relative z-10 border-4 transition-all duration-300 flex flex-col ${mode === 'CHECKIN' ? 'border-teal-500/30 max-w-md' : 'border-indigo-500/30 max-w-4xl min-h-[600px] md:flex-row gap-8'}`}>
                
                {/* LEFT SIDE: CONTROL PANEL (Only for TABLE_MENU) */}
                {mode === 'TABLE_MENU' && (
                    <div className="flex-1 text-left space-y-4 order-2 md:order-1">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
                                <Utensils className="text-indigo-600" size={24} />
                                Cấu hình QR Bàn
                            </h2>
                            <p className="text-sm text-gray-500">Chọn bàn hoặc nhập mã để tạo QR</p>
                        </div>

                        {/* Zone Selector */}
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                 <Layers size={12}/> Chọn Khu Vực
                             </label>
                             <div className="flex flex-wrap gap-2">
                                 {Object.keys(RESTAURANT_AREAS).map(zone => (
                                     <button
                                        key={zone}
                                        onClick={() => { setActiveZone(zone); setUseCustomTable(false); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${activeZone === zone && !useCustomTable ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                                     >
                                         {zone}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Table Selector Grid */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <div className="grid grid-cols-4 gap-2">
                                 {RESTAURANT_AREAS[activeZone].map(table => (
                                     <button
                                        key={table}
                                        onClick={() => { setSelectedTable(table); setUseCustomTable(false); }}
                                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${selectedTable === table && !useCustomTable ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}
                                     >
                                         {table}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Custom Input */}
                        <div className="pt-2 border-t border-gray-100">
                             <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-2">
                                 <PenTool size={12}/> Hoặc nhập tên bàn khác
                             </label>
                             <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    placeholder="VD: TiepTan, BanGhep..." 
                                    value={customTable}
                                    onChange={(e) => { setCustomTable(e.target.value); setUseCustomTable(true); }}
                                    className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${useCustomTable ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                                 />
                                 {useCustomTable && (
                                     <span className="text-xs font-bold text-indigo-600 self-center animate-pulse">Đang chọn</span>
                                 )}
                             </div>
                        </div>
                    </div>
                )}

                {/* RIGHT SIDE (OR CENTER): QR DISPLAY */}
                <div className={`flex flex-col items-center justify-center order-1 md:order-2 ${mode === 'CHECKIN' ? 'w-full' : 'w-full md:w-1/2 border-b md:border-b-0 md:border-l border-gray-100 md:pl-8 pb-6 md:pb-0'}`}>
                    
                    {mode === 'CHECKIN' && (
                        <div className="mb-6">
                            <h1 className="text-2xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                                <ShieldCheck className="text-teal-600" size={32} />
                                Trạm Chấm Công
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Quét mã bên dưới để check-in</p>
                        </div>
                    )}

                    <div className="relative aspect-square w-64 bg-white rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center mb-6 overflow-hidden group shadow-inner">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain p-4 animate-in zoom-in duration-300" />
                        ) : (
                            <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full"></div>
                        )}
                        
                        {mode === 'CHECKIN' && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded-md">
                                Reset: {timeLeft}s
                            </div>
                        )}

                        {mode === 'TABLE_MENU' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <button onClick={handlePrint} className="bg-white text-gray-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-transform">
                                    <Printer size={20}/> In Mã QR
                                </button>
                            </div>
                        )}
                    </div>

                    {mode === 'CHECKIN' ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center text-4xl font-mono font-bold text-gray-800 tracking-widest">
                                {currentTime.toLocaleTimeString('vi-VN', {hour12: false})}
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-teal-600 bg-teal-50 py-2 rounded-lg font-medium animate-pulse">
                                <RefreshCw size={16} className="animate-spin" /> 
                                Mã tự động thay đổi mỗi 10 giây
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-bold text-gray-900">
                                Bàn {useCustomTable ? customTable || '...' : selectedTable}
                            </h3>
                            <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                                Di chuột vào mã QR để thấy nút <span className="font-bold">In</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
