
import React from 'react';
import { Calendar as CalendarIcon, Sunrise, Sunset, Moon, Layers, Clock } from 'lucide-react';
import { ShiftType, Employee } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const ScheduleView: React.FC = () => {
  const { employees, settings } = useGlobalContext();
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  // Phân ca tự động (Demo Logic)
  const getShiftForEmployee = (emp: Employee, dayIndex: number): ShiftType => {
      if (dayIndex === 6) return ShiftType.OFF; // Chủ nhật nghỉ (Demo)
      
      // Phân ca dựa trên vai trò để hiển thị đầy đủ các loại ca
      if (emp.role === 'Quản lý') return ShiftType.CA_C;
      if (emp.role === 'Bếp trưởng') return ShiftType.CA_D;
      if (emp.role === 'Pha chế') return ShiftType.CA_B1;
      
      // Phục vụ xoay ca
      const idNum = parseInt(emp.id) || 0;
      if ((idNum + dayIndex) % 2 === 0) return ShiftType.CA_B2;
      return ShiftType.CA_C;
  }

  const shifts = employees.map(emp => ({
      name: emp.name,
      role: emp.role,
      shiftTypes: weekDays.map((_, idx) => getShiftForEmployee(emp, idx))
  }));

  // Lấy thông tin giờ từ Settings để hiển thị
  const getShiftLabel = (code: string) => {
      const conf = settings.shiftConfigs?.find(s => s.code === code);
      if (!conf) return '';
      if (conf.isSplitShift) return `${conf.startTime}-${conf.breakStart} & ${conf.breakEnd}-${conf.endTime}`;
      return `${conf.startTime} - ${conf.endTime}`;
  };

  const getShiftStyle = (type: ShiftType) => {
    switch (type) {
      case ShiftType.CA_C:
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: Layers, label: getShiftLabel('Ca C') };
      case ShiftType.CA_D:
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Sunrise, label: getShiftLabel('Ca D') };
      case ShiftType.CA_B1:
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Sunset, label: getShiftLabel('Ca B1') };
      case ShiftType.CA_B2:
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Moon, label: getShiftLabel('Ca B2') };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', icon: null, label: 'Nghỉ' };
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Lịch Phân Ca Nhà Hàng</h2>
                <p className="text-gray-500 text-sm">Tự động phân bổ theo quy tắc Ca C, D, B1, B2.</p>
            </div>
            <div className="flex space-x-2">
                <button className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50">Tuần Trước</button>
                <button className="bg-indigo-600 text-white border border-indigo-600 px-3 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700">Xuất bản lịch</button>
            </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            {[ShiftType.CA_C, ShiftType.CA_D, ShiftType.CA_B1, ShiftType.CA_B2].map(type => {
                const style = getShiftStyle(type);
                const Icon = style.icon as any;
                return (
                    <div key={type} className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
                        <Icon size={16} />
                        <div className="flex flex-col">
                            <span>{type}</span>
                            <span className="text-[10px] font-medium opacity-80">{style.label}</span>
                        </div>
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
                                <div key={dayIdx} className="border-l p-1 sm:p-2 h-24">
                                    <div className={`w-full h-full rounded-lg flex flex-col items-center justify-center text-xs font-medium border transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer ${style.bg} ${style.text} ${style.border}`}>
                                        {Icon ? (
                                            <>
                                                <Icon size={18} className="mb-1 opacity-80"/>
                                                <span className="font-bold">{type}</span>
                                                <span className="text-[9px] text-center mt-0.5 px-1 leading-tight opacity-80">{style.label}</span>
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
    </div>
  );
};
