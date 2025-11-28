
import React, { useState } from 'react';
import { Terminal, Users, Database, Clock, Activity, ShieldCheck, Laptop, Smartphone, Search, Trash2 } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { EmployeeRole } from '../types';

export const DevTools: React.FC = () => {
  const { onlineUsers, systemLogs, currentUser } = useGlobalContext();
  const [logFilter, setLogFilter] = useState('');

  if (currentUser?.role !== EmployeeRole.DEV) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShieldCheck size={64} className="mb-4 text-red-400" />
              <h2 className="text-xl font-bold text-gray-700">Access Denied</h2>
              <p>Chức năng này chỉ dành cho tài khoản Developer.</p>
          </div>
      );
  }

  const filteredLogs = systemLogs.filter(log => 
      log.event.toLowerCase().includes(logFilter.toLowerCase()) || 
      log.details.toLowerCase().includes(logFilter.toLowerCase())
  );

  const getLogColor = (type: string) => {
      switch(type) {
          case 'ERROR': return 'text-red-500';
          case 'WARNING': return 'text-orange-500';
          case 'DB_CHANGE': return 'text-blue-400';
          default: return 'text-gray-300';
      }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
        {/* ONLINE USERS COLUMN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="font-bold text-gray-900 flex items-center">
                    <Users className="mr-2 text-teal-600" size={20} />
                    Online ({onlineUsers.length})
                </h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse">Live</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {onlineUsers.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Không có ai online.</p>}
                {onlineUsers.map(user => (
                    <div key={user.userId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                        <div className="relative">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-800 font-bold">
                                {user.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-gray-800 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                {user.role} 
                                {user.platform === 'Mobile' ? <Smartphone size={10} /> : <Laptop size={10} />}
                            </p>
                        </div>
                        <div className="text-xs text-gray-400 font-mono text-right">
                             {new Date(user.onlineAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SYSTEM LOGS COLUMN */}
        <div className="lg:col-span-2 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 p-4 flex flex-col text-gray-300 font-mono text-sm">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                <h3 className="font-bold text-white flex items-center">
                    <Terminal className="mr-2 text-green-500" size={20} />
                    System Realtime Logs
                </h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-2 top-2 text-gray-500"/>
                        <input 
                            type="text" 
                            value={logFilter}
                            onChange={(e) => setLogFilter(e.target.value)}
                            placeholder="Filter logs..."
                            className="bg-gray-800 border border-gray-700 rounded-lg py-1 pl-7 pr-3 text-xs text-gray-300 focus:outline-none focus:border-gray-500"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredLogs.length === 0 && <p className="text-gray-600 text-center italic py-10">Waiting for system events...</p>}
                {filteredLogs.map(log => (
                    <div key={log.id} className="flex gap-3 hover:bg-gray-800/50 p-1 rounded transition-colors group">
                        <span className="text-gray-500 shrink-0 w-20">{log.timestamp}</span>
                        <span className={`font-bold shrink-0 w-32 ${getLogColor(log.type)}`}>[{log.event}]</span>
                        <span className="text-gray-300 break-all">{log.details}</span>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 pt-2 border-t border-gray-700 flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Connected to Supabase Channel: app-db-changes
                </div>
                <span>{systemLogs.length} events captured</span>
            </div>
        </div>
    </div>
  );
};
