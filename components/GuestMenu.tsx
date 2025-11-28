
import React, { useState, useMemo } from 'react';
import { ShoppingCart, ChefHat, Search, Plus, Minus, X, CheckCircle, Info, Utensils, Coffee, IceCream, Beef, Globe, Gift } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { MenuItem } from '../types';
import { EntertainmentHub } from './EntertainmentHub';

// MOCK DATA FOR MENU WITH 4 LANGUAGES
const MOCK_MENU: MenuItem[] = [
    { 
        id: 'm1', 
        name: 'Gà đồi nướng mắc khén', 
        nameEn: 'Grilled Hill Chicken w/ Mac Khen', 
        nameKo: '막켄 향신료 구운 산악 닭고기',
        nameFr: 'Poulet des Collines Grillé au Mac Khen',
        price: 350000, 
        category: 'MAIN', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80', 
        description: 'Gà bản 100%, tẩm ướp gia vị Tây Bắc đặc trưng.',
        descriptionEn: '100% free-range chicken, marinated with Northwest spices.',
        descriptionKo: '100% 토종닭, 북서부 특유의 향신료로 양념.',
        descriptionFr: 'Poulet 100% fermier, mariné aux épices du Nord-Ouest.'
    },
    { 
        id: 'm2', 
        name: 'Lẩu cá tầm Sapa', 
        nameEn: 'Sapa Sturgeon Hotpot', 
        nameKo: '사파 철갑상어 전골',
        nameFr: 'Fondue d\'Esturgeon de Sapa',
        price: 650000, 
        category: 'MAIN', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', 
        description: 'Cá tầm tươi sống, nước lẩu chua thanh.',
        descriptionEn: 'Fresh sturgeon, sour and light hotpot broth.',
        descriptionKo: '신선한 철갑상어, 시원하고 새콤한 육수.',
        descriptionFr: 'Esturgeon frais, bouillon de fondue aigre-doux.'
    },
    { 
        id: 'm3', 
        name: 'Thắng cố đặc biệt', 
        nameEn: 'Special Thang Co', 
        nameKo: '특별 탕꼬 (말고기 전골)',
        nameFr: 'Thang Co Spécial',
        price: 150000, 
        category: 'MAIN', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80', 
        description: 'Món ăn truyền thống của người H\'mong.',
        descriptionEn: 'Traditional dish of the H\'mong people.',
        descriptionKo: '흐몽족의 전통 요리.',
        descriptionFr: 'Plat traditionnel du peuple H\'mong.'
    },
    { 
        id: 'a1', 
        name: 'Nộm hoa chuối', 
        nameEn: 'Banana Flower Salad', 
        nameKo: '바나나 꽃 샐러드',
        nameFr: 'Salade de Fleurs de Bananier',
        price: 85000, 
        category: 'APPETIZER', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80' 
    },
    { 
        id: 'a2', 
        name: 'Khoai tây chiên', 
        nameEn: 'French Fries', 
        nameKo: '감자 튀김',
        nameFr: 'Frites',
        price: 60000, 
        category: 'APPETIZER', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1573080496987-a199f8cd75c5?auto=format&fit=crop&w=800&q=80' 
    },
    { 
        id: 'd1', 
        name: 'Rượu Táo Mèo', 
        nameEn: 'Tao Meo Wine', 
        nameKo: '타오 메오 와인 (사과주)',
        nameFr: 'Vin de Tao Meo',
        price: 120000, 
        category: 'DRINK', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1569937756447-e17036d39695?auto=format&fit=crop&w=800&q=80' 
    },
    { 
        id: 'd2', 
        name: 'Coca Cola', 
        nameEn: 'Coke', 
        nameKo: '코카콜라',
        nameFr: 'Coca Cola',
        price: 20000, 
        category: 'DRINK', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80' 
    },
    { 
        id: 's1', 
        name: 'Sữa chua nếp cẩm', 
        nameEn: 'Yogurt w/ Fermented Rice', 
        nameKo: '흑찹쌀 요거트',
        nameFr: 'Yaourt au Riz Gluant Noir',
        price: 35000, 
        category: 'DESSERT', 
        isAvailable: true, 
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80' 
    },
];

