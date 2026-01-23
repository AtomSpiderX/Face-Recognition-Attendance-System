
import React, { useState, useRef, useEffect } from 'react';
import { User, AttendanceRecord, PeriodTime, DayName } from '../types';
import Webcam from 'react-webcam';
import { db } from '../services/db';
import { CheckCircle2, XCircle, Clock, Scan, HelpCircle, Percent, AlertTriangle, Loader2, Calendar, History, Lock, Timer, Unlock, Send, MessageSquare, Info } from 'lucide-react';

interface StudentDashboardProps {
  user: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [failReason, setFailReason] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Record<number, string>>({});
  const [dayName, setDayName] = useState<string>('');
  
  // Support Modal State
  const [showSupport, setShowSupport] = useState(false);
  const [issueType, setIssueType] = useState<any>('OTHER');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSent, setIssueSent] = useState(false);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Time state
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);
  const [timeString, setTimeString] = useState<string>('');
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const loadData = async () => {
        const times = await db.getPeriodTimes();
        setPeriodTimes(times);
        
        const allRecords = await db.getAttendance();
        setAttendance(allRecords.filter(r => r.studentId === user.id));

        const masterSchedule = await db.getMasterSchedule();
        const userBatch = user.batch || 'A';
        
        const date = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[date.getDay()];
        setDayName(currentDay);
        
        const scheduleKey = currentDay as DayName;
        if (masterSchedule[userBatch] && masterSchedule[userBatch]![scheduleKey]) {
             setTodaySchedule(masterSchedule[userBatch]![scheduleKey]!);
        } else {
             setTodaySchedule({});
        }
    };
    loadData();

    const updateTime = () => {
        const now = new Date();
        setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
        setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000); 
    return () => clearInterval(interval);
  }, [user.id, user.batch]);

  useEffect(() => {
    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday'; 
    if (periodTimes.length === 0 || isWeekend) return;

    const today = new Date().toISOString().split('T')[0];
    let hasUpdates = false;

    periodTimes.forEach(period => {
        if (period.strict === false) return;
        const { end } = parsePeriodRange(period);
        if (currentTimeMinutes > end) {
            const existing = attendance.find(r => r.date === today && r.period === period.id);
            if (!existing) {
                const absentRecord: AttendanceRecord = {
                    id: `auto-${Date.now()}-${period.id}`,
                    studentId: user.id,
                    studentName: user.name,
                    date: today,
                    period: period.id,
                    status: 'ABSENT',
                    timestamp: new Date().toISOString()
                };
                db.markAttendance(absentRecord);
                hasUpdates = true;
            }
        }
    });

    if (hasUpdates) {
        db.getAttendance().then(res => setAttendance(res.filter(r => r.studentId === user.id)));
    }
  }, [currentTimeMinutes, periodTimes, attendance, dayName, user.id, user.name]);

  const handleSupportSubmit = async (e?: React.FormEvent, customType?: string, customDesc?: string) => {
    if (e) e.preventDefault();
    await db.addIssue({
        id: Date.now().toString(),
        studentId: user.id,
        studentName: user.name,
        type: (customType || issueType) as any,
        description: customDesc || issueDesc,
        status: 'PENDING',
        timestamp: new Date().toISOString()
    });
    setIssueSent(true);
    setTimeout(() => {
        setIssueSent(false);
        setShowSupport(false);
        setIssueDesc('');
        setIssueType('OTHER');
    }, 2000);
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const parsePeriodRange = (period: PeriodTime) => {
      return {
          start: parseTime(period.startTime),
          end: parseTime(period.endTime)
      };
  };

  const handlePeriodClick = (period: PeriodTime) => {
    if (period.strict !== false) {
        const { start, end } = parsePeriodRange(period);
        if (currentTimeMinutes < start) {
            alert(`Attendance window opens at ${period.startTime}`);
            return;
        }
        if (currentTimeMinutes > end) {
            alert("This period has ended.");
            return;
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const existing = attendance.find(r => r.date === today && r.period === period.id);
    
    if (existing) {
      alert("Attendance already recorded.");
      return;
    }

    setSelectedPeriod(period.id);
    setVerificationStatus('idle');
    setFailReason('');
  };

  const getGrayscale = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return gray;
  };

  const normalizeHistogram = (grayData: Uint8ClampedArray) => {
    let min = 255, max = 0;
    for (let i = 0; i < grayData.length; i++) {
      if (grayData[i] < min) min = grayData[i];
      if (grayData[i] > max) max = grayData[i];
    }
    if (max > min) {
      const range = max - min;
      for (let i = 0; i < grayData.length; i++) {
        grayData[i] = ((grayData[i] - min) * 255) / range;
      }
    }
    return grayData;
  };

  const compareFacesSmart = async (currentImageSrc: string, referenceImageSrc: string): Promise<{ match: boolean; score: number; reason?: string }> => {
    return new Promise((resolve) => {
      const img1 = new Image();
      const img2 = new Image();
      img1.crossOrigin = "Anonymous"; 
      img2.crossOrigin = "Anonymous";
      let loaded = 0;

      const runComparison = () => {
        const size = 150;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ match: false, score: 0, reason: "Error" });

        const processImage = (img: HTMLImageElement) => {
          ctx.clearRect(0, 0, size, size);
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          let gray = getGrayscale(ctx, size, size);
          return normalizeHistogram(gray);
        };

        const refData = processImage(img1);
        const currData = processImage(img2);

        let mean = 0;
        for(let i=0; i<currData.length; i++) mean += currData[i];
        mean /= currData.length;
        let variance = 0;
        for(let i=0; i<currData.length; i++) variance += Math.pow(currData[i] - mean, 2);
        variance /= currData.length;

        if (variance < 400) {
           resolve({ match: false, score: variance, reason: "Face Obstructed / Too Blurry" });
           return;
        }

        const gridSize = 5;
        const blockSize = size / gridSize;
        let totalDiff = 0;
        let maxBlockDiff = 0;
        let significantBlocks = 0;

        for (let gy = 0; gy < gridSize; gy++) {
          for (let gx = 0; gx < gridSize; gx++) {
            const isInnerFace = (gx >= 1 && gx <= 3) && (gy >= 1 && gy <= 3);
            let blockSum = 0;
            let pixelCount = 0;
            for (let y = 0; y < blockSize; y++) {
              for (let x = 0; x < blockSize; x++) {
                const idx = (gy * blockSize + y) * size + (gx * blockSize + x);
                blockSum += Math.abs(refData[idx] - currData[idx]);
                pixelCount++;
              }
            }
            const blockAvgDiff = blockSum / pixelCount;
            if (isInnerFace) {
               totalDiff += blockAvgDiff;
               significantBlocks++;
               if (blockAvgDiff > maxBlockDiff) maxBlockDiff = blockAvgDiff;
            }
          }
        }

        const averageDiff = totalDiff / significantBlocks;
        const AVG_THRESHOLD = 45; 
        const PEAK_THRESHOLD = 60;

        if (averageDiff < AVG_THRESHOLD && maxBlockDiff < PEAK_THRESHOLD) {
           resolve({ match: true, score: averageDiff });
        } else {
           resolve({ match: false, score: averageDiff, reason: "Identity Mismatch" });
        }
      };

      const handleError = () => resolve({ match: false, score: 0, reason: "Image Load Error" });
      img1.onload = () => { loaded++; if (loaded === 2) runComparison(); };
      img2.onload = () => { loaded++; if (loaded === 2) runComparison(); };
      img1.onerror = handleError;
      img2.onerror = handleError;
      img1.src = referenceImageSrc;
      img2.src = currentImageSrc;
    });
  };

  const startScan = async () => {
    if (!webcamRef.current) return;
    setScanning(true);
    setVerificationStatus('idle');
    setFailReason('');
    await new Promise(r => setTimeout(r, 800));

    try {
        const img = webcamRef.current.getScreenshot();
        if(img && user.referenceImage) {
            const result = await compareFacesSmart(img, user.referenceImage);
            if (result.match && selectedPeriod) {
                setVerificationStatus('success');
                const today = new Date().toISOString().split('T')[0];
                const record: AttendanceRecord = {
                    id: `${user.id}-${Date.now()}`,
                    studentId: user.id,
                    studentName: user.name,
                    date: today,
                    period: selectedPeriod,
                    status: 'PRESENT',
                    timestamp: new Date().toISOString()
                };
                await db.markAttendance(record);
                setAttendance(prev => [...prev, record]);
                setTimeout(() => {
                    setScanning(false);
                    setSelectedPeriod(null);
                    setVerificationStatus('idle');
                }, 2000);
            } else {
                setVerificationStatus('failed');
                setFailReason(result.reason || "Verification Failed");
            }
        } else {
            setVerificationStatus('failed');
            setFailReason("No reference photo found");
        }
    } catch (e: any) {
        setVerificationStatus('failed');
        setFailReason("System Error");
    } finally {
        if (verificationStatus !== 'success') setScanning(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(r => r.date === today);
  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
  const validAttendance = attendance.filter(r => {
      const d = new Date(r.date);
      const day = d.getDay();
      return day !== 6 && day !== 0; 
  });
  const percentage = validAttendance.length > 0 ? Math.round((validAttendance.filter(r => r.status === 'PRESENT').length / validAttendance.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-slate-500 font-medium">Attendance Rate</h3>
                    <Percent className="w-5 h-5 text-blue-500" />
                </div>
                <p className={`text-3xl font-bold ${percentage > 75 ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</p>
                <p className="text-xs text-slate-400 mt-1">Excludes Weekends</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-slate-500 font-medium">Present Today</h3>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{todayRecords.filter(r => r.status === 'PRESENT').length}</p>
            </div>
            <button onClick={() => setShowSupport(true)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 transition-colors text-left group">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-slate-500 font-medium group-hover:text-blue-600">Support</h3>
                    <HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                </div>
                <p className="text-lg font-bold text-slate-900">Report Issue</p>
            </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!isWeekend && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Today's Schedule <span className="text-purple-600">(Batch {user.batch || 'A'})</span></h2>
                    <p className="text-sm text-slate-500">Mark attendance during specific windows.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-700">{timeString}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <span className="text-sm font-medium text-slate-500">{dayName}</span>
                </div>
            </div>
          )}

          {isWeekend ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Calendar className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-3">No Classes Today</h3>
              <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">It's {dayName}. Classes will resume on Monday.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {periodTimes.map((period) => {
                const record = todayRecords.find(r => r.period === period.id);
                const isMarked = !!record;
                const isPresent = record?.status === 'PRESENT';
                const subject = todaySchedule[period.id] || 'Free Period';
                const isStrict = period.strict !== false;
                const { start, end } = parsePeriodRange(period);
                
                let isActive, isFuture, isPast;
                let minutesRemaining = 0;
                let minutesUntilStart = 0;
                
                if (isStrict) {
                    isActive = currentTimeMinutes >= start && currentTimeMinutes <= end;
                    isPast = currentTimeMinutes > end;
                    isFuture = currentTimeMinutes < start;
                    minutesRemaining = end - currentTimeMinutes;
                    minutesUntilStart = start - currentTimeMinutes;
                } else {
                    isActive = true; isPast = false; isFuture = false;
                }

                let cardClass = "bg-white border-slate-200";
                if (isMarked) {
                    cardClass = isPresent ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200 opacity-75";
                } else if (isActive) {
                    cardClass = "bg-white border-blue-400 ring-2 ring-blue-100 shadow-lg shadow-blue-500/10 cursor-pointer";
                } else if (isPast || isFuture) {
                    cardClass = "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed";
                }

                return (
                  <button
                    key={period.id}
                    onClick={() => isActive && !isMarked ? handlePeriodClick(period) : undefined}
                    disabled={isMarked || (!isActive && isStrict)}
                    className={`w-full relative p-5 rounded-xl border-2 text-left transition-all duration-200 group flex items-center justify-between ${cardClass}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg ${isActive && !isMarked ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {period.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{period.name}</span>
                             {isStrict && isActive && !isMarked && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold animate-pulse">
                                    <Timer className="w-3 h-3" /> Closes in {minutesRemaining}m
                                </span>
                             )}
                             {isStrict && isFuture && minutesUntilStart < 60 && (
                                 <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                    <Timer className="w-3 h-3" /> Opens in {minutesUntilStart}m
                                </span>
                             )}
                        </div>
                        <h4 className={`text-lg font-bold ${isPresent ? 'text-green-700' : record?.status === 'ABSENT' ? 'text-red-700' : 'text-slate-900'}`}>{subject}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock className="w-3.5 h-3.5" /> <span>{period.startTime} - {period.endTime}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {isMarked ? (
                            <div className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg ${isPresent ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                                {isPresent ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                {record?.status}
                            </div>
                        ) : isActive ? (
                             <div className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Scan className="w-5 h-5" /> MARK
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-400 font-medium px-4 py-2">
                                {isPast ? 'MISSED' : <Lock className="w-5 h-5" />}
                            </div>
                        )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {attendance.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No records found.</p>
            ) : (
              attendance.slice(-5).reverse().map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-2 h-10 rounded-full ${r.status === 'PRESENT' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{r.date} • Period {r.period}</p>
                    <p className="text-xs text-slate-500">Marked {r.status} at {new Date(r.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
                <button onClick={() => setShowHistoryModal(true)} className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors">View Full History</button>
          </div>
        </div>
      </div>

      {showSupport && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
               <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                   {issueSent ? (
                       <div className="text-center py-8">
                           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8"/></div>
                           <h3 className="text-xl font-bold text-slate-900">Request Sent!</h3>
                           <p className="text-slate-500 mt-2">Admin will review shortly.</p>
                       </div>
                   ) : (
                       <form onSubmit={handleSupportSubmit} className="space-y-4">
                           <div className="flex justify-between items-center mb-2">
                               <h3 className="font-bold text-xl text-slate-900">Report Issue</h3>
                               <button type="button" onClick={() => setShowSupport(false)}><XCircle className="text-slate-400 hover:text-slate-600"/></button>
                           </div>
                           <div>
                               <label className="block text-sm font-medium mb-1 text-slate-700">Issue Type</label>
                               <select className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" value={issueType} onChange={e => setIssueType(e.target.value)}>
                                   <option value="BATCH_CHANGE">Wrong Batch</option>
                                   <option value="ATTENDANCE_CORRECTION">Attendance Correction</option>
                                   <option value="OTHER">Other Issue</option>
                               </select>
                           </div>
                           <textarea required className="w-full border border-slate-300 rounded-xl p-3 h-32 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Describe your issue..." value={issueDesc} onChange={e => setIssueDesc(e.target.value)}></textarea>
                           <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                               <Send className="w-4 h-4" /> Submit Request
                           </button>
                       </form>
                   )}
               </div>
           </div>
       )}

       {showHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2"><History className="w-5 h-5 text-purple-600" /> Attendance History</h3>
                        <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
                    </div>
                    <div className="p-0 overflow-y-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Period</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendance.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(record => (
                                    <tr key={record.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{record.date}</td>
                                        <td className="px-6 py-4">Period {record.period}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{record.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {attendance.length === 0 && <div className="p-12 text-center text-slate-400">No attendance records found.</div>}
                    </div>
                </div>
            </div>
       )}

      {selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden p-6 relative shadow-2xl">
             <button onClick={() => setSelectedPeriod(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><XCircle /></button>
             <div className="mb-4 text-center">
                <h3 className="font-bold text-xl text-slate-900">Biometric Verification</h3>
                <p className="text-sm text-slate-500">Period {selectedPeriod} • {todaySchedule[selectedPeriod]}</p>
             </div>

             {/* Biometric Instructions */}
             <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                    <span className="font-bold block text-sm mb-1 uppercase tracking-tight">Instructions:</span>
                    1. <span className="font-bold underline">REMOVE</span> glasses, masks, or hats.<br/>
                    2. Ensure your face is <span className="font-bold">clearly visible</span> and evenly lit.<br/>
                    3. Keep your head straight and centered in the box.
                </div>
             </div>

             <div className="aspect-[4/3] bg-black rounded-xl overflow-hidden relative mb-6 border-4 border-slate-100 shadow-inner">
                <Webcam ref={webcamRef} className="w-full h-full object-cover transform scale-x-[-1]" screenshotFormat="image/jpeg" />
                <div className="absolute inset-0 border-2 border-dashed border-blue-400/50 m-8 rounded-2xl pointer-events-none flex items-center justify-center">
                    {!scanning && verificationStatus === 'idle' && <span className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1 rounded-full">Align Face Here</span>}
                </div>
                {scanning && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                {verificationStatus === 'success' && (
                    <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center text-white animate-in fade-in">
                        <CheckCircle2 className="w-16 h-16 mb-2 drop-shadow-md" />
                        <span className="font-bold text-2xl drop-shadow-md">Verified</span>
                    </div>
                )}
                {verificationStatus === 'failed' && (
                    <div className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center text-white animate-in fade-in p-6 text-center">
                        <AlertTriangle className="w-12 h-12 mb-2 drop-shadow-md" />
                        <span className="font-bold text-2xl drop-shadow-md">Access Denied</span>
                        <p className="text-white/90 mt-2 font-medium bg-black/20 px-4 py-1 rounded-full text-sm">{failReason}</p>
                        
                        <button 
                            onClick={() => handleSupportSubmit(undefined, 'ATTENDANCE_CORRECTION', `Face verification failed for Period ${selectedPeriod}. Reason: ${failReason}`)}
                            className="mt-6 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/20"
                        >
                            <MessageSquare className="w-4 h-4"/> Report verification problem
                        </button>
                    </div>
                )}
             </div>
             {verificationStatus === 'idle' && (
                 <button onClick={startScan} disabled={scanning} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                     {scanning ? <Loader2 className="animate-spin" /> : <Scan />}
                     {scanning ? 'Analyzing Biometrics...' : 'Verify Attendance'}
                 </button>
             )}
             {verificationStatus === 'failed' && (
                 <button onClick={() => { setVerificationStatus('idle'); setFailReason(''); }} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-colors">
                     Try Again
                 </button>
             )}
          </div>
        </div>
       )}
    </div>
  );
};
