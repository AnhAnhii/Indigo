
import React, { useState } from 'react';
import { Check, X, Clock, FileText, User, Filter, Plus, CalendarCheck, ChevronRight } from 'lucide-react';
import { RequestType, RequestStatus, EmployeeRequest } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const RequestManager: React.FC = () => {
  const { requests, addRequest, updateRequestStatus, currentUser } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'ALL' | 'MINE' | 'TO_APPROVE'>('TO_APPROVE');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReqType, setNewReqType] = useState(RequestType.LEAVE);
  const [newReqDate, setNewReqDate] = useState('');
  const [newReqReason, setNewReqReason] = useState('');

  const filteredRequests = requests.filter(req => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'MINE') return req.isMine;
      if (activeTab === 'TO_APPROVE') return !req.isMine && req.status === RequestStatus.PENDING;
      return true;
  });

  const handleCreateRequest = () => {
      if (!newReqDate || !newReqReason) return;

      const newReq: EmployeeRequest = {
          id: Date.now().toString(),
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          avatar: currentUser.name.charAt(0),
          type: newReqType,
          date: newReqDate,
          reason: newReqReason,
          status: RequestStatus.PENDING,
          createdAt: new Date().toLocaleString('vi-VN'),
          isMine: true
      };

      addRequest(newReq);
      setIsModalOpen(false);
      setNewReqDate('');
      setNewReqReason('');
  };

  const getRequestIcon = (type: RequestType) => {
      switch(type) {
          case RequestType.LEAVE: return <div className="bg-orange-100 text-orange-600 p-2 rounded-full"><CalendarCheck size={18} /></div>;
          case RequestType.SHIFT_SWAP: return <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><Clock size={18} /></div>;
          case RequestType.FORGOT_CHECKIN: return <div className="bg-purple-100 text-purple-600 p-2 rounded-full"><FileText size={18} /></div>;
          default: return <div className="bg-gray-100 text-gray-600 p-2 rounded-full"><FileText size={18} /></div>;
      }
  }

  const getStatusBadge = (status: RequestStatus) => {
    switch(status) {
      case RequestStatus.APPROVED: 
        return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">Đã duyệt</span>;
      case RequestStatus.REJECTED: 
        return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">Từ chối</span>;
      default: 
        return <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">Chờ duyệt</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản Lý Đơn Từ</h2>
          <p className="text-gray-500">Xử lý các yêu cầu của nhân viên.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-sm"
        >
            <Plus size={18} className="mr-2"/>
            Tạo đơn mới
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-200 flex space-x-1 shadow-sm max-w-md">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setActiveTab('MINE')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'MINE' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Của tôi
          </button>
          <button 
            onClick={() => setActiveTab('TO_APPROVE')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all relative ${activeTab === 'TO_APPROVE' ? 'bg-teal-100 text-teal-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Tôi duyệt
            {requests.filter(r => !r.isMine && r.status === RequestStatus.PENDING).length > 0 && 
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            }
          </button>
      </div>

      <div className="grid gap-4">
        {filteredRequests.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 border-dashed">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="text-gray-300" size={32} />
                </div>
                <p className="text-gray-500 font-medium">Không có yêu cầu nào.</p>
            </div>
        )}

        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg border border-teal-100">
                            {req.avatar}
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                            {getRequestIcon(req.type)}
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg">{req.type}</h4>
                        <p className="text-sm text-gray-500 font-medium mb-2">Tạo bởi: <span className="text-gray-800">{req.employeeName}</span> • {req.createdAt}</p>
                        
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                                <CalendarCheck size={16} className="text-gray-400"/>
                                <span className="font-semibold">Ngày: {req.date}</span>
                            </div>
                            <p className="text-sm text-gray-600 italic">"{req.reason}"</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end space-y-3">
                    {getStatusBadge(req.status)}
                </div>
            </div>

            {!req.isMine && req.status === RequestStatus.PENDING && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button 
                        onClick={() => updateRequestStatus(req.id, RequestStatus.REJECTED)}
                        className="px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-sm transition-colors"
                    >
                        Từ chối
                    </button>
                    <button 
                        onClick={() => updateRequestStatus(req.id, RequestStatus.APPROVED)}
                        className="px-6 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm shadow-md shadow-teal-200 transition-colors"
                    >
                        Duyệt đơn
                    </button>
                </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Create Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Tạo Đơn Mới</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại đơn</label>
                        <select 
                            value={newReqType}
                            onChange={(e) => setNewReqType(e.target.value as RequestType)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            {Object.values(RequestType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày áp dụng</label>
                        <input 
                            type="date" 
                            value={newReqDate}
                            onChange={(e) => setNewReqDate(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
                        <textarea 
                            value={newReqReason}
                            onChange={(e) => setNewReqReason(e.target.value)}
                            placeholder="Nhập lý do chi tiết..."
                            rows={3}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        ></textarea>
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy</button>
                    <button 
                        onClick={handleCreateRequest}
                        className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-sm"
                    >
                        Gửi đơn
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
