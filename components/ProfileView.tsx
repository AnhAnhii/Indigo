
import React, { useState, useRef } from 'react';
import { User, Lock, Camera, Mail, Phone, Shield, Key, Save, DollarSign } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';

export const ProfileView: React.FC = () => {
  const { currentUser, updateEmployee, changePassword, registerEmployeeFace } = useGlobalContext();
  
  const [activeTab, setActiveTab] = useState<'INFO' | 'SECURITY'>('INFO');
  
  // Info State
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  
  // Password State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  if (!currentUser) return null;

  const handleSaveInfo = () => {
      updateEmployee({
          ...currentUser,
          phone,
          email
      });
      alert("Cập nhật thông tin thành công!");
  }

  const handleChangePassword = () => {
      if (oldPass !== (currentUser.password || '123456')) {
          alert("Mật khẩu cũ không đúng!");
          return;
      }
      if (newPass !== confirmPass) {
          alert("Mật khẩu xác nhận không khớp!");
          return;
      }
      if (newPass.length < 6) {
          alert("Mật khẩu phải có ít nhất 6 ký tự");
          return;
      }
      
      changePassword(currentUser.id, newPass);
      alert("Đổi mật khẩu thành công!");
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
  }

  // Camera Logic
  const startCamera = async () => {
      try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          setStream(s);
          setIsCameraOpen(true);
          setTimeout(() => {
              if (videoRef.current) videoRef.current.srcObject = s;
          }, 100);
      } catch (e) {
          alert("Không thể truy cập camera");
      }
  }

  const capturePhoto = () => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          // RESIZE FOR GOOGLE SHEETS STORAGE (Max 50k chars)
          const MAX_WIDTH = 400;
          const scale = MAX_WIDTH / videoRef.current.videoWidth;
          canvas.width = MAX_WIDTH;
          canvas.height = videoRef.current.videoHeight * scale;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          // Compress quality 0.6
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          
          registerEmployeeFace(currentUser.id, base64); // Also updates avatar
          stopCamera();
      }
  }

  const stopCamera = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsCameraOpen(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-teal-500 to-teal-700 z-0"></div>
          
          <div className="relative z-10 mt-8 md:mt-0 md:ml-4">
              <div className="w-28 h-28 rounded-full bg-white p-1 shadow-lg relative group">
                  <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-4xl font-bold text-gray-400">
                      {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                          currentUser.name.charAt(0)
                      )}
                  </div>
                  <button onClick={startCamera} className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full shadow-md hover:bg-teal-700 transition-colors">
                      <Camera size={16} />
                  </button>
              </div>
          </div>
          
          <div className="relative z-10 text-center md:text-left mt-2">
              <h2 className="text-2xl font-bold text-gray-900">{currentUser.name}</h2>
              <p className="text-gray-500 font-medium">{currentUser.role} • ID: {currentUser.id}</p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                   <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full border">
                       <DollarSign size={14} className="mr-1 text-green-600"/> Lương: {currentUser.hourlyRate.toLocaleString('vi-VN')}đ/h
                   </div>
                   <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full border">
                       <Shield size={14} className="mr-1 text-blue-600"/> Trợ cấp: {(currentUser.allowance || 0).toLocaleString('vi-VN')}đ
                   </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="md:col-span-1 space-y-2">
              <button 
                  onClick={() => setActiveTab('INFO')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center transition-colors ${activeTab === 'INFO' ? 'bg-white text-teal-700 shadow-sm border border-teal-100' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                  <User size={18} className="mr-3"/> Thông tin chung
              </button>
              <button 
                  onClick={() => setActiveTab('SECURITY')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center transition-colors ${activeTab === 'SECURITY' ? 'bg-white text-teal-700 shadow-sm border border-teal-100' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                  <Lock size={18} className="mr-3"/> Bảo mật
              </button>
          </div>

          {/* Content */}
          <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {activeTab === 'INFO' && (
                  <div className="space-y-6 animate-in fade-in">
                      <h3 className="text-lg font-bold text-gray-900 border-b pb-4 mb-4">Thông tin liên hệ</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-bold text-gray-500 mb-2">Số điện thoại</label>
                              <div className="relative">
                                  <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                                  <input 
                                    type="text" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-500 mb-2">Email</label>
                              <div className="relative">
                                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                  <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-end pt-4">
                          <button onClick={handleSaveInfo} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 shadow-md flex items-center">
                              <Save size={18} className="mr-2" /> Lưu thay đổi
                          </button>
                      </div>
                  </div>
              )}

              {activeTab === 'SECURITY' && (
                  <div className="space-y-6 animate-in fade-in">
                      <h3 className="text-lg font-bold text-gray-900 border-b pb-4 mb-4">Đổi mật khẩu</h3>
                      <div className="max-w-md space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-500 mb-2">Mật khẩu hiện tại</label>
                              <div className="relative">
                                  <Key className="absolute left-3 top-3 text-gray-400" size={18} />
                                  <input 
                                    type="password" 
                                    value={oldPass} 
                                    onChange={(e) => setOldPass(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-500 mb-2">Mật khẩu mới</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                  <input 
                                    type="password" 
                                    value={newPass} 
                                    onChange={(e) => setNewPass(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-500 mb-2">Xác nhận mật khẩu mới</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                  <input 
                                    type="password" 
                                    value={confirmPass} 
                                    onChange={(e) => setConfirmPass(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-start pt-4">
                          <button onClick={handleChangePassword} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 shadow-md flex items-center">
                              <Shield size={18} className="mr-2" /> Cập nhật mật khẩu
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Camera Modal Overlay */}
      {isCameraOpen && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
              <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden border-4 border-gray-800">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                   <div className="absolute bottom-8 left-0 w-full flex justify-center gap-8 items-center">
                       <button onClick={stopCamera} className="text-white font-bold bg-gray-800/50 px-6 py-2 rounded-full backdrop-blur-md">Hủy</button>
                       <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-teal-500"></button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};
