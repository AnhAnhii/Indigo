
import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, BarChart2, MessageSquare, ShieldCheck, Menu, X, FileText, DollarSign, Settings, Table, Utensils, ClipboardList, LogOut, RefreshCw, BookOpen, AlertTriangle, Bell, QrCode } from 'lucide-react';
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
import { HandoverView } from './components/HandoverView';
import { ProfileView } from './components/ProfileView';
import { NotificationsView } from './components/NotificationsView'; 
import { QrStation } from './components/QrStation'; // New Component
import { LoginScreen } from './components/LoginScreen';
import { AppView, EmployeeRole } from './types';
import { GlobalProvider, useGlobalContext } from './contexts/GlobalContext';

const AppContent: React.FC = () => {
  const { currentUser, logout, lastUpdated, isLoading, activeAlerts, dismissedAlertIds, dismissAlert } = useGlobalContext();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === EmployeeRole.MANAGER;

  // FILTER ALERTS FOR BANNER (Only show ones not dismissed)
  const bannerAlerts = activeAlerts.filter(a => !dismissedAlertIds.has(a.id));
  // COUNT UNDISMISSED ALERTS FOR SIDEBAR BADGE
  const alertCount = bannerAlerts.length;

  useEffect(() => {
      if (!isAdmin && currentUser) {
          const restrictedViews = [AppView.SETTINGS, AppView.EMPLOYEES, AppView.AI_ASSISTANT, AppView.QR_STATION];
          if (restrictedViews.includes(currentView)) {
              setCurrentView(AppView.DASHBOARD);
          }
      }
      setIsMobileMenuOpen(false);
  }, [currentView, isAdmin, currentUser]);

  // LOGIN GUARD ENABLED
  if (!currentUser) {
      return <LoginScreen />;
  }

  // SPECIAL VIEW: QR STATION (FULL SCREEN)
  if (currentView === AppView.QR_STATION && isAdmin) {
      return <QrStation onBack={() => setCurrentView(AppView.DASHBOARD)} />;
  }

  const NavItem = ({ view, icon: Icon, label, restricted = false, badge = 0 }: { view: AppView; icon: any; label: string, restricted?: boolean, badge?: number }) => {
    if (restricted && !isAdmin) return null;

    return (
        <button
        onClick={() => setCurrentView(view)}
        className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors shrink-0 relative ${
            currentView === view
            ? 'bg-teal-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
        }`}
        >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
        {badge > 0 && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {badge}
            </span>
        )}
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
      case AppView.HANDOVER: return <HandoverView />;
      case AppView.PROFILE: return <ProfileView />;
      case AppView.NOTIFICATIONS: return <NotificationsView onViewChange={setCurrentView} />;
      case AppView.AI_ASSISTANT: return isAdmin ? <AiAssistant /> : null;
      default: return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans overflow-hidden relative">
      
      {/* GLOBAL ALERT BANNER (ONLY SHOW IF NOT DISMISSED) */}
      {bannerAlerts.length > 0 && (
          <div className={`fixed top-0 left-0 right-0 z-50 text-white shadow-lg animate-in slide-in-from-top duration-300 ${bannerAlerts[0].severity === 'HIGH' ? 'bg-red-600' : 'bg-yellow-600'}`}>
              <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between">
                  <div className="flex items-center flex-1">
                      <div className="bg-white/20 p-2 rounded-full mr-3 animate-pulse">
                          <AlertTriangle size={20} className="text-white" />
                      </div>
                      <div>
                          <p className="font-bold text-sm uppercase tracking-wide">Cảnh báo hệ thống ({bannerAlerts.length})</p>
                          <p className="text-xs md:text-sm text-white/90 line-clamp-1">
                              {bannerAlerts[0].message} - {bannerAlerts[0].details}
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center">
                      <button 
                        onClick={() => setCurrentView(activeAlerts[0].type === 'LATE_SERVING' ? AppView.SERVING : AppView.TIMESHEET)}
                        className={`ml-4 bg-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-opacity-90 ${bannerAlerts[0].severity === 'HIGH' ? 'text-red-600' : 'text-yellow-700'}`}
                      >
                          Xem chi tiết
                      </button>
                      <button 
                        onClick={() => dismissAlert(bannerAlerts[0].id)}
                        className="ml-2 p-1 hover:bg-white/20 rounded-full"
                        title="Tắt cảnh báo này"
                      >
                          <X size={18} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mobile Header */}
      <div className={`md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0 ${bannerAlerts.length > 0 ? 'mt-14' : ''}`}>
        <div className="flex items-center space-x-2 font-bold text-xl text-teal-700">
          <ShieldCheck />
          <span>RestaurantSync</span>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView(AppView.NOTIFICATIONS)} className="relative p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell size={22} />
                {alertCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 p-1 rounded-md hover:bg-gray-100">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col h-screen ${bannerAlerts.length > 0 ? 'pt-14 md:pt-0' : ''} ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b flex items-center space-x-3 shrink-0">
          <div className="p-2 bg-teal-600 rounded-xl text-white shadow-lg shadow-teal-200">
             <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">RestaurantSync</h1>
            <p className="text-xs text-gray-500 font-medium">Quản lý F&B 4.0</p>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
          <div className="pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tổng quan</div>
          <NavItem view={AppView.DASHBOARD} icon={BarChart2} label="Trang chủ" />
          <NavItem view={AppView.NOTIFICATIONS} icon={Bell} label="Thông báo" badge={alertCount} />
          <NavItem view={AppView.HANDOVER} icon={BookOpen} label="Sổ Giao Ca" />
          <NavItem view={AppView.TIMESHEET} icon={Table} label="Bảng công" />
          <NavItem view={AppView.SCHEDULE} icon={Calendar} label="Lịch làm việc" />
          
          <div className="pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vận hành</div>
          <NavItem view={AppView.ATTENDANCE} icon={Clock} label="Chấm công" />
          <NavItem view={AppView.SERVING} icon={ClipboardList} label="Ra đồ & Khách đoàn" />
          <NavItem view={AppView.KITCHEN} icon={Utensils} label="Chuẩn bị thực đơn" />
          <NavItem view={AppView.REQUESTS} icon={FileText} label="Đơn từ & Duyệt" />
          <NavItem view={AppView.PAYROLL} icon={DollarSign} label="Bảng lương" />
          <NavItem view={AppView.EMPLOYEES} icon={Users} label="Nhân sự" restricted={true} />
          
          {isAdmin && (
            <>
            <div className="pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hệ thống</div>
            <NavItem view={AppView.QR_STATION} icon={QrCode} label="Mở Trạm QR Code" restricted={true} />
            <NavItem view={AppView.SETTINGS} icon={Settings} label="Cấu hình" restricted={true} />
            <NavItem view={AppView.AI_ASSISTANT} icon={MessageSquare} label="Trợ lý AI Gemini" restricted={true} />
            </>
          )}
        </nav>
        
        <div className="w-full p-4 border-t bg-gray-50 shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
                 <span className="flex items-center"><RefreshCw size={10} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Đồng bộ:</span>
                 <span>{lastUpdated}</span>
            </div>

            <div 
                onClick={() => setCurrentView(AppView.PROFILE)}
                className="flex items-center space-x-3 mb-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold uppercase shrink-0 overflow-hidden">
                    {currentUser.avatar && currentUser.avatar.length > 20 ? (
                        <img src={currentUser.avatar} alt="Avt" className="w-full h-full object-cover" />
                    ) : (
                        currentUser.avatar || currentUser.name.charAt(0)
                    )}
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
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <main className={`flex-1 overflow-y-auto h-screen bg-[#f8fafc] ${bannerAlerts.length > 0 ? 'pt-14 md:pt-12' : ''}`}>
        <div className="p-3 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
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
