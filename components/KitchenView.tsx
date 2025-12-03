
import React, { useState } from 'react';
import { CheckSquare, ChefHat, Plus, Trash2, ListChecks, Square, CheckCircle2 } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { PrepTask } from '../types';

export const KitchenView: React.FC = () => {
  const { prepTasks, addPrepTask, togglePrepTask, deletePrepTask, currentUser } = useGlobalContext();
  const [newTaskName, setNewTaskName] = useState('');

  const handleAddTask = () => {
      if (!newTaskName.trim()) return;
      const newTask: PrepTask = {
          id: Date.now().toString(),
          task: newTaskName,
          isCompleted: false,
          assignee: currentUser ? currentUser.name : 'Unknown'
      };
      addPrepTask(newTask);
      setNewTaskName('');
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <ChefHat className="text-orange-600" /> Bếp & Bar
          </h2>
          <p className="text-sm text-gray-500">Quản lý các công việc chung trong ca làm việc.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-3xl mx-auto">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <ListChecks className="mr-2 text-teal-600" size={24}/> Danh sách công việc cần làm
          </h3>
          
          {/* Add Task Input */}
          <div className="flex gap-2 mb-6">
              <input 
                  type="text" 
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Thêm việc (VD: Luộc rau, Lau sàn, Kiểm tra gas...)"
                  className="flex-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
              />
              <button 
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim()}
                  className="bg-teal-600 text-white p-3 rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-md transition-colors"
              >
                  <Plus size={20} />
              </button>
          </div>

          {/* Task List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {prepTasks.length === 0 && (
                  <div className="text-center text-gray-400 py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <CheckSquare size={32} className="mx-auto mb-2 opacity-50"/>
                      <p>Chưa có công việc nào.</p>
                  </div>
              )}
              {prepTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between group p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                      <div 
                          onClick={() => togglePrepTask(task.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                          <div className={`shrink-0 transition-colors ${task.isCompleted ? 'text-green-500' : 'text-gray-300'}`}>
                              {task.isCompleted ? <CheckCircle2 size={24} /> : <Square size={24} />}
                          </div>
                          <div className="flex flex-col">
                              <span className={`text-base font-medium ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                  {task.task}
                              </span>
                              <span className="text-xs text-gray-400">Tạo bởi: {task.assignee}</span>
                          </div>
                      </div>
                      <button 
                          onClick={() => deletePrepTask(task.id)}
                          className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                          <Trash2 size={18} />
                      </button>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};
