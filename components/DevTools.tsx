
import React, { useState } from 'react';
import { Terminal, Users, Database, Clock, Activity, ShieldCheck, Laptop, Smartphone, Search, Trash2, Copy, Check, Server } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { EmployeeRole } from '../types';

export const DevTools: React.FC = () => {
  const { onlineUsers, systemLogs, currentUser } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'LOGS' | 'DB_SETUP'>('LOGS');
  const [logFilter, setLogFilter] = useState('');
  const [copied, setCopied] = useState(false);

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

  const SQL_SCRIPTS = `
-- 1. Create Tasks Table
create table if not exists public.tasks (
    id text primary key,
    title text not null,
    description text,
    assignee_id text,
    assignee_name text,
    participants text[] default '{}',
    max_participants int default 1,
    creator_id text not null,
    type text not null,
    status text not null,
    difficulty int default 1,
    xp_reward int default 10,
    penalty_xp int default 0,
    rejection_reason text,
    proof_image text,
    created_at text,
    deadline text,
    verified_by text,
    shift_code text,
    required_shifts text[] default '{}'
);

-- 2. Create Feedback Table
create table if not exists public.feedback (
    id text primary key,
    customer_name text,
    phone text,
    rating int not null,
    nps_score int,
    comment text,
    tags text[],
    sentiment text,
    created_at text,
    is_resolved boolean default false,
    staff_id text,
    staff_name text,
    type text default 'INTERNAL_FEEDBACK'
);

-- 3. Update Employees Table (For Gamification)
-- CHẠY DÒNG NÀY NẾU BẠN CHƯA THẤY XP ĐƯỢC CỘNG
alter table public.employees add column if not exists xp int default 0;
alter table public.employees add column if not exists level int default 1;

-- Enable RLS
alter table public.tasks enable row level security;
create policy "Public Access Tasks" on public.tasks for all using (true) with check (true);

alter table public.feedback enable row level security;
create policy "Public Access Feedback" on public.feedback for all using (true) with check (true);
`;

  const handleCopySQL = () => {
      navigator.clipboard.writeText(SQL_SCRIPTS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

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

        {/* MAIN DEV AREA */}
        <div className="lg:col-span-2 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 flex flex-col text-gray-300 font-mono text-sm overflow-hidden">
            {/* Header Tabs */}
            <div className="flex items-center bg-gray-900 border-b border-gray-800 p-2 gap-2">
                <button 
                    onClick={() => setActiveTab('LOGS')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center transition-colors ${activeTab === 'LOGS' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Terminal size={16} className="mr-2"/> System Logs
                </button>
                <button 
                    onClick={() => setActiveTab('DB_SETUP')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center transition-colors ${activeTab === 'DB_SETUP' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Database size={16} className="mr-2"/> Database Setup
                </button>
            </div>

            {/* TAB: SYSTEM LOGS */}
            {activeTab === 'LOGS' && (
                <>
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <div className="relative w-full max-w-xs">
                            <Search size={14} className="absolute left-2 top-2 text-gray-500"/>
                            <input 
                                type="text" 
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                placeholder="Filter logs..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1 pl-7 pr-3 text-xs text-gray-300 focus:outline-none focus:border-gray-500"
                            />
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Connected: app-db-changes
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 p-4 custom-scrollbar">
                        {filteredLogs.length === 0 && <p className="text-gray-600 text-center italic py-10">Waiting for system events...</p>}
                        {filteredLogs.map(log => (
                            <div key={log.id} className="flex gap-3 hover:bg-gray-800/50 p-1 rounded transition-colors group">
                                <span className="text-gray-500 shrink-0 w-20">{log.timestamp}</span>
                                <span className={`font-bold shrink-0 w-32 ${getLogColor(log.type)}`}>[{log.event}]</span>
                                <span className="text-gray-300 break-all">{log.details}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* TAB: DB SETUP */}
            {activeTab === 'DB_SETUP' && (
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-white font-bold text-lg flex items-center"><Server className="mr-2 text-teal-500"/> Khởi tạo Tables</h3>
                            <p className="text-gray-500 mt-1">Copy đoạn code SQL dưới đây và chạy trong Supabase SQL Editor để tạo bảng dữ liệu.</p>
                        </div>
                        <button 
                            onClick={handleCopySQL}
                            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center transition-all ${copied ? 'bg-green-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                        >
                            {copied ? <Check size={14} className="mr-2"/> : <Copy size={14} className="mr-2"/>}
                            {copied ? 'Đã Copy!' : 'Copy SQL'}
                        </button>
                    </div>

                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 font-mono text-xs leading-relaxed text-blue-200 overflow-x-auto">
                        <pre>{SQL_SCRIPTS}</pre>
                    </div>

                    <div className="mt-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <h4 className="text-white font-bold mb-2 text-sm">Hướng dẫn nhanh:</h4>
                        <ol className="list-decimal list-inside text-gray-400 space-y-1">
                            <li>Truy cập <a href="https://supabase.com/dashboard/project/vnuchrpjvfxbghnrqfrq/sql" target="_blank" className="text-blue-400 hover:underline">Supabase Dashboard</a></li>
                            <li>Vào mục <strong>SQL Editor</strong> ở menu bên trái.</li>
                            <li>Bấm <strong>New Query</strong>.</li>
                            <li>Dán (Paste) đoạn mã trên vào và bấm <strong>RUN</strong>.</li>
                            <li>Quay lại app và tải lại trang (F5).</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
