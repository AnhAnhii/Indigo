
import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, BarChart2, MessageSquare, Menu, X, FileText, DollarSign, Settings, Table, ClipboardList, LogOut, BookOpen, AlertTriangle, Bell, QrCode, Wifi, WifiOff, Loader2, Terminal, CheckSquare, Smile, Star, Sparkles, ConciergeBell, BellRing } from 'lucide-react';
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
import { HandoverView } from './components/HandoverView';
import { ProfileView } from './components/ProfileView';
import { NotificationsView } from './components/NotificationsView'; 
import { QrStation } from './components/QrStation'; 
import { DevTools } from './components/DevTools';
import { LoginScreen } from './components/LoginScreen';
import { GuestMenu } from './components/GuestMenu'; 
import { TaskView } from './components/TaskView'; 
import { FeedbackManager } from './components/FeedbackManager'; 
import { StaffReviewQr } from './components/StaffReviewQr'; 
import { ReviewRedirect } from './components/ReviewRedirect'; 
import { MarketingView } from './components/MarketingView';
import { GroupOrderManager } from './components/GroupOrderManager'; 
import { ReceptionistView } from './components/ReceptionistView'; // Import New Component
import { AppView, EmployeeRole } from './types';
import { GlobalProvider, useGlobalContext } from './contexts/GlobalContext';

// LOGO CONFIGURATION - NEW GITHUB RAW LINK
export const LOGO_URL = "https://github.com/AnhAnhii/png/blob/main/487238068_1200682658427927_3815163928792374270_n-removebg-preview.png?raw=true";

