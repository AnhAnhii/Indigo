
import React, { useState, useMemo } from 'react';
import { ShoppingCart, ChefHat, Search, Plus, Minus, X, CheckCircle, Info, Utensils, Coffee, IceCream, Beef, Globe, Gift, Users, FileText, Soup, Flame } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { MenuItem } from '../types';
import { EntertainmentHub } from './EntertainmentHub';

// --- TRANSLATION DICTIONARY ---
type Language = 'VI' | 'EN' | 'KO' | 'FR';

const TRANSLATIONS = {
    VI: {
        table: 'Bàn',
        all: 'Tất cả',
        viewCart: 'Xem giỏ hàng',
        cartTitle: 'Giỏ hàng của bạn',
        total: 'Tổng cộng',
        placeOrder: 'Xác nhận gọi món',
        submitting: 'Đang gửi...',
        successTitle: 'Đặt món thành công!',
        successMsg: 'Nhà bếp đã nhận được đơn.',
        waitMsg: 'Món ăn sẽ được phục vụ trong giây lát.',
        orderMore: 'Gọi thêm món',
        search: 'Tìm món ăn...',
        empty: 'Chưa có món nào.',
        entertainment: 'Giải trí & Quà',
        guestCountLabel: 'Số người ăn',
        noteLabel: 'Ghi chú cho bếp',
        notePlaceholder: 'VD: Ít cay, không hành, dị ứng...',
    },
    EN: {
        table: 'Table',
        all: 'All',
        viewCart: 'View Cart',
        cartTitle: 'Your Cart',
        total: 'Total',
        placeOrder: 'Place Order',
        submitting: 'Sending...',
        successTitle: 'Order Placed!',
        successMsg: 'Kitchen has received your order.',
        waitMsg: 'Food will be served shortly.',
        orderMore: 'Order More',
        search: 'Search food...',
        empty: 'No items yet.',
        entertainment: 'Fun & Gifts',
        guestCountLabel: 'Number of Guests',
        noteLabel: 'Note to Kitchen',
        notePlaceholder: 'Ex: Less spicy, no onion, allergy...',
    },
    KO: {
        table: '테이블',
        all: '전체',
        viewCart: '장바구니 보기',
        cartTitle: '장바구니',
        total: '합계',
        placeOrder: '주문하기',
        submitting: '전송 중...',
        successTitle: '주문 성공!',
        successMsg: '주방에서 주문을 접수했습니다.',
        waitMsg: '곧 음식이 서빙됩니다.',
        orderMore: '추가 주문하기',
        search: '메뉴 검색...',
        empty: '항목 없음.',
        entertainment: '게임 및 선물',
        guestCountLabel: '인원 수',
        noteLabel: '주방 요청 사항',
        notePlaceholder: '예: 덜 맵게, 양파 빼고, 알레르기...',
    },
    FR: {
        table: 'Table',
        all: 'Tout',
        viewCart: 'Voir le Panier',
        cartTitle: 'Votre Panier',
        total: 'Total',
        placeOrder: 'Commander',
        submitting: 'Envoi...',
        successTitle: 'Commande Réussie!',
        successMsg: 'La cuisine a reçu votre commande.',
        waitMsg: 'Les plats seront servis sous peu.',
        orderMore: 'Commander plus',
        search: 'Rechercher...',
        empty: 'Aucun article.',
        entertainment: 'Jeux & Cadeaux',
        guestCountLabel: 'Nombre de personnes',
        noteLabel: 'Note à la cuisine',
        notePlaceholder: 'Ex: Moins épicé, pas d\'oignon, allergie...',
    }
};

const LANG_OPTIONS: {code: Language, label: string, flag: string}[] = [
    { code: 'VI', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: 'KO', label: '한국어', flag: '🇰🇷' },
    { code: 'FR', label: 'Français', flag: '🇫🇷' },
];

// Helper to map category names to icons (case insensitive)
const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('drink') || lower.includes('uống') || lower.includes('nước')) return Coffee;
    if (lower.includes('dessert') || lower.includes('tráng miệng') || lower.includes('kem')) return IceCream;
    if (lower.includes('appetizer') || lower.includes('khai vị')) return Utensils;
    if (lower.includes('soup') || lower.includes('súp') || lower.includes('cháo')) return Soup;
    if (lower.includes('hotpot') || lower.includes('lẩu') || lower.includes('nướng') || lower.includes('bbq')) return Flame;
    return Beef; // Default for Main courses or unknown
};

