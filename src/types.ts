
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
}

export type Batch = 'A' | 'B' | 'C' | 'D';
export const BATCHES: Batch[] = ['A', 'B', 'C', 'D'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  rollNumber?: string;
  classGrade?: string;
  batch?: Batch;
  faceDataRegistered?: boolean;
  referenceImage?: string; 
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // ISO Date string YYYY-MM-DD
  period: number;
  status: 'PRESENT' | 'ABSENT';
  timestamp: string;
}

export interface PeriodTime {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  strict?: boolean; 
}

export interface IssueReport {
  id: string;
  studentId: string;
  studentName: string;
  type: 'BATCH_CHANGE' | 'ATTENDANCE_CORRECTION' | 'OTHER';
  description: string;
  status: 'PENDING' | 'RESOLVED';
  timestamp: string;
}

export type DayName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export type DailySchedule = {
  [periodId: number]: string; // Subject Name
};

// Schedule for a single batch
export type WeeklySchedule = {
  [key in DayName]?: DailySchedule;
};

// Master schedule containing all batches
export type MasterSchedule = {
  [key in Batch]?: WeeklySchedule;
};

export const DAYS: DayName[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Standard School Week (Mon-Fri)
export const WEEKDAYS: DayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const DEFAULT_PERIOD_TIMES: PeriodTime[] = [
  { id: 1, name: "Period 1", startTime: "09:00", endTime: "10:00", strict: true },
  { id: 2, name: "Period 2", startTime: "10:00", endTime: "11:00", strict: true },
  { id: 3, name: "Period 3", startTime: "11:00", endTime: "12:00", strict: true },
  { id: 4, name: "Period 4", startTime: "13:00", endTime: "14:00", strict: true },
  { id: 5, name: "Period 5", startTime: "14:00", endTime: "15:00", strict: true },
  { id: 6, name: "Period 6", startTime: "15:00", endTime: "16:00", strict: true },
];
