
import React, { useEffect, useState } from 'react';
import { Star, Loader2, MapPin } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { LOGO_URL } from '../App';

interface ReviewRedirectProps {
    staffId: string;
}

const GOOGLE_REVIEW_LINK = "https://share.google/gtcyxA8neU95Oq2N1";

export const ReviewRedirect: React.FC<ReviewRedirectProps> = ({ staffId }) => {
    const { employees, trackReviewClick } = useGlobalContext();
    const [staffName, setStaffName] = useState('Nhân viên');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        const staff = employees.find(e => e.id === staffId);
        if (staff) {
            setStaffName(staff.name);
            setAvatar(staff.avatar || null);
        }
    }, [employees, staffId]);

    const handleRedirect = async () => {
        setIsRedirecting(true);
        // Track the click before redirecting
        try {
            await trackReviewClick(staffId);
        } catch (e) {
            console.error("Tracking failed", e);
        }
        // Force redirect after short delay
        setTimeout(() => {
            window.location.href = GOOGLE_REVIEW_LINK;
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-600 to-indigo-700 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="bg-white text-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-indigo-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-100 rounded-full blur-3xl opacity-50"></div>

                <div className="relative z-10">
                    <img src={LOGO_URL} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
                    
                    <h2 className="text-xl font-bold mb-1">Cảm ơn quý khách!</h2>
                    <p className="text-sm text-gray-500 mb-6">Bạn đã có trải nghiệm tuyệt vời tại Indigo Sapa chứ?</p>

                    <div className="mb-8">
                        <div className="w-24 h-24 rounded-full border-4 border-teal-100 mx-auto mb-3 overflow-hidden shadow-sm">
                            {avatar ? (
                                <img src={avatar} alt={staffName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center font-bold text-2xl text-gray-400">
                                    {staffName.charAt(0)}
                                </div>
                            )}
                        </div>
                        <p className="font-bold text-lg">{staffName}</p>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Đang phục vụ bạn</p>
                    </div>

                    <button 
                        onClick={handleRedirect}
                        disabled={isRedirecting}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isRedirecting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" /> Đang chuyển hướng...
                            </>
                        ) : (
                            <>
                                <Star className="fill-yellow-400 text-yellow-400" size={20}/>
                                Đánh giá trên Google
                            </>
                        )}
                    </button>
                    
                    <div className="mt-4 flex justify-center text-xs text-gray-400 items-center gap-1">
                        <MapPin size={10} /> Indigo Restaurant Sapa
                    </div>
                </div>
            </div>
        </div>
    );
};
