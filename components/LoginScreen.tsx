import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { LOGO_URL } from '../App';

export const LoginScreen: React.FC = () => {
  const { login, requestNotificationPermission, unlockAudio } = useGlobalContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // CRITICAL FOR IOS: Unlock audio on user interaction
    unlockAudio();

    // User Gesture: Request Permission here if not granted
    await requestNotificationPermission();

    const success = login(username, password);
    if (!success) {
      setError('Mã nhân viên hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="bg-gray-50 p-8 text-center border-b border-gray-100 flex flex-col items-center">
          <img 
            src={LOGO_URL} 
            alt="Indigo Logo" 
            className="w-32 h-32 object-contain mb-4 drop-shadow-sm" 
          />
          <h1 className="text-2xl font-extrabold text-gray-900">Indigo Restaurant</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Nhà hàng Lá Chàm Sapa</p>
        </div>

        {/* Form Content */}
        <div className="p-8">
           <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center animate-in slide-in-from-top-2">
                        <AlertCircle size={16} className="mr-2 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Mã nhân viên / SĐT</label>
                    <div className="relative">
                        <div className="absolute left-3 top-3 text-gray-400"><User size={20}/></div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                            placeholder="Nhập mã nhân viên..."
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Mật khẩu</label>
                    <div className="relative">
                        <div className="absolute left-3 top-3 text-gray-400"><Lock size={20}/></div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-200 flex items-center justify-center transition-all hover:scale-[1.02]"
                >
                    Đăng nhập <ArrowRight size={20} className="ml-2"/>
                </button>
           </form>
        </div>
      </div>
    </div>
  );
};