
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { PeriodTime, MasterSchedule, WEEKDAYS, DayName, User, AttendanceRecord, Batch, BATCHES, IssueReport } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CalendarCheck, TrendingUp, AlertTriangle, Clock, Calendar, Save, LayoutGrid, Check, X, Search, Edit, Lock, Unlock, MessageSquare, CheckCircle2, Filter, ScanFace, Trash2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'timetable' | 'requests'>('overview');
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState('');
  const [searchRollNo, setSearchRollNo] = useState('');
  const [searchBatch, setSearchBatch] = useState<string>(''); 

  const [viewingStudent, setViewingStudent] = useState<User | null>(null);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualPeriod, setManualPeriod] = useState<number>(1);

  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>([]);
  const [masterSchedule, setMasterSchedule] = useState<MasterSchedule>({} as MasterSchedule);
  const [selectedBatch, setSelectedBatch] = useState<Batch>('A');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const fetchData = async () => {
    try {
      const [u, a, i, p, m] = await Promise.all([
          db.getStudents(),
          db.getAttendance(),
          db.getIssues(),
          db.getPeriodTimes(),
          db.getMasterSchedule()
      ]);
      setStudents(u);
      setAttendance(a);
      setIssues(i);
      setPeriodTimes(p);
      setMasterSchedule(m);
    } catch (e) {
      console.error("Error fetching admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const validAttendance = useMemo(() => {
    return attendance.filter(r => {
      const d = new Date(r.date);
      const day = d.getDay();
      return day !== 0 && day !== 6; 
    });
  }, [attendance]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalRecords = validAttendance.filter(r => r.status === 'PRESENT').length;
    return { totalStudents, totalRecords };
  }, [students, validAttendance]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchName = student.name.toLowerCase().includes(searchName.toLowerCase());
      const matchRoll = (student.rollNumber || '').toLowerCase().includes(searchRollNo.toLowerCase());
      const matchBatch = searchBatch ? student.batch === searchBatch : true;
      return matchName && matchRoll && matchBatch;
    });
  }, [students, searchName, searchRollNo, searchBatch]);

  const getStudentStats = (studentId: string) => {
    const records = validAttendance.filter(r => r.studentId === studentId);
    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { percentage };
  };

  const graphData = useMemo(() => {
    const grouped: Record<string, number> = {};
    validAttendance.filter(r => r.status === 'PRESENT').forEach(r => {
      grouped[r.date] = (grouped[r.date] || 0) + 1;
    });
    return Object.keys(grouped).map(date => ({
      date,
      present: grouped[date],
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  }, [validAttendance]);

  const studentAttendanceData = useMemo(() => {
     return students.map(s => {
       const count = validAttendance.filter(r => r.studentId === s.id && r.status === 'PRESENT').length;
       return { name: s.name, attendance: count };
     }).sort((a, b) => b.attendance - a.attendance).slice(0, 10);
  }, [students, validAttendance]);

  const handleTimeChange = (id: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriodTimes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaveStatus('idle');
  };

  const handleStrictChange = (id: number, checked: boolean) => {
    setPeriodTimes(prev => prev.map(p => p.id === id ? { ...p, strict: checked } : p));
    setSaveStatus('idle');
  };

  const handleScheduleChange = (day: DayName, periodId: number, value: string) => {
    setMasterSchedule(prev => ({
      ...prev,
      [selectedBatch]: {
        ...(prev[selectedBatch] || {}),
        [day]: { ...(prev[selectedBatch]?.[day] || {}), [periodId]: value }
      }
    }));
    setSaveStatus('idle');
  };

  const saveTimetable = async () => {
    setSaveStatus('saving');
    await db.savePeriodTimes(periodTimes);
    await db.saveMasterSchedule(masterSchedule);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };
  
  const handleManualUpdate = async (status: 'PRESENT' | 'ABSENT') => {
    if (!viewingStudent) return;
    const day = new Date(manualDate).getDay();
    if (day === 0 || day === 6) { alert("Cannot mark attendance for weekends."); return; }
    const record: AttendanceRecord = {
        id: `${viewingStudent.id}-${Date.now()}`,
        studentId: viewingStudent.id,
        studentName: viewingStudent.name,
        date: manualDate,
        period: manualPeriod,
        status: status,
        timestamp: new Date().toISOString()
    };
    await db.markAttendance(record);
    const updated = await db.getAttendance();
    setAttendance(updated);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
        await db.updateUser(editingStudent);
        setStudents(await db.getStudents());
        setEditingStudent(null);
    }
  };

  const handleDeleteStudent = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to PERMANENTLY delete student ${userName}? This will remove all their records.`)) {
        // Optimistic UI update
        setStudents(prev => prev.filter(s => s.id !== userId));
        await db.deleteUser(userId);
        fetchData(); // Sync with source
    }
  };

  const resolveIssue = async (id: string) => {
      await db.resolveIssue(id);
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'RESOLVED' } : i));
  };

  const handleBiometricReset = async (issue: IssueReport) => {
      if (confirm(`This will clear the biometric profile for ${issue.studentName}. They will be asked to re-register their face. Proceed?`)) {
          await db.resetFaceData(issue.studentId);
          await resolveIssue(issue.id);
          alert("Biometrics cleared.");
          fetchData();
      }
  };

  const viewingStudentRecords = useMemo(() => {
    if (!viewingStudent) return [];
    return attendance
      .filter(r => {
          const d = new Date(r.date);
          const day = d.getDay();
          return r.studentId === viewingStudent.id && day !== 0 && day !== 6; 
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [viewingStudent, attendance]);

  const getDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff < 0 ? 'Invalid' : `${diff} mins`;
  }

  const pendingIssues = issues.filter(i => i.status === 'PENDING');

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          <span className="text-sm text-slate-500">Database Connected • {new Date().toLocaleDateString()}</span>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
          {['overview', 'students', 'timetable', 'requests'].map(tab => (
             <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap capitalize ${
                  activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab}
                {tab === 'requests' && pendingIssues.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingIssues.length}</span>
                )}
              </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-slate-500">Total Students</h3><Users className="w-5 h-5 text-blue-500" /></div>
              <p className="text-3xl font-bold text-slate-900">{stats.totalStudents}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-slate-500">Total Attendance</h3><CalendarCheck className="w-5 h-5 text-green-500" /></div>
              <p className="text-3xl font-bold text-slate-900">{stats.totalRecords}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-slate-500">System Health</h3><TrendingUp className="w-5 h-5 text-purple-500" /></div>
              <p className="text-3xl font-bold text-slate-900">Online</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium text-slate-500">Alerts</h3><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
              <p className="text-3xl font-bold text-slate-900">{pendingIssues.length}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Weekly Attendance</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '8px'}} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Top Student Attendance</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentAttendanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '8px'}} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="attendance" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
             <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search Name..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
             </div>
             <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search Roll No..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchRollNo} onChange={(e) => setSearchRollNo(e.target.value)} />
             </div>
             <div className="w-full md:w-48 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={searchBatch} onChange={(e) => setSearchBatch(e.target.value)}>
                  <option value="">All Batches</option>
                  {BATCHES.map(b => <option key={b} value={b}>Batch {b}</option>)}
                </select>
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-900 font-semibold border-b">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Roll No</th>
                    <th className="px-6 py-4">Batch</th>
                    <th className="px-6 py-4">Attendance %</th>
                    <th className="px-6 py-4">Face Data</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const { percentage } = getStudentStats(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                        <td className="px-6 py-4">{student.rollNumber || 'N/A'}</td>
                        <td className="px-6 py-4 font-bold text-blue-600">{student.batch || 'A'}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${percentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${percentage}%`}}></div></div>
                             <span className="font-bold">{percentage}%</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          {student.faceDataRegistered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><Check className="w-3 h-3"/> Registered</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-4">
                          <button onClick={() => setViewingStudent(student)} className="text-blue-600 hover:underline">History</button>
                          <button onClick={() => setEditingStudent(student)} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteStudent(student.id, student.name)} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {issues.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50"/> No requests.
                </div>
            ) : (
                issues.map(issue => (
                    <div key={issue.id} className={`bg-white rounded-xl p-6 shadow-sm border ${issue.status === 'RESOLVED' ? 'border-green-200 opacity-75' : 'border-orange-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${issue.type === 'BATCH_CHANGE' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {issue.type.replace('_', ' ')}
                                </span>
                                <h4 className="font-bold text-slate-900 mt-2">{issue.studentName}</h4>
                            </div>
                            {issue.status === 'PENDING' && <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>}
                        </div>
                        <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg">"{issue.description}"</p>
                        {issue.status === 'PENDING' && (
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={() => handleBiometricReset(issue)} 
                                    className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 transition-colors text-sm"
                                >
                                    <ScanFace className="w-4 h-4"/> Reset Biometrics
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        const s = students.find(st => st.id === issue.studentId);
                                        if(s) setEditingStudent(s);
                                    }} className="flex-1 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200">Edit Profile</button>
                                    <button onClick={() => resolveIssue(issue.id)} className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Mark Done</button>
                                </div>
                            </div>
                        )}
                        {issue.status === 'RESOLVED' && <div className="text-center text-xs font-bold text-green-600 bg-green-50 py-2 rounded-lg">Resolved</div>}
                    </div>
                ))
            )}
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><LayoutGrid className="w-6 h-6 text-slate-400" /> Timetable Management</h3>
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                   {BATCHES.map(batch => (
                       <button key={batch} onClick={() => setSelectedBatch(batch)} className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${selectedBatch === batch ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}>Batch {batch}</button>
                   ))}
                </div>
                <button onClick={saveTimetable} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white transition-all shadow-lg ${saveStatus === 'saved' ? 'bg-green-600' : 'bg-blue-600'}`}>
                    {saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saveStatus === 'saved' ? 'Saved' : 'Save Changes'}
                </button>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="p-5 border-b bg-slate-50/50"><h4 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> Period Settings</h4></div>
              <div className="p-5 space-y-6">
                {periodTimes.map((period) => (
                  <div key={period.id} className="flex flex-col gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-baseline"><span className="text-sm font-bold text-slate-700">{period.name}</span><span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{getDuration(period.startTime, period.endTime)}</span></div>
                    <div className="flex items-center gap-2">
                        <input type="time" value={period.startTime} onChange={(e) => handleTimeChange(period.id, 'startTime', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded" />
                        <span className="text-slate-300">-</span>
                        <input type="time" value={period.endTime} onChange={(e) => handleTimeChange(period.id, 'endTime', e.target.value)} className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input type="checkbox" checked={period.strict !== false} onChange={(e) => handleStrictChange(period.id, e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">{period.strict !== false ? <Lock className="w-3 h-3 text-slate-400"/> : <Unlock className="w-3 h-3 text-slate-400"/>} Strict Mode</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-5 border-b bg-slate-50/50">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /> Weekly Schedule - Batch {selectedBatch}</h4>
              </div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><th className="w-20"></th>{WEEKDAYS.map(day => (<th key={day} className="pb-4 px-2 text-center text-slate-500 font-semibold">{day.slice(0, 3)}</th>))}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {periodTimes.map((period) => (
                      <tr key={period.id}>
                        <td className="py-3 font-medium text-slate-900 text-xs uppercase tracking-wide">{period.name}</td>
                        {WEEKDAYS.map((day) => (
                          <td key={`${day}-${period.id}`} className="p-2">
                            <input type="text" value={masterSchedule[selectedBatch]?.[day]?.[period.id] || ''} onChange={(e) => handleScheduleChange(day, period.id, e.target.value)} placeholder="Subject..." className="w-full px-3 py-2 text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 bg-slate-50 transition-all" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <div><h3 className="text-xl font-bold text-slate-900">{viewingStudent.name}</h3><p className="text-sm text-slate-500">{viewingStudent.rollNumber} • Batch {viewingStudent.batch || 'A'}</p></div>
              <button onClick={() => setViewingStudent(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex gap-4 mb-6">
                 <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100"><p className="text-xs font-semibold uppercase text-blue-500 mb-1">Total Present</p><p className="text-2xl font-bold text-slate-800">{viewingStudentRecords.filter(r => r.status === 'PRESENT').length}</p></div>
                 <div className="flex-1 bg-purple-50 p-4 rounded-xl border border-purple-100"><p className="text-xs font-semibold uppercase text-purple-600 mb-1">Rate</p><p className="text-2xl font-bold text-slate-800">{viewingStudentRecords.length > 0 ? Math.round((viewingStudentRecords.filter(r => r.status === 'PRESENT').length / viewingStudentRecords.length) * 100) : 0}%</p></div>
              </div>
              <div className="mb-6 bg-slate-50 border rounded-xl p-4">
                 <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Edit className="w-4 h-4 text-slate-500" /> Manual Correction</h4>
                 <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[140px]"><label className="text-xs font-medium text-slate-500 mb-1 block">Date</label><input type="date" className="w-full text-sm p-2 border rounded-lg" value={manualDate} onChange={(e) => setManualDate(e.target.value)} /></div>
                    <div className="w-24"><label className="text-xs font-medium text-slate-500 mb-1 block">Period</label><select className="w-full text-sm p-2 border rounded-lg" value={manualPeriod} onChange={(e) => setManualPeriod(Number(e.target.value))}>{[1,2,3,4,5,6].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    <button onClick={() => handleManualUpdate('PRESENT')} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">Present</button>
                    <button onClick={() => handleManualUpdate('ABSENT')} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Absent</button>
                 </div>
              </div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-slate-500" /> History</h4>
              {viewingStudentRecords.length > 0 ? (
                <div className="border rounded-xl overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-semibold border-b"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{viewingStudentRecords.map((record) => (<tr key={record.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{record.date}</td><td className="px-4 py-3">Period {record.period}</td><td className="px-4 py-3">{record.status === 'PRESENT' ? (<span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">PRESENT</span>) : (<span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">ABSENT</span>)}</td></tr>))}</tbody></table></div>
              ) : (<div className="text-center py-8 text-slate-400">No records found.</div>)}
            </div>
          </div>
        </div>
      )}

      {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                   <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-900">Edit Student</h3><button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button></div>
                    <form onSubmit={handleUpdateStudent} className="space-y-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label><input type="text" value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label><input type="text" value={editingStudent.rollNumber} onChange={(e) => setEditingStudent({...editingStudent, rollNumber: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-1">Batch</label><select value={editingStudent.batch || 'A'} onChange={(e) => setEditingStudent({...editingStudent, batch: e.target.value as Batch})} className="w-full p-2 border rounded-lg bg-white">{BATCHES.map(b => (<option key={b} value={b}>Batch {b}</option>))}</select></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-1">Class</label><input type="text" value={editingStudent.classGrade} onChange={(e) => setEditingStudent({...editingStudent, classGrade: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                        <div className="pt-2"><button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Save Changes</button></div>
                    </form>
              </div>
          </div>
      )}
    </div>
  );
};
