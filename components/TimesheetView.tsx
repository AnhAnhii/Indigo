
import React, { useState } from 'react';
import { Calendar, Filter, Download, Search, MapPin, Smartphone, Sun, Moon } from 'lucide-react';
import { AttendanceStatus } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const TimesheetView: React.FC = () => {
  const { logs, employees } = useGlobalContext();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }));

  // Filter logs based on selected date (Mock filtering for demo simplicity)
  // In a real app, logs would likely be fetched by month/day range.
  // Here we just show all logs but allow "filtering" visually.
  const filteredLogs = logs.filter(log => !selectedDate || log.date === selectedDate);

  // Calculate stats for the view
  const workingCount = new Set(filteredLogs.map(l => l.employeeId)).size; // Count unique employees
  const lateCount = filteredLogs.filter(l => l.status === AttendanceStatus.LATE).length;
  
  const totalEmployees = employees.length;
  const absentCount = Math.max(0, totalEmployees - workingCount); 

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold border border-green-200">Đúng giờ</span>;
      case AttendanceStatus.LATE:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold border border-yellow-200">Đi muộn</span>;
      case AttendanceStatus.EARLY_LEAVE:
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold border border-orange-200">Về sớm</span>;
      case AttendanceStatus.ABSENT:
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold border border-red-200">Vắng mặt</span>;
      default:
        return null;
    }
  };

  const handleExport = () => {
      const headers = ["Ngày", "ID", "Tên nhân viên", "Phiên", "Giờ vào", "Giờ ra", "Tổng giờ", "Trạng thái", "Đi muộn (phút)", "Thiết bị"];
      const csvRows = [headers.join(",")];

      filteredLogs.forEach(log => {
          const values = [
              log.date,
              log.employeeId,
              `"${log.employeeName}"`,
              log.session || '-',
              log.checkIn || '-',
              log.checkOut || '-',
              log.totalHours,
              log.status,
              log.lateMinutes,
              `"${log.device}"`
          ];
          csvRows.push(values.join(","));
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Bang_Cong_${selectedDate || 'Tat_Ca'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bảng Công Chi Tiết</h2>
          <p className="text-gray-500">Dữ liệu chấm công Real-time</p>
        </div>
        <div className="flex space-x-2">
           <div className="relative">
             <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
             />
             <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16}/>
           </div>
           <button 
             onClick={handleExport}
             className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-teal-700 shadow-sm transition-colors"
           >
             <Download size={18} className="mr-2"/> Xuất Excel
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase">Tổng nhân sự</p>
          <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-green-600 font-bold uppercase">Đã chấm công</p>
          <p className="text-2xl font-bold text-green-700">{workingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-yellow-600 font-bold uppercase">Đi muộn</p>
          <p className="text-2xl font-bold text-yellow-700">{lateCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-red-600 font-bold uppercase">Chưa chấm công</p>
          <p className="text-2xl font-bold text-red-700">{absentCount}</p>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Tìm theo tên nhân viên..." 
               className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
             />
           </div>
           <button className="text-gray-600 font-medium text-sm flex items-center hover:text-gray-800">
             <Filter size={16} className="mr-1"/> Lọc nâng cao
           </button>
        </div>
        
        {filteredLogs.length === 0 ? (
           <div className="p-12 text-center text-gray-500">
               Không có dữ liệu chấm công cho ngày {selectedDate}
           </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4 text-center">Phiên (Ca Gãy)</th>
                <th className="px-6 py-4 text-center">Check-in</th>
                <th className="px-6 py-4 text-center">Check-out</th>
                <th className="px-6 py-4 text-center">Số công</th>
                <th className="px-6 py-4 text-center">Thiết bị</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {log.employeeName.charAt(0)}
                      </div>
                      <div>
                          <div>{log.employeeName}</div>
                          <div className="text-xs text-gray-400 font-normal">{log.date}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* SESSION COLUMN */}
                  <td className="px-6 py-4 text-center">
                      {log.session ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${log.session === 'MORNING' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                              {log.session === 'MORNING' ? <Sun size={12} className="mr-1"/> : <Moon size={12} className="mr-1"/>}
                              {log.session === 'MORNING' ? 'Sáng' : 'Chiều'}
                          </span>
                      ) : (
                          <span className="text-gray-300">-</span>
                      )}
                  </td>

                  {/* Check In Column */}
                  <td className="px-6 py-4 text-center">
                    {log.checkIn ? (
                      <div className="inline-flex flex-col items-center">
                        <span className={`font-bold ${log.lateMinutes > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                          {log.checkIn}
                        </span>
                        {log.lateMinutes > 0 && (
                          <span className="text-[10px] text-red-500">Muộn {log.lateMinutes}p</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">--:--</span>
                    )}
                  </td>

                  {/* Check Out Column */}
                  <td className="px-6 py-4 text-center">
                     {log.checkOut ? (
                        <span className="font-bold text-gray-800">{log.checkOut}</span>
                     ) : (
                        <span className="text-gray-400 italic text-xs">Chưa ra</span>
                     )}
                  </td>

                  <td className="px-6 py-4 text-center font-bold text-blue-600">{log.totalHours}h</td>
                  
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center text-gray-500 text-xs" title={log.device}>
                        {log.device.includes('Wifi') ? <Smartphone size={14} className="mr-1"/> : <MapPin size={14} className="mr-1"/>}
                        <span className="truncate max-w-[100px]">{log.device}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(log.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-500">
            Hiển thị {filteredLogs.length} bản ghi
        </div>
      </div>
    </div>
  );
};
