// Mock Data for Secure Attendance System

export interface Classroom {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface ActiveSession {
  id: string;
  subjectId: string;
  subjectName: string;
  classroomId: string;
  classroomName: string;
  qrCodePayload: string;
  createdAt: string; // ISO String
  expiresAt: string; // ISO String
  timeLimitSeconds: number;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
}

export interface StudentCheckInRecord {
  id?: string;
  sessionId?: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  selfieUri: string; // Base64 or local mock placeholder
  latitude: number;
  longitude: number;
  distanceMeters: number;
  qrVerified: boolean;
  selfieVerified: boolean;
  gpsVerified: boolean;
  verified: boolean;
  year: string;
  section: string;
  isIrregular: boolean;
  status: 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT';
  excuseReason?: string;
  excuseAttachment?: string;
  excuseAttachmentUri?: string;
  isRemoteStandpoint?: boolean;
  remoteLocationName?: string;
  remoteLocationReason?: string;
  deviceId?: string;
}

export interface AttendanceSessionLog {
  id: string; // maps to sessionId
  subjectName: string;
  subjectCode: string;
  classroomName: string;
  date: string;
  time: string;
  totalPresent: number;
  records: StudentCheckInRecord[];
  isOnline: boolean;
  year?: string;
  section?: string;
  professorId?: string;
}

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Software Engineering II', code: 'CS 302' },
  { id: 'sub2', name: 'Database Management Systems', code: 'CS 301' },
  { id: 'sub3', name: 'Mobile Application Development', code: 'IT 204' },
  { id: 'sub4', name: 'Introduction to Data Science', code: 'DS 101' },
];

export const INITIAL_CLASSROOMS: Classroom[] = [
  { id: 'room1', name: 'IT Building Lab 3', latitude: 14.59951, longitude: 120.98421 },
  { id: 'room2', name: 'IT Building Lab 4', latitude: 14.59862, longitude: 120.98354 },
  { id: 'room3', name: 'Engineering Lecture Hall A', latitude: 14.60124, longitude: 120.98567 },
  { id: 'room4', name: 'Virtual Classroom (Remote)', latitude: 0, longitude: 0 },
];

export const INITIAL_HISTORY_LOGS: AttendanceSessionLog[] = [
  {
    id: 'log1',
    subjectName: 'Software Engineering II',
    subjectCode: 'CS 302',
    classroomName: 'IT Building Lab 3',
    date: 'Jun 30, 2026',
    time: '09:00 AM - 09:10 AM',
    totalPresent: 3,
    isOnline: false,
    records: [
      {
        studentId: '2024-0012',
        studentName: 'Sam Chen',
        timestamp: '09:02 AM',
        selfieUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80',
        latitude: 14.59952,
        longitude: 120.98422,
        distanceMeters: 1.5,
        qrVerified: true,
        selfieVerified: true,
        gpsVerified: true,
        verified: true,
        year: '3rd Year',
        section: 'Section A',
        isIrregular: false,
        status: 'PRESENT',
      },
      {
        studentId: '2024-0034',
        studentName: 'Antony Taylor',
        timestamp: '09:04 AM',
        selfieUri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&h=80',
        latitude: 14.59954,
        longitude: 120.98420,
        distanceMeters: 3.4,
        qrVerified: true,
        selfieVerified: true,
        gpsVerified: true,
        verified: true,
        year: '3rd Year',
        section: 'Section B',
        isIrregular: true,
        status: 'PRESENT',
      },
      {
        studentId: '2024-0078',
        studentName: 'Craig Vance',
        timestamp: '09:07 AM',
        selfieUri: 'https://images.unsplash.com/photo-1527983359383-4758693f760c?auto=format&fit=crop&w=80&h=80',
        latitude: 14.59948,
        longitude: 120.98418,
        distanceMeters: 4.8,
        qrVerified: true,
        selfieVerified: true,
        gpsVerified: true,
        verified: true,
        year: '4th Year',
        section: 'Section A',
        isIrregular: false,
        status: 'LATE',
      }
    ],
  },
  {
    id: 'log2',
    subjectName: 'Mobile Application Development',
    subjectCode: 'IT 204',
    classroomName: 'IT Building Lab 4',
    date: 'Jun 28, 2026',
    time: '02:00 PM - 02:10 PM',
    totalPresent: 3,
    isOnline: false,
    records: [
      {
        studentId: '2024-0012',
        studentName: 'Sam Chen',
        timestamp: '02:03 PM',
        selfieUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80',
        latitude: 14.59863,
        longitude: 120.98355,
        distanceMeters: 1.2,
        qrVerified: true,
        selfieVerified: true,
        gpsVerified: true,
        verified: true,
        year: '3rd Year',
        section: 'Section A',
        isIrregular: false,
        status: 'PRESENT',
      },
      {
        studentId: '2024-0078',
        studentName: 'Craig Vance',
        timestamp: '02:08 PM',
        selfieUri: 'https://images.unsplash.com/photo-1527983359383-4758693f760c?auto=format&fit=crop&w=80&h=80',
        latitude: 14.59868,
        longitude: 120.98351,
        distanceMeters: 7.2,
        qrVerified: true,
        selfieVerified: true,
        gpsVerified: true,
        verified: true,
        year: '4th Year',
        section: 'Section A',
        isIrregular: false,
        status: 'LATE',
      },
      {
        studentId: '2024-0034',
        studentName: 'Antony Taylor',
        timestamp: '02:05 PM',
        selfieUri: '',
        latitude: 0,
        longitude: 0,
        distanceMeters: 0,
        qrVerified: false,
        selfieVerified: false,
        gpsVerified: false,
        verified: true,
        year: '3rd Year',
        section: 'Section B',
        isIrregular: true,
        status: 'EXCUSED',
        excuseReason: 'University Athletic Meet',
        excuseAttachment: 'Athletic_Excuse_Letter.pdf',
      }
    ],
  }
];

// Deterministic rolling token generator that rotates every 60 seconds (1 minute) (TOTP)
export const getRollingTokenForTime = (basePayload: string, timestampMs: number) => {
  // A bucket represents a 60-second block
  const bucket = Math.floor(timestampMs / 60000);
  
  // Generate a simple deterministic 4-character seed based on the bucket number
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let hash = bucket;
  let seedStr = '';
  for (let i = 0; i < 4; i++) {
    hash = (hash * 1664525 + 1013904223) % 4294967296;
    seedStr += chars[hash % chars.length];
  }
  return `${basePayload}_${seedStr}`;
};

