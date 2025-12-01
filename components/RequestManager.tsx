
import React, { useState } from 'react';
import { Check, X, Clock, FileText, User, Filter, Plus, CalendarCheck, ChevronRight, History, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { RequestType, RequestStatus, EmployeeRequest, EmployeeRole } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const RequestManager: React.FC = () => {
  const { requests, addRequest, updateRequestStatus, currentUser, settings } = useGlobalContext();
  const isAdmin = currentUser?.role === EmployeeRole.MANAGER || currentUser?.role === EmployeeRole.DEV;

  const [activeTab, setActiveTab] = useState<'ALL' | 'MINE' | 'TO_APPROVE'>(isAdmin ? 'TO_APPROVE' : 'MINE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReqType, setNewReqType] = useState(RequestType.LEAVE);
  const [newReqDate, setNewReqDate] = useState('');
  const [newReqReason, setNewReqReason] = useState('');
  const [newReqTargetShift, setNewReqTargetShift] = useState('');

  const filteredRequests = requests.filter(req => {
      const currentUserId = String(currentUser?.id || '');
      const reqOwnerId = String(req.employeeId || '');
      const isMyRequest = reqOwnerId === currentUserId;

      if (!isAdmin) return isMyRequest;
      if (activeTab === 'ALL') return true;
      if (activeTab === 'MINE') return isMyRequest;
      if (activeTab === 'TO_APPROVE') return !isMyRequest && req.status === RequestStatus.PENDING;
      return true;
  }).sort((a, b) => Number(b.id) - Number(a.id));

  const handleCreateRequest = () => {
      if (!newReqDate || !newReqReason || !currentUser) return;
      if (newReqType === RequestType.SHIFT_SWAP && !newReqTargetShift) { alert("Vui lòng chọn ca muốn đổi!"); return; }

      const newReq: EmployeeRequest = {
          id: Date.now().toString(),
          employeeId: String(currentUser.id),
          employeeName: currentUser.name,
          avatar: currentUser.name.charAt(0),
          type: newReqType,
          date: newReqDate,
          reason: newReqReason,
          status: RequestStatus.PENDING,
          targetShift: newReqType === RequestType.SHIFT_SWAP ? newReqTargetShift : undefined,
          createdAt: new Date().toLocaleString('vi-VN'),
          isMine: true
      };
      addRequest(newReq);
      setIsModalOpen(false);
      setNewReqDate(''); setNewReqReason(''); setNewReqTargetShift('');
  };

  const getRequestIcon = (type: RequestType) => {
      switch(type) {
          case RequestType.LEAVE: return <div className="bg-orange-100 text-orange-600 p-2 rounded-full"><CalendarCheck size={18} /></div>;
          case RequestType.SHIFT_SWAP: return <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><ArrowRightLeft size={18} /></div>;
          case RequestType.FORGOT_CHECKIN: return <div className="bg-purple-100 text-purple-600 p-2 rounded-full"><FileText size={18} /></div>;
          default: return <div className="bg-gray-100 text-gray-600 p-2 rounded-full"><FileText size={18} /></div>;
      }
  }

  const getStatusBadge = (status: RequestStatus) => {
    switch(status) {
      case RequestStatus.APPROVED: 
        return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200 flex items-center"><Check size={12} className="mr-1"/> Đã duyệt</span>;
      case RequestStatus.REJECTED: 
        return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 flex items-center"><X size={12} className="mr-1"/> Từ chối</span>;
      default: 
        return <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 flex items-center"><Clock size={12} className="mr-1"/> Chờ duyệt</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản Lý Đơn Từ</h2>
          <p className="text-gray-500">{isAdmin ? "Xét duyệt và quản lý các yêu cầu." : "Tạo đơn xin nghỉ, đổi ca và theo dõi lịch sử."}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-sm transition-colors">
            <Plus size={18} className="mr-2"/> Tạo đơn mới
        </button>
      </div>

      {isAdmin && (
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 flex space-x-1 shadow-sm max-w-md animate-in fade-in">
              <button onClick={() => setActiveTab('ALL')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Tất cả</button>
              <button onClick={() => setActiveTab('MINE')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'MINE' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Của tôi</button>
              <button onClick={() => setActiveTab('TO_APPROVE')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all relative ${activeTab === 'TO_APPROVE' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                Tôi duyệt {requests.filter(r => String(r.employeeId) !== String(currentUser?.id) && r.status === RequestStatus.PENDING).length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
          </div>
      )}

      <div className="grid gap-4">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === RequestStatus.APPROVED ? 'bg-green-500' : req.status === RequestStatus.REJECTED ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
            <div className="flex justify-between items-start pl-3">
                <div className="flex items-start gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg border border-teal-100">{req.avatar || req.employeeName.charAt(0)}</div>
                        <div className="absolute -bottom-1 -right-1">{getRequestIcon(req.type)}</div>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            {req.type}
                            {req.targetShift && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">-> {req.targetShift}</span>}
                        </h4>
                        <p className="text-sm text-gray-500 font-medium mb-2">Tạo bởi: <span className="text-gray-800">{req.employeeName}</span> • {req.createdAt}</p>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3 min-w-[250px]">
                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-1"><CalendarCheck size={16} className="text-gray-400"/><span className="font-semibold">Ngày: {req.date}</span></div>
                            <p className="text-sm text-gray-600 italic border-t border-gray-200 pt-1 mt-1">"{req.reason}"</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                    {getStatusBadge(req.status)}
                    {/* Approved By Info */}
                    {req.status !== RequestStatus.PENDING && req.approvedBy && (
                        <div className="text-[10px] text-gray-400 text-right bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            <div className="flex items-center gap-1 justify-end font-bold text-gray-500"><ShieldCheck size={10}/> {req.approvedBy}</div>
                            <div>{req.approvedAt}</div>
                        </div>
                    )}
                </div>
            </div>
            {isAdmin && String(req.employeeId) !== String(currentUser?.id) && req.status === RequestStatus.PENDING && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3 pl-3">
                    <button onClick={() => updateRequestStatus(req.id, RequestStatus.REJECTED)} className="px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-sm transition-colors">Từ chối</button>
                    <button onClick={() => updateRequestStatus(req.id, RequestStatus.APPROVED)} className="px-6 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm shadow-md shadow-teal-200 transition-colors">Duyệt đơn</button>
                </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-900">Tạo Đơn Mới</h3><button onClick={() => setIsModalOpen(false)}><X/></button></div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại đơn</label>
                        <select value={newReqType} onChange={(e) => setNewReqType(e.target.value as RequestType)} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none">{Object.values(RequestType).map(type => (<option key={type} value={type}>{type}</option>))}</select>
                    </div>
                    {newReqType === RequestType.SHIFT_SWAP && (
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 mb-1">Ca muốn đổi sang</label>
                            <select value={newReqTargetShift} onChange={(e) => setNewReqTargetShift(e.target.value)} className="w-full border border-blue-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="">-- Chọn ca làm việc --</option>
                                {settings.shiftConfigs.map(shift => (<option key={shift.code} value={shift.code}>{shift.name} ({shift.startTime} - {shift.endTime})</option>))}
                                <option value="OFF">Nghỉ (OFF)</option>
                            </select>
                        </div>
                    )}
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày áp dụng</label><input type="date" value={newReqDate} onChange={(e) => setNewReqDate(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label><textarea value={newReqReason} onChange={(e) => setNewReqReason(e.target.value)} placeholder="Nhập lý do..." rows={3} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"></textarea></div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy</button><button onClick={handleCreateRequest} className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-sm">Gửi đơn</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