const AppContent: React.FC = () => {
  const { currentUser, logout, activeAlerts, dismissedAlertIds, dismissAlert, connectionStatus, isRestoringSession } = useGlobalContext();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // GUEST MODES STATE
  const [guestTableId, setGuestTableId] = useState<string | null>(null);
  const [reviewRedirectStaffId, setReviewRedirectStaffId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === EmployeeRole.MANAGER || currentUser?.role === EmployeeRole.DEV || currentUser?.role === EmployeeRole.DEPARTMENT_HEAD;
  const isDev = currentUser?.role === EmployeeRole.DEV;
  // Allow Receptionist role to access specific views
  const isReceptionist = currentUser?.role === EmployeeRole.RECEPTIONIST || isAdmin;

  const bannerAlerts = activeAlerts.filter(a => !dismissedAlertIds.has(a.id));
  const alertCount = bannerAlerts.length;

  useEffect(() => {
      // CHECK FOR GUEST MODE URL PARAMETERS
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table');
      const modeParam = params.get('mode');
      const staffIdParam = params.get('staffId');

      if (tableParam) {
          setGuestTableId(tableParam);
          return;
      }
      
      // Handle ?mode=review_redirect&staffId=...
      if (modeParam === 'review_redirect' && staffIdParam) {
          setReviewRedirectStaffId(staffIdParam);
          return;
      }

      if (!isAdmin && currentUser) {
          const restrictedViews = [AppView.SETTINGS, AppView.EMPLOYEES, AppView.AI_ASSISTANT, AppView.QR_STATION, AppView.DEV_TOOLS, AppView.FEEDBACK, AppView.MARKETING];
          if (restrictedViews.includes(currentView)) {
              setCurrentView(AppView.DASHBOARD);
          }
      }
      setIsMobileMenuOpen(false);
  }, [currentView, isAdmin, currentUser]);

  // RENDER GUEST MENU
  if (guestTableId) {
      return <GuestMenu tableId={guestTableId} />;
  }

  // RENDER REVIEW REDIRECT
  if (reviewRedirectStaffId) {
      return <ReviewRedirect staffId={reviewRedirectStaffId} />;
  }

  // HANDLE INITIAL LOADING
  if (isRestoringSession) {
      return (
          <div className="min-h-screen bg-teal-800 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                   <img src={LOGO_URL} alt="Logo" className="w-20 h-20 object-contain" />
              </div>
              <Loader2 size={32} className="text-white animate-spin" />
              <p className="text-white/80 mt-2 font-medium">Đang khởi động hệ thống...</p>
          </div>
      );
  }

  if (!currentUser) return <LoginScreen />;

  if (currentView === AppView.QR_STATION && isAdmin) {
      return <QrStation onBack={() => setCurrentView(AppView.DASHBOARD)} />;
  }

  const NavItem = ({ view, icon: Icon, label, restricted = false, devOnly = false, badge = 0 }: { view: AppView; icon: any; label: string, restricted?: boolean, devOnly?: boolean, badge?: number }) => {
    if (restricted && !isAdmin) return null;
    if (devOnly && !isDev) return null;

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
      case AppView.GROUP_MENU: return <GroupOrderManager />;
      case AppView.RECEPTIONIST: return <ReceptionistView />; // NEW VIEW
      case AppView.HANDOVER: return <HandoverView />;
      case AppView.PROFILE: return <ProfileView />;
      case AppView.NOTIFICATIONS: return <NotificationsView onViewChange={setCurrentView} />;
      case AppView.AI_ASSISTANT: return isAdmin ? <AiAssistant /> : null;
      case AppView.DEV_TOOLS: return isDev ? <DevTools /> : null;
      case AppView.TASKS: return <TaskView />;
      case AppView.REVIEW_QR: return <StaffReviewQr />;
      case AppView.FEEDBACK: return isAdmin ? <FeedbackManager /> : null;
      case AppView.MARKETING: return isDev ? <MarketingView /> : null;
      default: return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans overflow-hidden relative">
      
      {bannerAlerts.length > 0 && (
          <div className={`fixed top-0 left-0 right-0 z-50 text-white shadow-lg animate-in slide-in-from-top duration-300 ${bannerAlerts[0].severity === 'HIGH' ? 'bg-red-600' : 'bg-yellow-600'}`}>
              <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between">
                  <div className="flex items-start md:items-center flex-1">
                      <div className="bg-white/20 p-2 rounded-full mr-3 animate-pulse mt-0.5 md:mt-0 shrink-0">
                          <AlertTriangle size={20} className="text-white" />
                      </div>
                      <div className="overflow-hidden">
                          <p className="font-bold text-sm uppercase tracking-wide truncate">Cảnh báo hệ thống ({bannerAlerts.length})</p>
                          <p className="text-xs md:text-sm text-white/90 line-clamp-2 md:line-clamp-1 break-words">
                              {bannerAlerts[0].message} • {bannerAlerts[0].details}
                          </p>
                      </div>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                      <button 
                        onClick={() => setCurrentView(activeAlerts[0].type === 'BAD_FEEDBACK' ? AppView.FEEDBACK : AppView.TIMESHEET)}
                        className={`hidden sm:block ml-4 bg-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-opacity-90 ${bannerAlerts[0].severity === 'HIGH' ? 'text-red-600' : 'text-yellow-700'}`}
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

      <div className={`md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0 ${bannerAlerts.length > 0 ? 'mt-14' : ''}`}>
        <div className="flex items-center space-x-3 text-teal-700">
           <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
           <div className="flex flex-col">
               <span className="text-lg font-bold leading-none">Indigo Sapa</span>
               <span className="text-[9px] text-gray-400 font-medium font-mono mt-0.5">by Rambu - Sabu</span>
           </div>
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

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col h-screen ${bannerAlerts.length > 0 ? 'pt-14 md:pt-0' : ''} ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b flex items-center space-x-3 shrink-0">
          <img src={LOGO_URL} alt="Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">Indigo Sapa</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Restaurant & Bar</p>
            <p className="text-[9px] text-gray-400 font-mono mt-1 font-medium">by Rambu - Sabu</p>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
          <div className="pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tổng quan</div>
          <NavItem view={AppView.DASHBOARD} icon={BarChart2} label="Trang chủ" />
          {isReceptionist && (
              <NavItem view={AppView.RECEPTIONIST} icon={BellRing} label="Báo Khách Đến" />
          )}
          <NavItem view={AppView.TASKS} icon={CheckSquare} label="Nhiệm vụ & KPI" />
          <NavItem view={AppView.REVIEW_QR} icon={Star} label="QR Xin Review" />
          <NavItem view={AppView.NOTIFICATIONS} icon={Bell} label="Thông báo" badge={alertCount} />
          <NavItem view={AppView.HANDOVER} icon={BookOpen} label="Sổ Giao Ca" />
          <NavItem view={AppView.TIMESHEET} icon={Table} label="Bảng công" />
          <NavItem view={AppView.SCHEDULE} icon={Calendar} label="Lịch làm việc" />
          
          <div className="pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vận hành</div>
          <NavItem view={AppView.GROUP_MENU} icon={ClipboardList} label="Thực Đơn Đoàn" /> 
          <NavItem view={AppView.ATTENDANCE} icon={Clock} label="Chấm công" />
          <NavItem view={AppView.KITCHEN} icon={ConciergeBell} label="Công việc bếp" />
          <NavItem view={AppView.REQUESTS} icon={FileText} label="Đơn từ & Duyệt" />
          <NavItem view={AppView.PAYROLL} icon={DollarSign} label="Bảng lương" />
          <NavItem view={AppView.EMPLOYEES} icon={Users} label="Nhân sự" restricted={true} />
          
          {isAdmin && (
            <>
            <div className="pt-4 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hệ thống</div>
            <NavItem view={AppView.FEEDBACK} icon={Smile} label="Quản lý Review" restricted={true} />
            <NavItem view={AppView.QR_STATION} icon={QrCode} label="Mở Trạm QR Code" restricted={true} />
            <NavItem view={AppView.SETTINGS} icon={Settings} label="Cấu hình" restricted={true} />
            <NavItem view={AppView.AI_ASSISTANT} icon={MessageSquare} label="Trợ lý AI Gemini" restricted={true} />
            </>
          )}

          {isDev && (
             <>
             <div className="pt-4 pb-2 text-[11px] font-bold text-indigo-400 uppercase tracking-widest">Developer</div>
             <NavItem view={AppView.MARKETING} icon={Sparkles} label="Marketing AI" devOnly={true} />
             <NavItem view={AppView.DEV_TOOLS} icon={Terminal} label="Logs & Online" devOnly={true} />
             </>
          )}
        </nav>
        
        <div className="w-full p-4 border-t bg-gray-50 shrink-0 space-y-3">
            <div className={`flex items-center justify-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                connectionStatus === 'CONNECTED' 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
                {connectionStatus === 'CONNECTED' ? <Wifi size={14} /> : <WifiOff size={14} />}
                {connectionStatus === 'CONNECTED' ? 'Hệ thống Online' : 'Mất kết nối'}
            </div>

            <div 
                onClick={() => setCurrentView(AppView.PROFILE)}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
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
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <main className={`flex-1 overflow-y-auto h-screen bg-[#f8fafc] ${bannerAlerts.length > 0 ? 'pt-14 md:pt-12' : ''}`}>
        <div className="p-3 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// ROOT APP COMPONENT WRAPPER
const App: React.FC = () => {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
};

export default App;
