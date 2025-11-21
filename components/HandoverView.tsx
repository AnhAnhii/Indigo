
import React, { useState } from 'react';
import { BookOpen, Plus, Send, AlertTriangle, Info, Star, User, Clock } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { HandoverLog } from '../types';

export const HandoverView: React.FC = () => {
  const { handoverLogs, addHandoverLog, currentUser } = useGlobalContext();
  const [content, setContent] = useState('');
  const [type, setType] = useState<'NOTE' | 'ISSUE' | 'VIP'>('NOTE');
  const [shift, setShift] = useState('Ca Sáng');

  const handleSubmit = () => {
    if (!content.trim() || !currentUser) return;
    const newLog: HandoverLog = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('vi-VN'),
        shift: shift,
        author: currentUser.name,
        content: content,
        type: type,
        createdAt: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})
    };
    addHandoverLog(newLog);
    setContent('');
  };

  const getTypeStyles = (t: string) => {
      switch(t) {
          case 'ISSUE': return 'bg-red-50 text-red-700 border-red-200';
          case 'VIP': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          default: return 'bg-blue-50 text-blue-700 border-blue-200';
      }
  }

  const getTypeIcon = (t: string) => {
      switch(t) {
          case 'ISSUE': return <AlertTriangle size={16} />;
          case 'VIP': return <Star size={16} />;
          default: return <Info size={16} />;
      }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Sổ Giao Ca</h2>
                <p className="text-gray-500">Ghi chú bàn giao cho ca sau.</p>
            </div>
            <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">
                {handoverLogs.length} ghi chú
            </div>
        </div>

        {/* Input Area */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-3 mb-4">
                <select 
                    value={shift} onChange={(e) => setShift(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <option>Ca Sáng</option>
                    <option>Ca Chiều</option>
                    <option>Ca Tối</option>
                </select>
                
                <button onClick={() => setType('NOTE')} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition-colors ${type === 'NOTE' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    <Info size={16}/> Thông thường
                </button>
                <button onClick={() => setType('ISSUE')} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition-colors ${type === 'ISSUE' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    <AlertTriangle size={16}/> Sự cố / Hỏng hóc
                </button>
                <button onClick={() => setType('VIP')} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition-colors ${type === 'VIP' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    <Star size={16}/> Khách VIP / Đặt bàn
                </button>
            </div>
            
            <div className="relative">
                <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập nội dung bàn giao..."
                    className="w-full border rounded-xl p-4 min-h-[100px] outline-none focus:ring-2 focus:ring-teal-500 pr-12"
                ></textarea>
                <button 
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="absolute bottom-3 right-3 bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>

        {/* Log List */}
        <div className="space-y-4">
            {handoverLogs.length === 0 && (
                <div className="text-center py-10 text-gray-400">Chưa có ghi chú nào.</div>
            )}
            {handoverLogs.map(log => (
                <div key={log.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getTypeStyles(log.type)}`}>
                        {getTypeIcon(log.type)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-900 text-sm">{log.author} <span className="text-gray-400 font-normal">• {log.shift}</span></h4>
                            <span className="text-xs text-gray-400 flex items-center"><Clock size={12} className="mr-1"/> {log.createdAt} • {log.date}</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{log.content}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
