
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, CheckCircle, AlertTriangle, ScanLine, LogOut, LogIn, ArrowLeft, Loader2, Satellite, RefreshCw, Wifi, Signal, Mic, StopCircle, Volume2, QrCode, Smartphone, Zap, Home } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { AttendanceStatus, TimesheetLog } from '../types';
import { verifyFaceIdentity, analyzeVoiceCheckIn } from '../services/geminiService';
import jsQR from "jsqr";

// Simple interface to avoid GeolocationCoordinates prototype issues
interface SimpleCoords {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

interface CachedPosition extends SimpleCoords {
    timestamp: number;
}

export const AttendanceKiosk: React.FC = () => {
  const { settings, addAttendanceLog, updateAttendanceLog, logs, employees, currentUser } = useGlobalContext();
  
  // Flow States
  const [attendanceMode, setAttendanceMode] = useState<'SELECT' | 'FACE' | 'GPS' | 'VOICE' | 'SCAN_QR'>('SELECT');

  // Camera & Stream Refs (For Face & QR Mode)
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // Voice Refs
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [challengePhrase, setChallengePhrase] = useState("");
  
  // Sub-states
  const [step, setStep] = useState<'IDLE' | 'STARTING_CAMERA' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [locationStatus, setLocationStatus] = useState<'CHECKING' | 'VALID' | 'INVALID' | 'ERROR'>('CHECKING');
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState(false);

  // SMART GPS STATES
  const [isSampling, setIsSampling] = useState(false);
  const [gpsStep, setGpsStep] = useState<string>(""); // For UI Feedback text
  
  // REF: Store the absolute latest position from background watcher WITH TIMESTAMP
  const lastKnownPosRef = useRef<CachedPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Result State for Display
  const [attendanceResult, setAttendanceResult] = useState<{
      employeeName: string;
      type: 'CHECK_IN' | 'CHECK_OUT';
      time: string;
      totalHours?: number;
      shiftCode?: string;
  } | null>(null);
  
  // 1. GEOLOCATION HELPER
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

  // 2. BACKGROUND GPS WARM-UP (ALWAYS RUNNING IN GPS MODE)
  useEffect(() => {
    if (attendanceMode !== 'GPS') return;

    if (!navigator.geolocation) {
      setLocationStatus('ERROR');
      setMessage("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    
    // Clear previous watch
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    
    setLocationStatus('CHECKING');
    setMessage("Đang khởi động định vị nền...");
    
    // Start Background Watcher (High Accuracy) to keep GPS warm
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Save to Ref for Fallback usage
        lastKnownPosRef.current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now() // Use local timestamp
        };

        // Update UI Status (Only if not actively sampling to avoid flickering)
        if (!isSampling) {
            const dist = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              settings.location.latitude,
              settings.location.longitude
            );
            if (dist <= settings.location.radiusMeters) {
                setLocationStatus('VALID');
                setMessage(`Sẵn sàng (~${Math.round(dist)}m)`); 
            } else {
                setLocationStatus('INVALID');
                setMessage(`Cách vị trí chuẩn ${Math.round(dist)}m`);
            }
        }
      },
      (error) => { 
          if (!isSampling) {
            console.warn(`Background GPS Warning: ${error.message}`);
            if (error.code === 1) { 
                setLocationStatus('ERROR');
                setMessage("Vui lòng cấp quyền vị trí.");
            }
          }
      },
      { 
          enableHighAccuracy: true, 
          timeout: 30000, 
          maximumAge: 0 
      }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [settings, attendanceMode, isSampling]);

  // 3. CAMERA CONTROL
  useEffect(() => {
      if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          // Only start QR scanning if in QR mode
          if (attendanceMode === 'SCAN_QR') {
             requestRef.current = requestAnimationFrame(scanQrFrame);
          }
      }
  }, [stream, attendanceMode]);

  const startCamera = async (facingMode: 'user' | 'environment' = 'user') => {
    try {
      setStep('STARTING_CAMERA');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setMessage("Không thể truy cập camera. Vui lòng cấp quyền.");
      setStep('ERROR');
    }
  };

