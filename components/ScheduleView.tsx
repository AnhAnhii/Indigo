
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Layers, Sunrise, Sunset, Moon, X, User, Clock, Plus, Briefcase } from 'lucide-react';
import { ShiftType, Employee, EmployeeRole, ShiftConfig } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const ScheduleView: React.FC = () => {
  const { employees, settings, schedules, assignShift, currentUser } = useGlobalContext();
  const isAdmin = currentUser?.role === EmployeeRole.MANAGER;

  // State for current week view
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State for editing Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ empId: string, dateStr: string, empName: string, currentShift: string } | null>(null);

  // LỌC NHÂN VIÊN: Quản lý không cần xếp lịch cho chính mình (ẩn khỏi danh sách)
  const staffList = useMemo(() => employees.filter(e => e.role !== EmployeeRole.MANAGER), [employees]);

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

  const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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

  const handleToday = () => {
      setCurrentDate(new Date());
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
  const getShiftConfig = (code: string) => {
      return settings.shiftConfigs?.find(s => s.code === code);
  };

  const getShiftStyle = (code: string) => {
    if (code === 'OFF') return { bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-200', icon: X, label: 'Nghỉ' };
    
    // Auto-color based on shift name keywords or just generic colors
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes('sang') || lowerCode.includes('morning')) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: Sunrise };
    if (lowerCode.includes('chieu') || lowerCode.includes('afternoon')) return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Sunset };
    if (lowerCode.includes('toi') || lowerCode.includes('night') || lowerCode.includes('evening')) return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Moon };
    if (lowerCode.includes('gay') || lowerCode.includes('split')) return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: Layers };
    
    return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: Briefcase };
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
        {/* HEADER CONTROL */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <CalendarIcon className="text-teal-600" /> Lịch Phân Ca
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    {isAdmin ? "Kéo/Thả hoặc bấm vào ô để xếp lịch." : "Xem lịch làm việc của bạn và đồng nghiệp."}
                </p>
            </div>
            
            <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full lg:w-auto">
                <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><ChevronLeft size={20}/></button>
                <div className="flex-1 px-4 text-center">
                    <span className="text-xs text-gray-400 font-bold uppercase block">Tuần làm việc</span>
                    <div className="font-bold text-gray-800 text-sm whitespace-nowrap">
                        {weekDays[0].toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})} - {weekDays[6].toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                    </div>
                </div>
                <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><ChevronRight size={20}/></button>
                <div className="w-px h-8 bg-gray-200 mx-2"></div>
                <button onClick={handleToday} className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors">Hôm nay</button>
            </div>
        </div>

        {/* SCHEDULE GRID */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative">
            <div className="overflow-auto flex-1 no-scrollbar">
                <div className="min-w-[1000px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-[200px_repeat(7,_1fr)] sticky top-0 z-30 bg-white shadow-sm">
                        <div className="p-4 font-bold text-gray-500 text-xs uppercase tracking-wider border-b border-r bg-gray-50 flex items-center">
                            Nhân sự ({staffList.length})
                        </div>
                        {weekDays.map((day, idx) => {
                            const dateKey = formatDateKey(day);
                            const isToday = dateKey === todayDateStr;
                            return (
                                <div key={idx} className={`p-3 text-center border-b border-r last:border-r-0 flex flex-col justify-center relative ${isToday ? 'bg-teal-50/50' : 'bg-white'}`}>
                                    {isToday && <div className="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>}
                                    <span className={`text-xs font-bold uppercase mb-1 ${isToday ? 'text-teal-700' : 'text-gray-400'}`}>
                                        {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'][idx]}
                                    </span>
                                    <div className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-teal-600 text-white shadow-md shadow-teal-200' : 'text-gray-800'}`}>
                                        {day.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Employee Rows - USING STAFFLIST INSTEAD OF EMPLOYEES */}
                    {staffList.map((emp) => (
                        <div key={emp.id} className="grid grid-cols-[200px_repeat(7,_1fr)] group hover:bg-gray-50 transition-colors">
                            {/* Employee Name Column (Sticky) */}
                            <div className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 border-r border-b p-3 flex items-center space-x-3 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                    {emp.avatar ? (
                                        <img src={emp.avatar} alt="" className="w-full h-full rounded-full object-cover"/>
                                    ) : (
                                        emp.name.charAt(0)
                                    )}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-sm font-bold text-gray-900 truncate">{emp.name}</p>
                                </div>
                            </div>
                            
                            {/* Shift Cells */}
                            {weekDays.map((day, idx) => {
                                const shiftCode = getShift(emp.id, day);
                                const config = getShiftConfig(shiftCode);
                                const style = getShiftStyle(shiftCode);
                                const Icon = style.icon;
                                const isOff = shiftCode === 'OFF';
                                const dateKey = formatDateKey(day);
                                const isToday = dateKey === todayDateStr;

                                // Display Name Logic: Use Config Name if available, else fallback to Code
                                const displayName = config ? config.name : shiftCode;

                                return (
                                    <div key={idx} className={`border-b border-r last:border-r-0 p-1.5 relative min-h-[90px] transition-all ${isToday ? 'bg-teal-50/20' : ''}`}>
                                        <div 
                                            onClick={() => handleCellClick(emp, day)}
                                            className={`w-full h-full rounded-xl flex flex-col items-center justify-center text-xs border transition-all duration-200 relative overflow-hidden ${isAdmin ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95' : ''} ${isOff ? 'bg-transparent border-transparent hover:bg-gray-100' : `${style.bg} ${style.border} ${style.text}`}`}
                                        >
                                            {isOff ? (
                                                isAdmin && <Plus className="text-gray-200 group-hover:text-gray-400" size={24} />
                                            ) : (
                                                <>
                                                    <div className="flex flex-col items-center z-10 w-full px-1">
                                                        <span className="font-extrabold text-[11px] uppercase tracking-wider mb-1 text-center truncate w-full" title={displayName}>{displayName}</span>
                                                        <div className="flex items-center bg-white/60 px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-sm whitespace-nowrap">
                                                            <Clock size={10} className="mr-1 opacity-70"/>
                                                            {config ? (
                                                                config.isSplitShift ? (
                                                                    <span>{config.startTime}...{config.endTime}</span>
                                                                ) : (
                                                                    <span>{config.startTime} - {config.endTime}</span>
                                                                )
                                                            ) : (
                                                                <span>--:--</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Decorative Background Icon */}
                                                    <Icon className="absolute -bottom-2 -right-2 opacity-10 w-12 h-12 rotate-[-15deg]" />
                                                </>
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

        {/* ASSIGN SHIFT MODAL */}
        {isModalOpen && editingCell && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b bg-gray-50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                                <User size={20}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{editingCell.empName}</h3>
                                <p className="text-xs text-gray-500 font-medium flex items-center">
                                    <CalendarIcon size={12} className="mr-1"/> {new Date(editingCell.dateStr).toLocaleDateString('vi-VN', {weekday:'long', day:'numeric', month:'long'})}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500"/></button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto space-y-3 bg-gray-50/50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chọn ca làm việc</p>
                        
                        <button 
                            onClick={() => handleSelectShift('OFF')}
                            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group ${editingCell.currentShift === 'OFF' ? 'border-gray-400 bg-gray-200 ring-2 ring-gray-300' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200">
                                    <X size={20}/>
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-gray-700">Nghỉ (OFF)</div>
                                    <div className="text-xs text-gray-400">Không có lịch làm việc</div>
                                </div>
                            </div>
                            {editingCell.currentShift === 'OFF' && <div className="w-4 h-4 bg-gray-500 rounded-full"></div>}
                        </button>

                        {settings.shiftConfigs.map(shift => {
                            const style = getShiftStyle(shift.code);
                            const Icon = style.icon;
                            const isSelected = editingCell.currentShift === shift.code;

                            return (
                                <button 
                                    key={shift.code}
                                    onClick={() => handleSelectShift(shift.code)}
                                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden ${isSelected ? `ring-2 ring-offset-2 ring-${style.text.split('-')[1]}-400 border-transparent shadow-md` : 'bg-white border-gray-200 hover:border-teal-300 hover:shadow-md'}`}
                                >
                                    {isSelected && <div className={`absolute inset-0 opacity-10 ${style.bg}`}></div>}
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${style.bg} ${style.text}`}>
                                            <Icon size={20}/>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-gray-900 text-base">{shift.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                <Clock size={12}/> 
                                                {shift.isSplitShift ? (
                                                    <span className="font-mono text-purple-600 font-medium">{shift.startTime}-{shift.breakStart} & {shift.breakEnd}-{shift.endTime}</span>
                                                ) : (
                                                    <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && <div className={`w-4 h-4 rounded-full bg-${style.text.split('-')[1]}-500 relative z-10`}></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
