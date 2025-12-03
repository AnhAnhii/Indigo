
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, UserPlus, Calendar, LogIn, CheckCircle, Fingerprint, ScanFace, Mic, QrCode, Sparkles, TrendingUp, Users, Clock, AlertCircle, BellRing, Download, Smartphone, Lock, DollarSign, BarChart, X
} from 'lucide-react';
import { AppView, EmployeeRole } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

interface DashboardProps {
    onViewChange: (view: AppView) => void;
}

const MethodCard = ({ title, sub, icon: Icon, gradient, onClick, labelBtn, disabled = false }: any) => (
  <div 
    onClick={!disabled ? onClick : undefined} 
    className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-transform ${disabled ? 'cursor-not-allowed opacity-80 grayscale' : 'cursor-pointer hover:scale-105'} ${gradient}`}
  >
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-between space-y-3">
          <div className={`p-3 rounded-full backdrop-blur-sm ${disabled ? 'bg-gray-200/20' : 'bg-white/20'}`}><Icon size={32} /></div>
          <div><h3 className="font-bold text-lg">{title}</h3><p className="text-xs opacity-90 font-medium">{sub}</p></div>
          <span className={`text-xs font-bold px-4 py-1 rounded-full shadow-sm ${disabled ? 'bg-gray-500/50 text-white border border-white/20' : 'bg-white text-gray-800'}`}>{labelBtn}</span>
      </div>
      {!disabled && (
        <>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-50"></div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </>
      )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { logs, currentUser, isLoading, schedules, settings, requestNotificationPermission, notificationPermissionStatus, activeAlerts, dismissedAlertIds, dismissAlert } = useGlobalContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);
    const isStandAloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandAloneMode);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(currentTime);
  
  const todayLog = logs.find(log => log.date === todayStr && log.employeeName === currentUser?.name);
  const isCheckedIn = !!todayLog;
  const isCheckedOut = todayLog && !!todayLog.checkOut;
  const isAdmin = currentUser?.role === EmployeeRole.MANAGER || currentUser?.role === EmployeeRole.DEV || currentUser?.role === EmployeeRole.DEPARTMENT_HEAD;

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateDisplay = currentTime.toLocaleDateString('vi-VN', dateOptions);
  const timeDisplay = currentTime.toLocaleTimeString('vi-VN', { hour12: false });

  const bannerAlerts = activeAlerts.filter(a => !dismissedAlertIds.has(a.id));

  const aiInsights = useMemo(() => {
      if (!currentUser) return null;
      const hour = currentTime.getHours();
      let greeting = "Chào bạn";
      if (hour < 12) greeting = "Chào buổi sáng";
      else if (hour < 18) greeting = "Chào buổi chiều";
      else greeting = "Chào buổi tối";

      let personalMessage = "";
      const mySchedule = schedules.find(s => s.employeeId === currentUser.id && s.date === todayStr);
      const shiftName = mySchedule ? settings.shiftConfigs.find(s => s.code === mySchedule.shiftCode)?.name : null;

      if (isCheckedOut) personalMessage = `Bạn đã hoàn thành ca làm việc hôm nay (${todayLog?.totalHours}h). Nghỉ ngơi tốt nhé! 😴`;
      else if (isCheckedIn) {
          if (todayLog?.lateMinutes && todayLog.lateMinutes > 0) personalMessage = `Bạn đang trong ca (Đi muộn ${todayLog.lateMinutes}p). Cố gắng khắc phục nhé! ⏰`;
          else personalMessage = "Bạn đã chấm công đúng giờ. Tuyệt vời! Giữ vững phong độ nhé! 🌟";
      } else {
          if (mySchedule && mySchedule.shiftCode !== 'OFF') personalMessage = `Bạn có lịch ${shiftName || 'làm việc'} hôm nay. Đừng quên chấm công!`;
          else if (mySchedule && mySchedule.shiftCode === 'OFF') personalMessage = "Hôm nay là ngày nghỉ của bạn. Hãy thư giãn nhé! ☕";
          else personalMessage = "Bạn chưa chấm công hôm nay.";
      }

      return { greeting: `${greeting}, ${currentUser.name.split(' ').pop()}!`, personalMessage };
  }, [currentUser, todayLog, schedules, currentTime, settings, todayStr]);

  const handleEnableNotification = async () => { await requestNotificationPermission(); };

  return (
    <div className="space-y-8 relative pb-20">
      
      {bannerAlerts.length > 0 && (
          <div className={`fixed top-0 left-0 right-0 z-50 text-white shadow-lg animate-in slide-in-from-top duration-300 ${bannerAlerts[0].severity === 'HIGH' ? 'bg-red-600' : 'bg-yellow-600'}`}>
              <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between">
                  <div className="flex items-start md:items-center flex-1">
                      <div className="bg-white/20 p-2 rounded-full mr-3 animate-pulse mt-0.5 md:mt-0 shrink-0">
                          <AlertCircle size={20} className="text-white" />
                      </div>
                      <div className="overflow-hidden">
                          <p className="font-bold text-sm uppercase tracking-wide truncate">Cảnh báo hệ thống ({bannerAlerts.length})</p>
                          <p className="text-xs md:text-sm text-white/90 line-clamp-2 md:line-clamp-1 break-words">
                              {bannerAlerts[0].message} • {bannerAlerts[0].details}
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                      <button 
                        onClick={() => onViewChange(
                            activeAlerts[0].type === 'BAD_FEEDBACK' ? AppView.FEEDBACK : 
                            AppView.TIMESHEET
                        )}
                        className={`hidden sm:block ml-4 bg-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-opacity-90 ${bannerAlerts[0].severity === 'HIGH' ? 'text-red-600' : 'text-yellow-700'}`}
                      >
                          Xem chi tiết
                      </button>
                      <button 
                        onClick={() => dismissAlert(bannerAlerts[0].id)}
                        className="ml-2 p-1 hover:bg-white/20 rounded-full"
                        title="Tắt cảnh báo này"
                      >
                          <X size={18} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* NOTIFICATION & PWA ALERTS */}
      <div className="space-y-3">
        {notificationPermissionStatus === 'default' && (
            <div onClick={handleEnableNotification} className="bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-200 cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-between animate-pulse">
                <div className="flex items-center">
                    <div className="bg-white/20 p-2 rounded-full mr-3"><BellRing size={20} /></div>
                    <div><h4 className="font-bold">Bật thông báo ngay</h4><p className="text-xs text-blue-100">Để nhận tin nhắn khi có đơn từ.</p></div>
                </div>
                <div className="bg-white text-blue-700 text-xs font-bold px-3 py-2 rounded-lg">Kích hoạt</div>
            </div>
        )}
        {notificationPermissionStatus === 'denied' && (
             <div className="bg-orange-100 text-orange-800 p-4 rounded-xl border border-orange-200 flex items-start gap-3">
                 <AlertCircle className="shrink-0 mt-1" size={20} />
                 <div><h4 className="font-bold text-sm">Thông báo đang bị CHẶN</h4><p className="text-xs mt-1">Bạn đã bấm "Chặn". Hãy mở lại trong cài đặt trình duyệt (Ổ khóa trên thanh địa chỉ).</p></div>
             </div>
        )}
      </div>

      {/* AI INSIGHTS CARD */}
      {aiInsights && (
          <div className="rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 bg-gradient-to-r from-indigo-600 to-purple-700">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                      <div className="flex items-center space-x-2 opacity-90"><Sparkles size={18} className="text-yellow-300 animate-pulse"/><span className="text-xs font-bold uppercase tracking-widest">Bản tin Vận hành</span></div>
                      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{aiInsights.greeting}</h1>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                      <h3 className="text-sm font-bold text-indigo-100 flex items-center mb-2"><Fingerprint size={16} className="mr-2"/> Trạng thái của bạn</h3>
                      <p className="text-white font-medium text-sm leading-relaxed">{aiInsights.personalMessage}</p>
                      <div className="mt-3 w-full bg-white/20 h-1.5 rounded-full overflow-hidden"><div className={`h-full ${isCheckedOut ? 'bg-green-400' : isCheckedIn ? 'bg-yellow-400' : 'bg-gray-400'} w-full origin-left duration-1000 scale-x-100`}></div></div>
                  </div>
              </div>
          </div>
      )}

      {/* CHECK-IN METHODS */}
      <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2"><Fingerprint className="text-gray-600" size={20}/><h2 className="text-lg font-bold text-gray-700">Phương Thức Chấm Công</h2></div>
            {isAdmin && <button onClick={() => onViewChange(AppView.QR_STATION)} className="text-xs font-bold text-teal-600 bg-white border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 flex items-center shadow-sm"><QrCode size={14} className="mr-1"/> Mở Trạm QR</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MethodCard title="Quét Mã QR" sub="Chính xác tuyệt đối" icon={QrCode} gradient="bg-gradient-to-br from-teal-500 to-emerald-600" labelBtn="Khuyên dùng" onClick={() => onViewChange(AppView.ATTENDANCE)} />
              <MethodCard title="Chấm công GPS" sub="Định vị Hybrid" icon={MapPin} gradient="bg-gradient-to-br from-emerald-400 to-teal-500" labelBtn="Dự phòng" onClick={() => onViewChange(AppView.ATTENDANCE)} />
              <MethodCard title="Face ID (AI)" sub="Nhận diện khuôn mặt" icon={ScanFace} gradient="bg-gray-400" labelBtn="Bảo trì" disabled={true} onClick={() => {}} />
              <MethodCard title="Giọng Nói AI" sub="Đọc mã xác thực" icon={Mic} gradient="bg-gray-400" labelBtn="Sắp ra mắt" disabled={true} onClick={() => {}}/>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <h1 className="text-6xl font-bold text-indigo-600 tabular-nums tracking-tight mb-2">{timeDisplay}</h1>
              <p className="text-gray-500 font-medium text-lg capitalize mb-8">{dateDisplay}</p>
              <div className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors ${isCheckedOut ? 'bg-gray-100 text-gray-600' : isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {isCheckedOut ? ( <> <CheckCircle size={20} /> <span>Hoàn thành ({todayLog?.totalHours}h)</span> </> ) 
                  : isCheckedIn ? ( <> <LogIn size={20} /> <span>Đang làm việc</span> </> ) 
                  : ( <> <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div> <span>Chưa chấm công</span> </> )}
              </div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b flex justify-between items-center gap-4">
                  <div className="flex items-center space-x-2 text-gray-700"><div className="p-1.5 bg-gray-100 rounded-md"><Calendar size={18}/></div><h3 className="font-bold">Lịch Sử Gần Đây</h3></div>
                  <button onClick={() => onViewChange(AppView.TIMESHEET)} className="text-indigo-600 text-sm font-medium hover:underline">Xem tất cả</button>
              </div>
              <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-semibold"><tr><th className="px-6 py-4">Ngày</th><th className="px-6 py-4">Nhân viên</th><th className="px-6 py-4">Vào</th><th className="px-6 py-4">Ra</th><th className="px-6 py-4">Thiết bị</th></tr></thead>
                      <tbody className="divide-y divide-gray-50">
                          {logs.slice(0, 5).map((log, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-gray-700">{log.date}</td>
                                  <td className="px-6 py-4 text-gray-600 font-medium">{log.employeeName}</td>
                                  <td className="px-6 py-4 text-green-600">{log.checkIn}</td>
                                  <td className="px-6 py-4 text-orange-600">{log.checkOut}</td>
                                  <td className="px-6 py-4 text-gray-400 text-xs max-w-[150px] truncate" title={log.device}>{log.device}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};
