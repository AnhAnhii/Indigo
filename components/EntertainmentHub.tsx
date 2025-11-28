
import React, { useState, useRef, useEffect } from 'react';
import { Gift, Zap, Camera, HelpCircle, X, ChevronRight, CheckCircle2, RefreshCw, Download, Sparkles } from 'lucide-react';
import { generateFunCaption } from '../services/geminiService';

// --- TRIVIA DATA ---
const TRIVIA_QUESTIONS = [
    {
        q: "Đỉnh núi nào được mệnh danh là 'Nóc nhà Đông Dương'?",
        a: ["Fansipan", "Hàm Rồng", "Ngũ Chỉ Sơn", "Bạch Mộc Lương Tử"],
        correct: 0
    },
    {
        q: "Món ăn nào là đặc sản nổi tiếng của người H'Mông tại Sapa?",
        a: ["Phở bò", "Thắng Cố", "Bún chả", "Cơm tấm"],
        correct: 1
    },
    {
        q: "Nhà thờ Đá Sapa được xây dựng vào khoảng thời gian nào?",
        a: ["Thế kỷ 18", "Đầu thế kỷ 20 (1895)", "Năm 1954", "Năm 2000"],
        correct: 1
    },
    {
        q: "Chợ tình Sapa thường diễn ra vào thứ mấy hàng tuần?",
        a: ["Thứ Hai", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"],
        correct: 2
    },
    {
        q: "Loại quả nào là đặc sản ngâm rượu nổi tiếng Tây Bắc?",
        a: ["Mận", "Táo Mèo", "Đào", "Lê"],
        correct: 1
    }
];

export const EntertainmentHub: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [mode, setMode] = useState<'MENU' | 'TRIVIA' | 'WHEEL' | 'PHOTO'>('MENU');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative min-h-[500px] flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors">
                    <X size={20} />
                </button>

                {mode === 'MENU' && <MenuScreen onSelect={setMode} />}
                {mode === 'TRIVIA' && <TriviaGame onBack={() => setMode('MENU')} />}
                {mode === 'WHEEL' && <LuckyWheel onBack={() => setMode('MENU')} />}
                {mode === 'PHOTO' && <PhotoBooth onBack={() => setMode('MENU')} />}
            </div>
        </div>
    );
};

const MenuScreen = ({ onSelect }: { onSelect: (m: any) => void }) => (
    <div className="flex flex-col h-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 items-center justify-center space-y-6 text-center">
        <div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">Giải Trí Tại Bàn</h2>
            <p className="text-indigo-200">Chơi game, nhận quà trong lúc chờ món!</p>
        </div>

        <button onClick={() => onSelect('TRIVIA')} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-2xl flex items-center gap-4 transition-transform hover:scale-105 group">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 shadow-lg group-hover:rotate-12 transition-transform">
                <HelpCircle size={28} strokeWidth={2.5}/>
            </div>
            <div className="text-left flex-1">
                <h3 className="font-bold text-lg">Thử tài Sapa</h3>
                <p className="text-xs text-indigo-200">Trả lời đúng nhận Voucher</p>
            </div>
            <ChevronRight className="opacity-50"/>
        </button>

        <button onClick={() => onSelect('WHEEL')} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-2xl flex items-center gap-4 transition-transform hover:scale-105 group">
            <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:rotate-180 transition-transform duration-500">
                <Zap size={28} strokeWidth={2.5} className="fill-yellow-300 text-yellow-300"/>
            </div>
            <div className="text-left flex-1">
                <h3 className="font-bold text-lg">Vòng Quay May Mắn</h3>
                <p className="text-xs text-indigo-200">Thử vận may giảm giá</p>
            </div>
            <ChevronRight className="opacity-50"/>
        </button>

        <button onClick={() => onSelect('PHOTO')} className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-2xl flex items-center gap-4 transition-transform hover:scale-105 group">
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Camera size={28} strokeWidth={2.5}/>
            </div>
            <div className="text-left flex-1">
                <h3 className="font-bold text-lg">AI Camera</h3>
                <p className="text-xs text-indigo-200">Check-in Khung hình Dân tộc</p>
            </div>
            <ChevronRight className="opacity-50"/>
        </button>
    </div>
);