// --- TRANSLATION DICTIONARY ---
type Language = 'VI' | 'EN' | 'KO' | 'FR';

const TRANSLATIONS = {
    VI: {
        table: 'Bàn',
        all: 'Tất cả',
        main: 'Món chính',
        appetizer: 'Khai vị',
        drink: 'Đồ uống',
        dessert: 'Tráng miệng',
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
        entertainment: 'Giải trí & Quà'
    },
    EN: {
        table: 'Table',
        all: 'All',
        main: 'Main Course',
        appetizer: 'Appetizer',
        drink: 'Drinks',
        dessert: 'Dessert',
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
        entertainment: 'Fun & Gifts'
    },
    KO: {
        table: '테이블',
        all: '전체',
        main: '메인 요리',
        appetizer: '에피타이저',
        drink: '음료',
        dessert: '디저트',
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
        entertainment: '게임 및 선물'
    },
    FR: {
        table: 'Table',
        all: 'Tout',
        main: 'Plat Principal',
        appetizer: 'Entrée',
        drink: 'Boissons',
        dessert: 'Dessert',
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
        entertainment: 'Jeux & Cadeaux'
    }
};

const LANG_OPTIONS: {code: Language, label: string, flag: string}[] = [
    { code: 'VI', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: 'KO', label: '한국어', flag: '🇰🇷' },
    { code: 'FR', label: 'Français', flag: '🇫🇷' },
];

interface GuestMenuProps {
    tableId: string;
}

export const GuestMenu: React.FC<GuestMenuProps> = ({ tableId }) => {
    const { submitGuestOrder } = useGlobalContext();
    const [language, setLanguage] = useState<Language>('VI');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isEntertainmentOpen, setIsEntertainmentOpen] = useState(false);
    const [orderStatus, setOrderStatus] = useState<'NONE' | 'SUBMITTING' | 'SUCCESS'>('NONE');
    const [searchTerm, setSearchTerm] = useState('');

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

    const categories = [
        { id: 'ALL', name: t.all, icon: Utensils },
        { id: 'MAIN', name: t.main, icon: Beef },
        { id: 'APPETIZER', name: t.appetizer, icon: Utensils },
        { id: 'DRINK', name: t.drink, icon: Coffee },
        { id: 'DESSERT', name: t.dessert, icon: IceCream },
    ];

    const filteredMenu = useMemo(() => {
        let items = MOCK_MENU;
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
    }, [activeCategory, searchTerm, language]);

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
        await submitGuestOrder(tableId, cart);
        setCart([]);
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
                    <div className="col-span-full text-center py-10 text-gray-400 italic">{t.empty}</div>
                )}
                {filteredMenu.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0 overflow-hidden relative">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">{getItemName(item)}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{getItemDesc(item)}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <span className="font-bold text-teal-700">{item.price.toLocaleString('vi-VN')}đ</span>
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
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{t.cartTitle}</h3>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0">
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-bold text-gray-800 line-clamp-1">{getItemName(i.item)}</h4>
                                        <p className="text-xs text-teal-600 font-bold">{i.item.price.toLocaleString('vi-VN')}đ</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(i.item.id, -1)} className="w-7 h-7 bg-white rounded flex items-center justify-center text-gray-600 shadow-sm"><Minus size={14}/></button>
                                        <span className="text-sm font-bold w-4 text-center">{i.quantity}</span>
                                        <button onClick={() => updateQuantity(i.item.id, 1)} className="w-7 h-7 bg-white rounded flex items-center justify-center text-gray-600 shadow-sm"><Plus size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t bg-gray-50 space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold">
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
