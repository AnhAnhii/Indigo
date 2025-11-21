
import React from 'react';
import { Calendar as CalendarIcon, Clock, Sunrise, Sunset, Moon, Layers } from 'lucide-react';
import { ShiftType, Employee } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const ScheduleView: React.FC = () => {
  const { employees } = useGlobalContext();
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  // Generate Schedule based on actual employees
  // In a real backend, this would be stored in a `shifts` table.
  // For this demo, we deterministically assign shifts based on Role to show "working" data.
  
  const getShiftForEmployee = (emp: Employee, dayIndex: number): ShiftType => {
      if (dayIndex === 6) return ShiftType.OFF; // Sunday Off for everyone for demo
      
      if (emp.role === 'Quản lý') return ShiftType.MORNING;
      if (emp.role === 'Bếp trưởng') return ShiftType.SPLIT;
      if (emp.role === 'Phục vụ') {
          // Alternate shifts based on ID parity to look realistic
          const idNum = parseInt(emp.id) || 0;
          if ((idNum + dayIndex) % 2 === 0) return ShiftType.MORNING;
          return ShiftType.AFTERNOON;
      }
      if (emp.role === 'Pha chế') return ShiftType.NIGHT;
      
      return ShiftType.MORNING;
  }

  const shifts = employees.map(emp => ({
      name: emp.name,
      role: emp.role,
      shiftTypes: weekDays.map((_, idx) => getShiftForEmployee(emp, idx))
  }));

  const getShiftStyle = (type: ShiftType) => {
    switch (type) {
      case ShiftType.MORNING:
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Sunrise, label: '06:00 - 14:00' };
      case ShiftType.AFTERNOON:
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Sunset, label: '14:00 - 22:00' };
      case ShiftType.NIGHT:
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Moon, label: '18:00 - 02:00' };
      case ShiftType.SPLIT:
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: Layers, label: '10-14h & 18-22h' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', icon: null, label: 'Nghỉ' };
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Lịch Phân Ca Nhà Hàng</h2>
                <p className="text-gray-500 text-sm">Tự động phân bổ dựa trên danh sách nhân viên hiện tại.</p>
            </div>
            <div className="flex space-x-2">
                <button className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50">Tuần Trước</button>
                <button className="bg-indigo-600 text-white border border-indigo-600 px-3 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700">Xuất bản lịch</button>
            </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
            {[ShiftType.MORNING, ShiftType.AFTERNOON, ShiftType.NIGHT, ShiftType.SPLIT].map(type => {
                const style = getShiftStyle(type);
                const Icon = style.icon as any;
                return (
                    <div key={type} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
                        <Icon size={14} />
                        <span>{type}: {style.label}</span>
                    </div>
                )
            })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <div className="min-w-[800px]">
                <div className="grid grid-cols-8 border-b bg-gray-50">
                    <div className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Nhân viên</div>
                    {weekDays.map(day => (
                        <div key={day} className="p-4 font-semibold text-gray-600 text-center border-l text-sm uppercase tracking-wider">{day}</div>
                    ))}
                </div>
                
                {shifts.map((staff, idx) => (
                    <div key={idx} className="grid grid-cols-8 border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="p-4 font-medium text-gray-900 flex flex-col justify-center text-sm">
                            <span>{staff.name}</span>
                            <span className="text-xs text-gray-500 font-normal">{staff.role}</span>
                        </div>
                        {staff.shiftTypes.map((type, dayIdx) => {
                            const style = getShiftStyle(type);
                            const Icon = style.icon;
                            return (
                                <div key={dayIdx} className="border-l p-1 sm:p-2 h-20">
                                    <div className={`w-full h-full rounded-md flex flex-col items-center justify-center text-xs font-medium border transition-all hover:shadow-md cursor-pointer ${style.bg} ${style.text} ${style.border}`}>
                                        {Icon ? (
                                            <>
                                                <Icon size={16} className="mb-1 opacity-80"/>
                                                <span className="hidden md:block">{type}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-300">--</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-lg flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <CalendarIcon size={20} />
            </div>
            <div>
                <h4 className="font-bold text-gray-900">Gợi ý tối ưu hóa từ AI</h4>
                <p className="text-sm text-gray-600 mt-1">
                    Hệ thống phát hiện có {employees.length} nhân viên. Đang thiếu nhân sự Ca Tối cho ngày Thứ 7.
                    <br/>
                    Đề xuất: Tăng cường thêm nhân viên Part-time hoặc chuyển 1 nhân viên Ca Chiều sang.
                </p>
                <button className="mt-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider hover:text-indigo-800">Áp dụng thay đổi</button>
            </div>
        </div>
    </div>
  );
};
