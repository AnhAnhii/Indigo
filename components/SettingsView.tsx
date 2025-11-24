
import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Save, Globe, Clock, Trash2, Plus, Database, CheckCircle, AlertTriangle, HelpCircle, X, Crosshair, BellRing, Loader2 } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { WifiConfig, ShiftConfig } from '../types';
import { sheetService } from '../services/sheetService';

type SettingsTab = 'LOCATION' | 'WIFI' | 'RULES' | 'DATABASE';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('RULES');
  const [localSettings, setLocalSettings] = useState(settings);
  const [newWifiSSID, setNewWifiSSID] = useState('');
  const [newWifiBSSID, setNewWifiBSSID] = useState(''); 
  const [showHelpWifi, setShowHelpWifi] = useState(false); 
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

  const addWifi = () => {
      if (!newWifiSSID) return;
      const newWifi: WifiConfig = {
          id: Date.now().toString(),
          name: newWifiSSID,
          bssid: newWifiBSSID || 'Unknown',
          isActive: true
      };
      setLocalSettings({
          ...localSettings,
          wifis: [...localSettings.wifis, newWifi]
      });
      setNewWifiSSID('');
      setNewWifiBSSID('');
  };

  const removeWifi = (id: string) => {
      setLocalSettings({
          ...localSettings,
          wifis: localSettings.wifis.filter(w => w.id !== id)
      });
  };
  
  const updateShift = (index: number, field: keyof ShiftConfig, value: any) => {
      const updatedShifts = [...localSettings.shiftConfigs];
      updatedShifts[index] = { ...updatedShifts[index], [field]: value };
      setLocalSettings({
          ...localSettings,
          shiftConfigs: updatedShifts
      });
  };

  // SMART LOCATION SAMPLING FOR ADMIN
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

          navigator.geolocation.getCurrentPosition(
              (position) => {
                  samples.push(position.coords);
                  setLocatingProgress(count + 1);
                  setTimeout(() => collectSample(count + 1), 800); // Delay between samples
              },
              (error) => {
                  console.error(error);
                  alert("Lỗi khi lấy mẫu GPS. Vui lòng thử lại.");
                  setIsLocating(false);
              },
              { enableHighAccuracy: true }
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
                    <MapPin size={18} className="mr-3"/> Địa điểm & GPS
                </button>
                <button 
                    onClick={() => setActiveTab('WIFI')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'WIFI' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Wifi size={18} className="mr-3"/> Cấu hình Wifi
                </button>
                <button 
                    onClick={() => setActiveTab('DATABASE')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'DATABASE' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Database size={18} className="mr-3"/> Kết nối Dữ liệu
                </button>
            </div>

            {/* Main Config Area */}
            <div className="col-span-1 md:col-span-3 space-y-6">
                
                {/* TAB: RULES & SHIFTS */}
                {activeTab === 'RULES' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                        <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Quy tắc & Ca Làm Việc</h3>
                            <p className="text-sm text-gray-500">Cấu hình thời gian chấm công và ra đồ.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Clock size={16}/> Cho phép đi muộn (phút)
                            </label>
                            <input 
                                type="number" 
                                value={localSettings.rules.allowedLateMinutes}
                                onChange={(e) => setLocalSettings({...localSettings, rules: {...localSettings.rules, allowedLateMinutes: Number(e.target.value)}})}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">Quá thời gian này sẽ tính là Đi muộn.</p>
                        </div>
                        
                        <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                            <label className="block text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                                <BellRing size={16}/> Cảnh báo ra đồ muộn sau (phút)
                            </label>
                            <input 
                                type="number" 
                                value={localSettings.servingConfig?.lateAlertMinutes || 20}
                                onChange={(e) => setLocalSettings({
                                    ...localSettings, 
                                    servingConfig: { ...localSettings.servingConfig, lateAlertMinutes: Number(e.target.value) }
                                })}
                                className="w-full border border-red-200 rounded-lg p-2.5 text-sm font-bold text-red-800 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Đoàn khách chờ quá lâu sẽ hiện cảnh báo Đỏ.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-700">Danh sách Ca Làm Việc</h4>
                        {localSettings.shiftConfigs.map((shift, idx) => (
                            <div key={shift.code} className="p-4 border rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-gray-800 text-lg">{shift.name} ({shift.code})</h4>
                                    {shift.isSplitShift && <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">Ca Gãy</span>}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">Giờ Bắt Đầu</label>
                                        <input 
                                            type="time" 
                                            value={shift.startTime}
                                            onChange={(e) => updateShift(idx, 'startTime', e.target.value)}
                                            className="w-full border rounded-lg p-2 text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">Giờ Kết Thúc</label>
                                        <input 
                                            type="time" 
                                            value={shift.endTime}
                                            onChange={(e) => updateShift(idx, 'endTime', e.target.value)}
                                            className="w-full border rounded-lg p-2 text-sm font-mono"
                                        />
                                    </div>
                                    
                                    {shift.isSplitShift && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-purple-500 block mb-1">Nghỉ từ</label>
                                                <input 
                                                    type="time" 
                                                    value={shift.breakStart || ''}
                                                    onChange={(e) => updateShift(idx, 'breakStart', e.target.value)}
                                                    className="w-full border border-purple-200 rounded-lg p-2 text-sm font-mono bg-purple-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-purple-500 block mb-1">Nghỉ đến</label>
                                                <input 
                                                    type="time" 
                                                    value={shift.breakEnd || ''}
                                                    onChange={(e) => updateShift(idx, 'breakEnd', e.target.value)}
                                                    className="w-full border border-purple-200 rounded-lg p-2 text-sm font-mono bg-purple-50"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* TAB: LOCATION */}
                {activeTab === 'LOCATION' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Vị trí nhà hàng</h3>
                                <p className="text-sm text-gray-500">Thiết lập bán kính cho phép chấm công GPS.</p>
                            </div>
                        </div>
                        
                        {/* UPDATED BUTTON WITH SAMPLING */}
                        <button 
                            onClick={handleGetCurrentLocation}
                            disabled={isLocating}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-blue-700 flex items-center transition-all"
                        >
                            {isLocating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Lấy mẫu {locatingProgress}/5...
                                </>
                            ) : (
                                <>
                                    <Crosshair size={16} className="mr-2" />
                                    Lấy mẫu vị trí (Chính xác cao)
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tên địa điểm</label>
                            <input 
                                type="text" 
                                value={localSettings.location.name}
                                onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, name: e.target.value}})}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bán kính cho phép (mét)</label>
                            <input 
                                type="number" 
                                value={localSettings.location.radiusMeters}
                                onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, radiusMeters: Number(e.target.value)}})}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                            />
                            <p className="text-xs text-gray-500 mt-1">Khuyên dùng: 50m - 100m (để bù sai số GPS trong nhà)</p>
                        </div>
                    </div>
                    
                    {/* Display Lat/Long more prominently */}
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative overflow-hidden">
                         {isLocating && <div className="absolute top-0 left-0 w-full h-1 bg-blue-200"><div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${locatingProgress * 20}%`}}></div></div>}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Vĩ độ (Latitude)</label>
                                <input 
                                    type="number" 
                                    value={localSettings.location.latitude}
                                    onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, latitude: Number(e.target.value)}})}
                                    className="w-full border rounded-lg p-2.5 text-sm font-mono text-blue-700 bg-white"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Kinh độ (Longitude)</label>
                                <input 
                                    type="number" 
                                    value={localSettings.location.longitude}
                                    onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, longitude: Number(e.target.value)}})}
                                    className="w-full border rounded-lg p-2.5 text-sm font-mono text-blue-700 bg-white" 
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-3 italic">
                            <InfoIcon size={12} className="inline mr-1"/>
                            Mẹo: Hãy đứng ở trung tâm quán và bấm "Lấy mẫu vị trí" để hệ thống tự động tính trung bình cộng tọa độ, giảm sai số trôi (GPS Drift).
                        </p>
                    </div>
                </div>
                )}

                {activeTab === 'WIFI' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center space-x-3">
                            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                                <Wifi size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Wifi Hợp lệ</h3>
                                <p className="text-sm text-gray-500">Nhập SSID và BSSID để chống giả mạo.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowHelpWifi(true)}
                            className="text-teal-600 text-sm font-medium flex items-center hover:underline"
                        >
                            <HelpCircle size={16} className="mr-1"/> Cách lấy BSSID?
                        </button>
                    </div>

                    <div className="space-y-3 mb-6">
                        {localSettings.wifis.map(wifi => (
                         <div key={wifi.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                             <div className="flex items-center">
                                 <Wifi size={20} className="text-teal-600 mr-3"/>
                                 <div>
                                     <p className="font-bold text-gray-800 text-sm">{wifi.name}</p>
                                     <p className="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">BSSID: {wifi.bssid}</p>
                                 </div>
                             </div>
                             <button onClick={() => removeWifi(wifi.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                                 <Trash2 size={18} />
                             </button>
                         </div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t pt-4">
                        <input 
                            type="text" 
                            placeholder="Tên Wifi (SSID)..." 
                            value={newWifiSSID}
                            onChange={(e) => setNewWifiSSID(e.target.value)}
                            className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <input 
                            type="text" 
                            placeholder="Địa chỉ MAC (BSSID)..." 
                            value={newWifiBSSID}
                            onChange={(e) => setNewWifiBSSID(e.target.value)}
                            className="border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                        />
                        <button onClick={addWifi} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center hover:bg-gray-800">
                            <Plus size={16} className="mr-1"/> Thêm Wifi
                        </button>
                    </div>
                </div>
                )}

                {activeTab === 'DATABASE' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                        <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                            <div className="bg-green-100 p-2 rounded-full text-green-600">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Trạng thái kết nối</h3>
                                <p className="text-sm text-gray-500">Quản lý kết nối đến cơ sở dữ liệu Google Sheets.</p>
                            </div>
                        </div>

                        <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-center gap-3 mb-6">
                            <CheckCircle className="text-green-600 shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-green-900 text-sm">Hệ thống đang kết nối tự động</h4>
                                <p className="text-xs text-green-700 mt-1">
                                    API URL đã được cấu hình trong mã nguồn. Mọi thiết bị truy cập sẽ tự động sử dụng kết nối này.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">API Endpoint (Cấu hình trong services/sheetService.ts)</label>
                            <div className="w-full border bg-gray-50 rounded-lg p-3 text-sm font-mono text-gray-600 break-all">
                                {sheetUrl || "Chưa tìm thấy URL. Vui lòng kiểm tra file sheetService.ts"}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* BSSID HELP MODAL */}
        {showHelpWifi && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Cách lấy BSSID (MAC Address)</h3>
                        <button onClick={() => setShowHelpWifi(false)}><X size={20} className="text-gray-500"/></button>
                    </div>
                    <div className="p-6 text-sm text-gray-700 space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="font-bold text-blue-800 mb-1">1. Trên máy tính Windows:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Mở <b>Command Prompt</b> (CMD).</li>
                                <li>Gõ lệnh: <code className="bg-white px-1 rounded font-mono text-xs border">netsh wlan show interfaces</code></li>
                                <li>Tìm dòng <b>BSSID</b> và copy giá trị đó (VD: 00:11:22:33:44:55).</li>
                            </ul>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="font-bold text-gray-800 mb-1">2. Trên máy Mac (macOS):</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Giữ phím <b>Option</b> (Alt) và click vào biểu tượng Wifi trên thanh menu.</li>
                                <li>Dòng <b>BSSID</b> sẽ hiện ra trong menu.</li>
                            </ul>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="font-bold text-gray-800 mb-1">3. Trên điện thoại:</p>
                            <p>Cài đặt ứng dụng <b>Wifi Analyzer</b> (Android) hoặc <b>Network Analyzer</b> (iOS) để xem chi tiết.</p>
                        </div>
                    </div>
                    <div className="p-4 border-t text-right">
                        <button onClick={() => setShowHelpWifi(false)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold">Đã hiểu</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

// Helper Icon component for SettingsView
const InfoIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);