interface GuestMenuProps {
    tableId: string;
}

export const GuestMenu: React.FC<GuestMenuProps> = ({ tableId }) => {
    const { submitGuestOrder, menuItems } = useGlobalContext();
    const [language, setLanguage] = useState<Language>('VI');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isEntertainmentOpen, setIsEntertainmentOpen] = useState(false);
    const [orderStatus, setOrderStatus] = useState<'NONE' | 'SUBMITTING' | 'SUCCESS'>('NONE');
    const [searchTerm, setSearchTerm] = useState('');
    
    // New Order Fields
    const [guestCount, setGuestCount] = useState<number>(2);
    const [orderNote, setOrderNote] = useState('');

    const t = TRANSLATIONS[language];

    // Helper to get translated item name
    const getItemName = (item: MenuItem) => {
        switch(language) {
            case 'EN': return item.nameEn || item.name;
            case 'KO': return item.nameKo || item.nameEn || item.name;
            case 'FR': return item.nameFr || item.nameEn || item.name;
            default: return item.name;
        }
    };

    const getItemDesc = (item: MenuItem) => {
        switch(language) {
            case 'EN': return item.descriptionEn || item.description;
            case 'KO': return item.descriptionKo || item.descriptionEn || item.description;
            case 'FR': return item.descriptionFr || item.descriptionEn || item.description;
            default: return item.description;
        }
    };

    // --- DYNAMIC CATEGORIES ---
    const categories = useMemo(() => {
        const uniqueCats = Array.from(new Set(menuItems.map(i => i.category))).filter(Boolean);
        const dynamicCats = uniqueCats.map(cat => ({
            id: cat as string,
            name: cat as string, // Could implement translation logic here if categories follow a standard
            icon: getCategoryIcon(cat as string)
        }));
        
        return [
            { id: 'ALL', name: t.all, icon: Utensils },
            ...dynamicCats
        ];
    }, [menuItems, t.all]);

    const filteredMenu = useMemo(() => {
        let items = menuItems.filter(i => i.isAvailable); // Filter available items
        if (activeCategory !== 'ALL') {
            items = items.filter(item => item.category === activeCategory);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(item => 
                getItemName(item).toLowerCase().includes(term) || 
                (item.price.toString().includes(term))
            );
        }
        return items;
    }, [activeCategory, searchTerm, language, menuItems]);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.item.id === itemId) {
                return { ...i, quantity: Math.max(0, i.quantity + delta) };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const cartTotal = cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    const handlePlaceOrder = async () => {
        setOrderStatus('SUBMITTING');
        await submitGuestOrder(tableId, cart, guestCount, orderNote);
        setCart([]);
        setOrderNote('');
        setOrderStatus('SUCCESS');
        setIsCartOpen(false);
    };

    if (orderStatus === 'SUCCESS') {
        return (
            <div className="min-h-screen bg-teal-600 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
                    <CheckCircle size={48} className="text-white"/>
                </div>
                <h1 className="text-3xl font-bold mb-2">{t.successTitle}</h1>
                <p className="text-teal-100 mb-8">{t.successMsg} {tableId}.<br/>{t.waitMsg}</p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button 
                        onClick={() => setIsEntertainmentOpen(true)}
                        className="bg-yellow-400 text-yellow-900 px-8 py-3 rounded-xl font-bold hover:bg-yellow-300 shadow-lg flex items-center justify-center gap-2 animate-pulse"
                    >
                        <Gift size={20}/> {t.entertainment}
                    </button>
                    <button 
                        onClick={() => setOrderStatus('NONE')}
                        className="bg-white/20 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/30"
                    >
                        {t.orderMore}
                    </button>
                </div>
                {isEntertainmentOpen && <EntertainmentHub onClose={() => setIsEntertainmentOpen(false)} />}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans relative">
            {/* ENTERTAINMENT FLOATING BUTTON */}
            <button 
                onClick={() => setIsEntertainmentOpen(true)}
                className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/40 flex items-center justify-center text-white hover:scale-110 transition-transform animate-[bounce_2s_infinite]"
            >
                <Gift size={28} />
            </button>

            {/* Header */}
            <div className="bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center p-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Indigo Sapa</h1>
                        <p className="text-xs text-teal-600 font-bold flex items-center">
                            <Utensils size={12} className="mr-1"/> 
                            {t.table} {tableId}
                        </p>
                    </div>
                    
                    {/* LANGUAGE SWITCHER */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className="bg-gray-100 px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 border border-gray-200 flex items-center gap-1 hover:bg-gray-200 transition-colors"
                        >
                            <Globe size={14} />
                            {LANG_OPTIONS.find(l => l.code === language)?.flag} {language}
                        </button>
                        
                        {isLangMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsLangMenuOpen(false)}></div>
                                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-40 z-20 animate-in fade-in zoom-in duration-200">
                                    {LANG_OPTIONS.map(opt => (
                                        <button 
                                            key={opt.code}
                                            onClick={() => { setLanguage(opt.code); setIsLangMenuOpen(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 ${language === opt.code ? 'text-teal-600 bg-teal-50' : 'text-gray-700'}`}
                                        >
                                            <span className="text-lg">{opt.flag}</span> {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder={t.search} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex overflow-x-auto px-4 pb-3 pt-2 gap-3 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                                activeCategory === cat.id 
                                ? 'bg-teal-600 text-white shadow-md' 
                                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            <cat.icon size={16} />
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMenu.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400 italic">
                        {menuItems.length === 0 ? "Nhà hàng đang cập nhật thực đơn." : t.empty}
                    </div>
                )}
                {filteredMenu.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0 overflow-hidden relative">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Utensils size={24}/>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">{getItemName(item)}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{getItemDesc(item)}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <div>
                                    <span className="font-bold text-teal-700">{item.price.toLocaleString('vi-VN')}đ</span>
                                    {item.unit && <span className="text-[10px] text-gray-500 ml-1">/{item.unit}</span>}
                                </div>
                                <button 
                                    onClick={() => addToCart(item)}
                                    className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center hover:bg-teal-600 hover:text-white transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-30">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-teal-600 text-white p-4 rounded-2xl shadow-xl shadow-teal-200/50 flex justify-between items-center font-bold hover:bg-teal-700 transition-transform active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 px-3 py-1 rounded-lg text-sm">{cartCount}</div>
                            <span>{t.viewCart}</span>
                        </div>
                        <span>{cartTotal.toLocaleString('vi-VN')}đ</span>
                    </button>
                </div>
            )}

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end md:justify-center md:items-center">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{t.cartTitle}</h3>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0">
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-bold text-gray-800 line-clamp-1">{getItemName(i.item)}</h4>
                                        <p className="text-xs text-teal-600 font-bold">
                                            {i.item.price.toLocaleString('vi-VN')}đ
                                            <span className="text-gray-400 font-normal ml-1">/{i.item.unit || 'Phần'}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(i.item.id, -1)} className="w-7 h-7 bg-white rounded flex items-center justify-center text-gray-600 shadow-sm"><Minus size={14}/></button>
                                        <span className="text-sm font-bold w-4 text-center">{i.quantity}</span>
                                        <button onClick={() => updateQuantity(i.item.id, 1)} className="w-7 h-7 bg-white rounded flex items-center justify-center text-gray-600 shadow-sm"><Plus size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-gray-50 border-t space-y-4">
                            {/* Guest Count & Note Inputs */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Users size={10} className="mr-1"/> {t.guestCountLabel}</label>
                                    <input 
                                        type="number" 
                                        min="1" max="99" 
                                        value={guestCount} 
                                        onChange={(e) => setGuestCount(Number(e.target.value))}
                                        className="w-full border rounded-lg p-2 text-center font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><FileText size={10} className="mr-1"/> {t.noteLabel}</label>
                                    <input 
                                        type="text" 
                                        value={orderNote} 
                                        onChange={(e) => setOrderNote(e.target.value)}
                                        placeholder={t.notePlaceholder}
                                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-gray-200">
                                <span>{t.total}</span>
                                <span className="text-teal-700">{cartTotal.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <button 
                                onClick={handlePlaceOrder}
                                className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex justify-center items-center gap-2"
                            >
                                {orderStatus === 'SUBMITTING' ? t.submitting : t.placeOrder}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ENTERTAINMENT MODAL */}
            {isEntertainmentOpen && <EntertainmentHub onClose={() => setIsEntertainmentOpen(false)} />}
        </div>
    );
};
