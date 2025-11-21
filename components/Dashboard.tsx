
import React, { useState, useEffect } from 'react';
import { 
  ScanLine, Fingerprint, UserPlus, Calendar, LogIn, CheckCircle
} from 'lucide-react';
import { AppView } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

interface DashboardProps {
    onViewChange: (view: AppView) => void;
}

// Move component outside to prevent re-creation on every render
const MethodCard = ({ title, sub, icon: Icon, gradient, onClick, labelBtn }: any) => (
  <div onClick={onClick} className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg cursor-pointer transition-transform hover:scale-105 ${gradient}`}>
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-between space-y-3">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm"><Icon size={32} /></div>
          <div><h3 className="font-bold text-lg">{title}</h3><p className="text-xs opacity-90 font-medium">{sub}</p></div>
          <span className="bg-white text-gray-800 text-xs font-bold px-4 py-1 rounded-full shadow-sm">{labelBtn}</span>
      </div>
      <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-50"></div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { logs, currentUser, isLoading } = useGlobalContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // FIX: Use specific formatter to match what Google Sheets/Context returns (VN Date YYYY-MM-DD)
  // Must match 'Asia/Ho_Chi_Minh' timezone used in GlobalContext
  const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
  }).format(currentTime);
  
  const todayLog = logs.find(log => log.date === todayStr && log.employeeName === currentUser?.name);
  const isCheckedIn = !!todayLog;
  const isCheckedOut = todayLog && !!todayLog.checkOut;

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateDisplay = currentTime.toLocaleDateString('vi-VN', dateOptions);
  const timeDisplay = currentTime.toLocaleTimeString('vi-VN', { hour12: false });

  return (
    <div className="space-y-8 relative">
      <div>
          <div className="flex items-center space-x-2 mb-4">
            <Fingerprint className="text-gray-600" size={20}/>
            <h2 className="text-lg font-bold text-gray-700">Phương Thức Chấm Công</h2>
            {isLoading && <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded animate-pulse">Đang đồng bộ...</span>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MethodCard title="Khuôn Mặt" sub="AI Webcam" icon={ScanLine} gradient="bg-gradient-to-br from-cyan-400 to-blue-500" labelBtn="Hiện đại" onClick={() => onViewChange(AppView.ATTENDANCE)} />
              <MethodCard title="Vân Tay" sub="Thiết bị vật lý" icon={Fingerprint} gradient="bg-gradient-to-br from-emerald-400 to-teal-500" labelBtn="Sắp ra mắt" onClick={() => {}} />
              <MethodCard title="Đăng Ký Face" sub="Dữ liệu AI" icon={UserPlus} gradient="bg-gradient-to-br from-orange-400 to-amber-500" labelBtn="Admin" onClick={() => onViewChange(AppView.EMPLOYEES)} />
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
                  <div className="flex items-center space-x-2 text-gray-700">
                      <div className="p-1.5 bg-gray-100 rounded-md"><Calendar size={18}/></div>
                      <h3 className="font-bold">Lịch Sử Gần Đây</h3>
                  </div>
                  <button onClick={() => onViewChange(AppView.TIMESHEET)} className="text-indigo-600 text-sm font-medium hover:underline">Xem tất cả</button>
              </div>
              <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-semibold">
                          <tr><th className="px-6 py-4">Ngày</th><th className="px-6 py-4">Nhân viên</th><th className="px-6 py-4">Vào</th><th className="px-6 py-4">Ra</th><th className="px-6 py-4">Thiết bị</th></tr>
                      </thead>
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
