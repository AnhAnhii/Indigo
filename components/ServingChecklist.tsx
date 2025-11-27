
import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, Users, MapPin, PlusCircle, MinusCircle, CheckCircle2, Camera, Image as ImageIcon, Loader2, ChevronLeft, X, Edit3, Trash2, Plus, Save, RotateCcw, CheckCheck, History, Calendar, AlertTriangle, BellRing, Table2, Spline, Search, LayoutGrid, Filter, StickyNote, ZoomIn, Split, Calculator, Volume2 } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { ServingGroup, ServingItem } from '../types';
import { parseMenuImage } from '../services/geminiService';

// ĐỊNH NGHĨA CÁC KHU VỰC TRONG NHÀ HÀNG
const RESTAURANT_ZONES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const ServingChecklist: React.FC = () => {
  const { 
      servingGroups, incrementServedItem, decrementServedItem, 
      addServingGroup, updateServingGroup, completeServingGroup, deleteServingGroup,
      startServingGroup,
      addServingItem, updateServingItem, deleteServingItem,
      testNotification // Import test function
  } = useGlobalContext();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = servingGroups.find(g => g.id === selectedGroupId) || null;
  
  // --- VIEW MODE ---
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [historyDate, setHistoryDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }));

  // --- FILTERS ---
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // --- ADD GROUP MODAL STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [step, setStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');
  
  const [detectedGroups, setDetectedGroups] = useState<any[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EDIT MODAL STATES ---
  const [editingItem, setEditingItem] = useState<ServingItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState(0);
  const [editUnit, setEditUnit] = useState('');
  const [editNote, setEditNote] = useState(''); 

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupLocation, setEditGroupLocation] = useState('');
  const [editGroupPax, setEditGroupPax] = useState(0);
  const [editGroupTableCount, setEditGroupTableCount] = useState(0);
  const [editGroupTableSplit, setEditGroupTableSplit] = useState('');
  const [splitPreview, setSplitPreview] = useState<string>('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<ServingItem | null>(null);

  const normalizeDateComp = (d: string) => {
      if (!d) return '';
      if (d.includes('T')) return d.split('T')[0];
      return d;
  }

  // --- FILTERS LOGIC ---
  const getFilteredGroups = (status: 'ACTIVE' | 'COMPLETED') => {
      return servingGroups.filter(g => {
          if (status === 'ACTIVE' && g.status === 'COMPLETED') return false;
          if (status === 'COMPLETED') {
              if (g.status !== 'COMPLETED') return false;
              const gDate = normalizeDateComp(g.date);
              const fDate = normalizeDateComp(historyDate);
              if (gDate !== fDate) return false;
          }
          if (selectedZone !== 'ALL') {
              if (!g.location.toUpperCase().includes(selectedZone)) return false;
          }
          if (searchTerm) {
              const term = searchTerm.toLowerCase();
              const matchName = g.name.toLowerCase().includes(term);
              const matchLoc = g.location.toLowerCase().includes(term);
              if (!matchName && !matchLoc) return false;
          }
          return true;
      });
  };

  const activeFilteredGroups = getFilteredGroups('ACTIVE');
  const historyFilteredGroups = getFilteredGroups('COMPLETED');
  const displayGroups = viewMode === 'ACTIVE' ? activeFilteredGroups : historyFilteredGroups;

  const getZoneCount = (zone: string) => {
      return servingGroups.filter(g => 
          g.status === 'ACTIVE' && g.location.toUpperCase().includes(zone)
      ).length;
  };

  // --- ALGORITHM: ADVANCED FOOD DISTRIBUTION LOGIC ---
  const parseTableSplit = (tableSplitStr: string) => {
      const tables: { size: number }[] = [];
      if (!tableSplitStr) return tables;

      const parts = tableSplitStr.split(/[,+;]/);
      parts.forEach(part => {
          const match = part.trim().match(/(\d+)\s*(?:x|X|\*|\.|bàn|mâm)\s*(\d+)/);
          if (match) {
              const count = parseInt(match[1]); 
              const size = parseInt(match[2]);  
              for (let i = 0; i < count; i++) tables.push({ size });
          } else {
              const num = parseInt(part.trim());
              if (!isNaN(num) && num < 50) tables.push({ size: num });
          }
      });
      return tables;
  };

  const getDistributionHint = (totalItemQty: number, tableSplitStr: string, totalGuests: number): string | null => {
      if (!tableSplitStr || totalItemQty <= 0) return null;
      const tables = parseTableSplit(tableSplitStr);
      const totalTables = tables.length;
      if (totalTables === 0) return null;

      if (Math.abs(totalItemQty - totalGuests) <= 2 && totalItemQty > totalTables) {
          return "Chia theo đầu người";
      }

      const distribution = new Array(totalTables).fill(0);
      let remainingItems = totalItemQty;
      const basePerTable = Math.floor(totalItemQty / totalTables);
      for (let i = 0; i < totalTables; i++) {
          distribution[i] = basePerTable;
          remainingItems -= basePerTable;
      }
      if (remainingItems > 0) {
          const sortedIndices = tables.map((t, i) => ({ size: t.size, index: i })).sort((a, b) => b.size - a.size);
          let i = 0;
          while (remainingItems > 0) {
              const targetIndex = sortedIndices[i % totalTables].index;
              distribution[targetIndex]++;
              remainingItems--;
              i++;
          }
      }
      const summary: Record<number, { tableCount: number, itemPerTable: number }> = {};
      tables.forEach((table, index) => {
          const itemQty = distribution[index];
          if (!summary[table.size]) {
              summary[table.size] = { tableCount: 0, itemPerTable: itemQty };
          }
          summary[table.size].tableCount++;
          if (itemQty > summary[table.size].itemPerTable) summary[table.size].itemPerTable = itemQty;
      });
      const hintParts = Object.entries(summary)
          .sort((a, b) => Number(b[0]) - Number(a[0])) 
          .map(([size, info]) => {
              if (info.itemPerTable === 0) return null;
              const totalForThisGroup = info.tableCount * info.itemPerTable;
              if (info.itemPerTable === 0 && totalForThisGroup > 0) return `${totalForThisGroup} đĩa chia ${info.tableCount} bàn ${size}`;
              return `${totalForThisGroup} đĩa cho bàn ${size} người`;
          })
          .filter(Boolean);

      if (hintParts.length === 0) return null;
      return hintParts.join(' • ');
  };

  useEffect(() => {
      if (isEditGroupModalOpen && editGroupTableSplit) {
          const tables = parseTableSplit(editGroupTableSplit);
          if (tables.length > 0) {
              const preview: Record<number, number> = {};
              tables.forEach(t => preview[t.size] = (preview[t.size] || 0) + 1);
              const text = Object.entries(preview).map(([size, count]) => `${count} bàn ${size}`).join(', ');
              setSplitPreview(`Hệ thống hiểu: Tổng ${tables.length} bàn (${text})`);
          } else {
              setSplitPreview('');
          }
      } else {
          setSplitPreview('');
      }
  }, [editGroupTableSplit, isEditGroupModalOpen]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1024;
              const scale = MAX_WIDTH / img.width;
              if (scale < 1) { canvas.width = MAX_WIDTH; canvas.height = img.height * scale; } 
              else { canvas.width = img.width; canvas.height = img.height; }
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
              setCapturedImage(compressedBase64);
              analyzeImage(compressedBase64);
          };
      }
  };

  const analyzeImage = async (base64: string) => {
      setIsScanning(true);
      try {
          const rawGroups = await parseMenuImage(base64);
          const mappedGroups = rawGroups.map((g: any, idx: number) => ({
              id: `temp_${Date.now()}_${idx}`,
              name: g.groupName || `Đoàn khách ${idx + 1}`,
              location: g.location || '',
              guestCount: Number(g.guestCount) || 0,
              tableCount: Number(g.tableCount) || 0,
              tableSplit: g.tableSplit || '', 
              items: g.items.map((i: any, iIdx: number) => ({
                  id: `temp_item_${Date.now()}_${idx}_${iIdx}`,
                  name: i.name,
                  totalQuantity: Number(i.quantity) || 1,
                  servedQuantity: 0,
                  unit: i.unit || 'Phần',
                  note: ''
              }))
          }));
          setDetectedGroups(mappedGroups);
          setStep('REVIEW');
      } catch (e) { console.error(e); alert("Không thể phân tích ảnh."); } finally { setIsScanning(false); }
  };

  const handleConfirmAllGroups = () => {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
      detectedGroups.forEach(g => {
          const newGroup: ServingGroup = {
              id: Date.now().toString() + Math.random().toString().substr(2, 5),
              name: g.name, location: g.location, guestCount: g.guestCount,
              tableCount: g.tableCount, tableSplit: g.tableSplit, startTime: null, date: todayStr, status: 'ACTIVE',
              items: g.items.map((i: any) => ({ ...i, id: Date.now().toString() + Math.random().toString().substr(2, 5) }))
          };
          addServingGroup(newGroup);
      });
      resetAddModal();
  };

  const resetAddModal = () => { setIsAddModalOpen(false); setStep('UPLOAD'); setDetectedGroups([]); setCapturedImage(null); };
  const updateDetectedGroupField = (index: number, field: string, value: any) => { const updated = [...detectedGroups]; updated[index] = { ...updated[index], [field]: value }; setDetectedGroups(updated); };
  const openEditItemModal = (item: ServingItem) => { setEditingItem(item); setEditName(item.name); setEditQuantity(item.totalQuantity); setEditUnit(item.unit); setEditNote(item.note || ''); setIsEditItemModalOpen(true); };
  const openAddItemModal = () => { setEditingItem(null); setEditName(''); setEditQuantity(1); setEditUnit('Đĩa'); setEditNote(''); setIsEditItemModalOpen(true); };
  const handleSaveItem = () => { if (!selectedGroup || !editName) return; if (editingItem) { updateServingItem(selectedGroup.id, editingItem.id, { name: editName, totalQuantity: editQuantity, unit: editUnit, note: editNote }); } else { addServingItem(selectedGroup.id, { id: Date.now().toString(), name: editName, totalQuantity: editQuantity, servedQuantity: 0, unit: editUnit, note: editNote }); } setIsEditItemModalOpen(false); };
  const handleDeleteItem = () => { if (!selectedGroup || !editingItem) return; if (window.confirm(`Xóa món "${editingItem.name}"?`)) { deleteServingItem(selectedGroup.id, editingItem.id); setIsEditItemModalOpen(false); } };
  const handleDeleteItemDirect = (e: React.MouseEvent, item: ServingItem) => { e.stopPropagation(); e.preventDefault(); setDeleteItemConfirm(item); };
  const confirmDeleteItem = () => { if (selectedGroup && deleteItemConfirm) { deleteServingItem(selectedGroup.id, deleteItemConfirm.id); setDeleteItemConfirm(null); } }
  const openEditGroupModal = () => { if(!selectedGroup) return; setEditGroupName(selectedGroup.name); setEditGroupLocation(selectedGroup.location); setEditGroupPax(selectedGroup.guestCount); setEditGroupTableCount(selectedGroup.tableCount || 0); setEditGroupTableSplit(selectedGroup.tableSplit || ''); setIsEditGroupModalOpen(true); }
  const handleSaveGroup = () => { if (!selectedGroup) return; const parsedTables = parseTableSplit(editGroupTableSplit); const finalTableCount = parsedTables.length > 0 ? parsedTables.length : editGroupTableCount; updateServingGroup(selectedGroup.id, { name: editGroupName, location: editGroupLocation, guestCount: editGroupPax, tableCount: finalTableCount, tableSplit: editGroupTableSplit }); setIsEditGroupModalOpen(false); }
  const handleDeleteGroupClick = (e: React.MouseEvent, groupId: string) => { e.stopPropagation(); setDeleteConfirmId(groupId); }
  const confirmDeleteGroup = () => { if (deleteConfirmId) { deleteServingGroup(deleteConfirmId); if (selectedGroupId === deleteConfirmId) setSelectedGroupId(null); setDeleteConfirmId(null); } }
  const handleServeAll = (item: ServingItem) => { if (!selectedGroup) return; if (item.servedQuantity >= item.totalQuantity) return; updateServingItem(selectedGroup.id, item.id, { servedQuantity: item.totalQuantity }); }
  const handleGuestArrived = (e: React.MouseEvent, groupId: string) => { e.stopPropagation(); startServingGroup(groupId); }

  // --- DETAILS VIEW ---
  if (selectedGroup) {
      // (Giữ nguyên phần Details View cũ, không thay đổi logic hiển thị)
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
                            {!isReadOnly && <button onClick={openEditGroupModal} className="text-gray-400 hover:text-teal-600 p-1"><Edit3 size={18} /></button>}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm space-x-3 mt-1">
                            <span className="flex items-center"><MapPin size={14} className="mr-1"/> {selectedGroup.location}</span>
                            <span className="flex items-center"><Users size={14} className="mr-1"/> {selectedGroup.guestCount} pax</span>
                            <span className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold"><Table2 size={14} className="mr-1"/> {selectedGroup.tableCount} bàn</span>
                            {selectedGroup.tableSplit && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono border border-gray-200 truncate max-w-[100px]">{selectedGroup.tableSplit}</span>}
                            {isReadOnly && <span className="text-green-600 font-bold text-xs border border-green-200 bg-green-50 px-2 rounded">Đã hoàn thành</span>}
                            {!selectedGroup.startTime && !isReadOnly && (
                                <button onClick={(e) => handleGuestArrived(e, selectedGroup.id)} className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse hover:bg-blue-700 shadow-md flex items-center"><BellRing size={12} className="mr-1"/> Báo khách đến</button>
                            )}
                            {selectedGroup.startTime && <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded">Vào: {selectedGroup.startTime}</span>}
                        </div>
                    </div>
                  </div>
                  <button onClick={(e) => handleDeleteGroupClick(e, selectedGroup.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Xóa đoàn này"><Trash2 size={20} /></button>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                   <div className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Tiến độ ra đồ</span><span className="text-teal-600">{progress}% ({completedCount}/{totalCount} món)</span></div>
                   <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-teal-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-20">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                       <span className="font-bold text-gray-700 uppercase text-xs tracking-wider">Danh sách món ăn</span>
                       {!isReadOnly && <button onClick={openAddItemModal} className="text-teal-600 font-bold text-xs flex items-center hover:underline"><Plus size={14} className="mr-1"/> Thêm món</button>}
                  </div>
                  <div className="divide-y divide-gray-100">
                      {selectedGroup.items.map((item) => {
                          const isDone = item.servedQuantity >= item.totalQuantity;
                          const distHint = selectedGroup.tableSplit ? getDistributionHint(item.totalQuantity, selectedGroup.tableSplit, selectedGroup.guestCount) : null;
                          return (
                              <div key={item.id} className={`p-4 flex items-center justify-between transition-colors ${isDone ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                  <div className="flex-1 pr-2">
                                      <div className="flex items-center gap-2">
                                          <p className={`font-bold text-lg ${isDone ? 'text-green-800' : 'text-gray-800'}`}>{item.name}</p>
                                          {!isReadOnly && (
                                              <div className="flex items-center flex-shrink-0 relative z-10">
                                                  <button onClick={() => openEditItemModal(item)} className="text-gray-400 hover:text-teal-600 p-1"><Edit3 size={16} /></button>
                                                  <button type="button" onClick={(e) => handleDeleteItemDirect(e, item)} className="text-gray-400 hover:text-red-500 p-2 ml-1 rounded-full hover:bg-red-50 transition-colors relative z-50 flex-shrink-0"><Trash2 size={18} /></button>
                                              </div>
                                          )}
                                      </div>
                                      <div className="flex flex-col gap-1 mt-1">
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs text-gray-500">Đơn vị: {item.unit}</p>
                                            {item.note && <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center border border-orange-100"><StickyNote size={10} className="mr-1" /> {item.note}</span>}
                                          </div>
                                          {distHint && <div className="flex items-center"><span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded flex items-center border border-indigo-100 mt-1 w-fit"><Split size={12} className="mr-1"/> {distHint}</span></div>}
                                      </div>
                                  </div>
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                      {!isReadOnly && (
                                          <>
                                              <button onClick={() => handleServeAll(item)} disabled={isDone} className={`p-2 rounded-full transition-colors ${isDone ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95'}`} title="Ra hết"><CheckCheck size={18} /></button>
                                              <div className="w-px h-8 bg-gray-200 mx-1"></div>
                                              <button onClick={() => decrementServedItem(selectedGroup.id, item.id)} disabled={item.servedQuantity <= 0} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 border ${item.servedQuantity <= 0 ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}><MinusCircle size={20} /></button>
                                          </>
                                      )}
                                      <div className="text-center w-12 sm:w-16">
                                          <div className={`text-xl font-bold ${isDone ? 'text-green-600' : 'text-gray-900'}`}>{item.servedQuantity}</div>
                                          <div className="text-xs text-gray-500 border-t border-gray-200 mt-0.5 pt-0.5">/ {item.totalQuantity}</div>
                                      </div>
                                      {!isReadOnly && <button onClick={() => incrementServedItem(selectedGroup.id, item.id)} disabled={isDone} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm ${isDone ? 'bg-green-100 text-green-600 cursor-not-allowed' : 'bg-teal-600 text-white shadow-teal-200 hover:bg-teal-700'}`}>{isDone ? <CheckCircle2 size={24} /> : <PlusCircle size={24} />}</button>}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
              {!isReadOnly && progress === 100 && (
                  <div className="p-4 bg-green-100 border border-green-200 rounded-xl text-center animate-in zoom-in">
                      <p className="text-green-800 font-bold mb-2">Đoàn đã ra đủ món!</p>
                      <button onClick={() => { completeServingGroup(selectedGroup.id); setSelectedGroupId(null); }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow-md">Đóng đoàn & Lưu lịch sử</button>
                  </div>
              )}
              {/* MODALS CODE... (Giữ nguyên) */}
              {deleteItemConfirm && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in duration-200">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={32} /></div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Xóa món này?</h3>
                          <div className="flex gap-3"><button onClick={() => setDeleteItemConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy bỏ</button><button onClick={confirmDeleteItem} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md">Xóa ngay</button></div>
                      </div>
                  </div>
              )}
              {isEditItemModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-900">{editingItem ? 'Sửa món ăn' : 'Thêm món mới'}</h3><button onClick={() => setIsEditItemModalOpen(false)}><X size={20}/></button></div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên món ăn</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tổng</label><input type="number" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value))} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label><input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label><input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 text-gray-700" /></div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center"><div>{editingItem && <button onClick={handleDeleteItem} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>}</div><div className="flex space-x-2"><button onClick={() => setIsEditItemModalOpen(false)} className="px-3 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy</button><button onClick={handleSaveItem} className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-sm">Lưu</button></div></div>
                    </div>
                  </div>
              )}
              {isEditGroupModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-900">Cập nhật thông tin đoàn</h3><button onClick={() => setIsEditGroupModalOpen(false)}><X size={20}/></button></div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên đoàn khách</label><input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Vị trí / Khu vực</label><input type="text" value={editGroupLocation} onChange={(e) => setEditGroupLocation(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Số khách (Pax)</label><input type="number" value={editGroupPax} onChange={(e) => setEditGroupPax(Number(e.target.value))} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Tổng số bàn</label><input type="number" value={editGroupTableCount} onChange={(e) => setEditGroupTableCount(Number(e.target.value))} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Chi tiết chia bàn</label><input type="text" value={editGroupTableSplit} onChange={(e) => setEditGroupTableSplit(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono text-gray-600" />{splitPreview && <div className="mt-1 text-xs text-green-600 flex items-center bg-green-50 p-1.5 rounded border border-green-100"><Calculator size={12} className="mr-1"/> {splitPreview}</div>}</div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3"><button onClick={() => setIsEditGroupModalOpen(false)} className="px-3 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy</button><button onClick={handleSaveGroup} className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-sm">Lưu thay đổi</button></div>
                    </div>
                  </div>
              )}
              {deleteConfirmId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in duration-200">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32} /></div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Xóa đoàn khách?</h3>
                          <div className="flex gap-3"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Hủy bỏ</button><button onClick={confirmDeleteGroup} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md">Xóa ngay</button></div>
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
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <button 
                onClick={testNotification}
                className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg font-bold shadow-sm flex items-center hover:bg-yellow-200 transition-colors text-xs md:text-sm"
                title="Bấm để kiểm tra xem thông báo có hoạt động không"
            >
                <Volume2 size={18} className="mr-1"/> Test Thông Báo
            </button>

            <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
                <button onClick={() => setViewMode('ACTIVE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'ACTIVE' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Đang phục vụ</button>
                <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'HISTORY' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><History size={16} /> Lịch sử</button>
            </div>
            {viewMode === 'ACTIVE' && (
                <button onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center hover:bg-teal-700 transition-colors ml-auto">
                    <PlusCircle size={20} className="mr-2"/> Nhận đoàn mới
                </button>
            )}
        </div>
      </div>
      
      {/* ... (Phần còn lại giữ nguyên: Search, Grid, Modals) ... */}
      
      {/* --- SEARCH & ZONE FILTERS --- */}
      <div className="space-y-3">
          <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input 
                  type="text" 
                  placeholder="Tìm kiếm tên đoàn, vị trí..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
              />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button onClick={() => setSelectedZone('ALL')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${selectedZone === 'ALL' ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}><LayoutGrid size={16} /> Tất cả ({getZoneCount('')})</button>
              {RESTAURANT_ZONES.map(zone => {
                  const count = getZoneCount(zone);
                  return (
                      <button key={zone} onClick={() => setSelectedZone(zone)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border flex items-center gap-2 ${selectedZone === zone ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {zone}
                          {count > 0 && <span className={`text-[10px] px-1.5 rounded-full ${selectedZone === zone ? 'bg-white text-teal-600' : 'bg-gray-200 text-gray-600'}`}>{count}</span>}
                      </button>
                  );
              })}
          </div>
      </div>

      {viewMode === 'HISTORY' && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">Chọn ngày:</span>
              <div className="relative"><Calendar className="absolute left-3 top-2.5 text-gray-400" size={18}/><input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" /></div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Tìm thấy: {historyFilteredGroups.length}</span>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {viewMode === 'ACTIVE' && displayGroups.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><ClipboardList size={32} /></div>
                  <p className="text-gray-500 font-medium">{searchTerm || selectedZone !== 'ALL' ? 'Không tìm thấy đoàn nào phù hợp bộ lọc.' : 'Hiện tại không có đoàn khách nào.'}</p>
                  {!searchTerm && selectedZone === 'ALL' && <p className="text-sm text-gray-400">Bấm "Nhận đoàn mới" để bắt đầu.</p>}
              </div>
          )}

          {viewMode === 'HISTORY' && displayGroups.length === 0 && <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl"><p className="text-gray-500">Không tìm thấy đoàn khách nào hoàn thành ngày {historyDate}.</p></div>}

          {displayGroups.map(group => {
              const completed = group.items.filter(i => i.servedQuantity >= i.totalQuantity).length;
              const total = group.items.length;
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

              return (
                  <div key={group.id} onClick={() => setSelectedGroupId(group.id)} className={`bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md cursor-pointer transition-all group relative ${group.status === 'COMPLETED' ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                      <button onClick={(e) => handleDeleteGroupClick(e, group.id)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"><Trash2 size={18} /></button>
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">{group.name.charAt(0)}</div>
                          {group.status === 'COMPLETED' ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center"><CheckCircle2 size={12} className="mr-1"/> Completed</span> : !group.startTime ? <button onClick={(e) => handleGuestArrived(e, group.id)} className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-md animate-pulse hover:bg-blue-600 transition-colors z-20 flex items-center"><BellRing size={12} className="mr-1"/> Báo khách đến</button> : <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Active</span>}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1 truncate pr-6">{group.name}</h3>
                      <div className="flex flex-wrap gap-2 items-center text-gray-500 text-xs mb-4">
                          <span className="flex items-center"><MapPin size={12} className="mr-1"/> {group.location}</span>
                          <span className="flex items-center"><Users size={12} className="mr-1"/> {group.guestCount}</span>
                          <span className="flex items-center text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded"><Table2 size={12} className="mr-1"/> {group.tableCount} bàn</span>
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium text-gray-600"><span>Tiến độ</span><span>{completed}/{total} món</span></div>
                          <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${percent === 100 ? 'bg-green-500' : 'bg-teal-500'}`} style={{ width: `${percent}%` }}></div></div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 text-center text-teal-600 font-bold text-sm group-hover:underline">{viewMode === 'ACTIVE' ? 'Mở Checklist phục vụ →' : 'Xem chi tiết lịch sử →'}</div>
                  </div>
              )
          })}
      </div>
      
      {/* ... Add Modal ... */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col ${step === 'REVIEW' ? 'max-w-6xl' : 'max-w-2xl'}`}>
                {/* ... (Modal Content Giữ Nguyên) ... */}
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
                            
                            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${isScanning ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isScanning} />
                                 {isScanning ? (
                                     <>
                                        <Loader2 size={40} className="text-teal-600 animate-spin mb-4" />
                                        <p className="font-bold text-teal-800">Đang phân tích ảnh...</p>
                                     </>
                                 ) : (
                                     <>
                                        <ImageIcon size={48} className="text-gray-300 mb-4" />
                                        <p className="font-bold text-gray-600">Bấm để tải ảnh lên</p>
                                     </>
                                 )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center relative lg:h-[600px]">
                                {capturedImage ? <img src={capturedImage} alt="Menu Preview" className="max-w-full max-h-full object-contain" /> : <span className="text-gray-500">Không có ảnh</span>}
                            </div>
                            <div className="overflow-y-auto lg:h-[600px] pr-2 space-y-6">
                                <div className="flex items-center justify-between"><h4 className="font-bold text-gray-800 flex items-center"><CheckCircle2 className="text-green-500 mr-2" size={20}/> AI đã tìm thấy {detectedGroups.length} đoàn khách:</h4><button onClick={() => setStep('UPLOAD')} className="text-xs text-gray-500 flex items-center hover:underline"><RotateCcw size={12} className="mr-1"/> Quét lại</button></div>
                                {detectedGroups.map((group, idx) => (
                                    <div key={idx} className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 relative shadow-sm">
                                        <div className="absolute top-0 right-0 bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-1 rounded-bl-lg">Đoàn #{idx + 1}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Tên đoàn</label><input type="text" value={group.name} onChange={(e) => updateDetectedGroupField(idx, 'name', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none"/></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Vị trí</label><input type="text" value={group.location} onChange={(e) => updateDetectedGroupField(idx, 'location', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"/></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Số khách (Pax)</label><input type="number" value={group.guestCount} onChange={(e) => updateDetectedGroupField(idx, 'guestCount', Number(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"/></div>
                                            <div className="md:col-span-3 bg-white border border-indigo-100 rounded-lg p-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                <div className="flex-1 w-full"><label className="block text-xs font-bold text-indigo-700 mb-1">Số bàn (Tổng) *</label><input type="number" value={group.tableCount} onChange={(e) => updateDetectedGroupField(idx, 'tableCount', Number(e.target.value))} className="w-full border-2 border-indigo-200 rounded-lg p-2 text-lg font-bold text-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                                                <div className="flex-1 w-full"><label className="block text-xs font-bold text-gray-500 mb-1">Chi tiết chia bàn</label><input type="text" value={group.tableSplit || ''} onChange={(e) => updateDetectedGroupField(idx, 'tableSplit', e.target.value)} placeholder="Nhập ghi chú chia bàn..." className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono text-gray-600"/></div>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Thực đơn dự kiến ({group.items.length} món)</p>
                                            <div className="flex flex-wrap gap-2">{group.items.map((item: any, i: number) => (<span key={i} className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs border border-gray-200 text-gray-700"><span className="font-bold mr-1">{item.totalQuantity}</span> {item.name}</span>))}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3 shrink-0">
                    <button onClick={resetAddModal} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-200 rounded-lg">Hủy bỏ</button>
                    {step === 'REVIEW' && <button onClick={handleConfirmAllGroups} className="px-6 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 shadow-md flex items-center"><Save size={16} className="mr-2"/> Xác nhận & Tạo {detectedGroups.length} đoàn</button>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
