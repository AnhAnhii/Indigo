
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Search, Plus, Minus, X, CheckCircle, Info, Utensils, Coffee, IceCream, Beef, Globe, Gift, Users, FileText, Soup, Flame, Bell, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { MenuItem } from '../types';
import { EntertainmentHub } from './EntertainmentHub';

// --- TRANSLATION DICTIONARY ---
type Language = 'VI' | 'EN' | 'KO' | 'FR';

const TRANSLATIONS = {
    VI: {
        table: 'Bàn',
        all: 'Tất cả',
        viewCart: 'Giỏ hàng',
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
        entertainment: 'Giải trí',
        guestCountLabel: 'Số người',
        noteLabel: 'Ghi chú cho bếp',
        notePlaceholder: 'VD: Ít cay, không hành...',
        callStaff: 'Gọi NV',
        callSent: 'Đã gọi!',
        callReasonWater: 'Thêm nước',
        callReasonBill: 'Thanh toán',
        callReasonHelp: 'Hỗ trợ khác',
        callConfirm: 'Bạn cần hỗ trợ gì?',
        itemAdded: 'Đã thêm vào giỏ'
    },
    EN: {
        table: 'Table',
        all: 'All',
        viewCart: 'Cart',
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
        entertainment: 'Fun',
        guestCountLabel: 'Guests',
        noteLabel: 'Note',
        notePlaceholder: 'Ex: No spicy...',
        callStaff: 'Call',
        callSent: 'Sent!',
        callReasonWater: 'Water',
        callReasonBill: 'Bill',
        callReasonHelp: 'Help',
        callConfirm: 'How can we help?',
        itemAdded: 'Added to cart'
    },
    KO: {
        table: '테이블',
        all: '전체',
        viewCart: '장바구니',
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
        entertainment: '게임',
        guestCountLabel: '인원',
        noteLabel: '요청 사항',
        notePlaceholder: '예: 덜 맵게...',
        callStaff: '호출',
        callSent: '호출 완료!',
        callReasonWater: '물',
        callReasonBill: '계산서',
        callReasonHelp: '도움',
        callConfirm: '무엇을 도와드릴까요?',
        itemAdded: '추가됨'
    },
    FR: {
        table: 'Table',
        all: 'Tout',
        viewCart: 'Panier',
        cartTitle: 'Votre Panier',
        total: 'Total',
        placeOrder: 'Commander',
        submitting: 'Envoi...',
        successTitle: 'Succès!',
        successMsg: 'Commande reçue.',
        waitMsg: 'Service bientôt.',
        orderMore: 'Commander',
        search: 'Rechercher...',
        empty: 'Vide.',
        entertainment: 'Jeux',
        guestCountLabel: 'Personnes',
        noteLabel: 'Note',
        notePlaceholder: 'Ex: Pas épicé...',
        callStaff: 'Appel',
        callSent: 'Envoyé !',
        callReasonWater: 'Eau',
        callReasonBill: 'Addition',
        callReasonHelp: 'Aide',
        callConfirm: 'Besoin d\'aide ?',
        itemAdded: 'Ajouté'
    }
};

const LANG_OPTIONS: {code: Language, label: string, flag: string}[] = [
    { code: 'VI', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: 'KO', label: '한국어', flag: '🇰🇷' },
    { code: 'FR', label: 'Français', flag: '🇫🇷' },
];

const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('drink') || lower.includes('uống') || lower.includes('nước') || lower.includes('rượu') || lower.includes('bia')) return Coffee;
    if (lower.includes('dessert') || lower.includes('tráng miệng') || lower.includes('kem')) return IceCream;
    if (lower.includes('appetizer') || lower.includes('khai vị') || lower.includes('salad')) return Utensils;
    if (lower.includes('soup') || lower.includes('súp') || lower.includes('cháo')) return Soup;
    if (lower.includes('hotpot') || lower.includes('lẩu') || lower.includes('nướng') || lower.includes('bbq')) return Flame;
    return Beef;
};

interface GuestMenuProps {
    tableId: string;
}

