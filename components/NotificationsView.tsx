
import React, { useState } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, ArrowRight, Trash2, History } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { AppView } from '../types';

interface NotificationsViewProps {
    onViewChange: (view: AppView) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onViewChange }) => {
  const { activeAlerts, dismissedAlertIds, dismissAlert } = useGlobalContext();
  const [showHistory, setShowHistory] = useState(false);

  // Filter based on view mode
  const displayedAlerts = activeAlerts.filter(a => {
      const isDismissed = dismissedAlertIds.has(String(a.id));
      return showHistory ? isDismissed : !isDismissed;
  }).sort((a, b) => {
      // Newest first
      return b.timestamp.localeCompare(a.timestamp);
  });

  const activeCount = activeAlerts.filter(a => !dismissedAlertIds.has(String(a.id))).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="text-teal-600" /> Trung Tâm Thông Báo
          </h2>
          <p className="text-gray-500">
              {showHistory ? "Lịch sử cảnh báo đã giải quyết." : "Cập nhật tình hình vận hành thời gian thực."}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`text-sm font-bold px-3 py-1.5 rounded-lg flex items-center border transition-all ${showHistory ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
                <History size={16} className="mr-2"/> 
                {showHistory ? "Quay lại hiện tại" : "Xem lịch sử đã tắt"}
            </button>
            {!showHistory && activeCount > 0 && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    {activeCount} vấn đề
                </div>
            )}
        </div>
      </div>

      <div className="space-y-3">
          {displayedAlerts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                      <Bell size={32} />
                  </div>
                  <p className="text-gray-500 font-medium">
                      {showHistory ? "Chưa có cảnh báo nào bị tắt." : "Hệ thống đang hoạt động bình thường."}
                  </p>
                  {!showHistory && <p className="text-sm text-gray-400">Không có cảnh báo mới.</p>}
              </div>
          ) : (
              displayedAlerts.map(alert => {
                  const isDismissed = dismissedAlertIds.has(String(alert.id));
                  const isHigh = alert.severity === 'HIGH';
                  
                  return (
                      <div 
                        key={alert.id} 
                        className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                            isDismissed 
                            ? 'bg-gray-50 border-gray-200 opacity-70' 
                            : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                        }`}
                      >
                          {/* Left Colored Strip */}
                          {!isDismissed && (
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isHigh ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                          )}

                          <div className="flex gap-4">
                              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                  isDismissed ? 'bg-gray-200 text-gray-500' : 
                                  isHigh ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                              }`}>
                                  {isDismissed ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                              </div>
                              
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <h4 className={`font-bold text-sm md:text-base ${isDismissed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                          {alert.message}
                                      </h4>
                                      <span className="text-xs text-gray-400 flex items-center whitespace-nowrap ml-2">
                                          <Clock size={10} className="mr-1"/> {alert.timestamp}
                                      </span>
                                  </div>
                                  
                                  <p className="text-sm text-gray-600 mt-1">{alert.details}</p>
                                  
                                  <div className="flex items-center gap-3 mt-3 pt-2">
                                      <button 
                                          onClick={() => onViewChange(alert.type === 'LATE_SERVING' ? AppView.SERVING : AppView.TIMESHEET)}
                                          className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center"
                                      >
                                          Xem chi tiết <ArrowRight size={12} className="ml-1"/>
                                      </button>
                                      
                                      {!isDismissed && (
                                          <button 
                                              onClick={() => dismissAlert(alert.id)}
                                              className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center ml-auto border border-gray-200 px-2 py-1 rounded hover:bg-gray-100"
                                          >
                                              <CheckCircle size={12} className="mr-1"/> Đánh dấu đã xem
                                          </button>
                                      )}
                                      {isDismissed && (
                                          <span className="text-xs text-gray-400 italic ml-auto">Đã xử lý</span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
};
