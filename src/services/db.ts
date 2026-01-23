
import { supabase } from '../lib/supabase';
import { User, AttendanceRecord, IssueReport, PeriodTime, MasterSchedule, DEFAULT_PERIOD_TIMES, BATCHES, DAYS, WeeklySchedule } from '../types';

// Detect if Supabase is properly configured
const isSupabaseConfigured = () => {
  try {
    const url = (supabase as any).supabaseUrl;
    const key = (supabase as any).supabaseKey;
    return url && !url.includes('YOUR_PROJECT_ID') && key && !key.includes('YOUR_ANON_PUBLIC_KEY');
  } catch {
    return false;
  }
};

const USE_CLOUD = isSupabaseConfigured();

// Local Storage Keys - Using a unified key to prevent conflicts with legacy storage.ts
const LS_USERS = 'facerec_users_v2';
const LS_ATTENDANCE = 'facerec_attendance_v2';
const LS_ISSUES = 'facerec_issues_v2';
const LS_SETTINGS = 'facerec_settings_v2';

// Local Storage Helpers
const getLS = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLS = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// Initial local data setup
if (!localStorage.getItem(LS_USERS)) {
    setLS(LS_USERS, [{
        id: 'admin-1',
        name: 'System Administrator',
        email: 'admin@school.com',
        role: 'ADMIN',
        password: 'admin'
    }]);
}

// Helper to map DB columns (snake_case) to App types (camelCase)
const mapUser = (data: any): User => ({
  id: data.id,
  name: data.name,
  email: data.email,
  role: data.role,
  password: data.password,
  rollNumber: data.roll_number || data.rollNumber,
  classGrade: data.class_grade || data.classGrade,
  batch: data.batch,
  faceDataRegistered: data.face_data_registered || data.faceDataRegistered,
  referenceImage: data.reference_image || data.referenceImage
});

