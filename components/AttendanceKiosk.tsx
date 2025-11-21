
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, Wifi, CheckCircle, AlertTriangle, ScanLine, LogOut, LogIn, Smartphone, ArrowLeft } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { AttendanceStatus, TimesheetLog } from '../types';

export const AttendanceKiosk: React.FC = () => {
  const { settings, addAttendanceLog, updateAttendanceLog, logs, employees, currentUser } = useGlobalContext();
  
  // Flow States
  const [attendanceMode, setAttendanceMode] = useState<'SELECT' | 'FACE' | 'WIFI_GPS'>('SELECT');

  // Camera & Stream Refs (For Face Mode)
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Sub-states
  const [step, setStep] = useState<'IDLE' | 'STARTING_CAMERA' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [locationStatus, setLocationStatus] = useState<'CHECKING' | 'VALID' | 'INVALID' | 'ERROR'>('CHECKING');
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState(false);
  
  // Result State for Display
  const [attendanceResult, setAttendanceResult] = useState<{
      employeeName: string;
      type: 'CHECK_IN' | 'CHECK_OUT';
      time: string;
      totalHours?: number;
      shiftCode?: string;
  } | null>(null);

  // --- SIMULATION STATES ---
  const [isSimulatedWifi, setIsSimulatedWifi] = useState(false); 
  const [isSimulatedCamera, setIsSimulatedCamera] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);

  // 1. GEOLOCATION LOGIC
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('ERROR');
      setMessage("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    setLocationStatus('CHECKING');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const dist = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          settings.location.latitude,
          settings.location.longitude
        );
        if (dist <= settings.location.radiusMeters) setLocationStatus('VALID');
        else setLocationStatus('INVALID');
      },
      (error) => { console.error("GPS Error:", error); setLocationStatus('ERROR'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [settings]);

  // 2. CAMERA CONTROL (For Face Mode)
  const startCamera = async () => {
    if (isSimulatedCamera) { setStep('SCANNING'); return; }
    try {
      setStep('STARTING_CAMERA');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            setStep('SCANNING');
          }
      }, 100);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setMessage("Không thể truy cập camera. Vui lòng cấp quyền.");
      setStep('ERROR');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
  }, [stream]);

  useEffect(() => { 
      return () => stopCamera(); 
  }, [stopCamera]);

  // 3. ATTENDANCE LOGIC (CORE)
  const processAttendance = (employeeId: string, verifiedMethod: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) {
            setMessage("Không tìm thấy nhân viên với mã này!");
            setStep('ERROR');
            return;
        }

        const now = new Date();
        // FIX: Normalized date for searching in logs
        const localDateStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Ho_Chi_Minh',
              year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(now);

        // FIX: Force 24h format to prevent AM/PM calculation errors
        const timeStr = now.toLocaleTimeString('vi-VN', {
            hour: '2-digit', 
            minute:'2-digit', 
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh'
        });
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const existingLog = logs.find(l => l.employeeName === employee.name && l.date === localDateStr);
        
        let finalStatus: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN';
        let total = 0;
        let detectedShiftCode = existingLog?.shiftCode || '';

        if (existingLog && !existingLog.checkOut) {
            // CHECK OUT LOGIC
            const [inH, inM] = existingLog.checkIn ? existingLog.checkIn.split(':').map(Number) : [0,0];
            const inMinutes = inH * 60 + inM;
            const rawTotalMinutes = currentMinutes - inMinutes;

            // DEEP LOGIC FIX: Handle Split Shift Break Time
            const shift = settings.shiftConfigs?.find(s => s.code === detectedShiftCode);
            let breakDeduction = 0;
            
            if (shift && shift.isSplitShift && shift.breakStart && shift.breakEnd) {
                 const [bStartH, bStartM] = shift.breakStart.split(':').map(Number);
                 const [bEndH, bEndM] = shift.breakEnd.split(':').map(Number);
                 const bStartMins = bStartH * 60 + bStartM;
                 const bEndMins = bEndH * 60 + bEndM;

                 // If work spanned across the entire break
                 if (inMinutes < bStartMins && currentMinutes > bEndMins) {
                     breakDeduction = bEndMins - bStartMins;
                 }
            }

            total = parseFloat(((rawTotalMinutes - breakDeduction) / 60).toFixed(2));
            if (total < 0) total = 0;

            // Check Early Leave
            let status = existingLog.status;
            if (shift) {
                const [endH, endM] = shift.endTime.split(':').map(Number);
                const endMinutes = endH * 60 + endM;
                if (currentMinutes < endMinutes - 15) { 
                    status = AttendanceStatus.EARLY_LEAVE;
                }
            }

            const updatedLog: TimesheetLog = {
                ...existingLog,
                checkOut: timeStr,
                totalHours: total,
                status: status
            };
            updateAttendanceLog(updatedLog);
            finalStatus = 'CHECK_OUT';
        } else {
            // CHECK IN LOGIC
            let closestShift = settings.shiftConfigs?.[0];
            let minDiff = Infinity;

            settings.shiftConfigs?.forEach(shift => {
                const [h, m] = shift.startTime.split(':').map(Number);
                const shiftStartMins = h * 60 + m;
                const diff = Math.abs(currentMinutes - shiftStartMins);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestShift = shift;
                }
            });

            detectedShiftCode = closestShift?.code || 'N/A';
            const [sH, sM] = (closestShift?.startTime || '08:00').split(':').map(Number);
            const shiftStartMinutes = sH * 60 + sM;
            const allowedLate = settings.rules.allowedLateMinutes || 15;

            let status = AttendanceStatus.PRESENT;
            let late = 0;

            if (currentMinutes > shiftStartMinutes + allowedLate) {
                status = AttendanceStatus.LATE;
                late = currentMinutes - shiftStartMinutes;
            }

            const newLog: TimesheetLog = {
                id: Date.now().toString(),
                employeeName: employee.name,
                date: localDateStr,
                checkIn: timeStr,
                checkOut: null,
                totalHours: 0,
                status: status,
                lateMinutes: late,
                device: verifiedMethod,
                shiftCode: detectedShiftCode
            };
            addAttendanceLog(newLog);
            finalStatus = 'CHECK_IN';
        }
        
        setAttendanceResult({
            employeeName: employee.name,
            type: finalStatus,
            time: timeStr,
            totalHours: total,
            shiftCode: detectedShiftCode
        });
        setStep('SUCCESS');
        if (attendanceMode === 'FACE') setTimeout(() => stopCamera(), 500);
  }

  // 4. FACE HANDLERS
  const handleFaceCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    setStep('VERIFYING');
    setTimeout(() => {
        // Mock ID for simulation
        const mockEmpId = currentUser?.id || employees[0]?.id || '1';
        processAttendance(mockEmpId, `FaceID (AI Verify)`);
    }, 1500);
  };

  // 5. WIFI/GPS HANDLERS
  const handleWifiGpsCheckIn = () => {
      if (locationStatus !== 'VALID' || !isSimulatedWifi) {
          alert("Bạn phải ở đúng vị trí VÀ kết nối Wifi nhà hàng!");
          return;
      }
      setStep('VERIFYING'); // Reuse step for loading UI
      setTimeout(() => {
          const mockEmpId = currentUser?.id || employees[0]?.id || '1';
          processAttendance(mockEmpId, `GPS + Wifi Check`);
      }, 1000);
  };

  // Reset function
  const resetFlow = () => {
      setStep('IDLE');
      setAttendanceResult(null);
      setAttendanceMode('SELECT');
      stopCamera();
  }

  // --- RENDER HELPERS ---
  
  const renderSelectionScreen = () => (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Chọn Phương Thức Chấm Công</h2>
            <p className="text-gray-500 mt-2">Vui lòng chọn cách thức phù hợp với bạn</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setAttendanceMode('FACE')}
                className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-teal-500 shadow-lg hover:shadow-xl transition-all group flex flex-col items-center text-center"
              >
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                      <ScanLine size={48} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Xác minh Khuôn mặt</h3>
                  <p className="text-gray-500 text-sm">Sử dụng AI Camera để nhận diện. Phù hợp khi dùng máy Kiosk chung.</p>
              </button>

              <button 
                onClick={() => setAttendanceMode('WIFI_GPS')}
                className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-teal-500 shadow-lg hover:shadow-xl transition-all group flex flex-col items-center text-center"
              >
                  <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                      <div className="flex relative">
                          <MapPin size={32} className="text-teal-600 -ml-2" />
                          <Wifi size={32} className="text-teal-600 -ml-1" />
                      </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">GPS & Wifi Nhà Hàng</h3>
                  <p className="text-gray-500 text-sm">Chấm công nhanh trên thiết bị cá nhân. Yêu cầu đúng vị trí & Wifi.</p>
              </button>
          </div>
      </div>
  );

  const renderResultScreen = () => (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in duration-300 border border-gray-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto text-green-600 shadow-green-200 shadow-lg">
            <CheckCircle size={40} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-1">Xin chào, {attendanceResult?.employeeName}</h3>
        <p className="text-gray-500 mb-6 text-sm">Ghi nhận thành công!</p>

        <div className="bg-gray-50 rounded-xl p-4 w-full mb-6 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                        {attendanceResult?.type === 'CHECK_IN' ? (
                            <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg"><LogIn size={18}/></div>
                        ) : (
                            <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg"><LogOut size={18}/></div>
                        )}
                        <span className="font-bold text-gray-800 text-sm">
                            {attendanceResult?.type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                        </span>
                </div>
                <span className="text-xl font-bold text-indigo-600">{attendanceResult?.time}</span>
            </div>
            
            {attendanceResult?.shiftCode && (
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ca làm việc:</span>
                    <span className="font-bold text-gray-900">{attendanceResult.shiftCode}</span>
                </div>
            )}
            {attendanceResult?.totalHours !== undefined && (
                    <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tổng giờ làm:</span>
                    <span className="font-bold text-gray-900">{attendanceResult.totalHours}h</span>
                </div>
            )}
        </div>

        <button 
            onClick={resetFlow}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
            Hoàn tất
        </button>
    </div>
  );

  // --- MAIN RENDER ---

  // 1. SELECTION MODE
  if (attendanceMode === 'SELECT') {
      return renderSelectionScreen();
  }

  // 2. SUCCESS SCREEN (Shared)
  if (step === 'SUCCESS') {
      return renderResultScreen();
  }

  // 3. WIFI / GPS MODE
  if (attendanceMode === 'WIFI_GPS') {
      const isReady = locationStatus === 'VALID' && isSimulatedWifi;

      return (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-right">
               <button onClick={resetFlow} className="text-gray-500 hover:text-gray-900 flex items-center mb-4">
                  <ArrowLeft size={20} className="mr-1"/> Quay lại
              </button>

              <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Chấm công GPS & Wifi</h2>
                  <p className="text-gray-500 text-sm">Vui lòng kết nối Wifi nhà hàng và bật định vị.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                  {/* Location Check */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${locationStatus === 'VALID' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${locationStatus === 'VALID' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                              <MapPin size={20} />
                          </div>
                          <div>
                              <p className={`font-bold text-sm ${locationStatus === 'VALID' ? 'text-green-800' : 'text-red-800'}`}>
                                  {locationStatus === 'VALID' ? 'Vị trí hợp lệ' : 'Sai vị trí'}
                              </p>
                              <p className="text-xs text-gray-500">GPS Bán kính {settings.location.radiusMeters}m</p>
                          </div>
                      </div>
                      {locationStatus === 'VALID' ? <CheckCircle className="text-green-600" size={20}/> : <AlertTriangle className="text-red-500" size={20}/>}
                  </div>

                  {/* Wifi Check */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${isSimulatedWifi ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isSimulatedWifi ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                              <Wifi size={20} />
                          </div>
                          <div>
                              <p className={`font-bold text-sm ${isSimulatedWifi ? 'text-green-800' : 'text-red-800'}`}>
                                  {isSimulatedWifi ? 'Wifi hợp lệ' : 'Sai mạng Wifi'}
                              </p>
                              <p className="text-xs text-gray-500">Yêu cầu Wifi nội bộ</p>
                          </div>
                      </div>
                      {isSimulatedWifi ? <CheckCircle className="text-green-600" size={20}/> : <AlertTriangle className="text-red-500" size={20}/>}
                  </div>
              </div>

              {step === 'VERIFYING' ? (
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
                       <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                       <p className="font-bold text-gray-700">Đang xác thực dữ liệu...</p>
                   </div>
              ) : (
                   <button 
                        onClick={handleWifiGpsCheckIn}
                        disabled={!isReady}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${isReady ? 'bg-teal-600 text-white hover:bg-teal-700 hover:scale-[1.02]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                   >
                        Xác nhận Chấm công
                   </button>
              )}
              
              {/* Dev Tool for Simulation */}
              <div className="mt-8 pt-4 border-t text-center">
                  <p className="text-xs text-gray-400 mb-2">Công cụ Test (Giả lập Wifi)</p>
                  <button 
                    onClick={() => setIsSimulatedWifi(!isSimulatedWifi)}
                    className={`text-xs px-3 py-1 rounded border ${isSimulatedWifi ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500'}`}
                  >
                      {isSimulatedWifi ? 'Wifi Connected (Sim)' : 'Wifi Disconnected (Sim)'}
                  </button>
              </div>
          </div>
      );
  }

  // 4. FACE ID MODE (Existing UI)
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in slide-in-from-right">
      <button onClick={resetFlow} className="text-gray-500 hover:text-gray-900 flex items-center mb-2">
          <ArrowLeft size={20} className="mr-1"/> Quay lại
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Xác minh Khuôn mặt</h2>
        <p className="text-gray-500 text-sm">Sử dụng Camera để chấm công</p>
      </div>

      <div className="bg-black rounded-3xl shadow-xl border-4 border-gray-100 relative overflow-hidden aspect-[3/4] flex flex-col items-center justify-center group">
        
        {/* IDLE STATE */}
        {step === 'IDLE' && (
          <div className="bg-white absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
             <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-blue-50 text-blue-600`}>
                <ScanLine size={40} />
             </div>

             <h3 className="text-xl font-bold text-gray-900 mb-2">
                 Nhận diện khuôn mặt
             </h3>
             <p className="text-gray-500 text-sm mb-8 max-w-[240px]">
                Đưa khuôn mặt vào khung hình để hệ thống tự động nhận diện.
             </p>

             <button 
               onClick={startCamera}
               className="w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
             >
               <Camera size={20} />
               <span>Kích hoạt Camera</span>
             </button>
          </div>
        )}

        {/* CAMERA LOADING */}
        {step === 'STARTING_CAMERA' && (
           <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white font-medium">Đang khởi động...</p>
           </div>
        )}

        {/* ACTIVE SCANNING */}
        {(step === 'SCANNING' || step === 'VERIFYING') && (
          <>
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                playsInline
            />
            <div className={`absolute inset-0 bg-white z-30 transition-opacity duration-150 pointer-events-none ${flash ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="absolute inset-0 z-10 flex flex-col justify-between py-8 px-6 pointer-events-none">
                 <div className="flex justify-center">
                    <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        {step === 'VERIFYING' ? 'Đang xác thực...' : 'Giữ khuôn mặt thẳng'}
                    </div>
                 </div>

                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                    <div className="w-full h-full border-2 border-white/50 rounded-3xl relative overflow-hidden">
                        {step === 'SCANNING' && (
                             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/0 animate-scan"></div>
                        )}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-4 pointer-events-auto">
                    {step === 'SCANNING' && (
                        <button 
                            onClick={handleFaceCapture}
                            className="w-16 h-16 bg-white rounded-full border-[6px] border-blue-500/50 hover:border-blue-500 transition-all hover:scale-105 shadow-lg flex items-center justify-center"
                        >
                            <div className="w-12 h-12 bg-blue-600 rounded-full"></div>
                        </button>
                    )}

                    <button 
                        onClick={() => { stopCamera(); setStep('IDLE'); }} 
                        className="text-white text-sm font-medium shadow-black/50 drop-shadow-md hover:opacity-80"
                    >
                        Hủy bỏ
                    </button>
                 </div>
            </div>
          </>
        )}

        {/* ERROR STATE */}
        {step === 'ERROR' && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
               <AlertTriangle size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Thất bại</h3>
             <p className="text-gray-500 text-sm mb-6">{message}</p>
             <button onClick={() => setStep('IDLE')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium">
               Thử lại
             </button>
          </div>
        )}
      </div>
      
      <div className="text-center mt-4">
         <button onClick={() => setIsSimulatedCamera(!isSimulatedCamera)} className={`text-xs px-3 py-1 rounded border ${isSimulatedCamera ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            {isSimulatedCamera ? 'Cam: Simulated' : 'Cam: Real Device'}
         </button>
      </div>

      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan { animation: scan 2s linear infinite; }
      `}</style>
    </div>
  );
};
