
import React from 'react';
import QRCode from 'qrcode';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Star, MapPin } from 'lucide-react';

export const StaffReviewQr: React.FC = () => {
    const { currentUser } = useGlobalContext();
    const [qrDataUrl, setQrDataUrl] = React.useState('');

    React.useEffect(() => {
        if (currentUser) {
            const redirectUrl = `${window.location.origin}?mode=review_redirect&staffId=${currentUser.id}`;
            QRCode.toDataURL(redirectUrl, { width: 400, margin: 2, color: { dark: '#0d9488', light: '#ffffff' } })
                .then(setQrDataUrl)
                .catch(console.error);
        }
    }, [currentUser]);

    if (!currentUser) return null;

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-gray-200 text-center max-w-md mx-auto mt-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Xin Đánh Giá Google</h2>
            <p className="text-gray-500 text-sm mb-6">Đưa mã này cho khách hàng quét để mời họ đánh giá.</p>

            <div className="relative mb-6 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-white p-4 rounded-2xl border-4 border-white shadow-xl">
                    {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 object-contain" />
                    ) : (
                        <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-lg"></div>
                    )}
                    
                    {/* Staff Avatar Overlay */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full p-1 shadow-lg flex items-center justify-center">
                        <div className="w-full h-full bg-gray-200 rounded-full overflow-hidden flex items-center justify-center font-bold text-gray-500 border border-gray-100">
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt="Staff" className="w-full h-full object-cover" />
                            ) : (
                                currentUser.name.charAt(0)
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-teal-50 px-6 py-3 rounded-xl border border-teal-100">
                <p className="font-bold text-teal-800 text-lg">{currentUser.name}</p>
                <div className="flex items-center justify-center gap-1 text-teal-600 text-xs mt-1">
                    <MapPin size={12}/> Indigo Restaurant Sapa
                </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
                <Star className="fill-yellow-400 text-yellow-400" size={14}/>
                <span>Mỗi lượt khách quét sẽ được tính vào KPI của bạn.</span>
            </div>
        </div>
    );
};
