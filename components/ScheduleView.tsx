
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Layers, Sunrise, Sunset, Moon, X } from 'lucide-react';
import { ShiftType, Employee, EmployeeRole } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const ScheduleView: React.FC = () => {
  const { employees, settings, schedules, assignShift, currentUser } = useGlobalContext();
  const isAdmin = currentUser?.role === EmployeeRole.MANAGER;

  // State for current week view
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State for editing Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ empId: string, dateStr: string, empName: string, currentShift: string } | null>(null);

  // Helper: Get 7 days of the current week (Starting Monday)
  const weekDays = useMemo(() => {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay(); // 0 (Sun) - 6 (Sat)
      
      // Adjust to make Monday (1) the first day
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
      startOfWeek.setDate(diff);

      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          days.push(d);
      }
      return days;
  }, [currentDate]);

  const handlePrevWeek = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
  }

  const handleNextWeek = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
  }

  const formatDateKey = (date: Date) => {
      return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(date);
  }

  const getShift = (empId: string, date: Date) => {
      const dateStr = formatDateKey(date);
      const schedule = schedules.find(s => s.employeeId === empId && s.date === dateStr);
      return schedule ? schedule.shiftCode : 'OFF'; // Default to OFF
  }

  const handleCellClick = (emp: Employee, date: Date) => {
      if (!isAdmin) return;
      const dateStr = formatDateKey(date);
      const currentShift = getShift(emp.id, date);
      setEditingCell({
          empId: emp.id,
          empName: emp.name,
          dateStr: dateStr,
          currentShift
      });
      setIsModalOpen(true);
  }

  const handleSelectShift = (shiftCode: string) => {
      if (editingCell) {
          assignShift(editingCell.empId, editingCell.dateStr, shiftCode);
          setIsModalOpen(false);
          setEditingCell(null);
      }
  }

  // Visual Helpers
  const getShiftLabel = (code: string) => {
      if (code === 'OFF') return 'Nghỉ';
      const conf = settings.shiftConfigs?.find(s => s.code === code);
      if (!conf) return code;
      if (conf.isSplitShift) return `${conf.startTime}-${conf.breakStart} & ${conf.breakEnd}-${conf.endTime}`;
      return `${conf.startTime} - ${conf.endTime}`;
  };

  const getShiftStyle = (code: string) => {
    switch (code) {
      case 'Ca C': return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: Layers };
      case 'Ca D': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Sunrise };
      case 'Ca B1': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Sunset };
      case 'Ca B2': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Moon };
      default: return { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', icon: null };
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Lịch Phân Ca</h2>
                <p className="text-gray-500 text-sm">
                    {isAdmin ? "Click vào ô để xếp ca cho nhân viên." : "Xem lịch làm việc hàng tuần."}
                </p>
            </div>
            
            {/* Week Navigation */}
            <div className="flex items-center bg-white rounded-lg border shadow-sm p-1">
                <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-md text-gray-600"><ChevronLeft size={20}/></button>
                <div className="px-4 font-bold text-gray-700 text-sm flex items-center">
                    <CalendarIcon size={16} className="mr-2 text-teal-600"/>
                    {weekDays[0].toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})} - {weekDays[6].toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})}
                </div>
                <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-md text-gray-600"><ChevronRight size={20}/></button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <div className="min-w-[900px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 border-b bg-gray-50">
                    <div className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Nhân viên</div>
                    {weekDays.map((day, idx) => (
                        <div key={idx} className={`p-3 font-semibold text-center border-l text-sm uppercase tracking-wider ${idx === 6 ? 'text-red-600 bg-red-50/50' : 'text-gray-600'}`}>
                            <div>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][idx]}</div>
                            <div className="text-xs font-normal mt-1">{day.getDate()}/{day.getMonth()+1}</div>
                        </div>
                    ))}
                </div>
                
                {/* Employee Rows */}
                {employees.map((emp) => (
                    <div key={emp.id} className="grid grid-cols-8 border-b last:border-0 hover:bg-gray-50 transition-colors group">
                        <div className="p-4 font-medium text-gray-900 flex flex-col justify-center text-sm sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r md:static md:border-r-0">
                            <span>{emp.name}</span>
                            <span className="text-xs text-gray-500 font-normal">{emp.role}</span>
                        </div>
                        
                        {weekDays.map((day, idx) => {
                            const shiftCode = getShift(emp.id, day);
                            const style = getShiftStyle(shiftCode);
                            const Icon = style.icon;
                            
                            return (
                                <div key={idx} className="border-l p-1 sm:p-2 h-24 relative">
                                    <div 
                                        onClick={() => handleCellClick(emp, day)}
                                        className={`w-full h-full rounded-lg flex flex-col items-center justify-center text-xs font-medium border transition-all ${isAdmin ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''} ${style.bg} ${style.text} ${style.border}`}
                                    >
                                        {Icon ? (
                                            <>
                                                <Icon size={18} className="mb-1 opacity-80"/>
                                                <span className="font-bold">{shiftCode}</span>
                                                <span className="text-[9px] text-center mt-0.5 px-1 leading-tight opacity-80">{getShiftLabel(shiftCode)}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-300 text-[10px] uppercase font-bold">Nghỉ</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>

        {/* ASSIGN SHIFT MODAL */}
        {isModalOpen && editingCell && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900">Xếp Ca Làm Việc</h3>
                            <p className="text-xs text-gray-500">{editingCell.empName} • {editingCell.dateStr}</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-500 hover:text-gray-800"/></button>
                    </div>
                    <div className="p-4 grid gap-3">
                        <button 
                            onClick={() => handleSelectShift('OFF')}
                            className={`p-3 rounded-xl border flex items-center justify-between hover:bg-gray-50 ${editingCell.currentShift === 'OFF' ? 'border-gray-400 bg-gray-100 ring-1 ring-gray-400' : 'border-gray-200'}`}
                        >
                            <span className="font-bold text-gray-600">Nghỉ (OFF)</span>
                        </button>

                        {settings.shiftConfigs.map(shift => (
                            <button 
                                key={shift.code}
                                onClick={() => handleSelectShift(shift.code)}
                                className={`p-3 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-all ${editingCell.currentShift === shift.code ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-gray-200'}`}
                            >
                                <div>
                                    <div className="font-bold text-gray-800">{shift.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {shift.isSplitShift ? `${shift.startTime}-${shift.breakStart} & ${shift.breakEnd}-${shift.endTime}` : `${shift.startTime} - ${shift.endTime}`}
                                    </div>
                                </div>
                                {editingCell.currentShift === shift.code && <div className="w-3 h-3 rounded-full bg-teal-500"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
