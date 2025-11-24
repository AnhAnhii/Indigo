
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, RefreshCw, ShieldCheck, Clock } from 'lucide-react';
import { AppView } from '../types';

interface QrStationProps {
    onBack: () => void;
}

export const QrStation: React.FC<QrStationProps> = ({ onBack }) => {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState(10);

    const generateQr = async () => {
        // TOKEN FORMAT: "RESTAURANT_SYNC_V1|TIMESTAMP|RANDOM_SALT"
        // Valid for 15 seconds.
        const now = Date.now();
        const salt = Math.random().toString(36).substring(7);
        const token = `RES_SYNC|${now}|${salt}`;
        
        try {
            const url = await QRCode.toDataURL(token, { width: 400, margin: 2, color: { dark: '#0d9488' } });
            setQrDataUrl(url);
            setTimeLeft(10); // Reset countdown
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        generateQr(); // Initial
        const qrInterval = setInterval(generateQr, 10000); // Regenerate every 10s
        
        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

        return () => {
            clearInterval(qrInterval);
            clearInterval(clockInterval);
        };
    }, []);

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
                <ArrowLeft size={24} /> <span className="text-sm font-bold">Thoát chế độ trạm</span>
            </button>

            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 border-4 border-teal-500/30">
                <div className="mb-6">
                    <h1 className="text-2xl font-extrabold text-gray-800 flex items-center justify-center gap-2">
                        <ShieldCheck className="text-teal-600" size={32} />
                        Trạm Chấm Công
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Quét mã bên dưới để check-in</p>
                </div>

                <div className="relative aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-6 overflow-hidden">
                    {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR Checkin" className="w-full h-full object-contain p-4 animate-in zoom-in duration-300" />
                    ) : (
                        <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                    )}
                    
                    {/* Countdown Overlay */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded-md">
                        Làm mới sau: {timeLeft}s
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-center text-4xl font-mono font-bold text-gray-800 tracking-widest">
                        {currentTime.toLocaleTimeString('vi-VN', {hour12: false})}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-teal-600 bg-teal-50 py-2 rounded-lg font-medium animate-pulse">
                        <RefreshCw size={16} className="animate-spin" /> 
                        Mã tự động thay đổi mỗi 10 giây
                    </div>
                </div>
            </div>

            <p className="mt-8 text-gray-500 text-sm max-w-sm text-center">
                <span className="font-bold text-gray-400">Lưu ý:</span> Thiết bị này cần đặt cố định tại quầy thu ngân hoặc cửa ra vào để nhân viên thực hiện chấm công.
            </p>
        </div>
    );
};
