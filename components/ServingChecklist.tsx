
import React, { useState, useRef } from 'react';
import { ClipboardList, Users, MapPin, PlusCircle, MinusCircle, CheckCircle2, Camera, Image as ImageIcon, Loader2, ChevronLeft, X, Edit3, Trash2, Plus, Save, RotateCcw, CheckCheck, History, Calendar } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { ServingGroup, ServingItem } from '../types';
import { parseMenuImage } from '../services/geminiService';

export const ServingChecklist: React.FC = () => {
  const { 
      servingGroups, incrementServedItem, decrementServedItem, 
      addServingGroup, updateServingGroup, completeServingGroup, deleteServingGroup,
      addServingItem, updateServingItem, deleteServingItem
  } = useGlobalContext();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = servingGroups.find(g => g.id === selectedGroupId) || null;
  
  // --- VIEW MODE ---
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [historyDate, setHistoryDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }));

  // --- ADD GROUP MODAL STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [step, setStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');
  
  // AI Detected Data Staging
  const [detectedGroups, setDetectedGroups] = useState<any[]>([]);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EDIT ITEM MODAL STATE ---
  const [editingItem, setEditingItem] = useState<ServingItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState(0);
  const [editUnit, setEditUnit] = useState('');

  // --- EDIT GROUP MODAL STATE ---
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupLocation, setEditGroupLocation] = useState('');
  const [editGroupPax, setEditGroupPax] = useState(0);

  // Filter groups
  const activeGroups = servingGroups.filter(g => g.status === 'ACTIVE');
  const historyGroups = servingGroups.filter(g => g.status === 'COMPLETED' && g.date === historyDate);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setCapturedImage(reader.result as string);
              // Auto scan when image is uploaded
              analyzeImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const analyzeImage = async (base64: string) => {
      setIsScanning(true);
      try {
          const rawGroups = await parseMenuImage(base64);
          
          // Map AI response to workable state with IDs
          const mappedGroups = rawGroups.map((g: any, idx: number) => ({
              id: `temp_${Date.now()}_${idx}`,
              name: g.groupName || `Đoàn khách ${idx + 1}`,
              location: g.location || 'Chưa xác định',
              guestCount: g.guestCount || 0,
              tableCount: g.tableCount || 0, // Capture table count from AI
              items: g.items.map((i: any, iIdx: number) => ({
                  id: `temp_item_${Date.now()}_${idx}_${iIdx}`,
                  name: i.name,
                  totalQuantity: i.quantity,
                  servedQuantity: 0,
                  unit: i.unit || 'Phần'
              }))
          }));

          setDetectedGroups(mappedGroups);
          setStep('REVIEW');
      } catch (e) {
          console.error(e);
          alert("Không thể phân tích ảnh. Vui lòng thử lại.");
      } finally {
          setIsScanning(false);
      }
  };

  const handleConfirmAllGroups = () => {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
      
      detectedGroups.forEach(g => {
          const newGroup: ServingGroup = {
              id: Date.now().toString() + Math.random().toString().substr(2, 5),
              name: g.name,
              location: g.location,
              guestCount: g.guestCount,
              tableCount: g.tableCount,
              startTime: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}),
              date: todayStr,
              status: 'ACTIVE',
              items: g.items.map((i: any) => ({
                  ...i,
                  id: Date.now().toString() + Math.random().toString().substr(2, 5)
              }))
          };
          addServingGroup(newGroup);
      });

      resetAddModal();
  };

  const resetAddModal = () => {
      setIsAddModalOpen(false);
      setStep('UPLOAD');
      setDetectedGroups([]);
      setCapturedImage(null);
  };

  const updateDetectedGroupField = (index: number, field: string, value: any) => {
      const updated = [...detectedGroups];
      updated[index] = { ...updated[index], [field]: value };
      setDetectedGroups(updated);
  };

  // --- ITEM EDIT LOGIC ---
  const openEditItemModal = (item: ServingItem) => {
      setEditingItem(item);
      setEditName(item.name);
      setEditQuantity(item.totalQuantity);
      setEditUnit(item.unit);
      setIsEditItemModalOpen(true);
  };

  const openAddItemModal = () => {
      setEditingItem(null); 
      setEditName('');
      setEditQuantity(1);
      setEditUnit('Đĩa');
      setIsEditItemModalOpen(true);
  };

  const handleSaveItem = () => {
      if (!selectedGroup) return;
      if (!editName) { alert("Vui lòng nhập tên món"); return; }

      if (editingItem) {
          updateServingItem(selectedGroup.id, editingItem.id, {
              name: editName,
              totalQuantity: editQuantity,
              unit: editUnit
          });
      } else {
          const newItem: ServingItem = {
              id: Date.now().toString(),
              name: editName,
              totalQuantity: editQuantity,
              servedQuantity: 0,
              unit: editUnit
          };
          addServingItem(selectedGroup.id, newItem);
      }
      setIsEditItemModalOpen(false);
  };

  const handleDeleteItem = () => {
      if (!selectedGroup || !editingItem) return;
      if (window.confirm(`Bạn có chắc chắn muốn xóa món "${editingItem.name}" không?`)) {
          deleteServingItem(selectedGroup.id, editingItem.id);
          setIsEditItemModalOpen(false);
      }
  };

  // --- GROUP EDIT LOGIC ---
  const openEditGroupModal = () => {
      if(!selectedGroup) return;
      setEditGroupName(selectedGroup.name);
      setEditGroupLocation(selectedGroup.location);
      setEditGroupPax(selectedGroup.guestCount);
      setIsEditGroupModalOpen(true);
  }

  const handleSaveGroup = () => {
      if (!selectedGroup) return;
      updateServingGroup(selectedGroup.id, {
          name: editGroupName,
          location: editGroupLocation,
          guestCount: editGroupPax,
      });
      setIsEditGroupModalOpen(false);
  }

  // DELETE GROUP
  const handleDeleteGroup = (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      if (window.confirm("Bạn có chắc chắn muốn xóa đoàn này không? Hành động không thể hoàn tác.")) {
          deleteServingGroup(groupId);
          if (selectedGroupId === groupId) setSelectedGroupId(null);
      }
  }

  // Logic RA HẾT ĐỒ (Serve All)
  const handleServeAll = (item: ServingItem) => {
      if (!selectedGroup) return;
      if (item.servedQuantity >= item.totalQuantity) return;
      
      // Cập nhật số lượng đã ra = tổng số lượng
      updateServingItem(selectedGroup.id, item.id, {
          servedQuantity: item.totalQuantity
      });
  }

  if (selectedGroup) {
      // DETAIL VIEW: CHECKLIST
      const completedCount = selectedGroup.items.filter(i => i.servedQuantity >= i.totalQuantity).length;
      const totalCount = selectedGroup.items.length;
      const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
      const isReadOnly = selectedGroup.status === 'COMPLETED';

      return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <button onClick={() => setSelectedGroupId(null)} className="p-2 hover:bg-gray-200 rounded-full">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h2>
                            {!isReadOnly && (
                                <button 
                                    onClick={openEditGroupModal}
                                    className="text-gray-400 hover:text-teal-600 transition-colors p-1" 
                                    title="Sửa thông tin đoàn"
                                >
                                    <Edit3 size={18} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm space-x-3 mt-1">
                            <span className="flex items-center"><MapPin size={14} className="mr-1"/> {selectedGroup.location}</span>
                            <span className="flex items-center"><Users size={14} className="mr-1"/> {selectedGroup.guestCount} khách</span>
                            {isReadOnly && <span className="text-green-600 font-bold text-xs border border-green-200 bg-green-50 px-2 rounded">Đã hoàn thành</span>}
                        </div>
                    </div>
                  </div>
                  
                  {!isReadOnly && (
                      <button 
                        onClick={(e) => handleDeleteGroup(e, selectedGroup.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                        title="Xóa đoàn này"
                      >
                          <Trash2 size={20} />
                      </button>
                  )}
              </div>

              {/* Progress Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                   <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                       <span>Tiến độ ra đồ</span>
                       <span className="text-teal-600">{progress}% ({completedCount}/{totalCount} món)</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-3">
                       <div className="bg-teal-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                   </div>
              </div>

              {/* Checklist */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-20">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                       <span className="font-bold text-gray-700 uppercase text-xs tracking-wider">Danh sách món ăn</span>
                       {!isReadOnly && (
                           <button 
                              onClick={openAddItemModal}
                              className="text-teal-600 font-bold text-xs flex items-center hover:underline"
                           >
                              <Plus size={14} className="mr-1"/> Thêm món
                           </button>
                       )}
                  </div>
                  <div className="divide-y divide-gray-100">
                      {selectedGroup.items.map((item) => {
                          const isDone = item.servedQuantity >= item.totalQuantity;
                          return (
                              <div key={item.id} className={`p-4 flex items-center justify-between transition-colors ${isDone ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                  <div className="flex-1 pr-2">
                                      <div className="flex items-center gap-2">
                                          <p className={`font-bold text-lg ${isDone ? 'text-green-800' : 'text-gray-800'}`}>
                                              {item.name}
                                          </p>
                                          {!isReadOnly && (
                                              <button 
                                                onClick={() => openEditItemModal(item)}
                                                className="text-gray-400 hover:text-teal-600 transition-colors p-1"
                                                title="Sửa thông tin món"
                                              >
                                                  <Edit3 size={16} />
                                              </button>
                                          )}
                                      </div>
                                      <p className="text-xs text-gray-500">Đơn vị: {item.unit} (Tổng: {item.totalQuantity})</p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                      {!isReadOnly && (
                                          <>
                                              <button
                                                onClick={() => handleServeAll(item)}
                                                disabled={isDone}
                                                className={`p-2 rounded-full transition-colors ${
                                                    isDone 
                                                    ? 'text-gray-300 cursor-not-allowed' 
                                                    : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95'
                                                }`}
                                                title="Ra hết (Xong ngay)"
                                              >
                                                  <CheckCheck size={18} />
                                              </button>
                                              
                                              <div className="w-px h-8 bg-gray-200 mx-1"></div>

                                              <button 
                                                onClick={() => decrementServedItem(selectedGroup.id, item.id)}
                                                disabled={item.servedQuantity <= 0}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                                                    item.servedQuantity <= 0
                                                    ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' 
                                                    : 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                                                }`}
                                              >
                                                  <MinusCircle size={20} />
                                              </button>
                                          </>
                                      )}

                                      <div className="text-center w-12 sm:w-16">
                                          <div className={`text-xl font-bold ${isDone ? 'text-green-600' : 'text-gray-900'}`}>
                                              {item.servedQuantity}
                                          </div>
                                          <div className="text-xs text-gray-500 border-t border-gray-200 mt-0.5 pt-0.5">
                                              / {item.totalQuantity}
                                          </div>
                                      </div>

                                      {!isReadOnly && (
                                          <button 
                                            onClick={() => incrementServedItem(selectedGroup.id, item.id)}
                                            disabled={isDone}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                                                isDone 
                                                ? 'bg-green-100 text-green-600 cursor-not-allowed' 
                                                : 'bg-teal-600 text-white shadow-teal-200 hover:bg-teal-700'
                                            }`}
                                          >
                                              {isDone ? <CheckCircle2 size={24} /> : <PlusCircle size={24} />}
                                          </button>
                                      )}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>

              {!isReadOnly && progress === 100 && (
                  <div className="p-4 bg-green-100 border border-green-200 rounded-xl text-center animate-in zoom-in">
                      <p className="text-green-800 font-bold mb-2">Đoàn đã ra đủ món!</p>
                      <button 
                        onClick={() => { completeServingGroup(selectedGroup.id); setSelectedGroupId(null); }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow-md"
                      >
                          Đóng đoàn & Lưu lịch sử
                      </button>
                  </div>
              )}

              {/* Edit Item Modal - Same as before... */}
              {isEditItemModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">{editingItem ? 'Sửa món ăn' : 'Thêm món mới'}</h3>
                            <button onClick={() => setIsEditItemModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên món ăn</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tổng</label>
                                    <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value))} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                                    <input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                            <div>
                                {editingItem && (
                                    <button onClick={handleDeleteItem} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Xóa món này">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => setIsEditItemModalOpen(false)} className="px-3 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy</button>
                                <button onClick={handleSaveItem} className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-sm">Lưu</button>
                            </div>
                        </div>
                    </div>
                  </div>
              )}

              {isEditGroupModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Cập nhật thông tin đoàn</h3>
                            <button onClick={() => setIsEditGroupModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đoàn khách</label>
                                <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí / Số bàn</label>
                                <input type="text" value={editGroupLocation} onChange={(e) => setEditGroupLocation(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số khách (Pax)</label>
                                <input type="number" value={editGroupPax} onChange={(e) => setEditGroupPax(Number(e.target.value))} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                            <button onClick={() => setIsEditGroupModalOpen(false)} className="px-3 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy</button>
                            <button onClick={handleSaveGroup} className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-sm">Lưu thay đổi</button>
                        </div>
                    </div>
                  </div>
              )}
          </div>
      )
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ra Đồ & Khách Đoàn</h2>
          <p className="text-gray-500">Kiểm soát thực đơn và tiến độ phục vụ bàn.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
                <button 
                    onClick={() => setViewMode('ACTIVE')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'ACTIVE' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Đang phục vụ
                </button>
                <button 
                    onClick={() => setViewMode('HISTORY')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'HISTORY' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <History size={16} /> Lịch sử
                </button>
            </div>
            {viewMode === 'ACTIVE' && (
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center hover:bg-teal-700 transition-colors ml-auto"
                >
                    <PlusCircle size={20} className="mr-2"/> Nhận đoàn mới
                </button>
            )}
        </div>
      </div>

      {/* HISTORY FILTER BAR */}
      {viewMode === 'HISTORY' && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">Chọn ngày xem lại:</span>
              <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                  <input 
                    type="date" 
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
              </div>
          </div>
      )}

      {/* GRID VIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {viewMode === 'ACTIVE' && activeGroups.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                      <ClipboardList size={32} />
                  </div>
                  <p className="text-gray-500 font-medium">Hiện tại không có đoàn khách nào.</p>
                  <p className="text-sm text-gray-400">Bấm "Nhận đoàn mới" để bắt đầu.</p>
              </div>
          )}

          {viewMode === 'HISTORY' && historyGroups.length === 0 && (
              <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl">
                  <p className="text-gray-500">Không tìm thấy đoàn khách nào đã hoàn thành trong ngày {historyDate}.</p>
              </div>
          )}

          {(viewMode === 'ACTIVE' ? activeGroups : historyGroups).map(group => {
              const completed = group.items.filter(i => i.servedQuantity >= i.totalQuantity).length;
              const total = group.items.length;
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

              return (
                  <div 
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md cursor-pointer transition-all group relative ${group.status === 'COMPLETED' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
                  >
                      {viewMode === 'ACTIVE' && (
                          <button 
                            onClick={(e) => handleDeleteGroup(e, group.id)}
                            // Fix: Remove opacity-0 group-hover:opacity-100, use visible class
                            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                            title="Xóa đoàn"
                          >
                              <Trash2 size={18} />
                          </button>
                      )}

                      <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                              {group.name.charAt(0)}
                          </div>
                          {group.status === 'COMPLETED' ? (
                               <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center">
                                   <CheckCircle2 size={12} className="mr-1"/> Completed
                               </span>
                          ) : (
                               <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                                   Active
                               </span>
                          )}
                      </div>

                      <h3 className="font-bold text-lg text-gray-900 mb-1 truncate pr-6">{group.name}</h3>
                      <div className="flex items-center text-gray-500 text-xs mb-4 space-x-3">
                          <span className="flex items-center"><MapPin size={12} className="mr-1"/> {group.location}</span>
                          <span className="flex items-center"><Users size={12} className="mr-1"/> {group.guestCount}</span>
                      </div>

                      <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium text-gray-600">
                              <span>Tiến độ</span>
                              <span>{completed}/{total} món</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${percent === 100 ? 'bg-green-500' : 'bg-teal-500'}`} style={{ width: `${percent}%` }}></div>
                          </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 text-center text-teal-600 font-bold text-sm group-hover:underline">
                          {viewMode === 'ACTIVE' ? 'Mở Checklist phục vụ →' : 'Xem chi tiết lịch sử →'}
                      </div>
                  </div>
              )
          })}
      </div>

      {/* ADD NEW GROUP MODAL (Kept same as before) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-gray-900">Tiếp nhận đoàn khách mới (AI Scan)</h3>
                    <button onClick={resetAddModal} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 'UPLOAD' ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 inline-block">
                                <Camera size={48} className="text-blue-500 mx-auto mb-2" />
                                <h4 className="font-bold text-blue-900">Chụp ảnh Thực Đơn / Order</h4>
                                <p className="text-sm text-blue-700 mt-1">Hỗ trợ đọc chữ viết tay (x8, 1x5) và lọc bỏ ghi chú NB.</p>
                            </div>
                            
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${isScanning ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:bg-gray-50'}`}
                            >
                                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isScanning} />
                                 
                                 {isScanning ? (
                                     <>
                                        <Loader2 size={40} className="text-teal-600 animate-spin mb-4" />
                                        <p className="font-bold text-teal-800">Đang phân tích ảnh...</p>
                                        <p className="text-xs text-teal-600 mt-2">Đang tách các đoàn khách & tính toán số lượng theo bàn</p>
                                     </>
                                 ) : (
                                     <>
                                        <ImageIcon size={48} className="text-gray-300 mb-4" />
                                        <p className="font-bold text-gray-600">Bấm để tải ảnh lên</p>
                                        <p className="text-xs text-gray-400 mt-2">Hỗ trợ ảnh chụp tay, nhiều menu cùng lúc</p>
                                     </>
                                 )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-800 flex items-center">
                                    <CheckCircle2 className="text-green-500 mr-2" size={20}/>
                                    AI đã tìm thấy {detectedGroups.length} đoàn khách:
                                </h4>
                                <button onClick={() => setStep('UPLOAD')} className="text-xs text-gray-500 flex items-center hover:underline">
                                    <RotateCcw size={12} className="mr-1"/> Quét lại
                                </button>
                            </div>

                            {detectedGroups.map((group, idx) => (
                                <div key={idx} className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 relative">
                                    <div className="absolute top-0 right-0 bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                        Đoàn #{idx + 1}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Tên đoàn</label>
                                            <input 
                                                type="text" 
                                                value={group.name} 
                                                onChange={(e) => updateDetectedGroupField(idx, 'name', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Vị trí</label>
                                            <input 
                                                type="text" 
                                                value={group.location} 
                                                onChange={(e) => updateDetectedGroupField(idx, 'location', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Số khách (Pax)</label>
                                            <input 
                                                type="number" 
                                                value={group.guestCount} 
                                                onChange={(e) => updateDetectedGroupField(idx, 'guestCount', Number(e.target.value))}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Số bàn (Table)</label>
                                            <input 
                                                type="number" 
                                                value={group.tableCount} 
                                                onChange={(e) => updateDetectedGroupField(idx, 'tableCount', Number(e.target.value))}
                                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold text-indigo-700"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Thực đơn dự kiến ({group.items.length} món)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {group.items.map((item: any, i: number) => (
                                                <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs border border-gray-200 text-gray-700">
                                                    <span className="font-bold mr-1">{item.totalQuantity}</span> {item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3 shrink-0">
                    <button onClick={resetAddModal} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy bỏ</button>
                    {step === 'REVIEW' && (
                        <button 
                            onClick={handleConfirmAllGroups}
                            className="px-6 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-md flex items-center"
                        >
                            <Save size={16} className="mr-2"/> Xác nhận & Tạo {detectedGroups.length} đoàn
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
