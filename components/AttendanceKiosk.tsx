
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, Wifi, CheckCircle, AlertTriangle, ScanLine, LogOut, LogIn, QrCode, User, Smartphone } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { AttendanceStatus, TimesheetLog } from '../types';

export const AttendanceKiosk: React.FC = () => {
  const { settings, addAttendanceLog, updateAttendanceLog, logs, employees } = useGlobalContext();
  const [method, setMethod] = useState<'FACE' | 'QR'>('QR'); // Default to QR as requested

  // Camera & Stream Refs
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Flow States
  const [step, setStep] = useState<'IDLE' | 'STARTING_CAMERA' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [locationStatus, setLocationStatus] = useState<'CHECKING' | 'VALID' | 'INVALID' | 'ERROR'>('CHECKING');
  const [distance, setDistance] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [matchScore, setMatchScore] = useState<number>(0);
  const [flash, setFlash] = useState(false);
  
  // QR Input state (Simulating scanner hardware input)
  const [qrInput, setQrInput] = useState("");
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Result State for Display
  const [attendanceResult, setAttendanceResult] = useState<{
      employeeName: string;
      type: 'CHECK_IN' | 'CHECK_OUT';
      time: string;
      totalHours?: number;
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
        setDistance(Math.round(dist));
        if (dist <= settings.location.radiusMeters) setLocationStatus('VALID');
        else setLocationStatus('INVALID');
      },
      (error) => { console.error("GPS Error:", error); setLocationStatus('ERROR'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [settings]);

  // 2. CAMERA CONTROL
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
            // Auto-focus input for QR if in QR mode
            if (method === 'QR') setTimeout(() => qrInputRef.current?.focus(), 500);
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

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  // 3. ATTENDANCE LOGIC
  const processAttendance = (employeeId: string, verifiedMethod: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) {
            setMessage("Không tìm thấy nhân viên với mã này!");
            setStep('ERROR');
            return;
        }

        const now = new Date();
        const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
        
        const existingLog = logs.find(l => l.employeeName === employee.name && l.date === localDateStr);
        
        let finalStatus: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN';
        let total = 0;

        if (existingLog && !existingLog.checkOut) {
            // CHECK OUT
            const [inH, inM] = existingLog.checkIn ? existingLog.checkIn.split(':').map(Number) : [0,0];
            const [outH, outM] = timeStr.split(':').map(Number);
            total = parseFloat(((outH * 60 + outM - (inH * 60 + inM)) / 60).toFixed(2));
            if (total < 0) total = 0;

            const updatedLog: TimesheetLog = {
                ...existingLog,
                checkOut: timeStr,
                totalHours: total,
            };
            updateAttendanceLog(updatedLog);
            finalStatus = 'CHECK_OUT';
        } else {
            // CHECK IN
            const startHourRule = parseInt(settings.rules.startHour.split(':')[0]);
            const hour = now.getHours();
            let status = AttendanceStatus.PRESENT;
            let late = 0;
            if (hour > startHourRule) {
                status = AttendanceStatus.LATE;
                late = (hour - startHourRule) * 60 + now.getMinutes();
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
                device: verifiedMethod
            };
            addAttendanceLog(newLog);
            finalStatus = 'CHECK_IN';
        }
        
        setAttendanceResult({
            employeeName: employee.name,
            type: finalStatus,
            time: timeStr,
            totalHours: total
        });
        setMatchScore(Math.floor(Math.random() * (99 - 92) + 92));
        setStep('SUCCESS');
        setTimeout(() => stopCamera(), 500);
  }

  // 4. HANDLERS
  const handleFaceCapture = () => {
    // Trigger Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    
    setStep('VERIFYING');
    // Simulating Face Matching Delay
    setTimeout(() => {
        // In real app: Send image to backend to find employee
        // Here: We just simulate it works for the FIRST employee found
        const mockEmpId = employees[0]?.id || '1';
        
        let connectionType = 'GPS';
        if (isSimulatedWifi) connectionType = 'Wifi';
        processAttendance(mockEmpId, `FaceID (${connectionType})`);
    }, 1500);
  };

  const handleQrScan = (e: React.FormEvent) => {
      e.preventDefault();
      if (!qrInput) return;
      
      setStep('VERIFYING');
      setTimeout(() => {
          // Logic: QR Code content = Employee ID
          // Simulate scan success
          // Try to find employee with ID = qrInput
          const emp = employees.find(e => e.id === qrInput);
          if (emp) {
              let connectionType = 'GPS';
              if (isSimulatedWifi) connectionType = 'Wifi';
              processAttendance(emp.id, `QR Code (${connectionType})`);
          } else {
              setMessage(`Mã QR không hợp lệ: ${qrInput}`);
              setStep('ERROR');
          }
          setQrInput("");
      }, 800);
  };

  const canCheckIn = locationStatus === 'VALID' || isSimulatedWifi;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Máy Chấm Công</h2>
        <p className="text-gray-500 text-sm">Vui lòng chọn phương thức xác thực</p>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition-colors ${locationStatus === 'VALID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
             <MapPin size={16} />
             <span className="text-xs font-bold">{locationStatus === 'VALID' ? 'GPS Tốt' : 'GPS Xa'}</span>
        </div>
        <div className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition-colors ${isSimulatedWifi ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
             <Wifi size={16} />
             <span className="text-xs font-bold">{isSimulatedWifi ? 'Wifi OK' : 'No Wifi'}</span>
        </div>
      </div>

      {/* Method Tabs */}
      <div className="bg-gray-100 p-1 rounded-xl flex">
          <button 
             onClick={() => { setMethod('QR'); setStep('IDLE'); stopCamera(); }}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${method === 'QR' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <QrCode size={18}/> QR Code
          </button>
          <button 
             onClick={() => { setMethod('FACE'); setStep('IDLE'); stopCamera(); }}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${method === 'FACE' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <ScanLine size={18}/> Face ID
          </button>
      </div>

      <div className="bg-black rounded-3xl shadow-xl border-4 border-gray-100 relative overflow-hidden aspect-[3/4] flex flex-col items-center justify-center group">
        
        {/* IDLE STATE */}
        {step === 'IDLE' && (
          <div className="bg-white absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
             <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${canCheckIn ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-300'}`}>
                {method === 'QR' ? <QrCode size={40} /> : <ScanLine size={40} />}
             </div>

             <h3 className="text-xl font-bold text-gray-900 mb-2">
                 {method === 'QR' ? 'Quét mã nhân viên' : 'Nhận diện khuôn mặt'}
             </h3>
             <p className="text-gray-500 text-sm mb-8 max-w-[240px]">
               {canCheckIn 
                ? "Vị trí hợp lệ. Bấm bắt đầu để mở camera." 
                : "Vui lòng di chuyển vào vị trí hoặc kết nối Wifi."}
             </p>

             <button 
               onClick={startCamera}
               disabled={!canCheckIn}
               className={`w-full py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center space-x-2 ${canCheckIn ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-300 cursor-not-allowed'}`}
             >
               <Camera size={20} />
               <span>Kích hoạt Camera</span>
             </button>
             
             <div className="mt-4 flex gap-2">
                 <button className="text-xs text-gray-400 underline">Vân tay (Sắp ra mắt)</button>
             </div>
          </div>
        )}

        {/* CAMERA LOADING */}
        {step === 'STARTING_CAMERA' && (
           <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-20">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
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

            {/* Overlay UI */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between py-8 px-6 pointer-events-none">
                 <div className="flex justify-center">
                    <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        {step === 'VERIFYING' ? 'Đang xác thực...' : (method === 'QR' ? 'Đưa mã QR vào khung' : 'Giữ khuôn mặt thẳng')}
                    </div>
                 </div>

                 {/* Scanning Frame */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                    <div className="w-full h-full border-2 border-white/50 rounded-3xl relative overflow-hidden">
                        {step === 'SCANNING' && (
                             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-teal-500/0 via-teal-500/20 to-teal-500/0 animate-scan"></div>
                        )}
                        {/* Corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-2xl"></div>
                    </div>
                 </div>

                 {/* Bottom Controls */}
                 <div className="flex flex-col items-center gap-4 pointer-events-auto">
                    {method === 'FACE' && step === 'SCANNING' && (
                        <button 
                            onClick={handleFaceCapture}
                            className="w-16 h-16 bg-white rounded-full border-[6px] border-teal-500/50 hover:border-teal-500 transition-all hover:scale-105 shadow-lg flex items-center justify-center"
                        >
                            <div className="w-12 h-12 bg-teal-600 rounded-full"></div>
                        </button>
                    )}
                    
                    {/* QR Code Simulation Input */}
                    {method === 'QR' && step === 'SCANNING' && (
                        <form onSubmit={handleQrScan} className="w-full max-w-[200px] relative">
                            <input 
                                ref={qrInputRef}
                                type="text" 
                                value={qrInput}
                                onChange={(e) => setQrInput(e.target.value)}
                                placeholder="Nhập mã test (VD: 1)..."
                                className="w-full px-4 py-2 rounded-full bg-black/50 text-white border border-white/30 text-center text-sm backdrop-blur-sm outline-none focus:border-teal-500"
                                autoFocus
                            />
                            <Smartphone className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                        </form>
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

        {/* SUCCESS STATE */}
        {step === 'SUCCESS' && attendanceResult && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 shadow-green-200 shadow-lg">
              <CheckCircle size={40} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">Xin chào, {attendanceResult.employeeName}</h3>
            <p className="text-gray-500 mb-6 text-sm">Chấm công thành công!</p>

            <div className="bg-gray-50 rounded-xl p-4 w-full mb-6 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                         {attendanceResult.type === 'CHECK_IN' ? (
                             <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg"><LogIn size={18}/></div>
                         ) : (
                             <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg"><LogOut size={18}/></div>
                         )}
                         <span className="font-bold text-gray-800 text-sm">
                             {attendanceResult.type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                         </span>
                    </div>
                    <span className="text-xl font-bold text-indigo-600">{attendanceResult.time}</span>
                </div>

                {attendanceResult.totalHours !== undefined && (
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tổng giờ làm:</span>
                        <span className="font-bold text-gray-900">{attendanceResult.totalHours}h</span>
                    </div>
                )}
            </div>

            <button 
               onClick={() => { setStep('IDLE'); }}
               className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
             >
               Hoàn tất
             </button>
          </div>
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

      {/* Dev Tools */}
      <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex gap-3">
            <button onClick={() => setIsSimulatedWifi(!isSimulatedWifi)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 ${isSimulatedWifi ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Wifi size={14} /> {isSimulatedWifi ? 'Wifi: ON' : 'Wifi: OFF'}
            </button>
            <button onClick={() => setIsSimulatedCamera(!isSimulatedCamera)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 ${isSimulatedCamera ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Camera size={14} /> {isSimulatedCamera ? 'Cam: Sim' : 'Cam: Real'}
            </button>
          </div>
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
