
import React, { useState, useMemo } from 'react';
import { ShoppingCart, ChefHat, Search, Plus, Minus, X, CheckCircle, Info, Utensils, Coffee, IceCream, Beef } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { MenuItem } from '../types';

// MOCK DATA FOR MENU (Since we don't have a CMS yet)
const MOCK_MENU: MenuItem[] = [
    { id: 'm1', name: 'Gà đồi nướng mắc khén', nameEn: 'Grilled Hill Chicken w/ Mac Khen', price: 350000, category: 'MAIN', isAvailable: true, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80', description: 'Gà bản 100%, tẩm ướp gia vị Tây Bắc đặc trưng.' },
    { id: 'm2', name: 'Lẩu cá tầm Sapa', nameEn: 'Sapa Sturgeon Hotpot', price: 650000, category: 'MAIN', isAvailable: true, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', description: 'Cá tầm tươi sống, nước lẩu chua thanh.' },
    { id: 'm3', name: 'Thắng cố đặc biệt', nameEn: 'Special Thang Co', price: 150000, category: 'MAIN', isAvailable: true, image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80', description: 'Món ăn truyền thống của người H\'mong.' },
    { id: 'a1', name: 'Nộm hoa chuối', nameEn: 'Banana Flower Salad', price: 85000, category: 'APPETIZER', isAvailable: true, image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80' },
    { id: 'a2', name: 'Khoai tây chiên', nameEn: 'French Fries', price: 60000, category: 'APPETIZER', isAvailable: true, image: 'https://images.unsplash.com/photo-1573080496987-a199f8cd75c5?auto=format&fit=crop&w=800&q=80' },
    { id: 'd1', name: 'Rượu Táo Mèo', nameEn: 'Tao Meo Wine', price: 120000, category: 'DRINK', isAvailable: true, image: 'https://images.unsplash.com/photo-1569937756447-e17036d39695?auto=format&fit=crop&w=800&q=80' },
    { id: 'd2', name: 'Coca Cola', nameEn: 'Coke', price: 20000, category: 'DRINK', isAvailable: true, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80' },
    { id: 's1', name: 'Sữa chua nếp cẩm', nameEn: 'Yogurt w/ Fermented Rice', price: 35000, category: 'DESSERT', isAvailable: true, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80' },
];

interface GuestMenuProps {
    tableId: string;
}

export const GuestMenu: React.FC<GuestMenuProps> = ({ tableId }) => {
    const { submitGuestOrder } = useGlobalContext();
    const [language, setLanguage] = useState<'VI' | 'EN'>('VI');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderStatus, setOrderStatus] = useState<'NONE' | 'SUBMITTING' | 'SUCCESS'>('NONE');

    const categories = [
        { id: 'ALL', name: 'Tất cả', nameEn: 'All', icon: Utensils },
        { id: 'MAIN', name: 'Món chính', nameEn: 'Main Course', icon: Beef },
        { id: 'APPETIZER', name: 'Khai vị', nameEn: 'Appetizer', icon: Utensils },
        { id: 'DRINK', name: 'Đồ uống', nameEn: 'Drinks', icon: Coffee },
        { id: 'DESSERT', name: 'Tráng miệng', nameEn: 'Dessert', icon: IceCream },
    ];

    const filteredMenu = useMemo(() => {
        if (activeCategory === 'ALL') return MOCK_MENU;
        return MOCK_MENU.filter(item => item.category === activeCategory);
    }, [activeCategory]);

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
                <h1 className="text-3xl font-bold mb-2">Đặt món thành công!</h1>
                <p className="text-teal-100 mb-8">Nhà bếp đã nhận được đơn của bàn {tableId}.<br/>Món ăn sẽ được phục vụ trong giây lát.</p>
                <button 
                    onClick={() => setOrderStatus('NONE')}
                    className="bg-white text-teal-700 px-8 py-3 rounded-xl font-bold hover:bg-teal-50 shadow-lg"
                >
                    Gọi thêm món
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans">
            {/* Header */}
            <div className="bg-white sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center p-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Indigo Sapa</h1>
                        <p className="text-xs text-teal-600 font-bold flex items-center">
                            <Utensils size={12} className="mr-1"/> 
                            {language === 'VI' ? `Bàn ${tableId}` : `Table ${tableId}`}
                        </p>
                    </div>
                    <button 
                        onClick={() => setLanguage(l => l === 'VI' ? 'EN' : 'VI')}
                        className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600 border border-gray-200"
                    >
                        {language === 'VI' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
                    </button>
                </div>

                {/* Categories */}
                <div className="flex overflow-x-auto px-4 pb-3 gap-3 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                                activeCategory === cat.id 
                                ? 'bg-teal-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            <cat.icon size={16} />
                            {language === 'VI' ? cat.name : cat.nameEn}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMenu.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0 overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">{language === 'VI' ? item.name : item.nameEn}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{language === 'VI' ? item.description : item.descriptionEn}</p>
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
                            <span>{language === 'VI' ? 'Xem giỏ hàng' : 'View Cart'}</span>
                        </div>
                        <span>{cartTotal.toLocaleString('vi-VN')}đ</span>
                    </button>
                </div>
            )}

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end md:justify-center md:items-center">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{language === 'VI' ? 'Giỏ hàng của bạn' : 'Your Cart'}</h3>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map((i, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{language === 'VI' ? i.item.name : i.item.nameEn}</h4>
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
                                <span>{language === 'VI' ? 'Tổng cộng' : 'Total'}</span>
                                <span className="text-teal-700">{cartTotal.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <button 
                                onClick={handlePlaceOrder}
                                className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-teal-700 flex justify-center items-center gap-2"
                            >
                                {orderStatus === 'SUBMITTING' ? 'Đang gửi...' : (language === 'VI' ? 'Xác nhận gọi món' : 'Place Order')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
