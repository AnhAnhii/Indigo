
import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, Shield, Save, Globe, Clock, Trash2, Plus, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { WifiConfig } from '../types';
import { sheetService } from '../services/sheetService';

type SettingsTab = 'LOCATION' | 'WIFI' | 'RULES' | 'DATABASE';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('DATABASE');
  const [localSettings, setLocalSettings] = useState(settings);
  const [newWifiSSID, setNewWifiSSID] = useState('');
  
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
          bssid: 'Unknown',
          isActive: true
      };
      setLocalSettings({
          ...localSettings,
          wifis: [...localSettings.wifis, newWifi]
      });
      setNewWifiSSID('');
  };

  const removeWifi = (id: string) => {
      setLocalSettings({
          ...localSettings,
          wifis: localSettings.wifis.filter(w => w.id !== id)
      });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
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
                    onClick={() => setActiveTab('DATABASE')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'DATABASE' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Database size={18} className="mr-3"/> Kết nối Dữ liệu
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
                    onClick={() => setActiveTab('RULES')}
                    className={`w-full text-left px-4 py-3 font-medium rounded-lg flex items-center transition-colors ${activeTab === 'RULES' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Shield size={18} className="mr-3"/> Quy tắc chấm công
                </button>
            </div>

            {/* Main Config Area */}
            <div className="col-span-1 md:col-span-3 space-y-6">
                
                {/* TAB: DATABASE (READ ONLY) */}
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
                            <p className="text-xs text-gray-400 mt-2 italic">
                                Để thay đổi, vui lòng cập nhật biến HARDCODED_API_URL trong mã nguồn và Deploy lại.
                            </p>
                        </div>
                    </div>
                )}

                {/* TAB: LOCATION */}
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

                {/* TAB: WIFI */}
                {activeTab === 'WIFI' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                            <Wifi size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Wifi Hợp lệ</h3>
                            <p className="text-sm text-gray-500">Danh sách Wifi này sẽ được đồng bộ cho toàn bộ nhân viên.</p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {localSettings.wifis.map(wifi => (
                         <div key={wifi.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                             <div className="flex items-center">
                                 <Wifi size={20} className="text-teal-600 mr-3"/>
                                 <div>
                                     <p className="font-bold text-gray-800 text-sm">{wifi.name}</p>
                                     <p className="text-xs text-gray-500">BSSID: {wifi.bssid}</p>
                                 </div>
                             </div>
                             <button onClick={() => removeWifi(wifi.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                                 <Trash2 size={18} />
                             </button>
                         </div>
                        ))}
                    </div>
                    
                    <div className="flex gap-2 border-t pt-4">
                        <input 
                            type="text" 
                            placeholder="Nhập tên Wifi (SSID)..." 
                            value={newWifiSSID}
                            onChange={(e) => setNewWifiSSID(e.target.value)}
                            className="flex-1 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <button onClick={addWifi} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center hover:bg-gray-800">
                            <Plus size={16} className="mr-1"/> Thêm
                        </button>
                    </div>
                </div>
                )}

                {/* TAB: RULES */}
                {activeTab === 'RULES' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                        <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Quy tắc Chấm công</h3>
                            <p className="text-sm text-gray-500">Thiết lập giờ làm việc và quy định đi muộn.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu ca</label>
                            <div className="relative">
                                <input 
                                    type="time" 
                                    value={localSettings.rules.startHour}
                                    onChange={(e) => setLocalSettings({...localSettings, rules: {...localSettings.rules, startHour: e.target.value}})}
                                    className="w-full border rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc ca</label>
                            <div className="relative">
                                <input 
                                    type="time" 
                                    value={localSettings.rules.endHour}
                                    onChange={(e) => setLocalSettings({...localSettings, rules: {...localSettings.rules, endHour: e.target.value}})}
                                    className="w-full border rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cho phép đi muộn (phút)</label>
                            <input 
                                type="number" 
                                value={localSettings.rules.allowedLateMinutes}
                                onChange={(e) => setLocalSettings({...localSettings, rules: {...localSettings.rules, allowedLateMinutes: Number(e.target.value)}})}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <h4 className="font-bold text-orange-800 text-sm mb-1">Lưu ý quan trọng</h4>
                        <p className="text-xs text-orange-700">
                            Nhân viên chấm công sau <b>{localSettings.rules.startHour}</b> cộng thêm <b>{localSettings.rules.allowedLateMinutes} phút</b> sẽ bị tính là <b>Đi muộn</b>.
                        </p>
                    </div>
                </div>
                )}

            </div>
        </div>
    </div>
  );
};