const TriviaGame = ({ onBack }: { onBack: () => void }) => {
    const [qIndex, setQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedAns, setSelectedAns] = useState<number | null>(null);

    const handleAnswer = (idx: number) => {
        setSelectedAns(idx);
        const correct = idx === TRIVIA_QUESTIONS[qIndex].correct;
        if (correct) setScore(s => s + 1);
        
        setTimeout(() => {
            if (qIndex < TRIVIA_QUESTIONS.length - 1) {
                setQIndex(q => q + 1);
                setSelectedAns(null);
            } else {
                setShowResult(true);
            }
        }, 800);
    };

    if (showResult) {
        const isWin = score >= 3;
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="mb-6">
                    {isWin ? <Gift size={64} className="text-pink-500 mx-auto animate-bounce"/> : <Zap size={64} className="text-gray-400 mx-auto"/>}
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{isWin ? "Chúc mừng!" : "Tiếc quá!"}</h2>
                <p className="text-gray-600 mb-6">Bạn trả lời đúng <span className="font-bold text-indigo-600 text-xl">{score}/{TRIVIA_QUESTIONS.length}</span> câu.</p>
                {isWin ? (
                    <div className="bg-pink-50 border border-pink-200 p-4 rounded-xl mb-6">
                        <p className="text-xs text-pink-500 font-bold uppercase mb-1">Quà tặng của bạn</p>
                        <p className="text-lg font-bold text-pink-700">Miễn phí 1 Trà Thảo Mộc</p>
                        <p className="text-[10px] text-gray-500 mt-2">Đưa màn hình này cho nhân viên để nhận quà.</p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 mb-6">Hãy thử lại lần sau nhé!</p>
                )}
                <button onClick={onBack} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold w-full">Quay lại</button>
            </div>
        );
    }

    const q = TRIVIA_QUESTIONS[qIndex];

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b flex justify-between items-center">
                <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ChevronRight className="rotate-180"/></button>
                <span className="font-bold text-gray-800">Câu hỏi {qIndex + 1}/{TRIVIA_QUESTIONS.length}</span>
                <div className="w-6"></div>
            </div>
            <div className="flex-1 p-6 flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-800 mb-8 text-center">{q.q}</h3>
                <div className="space-y-3">
                    {q.a.map((ans, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            disabled={selectedAns !== null}
                            className={`w-full p-4 rounded-xl border-2 font-medium text-left transition-all ${
                                selectedAns === idx 
                                ? (idx === q.correct ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800')
                                : 'bg-white border-gray-200 hover:border-indigo-300 text-gray-700'
                            }`}
                        >
                            {ans}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LuckyWheel = ({ onBack }: { onBack: () => void }) => {
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [prize, setPrize] = useState<string | null>(null);

    const PRIZES = ['Giảm 5%', 'Chúc may mắn', 'Free Pepsi', 'Giảm 10%', 'Chúc may mắn', 'Free Tráng miệng'];
    const SEGMENT_ANGLE = 360 / PRIZES.length;

    const spin = () => {
        if (spinning || prize) return;
        setSpinning(true);
        
        const randomSpin = Math.floor(Math.random() * 360) + 1800; // At least 5 spins
        const finalRotation = rotation + randomSpin;
        setRotation(finalRotation);

        setTimeout(() => {
            setSpinning(false);
            const actualDeg = finalRotation % 360;
            // Calculate index. Note: Pointer is at top (270deg or -90deg logic depending on CSS)
            // Simplified logic: Just pick random for MVP visual
            const winningIndex = Math.floor(((360 - (actualDeg % 360)) % 360) / SEGMENT_ANGLE);
            setPrize(PRIZES[winningIndex] || 'Chúc may mắn');
        }, 4000);
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-purple-900 to-indigo-900 text-white relative overflow-hidden">
            <button onClick={onBack} className="absolute top-4 left-4 z-10 p-2 bg-white/20 rounded-full"><ChevronRight className="rotate-180"/></button>
            
            <div className="flex-1 flex flex-col items-center justify-center relative z-0">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-black text-yellow-400 drop-shadow-md">VÒNG QUAY</h2>
                    <p className="text-purple-200">Thử vận may - Nhận quà ngay</p>
                </div>

                {/* Wheel Container */}
                <div className="relative w-64 h-64">
                    {/* Pointer */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-8 h-8 bg-red-500 rotate-45 border-4 border-white shadow-md"></div>
                    
                    {/* The Wheel */}
                    <div 
                        className="w-full h-full rounded-full border-8 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.5)] overflow-hidden relative transition-transform cubic-bezier(0.1, 0.7, 0.1, 1)"
                        style={{ 
                            transform: `rotate(${rotation}deg)`,
                            transitionDuration: spinning ? '4s' : '0s',
                            background: 'conic-gradient(#ec4899 0deg 60deg, #8b5cf6 60deg 120deg, #3b82f6 120deg 180deg, #10b981 180deg 240deg, #f59e0b 240deg 300deg, #ef4444 300deg 360deg)'
                        }}
                    >
                        {/* Lines */}
                        {[0, 60, 120, 180, 240, 300].map(deg => (
                            <div key={deg} className="absolute w-full h-0.5 bg-white/50 top-1/2 left-0 -translate-y-1/2 origin-center" style={{transform: `rotate(${deg}deg)`}}></div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 h-20 flex items-center justify-center">
                    {prize ? (
                        <div className="text-center animate-in zoom-in">
                            <p className="text-yellow-300 font-bold text-xl uppercase mb-1">{prize}</p>
                            <p className="text-xs opacity-70">Chụp màn hình để đổi quà</p>
                        </div>
                    ) : (
                        <button 
                            onClick={spin}
                            disabled={spinning}
                            className="bg-yellow-400 text-yellow-900 px-10 py-3 rounded-full font-black text-xl shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                        >
                            {spinning ? 'Đang quay...' : 'QUAY NGAY'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const PhotoBooth = ({ onBack }: { onBack: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [step, setStep] = useState<'CAMERA' | 'PREVIEW'>('CAMERA');
    const [photo, setPhoto] = useState<string | null>(null);
    const [aiCaption, setAiCaption] = useState<string>('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    useEffect(() => {
        if (step === 'CAMERA') startCamera();
        return () => stopCamera();
    }, [step]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) { console.error(e); }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
    };

    const takePhoto = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 1. Draw Video
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0);
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset

                // 2. Add Overlay (Simulated via code for MVP)
                // Frame Border
                const frameColor = '#d97706'; // Amber-600
                ctx.lineWidth = 20;
                ctx.strokeStyle = frameColor;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
                
                // Text Overlay
                ctx.fillStyle = "white";
                ctx.font = "bold 30px sans-serif";
                ctx.shadowColor = "black";
                ctx.shadowBlur = 5;
                ctx.fillText("Indigo Sapa Check-in", 30, canvas.height - 40);

                const dataUrl = canvas.toDataURL('image/jpeg');
                setPhoto(dataUrl);
                setStep('PREVIEW');
                
                // Call AI
                setIsLoadingAi(true);
                const caption = await generateFunCaption(dataUrl);
                setAiCaption(caption);
                setIsLoadingAi(false);
            }
        }
    };

    const downloadPhoto = () => {
        if (photo) {
            const link = document.createElement('a');
            link.href = photo;
            link.download = `indigo_sapa_${Date.now()}.jpg`;
            link.click();
        }
    };

    return (
        <div className="h-full bg-black flex flex-col">
            <div className="absolute top-4 left-4 z-20">
                <button onClick={onBack} className="p-2 bg-black/40 text-white rounded-full"><ChevronRight className="rotate-180"/></button>
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                {step === 'CAMERA' && (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover"></video>
                        {/* Overlay Frame Guide */}
                        <div className="absolute inset-0 border-[20px] border-amber-500/50 pointer-events-none flex items-end p-4">
                            <p className="text-white/80 font-bold text-xl drop-shadow-md">Indigo Sapa</p>
                        </div>
                    </>
                )}
                {step === 'PREVIEW' && photo && (
                    <img src={photo} className="h-full w-full object-contain bg-gray-900" />
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            <div className="bg-white p-6 rounded-t-3xl z-10 min-h-[180px] flex flex-col items-center justify-center">
                {step === 'CAMERA' ? (
                    <button onClick={takePhoto} className="w-16 h-16 rounded-full border-4 border-teal-500 bg-white p-1">
                        <div className="w-full h-full bg-teal-500 rounded-full"></div>
                    </button>
                ) : (
                    <div className="w-full text-center">
                        {isLoadingAi ? (
                            <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium mb-4">
                                <Sparkles className="animate-spin" size={18}/> Đang xem tướng...
                            </div>
                        ) : (
                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-4 relative">
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-2 rounded-full">AI Phán</div>
                                <p className="text-indigo-900 font-medium italic">"{aiCaption}"</p>
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            <button onClick={() => setStep('CAMERA')} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2">
                                <RefreshCw size={18}/> Chụp lại
                            </button>
                            <button onClick={downloadPhoto} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md">
                                <Download size={18}/> Lưu ảnh
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
