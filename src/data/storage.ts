import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActiveSession,
  AttendanceSessionLog,
  INITIAL_HISTORY_LOGS,
  Classroom,
  INITIAL_CLASSROOMS
} from './mockData';

const KEYS = {
  ACTIVE_SESSION: 'attendance_active_session',
  HISTORY_LOGS: 'attendance_history_logs',
  STUDENT_PROFILE: 'attendance_student_profile',
  PROFESSOR_SUBJECTS: 'attendance_professor_subjects',
  USER_ACCOUNTS: 'attendance_user_accounts',
  CURRENT_USER: 'attendance_current_user',
  CLASSROOMS: 'attendance_classrooms',
};

export interface StudentProfile {
  studentId: string;
  studentName: string;
  avatarColor: string;
  year: string;
  section: string;
  isIrregular: boolean;
  homeAddress: string;
  homeLatitude: number;
  homeLongitude: number;
  // Second address fields
  hasSecondAddress?: boolean;
  secondAddress?: string;
  secondLatitude?: number;
  secondLongitude?: number;
}

export interface UserAccount {
  usernameId: string; // The ID number or username
  email: string;
  name: string;
  password?: string;
  role: 'professor' | 'student';
  profileRegistered?: boolean;
}

export interface ProfessorSubject {
  id: string;
  code: string;
  name: string;
  section: string;
  year: string;
  course: string; // e.g. IT, CS, DS
  department: string; // e.g. College of Information Technology
  scheduleTime: string;
  originalScheduleTime: string;
  daysOfWeek: string[]; // e.g. ['Monday', 'Wednesday']
}

export const INITIAL_PROFESSOR_SUBJECTS: ProfessorSubject[] = [
  {
    id: 'sub1',
    code: 'CS 302',
    name: 'Software Engineering II',
    section: 'Section B',
    year: '3rd Year',
    course: 'CS',
    department: 'Computer Science Department',
    scheduleTime: '07:00 AM - 09:00 AM',
    originalScheduleTime: '07:00 AM - 09:00 AM',
    daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
  },
  {
    id: 'sub2',
    code: 'IT 204',
    name: 'Mobile Application Development',
    section: 'Section B',
    year: '3rd Year',
    course: 'IT',
    department: 'Information Technology Department',
    scheduleTime: '02:00 PM - 04:00 PM',
    originalScheduleTime: '02:00 PM - 04:00 PM',
    daysOfWeek: ['Tuesday', 'Thursday'],
  }
];

export async function initializeData(): Promise<void> {
  try {
    const active = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
    if (!active) {
      await AsyncStorage.setItem(KEYS.ACTIVE_SESSION, 'null');
    }

    const history = await AsyncStorage.getItem(KEYS.HISTORY_LOGS);
    if (!history) {
      await AsyncStorage.setItem(KEYS.HISTORY_LOGS, JSON.stringify(INITIAL_HISTORY_LOGS));
    }

    const subjects = await AsyncStorage.getItem(KEYS.PROFESSOR_SUBJECTS);
    if (!subjects) {
      await AsyncStorage.setItem(KEYS.PROFESSOR_SUBJECTS, JSON.stringify(INITIAL_PROFESSOR_SUBJECTS));
    }

    // Initialize mock accounts if none found
    const accounts = await AsyncStorage.getItem(KEYS.USER_ACCOUNTS);
    if (!accounts) {
      const defaultAccounts: UserAccount[] = [
        {
          usernameId: '2024-0518',
          email: 'student@university.edu',
          name: 'Katrina Santillan',
          password: 'password123',
          role: 'student',
          profileRegistered: true
        },
        {
          usernameId: 'prof1',
          email: 'professor@university.edu',
          name: 'Dr. Jane Smith',
          password: 'password123',
          role: 'professor',
          profileRegistered: true
        }
      ];
      await AsyncStorage.setItem(KEYS.USER_ACCOUNTS, JSON.stringify(defaultAccounts));
    }
  } catch (error) {
    console.error('Error initializing AsyncStorage attendance data:', error);
  }
}

export async function getUserAccounts(): Promise<UserAccount[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_ACCOUNTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveUserAccounts(accounts: UserAccount[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_ACCOUNTS, JSON.stringify(accounts));
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveCurrentUser(user: UserAccount): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export async function logoutCurrentUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.CURRENT_USER);
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
}

export async function clearActiveSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ACTIVE_SESSION);
}

export async function getHistoryLogs(): Promise<AttendanceSessionLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.HISTORY_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveHistoryLogs(logs: AttendanceSessionLog[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.HISTORY_LOGS, JSON.stringify(logs));
}

export async function getStudentProfile(): Promise<StudentProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.STUDENT_PROFILE);
    return data ? JSON.parse(data) : {
      studentId: '2024-0518',
      studentName: 'Katrina Santillan',
      avatarColor: '#0066cc',
      year: '3rd Year',
      section: 'Section B',
      isIrregular: false,
      homeAddress: '123 Taft Avenue, Manila',
      homeLatitude: 14.56841,
      homeLongitude: 120.99182,
      hasSecondAddress: false,
    };
  } catch {
    return {
      studentId: '2024-0518',
      studentName: 'Katrina Santillan',
      avatarColor: '#0066cc',
      year: '3rd Year',
      section: 'Section B',
      isIrregular: false,
      homeAddress: '123 Taft Avenue, Manila',
      homeLatitude: 14.56841,
      homeLongitude: 120.99182,
      hasSecondAddress: false,
    };
  }
}

export async function saveStudentProfile(profile: StudentProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(profile));
}

export async function getProfessorSubjects(): Promise<ProfessorSubject[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFESSOR_SUBJECTS);
    return data ? JSON.parse(data) : INITIAL_PROFESSOR_SUBJECTS;
  } catch {
    return INITIAL_PROFESSOR_SUBJECTS;
  }
}

export async function saveProfessorSubjects(subjects: ProfessorSubject[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFESSOR_SUBJECTS, JSON.stringify(subjects));
}

export interface PendingExcuse {
  studentId: string;
  studentName: string;
  subjectCode: string;
  date: string;
  timestamp: string;
  excuseReason: string;
  excuseAttachment: string;
  excuseAttachmentUri?: string;
  year: string;
  section: string;
  isIrregular: boolean;
}

export async function getPendingExcuses(): Promise<PendingExcuse[]> {
  try {
    const data = await AsyncStorage.getItem('attendance_pending_excuses');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function savePendingExcuses(excuses: PendingExcuse[]): Promise<void> {
  await AsyncStorage.setItem('attendance_pending_excuses', JSON.stringify(excuses));
}

export async function getClassrooms(): Promise<Classroom[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CLASSROOMS);
    return data ? JSON.parse(data) : INITIAL_CLASSROOMS;
  } catch {
    return INITIAL_CLASSROOMS;
  }
}

export async function saveClassrooms(classrooms: Classroom[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CLASSROOMS, JSON.stringify(classrooms));
}

export async function getDeviceHardwareId(): Promise<string> {
  try {
    let devId = await AsyncStorage.getItem('device_hardware_uuid');
    if (!devId) {
      // Generate a mock hardware UUID binding
      devId = `device_hw_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
      await AsyncStorage.setItem('device_hardware_uuid', devId);
    }
    return devId;
  } catch {
    return 'device_hw_fallback_default';
  }
}
