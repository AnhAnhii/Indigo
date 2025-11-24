
import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Save, Globe, Clock, Trash2, Plus, Database, CheckCircle, AlertTriangle, HelpCircle, X, Crosshair, BellRing, Loader2, Info, Edit2, Router } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { WifiConfig, ShiftConfig } from '../types';
import { sheetService } from '../services/sheetService';

type SettingsTab = 'LOCATION' | 'WIFI' | 'RULES' | 'DATABASE';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('RULES');
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Wifi State
  const [newWifiSSID, setNewWifiSSID] = useState('');
  const [newWifiBSSID, setNewWifiBSSID] = useState(''); 
  const [editingWifiId, setEditingWifiId] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [locatingProgress, setLocatingProgress] = useState(0);
  
  const [sheetUrl, setSheetUrl] = useState('');

  useEffect(() => {
      setLocalSettings(settings);
      setSheetUrl(sheetService.getApiUrl());
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
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Clock className="mr-2 text-teal-600" size={20}/> Cấu hình Ca làm việc</h3>
                            <div className="space-y-4">
                                {localSettings.shiftConfigs.map((shift, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-gray-800">{shift.name} ({shift.code})</h4>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${shift.isSplitShift ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {shift.isSplitShift ? 'Ca Gãy' : 'Ca Thông'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Giờ bắt đầu</label>
                                                <input type="time" value={shift.startTime} onChange={(e) => updateShift(idx, 'startTime', e.target.value)} className="w-full mt-1 p-1.5 border rounded text-sm font-medium"/>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500">Giờ kết thúc</label>
                                                <input type="time" value={shift.endTime} onChange={(e) => updateShift(idx, 'endTime', e.target.value)} className="w-full mt-1 p-1.5 border rounded text-sm font-medium"/>
                                            </div>
                                            {shift.isSplitShift && (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500">Nghỉ từ</label>
                                                        <input type="time" value={shift.breakStart} onChange={(e) => updateShift(idx, 'breakStart', e.target.value)} className="w-full mt-1 p-1.5 border rounded text-sm font-medium text-orange-600"/>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500">Đến</label>
                                                        <input type="time" value={shift.breakEnd} onChange={(e) => updateShift(idx, 'breakEnd', e.target.value)} className="w-full mt-1 p-1.5 border rounded text-sm font-medium text-orange-600"/>
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

                {/* TAB: DATABASE */}
                {activeTab === 'DATABASE' && (
                    <div className="space-y-6 animate-in fade-in">
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Database className="mr-2 text-teal-600" size={20}/> Kết nối Google Sheet</h3>
                            <p className="text-sm text-gray-500 mb-4">Hệ thống sử dụng Google Sheet làm cơ sở dữ liệu (Backend). Dán link Web App URL của Apps Script vào đây.</p>
                            
                            <div className="bg-gray-100 p-4 rounded-xl font-mono text-xs break-all border border-gray-200 text-gray-600">
                                {sheetUrl}
                            </div>
                            <p className="text-xs text-red-500 mt-2 flex items-center"><AlertTriangle size={12} className="mr-1"/> Link này được cấu hình cứng trong mã nguồn (services/sheetService.ts).</p>
                         </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
