
import React, { useState, useRef, useMemo } from 'react';
import { CheckSquare, Plus, Camera, X, Award, User, Clock, CheckCircle2, AlertTriangle, Filter, Trophy, Zap, Image as ImageIcon, Trash2, ArrowRight, Rocket, Scroll, Shield, Star, Ban, Users, UserPlus, BookOpen, Edit2, Settings, Briefcase, Target, ClipboardList, Lock, Eye, Crown } from 'lucide-react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Task, TaskType, TaskStatus, EmployeeRole } from '../types';

interface QuestTemplate {
    id: string;
    title: string;
    type: 'OPENING' | 'CLOSING';
    difficulty: 1 | 2 | 3;
    isParty: boolean;
    maxParticipants: number;
    requiredShifts: string[]; // Shift Codes e.g., ['CA_B1', 'CA_B2']
}

// Default Templates
const INITIAL_TEMPLATES: QuestTemplate[] = [
    { id: 't1', title: 'Kiểm tra điện/nước toàn quán', type: 'OPENING', difficulty: 2, isParty: false, maxParticipants: 1, requiredShifts: [] },
    { id: 't2', title: 'Set up 20 bộ bát đũa Khu A', type: 'OPENING', difficulty: 1, isParty: false, maxParticipants: 1, requiredShifts: [] },
    { id: 't3', title: 'Tổng vệ sinh khu vực Bếp', type: 'OPENING', difficulty: 3, isParty: true, maxParticipants: 3, requiredShifts: [] },
    { id: 't4', title: 'Vệ sinh bẫy mỡ (Grease Trap)', type: 'CLOSING', difficulty: 3, isParty: true, maxParticipants: 2, requiredShifts: [] },
    { id: 't5', title: 'Lau dọn 10 bàn khu B', type: 'CLOSING', difficulty: 2, isParty: false, maxParticipants: 1, requiredShifts: [] },
    { id: 't6', title: 'Khóa cửa kho & tủ rượu (Quản lý)', type: 'CLOSING', difficulty: 2, isParty: false, maxParticipants: 1, requiredShifts: ['CA_B1', 'CA_B2'] },
];