export const GuestMenu: React.FC<GuestMenuProps> = ({ tableId }) => {
    const { submitGuestOrder, menuItems, requestAssistance } = useGlobalContext();
    const [language, setLanguage] = useState<Language>('VI');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isEntertainmentOpen, setIsEntertainmentOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [orderStatus, setOrderStatus] = useState<'NONE' | 'SUBMITTING' | 'SUCCESS'>('NONE');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const [guestCount, setGuestCount] = useState<number>(2);
    const [orderNote, setOrderNote] = useState('');

    const searchInputRef = useRef<HTMLInputElement>(null);
    const t = TRANSLATIONS[language];

    // Scroll active category into view
    const categoryScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

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

    const categories = useMemo(() => {
        const uniqueCats = Array.from(new Set(menuItems.map(i => i.category))).filter(Boolean);
        const dynamicCats = uniqueCats.map(cat => ({
            id: cat as string,
            name: cat as string,
            icon: getCategoryIcon(cat as string)
        }));
        
        return [
            { id: 'ALL', name: t.all, icon: Utensils },
            ...dynamicCats
        ];
    }, [menuItems, t.all]);

    const filteredMenu = useMemo(() => {
        let items = menuItems.filter(i => i.isAvailable);
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
        
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(50);
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

    const handleCallWaiter = (reason: string) => {
        requestAssistance(tableId, reason);
        setIsCallModalOpen(false);
        // Simple Toast
        const toast = document.createElement('div');
        toast.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-full font-bold z-[100] animate-in fade-in zoom-in duration-300";
        toast.innerText = t.callSent;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 2000);
    };

    if (orderStatus === 'SUCCESS') {
        return (
            <div className="min-h-screen bg-teal-600 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                    <CheckCircle size={48} className="text-white"/>
                </div>
                <h1 className="text-3xl font-bold mb-2">{t.successTitle}</h1>
                <p className="text-teal-100 mb-8 max-w-xs mx-auto">{t.successMsg} {tableId}.<br/>{t.waitMsg}</p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button 
                        onClick={() => setIsEntertainmentOpen(true)}
                        className="bg-yellow-400 text-yellow-900 px-8 py-4 rounded-2xl font-bold hover:bg-yellow-300 shadow-xl flex items-center justify-center gap-3 animate-pulse"
                    >
                        <Gift size={24}/> {t.entertainment}
                    </button>
                    <button 
                        onClick={() => setOrderStatus('NONE')}
                        className="bg-white/20 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/30"
                    >
                        {t.orderMore}
                    </button>
                </div>
                {isEntertainmentOpen && <EntertainmentHub onClose={() => setIsEntertainmentOpen(false)} />}
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#F8F9FA] font-sans overflow-hidden">
            
            {/* --- HEADER --- */}
            <div className="bg-white shadow-sm z-30 shrink-0">
                <div className="flex justify-between items-center px-4 py-3">
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black text-gray-900 leading-tight">Indigo Sapa</h1>
                        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md w-fit mt-0.5">
                            {t.table} {tableId}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isSearchOpen ? (
                            <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 animate-in slide-in-from-right w-40 md:w-60">
                                <Search size={16} className="text-gray-400 shrink-0"/>
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t.search}
                                    className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-800 placeholder-gray-400"
                                    onBlur={() => !searchTerm && setIsSearchOpen(false)}
                                />
                                <button onClick={() => {setSearchTerm(''); setIsSearchOpen(false)}}><X size={14} className="text-gray-400"/></button>
                            </div>
                        ) : (
                            <button onClick={() => setIsSearchOpen(true)} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                                <Search size={20} />
                            </button>
                        )}

                        <div className="relative">
                            <button 
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-sm"
                            >
                                <span className="text-2xl flex items-center justify-center h-full w-full bg-white">
                                    {LANG_OPTIONS.find(l => l.code === language)?.flag}
                                </span>
                            </button>
                            
                            {isLangMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsLangMenuOpen(false)}></div>
                                    <div className="absolute right-0 top-11 bg-white rounded-xl shadow-xl border border-gray-100 p-1 w-36 z-20 animate-in fade-in zoom-in duration-200">
                                        {LANG_OPTIONS.map(opt => (
                                            <button 
                                                key={opt.code}
                                                onClick={() => { setLanguage(opt.code); setIsLangMenuOpen(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-gray-50 ${language === opt.code ? 'bg-teal-50 text-teal-700' : 'text-gray-700'}`}
                                            >
                                                <span className="text-lg">{opt.flag}</span> {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* CATEGORY TABS (STICKY) */}
                <div 
                    ref={categoryScrollRef}
                    className="flex overflow-x-auto px-4 pb-3 gap-2 no-scrollbar scroll-smooth"
                >
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all shrink-0 ${
                                activeCategory === cat.id 
                                ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {cat.id !== 'ALL' && <cat.icon size={14} className={activeCategory === cat.id ? 'text-yellow-400' : 'text-gray-400'} />}
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- MENU LIST --- */}
            <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4 safe-area-pb">
                {filteredMenu.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Utensils size={48} className="mb-4 text-gray-300 stroke-1"/>
                        <p className="font-medium italic">{menuItems.length === 0 ? "Loading menu..." : t.empty}</p>
                    </div>
                )}
                
                {filteredMenu.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex gap-4 transition-transform active:scale-[0.99]">
                        <div className="w-28 h-28 bg-gray-100 rounded-xl shrink-0 overflow-hidden relative">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Utensils size={24}/>
                                </div>
                            )}
                            {!item.isAvailable && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold uppercase border border-white px-2 py-1 rounded">Sold Out</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 flex flex-col min-w-0">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 truncate">{getItemName(item)}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{getItemDesc(item)}</p>
                            </div>
                            
                            <div className="mt-auto flex justify-between items-end">
                                <div>
                                    <span className="block font-bold text-lg text-teal-700">{item.price.toLocaleString('vi-VN')}</span>
                                    {item.unit && <span className="text-[10px] text-gray-400 font-medium uppercase">/ {item.unit}</span>}
                                </div>
                                
                                {item.isAvailable && (
                                    <button 
                                        onClick={() => addToCart(item)}
                                        className="w-9 h-9 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-teal-200 active:scale-90 transition-all hover:bg-teal-700"
                                    >
                                        <Plus size={20} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- FLOATING ACTIONS --- */}
            <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-20 pointer-events-none">
                <button 
                    onClick={() => setIsCallModalOpen(true)}
                    className="w-12 h-12 bg-white text-red-500 rounded-full shadow-lg border border-red-100 flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
                >
                    <Bell size={20} className="fill-red-500"/>
                </button>
                <button 
                    onClick={() => setIsEntertainmentOpen(true)}
                    className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto active:scale-90 transition-transform animate-bounce-slow"
                >
                    <Gift size={22}/>
                </button>
            </div>

            {/* --- BOTTOM CART BAR --- */}
            {cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-pb">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-gray-900 text-white p-1 pr-4 rounded-[1.25rem] flex items-center justify-between shadow-xl active:scale-[0.99] transition-transform"
                    >
                        <div className="flex items-center">
                            <div className="bg-white text-gray-900 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm border-2 border-gray-900">
                                {cartCount}
                            </div>
                            <span className="ml-4 font-bold text-base">{t.viewCart}</span>
                        </div>
                        <span className="font-bold text-lg">{cartTotal.toLocaleString('vi-VN')}</span>
                    </button>
                </div>
            )}

            {/* --- CART BOTTOM SHEET --- */}
            {isCartOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                    <div className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300 safe-area-pb">
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsCartOpen(false)}>
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        </div>

                        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 shrink-0">
                            <h2 className="text-xl font-black text-gray-900">{t.cartTitle}</h2>
                            <button onClick={() => setIsCartOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-600 hover:bg-gray-200">
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map((i, idx) => (
                                <div key={idx} className="flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                                        {i.item.image ? <img src={i.item.image} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Utensils size={16} className="text-gray-400"/></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{getItemName(i.item)}</h4>
                                        <p className="text-xs text-teal-600 font-bold mt-0.5">{i.item.price.toLocaleString('vi-VN')}đ</p>
                                    </div>
                                    <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
                                        <button onClick={() => updateQuantity(i.item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 active:scale-90 transition-transform"><Minus size={16}/></button>
                                        <span className="w-8 text-center font-bold text-sm">{i.quantity}</span>
                                        <button onClick={() => updateQuantity(i.item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-green-600 active:scale-90 transition-transform"><Plus size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0 space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.guestCountLabel}</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-3 text-gray-400"/>
                                        <input 
                                            type="number" min="1" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex-[2]">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t.noteLabel}</label>
                                    <input 
                                        type="text" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder={t.notePlaceholder}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-end pt-2">
                                <span className="text-gray-500 font-medium">{t.total}</span>
                                <span className="text-2xl font-black text-gray-900">{cartTotal.toLocaleString('vi-VN')}</span>
                            </div>

                            <button 
                                onClick={handlePlaceOrder}
                                className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-teal-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                            >
                                {orderStatus === 'SUBMITTING' ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {t.submitting}</> : t.placeOrder}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* CALL MODAL */}
            {isCallModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setIsCallModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pointer-events-auto animate-in slide-in-from-bottom duration-300 z-10 safe-area-pb">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-900">{t.callConfirm}</h3>
                            <button onClick={() => setIsCallModalOpen(false)} className="bg-gray-100 p-2 rounded-full"><ChevronDown/></button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => handleCallWaiter(t.callReasonWater)} className="aspect-square bg-blue-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-100 active:scale-95 transition-all border border-blue-100">
                                <Coffee className="text-blue-500" size={28}/>
                                <span className="text-xs font-bold text-blue-700">{t.callReasonWater}</span>
                            </button>
                            <button onClick={() => handleCallWaiter(t.callReasonBill)} className="aspect-square bg-green-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-green-100 active:scale-95 transition-all border border-green-100">
                                <FileText className="text-green-500" size={28}/>
                                <span className="text-xs font-bold text-green-700">{t.callReasonBill}</span>
                            </button>
                            <button onClick={() => handleCallWaiter(t.callReasonHelp)} className="aspect-square bg-orange-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-orange-100 active:scale-95 transition-all border border-orange-100">
                                <Info className="text-orange-500" size={28}/>
                                <span className="text-xs font-bold text-orange-700">{t.callReasonHelp}</span>
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
