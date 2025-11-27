
import React, { useState, useRef } from 'react';
import { MoreHorizontal, Phone, Mail, MapPin, X, Edit2, Trash2, History, Calendar, ScanFace, Camera, Lock, DollarSign, Eye, EyeOff, Upload } from 'lucide-react';
import { EmployeeRole, Employee, TimesheetLog } from '../types';
import { useGlobalContext } from '../contexts/GlobalContext';

export const EmployeeList: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, logs, registerEmployeeFace } = useGlobalContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = useState<{emp: Employee, logs: TimesheetLog[]} | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(EmployeeRole.WAITER);
  const [hourlyRate, setHourlyRate] = useState(25000); 
  const [allowance, setAllowance] = useState(0); 
  const [password, setPassword] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);

  // Face Registration State
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceStep, setFaceStep] = useState<'READY' | 'CAPTURING' | 'DONE'>('READY');

  // Helper: Open Edit Modal
  const openEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setName(emp.name);
      setEmail(emp.email);
      setPhone(emp.phone);
      setRole(emp.role);
      setHourlyRate(emp.hourlyRate);
      setAllowance(emp.allowance || 0);
      setPassword(''); 
      setIsModalOpen(true);
  };

  const openAdd = () => {
      setEditingId(null);
      setName('');
      setEmail('');
      setPhone('');
      setRole(EmployeeRole.WAITER);
      setHourlyRate(25000);
      setAllowance(0);
      setPassword('123456'); 
      setIsModalOpen(true);
  }

  const handleSaveEmployee = () => {
      if (!name) return;
      const empData: Employee = {
          id: editingId || Date.now().toString(),
          name, email, phone, role, hourlyRate, 
          allowance,
          password: password ? password : undefined 
      };
      if (editingId) updateEmployee(empData);
      else addEmployee(empData);
      setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) deleteEmployee(id);
  }

  const handleViewHistory = (emp: Employee) => {
      const empLogs = logs.filter(l => l.employeeName === emp.name);
      setSelectedEmployeeLogs({ emp, logs: empLogs });
      setIsHistoryModalOpen(true);
  }

  const openFaceRegistration = (emp: Employee) => {
      setSelectedEmployee(emp);
      setFaceStep('READY');
      setIsFaceModalOpen(true);
  }

  // --- IMAGE PROCESSING ---
  const processImage = (imageSource: CanvasImageSource, width: number, height: number) => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const scale = MAX_WIDTH / width;
      canvas.width = MAX_WIDTH;
      canvas.height = height * scale;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.6);
      
      if (selectedEmployee) {
          registerEmployeeFace(selectedEmployee.id, base64);
      }
      
      if (stream) stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setFaceStep('DONE');
  };

  const startFaceCamera = async () => {
      try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          setStream(s);
          setTimeout(() => {
              if(videoRef.current) videoRef.current.srcObject = s;
          }, 100);
          setFaceStep('CAPTURING');
      } catch (e) {
          alert("Không mở được camera.");
      }
  }

  const captureFace = () => {
      if (videoRef.current) {
          processImage(videoRef.current, videoRef.current.videoWidth, videoRef.current.videoHeight);
      }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  processImage(img, img.width, img.height);
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const closeFaceModal = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsFaceModalOpen(false);
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Danh Sách Nhân Viên</h2>
          <p className="text-gray-500">Quản lý hồ sơ, lương thưởng và tài khoản.</p>
        </div>
        <button onClick={openAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium shadow-sm flex items-center">
          + Thêm nhân viên
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 overflow-hidden">
                   {emp.avatar && emp.avatar.length > 20 ? (
                       <img src={emp.avatar} alt="Face" className="w-full h-full object-cover" />
                   ) : (
                       emp.name.charAt(0)
                   )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{emp.name}</h3>
                  <div className="flex gap-1">
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{emp.role}</span>
                      <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-full">ID: {emp.id}</span>
                  </div>
                </div>
              </div>
              <div className="relative group/menu">
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                    <MoreHorizontal size={20} />
                </button>
                <div className="absolute right-0 top-8 w-40 bg-white border rounded-lg shadow-lg py-1 hidden group-hover/menu:block z-10">
                    <button onClick={() => openEdit(emp)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center"><Edit2 size={14} className="mr-2"/> Sửa</button>
                    <button onClick={() => openFaceRegistration(emp)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center text-blue-600"><ScanFace size={14} className="mr-2"/> Đăng ký Face</button>
                    <button onClick={() => handleDelete(emp.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center"><Trash2 size={14} className="mr-2"/> Xóa</button>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2"><Phone size={16} className="text-gray-400" /><span>{emp.phone || 'Chưa cập nhật'}</span></div>
              <div className="flex items-center space-x-2"><Mail size={16} className="text-gray-400" /><span className="truncate">{emp.email}</span></div>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-between items-center text-sm">
               <div>
                   <p className="text-gray-500 text-xs">Trợ cấp: <b className="text-gray-900">{emp.allowance?.toLocaleString('vi-VN') || 0}đ</b></p>
                   <p className="text-gray-500 text-xs">Lương: <b className="text-gray-900">{emp.hourlyRate.toLocaleString('vi-VN')}đ</b>/giờ</p>
               </div>
               <button onClick={() => handleViewHistory(emp)} className="text-teal-600 font-medium hover:underline flex items-center"><History size={14} className="mr-1"/> Xem lịch sử</button>
            </div>
          </div>
        ))}
      </div>

       {/* ADD / EDIT EMPLOYEE MODAL */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-gray-900 text-lg">{editingId ? 'Cập Nhật Hồ Sơ' : 'Thêm Nhân Sự Mới'}</h3>
                
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Họ và tên</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg p-2.5" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Vai trò</label>
                            <select value={role} onChange={(e) => setRole(e.target.value as EmployeeRole)} className="w-full border rounded-lg p-2.5">
                                {Object.values(EmployeeRole).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Số điện thoại</label>
                             <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg p-2.5" />
                        </div>
                    </div>

                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg p-2.5" />

                    {/* PAYROLL SECTION */}
                    <div className="bg-teal-50 p-3 rounded-xl border border-teal-100">
                        <h4 className="text-xs font-bold text-teal-700 mb-2 uppercase flex items-center"><DollarSign size={12} className="mr-1"/> Thiết lập lương thưởng</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-teal-800 mb-1">Lương giờ (VNĐ)</label>
                                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-teal-800 mb-1">Trợ cấp/tháng (VNĐ)</label>
                                <input type="number" value={allowance} onChange={(e) => setAllowance(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* SECURITY SECTION */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center"><Lock size={12} className="mr-1"/> Bảo mật tài khoản</h4>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder={editingId ? "Nhập để đổi mật khẩu mới..." : "Mật khẩu đăng nhập"}
                                className="w-full border rounded-lg p-2 pr-10 text-sm" 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-2 top-2 text-gray-400"
                            >
                                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                        {editingId && <p className="text-[10px] text-gray-400 mt-1 ml-1">Để trống nếu không muốn đổi mật khẩu.</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Hủy</button>
                    <button onClick={handleSaveEmployee} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold">{editingId ? 'Lưu thay đổi' : 'Tạo nhân viên'}</button>
                </div>
            </div>
        </div>
      )}

      {/* FACE REGISTRATION MODAL */}
      {isFaceModalOpen && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold">Đăng ký Face ID: {selectedEmployee.name}</h3>
                      <button onClick={closeFaceModal}><X/></button>
                  </div>
                  <div className="aspect-square bg-gray-900 relative flex items-center justify-center">
                      {faceStep === 'READY' && (
                          <div className="flex flex-col gap-3">
                              <button onClick={startFaceCamera} className="bg-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-100">
                                  <Camera size={20} /> Bật Camera
                              </button>
                              <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-600">
                                  <Upload size={20} /> Tải ảnh lên
                              </button>
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={handleFileUpload}
                              />
                          </div>
                      )}
                      {faceStep === 'CAPTURING' && (
                          <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                            <div className="absolute bottom-4">
                                <button onClick={captureFace} className="w-14 h-14 rounded-full border-4 border-white bg-red-500 hover:scale-105 transition-transform"></button>
                            </div>
                          </>
                      )}
                      {faceStep === 'DONE' && (
                          <div className="text-center text-white">
                              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <ScanFace size={32} />
                              </div>
                              <p>Đã đăng ký thành công!</p>
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-gray-50 text-center">
                      <button onClick={closeFaceModal} className="text-gray-600 font-medium text-sm">Đóng</button>
                  </div>
              </div>
          </div>
      )}

      {/* HISTORY MODAL */}
      {isHistoryModalOpen && selectedEmployeeLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">Lịch Sử: {selectedEmployeeLogs.emp.name}</h3>
                    <button onClick={() => setIsHistoryModalOpen(false)}><X/></button>
                </div>
                <div className="overflow-y-auto p-4 space-y-2">
                    {selectedEmployeeLogs.logs.map(log => (
                        <div key={log.id} className="flex justify-between p-3 bg-gray-50 rounded border">
                             <div><span className="font-bold">{log.date}</span> <span className="text-xs text-gray-500">({log.device})</span></div>
                             <div>{log.checkIn} - {log.checkOut}</div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      )}
    </div>
  );
};