export const db = {
  // --- AUTH & USERS ---
  login: async (email: string, password: string): Promise<User | null> => {
    if (USE_CLOUD) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();
      if (error || !data) return null;
      return mapUser(data);
    } else {
      const users = getLS(LS_USERS);
      const user = users.find((u: any) => u.email === email && u.password === password);
      return user ? mapUser(user) : null;
    }
  },

  signup: async (user: User): Promise<{ user: User | null; error: string | null }> => {
    if (USE_CLOUD) {
      const { data: existing } = await supabase
          .from('users')
          .select('email, roll_number')
          .or(`email.eq.${user.email},roll_number.eq.${user.rollNumber}`)
          .maybeSingle();

      if (existing) {
          if (existing.email === user.email) return { user: null, error: "Email already registered." };
          if (existing.roll_number === user.rollNumber) return { user: null, error: "Roll Number already registered." };
      }

      const { data, error } = await supabase.from('users').insert([{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: user.password,
        roll_number: user.rollNumber,
        class_grade: user.classGrade,
        batch: user.batch,
        face_data_registered: false
      }]).select().single();

      if (error) return { user: null, error: "Database error." };
      return { user: mapUser(data), error: null };
    } else {
      const users = getLS(LS_USERS);
      if (users.find((u: any) => u.email === user.email)) return { user: null, error: "Email already exists." };
      users.push(user);
      setLS(LS_USERS, users);
      return { user, error: null };
    }
  },

  updateUser: async (user: User) => {
    if (USE_CLOUD) {
      await supabase.from('users').update({
          name: user.name,
          roll_number: user.rollNumber,
          class_grade: user.classGrade,
          batch: user.batch,
          face_data_registered: user.faceDataRegistered,
          reference_image: user.referenceImage
      }).eq('id', user.id);
    } else {
      const users = getLS(LS_USERS);
      const idx = users.findIndex((u: any) => u.id === user.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...user };
        setLS(LS_USERS, users);
      }
    }
  },

  deleteUser: async (userId: string) => {
    if (USE_CLOUD) {
        await supabase.from('users').delete().eq('id', userId);
        // Also cleanup attendance and issues in cloud if cascade is not set
        await supabase.from('attendance').delete().eq('student_id', userId);
        await supabase.from('issues').delete().eq('student_id', userId);
    } else {
        const users = getLS(LS_USERS);
        const filteredUsers = users.filter((u: any) => u.id !== userId);
        setLS(LS_USERS, filteredUsers);
        
        // Also cleanup their attendance and issues in local storage
        const attendance = getLS(LS_ATTENDANCE);
        setLS(LS_ATTENDANCE, attendance.filter((r: any) => r.studentId !== userId));
        
        const issues = getLS(LS_ISSUES);
        setLS(LS_ISSUES, issues.filter((i: any) => i.studentId !== userId));
    }
  },

  resetFaceData: async (userId: string) => {
    if (USE_CLOUD) {
        await supabase.from('users').update({
            face_data_registered: false,
            reference_image: null
        }).eq('id', userId);
    } else {
        const users = getLS(LS_USERS);
        const idx = users.findIndex((u: any) => u.id === userId);
        if (idx !== -1) {
            users[idx].faceDataRegistered = false;
            users[idx].referenceImage = null;
            setLS(LS_USERS, users);
        }
    }
  },

  getStudents: async (): Promise<User[]> => {
    if (USE_CLOUD) {
      const { data } = await supabase.from('users').select('*').eq('role', 'STUDENT');
      return (data || []).map(mapUser);
    } else {
      return getLS(LS_USERS).filter((u: any) => u.role === 'STUDENT').map(mapUser);
    }
  },

  // --- IMAGES ---
  uploadFaceImage: async (userId: string, base64Image: string): Promise<string | null> => {
    if (USE_CLOUD) {
      try {
        const res = await fetch(base64Image);
        const blob = await res.blob();
        const fileName = `${userId}_${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('face-photos')
          .upload(fileName, blob, { 
            upsert: true,
            contentType: 'image/jpeg'
          });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('face-photos').getPublicUrl(fileName);
        
        await db.updateUser({ 
          id: userId, 
          faceDataRegistered: true, 
          referenceImage: publicUrl 
        } as any);
        
        return publicUrl;
      } catch (e: any) {
        console.warn("Cloud upload failed, using direct data fallback.", e);
        await db.updateUser({ 
          id: userId, 
          faceDataRegistered: true, 
          referenceImage: base64Image 
        } as any);
        return base64Image;
      }
    }
    
    const users = getLS(LS_USERS);
    const idx = users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
        users[idx].faceDataRegistered = true;
        users[idx].referenceImage = base64Image;
        setLS(LS_USERS, users);
        return base64Image;
    }
    return null;
  },

  // --- ATTENDANCE ---
  getAttendance: async (): Promise<AttendanceRecord[]> => {
    if (USE_CLOUD) {
      const { data } = await supabase.from('attendance').select('*');
      return (data || []).map((r: any) => ({
        ...r,
        studentId: r.student_id,
        studentName: r.student_name
      }));
    } else {
      return getLS(LS_ATTENDANCE);
    }
  },

  markAttendance: async (record: AttendanceRecord) => {
    if (USE_CLOUD) {
      const { data: existing } = await supabase.from('attendance')
          .select('id')
          .eq('student_id', record.studentId)
          .eq('date', record.date)
          .eq('period', record.period)
          .maybeSingle();

      if (existing) {
          await supabase.from('attendance').update({
              status: record.status,
              timestamp: record.timestamp
          }).eq('id', existing.id);
      } else {
          await supabase.from('attendance').insert([{
              id: record.id,
              student_id: record.studentId,
              student_name: record.studentName,
              date: record.date,
              period: record.period,
              status: record.status,
              timestamp: record.timestamp
          }]);
      }
    } else {
      const records = getLS(LS_ATTENDANCE);
      const idx = records.findIndex((r: any) => r.studentId === record.studentId && r.date === record.date && r.period === record.period);
      if (idx !== -1) records[idx] = record;
      else records.push(record);
      setLS(LS_ATTENDANCE, records);
    }
  },

  // --- ISSUES ---
  getIssues: async (): Promise<IssueReport[]> => {
    if (USE_CLOUD) {
      const { data } = await supabase.from('issues').select('*');
      return (data || []).map((i: any) => ({
        ...i,
        studentId: i.student_id,
        studentName: i.student_name
      }));
    } else {
      return getLS(LS_ISSUES);
    }
  },
  
  addIssue: async (issue: IssueReport) => {
    if (USE_CLOUD) {
      await supabase.from('issues').insert([{
        id: issue.id,
        student_id: issue.studentId,
        student_name: issue.studentName,
        type: issue.type,
        description: issue.description,
        status: issue.status,
        timestamp: issue.timestamp
      }]);
    } else {
      const issues = getLS(LS_ISSUES);
      issues.push(issue);
      setLS(LS_ISSUES, issues);
    }
  },

  resolveIssue: async (id: string) => {
      if (USE_CLOUD) {
          await supabase.from('issues').update({ status: 'RESOLVED' }).eq('id', id);
      } else {
          const issues = getLS(LS_ISSUES);
          const idx = issues.findIndex((i: any) => i.id === id);
          if (idx !== -1) {
              issues[idx].status = 'RESOLVED';
              setLS(LS_ISSUES, issues);
          }
      }
  },

  // --- CONFIG ---
  getPeriodTimes: async (): Promise<PeriodTime[]> => {
    if (USE_CLOUD) {
      const { data } = await supabase.from('settings').select('value').eq('key', 'period_times').single();
      return data ? data.value : DEFAULT_PERIOD_TIMES;
    } else {
      const settings = getLS(LS_SETTINGS);
      const pt = settings.find((s: any) => s.key === 'period_times');
      return pt ? pt.value : DEFAULT_PERIOD_TIMES;
    }
  },

  savePeriodTimes: async (times: PeriodTime[]) => {
    if (USE_CLOUD) {
      await supabase.from('settings').upsert({ key: 'period_times', value: times });
    } else {
      const settings = getLS(LS_SETTINGS);
      const idx = settings.findIndex((s: any) => s.key === 'period_times');
      if (idx !== -1) settings[idx].value = times;
      else settings.push({ key: 'period_times', value: times });
      setLS(LS_SETTINGS, settings);
    }
  },

  getMasterSchedule: async (): Promise<MasterSchedule> => {
    if (USE_CLOUD) {
      const { data } = await supabase.from('settings').select('value').eq('key', 'master_schedule').single();
      if (data) return data.value;
    } else {
      const settings = getLS(LS_SETTINGS);
      const ms = settings.find((s: any) => s.key === 'master_schedule');
      if (ms) return ms.value;
    }

    const schedule: MasterSchedule = {} as MasterSchedule;
    BATCHES.forEach(batch => {
        const batchSchedule: WeeklySchedule = {} as WeeklySchedule;
        DAYS.forEach(day => {
            batchSchedule[day] = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
        });
        schedule[batch] = batchSchedule;
    });
    return schedule;
  },

  saveMasterSchedule: async (schedule: MasterSchedule) => {
    if (USE_CLOUD) {
      await supabase.from('settings').upsert({ key: 'master_schedule', value: schedule });
    } else {
      const settings = getLS(LS_SETTINGS);
      const idx = settings.findIndex((s: any) => s.key === 'master_schedule');
      if (idx !== -1) settings[idx].value = schedule;
      else settings.push({ key: 'master_schedule', value: schedule });
      setLS(LS_SETTINGS, settings);
    }
  }
};
