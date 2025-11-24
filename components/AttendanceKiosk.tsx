
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, ScanLine, LogOut, LogIn, ArrowLeft } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { AttendanceStatus, TimesheetLog } from '../types';
import { verifyFaceIdentity } from '../services/geminiService';

export const AttendanceKiosk: React.FC = () => {
  const { settings, addAttendanceLog, updateAttendanceLog, logs, employees, currentUser } = useGlobalContext();
  
  // Flow States
  const [attendanceMode, setAttendanceMode] = useState<'SELECT' | 'FACE' | 'GPS'>('SELECT');

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
    
    // Clean up old watch if exists
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
        if (dist <= settings.location.radiusMeters) {
            setLocationStatus('VALID');
            setMessage(""); // Clear error if valid
        } else {
            setLocationStatus('INVALID');
            setMessage(`Bạn đang ở cách vị trí cho phép ${Math.round(dist)}m (Yêu cầu < ${settings.location.radiusMeters}m)`);
        }
      },
      (error) => { 
          console.error(`GPS Error: ${error.code} - ${error.message}`);
          
          if (error.code === 1) { // PERMISSION_DENIED
              setLocationStatus('ERROR');
              setMessage("Vui lòng cấp quyền truy cập vị trí cho trình duyệt và thử lại.");
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
              setMessage("Không thể xác định vị trí. Vui lòng kiểm tra GPS/Wifi.");
          } else if (error.code === 3) { // TIMEOUT
              console.warn("GPS Timeout - Retrying...");
          } else {
              setLocationStatus('ERROR');
              setMessage(`Lỗi định vị: ${error.message}`);
          }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [settings]);

  // 2. CAMERA CONTROL (Real Hardware Only)
  useEffect(() => {
      if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
      }
  }, [stream]);

  const startCamera = async () => {
    try {
      setStep('STARTING_CAMERA');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setMessage("Không thể truy cập camera. Vui lòng cấp quyền hoặc kiểm tra thiết bị.");
      setStep('ERROR');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) { 
        stream.getTracks().forEach(track => track.stop()); 
        setStream(null); 
    }
  }, [stream]);

  useEffect(() => { 
      return () => stopCamera(); 
  }, [stopCamera]);

  // 3. ATTENDANCE LOGIC (CORE - FIXED)
  const processAttendance = (employeeId: string, verifiedMethod: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) {
            setMessage("Không tìm thấy nhân viên với mã này!");
            setStep('ERROR');
            return;
        }

        const now = new Date();
        // Ensure Date matches GlobalContext format
        const localDateStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Ho_Chi_Minh',
              year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(now);

        const timeStr = now.toLocaleTimeString('vi-VN', {
            hour: '2-digit', minute:'2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh'
        });
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const openLog = logs.find(l => 
            l.employeeName === employee.name && 
            l.date === localDateStr && 
            !l.checkOut
        );

        let finalStatus: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN';
        let total = 0;
        let detectedShiftCode = openLog?.shiftCode || '';

        if (openLog) {
            // --- CHECK OUT LOGIC ---
            const [inH, inM] = openLog.checkIn ? openLog.checkIn.split(':').map(Number) : [0,0];
            const inMinutes = inH * 60 + inM;
            const rawTotalMinutes = currentMinutes - inMinutes;

            const shift = settings.shiftConfigs?.find(s => s.code === detectedShiftCode);
            let breakDeduction = 0;
            
            if (shift && shift.isSplitShift && shift.breakStart && shift.breakEnd) {
                 const [bStartH, bStartM] = shift.breakStart.split(':').map(Number);
                 const [bEndH, bEndM] = shift.breakEnd.split(':').map(Number);
                 const bStartMins = bStartH * 60 + bStartM;
                 const bEndMins = bEndH * 60 + bEndM;

                 if (inMinutes < bStartMins && currentMinutes > bEndMins) {
                     breakDeduction = bEndMins - bStartMins;
                 }
            }

            total = parseFloat(((rawTotalMinutes - breakDeduction) / 60).toFixed(2));
            if (total < 0) total = 0;

            let status = openLog.status;
            if (shift) {
                let targetEndTimeMinutes = 0;
                if (shift.isSplitShift && shift.breakStart && currentMinutes < (16 * 60)) {
                    const [bsH, bsM] = shift.breakStart.split(':').map(Number);
                    targetEndTimeMinutes = bsH * 60 + bsM;
                } else {
                    const [endH, endM] = shift.endTime.split(':').map(Number);
                    targetEndTimeMinutes = endH * 60 + endM;
                }

                if (currentMinutes < targetEndTimeMinutes - 15) { 
                    status = AttendanceStatus.EARLY_LEAVE;
                }
            }

            const updatedLog: TimesheetLog = {
                ...openLog,
                checkOut: timeStr,
                totalHours: total,
                status: status
            };
            updateAttendanceLog(updatedLog);
            finalStatus = 'CHECK_OUT';
        } else {
            // --- CHECK IN LOGIC ---
            let closestShift = settings.shiftConfigs?.[0];
            let minDiff = Infinity;

            settings.shiftConfigs?.forEach(shift => {
                const [h, m] = shift.startTime.split(':').map(Number);
                const shiftStartMins = h * 60 + m;
                const diffStart = Math.abs(currentMinutes - shiftStartMins);
                let diff = diffStart;

                if (shift.isSplitShift && shift.breakEnd) {
                    const [bh, bm] = shift.breakEnd.split(':').map(Number);
                    const breakEndMins = bh * 60 + bm;
                    const diffBreak = Math.abs(currentMinutes - breakEndMins);
                    if (diffBreak < diff) diff = diffBreak;
                }

                if (diff < minDiff) {
                    minDiff = diff;
                    closestShift = shift;
                }
            });

            detectedShiftCode = closestShift?.code || 'N/A';
            
            let [sH, sM] = (closestShift?.startTime || '08:00').split(':').map(Number);
            let shiftStartMinutes = sH * 60 + sM;

            if (closestShift?.isSplitShift && closestShift.breakEnd) {
                const [beH, beM] = closestShift.breakEnd.split(':').map(Number);
                const breakEndMins = beH * 60 + beM;
                if (currentMinutes > (breakEndMins - 90)) {
                    shiftStartMinutes = breakEndMins;
                }
            }

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
  const handleFaceCapture = async () => {
    if (!currentUser) {
        setMessage("Không tìm thấy người dùng đang đăng nhập.");
        setStep('ERROR');
        return;
    }

    if (!currentUser.avatar || currentUser.avatar.length < 100) {
        setMessage("Bạn chưa đăng ký khuôn mặt. Vui lòng liên hệ Admin.");
        setStep('ERROR');
        return;
    }

    if (!videoRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    setStep('VERIFYING');

    try {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scale = MAX_WIDTH / videoRef.current.videoWidth;
        canvas.width = MAX_WIDTH;
        canvas.height = videoRef.current.videoHeight * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const capturedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            // CALL AI VERIFICATION
            const result = await verifyFaceIdentity(capturedBase64, currentUser.avatar);

            // LOGIC CHẶN CHẶT CHẼ (STRICT):
            // 1. Phải có hasFace = true (Có mặt người)
            // 2. Độ tin cậy >= 85%
            if (result.hasFace && result.match && result.confidence >= 85) {
                processAttendance(currentUser.id, `FaceID (AI: ${result.confidence}%)`);
            } else {
                if (!result.hasFace) {
                    setMessage("Không tìm thấy khuôn mặt! Vui lòng không đeo khẩu trang và nhìn thẳng.");
                } else {
                    setMessage(`Khuôn mặt không khớp (Độ tin cậy thấp: ${result.confidence}%). Vui lòng thử lại.`);
                }
                setStep('ERROR');
            }
        }
    } catch (e) {
        console.error(e);
        setMessage("Lỗi xử lý hình ảnh.");
        setStep('ERROR');
    }
  };

  // 5. GPS HANDLERS
  const handleGpsCheckIn = () => {
      if (locationStatus !== 'VALID') {
          if (locationStatus === 'ERROR') alert("Lỗi: Không thể xác định vị trí. Vui lòng bật GPS.");
          else alert(`Bạn đang ở ngoài phạm vi cho phép. ${message}`);
          return;
      }
      if (!currentUser) {
          alert("Vui lòng đăng nhập trước khi chấm công.");
          return;
      }

      setStep('VERIFYING');
      setTimeout(() => {
          processAttendance(currentUser.id, `GPS Location`);
      }, 1000);
  };

  const resetFlow = () => {
      setStep('IDLE');
      setAttendanceResult(null);
      setAttendanceMode('SELECT');
      stopCamera();
  }

  // --- RENDER ---
  
  const renderSelectionScreen = () => (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Chọn Phương Thức Chấm Công</h2>
            <p className="text-gray-500 mt-2">Vui lòng chọn cách thức phù hợp với bạn</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => { startCamera(); setAttendanceMode('FACE'); }}
                className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-teal-500 shadow-lg hover:shadow-xl transition-all group flex flex-col items-center text-center"
              >
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                      <ScanLine size={40} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Face ID (AI)</h3>
                  <p className="text-gray-500 text-sm">Nhận diện khuôn mặt thông minh (Yêu cầu Camera)</p>
              </button>

              <button 
                onClick={() => setAttendanceMode('GPS')}
                className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-teal-500 shadow-lg hover:shadow-xl transition-all group flex flex-col items-center text-center"
              >
                  <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                      <MapPin size={40} className="text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Chấm công GPS</h3>
                  <p className="text-gray-500 text-sm">Dành cho điện thoại cá nhân. Yêu cầu bật định vị.</p>
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

  // FACE MODE UI
  if (attendanceMode === 'FACE' && step !== 'SUCCESS') {
      return (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-right">
              <button onClick={resetFlow} className="text-gray-500 hover:text-gray-900 flex items-center mb-4">
                  <ArrowLeft size={20} className="mr-1"/> Quay lại
              </button>

              <div className="relative bg-black rounded-3xl overflow-hidden aspect-[3/4] shadow-2xl border-4 border-gray-900">
                  {step === 'STARTING_CAMERA' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 z-20">
                          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
                          <p>Đang mở camera...</p>
                      </div>
                  )}
                  
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    onCanPlay={() => setStep('SCANNING')}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  ></video>
                  
                  {/* Overlay Frame */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute top-8 left-0 right-0 text-center">
                          <p className="text-white font-bold text-lg drop-shadow-md bg-black/30 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
                              {step === 'VERIFYING' ? 'Đang xác thực...' : 'Giữ khuôn mặt trong khung hình'}
                          </p>
                      </div>
                      
                      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 rounded-full transition-colors duration-300 ${step === 'VERIFYING' ? 'border-yellow-400 animate-pulse' : step === 'ERROR' ? 'border-red-500' : 'border-white/50'}`}>
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-white/80"></div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-1 h-4 bg-white/80"></div>
                          <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-1 bg-white/80"></div>
                          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-1 bg-white/80"></div>
                      </div>
                  </div>

                  {/* Flash Effect */}
                  {flash && <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-300"></div>}

                  {/* Error Message Overlay */}
                  {step === 'ERROR' && (
                      <div className="absolute bottom-24 left-4 right-4 bg-red-500/90 text-white p-3 rounded-xl text-center backdrop-blur-sm animate-in slide-in-from-bottom">
                          <p className="text-sm font-bold">{message}</p>
                          <button onClick={() => setStep('SCANNING')} className="mt-2 text-xs underline">Thử lại ngay</button>
                      </div>
                  )}

                  <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                      <button 
                          onClick={handleFaceCapture}
                          disabled={step !== 'SCANNING' && step !== 'ERROR'}
                          className={`w-16 h-16 rounded-full border-4 border-white shadow-lg transition-transform active:scale-95 ${step === 'VERIFYING' ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 hover:scale-105'}`}
                      >
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  if (attendanceMode === 'SELECT') return renderSelectionScreen();
  if (step === 'SUCCESS') return renderResultScreen();

  // GPS MODE (Existing Code)
  if (attendanceMode === 'GPS') {
      return (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-right">
               <button onClick={resetFlow} className="text-gray-500 hover:text-gray-900 flex items-center mb-4">
                  <ArrowLeft size={20} className="mr-1"/> Quay lại
              </button>

              <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Chấm công GPS</h2>
                  <p className="text-gray-500 text-sm">Vui lòng cho phép trình duyệt truy cập vị trí.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                  {/* Location Check */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${locationStatus === 'VALID' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${locationStatus === 'VALID' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                              <MapPin size={20} />
                          </div>
                          <div>
                              <p className={`font-bold text-sm ${locationStatus === 'VALID' ? 'text-green-800' : locationStatus === 'CHECKING' ? 'text-yellow-700' : 'text-red-800'}`}>
                                  {locationStatus === 'VALID' ? 'Vị trí hợp lệ' : locationStatus === 'CHECKING' ? 'Đang định vị...' : 'Sai vị trí'}
                              </p>
                              <p className="text-xs text-gray-500">
                                  {message ? message : `Yêu cầu bán kính ${settings.location.radiusMeters}m`}
                              </p>
                          </div>
                      </div>
                      {locationStatus === 'VALID' ? <CheckCircle className="text-green-600" size={20}/> : locationStatus === 'CHECKING' ? <div className="animate-spin w-5 h-5 border-2 border-yellow-500 rounded-full border-t-transparent"></div> : <AlertTriangle className="text-red-500" size={20}/>}
                  </div>
              </div>

              {step === 'VERIFYING' ? (
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
                       <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                       <p className="font-bold text-gray-700">Đang xác thực dữ liệu...</p>
                   </div>
              ) : (
                   <button 
                        onClick={handleGpsCheckIn}
                        disabled={locationStatus !== 'VALID'}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${locationStatus === 'VALID' ? 'bg-teal-600 text-white hover:bg-teal-700 hover:scale-[1.02]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                   >
                        Xác nhận Chấm công
                   </button>
              )}
          </div>
      );
  }

  return null;
};
