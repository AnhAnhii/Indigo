
import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Save, Globe, Clock, Trash2, Plus, Database, CheckCircle, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { WifiConfig, ShiftConfig } from '../types';
import { sheetService } from '../services/sheetService';

type SettingsTab = 'LOCATION' | 'WIFI' | 'RULES' | 'DATABASE';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('RULES');
  const [localSettings, setLocalSettings] = useState(settings);
  const [newWifiSSID, setNewWifiSSID] = useState('');
  const [newWifiBSSID, setNewWifiBSSID] = useState(''); // Added state for BSSID input
  const [showHelpWifi, setShowHelpWifi] = useState(false); // Help Modal State
  
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
          bssid: newWifiBSSID || 'Unknown', // Use real input
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

  // Safety Check
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
                            <h3 className="text-lg font-bold text-gray-900">Quy tắc Ca Làm Việc</h3>
                            <p className="text-sm text-gray-500">Cấu hình thời gian cho các ca C, D, B1, B2.</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cho phép đi muộn (phút)</label>
                        <input 
                            type="number" 
                            value={localSettings.rules.allowedLateMinutes}
                            onChange={(e) => setLocalSettings({...localSettings, rules: {...localSettings.rules, allowedLateMinutes: Number(e.target.value)}})}
                            className="w-full md:w-1/3 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Áp dụng chung cho tất cả các ca.</p>
                    </div>

                    <div className="space-y-4">
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

                {/* OTHER TABS (LOCATION, WIFI, DATABASE) - KEEP AS IS */}
                {activeTab === 'LOCATION' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Vị trí nhà hàng</h3>
                            <p className="text-sm text-gray-500">Thiết lập bán kính cho phép chấm công GPS.</p>
                        </div>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bán kính (mét)</label>
                            <input 
                                type="number" 
                                value={localSettings.location.radiusMeters}
                                onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, radiusMeters: Number(e.target.value)}})}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vĩ độ (Latitude)</label>
                            <input 
                                type="number" 
                                value={localSettings.location.latitude}
                                onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, latitude: Number(e.target.value)}})}
                                className="w-full border rounded-lg p-2.5 text-sm bg-gray-50"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kinh độ (Longitude)</label>
                            <input 
                                type="number" 
                                value={localSettings.location.longitude}
                                onChange={(e) => setLocalSettings({...localSettings, location: {...localSettings.location, longitude: Number(e.target.value)}})}
                                className="w-full border rounded-lg p-2.5 text-sm bg-gray-50" 
                            />
                        </div>
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
