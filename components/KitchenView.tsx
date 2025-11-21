
import React, { useMemo } from 'react';
import { CheckSquare, Utensils, Users, MapPin, CheckCircle2, AlertCircle, ChefHat } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';

export const KitchenView: React.FC = () => {
  const { servingGroups, toggleSauceItem } = useGlobalContext();
  const activeGroups = servingGroups.filter(g => g.status === 'ACTIVE');

  // --- LOGIC: AGGREGATE TOTALS ---
  const preparationTotals = useMemo(() => {
      const totals: Record<string, { total: number; completed: number; unit: string }> = {};

      activeGroups.forEach(group => {
          if (group.prepList) {
              group.prepList.forEach(item => {
                  if (!totals[item.name]) {
                      totals[item.name] = { total: 0, completed: 0, unit: item.unit };
                  }
                  totals[item.name].total += item.quantity;
                  if (item.isCompleted) {
                      totals[item.name].completed += item.quantity;
                  }
              });
          }
      });

      // Sort by pending quantity (items with most work left appear first)
      return Object.entries(totals).sort(([, a], [, b]) => 
          (b.total - b.completed) - (a.total - a.completed)
      );
  }, [activeGroups]);

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
             <ChefHat className="text-orange-600" /> Chuẩn Bị Thực Đơn
          </h2>
          <p className="text-xs md:text-sm text-gray-500">Tổng hợp đồ dùng, nước chấm cần chuẩn bị.</p>
        </div>
        <div className="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg w-fit">
            {activeGroups.length} đoàn đang chờ
        </div>
      </div>

      {/* --- TOTAL SUMMARY HEADER (MOBILE OPTIMIZED) --- */}
      {preparationTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 overflow-hidden">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <AlertCircle size={12} /> Tổng khối lượng cần làm
            </h3>
            
            {/* Horizontal Scroll Container */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x">
                {preparationTotals.map(([name, stats]) => {
                    const progress = Math.round((stats.completed / stats.total) * 100);
                    const isDone = progress === 100;
                    
                    return (
                        <div key={name} className={`snap-start shrink-0 min-w-[130px] md:min-w-[160px] p-3 rounded-xl border flex flex-col justify-between transition-all ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold line-clamp-1 ${isDone ? 'text-green-700' : 'text-gray-700'}`} title={name}>
                                        {name}
                                    </span>
                                    {isDone && <CheckCircle2 size={14} className="text-green-600" />}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-bold ${isDone ? 'text-green-600' : 'text-gray-900'}`}>
                                        {stats.total - stats.completed}
                                    </span>
                                    <span className="text-[10px] text-gray-400 uppercase">còn lại</span>
                                </div>
                            </div>
                            
                            <div className="mt-2">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                    <span>Tổng: {stats.total} {stats.unit}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-orange-500'}`} 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* --- INDIVIDUAL GROUPS LIST --- */}
      <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
          {activeGroups.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 mx-4 md:mx-0">
                 <Utensils className="mx-auto text-gray-300 mb-4" size={48} />
                 <p className="text-gray-500">Bếp đang rảnh rỗi.</p>
                 <p className="text-sm text-gray-400">Chưa có đoàn khách nào cần chuẩn bị.</p>
              </div>
          )}

          {activeGroups.map(group => (
              <div key={group.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Group Header */}
                  <div className="p-3 md:p-4 bg-gray-50 border-b flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
                              {group.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                              <h3 className="font-bold text-gray-900 truncate text-base md:text-lg">{group.name}</h3>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                  <span className="flex items-center bg-white px-1.5 py-0.5 rounded border border-gray-200"><MapPin size={10} className="mr-1"/> {group.location}</span>
                                  <span className="flex items-center bg-white px-1.5 py-0.5 rounded border border-gray-200"><Users size={10} className="mr-1"/> {group.guestCount} pax</span>
                                  <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">x{group.tableCount || '?'} bàn</span>
                              </div>
                          </div>
                      </div>
                      <div className="flex justify-between md:justify-end items-center w-full md:w-auto mt-1 md:mt-0">
                          <div className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-600">
                              Giờ vào: {group.startTime}
                          </div>
                      </div>
                  </div>
                  
                  {/* Checklist Grid */}
                  <div className="p-2 md:p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {group.prepList && group.prepList.length > 0 ? (
                          group.prepList.map((item, idx) => (
                              <div 
                                 key={idx} 
                                 onClick={() => toggleSauceItem(group.id, item.name)}
                                 className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all touch-manipulation ${item.isCompleted ? 'bg-green-50 border-green-200 shadow-none' : 'bg-white border-gray-100 shadow-sm border-b-2 border-b-gray-200'}`}
                              >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <div className={`w-6 h-6 shrink-0 rounded border flex items-center justify-center transition-colors ${item.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                                          {item.isCompleted && <CheckCircle2 size={16} />}
                                      </div>
                                      <div className="truncate">
                                          <p className={`font-bold text-sm truncate ${item.isCompleted ? 'text-green-800 line-through opacity-70' : 'text-gray-800'}`}>{item.name}</p>
                                          <p className="text-[10px] text-gray-500 truncate">{item.note || 'Tiêu chuẩn'}</p>
                                      </div>
                                  </div>
                                  <div className="text-right shrink-0 pl-2">
                                      <span className={`block font-bold text-lg ${item.isCompleted ? 'text-green-700' : 'text-teal-700'}`}>{item.quantity}</span>
                                      <span className="text-[10px] text-gray-400 uppercase font-medium">{item.unit}</span>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="col-span-full p-4 text-center text-sm text-gray-500 italic">
                              Đang tính toán hoặc không có đồ cần chuẩn bị...
                          </div>
                      )}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
