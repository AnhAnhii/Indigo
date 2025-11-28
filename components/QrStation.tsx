
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, RefreshCw, ShieldCheck, Clock, Utensils, Printer } from 'lucide-react';
import { AppView } from '../types';

interface QrStationProps {
    onBack: () => void;
}

const RESTAURANT_TABLES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'BC1', 'BC2', 'BC3', 'VIP1', 'VIP2'];

export const QrStation: React.FC<QrStationProps> = ({ onBack }) => {
    const [mode, setMode] = useState<'CHECKIN' | 'TABLE_MENU'>('CHECKIN');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState(10);
    const [selectedTable, setSelectedTable] = useState('A1');

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
        const appUrl = window.location.origin;
        const menuUrl = `${appUrl}?table=${tableId}`;
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
            generateTableQr(selectedTable);
        }
        
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

        return () => {
            clearInterval(qrInterval);
            clearInterval(clockInterval);
        };
    }, [mode, selectedTable]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <body style="text-align:center; font-family: sans-serif;">
                    <h1>Menu Bàn ${selectedTable}</h1>
                    <img src="${qrDataUrl}" width="300" />
                    <p>Quét để gọi món</p>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
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
                className="absolute top-6 left-6 text-white/50 hover:text-white flex items-center gap-2 z-20"
            >
                <ArrowLeft size={24} /> <span className="text-sm font-bold">Thoát</span>
            </button>

            {/* Mode Switcher */}
            <div className="absolute top-6 right-6 bg-gray-800 rounded-lg p-1 flex z-20">
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

            <div className={`bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 border-4 transition-colors ${mode === 'CHECKIN' ? 'border-teal-500/30' : 'border-indigo-500/30'}`}>
                
                {mode === 'CHECKIN' ? (
                    <div className="mb-6">
                        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                            <ShieldCheck className="text-teal-600" size={32} />
                            Trạm Chấm Công
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Quét mã bên dưới để check-in</p>
                    </div>
                ) : (
                    <div className="mb-6 space-y-3">
                         <h1 className="text-2xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                            <Utensils className="text-indigo-600" size={32} />
                            Menu Điện Tử
                        </h1>
                        <div className="flex justify-center gap-2 flex-wrap">
                            {RESTAURANT_TABLES.map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setSelectedTable(t)}
                                    className={`text-xs font-bold px-2 py-1 rounded border transition-colors ${selectedTable === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="relative aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-6 overflow-hidden group">
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
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={handlePrint} className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
                                 <Printer size={16}/> In Mã
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
                    <div className="space-y-4">
                        <p className="text-gray-500 font-medium">Đang tạo mã cho bàn <span className="text-indigo-600 font-bold text-lg">{selectedTable}</span></p>
                        <p className="text-xs text-gray-400">Khách quét mã này sẽ vào thẳng Menu gọi món.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
