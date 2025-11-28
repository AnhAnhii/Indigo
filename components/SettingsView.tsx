
import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Save, Globe, Clock, Trash2, Plus, Database, CheckCircle, AlertTriangle, HelpCircle, X, Crosshair, BellRing, Loader2, Info, Edit2, Router, Cloud, ToggleRight, Smartphone, MessageSquare } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { WifiConfig, ShiftConfig } from '../types';

type SettingsTab = 'LOCATION' | 'WIFI' | 'RULES' | 'DATABASE' | 'NOTIFICATION' | 'TIME';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, testNotification } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('RULES');
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Wifi State
  const [newWifiSSID, setNewWifiSSID] = useState('');
  const [newWifiBSSID, setNewWifiBSSID] = useState(''); 
  const [editingWifiId, setEditingWifiId] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [locatingProgress, setLocatingProgress] = useState(0);

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
      updateSettings(localSettings);
      alert("Đã lưu cấu hình hệ thống lên Cloud!");
  }

  // --- WIFI CRUD ---
  const handleSaveWifi = () => {
      if (!newWifiSSID.trim()) {
          alert("Vui lòng nhập tên Wifi (SSID)");
          return;
      }

      let updatedWifis = [...localSettings.wifis];

      if (editingWifiId) {
          // Update Existing
          updatedWifis = updatedWifis.map(w => w.id === editingWifiId ? { 
              ...w, 
              name: newWifiSSID, 
              bssid: newWifiBSSID || 'Unknown' 
          } : w);
          setEditingWifiId(null);
      } else {
          // Add New
          const newWifi: WifiConfig = {
              id: Date.now().toString(),
              name: newWifiSSID,
              bssid: newWifiBSSID || 'Unknown',
              isActive: true
          };
          updatedWifis.push(newWifi);
      }

      setLocalSettings({
          ...localSettings,
          wifis: updatedWifis
      });
      setNewWifiSSID('');
      setNewWifiBSSID('');
  };

  const handleEditWifi = (wifi: WifiConfig) => {
      setNewWifiSSID(wifi.name);
      setNewWifiBSSID(wifi.bssid === 'Unknown' ? '' : wifi.bssid);
      setEditingWifiId(wifi.id);
  };

  const handleDeleteWifi = (id: string) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa Wifi này?")) {
          setLocalSettings({
              ...localSettings,
              wifis: localSettings.wifis.filter(w => w.id !== id)
          });
          if (editingWifiId === id) handleCancelEdit();
      }
  };

  const handleCancelEdit = () => {
      setNewWifiSSID('');
      setNewWifiBSSID('');
      setEditingWifiId(null);
  };
  
  // --- SHIFT CONFIG ---
  const handleAddShift = () => {
      const newShift: ShiftConfig = {
          code: `CA_${Date.now().toString().substr(-4)}`,
          name: 'Ca Mới',
          startTime: '08:00',
          endTime: '17:00',
          isSplitShift: false
      };
      setLocalSettings({
          ...localSettings,
          shiftConfigs: [...localSettings.shiftConfigs, newShift]
      });
  };

  const handleDeleteShift = (index: number) => {
      if(window.confirm("Bạn có chắc chắn muốn xóa ca làm việc này?")) {
          const updatedShifts = [...localSettings.shiftConfigs];
          updatedShifts.splice(index, 1);
          setLocalSettings({
              ...localSettings,
              shiftConfigs: updatedShifts
          });
      }
  };

  const updateShift = (index: number, field: keyof ShiftConfig, value: any) => {
      const updatedShifts = [...localSettings.shiftConfigs];
      updatedShifts[index] = { ...updatedShifts[index], [field]: value };
      setLocalSettings({
          ...localSettings,
          shiftConfigs: updatedShifts
      });
  };

  // SMART LOCATION SAMPLING FOR ADMIN (Reference Point)
  const handleGetCurrentLocation = () => {
      if (!navigator.geolocation) {
          alert("Trình duyệt không hỗ trợ định vị.");
          return;
      }
      setIsLocating(true);
      setLocatingProgress(0);
      
      const samples: GeolocationCoordinates[] = [];
      const TOTAL_SAMPLES = 5;

      const collectSample = (count: number) => {
          if (count >= TOTAL_SAMPLES) {
              // Calculate Average
              const avgLat = samples.reduce((sum, s) => sum + s.latitude, 0) / TOTAL_SAMPLES;
              const avgLon = samples.reduce((sum, s) => sum + s.longitude, 0) / TOTAL_SAMPLES;
              
              setLocalSettings({
                  ...localSettings,
                  location: {
                      ...localSettings.location,
                      latitude: avgLat,
                      longitude: avgLon
                  }
              });
              setIsLocating(false);
              alert(`Đã lấy mẫu thành công! Tọa độ trung bình: ${avgLat.toFixed(6)}, ${avgLon.toFixed(6)}`);
              return;
          }

          // ADMIN MUST USE HIGH ACCURACY TO SET THE "TRUTH"
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  samples.push(position.coords);
                  setLocatingProgress(count + 1);
                  setTimeout(() => collectSample(count + 1), 1000); // 1s delay
              },
              (error) => {
                  console.error(error);
                  alert("Lỗi khi lấy mẫu GPS: " + error.message);
                  setIsLocating(false);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
      };

      collectSample(0);
  };

  const toggleNotificationSetting = (key: keyof typeof localSettings.notificationConfig) => {
      setLocalSettings(prev => ({
          ...prev,
          notificationConfig: {
              ...prev.notificationConfig,
              [key]: !prev.notificationConfig[key]
          }
      }));
  };

  if (!localSettings || !localSettings.rules) {
      return (
          <div className="flex items-center justify-center h-64">
              <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-500">Đang tải cấu hình...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Cấu hình hệ thống</h2>
                <p className="text-gray-500">Mọi thay đổi sẽ được đồng bộ cho tất cả nhân viên.</p>
            </div>
            <button 
                onClick={handleSave}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md flex items-center transition-colors"
            >
                <Save size={20} className="mr-2"/> Lưu đồng bộ Cloud
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Navigation */}
            <div className="col-span-1 space-y-1">
                <button 
                    onClick={() => setActiveTab('RULES')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'RULES' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Shield size={18} className="mr-3"/> Ca làm việc & Quy tắc
                </button>
                <button 
                    onClick={() => setActiveTab('NOTIFICATION')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'NOTIFICATION' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <BellRing size={18} className="mr-3"/> Cấu hình Thông báo
                </button>
                <button 
                    onClick={() => setActiveTab('LOCATION')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'LOCATION' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <MapPin size={18} className="mr-3"/> Vị trí nhà hàng
                </button>
                <button 
                    onClick={() => setActiveTab('WIFI')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'WIFI' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Wifi size={18} className="mr-3"/> Wifi Chấm công
                </button>
                <button 
                    onClick={() => setActiveTab('TIME')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'TIME' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Clock size={18} className="mr-3"/> Thời gian & NTP
                </button>
                 <button 
                    onClick={() => setActiveTab('DATABASE')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'DATABASE' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Database size={18} className="mr-3"/> Kết nối Database
                </button>
            </div>

            {/* Content */}
            <div className="col-span-1 md:col-span-3 space-y-6">
                
                {/* TAB: RULES & SHIFTS */}
                {activeTab === 'RULES' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Shield className="mr-2 text-teal-600" size={20}/> Quy định chung</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Số phút cho phép đi muộn</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                        <input 
                                            type="number" 
                                            value={localSettings.rules.allowedLateMinutes}
                                            onChange={(e) => setLocalSettings({...localSettings, rules: { ...localSettings.rules, allowedLateMinutes: Number(e.target.value) }})}
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Nhân viên đến sau thời gian này sẽ bị tính là "Đi muộn".</p>
                                </div>
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Cảnh báo ra đồ muộn (Phút)</label>
                                    <div className="relative">
                                        <AlertTriangle className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                        <input 
                                            type="number" 
                                            value={localSettings.servingConfig?.lateAlertMinutes || 15}
                                            onChange={(e) => setLocalSettings({...localSettings, servingConfig: { ...localSettings.servingConfig, lateAlertMinutes: Number(e.target.value) }})}
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Thời gian tối đa khách phải đợi trước khi hệ thống báo động đỏ.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-900 flex items-center"><Clock className="mr-2 text-teal-600" size={20}/> Cấu hình Ca làm việc</h3>
                                <button onClick={handleAddShift} className="text-sm text-white bg-teal-600 font-bold flex items-center hover:bg-teal-700 px-3 py-2 rounded-lg transition-colors shadow-sm">
                                    <Plus size={16} className="mr-1"/> Thêm ca mới
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {localSettings.shiftConfigs.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">Chưa có ca làm việc nào. Bấm "Thêm ca mới" để bắt đầu.</p>
                                )}
                                {localSettings.shiftConfigs.map((shift, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group shadow-sm">
                                        {/* Row 1: Name, Code & Delete */}
                                        <div className="flex justify-between items-start mb-4 gap-4">
                                            <div className="grid grid-cols-2 gap-4 flex-1">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tên ca làm việc</label>
                                                    <input 
                                                        type="text" 
                                                        value={shift.name} 
                                                        onChange={(e) => updateShift(idx, 'name', e.target.value)}
                                                        className="w-full border-b border-dashed border-gray-300 focus:border-teal-500 outline-none bg-transparent font-bold text-gray-800 text-sm py-1 transition-colors"
                                                        placeholder="VD: Ca Sáng"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mã ca (Code)</label>
                                                    <input 
                                                        type="text" 
                                                        value={shift.code} 
                                                        onChange={(e) => updateShift(idx, 'code', e.target.value)}
                                                        className="w-full border-b border-dashed border-gray-300 focus:border-teal-500 outline-none bg-transparent font-mono text-sm text-gray-600 py-1 transition-colors"
                                                        placeholder="VD: CA_SANG"
                                                    />
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteShift(idx)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>

                                        {/* Row 2: Type Toggle */}
                                        <div className="flex items-center mb-4 bg-white p-2 rounded-lg border border-gray-100 w-fit">
                                            <label className="flex items-center cursor-pointer select-none relative">
                                                <input 
                                                    type="checkbox" 
                                                    checked={shift.isSplitShift} 
                                                    onChange={(e) => updateShift(idx, 'isSplitShift', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                                <span className={`ml-2 text-xs font-bold ${shift.isSplitShift ? 'text-purple-600' : 'text-blue-600'}`}>
                                                    {shift.isSplitShift ? 'Ca Gãy (Có nghỉ giữa giờ)' : 'Ca Thông (Làm liền mạch)'}
                                                </span>
                                            </label>
                                        </div>

                                        {/* Row 3: Times */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 block mb-1">Bắt đầu ca</label>
                                                <input type="time" value={shift.startTime} onChange={(e) => updateShift(idx, 'startTime', e.target.value)} className="w-full p-2 border rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-teal-500 outline-none"/>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 block mb-1">Kết thúc ca</label>
                                                <input type="time" value={shift.endTime} onChange={(e) => updateShift(idx, 'endTime', e.target.value)} className="w-full p-2 border rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-teal-500 outline-none"/>
                                            </div>
                                            {shift.isSplitShift && (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-bold text-orange-600 block mb-1">Nghỉ từ</label>
                                                        <input type="time" value={shift.breakStart} onChange={(e) => updateShift(idx, 'breakStart', e.target.value)} className="w-full p-2 border border-orange-200 rounded-lg text-sm font-medium bg-orange-50 text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-orange-600 block mb-1">Đến</label>
                                                        <input type="time" value={shift.breakEnd} onChange={(e) => updateShift(idx, 'breakEnd', e.target.value)} className="w-full p-2 border border-orange-200 rounded-lg text-sm font-medium bg-orange-50 text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none"/>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: NOTIFICATION */}
                {activeTab === 'NOTIFICATION' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                             <h3 className="font-bold text-gray-900 mb-4 flex items-center"><BellRing className="mr-2 text-teal-600" size={20}/> Tùy chọn thông báo</h3>
                             <p className="text-sm text-gray-500 mb-6">Chọn các sự kiện bạn muốn nhận thông báo đẩy trên điện thoại và máy tính.</p>

                             <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><BellRing size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Khách vào / Khách mới</h4>
                                            <p className="text-xs text-gray-500">Thông báo khi có đoàn khách mới hoặc khi ấn "Báo khách đến".</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={localSettings.notificationConfig.enableGuestArrival} onChange={() => toggleNotificationSetting('enableGuestArrival')} className="sr-only peer"/>
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><MessageSquare size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Đơn từ & Yêu cầu</h4>
                                            <p className="text-xs text-gray-500">Thông báo cho Quản lý khi nhân viên tạo đơn xin nghỉ/đổi ca.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={localSettings.notificationConfig.enableStaffRequest} onChange={() => toggleNotificationSetting('enableStaffRequest')} className="sr-only peer"/>
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><Edit2 size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Sổ Giao Ca</h4>
                                            <p className="text-xs text-gray-500">Thông báo khi có ghi chú mới trong sổ giao ca.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={localSettings.notificationConfig.enableHandover} onChange={() => toggleNotificationSetting('enableHandover')} className="sr-only peer"/>
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><AlertTriangle size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">Cảnh báo hệ thống (Chậm trễ)</h4>
                                            <p className="text-xs text-gray-500">Báo động khi khách đợi món quá thời gian quy định.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={localSettings.notificationConfig.enableSystemAlert} onChange={() => toggleNotificationSetting('enableSystemAlert')} className="sr-only peer"/>
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                             </div>

                             <div className="mt-6 border-t pt-4">
                                <button onClick={testNotification} className="flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
                                    <BellRing size={16} className="mr-2"/> Kiểm tra thử thiết bị này
                                </button>
                                <p className="text-xs text-gray-400 mt-1 ml-1">Bấm để kiểm tra quyền thông báo trên trình duyệt hiện tại.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: LOCATION */}
                {activeTab === 'LOCATION' && (
                    <div className="space-y-6 animate-in fade-in">
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center"><MapPin className="mr-2 text-teal-600" size={20}/> Tọa độ nhà hàng</h3>
                                    <p className="text-sm text-gray-500 mt-1">Vị trí gốc để so sánh khi nhân viên chấm công.</p>
                                </div>
                                <button 
                                    onClick={handleGetCurrentLocation}
                                    disabled={isLocating}
                                    className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 flex items-center"
                                >
                                    {isLocating ? <Loader2 className="animate-spin mr-2" size={16}/> : <Crosshair className="mr-2" size={16}/>}
                                    {isLocating ? `Đang lấy mẫu (${locatingProgress}/5)...` : 'Lấy vị trí hiện tại'}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tên địa điểm</label>
                                    <input 
                                        type="text" 
                                        value={localSettings.location.name}
                                        onChange={(e) => setLocalSettings({...localSettings, location: { ...localSettings.location, name: e.target.value }})}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Bán kính cho phép (mét)</label>
                                    <input 
                                        type="number" 
                                        value={localSettings.location.radiusMeters}
                                        onChange={(e) => setLocalSettings({...localSettings, location: { ...localSettings.location, radiusMeters: Number(e.target.value) }})}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Vĩ độ (Latitude)</label>
                                    <input 
                                        type="number" 
                                        value={localSettings.location.latitude}
                                        onChange={(e) => setLocalSettings({...localSettings, location: { ...localSettings.location, latitude: Number(e.target.value) }})}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Kinh độ (Longitude)</label>
                                    <input 
                                        type="number" 
                                        value={localSettings.location.longitude}
                                        onChange={(e) => setLocalSettings({...localSettings, location: { ...localSettings.location, longitude: Number(e.target.value) }})}
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start">
                                <AlertTriangle className="text-yellow-600 mr-2 mt-0.5" size={16} />
                                <p className="text-xs text-yellow-700">
                                    <strong>Lưu ý quan trọng:</strong> Khi thiết lập vị trí gốc, bạn (Admin) BẮT BUỘC phải đứng ở ngoài trời hoặc gần cửa sổ để điện thoại bắt được <strong>GPS Vệ Tinh (High Accuracy)</strong>. 
                                    Tuyệt đối không lấy vị trí khi đang ở sâu trong nhà vì sai số sẽ rất lớn, làm mốc so sánh bị sai lệch.
                                </p>
                            </div>
                         </div>
                    </div>
                )}

                {/* TAB: WIFI */}
                {activeTab === 'WIFI' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                             <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center"><Wifi className="mr-2 text-teal-600" size={20}/> Danh sách Wifi Chấm công</h3>
                                    <p className="text-sm text-gray-500 mt-1">Chỉ những Wifi này mới được phép sử dụng cho chế độ "Chấm công Wifi".</p>
                                </div>
                             </div>

                             {/* ADD / EDIT FORM */}
                             <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                                 <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">
                                     {editingWifiId ? 'Cập nhật thông tin Wifi' : 'Thêm Wifi mới'}
                                 </h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="relative">
                                         <Router className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                         <input 
                                            type="text" 
                                            value={newWifiSSID}
                                            onChange={(e) => setNewWifiSSID(e.target.value)}
                                            placeholder="Tên Wifi (SSID) - VD: Coffee_Guest"
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                         />
                                     </div>
                                     <div className="relative">
                                         <Database className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                         <input 
                                            type="text" 
                                            value={newWifiBSSID}
                                            onChange={(e) => setNewWifiBSSID(e.target.value)}
                                            placeholder="Địa chỉ MAC (BSSID) - Tùy chọn"
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm font-mono"
                                         />
                                     </div>
                                 </div>
                                 <div className="flex justify-end gap-3 mt-4">
                                     {editingWifiId && (
                                         <button 
                                            onClick={handleCancelEdit}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold"
                                         >
                                             Hủy
                                         </button>
                                     )}
                                     <button 
                                        onClick={handleSaveWifi}
                                        disabled={!newWifiSSID.trim()}
                                        className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-bold flex items-center disabled:opacity-50"
                                     >
                                         {editingWifiId ? <Save size={16} className="mr-2"/> : <Plus size={16} className="mr-2"/>}
                                         {editingWifiId ? 'Lưu thay đổi' : 'Thêm Wifi'}
                                     </button>
                                 </div>
                             </div>

                             {/* LIST */}
                             <div className="space-y-3">
                                 {localSettings.wifis.length === 0 && (
                                     <div className="text-center py-8 text-gray-400 text-sm italic">Chưa có Wifi nào được cấu hình.</div>
                                 )}
                                 {localSettings.wifis.map(wifi => (
                                     <div key={wifi.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-teal-200 transition-colors group">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
                                                 <Wifi size={20} />
                                             </div>
                                             <div>
                                                 <h4 className="font-bold text-gray-900">{wifi.name}</h4>
                                                 <p className="text-xs text-gray-500 font-mono">BSSID: {wifi.bssid || 'Unknown'}</p>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                onClick={() => handleEditWifi(wifi)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" 
                                                title="Sửa"
                                             >
                                                 <Edit2 size={16} />
                                             </button>
                                             <button 
                                                onClick={() => handleDeleteWifi(wifi.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" 
                                                title="Xóa"
                                             >
                                                 <Trash2 size={16} />
                                             </button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                )}
                
                {/* TAB: TIME */}
                {activeTab === 'TIME' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                             <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Clock className="mr-2 text-teal-600" size={20}/> Cấu hình Đồng bộ Thời gian (NTP)</h3>
                             <p className="text-sm text-gray-500 mb-6">Thiết lập máy chủ thời gian để đảm bảo tính chính xác khi chấm công trên các thiết bị trạm.</p>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-2">NTP Server Address</label>
                                     <div className="relative">
                                        <Globe className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                        <input 
                                            type="text" 
                                            value={localSettings.timeConfig?.ntpServer || 'pool.ntp.org'}
                                            onChange={(e) => setLocalSettings(prev => ({...prev, timeConfig: { ...prev.timeConfig, ntpServer: e.target.value }}))}
                                            placeholder="VD: pool.ntp.org"
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                     </div>
                                     <p className="text-xs text-gray-400 mt-1">Mặc định: pool.ntp.org (Việt Nam)</p>
                                 </div>
                                 
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-2">Múi giờ hệ thống</label>
                                     <div className="relative">
                                        <Clock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                        <input 
                                            type="text" 
                                            value={localSettings.timeConfig?.timezone || 'Asia/Ho_Chi_Minh'}
                                            onChange={(e) => setLocalSettings(prev => ({...prev, timeConfig: { ...prev.timeConfig, timezone: e.target.value }}))}
                                            placeholder="VD: Asia/Ho_Chi_Minh"
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                     </div>
                                 </div>
                             </div>

                             <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <h4 className="font-bold text-blue-800 text-sm">Lưu ý về đồng bộ</h4>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Cấu hình này sẽ được áp dụng cho các thiết bị chấm công chuyên dụng (Android/Kiosk) để đồng bộ giờ hệ thống. 
                                        Trên trình duyệt web thông thường, hệ thống sẽ sử dụng giờ của thiết bị người dùng nhưng đối chiếu với Server Time để phát hiện gian lận.
                                    </p>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* TAB: DATABASE */}
                {activeTab === 'DATABASE' && (
                    <div className="space-y-6 animate-in fade-in">
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Database className="mr-2 text-teal-600" size={20}/> Kết nối Supabase (Cloud Database)</h3>
                            <p className="text-sm text-gray-500 mb-4">Hệ thống đang sử dụng Supabase cho cơ sở dữ liệu thời gian thực.</p>
                            
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center text-green-700 font-bold">
                                <Cloud size={20} className="mr-2"/> Đã kết nối thành công
                            </div>
                            
                            <p className="text-xs text-gray-400 mt-2 font-mono">
                                Project URL: https://vnuchrpjvfxbghnrqfrq.supabase.co
                            </p>
                         </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