  const stopCamera = useCallback(() => {
    if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    if (stream) { 
        stream.getTracks().forEach(track => track.stop()); 
        setStream(null); 
    }
  }, [stream]);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  // 4. QR SCANNING LOGIC
  const scanQrFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                // Use jsQR to scan
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                
                if (code) {
                    validateQrToken(code.data);
                    return; // Stop scanning on success
                }
            }
        }
    }
    requestRef.current = requestAnimationFrame(scanQrFrame);
  };

  const validateQrToken = (token: string) => {
      // TOKEN FORMAT: "RES_SYNC|TIMESTAMP|SALT"
      try {
          if (!token.startsWith("RES_SYNC|")) return; // Ignore non-system QRs
          
          const parts = token.split('|');
          if (parts.length < 3) return;

          const timestamp = parseInt(parts[1]);
          const now = Date.now();
          const diff = Math.abs(now - timestamp);

          // ALLOW 20 SECONDS VALIDITY (To account for slight clock drift and scan time)
          if (diff < 20000) {
              if (currentUser) {
                  stopCamera();
                  setStep('VERIFYING');
                  processAttendance(currentUser.id, "QR Trạm (Verified)");
              }
          }
      } catch (e) {
          console.error(e);
      }
  };

  // 5. ATTENDANCE PROCESS LOGIC
  const processAttendance = (employeeId: string, verifiedMethod: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) {
            setMessage("Không tìm thấy nhân viên!");
            setStep('ERROR');
            return;
        }

        const now = new Date();
        const localDateStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
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
            // CHECK OUT
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
            const updatedLog: TimesheetLog = { ...openLog, checkOut: timeStr, totalHours: total, status: openLog.status };
            updateAttendanceLog(updatedLog);
            finalStatus = 'CHECK_OUT';
        } else {
            // CHECK IN
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
                if (diff < minDiff) { minDiff = diff; closestShift = shift; }
            });

            detectedShiftCode = closestShift?.code || 'N/A';
            const allowedLate = settings.rules.allowedLateMinutes || 15;
            let [sH, sM] = (closestShift?.startTime || '08:00').split(':').map(Number);
            let shiftStartMinutes = sH * 60 + sM;

            let status = AttendanceStatus.PRESENT;
            let late = 0;
            if (currentMinutes > shiftStartMinutes + allowedLate) {
                status = AttendanceStatus.LATE;
                late = currentMinutes - shiftStartMinutes;
            }

            const newLog: TimesheetLog = {
                id: Date.now().toString(),
                employeeName: employee.name,
                employeeId: employee.id, 
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

  // 6. FACE HANDLERS
  const handleFaceCapture = async () => {
    if (!currentUser) { setMessage("Vui lòng đăng nhập."); setStep('ERROR'); return; }
    if (!currentUser.avatar || currentUser.avatar.length < 100) { setMessage("Bạn chưa đăng ký khuôn mặt."); setStep('ERROR'); return; }
    if (!videoRef.current) return;
    setFlash(true); setTimeout(() => setFlash(false), 150);
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
            const result = await verifyFaceIdentity(capturedBase64, currentUser.avatar);
            if (result.hasFace && result.match && result.confidence >= 85) {
                processAttendance(currentUser.id, `FaceID (AI: ${result.confidence}%)`);
            } else {
                setMessage(!result.hasFace ? "Không tìm thấy khuôn mặt!" : `Khuôn mặt không khớp (${result.confidence}%).`);
                setStep('ERROR');
            }
        }
    } catch (e) { setMessage("Lỗi xử lý hình ảnh."); setStep('ERROR'); }
  };

  // 7. ADAPTIVE HYBRID GEOLOCATION (OPTIMIZED V3)
  const getPosition = (enableHighAccuracy: boolean, timeout: number, maximumAge: number): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy, timeout, maximumAge });
    });
  };

  const startAdaptiveCheckIn = async () => {
      if (!currentUser) { alert("Vui lòng đăng nhập."); return; }
      
      setIsSampling(true);
      setGpsStep("Đang phân tích...");
      setMessage("Đang khởi chạy định vị...");
      setAttendanceResult(null);

      let bestPosition: GeolocationPosition | null = null;
      let methodUsed = "";

      try {
          // CHIẾN LƯỢC 1: KIỂM TRA DỮ LIỆU NỀN (BACKGROUND INSTANT CHECK)
          if (lastKnownPosRef.current) {
             const cached = lastKnownPosRef.current;
             const age = Date.now() - cached.timestamp;
             const acc = cached.accuracy || 100;
             
             if (age < 60000 && acc < 100) {
                 bestPosition = {
                    coords: { 
                        latitude: cached.latitude, longitude: cached.longitude, accuracy: acc,
                        altitude: null, altitudeAccuracy: null, heading: null, speed: null 
                    },
                    timestamp: cached.timestamp
                 } as GeolocationPosition;
                 methodUsed = "Instant Cache";
             }
          }

          // CHIẾN LƯỢC 2: QUÉT WIFI/NETWORK (FAST SCAN)
          if (!bestPosition) {
              setGpsStep("Đang quét Wifi/4G...");
              setMessage("Tìm vị trí qua sóng Wifi (Nhanh)...");
              const networkPos = await getPosition(false, 4000, 60000).catch(() => null);
              
              if (networkPos && networkPos.coords.accuracy <= 150) {
                   bestPosition = networkPos;
                   methodUsed = "Wifi/Network";
              } else {
                   // CHIẾN LƯỢC 3: QUÉT VỆ TINH (PRECISION GPS)
                   setGpsStep("Đang bật GPS Vệ tinh...");
                   setMessage("Wifi yếu. Đang kết nối vệ tinh (Chính xác)...");
                   const gpsPos = await getPosition(true, 10000, 0).catch(() => null);
                   
                   if (gpsPos) {
                       bestPosition = gpsPos;
                       methodUsed = "GPS Satellite";
                   } else if (networkPos) {
                       bestPosition = networkPos;
                       methodUsed = "Wifi (Fallback)";
                   } else if (lastKnownPosRef.current) {
                       const cached = lastKnownPosRef.current;
                       bestPosition = {
                            coords: { 
                                latitude: cached.latitude, longitude: cached.longitude, accuracy: cached.accuracy || 100,
                                altitude: null, altitudeAccuracy: null, heading: null, speed: null 
                            },
                            timestamp: cached.timestamp
                       } as GeolocationPosition;
                       methodUsed = "Old Cache";
                   }
              }
          }

          if (!bestPosition) {
              throw new Error("Không thể định vị. Vui lòng di chuyển ra vùng thoáng.");
          }

          const { latitude, longitude, accuracy } = bestPosition.coords;
          
          if (accuracy > 250) {
              setMessage(`Tín hiệu quá yếu (Sai số ${Math.round(accuracy)}m). Hệ thống yêu cầu < 250m.`);
              setLocationStatus('INVALID');
              return;
          }

          const dist = calculateDistance(latitude, longitude, settings.location.latitude, settings.location.longitude);
          
          if (dist <= settings.location.radiusMeters) {
              if (methodUsed === "Instant Cache") await new Promise(r => setTimeout(r, 600)); // Fake delay for UX
              const methodStr = `${methodUsed} (±${Math.round(accuracy)}m)`;
              processAttendance(currentUser.id, methodStr);
              setLocationStatus('VALID');
          } else {
              setMessage(`Bạn đang ở cách quán ${Math.round(dist)}m. (Cho phép ${settings.location.radiusMeters}m)`);
              setLocationStatus('INVALID');
          }

      } catch (error: any) {
          console.error("Check-in Error:", error);
          setMessage(error.message || "Lỗi định vị không xác định.");
          setLocationStatus('ERROR');
      } finally {
          setIsSampling(false);
          setGpsStep("");
      }
  };

  // 8. VOICE CHECK-IN HANDLERS
  const generateChallenge = () => {
      const fruits = ['Cam', 'Táo', 'Xoài', 'Dứa', 'Bưởi', 'Nho', 'Mận'];
      const num = Math.floor(Math.random() * 9000) + 1000;
      const randFruit = fruits[Math.floor(Math.random() * fruits.length)];
      return `${randFruit} ${num}`;
  };

  const startVoiceRecording = async () => {
      if (!currentUser) { alert("Vui lòng đăng nhập."); return; }
      
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };

          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                  const base64Audio = reader.result as string;
                  setStep('VERIFYING');
                  
                  // Call Gemini
                  const employeeNames = employees.map(e => e.name);
                  const result = await analyzeVoiceCheckIn(base64Audio, challengePhrase, employeeNames);
                  
                  if (result.success) {
                       // Check name match if detected
                       if (result.detectedName && !result.detectedName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ').pop()!.toLowerCase())) {
                           setMessage(`Giọng nói không khớp tên tài khoản (${result.detectedName}).`);
                           setStep('ERROR');
                       } else {
                           processAttendance(currentUser.id, 'Voice AI');
                       }
                  } else {
                       setMessage(result.message);
                       setStep('ERROR');
                  }
              };
              
              // Stop tracks
              stream.getTracks().forEach(t => t.stop());
          };

          mediaRecorderRef.current.start();
          setIsRecording(true);
      } catch (e) {
          console.error(e);
          setMessage("Không thể truy cập Micro.");
          setStep('ERROR');
      }
  };

  const stopVoiceRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const initVoiceMode = () => {
      setAttendanceMode('VOICE');
      setChallengePhrase(generateChallenge());
      setStep('IDLE');
      setMessage("");
  }

  const handleReset = () => {
    setStep('IDLE');
    setAttendanceResult(null);
    setMessage("");
    setLocationStatus('CHECKING');
    setIsSampling(false);
    setAttendanceMode('SELECT');
    stopCamera();
  };

  // --- SUB-COMPONENTS FOR UI ---

  const MethodCard = ({ icon: Icon, title, desc, colorClass, onClick, badge }: any) => (
      <button 
        onClick={onClick}
        className="relative overflow-hidden group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left w-full active:scale-[0.98]"
      >
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.text}`}>
              <Icon size={80} />
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${colorClass.bg} ${colorClass.text}`}>
              <Icon size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{title}</h3>
          <p className="text-sm text-gray-500 mt-1 pr-8">{desc}</p>
          {badge && (
              <span className="absolute top-4 right-4 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  {badge}
              </span>
          )}
      </button>
  );

  // UI RENDER
  if (step === 'SUCCESS' && attendanceResult) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[450px] text-center space-y-6 animate-in zoom-in duration-500">
              <div className="relative">
                  <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white mb-2 shadow-xl relative z-10 transform transition-transform hover:scale-110">
                      <CheckCircle size={56} className="animate-in fade-in duration-1000" />
                  </div>
              </div>
              
              <div>
                  <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Thành công!</h2>
                  <p className="text-gray-500 font-medium">Bạn đã chấm công hoàn tất.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-100 w-full max-w-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-teal-500"></div>
                  <div className="flex justify-between border-b border-gray-100 pb-3 mb-3">
                      <span className="text-gray-500 text-sm">Nhân viên</span>
                      <span className="font-bold text-gray-900">{attendanceResult.employeeName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-3 mb-3">
                      <span className="text-gray-500 text-sm">Trạng thái</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-sm ${attendanceResult.type === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {attendanceResult.type === 'CHECK_IN' ? 'Vào ca' : 'Tan ca'}
                      </span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Thời gian</span>
                      <span className="font-mono font-bold text-2xl text-gray-800 tracking-tight">{attendanceResult.time}</span>
                  </div>
                  {attendanceResult.shiftCode && (
                       <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-4">
                          <span className="text-gray-500 text-xs font-bold uppercase">Ca làm việc</span>
                          <span className="font-bold text-sm text-teal-700">{attendanceResult.shiftCode}</span>
                       </div>
                  )}
              </div>
              
              <button 
                onClick={handleReset}
                className="group relative bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg flex items-center overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-white/10 group-hover:scale-105 transition-transform"></div>
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform"/> Quay về trang chủ
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        {attendanceMode !== 'SELECT' && (
            <button onClick={handleReset} className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all bg-gray-100 text-gray-600">
                <ArrowLeft size={24} />
            </button>
        )}
        <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {attendanceMode === 'SELECT' ? 'Phương Thức Chấm Công' : 
                 attendanceMode === 'FACE' ? 'Xác thực Khuôn mặt' : 
                 attendanceMode === 'GPS' ? 'Định vị Thông minh' : 
                 attendanceMode === 'SCAN_QR' ? 'Quét QR Trạm' : 'Xác thực Giọng nói'}
            </h2>
            <p className="text-gray-500 text-sm">
                {attendanceMode === 'SELECT' ? 'Chọn phương thức phù hợp với vị trí của bạn.' : 
                 attendanceMode === 'FACE' ? 'Giữ khuôn mặt trong khung hình.' : 
                 attendanceMode === 'SCAN_QR' ? 'Quét mã QR tại quầy thu ngân.' :
                 attendanceMode === 'GPS' ? 'Hệ thống sẽ tự động tối ưu Wifi & GPS.' : 'Đọc mã xác thực to và rõ ràng.'}
            </p>
        </div>
      </div>

      {attendanceMode === 'SELECT' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MethodCard 
                title="Quét Mã QR" 
                desc="Chính xác tuyệt đối. Dùng khi ở tại quầy."
                icon={QrCode}
                colorClass={{ bg: 'bg-teal-50', text: 'text-teal-600' }}
                onClick={() => { setAttendanceMode('SCAN_QR'); startCamera('environment'); }}
                badge="Khuyên dùng"
            />
            <MethodCard 
                title="Hybrid GPS" 
                desc="Định vị Wifi/Vệ tinh. Dùng khi ở trong bếp/kho."
                icon={MapPin}
                colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
                onClick={() => setAttendanceMode('GPS')}
            />
            <MethodCard 
                title="Face ID (AI)" 
                desc="Nhanh chóng & không cần chạm."
                icon={ScanLine}
                colorClass={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
                onClick={() => { setAttendanceMode('FACE'); startCamera('user'); }}
            />
            <MethodCard 
                title="Giọng Nói AI" 
                desc="Dùng khi tay bẩn hoặc đang bận bê đồ."
                icon={Mic}
                colorClass={{ bg: 'bg-purple-50', text: 'text-purple-600' }}
                onClick={initVoiceMode}
            />
        </div>
      )}

      {/* QR SCANNER UI */}
      {attendanceMode === 'SCAN_QR' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border-4 border-teal-500 shadow-2xl">
                  {/* VIDEO for Preview */}
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  ></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>

                  {/* SCANNING LASER EFFECT */}
                  <div className="absolute inset-0 pointer-events-none">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent absolute top-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(45,212,191,0.8)]"></div>
                  </div>

                  {/* CORNERS */}
                  <div className="absolute inset-0 p-8 pointer-events-none">
                      <div className="w-full h-full border-2 border-white/20 relative rounded-lg">
                           <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-xl"></div>
                           <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-xl"></div>
                           <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-xl"></div>
                           <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-xl"></div>
                      </div>
                  </div>

                  <div className="absolute bottom-6 w-full text-center">
                      <span className="inline-block bg-black/60 backdrop-blur-md text-white font-bold text-sm px-4 py-2 rounded-full border border-white/10">
                         Di chuyển mã QR vào khung hình
                      </span>
                  </div>
              </div>
          </div>
      )}

      {attendanceMode === 'FACE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden border-4 border-gray-800 shadow-2xl">
                  {step === 'STARTING_CAMERA' && (
                      <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900">
                          <Loader2 size={40} className="animate-spin text-indigo-500" />
                      </div>
                  )}
                  
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-cover transform scale-x-[-1] ${flash ? 'opacity-50' : 'opacity-100'} transition-opacity duration-100`}
                  ></video>
                  
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-80 border-2 border-white/30 rounded-[40%] relative">
                          {/* Scanning Bar */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-[scan_3s_linear_infinite]"></div>
                      </div>
                  </div>

                  <div className="absolute bottom-8 left-0 w-full flex justify-center z-10">
                      <button 
                        onClick={handleFaceCapture}
                        disabled={step === 'VERIFYING'}
                        className="w-20 h-20 bg-white rounded-full border-4 border-indigo-500 flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50 disabled:scale-100 hover:scale-105"
                      >
                          {step === 'VERIFYING' ? <Loader2 className="animate-spin text-indigo-600" size={32}/> : <Camera size={32} className="text-indigo-600"/>}
                      </button>
                  </div>
              </div>

              {step === 'ERROR' && message && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center shadow-sm animate-in slide-in-from-bottom border border-red-100">
                      <AlertTriangle className="shrink-0 mr-3" size={20} />
                      <p className="font-medium text-sm">{message}</p>
                  </div>
              )}
          </div>
      )}

      {attendanceMode === 'VOICE' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 text-center animate-in fade-in slide-in-from-bottom-4">
              <div>
                  <h3 className="text-lg font-bold text-gray-900">Mã kiểm tra (Challenge)</h3>
                  <p className="text-gray-500 text-sm mb-6">Hãy bấm nút Mic và đọc to cụm từ sau:</p>
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-200 rounded-full blur-2xl opacity-50"></div>
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 tracking-wide relative z-10">
                          {challengePhrase}
                      </span>
                  </div>
              </div>
              
              <div className="flex justify-center relative">
                  {/* Waveform Animation Background */}
                  {isRecording && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="w-32 h-32 bg-purple-100 rounded-full animate-ping opacity-75"></div>
                           <div className="w-48 h-48 bg-purple-50 rounded-full animate-ping opacity-50 animation-delay-500 absolute"></div>
                      </div>
                  )}

                  <button
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      disabled={step === 'VERIFYING'}
                      className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                          step === 'VERIFYING' ? 'bg-gray-100 cursor-wait' :
                          isRecording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200 hover:shadow-2xl hover:-translate-y-1'
                      }`}
                  >
                      {step === 'VERIFYING' ? (
                          <Loader2 size={32} className="animate-spin text-gray-400" />
                      ) : isRecording ? (
                          <StopCircle size={40} className="text-white" />
                      ) : (
                          <Mic size={40} className="text-white" />
                      )}
                  </button>
              </div>

              <div>
                  <p className="text-sm font-bold text-gray-600">
                      {step === 'VERIFYING' ? "AI đang phân tích..." : 
                       isRecording ? "Đang ghi âm..." : "Bấm để bắt đầu"}
                  </p>
                  {isRecording && (
                      <div className="flex items-center justify-center gap-1 mt-3 h-6">
                          {[1,2,3,4,5,6,7].map(i => (
                              <div key={i} className="w-1.5 bg-gradient-to-t from-purple-400 to-indigo-400 rounded-full animate-[bounce_0.8s_infinite]" style={{ height: Math.random() * 20 + 8, animationDelay: `${i * 0.1}s` }}></div>
                          ))}
                      </div>
                  )}
              </div>

              {step === 'ERROR' && message && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start animate-in slide-in-from-bottom border border-red-100 text-left">
                      <AlertTriangle className="shrink-0 mr-3 mt-0.5" size={20} />
                      <p className="font-medium text-sm">{message}</p>
                  </div>
              )}
          </div>
      )}

      {attendanceMode === 'GPS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col items-center justify-center py-6">
                  {isSampling ? (
                      // RADAR SCANNING ANIMATION
                      <div className="relative w-48 h-48 flex items-center justify-center mb-4">
                          <div className="absolute inset-0 border border-teal-100 rounded-full animate-[ping_2s_linear_infinite] opacity-50"></div>
                          <div className="absolute inset-4 border border-teal-200 rounded-full animate-[ping_2s_linear_infinite_0.5s] opacity-50"></div>
                          <div className="absolute inset-8 border border-teal-300 rounded-full animate-[ping_2s_linear_infinite_1s] opacity-50"></div>
                          
                          {/* Rotating Scanner */}
                          <div className="absolute inset-0 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin"></div>
                          
                          <div className="bg-white p-4 rounded-full shadow-lg z-10">
                             <Satellite size={40} className="text-teal-600 animate-pulse"/>
                          </div>
                      </div>
                  ) : (
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-500 shadow-xl ${
                          locationStatus === 'VALID' ? 'bg-green-100 text-green-600 shadow-green-200' :
                          locationStatus === 'INVALID' ? 'bg-red-100 text-red-500 shadow-red-200' :
                          locationStatus === 'ERROR' ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-500 shadow-blue-200'
                      }`}>
                          {locationStatus === 'VALID' ? <CheckCircle size={56} className="animate-in zoom-in" /> :
                           locationStatus === 'INVALID' ? <AlertTriangle size={56} className="animate-in zoom-in"/> :
                           locationStatus === 'ERROR' ? <Wifi size={56} /> : <Zap size={56} className="animate-pulse"/>}
                      </div>
                  )}

                  <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold text-gray-900">
                          {isSampling ? gpsStep || "Đang quét..." : 
                           locationStatus === 'VALID' ? "Vị trí hợp lệ" :
                           locationStatus === 'INVALID' ? "Ngoài phạm vi" : "Sẵn sàng"}
                      </h3>
                      
                      <p className={`text-sm max-w-xs mx-auto ${locationStatus === 'ERROR' || locationStatus === 'INVALID' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                          {message || (isSampling ? "Hệ thống đang định vị..." : "Bấm nút bên dưới để bắt đầu.")}
                      </p>
                  </div>
              </div>

              {!isSampling && (
                  <button 
                    onClick={startAdaptiveCheckIn}
                    disabled={locationStatus === 'ERROR' && !lastKnownPosRef.current}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all active:scale-95 group ${
                        (locationStatus === 'ERROR' && !lastKnownPosRef.current)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200'
                    }`}
                  >
                    <Smartphone size={20} className="mr-2 group-hover:animate-bounce"/> Bắt đầu Chấm Công
                  </button>
              )}
              
              {isSampling && (
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full animate-progress-indeterminate"></div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
