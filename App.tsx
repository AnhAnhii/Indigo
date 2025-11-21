
import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, BarChart2, MessageSquare, ShieldCheck, Menu, X, FileText, DollarSign, Settings, Table, Utensils, ClipboardList, LogOut } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { EmployeeList } from './components/EmployeeList';
import { AttendanceKiosk } from './components/AttendanceKiosk';
import { AiAssistant } from './components/AiAssistant';
import { ScheduleView } from './components/ScheduleView';
import { RequestManager } from './components/RequestManager';
import { PayrollView } from './components/PayrollView';
import { TimesheetView } from './components/TimesheetView';
import { SettingsView } from './components/SettingsView';
import { KitchenView } from './components/KitchenView';
import { ServingChecklist } from './components/ServingChecklist';
import { AppView, EmployeeRole } from './types';
import { GlobalProvider, useGlobalContext } from './contexts/GlobalContext';

const AppContent: React.FC = () => {
  const { currentUser, logout } = useGlobalContext();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- BYPASSED LOGIN SCREEN ---
  // We now assume currentUser is always set by GlobalContext (Default Admin)

  // --- ROLE CHECKER ---
  const isAdmin = currentUser?.role === EmployeeRole.MANAGER;

  // Redirect if user is on restricted page
  useEffect(() => {
      if (!isAdmin && currentUser) {
          const restrictedViews = [AppView.SETTINGS, AppView.EMPLOYEES, AppView.AI_ASSISTANT];
          if (restrictedViews.includes(currentView)) {
              setCurrentView(AppView.DASHBOARD);
          }
      }
      setIsMobileMenuOpen(false);
  }, [currentView, isAdmin, currentUser]);

  const NavItem = ({ view, icon: Icon, label, restricted = false }: { view: AppView; icon: any; label: string, restricted?: boolean }) => {
    // If restricted and user is not admin, hide it
    if (restricted && !isAdmin) return null;

    return (
        <button
        onClick={() => setCurrentView(view)}
        className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
            currentView === view
            ? 'bg-teal-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
        }`}
        >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
        </button>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <Dashboard onViewChange={setCurrentView} />;
      case AppView.EMPLOYEES: return isAdmin ? <EmployeeList /> : null;
      case AppView.ATTENDANCE: return <AttendanceKiosk />;
      case AppView.SCHEDULE: return <ScheduleView />;
      case AppView.REQUESTS: return <RequestManager />;
      case AppView.PAYROLL: return <PayrollView />;
      case AppView.TIMESHEET: return <TimesheetView />;
      case AppView.SETTINGS: return isAdmin ? <SettingsView /> : null;
      case AppView.KITCHEN: return <KitchenView />;
      case AppView.SERVING: return <ServingChecklist />;
      case AppView.AI_ASSISTANT: return isAdmin ? <AiAssistant /> : null;
      default: return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  if (!currentUser) return <div className="flex items-center justify-center h-screen">Đang tải dữ liệu...</div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-2 font-bold text-xl text-teal-700">
          <ShieldCheck />
          <span>RestaurantSync</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-10 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b flex items-center space-x-3">
          <div className="p-2 bg-teal-600 rounded-xl text-white shadow-lg shadow-teal-200">
             <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">RestaurantSync</h1>
            <p className="text-xs text-gray-500 font-medium">Quản lý F&B 4.0</p>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 overflow-y-auto h-[calc(100%-140px)] no-scrollbar">
          <div className="pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tổng quan</div>
          <NavItem view={AppView.DASHBOARD} icon={BarChart2} label="Trang chủ" />
          <NavItem view={AppView.TIMESHEET} icon={Table} label="Bảng công" />
          <NavItem view={AppView.SCHEDULE} icon={Calendar} label="Lịch làm việc" />
          
          <div className="pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vận hành</div>
          <NavItem view={AppView.ATTENDANCE} icon={Clock} label="Chấm công FaceID" />
          <NavItem view={AppView.SERVING} icon={ClipboardList} label="Ra đồ & Khách đoàn" />
          <NavItem view={AppView.KITCHEN} icon={Utensils} label="Bếp & Thực đơn" />
          <NavItem view={AppView.REQUESTS} icon={FileText} label="Đơn từ & Duyệt" />
          <NavItem view={AppView.PAYROLL} icon={DollarSign} label="Bảng lương" />
          <NavItem view={AppView.EMPLOYEES} icon={Users} label="Nhân sự" restricted={true} />
          
          {isAdmin && (
            <>
            <div className="pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hệ thống</div>
            <NavItem view={AppView.SETTINGS} icon={Settings} label="Cấu hình" restricted={true} />
            <NavItem view={AppView.AI_ASSISTANT} icon={MessageSquare} label="Trợ lý AI Gemini" restricted={true} />
            </>
          )}
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t bg-gray-50">
            <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold uppercase">
                    {currentUser.avatar && currentUser.avatar.length < 5 ? currentUser.avatar : currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
                </div>
            </div>
            <button 
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm font-medium"
            >
                <LogOut size={16} /> <span>Đăng xuất</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-[#f8fafc]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;