export const TaskView: React.FC = () => {
    const { tasks, addTask, claimTask, submitTaskProof, verifyTask, rejectTask, deleteTask, employees, currentUser, schedules, settings } = useGlobalContext();
    const [activeTab, setActiveTab] = useState<'QUEST_BOARD' | 'ACTIVE_QUEST' | 'GUILD_MASTER' | 'LEADERBOARD'>('QUEST_BOARD');
    
    // Manage State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false); // Template Manager
    
    // Create Task Form
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskType, setNewTaskType] = useState<TaskType>(TaskType.ADHOC);
    const [newTaskDifficulty, setNewTaskDifficulty] = useState<1 | 2 | 3>(1);
    const [newTaskIsParty, setNewTaskIsParty] = useState(false);
    const [newTaskMaxParticipants, setNewTaskMaxParticipants] = useState(2);
    
    // Party Claiming State
    const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const [selectedTeammates, setSelectedTeammates] = useState<string[]>([]);

    // Reject Form
    const [rejectTaskId, setRejectTaskId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [penaltyXP, setPenaltyXP] = useState(0);

    // Photo Proof State
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Templates State
    const [templates, setTemplates] = useState<QuestTemplate[]>(INITIAL_TEMPLATES);
    const [editingTemplate, setEditingTemplate] = useState<QuestTemplate | null>(null);

    const isAdmin = currentUser?.role === EmployeeRole.MANAGER || currentUser?.role === EmployeeRole.DEV || currentUser?.role === EmployeeRole.DEPARTMENT_HEAD;

    // --- LOGIC ---
    
    // Has Active Quest? (Check assignee or participant)
    const myActiveQuest = tasks.find(t => 
        (t.assigneeId === currentUser?.id || t.participants?.includes(currentUser?.id || '')) && 
        (t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.COMPLETED)
    );

    // UPDATED: Filter logic to show ALL relevant tasks (Open, In Progress, Completed) on board
    const boardQuests = tasks.filter(t => 
        t.status === TaskStatus.OPEN || 
        t.status === TaskStatus.IN_PROGRESS || 
        t.status === TaskStatus.COMPLETED
    ).sort((a, b) => {
        // Sort Priority: OPEN -> IN_PROGRESS -> COMPLETED
        const statusScore = (s: string) => {
            if (s === TaskStatus.OPEN) return 3;
            if (s === TaskStatus.IN_PROGRESS) return 2;
            if (s === TaskStatus.COMPLETED) return 1;
            return 0;
        };
        const scoreA = statusScore(a.status);
        const scoreB = statusScore(b.status);
        
        if (scoreA !== scoreB) return scoreB - scoreA;

        // Then by difficulty (High to Low)
        if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
        
        // Then by time
        return b.createdAt.localeCompare(a.createdAt);
    });

    const pendingReviewQuests = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    
    const leaderboard = useMemo(() => {
        return [...employees].sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }, [employees]);

    // Available Teammates (Exclude self and those who are busy - optional check)
    const availableTeammates = employees.filter(e => e.id !== currentUser?.id);

    // XP Calculation Helper
    const calculateXP = (diff: number) => {
        switch(diff) {
            case 1: return 15;
            case 2: return 30;
            case 3: return 50;
            default: return 10;
        }
    }

    // Helper: Calculate XP required for next level
    // Inverse Formula: XP = 50 * (Level - 1)^2
    // XP for Level L: 50 * (L-1)^2. XP for Level L+1: 50 * L^2.
    const getLevelRange = (level: number) => {
        const startXP = 50 * Math.pow(level - 1, 2);
        const endXP = 50 * Math.pow(level, 2);
        return { startXP, endXP };
    };

    // --- ACTIONS ---

    const handleCreateTask = () => {
        if (!newTaskTitle || !currentUser) return;
        
        const xp = calculateXP(newTaskDifficulty);
        const newTask: Task = {
            id: Date.now().toString(),
            title: newTaskTitle,
            description: newTaskDesc,
            creatorId: currentUser.id,
            type: newTaskType,
            status: TaskStatus.OPEN,
            difficulty: newTaskDifficulty,
            xpReward: xp,
            maxParticipants: newTaskIsParty ? newTaskMaxParticipants : 1,
            participants: [],
            createdAt: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}),
            requiredShifts: [] // Custom task defaults to no restriction
        };
        addTask(newTask);
        setIsCreateModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskIsParty(false);
    };

    const initiateClaim = (task: Task) => {
        if (!currentUser) return;

        // 1. Check if user already has an active quest
        if (myActiveQuest) {
            alert("Bạn đang có công việc chưa hoàn thành! Hãy làm xong trước.");
            return;
        }

        // 2. CHECK SHIFT RESTRICTION
        if (task.requiredShifts && task.requiredShifts.length > 0) {
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
            const mySchedule = schedules.find(s => s.employeeId === currentUser.id && s.date === todayStr);
            
            // Allow if Dev or Manager
            const isBypass = currentUser.role === EmployeeRole.DEV || currentUser.role === EmployeeRole.MANAGER;

            if (!isBypass) {
                if (!mySchedule) {
                    alert(`Công việc này yêu cầu ca: ${task.requiredShifts.join(', ')}. Bạn chưa có lịch hôm nay.`);
                    return;
                }
                if (!task.requiredShifts.includes(mySchedule.shiftCode)) {
                    alert(`Công việc này CHỈ dành cho nhân viên ca: ${task.requiredShifts.join(', ')}. Bạn đang làm ca: ${mySchedule.shiftCode}.`);
                    return;
                }
            }
        }

        if (task.maxParticipants && task.maxParticipants > 1) {
            // Open Party Selection Modal
            setSelectedQuestId(task.id);
            setSelectedTeammates([]);
            setIsPartyModalOpen(true);
        } else {
            // Solo Claim
            claimTask(task.id, currentUser.id, []);
            setActiveTab('ACTIVE_QUEST');
        }
    };

    const confirmPartyClaim = () => {
        if (currentUser && selectedQuestId) {
            claimTask(selectedQuestId, currentUser.id, selectedTeammates);
            setIsPartyModalOpen(false);
            setSelectedQuestId(null);
            setActiveTab('ACTIVE_QUEST');
        }
    };

    const toggleTeammate = (id: string) => {
        const quest = tasks.find(t => t.id === selectedQuestId);
        const max = (quest?.maxParticipants || 2) - 1; // Minus leader

        if (selectedTeammates.includes(id)) {
            setSelectedTeammates(prev => prev.filter(t => t !== id));
        } else {
            if (selectedTeammates.length < max) {
                setSelectedTeammates(prev => [...prev, id]);
            } else {
                alert(`Nhóm này chỉ tối đa ${quest?.maxParticipants} người (bao gồm bạn).`);
            }
        }
    };

    const handleOpenRejectModal = (taskId: string) => {
        setRejectTaskId(taskId);
        setRejectReason('');
        setPenaltyXP(10); // Default penalty
        setIsRejectModalOpen(true);
    };

    const confirmRejectTask = () => {
        if (rejectTaskId) {
            rejectTask(rejectTaskId, rejectReason, penaltyXP);
            setIsRejectModalOpen(false);
            setRejectTaskId(null);
        }
    };

    const handleQuickGenerate = (type: 'OPENING' | 'CLOSING') => {
        if (!currentUser) return;
        
        // Use templates instead of hardcoded
        const tasksToAdd = templates.filter(t => t.type === type);

        tasksToAdd.forEach(t => {
            addTask({
                id: Date.now().toString() + Math.random(),
                title: t.title,
                description: `Công việc định kỳ ${type === 'OPENING' ? 'Ca Sáng' : 'Ca Tối'}`,
                creatorId: currentUser.id,
                type: t.type === 'OPENING' ? TaskType.OPENING : TaskType.CLOSING,
                status: TaskStatus.OPEN,
                difficulty: t.difficulty,
                xpReward: calculateXP(t.difficulty),
                maxParticipants: t.isParty ? t.maxParticipants : 1,
                participants: [],
                createdAt: new Date().toLocaleTimeString('vi-VN'),
                requiredShifts: t.requiredShifts
            });
        });
        alert(`Đã giao ${tasksToAdd.length} công việc ${type === 'OPENING' ? 'Sáng' : 'Tối'}!`);
    };

    // --- TEMPLATE MANAGER LOGIC ---
    const handleAddTemplate = () => {
        const newTemplate: QuestTemplate = {
            id: Date.now().toString(),
            title: 'Công việc mới',
            type: 'OPENING',
            difficulty: 1,
            isParty: false,
            maxParticipants: 1,
            requiredShifts: []
        };
        setTemplates([...templates, newTemplate]);
        setEditingTemplate(newTemplate);
    };

    const handleSaveTemplate = () => {
        if (editingTemplate) {
            setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
            setEditingTemplate(null);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        if (editingTemplate?.id === id) setEditingTemplate(null);
    };

    const toggleShiftRequirement = (shiftCode: string) => {
        if (!editingTemplate) return;
        const currentShifts = editingTemplate.requiredShifts || [];
        if (currentShifts.includes(shiftCode)) {
            setEditingTemplate({ ...editingTemplate, requiredShifts: currentShifts.filter(s => s !== shiftCode) });
        } else {
            setEditingTemplate({ ...editingTemplate, requiredShifts: [...currentShifts, shiftCode] });
        }
    };

    // --- CAMERA & PHOTO ---
    const startCamera = async (taskId: string) => {
        setSelectedTaskId(taskId);
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(s);
            setIsCameraOpen(true);
            setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
        } catch (e) { alert("Không thể mở camera"); }
    };

    const capturePhoto = () => {
        if (videoRef.current && selectedTaskId) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.6);
            submitTaskProof(selectedTaskId, base64);
            stopCamera();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) submitTaskProof(taskId, ev.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsCameraOpen(false);
        setSelectedTaskId(null);
    };

    const renderStars = (diff: number) => {
        return (
            <div className="flex gap-0.5">
                {[...Array(diff)].map((_, i) => <Star key={i} size={14} className="fill-yellow-400 text-yellow-500" />)}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-teal-800 to-teal-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-yellow-400">
                        <Rocket className="fill-yellow-400 text-yellow-500" /> Sảnh Thi Đua & KPI
                    </h2>
                    <p className="text-teal-100 text-sm mt-1">Hoàn thành công việc để tích lũy XP và thăng hạng nhân viên xuất sắc.</p>
                </div>
                <div className="flex gap-2 relative z-10 flex-wrap">
                    <button onClick={() => setActiveTab('QUEST_BOARD')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeTab === 'QUEST_BOARD' ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-transparent text-teal-100 border-teal-600 hover:bg-white/10'}`}>Bảng Nhiệm Vụ</button>
                    <button onClick={() => setActiveTab('ACTIVE_QUEST')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 ${activeTab === 'ACTIVE_QUEST' ? 'bg-blue-500 text-white border-blue-400' : 'bg-transparent text-teal-100 border-teal-600 hover:bg-white/10'}`}>
                        <Briefcase size={16}/> Việc Của Tôi {myActiveQuest && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    </button>
                    {isAdmin && <button onClick={() => setActiveTab('GUILD_MASTER')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeTab === 'GUILD_MASTER' ? 'bg-purple-600 text-white border-purple-500' : 'bg-transparent text-teal-100 border-teal-600 hover:bg-white/10'}`}>Quản Lý</button>}
                    <button onClick={() => setActiveTab('LEADERBOARD')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 ${activeTab === 'LEADERBOARD' ? 'bg-orange-600 text-white border-orange-500' : 'bg-transparent text-teal-100 border-teal-600 hover:bg-white/10'}`}><Trophy size={16} /></button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                
                {/* --- QUEST BOARD TAB --- */}
                {activeTab === 'QUEST_BOARD' && (
                    <div className="space-y-4">
                        {boardQuests.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                                <ClipboardList size={48} className="text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Hiện tại chưa có nhiệm vụ nào.</p>
                                <p className="text-sm text-gray-400">Hãy đợi Quản lý giao việc nhé!</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {boardQuests.map(task => {
                                const isParty = task.maxParticipants && task.maxParticipants > 1;
                                const isOpen = task.status === TaskStatus.OPEN;
                                const isInProgress = task.status === TaskStatus.IN_PROGRESS;
                                
                                // Get Participants
                                let memberIds = [];
                                if (task.participants && task.participants.length > 0) {
                                    memberIds = task.participants;
                                } else if (task.assigneeId) {
                                    memberIds = [task.assigneeId];
                                }
                                
                                const teamMembers = memberIds.map(id => employees.find(e => e.id === id)).filter(Boolean);

                                return (
                                    <div key={task.id} className={`border-2 rounded-xl p-5 shadow-sm relative overflow-hidden group transition-all flex flex-col
                                        ${isOpen ? (isParty ? 'bg-indigo-50 border-indigo-200 hover:scale-[1.02]' : 'bg-[#f0fdfa] border-teal-200 hover:scale-[1.02]') 
                                        : isInProgress ? 'bg-gray-50 border-blue-200 opacity-90' 
                                        : 'bg-yellow-50 border-yellow-200 opacity-80'}`}>
                                        
                                        {/* Status Badge Overlays */}
                                        <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-50 z-0
                                            ${isOpen ? (isParty ? 'bg-indigo-200' : 'bg-teal-200') : isInProgress ? 'bg-blue-200' : 'bg-yellow-200'}">
                                        </div>

                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div className="flex gap-2 flex-wrap items-center">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border 
                                                    ${task.difficulty === 3 ? 'bg-red-100 text-red-700 border-red-200' : task.difficulty === 2 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                    Mức {task.difficulty}
                                                </span>
                                                {isParty && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border bg-purple-100 text-purple-700 border-purple-200 flex items-center"><Users size={10} className="mr-1"/> NHÓM ({task.maxParticipants})</span>}
                                                {task.requiredShifts && task.requiredShifts.length > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded border bg-gray-700 text-white border-gray-600 flex items-center">
                                                        <Shield size={10} className="mr-1"/> {task.requiredShifts.join('/')} ONLY
                                                    </span>
                                                )}
                                            </div>
                                            {renderStars(task.difficulty)}
                                        </div>

                                        <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${isOpen ? 'text-gray-900' : 'text-gray-600'}`}>{task.title}</h3>
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-3 italic">"{task.description || 'Không có mô tả.'}"</p>
                                        
                                        <div className={`mt-auto pt-4 border-t flex items-center justify-between ${isParty ? 'border-indigo-200' : 'border-teal-200'}`}>
                                            <div className="text-xs font-bold text-gray-500 flex items-center"><Clock size={12} className="mr-1"/> {task.createdAt}</div>
                                            <div className="font-black text-xl text-orange-600 drop-shadow-sm">+{task.xpReward} XP</div>
                                        </div>
                                        
                                        {/* ACTION AREA - DYNAMIC */}
                                        {isOpen ? (
                                            <button 
                                                onClick={() => initiateClaim(task)}
                                                disabled={!!myActiveQuest}
                                                className={`w-full mt-3 text-white py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors ${isParty ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-700 hover:bg-teal-600'}`}
                                            >
                                                {isParty ? <Users size={16} className="fill-white"/> : <Target size={16} className="text-white"/>} 
                                                {isParty ? 'Lập nhóm làm' : 'Nhận việc'}
                                            </button>
                                        ) : (
                                            <div className="mt-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Nhóm thực hiện</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${isInProgress ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {isInProgress ? 'Đang làm' : 'Chờ duyệt'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {teamMembers.map(member => {
                                                        const isLeader = member.id === task.assigneeId;
                                                        return (
                                                            <div key={member.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${isLeader ? 'bg-white border-indigo-300 shadow-sm' : 'bg-white/50 border-gray-200'}`}>
                                                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 overflow-hidden">
                                                                    {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover"/> : member.name.charAt(0)}
                                                                </div>
                                                                <span className={`text-xs font-bold ${isLeader ? 'text-indigo-700' : 'text-gray-700'}`}>{member.name}</span>
                                                                {isLeader && <Crown size={10} className="text-yellow-500 fill-yellow-500"/>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- ACTIVE QUEST TAB --- */}
                {activeTab === 'ACTIVE_QUEST' && (
                    <div className="max-w-2xl mx-auto">
                        {!myActiveQuest ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                                <Briefcase size={48} className="text-gray-300 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-gray-700">Bạn đang rảnh rỗi</h3>
                                <p className="text-gray-500 mb-6">Hãy sang "Bảng Nhiệm Vụ" để nhận việc mới!</p>
                                <button onClick={() => setActiveTab('QUEST_BOARD')} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700">Tìm việc ngay</button>
                                
                                <div className="mt-8 border-t pt-6">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Lịch sử từ chối gần đây</h4>
                                    {tasks.filter(t => (t.assigneeId === currentUser?.id || t.participants?.includes(currentUser?.id || '')) && t.status === TaskStatus.REJECTED).slice(0, 3).map(t => (
                                        <div key={t.id} className="bg-red-50 p-3 rounded-lg border border-red-100 text-left mb-2 flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-red-800 text-sm">{t.title}</div>
                                                <div className="text-xs text-red-600 mt-1">Lý do: {t.rejectionReason}</div>
                                            </div>
                                            <div className="font-bold text-red-600 text-sm">-{t.penaltyXp} XP</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                            {myActiveQuest.maxParticipants && myActiveQuest.maxParticipants > 1 ? 'Nhiệm vụ Nhóm' : 'Nhiệm vụ Cá nhân'}
                                        </span>
                                        {renderStars(myActiveQuest.difficulty)}
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">{myActiveQuest.title}</h2>
                                    <div className="flex items-center gap-4 text-sm opacity-90">
                                        <span className="flex items-center"><Clock size={14} className="mr-1"/> {myActiveQuest.createdAt}</span>
                                        <span className="font-bold text-yellow-300">Thưởng: {myActiveQuest.xpReward} XP / người</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-gray-600 italic mb-6 border-l-4 border-gray-200 pl-4">{myActiveQuest.description}</p>
                                    
                                    {/* PARTY MEMBERS DISPLAY */}
                                    {myActiveQuest.maxParticipants && myActiveQuest.maxParticipants > 1 && (
                                        <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center"><Users size={16} className="mr-1"/> Thành viên nhóm</h4>
                                            <div className="flex flex-wrap gap-2">
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm">
                                                    <span className="text-xs font-bold text-indigo-600 uppercase">Trưởng nhóm</span>
                                                    <span className="text-sm font-medium text-gray-800">{myActiveQuest.assigneeName}</span>
                                                </div>
                                                {myActiveQuest.participants?.filter(pId => pId !== myActiveQuest.assigneeId).map(pId => {
                                                    const pName = employees.find(e => e.id === pId)?.name || 'Unknown';
                                                    return (
                                                        <div key={pId} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200">
                                                            <User size={12} className="text-gray-400"/>
                                                            <span className="text-sm font-medium text-gray-700">{pName}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {myActiveQuest.status === TaskStatus.IN_PROGRESS && (
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><ImageIcon size={18}/> Báo cáo kết quả</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                                                    <ImageIcon size={24} className="mb-2"/>
                                                    <span className="text-sm font-bold">Tải ảnh lên</span>
                                                </button>
                                                <button onClick={() => startCamera(myActiveQuest.id)} className="h-32 bg-teal-50 border-2 border-teal-200 rounded-xl flex flex-col items-center justify-center text-teal-700 hover:bg-teal-100 transition-colors">
                                                    <Camera size={24} className="mb-2"/>
                                                    <span className="text-sm font-bold">Chụp ảnh</span>
                                                </button>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, myActiveQuest.id)} />
                                            </div>
                                        </div>
                                    )}

                                    {myActiveQuest.status === TaskStatus.COMPLETED && (
                                        <div className="text-center py-8">
                                            <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                                <Clock size={40} />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800">Đang chờ duyệt...</h3>
                                            <p className="text-gray-500 text-sm mt-2">Quản lý sẽ kiểm tra ảnh báo cáo của bạn.</p>
                                            {myActiveQuest.proofImage && (
                                                <img src={myActiveQuest.proofImage} alt="Proof" className="mt-4 rounded-lg border border-gray-200 max-h-48 mx-auto" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- GUILD MASTER TAB --- */}
                {activeTab === 'GUILD_MASTER' && (
                    <div className="space-y-6">
                        <div className="flex gap-3 overflow-x-auto pb-2 items-center">
                             <button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-teal-700 flex items-center shrink-0">
                                 <Plus size={18} className="mr-2"/> Giao việc mới
                             </button>
                             <div className="h-8 w-px bg-gray-300 mx-1"></div>
                             <button onClick={() => handleQuickGenerate('OPENING')} className="bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 shrink-0 text-sm">
                                 + Việc Ca Sáng
                             </button>
                             <button onClick={() => handleQuickGenerate('CLOSING')} className="bg-white border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-50 shrink-0 text-sm">
                                 + Việc Ca Tối
                             </button>
                             <button onClick={() => setIsTemplateModalOpen(true)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-bold hover:bg-gray-200 shrink-0 text-sm flex items-center ml-auto">
                                 <BookOpen size={16} className="mr-1"/> Thư viện Mẫu
                             </button>
                        </div>

                        {/* PENDING REVIEWS */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2"><CheckCircle2 className="text-yellow-500"/> Chờ duyệt ({pendingReviewQuests.length})</h3>
                            {pendingReviewQuests.length === 0 && <p className="text-gray-400 text-sm italic">Không có báo cáo nào cần duyệt.</p>}
                            {pendingReviewQuests.map(task => (
                                <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200 flex flex-col md:flex-row gap-4">
                                     {task.proofImage && (
                                         <div className="w-full md:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border shrink-0 cursor-pointer" onClick={() => window.open(task.proofImage)}>
                                             <img src={task.proofImage} className="w-full h-full object-cover" />
                                         </div>
                                     )}
                                     <div className="flex-1">
                                         <div className="flex justify-between items-start">
                                             <h4 className="font-bold text-gray-900 text-lg">{task.title}</h4>
                                             <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Mức {task.difficulty}</div>
                                         </div>
                                         <p className="text-sm text-gray-500 mb-2">Người nộp: <span className="font-bold text-gray-800">{task.assigneeName}</span></p>
                                         {task.participants && task.participants.length > 1 && (
                                             <div className="text-xs text-gray-500 mb-2 flex items-center">
                                                 <Users size={12} className="mr-1"/>
                                                 Cùng làm: {task.participants.filter(id => id !== task.assigneeId).map(id => employees.find(e => e.id === id)?.name).join(', ')}
                                             </div>
                                         )}
                                         <div className="flex gap-2 mt-4">
                                             <button onClick={() => handleOpenRejectModal(task.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-sm hover:bg-red-100 border border-red-200">Không đạt (Phạt)</button>
                                             <button onClick={() => verifyTask(task.id, currentUser?.id || 'admin')} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 shadow-md">Duyệt (+{task.xpReward} XP)</button>
                                         </div>
                                     </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* ACTIVE QUESTS LIST (Monitoring) */}
                        <div className="pt-6">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-4"><Zap className="text-blue-500"/> Đang thực hiện</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).map(task => (
                                    <div key={task.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-sm">{task.title}</div>
                                            <div className="text-xs text-gray-500">{task.assigneeName} {task.participants && task.participants.length > 1 ? `(+${task.participants.length - 1} người)` : ''}</div>
                                        </div>
                                        <div className="text-xs font-mono text-gray-400">{task.createdAt}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LEADERBOARD TAB --- */}
                {activeTab === 'LEADERBOARD' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        <div className="text-center py-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl text-white shadow-xl mb-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <Trophy size={64} className="mx-auto mb-2 text-white drop-shadow-md" />
                            <h3 className="text-3xl font-black uppercase tracking-wider">Bảng Vàng Thành Tích</h3>
                            <p className="font-medium opacity-90">Vinh danh nhân viên xuất sắc nhất</p>
                        </div>
                        
                        {leaderboard.map((emp, idx) => {
                            const level = emp.level || 1;
                            const { startXP, endXP } = getLevelRange(level);
                            const currentXP = emp.xp || 0;
                            // Calculate percentage progress for this level
                            // Progress = (Current - Start) / (End - Start)
                            let progress = 0;
                            if (endXP > startXP) {
                                progress = Math.min(100, Math.max(0, ((currentXP - startXP) / (endXP - startXP)) * 100));
                            } else {
                                progress = 0; // Level 1 start
                                if (level === 1) progress = Math.min(100, (currentXP / 50) * 100);
                            }

                            return (
                                <div key={emp.id} className={`flex flex-col p-4 rounded-2xl border-2 relative overflow-hidden transition-transform hover:scale-[1.02] ${idx === 0 ? 'bg-yellow-50 border-yellow-400 shadow-md' : idx === 1 ? 'bg-gray-50 border-gray-300' : idx === 2 ? 'bg-orange-50 border-orange-300' : 'bg-white border-transparent'}`}>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-8 h-8 flex items-center justify-center font-black text-lg rounded-full ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'text-gray-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm shrink-0">
                                            {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{emp.name.charAt(0)}</div>}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 text-lg">{emp.name}</h4>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded">LV.{level}</span>
                                                <span>{emp.role}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">{currentXP}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total XP</div>
                                        </div>
                                    </div>
                                    
                                    {/* XP Progress Bar */}
                                    <div className="mt-3 relative z-10">
                                        <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                                            <span>Level {level}</span>
                                            <span>Next: Level {level + 1} ({endXP - currentXP} XP left)</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-yellow-400' : 'bg-teal-500'}`} 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {idx === 0 && <Award className="absolute -top-4 -right-4 text-yellow-500 opacity-20 rotate-12" size={80} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* TEMPLATE MANAGER MODAL */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center"><BookOpen size={20} className="mr-2"/> Thư viện Công Việc Mẫu</h3>
                            <button onClick={() => { setIsTemplateModalOpen(false); setEditingTemplate(null); }}><X/></button>
                        </div>
                        
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: List */}
                            <div className="w-1/3 border-r overflow-y-auto p-2 bg-gray-50">
                                <button onClick={handleAddTemplate} className="w-full bg-teal-600 text-white py-2 rounded-lg font-bold text-sm mb-2 shadow-sm">+ Thêm mẫu mới</button>
                                {templates.map(t => (
                                    <div 
                                        key={t.id} 
                                        onClick={() => setEditingTemplate(t)}
                                        className={`p-3 rounded-lg border mb-2 cursor-pointer transition-colors ${editingTemplate?.id === t.id ? 'bg-white border-teal-500 shadow-md' : 'bg-white border-gray-200 hover:border-teal-300'}`}
                                    >
                                        <div className="font-bold text-sm text-gray-800 line-clamp-1">{t.title}</div>
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            <span className={`text-[10px] px-1.5 rounded ${t.type === 'OPENING' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{t.type}</span>
                                            <span className="text-[10px] px-1.5 rounded bg-orange-100 text-orange-700">Mức {t.difficulty}</span>
                                            {t.requiredShifts.length > 0 && <span className="text-[10px] px-1.5 rounded bg-gray-700 text-white flex items-center"><Shield size={8} className="mr-1"/> Restricted</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right: Edit Form */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                {editingTemplate ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-gray-700">Chi tiết công việc</h4>
                                            <button onClick={() => handleDeleteTemplate(editingTemplate.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Tên công việc</label>
                                            <input type="text" value={editingTemplate.title} onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})} className="w-full border p-2 rounded-lg text-sm font-bold"/>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Loại công việc</label>
                                                <select value={editingTemplate.type} onChange={(e) => setEditingTemplate({...editingTemplate, type: e.target.value as any})} className="w-full border p-2 rounded-lg text-sm">
                                                    <option value="OPENING">Ca Sáng (Opening)</option>
                                                    <option value="CLOSING">Ca Tối (Closing)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Mức độ</label>
                                                <select value={editingTemplate.difficulty} onChange={(e) => setEditingTemplate({...editingTemplate, difficulty: Number(e.target.value) as any})} className="w-full border p-2 rounded-lg text-sm">
                                                    <option value="1">1 Sao (Dễ)</option>
                                                    <option value="2">2 Sao (Vừa)</option>
                                                    <option value="3">3 Sao (Khó)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="font-bold text-sm text-gray-700">Chế độ Làm Nhóm (Party)</label>
                                                <input type="checkbox" checked={editingTemplate.isParty} onChange={(e) => setEditingTemplate({...editingTemplate, isParty: e.target.checked})} className="w-5 h-5 accent-teal-600"/>
                                            </div>
                                            {editingTemplate.isParty && (
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Số người tối đa</label>
                                                    <input type="number" min="2" max="10" value={editingTemplate.maxParticipants} onChange={(e) => setEditingTemplate({...editingTemplate, maxParticipants: Number(e.target.value)})} className="w-20 border p-1 rounded text-sm"/>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                            <h5 className="font-bold text-sm text-indigo-900 mb-2 flex items-center"><Shield size={16} className="mr-2"/> Yêu cầu Ca làm việc (Giới hạn)</h5>
                                            <p className="text-xs text-indigo-700 mb-3">Chỉ nhân viên làm các ca được chọn mới được nhận việc này. (Để trống = Ai cũng nhận được)</p>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {settings.shiftConfigs.map(shift => {
                                                    const isSelected = editingTemplate.requiredShifts.includes(shift.code);
                                                    return (
                                                        <button 
                                                            key={shift.code}
                                                            onClick={() => toggleShiftRequirement(shift.code)}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
                                                        >
                                                            {isSelected && <CheckCircle2 size={10} className="inline mr-1"/>}
                                                            {shift.name} ({shift.code})
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t flex justify-end">
                                            <button onClick={handleSaveTemplate} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-teal-700">Lưu thay đổi</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 italic">Chọn một mẫu để chỉnh sửa</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-[#f0fdfa] border-4 border-teal-200 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in duration-200 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500"><X/></button>
                        <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2"><ClipboardList size={24} className="text-teal-600"/> Giao Nhiệm Vụ Mới</h3>
                        
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-gray-600 mb-1">Tên công việc</label><input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full border-2 border-teal-100 rounded-lg p-3 bg-white font-bold text-gray-800" placeholder="VD: Dọn kho"/></div>
                            <div><label className="block text-sm font-bold text-gray-600 mb-1">Mô tả</label><textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="w-full border-2 border-teal-100 rounded-lg p-3 bg-white" rows={2}/></div>
                            
                            {/* Party Toggle */}
                            <div className="bg-white p-3 rounded-lg border-2 border-teal-100 flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-gray-700 block text-sm">Chế độ làm việc</span>
                                    <span className="text-xs text-gray-500">{newTaskIsParty ? 'Làm việc theo nhóm' : 'Làm việc cá nhân'}</span>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setNewTaskIsParty(false)} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${!newTaskIsParty ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>Cá nhân</button>
                                    <button onClick={() => setNewTaskIsParty(true)} className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${newTaskIsParty ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>Nhóm</button>
                                </div>
                            </div>

                            {newTaskIsParty && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Số lượng thành viên tối đa</label>
                                    <input type="number" min={2} max={10} value={newTaskMaxParticipants} onChange={(e) => setNewTaskMaxParticipants(Number(e.target.value))} className="w-full border-2 border-purple-200 rounded-lg p-3 bg-purple-50 font-bold text-purple-800" />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">Mức độ khó (Rank)</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((d) => (
                                        <button 
                                            key={d} 
                                            onClick={() => setNewTaskDifficulty(d as 1|2|3)}
                                            className={`flex-1 py-3 rounded-lg font-bold border-2 transition-all flex flex-col items-center justify-center ${newTaskDifficulty === d ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-gray-200 text-gray-400'}`}
                                        >
                                            <span className="text-lg">Mức {d}</span>
                                            {renderStars(d)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg text-center text-blue-800 font-bold border border-blue-200">
                                Phần thưởng: {calculateXP(newTaskDifficulty)} XP {newTaskIsParty ? '/ người' : ''}
                            </div>
                            <button onClick={handleCreateTask} className="w-full bg-teal-700 text-white py-3 rounded-xl font-bold hover:bg-teal-600 mt-2 shadow-lg">Giao Việc Ngay</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PARTY SELECTION MODAL */}
            {isPartyModalOpen && selectedQuestId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <h3 className="font-bold text-xl text-indigo-900 mb-2 flex items-center gap-2"><Users className="text-indigo-600"/> Chọn Đồng Đội</h3>
                        <p className="text-sm text-gray-500 mb-4">Chọn đồng đội để cùng làm công việc này. (Tối đa {tasks.find(t=>t.id===selectedQuestId)?.maxParticipants} người)</p>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                            {availableTeammates.map(emp => {
                                const isSelected = selectedTeammates.includes(emp.id);
                                return (
                                    <div 
                                        key={emp.id} 
                                        onClick={() => toggleTeammate(emp.id)}
                                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs">{emp.name.charAt(0)}</div>
                                        <div className="flex-1 font-bold text-gray-800">{emp.name}</div>
                                        {isSelected && <CheckCircle2 size={20} className="text-indigo-600"/>}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                            <button onClick={() => setIsPartyModalOpen(false)} className="flex-1 py-2 rounded-lg font-bold text-gray-500 bg-gray-100">Hủy</button>
                            <button 
                                onClick={confirmPartyClaim} 
                                disabled={selectedTeammates.length === 0}
                                className="flex-1 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Xác nhận ({selectedTeammates.length + 1})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT MODAL */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in duration-200 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                            <Ban size={32} />
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 mb-2">Từ chối kết quả</h3>
                        <p className="text-gray-500 text-sm mb-6">Công việc chưa đạt yêu cầu. Hãy nhập lý do và mức phạt XP.</p>
                        
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Lý do từ chối</label>
                                <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border rounded-lg p-2 text-sm" placeholder="VD: Chưa sạch, làm sai quy trình..."/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Trừ XP (Phạt)</label>
                                <input type="number" value={penaltyXP} onChange={(e) => setPenaltyXP(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm text-red-600 font-bold"/>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsRejectModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Hủy</button>
                            <button onClick={confirmRejectTask} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md">Xác nhận phạt</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CAMERA OVERLAY */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col">
                    <div className="flex-1 relative">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                            <div className="border-2 border-white/50 w-64 h-64 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="h-32 bg-black flex items-center justify-center gap-8">
                        <button onClick={stopCamera} className="text-white font-bold px-6 py-2 rounded-full bg-gray-800">Hủy</button>
                        <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 active:scale-95 transition-transform"></button>
                    </div>
                </div>
            )}
        </div>
    );
};
