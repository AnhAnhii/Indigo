
import React, { useState } from 'react';
import { Utensils, CheckSquare, AlertCircle, Coffee, Ban, CheckCircle2, Circle } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { MenuStatus } from '../types';

export const KitchenView: React.FC = () => {
  const { menuItems, toggleMenuStatus, prepTasks, togglePrepTask } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'MENU' | 'PREP'>('MENU');

  // Categorize Menu Items
  const categories = Array.from(new Set(menuItems.map(i => i.category)));
  
  // Stats for Progress Bar
  const completedTasks = prepTasks.filter(t => t.isCompleted).length;
  const totalTasks = prepTasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const getStatusColor = (status: MenuStatus) => {
      switch (status) {
          case MenuStatus.AVAILABLE: return 'bg-green-100 border-green-300 text-green-800';
          case MenuStatus.LOW_STOCK: return 'bg-yellow-100 border-yellow-300 text-yellow-800';
          case MenuStatus.SOLD_OUT: return 'bg-red-100 border-red-300 text-red-800 opacity-80 grayscale';
          default: return 'bg-gray-100';
      }
  };

  const getStatusLabel = (status: MenuStatus) => {
    switch (status) {
        case MenuStatus.AVAILABLE: return 'Đang bán';
        case MenuStatus.LOW_STOCK: return 'Sắp hết';
        case MenuStatus.SOLD_OUT: return 'Hết món';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vận Hành Bếp & Thực Đơn</h2>
          <p className="text-gray-500">Quản lý trạng thái món ăn và công việc đầu ca.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-200 flex space-x-1 shadow-sm max-w-md">
          <button 
            onClick={() => setActiveTab('MENU')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'MENU' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Utensils size={18} /> Trạng thái Món
          </button>
          <button 
            onClick={() => setActiveTab('PREP')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'PREP' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <CheckSquare size={18} /> Checklist Chuẩn bị
          </button>
      </div>

      {activeTab === 'MENU' && (
        <div className="space-y-8 animate-in fade-in duration-300">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800">
                    <span className="font-bold">Hướng dẫn:</span> Chạm vào thẻ món ăn để thay đổi trạng thái: 
                    <span className="mx-1 px-2 py-0.5 bg-green-100 rounded text-green-800 font-bold text-xs">Có món</span> → 
                    <span className="mx-1 px-2 py-0.5 bg-yellow-100 rounded text-yellow-800 font-bold text-xs">Sắp hết</span> → 
                    <span className="mx-1 px-2 py-0.5 bg-red-100 rounded text-red-800 font-bold text-xs">Hết món (86)</span>
                </div>
             </div>

             {categories.map(cat => (
                 <div key={cat}>
                     <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                        {cat === 'Đồ Uống' ? <Coffee size={20}/> : <Utensils size={20}/>} 
                        {cat}
                     </h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {menuItems.filter(item => item.category === cat).map(item => (
                            <div 
                                key={item.id}
                                onClick={() => toggleMenuStatus(item.id)}
                                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md select-none ${getStatusColor(item.status)}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-lg">{item.name}</div>
                                    {item.status === MenuStatus.SOLD_OUT && <Ban size={20} className="text-red-600"/>}
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="font-medium opacity-80">{item.price.toLocaleString()}đ</span>
                                    <span className="text-xs font-bold uppercase px-2 py-1 bg-white/50 rounded-md backdrop-blur-sm">
                                        {getStatusLabel(item.status)}
                                    </span>
                                </div>
                                {item.status === MenuStatus.SOLD_OUT && (
                                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                                        <span className="bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg -rotate-12 border-2 border-white">HẾT MÓN</span>
                                    </div>
                                )}
                            </div>
                        ))}
                     </div>
                 </div>
             ))}
        </div>
      )}

      {activeTab === 'PREP' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b bg-gray-50">
                  <div className="flex justify-between items-end mb-2">
                      <div>
                          <h3 className="font-bold text-xl text-gray-900">Tiến độ chuẩn bị đầu ca</h3>
                          <p className="text-gray-500 text-sm">Các công việc cần hoàn thành trước khi mở bán.</p>
                      </div>
                      <span className="text-2xl font-bold text-teal-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-teal-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
              </div>

              <div className="divide-y divide-gray-100">
                  {prepTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => togglePrepTask(task.id)}
                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${task.isCompleted ? 'bg-gray-50/50' : 'bg-white'}`}
                      >
                          <div className="flex items-center gap-4">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                  <CheckCircle2 size={16} />
                              </div>
                              <div>
                                  <p className={`font-medium text-base ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.task}</p>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Phụ trách: {task.assignee}</span>
                              </div>
                          </div>
                          {task.isCompleted && (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Hoàn thành</span>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
