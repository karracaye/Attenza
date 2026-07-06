import * as storage from '../data/storage';
export const initializeData = storage.initializeData;
import { ActiveSession, AttendanceSessionLog, Classroom } from '../data/mockData';
import { UserAccount, StudentProfile, ProfessorSubject, PendingExcuse } from '../data/storage';
export { UserAccount, StudentProfile, ProfessorSubject, PendingExcuse };

import { NativeModules } from 'react-native';

const getBackendUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/http:\/\/([0-9\.]+):/);
    if (match && match[1]) {
      const ip = match[1];
      console.log(`[API Client] Detected host IP address from scriptURL: ${ip}`);
      return `http://${ip}:5001`;
    }
  }
  return 'http://localhost:5001';
};

const API_BASE_URL = getBackendUrl();

let isServerAvailable = false;
let checkDone = false;

// Check if server is available
async function pingServer(): Promise<boolean> {
  if (checkDone) return isServerAvailable;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_BASE_URL}/api/classrooms`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    isServerAvailable = res.status === 200;
  } catch (error) {
    console.log('[API Client] Server unreachable, falling back to local AsyncStorage storage mode.');
    isServerAvailable = false;
  }
  checkDone = true;
  return isServerAvailable;
}

// Ensure the server check runs immediately on load
pingServer();

export async function checkServerStatus(): Promise<boolean> {
  checkDone = false; // re-verify
  return await pingServer();
}

// -------------------------------------------------------------
// USER ACCOUNTS / AUTHENTICATION
// -------------------------------------------------------------

export async function getUserAccounts(): Promise<UserAccount[]> {
  const isUp = await pingServer();
  if (!isUp) {
    return await storage.getUserAccounts();
  }
  // Accounts are usually fetched/checked individually on the backend,
  // but to satisfy signature we can fallback
  return await storage.getUserAccounts();
}

export async function saveUserAccounts(accounts: UserAccount[]): Promise<void> {
  await storage.saveUserAccounts(accounts);
}

export async function registerUserAccount(user: Partial<UserAccount> & any): Promise<UserAccount> {
  const isUp = await pingServer();
  if (!isUp) {
    // Local fallback registration
    const accounts = await storage.getUserAccounts();
    const newUser: UserAccount = {
      usernameId: user.usernameId,
      email: user.email,
      name: user.name,
      password: user.password,
      role: user.role,
      profileRegistered: true,
    };
    accounts.push(newUser);
    await storage.saveUserAccounts(accounts);
    
    if (user.role === 'student') {
      const studentProfile: StudentProfile = {
        studentId: user.usernameId,
        studentName: user.name,
        avatarColor: '#1E5EFF',
        year: user.year || '3rd Year',
        section: user.section || 'Section B',
        isIrregular: !!user.isIrregular,
        homeAddress: user.homeAddress || '',
        homeLatitude: user.homeLatitude || 0,
        homeLongitude: user.homeLongitude || 0,
        hasSecondAddress: !!user.hasSecondAddress,
        secondAddress: user.secondAddress || '',
        secondLatitude: user.secondLatitude || 0,
        secondLongitude: user.secondLongitude || 0,
      };
      await storage.saveStudentProfile(studentProfile);
    }
    return newUser;
  }

  // Remote registration
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Server registration failed.');
  }

  const registeredUser = await res.json();
  return registeredUser;
}

export async function loginUserAccount(usernameId: string, password: string): Promise<UserAccount> {
  const isUp = await pingServer();
  if (!isUp) {
    // Local verification
    const accounts = await storage.getUserAccounts();
    const found = accounts.find(
      (a) => (a.usernameId === usernameId || a.email === usernameId) && a.password === password
    );
    if (!found) {
      throw new Error('Invalid Username/Email or password.');
    }
    return found;
  }

  // Remote login
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameId, password }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Login verification failed.');
  }

  const authenticatedUser = await res.json();
  return authenticatedUser;
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  return await storage.getCurrentUser();
}

export async function saveCurrentUser(user: UserAccount): Promise<void> {
  await storage.saveCurrentUser(user);
}

export async function logoutCurrentUser(): Promise<void> {
  await storage.logoutCurrentUser();
}

// -------------------------------------------------------------
// STUDENT PROFILE
// -------------------------------------------------------------

export async function getStudentProfile(usernameId?: string): Promise<StudentProfile> {
  const isUp = await pingServer();
  if (!isUp || !usernameId) {
    return await storage.getStudentProfile();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/user/profile/${usernameId}`);
    if (res.ok) {
      const user = await res.json();
      return {
        studentId: user.usernameId,
        studentName: user.name,
        avatarColor: '#1E5EFF',
        year: user.year || '3rd Year',
        section: user.section || 'Section B',
        isIrregular: !!user.isIrregular,
        homeAddress: user.homeAddress || '',
        homeLatitude: user.homeLatitude || 0,
        homeLongitude: user.homeLongitude || 0,
        hasSecondAddress: !!user.hasSecondAddress,
        secondAddress: user.secondAddress || '',
        secondLatitude: user.secondLatitude || 0,
        secondLongitude: user.secondLongitude || 0,
      };
    }
  } catch (err) {
    console.warn('Failed to fetch student profile from server:', err);
  }
  return await storage.getStudentProfile();
}

export async function saveStudentProfile(profile: StudentProfile): Promise<void> {
  await storage.saveStudentProfile(profile);
  
  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/user/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameId: profile.studentId,
          name: profile.studentName,
          email: `${profile.studentId}@university.edu.ph`,
          year: profile.year,
          section: profile.section,
          homeAddress: profile.homeAddress,
          homeLatitude: profile.homeLatitude,
          homeLongitude: profile.homeLongitude,
          hasSecondAddress: profile.hasSecondAddress,
          secondAddress: profile.secondAddress,
          secondLatitude: profile.secondLatitude,
          secondLongitude: profile.secondLongitude,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync updated profile to server:', err);
    }
  }
}

// -------------------------------------------------------------
// CHANGE PASSWORD
// -------------------------------------------------------------

export async function changeUserPassword(usernameId: string, newPw: string): Promise<void> {
  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameId, newPassword: newPw }),
      });
    } catch (err) {
      console.warn('Password sync to server failed:', err);
    }
  }
}

// -------------------------------------------------------------
// PROFESSOR SUBJECTS
// -------------------------------------------------------------

export async function getProfessorSubjects(profId?: string): Promise<ProfessorSubject[]> {
  const isUp = await pingServer();
  if (!isUp || !profId) {
    return await storage.getProfessorSubjects();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${profId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to retrieve professor subjects:', err);
  }
  return await storage.getProfessorSubjects();
}

export async function saveProfessorSubjects(subjects: ProfessorSubject[], profId?: string): Promise<void> {
  await storage.saveProfessorSubjects(subjects);
  
  const isUp = await pingServer();
  if (isUp && profId) {
    try {
      await fetch(`${API_BASE_URL}/api/subjects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professorId: profId, subjectsList: subjects }),
      });
    } catch (err) {
      console.warn('Failed to sync subjects to server:', err);
    }
  }
}

// -------------------------------------------------------------
// CLASSROOMS Standpoints
// -------------------------------------------------------------

export async function getClassrooms(): Promise<Classroom[]> {
  const isUp = await pingServer();
  if (!isUp) {
    return await storage.getClassrooms();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/classrooms`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to retrieve classrooms:', err);
  }
  return await storage.getClassrooms();
}

export async function saveClassrooms(classrooms: Classroom[]): Promise<void> {
  await storage.saveClassrooms(classrooms);
}

export async function registerClassroom(classroom: Classroom): Promise<void> {
  const classrooms = await storage.getClassrooms();
  classrooms.push(classroom);
  await storage.saveClassrooms(classrooms);

  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/classrooms/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classroom),
      });
    } catch (err) {
      console.warn('Failed to register custom classroom standpoint to server:', err);
    }
  }
}

// -------------------------------------------------------------
// ACTIVE SESSIONS (Professor starts, student polls)
// -------------------------------------------------------------

export async function getActiveSession(): Promise<ActiveSession | null> {
  const isUp = await pingServer();
  if (!isUp) {
    return await storage.getActiveSession();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/sessions/active`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Active session query failed:', err);
  }
  return await storage.getActiveSession();
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  await storage.saveActiveSession(session);
}

export async function clearActiveSession(): Promise<void> {
  await storage.clearActiveSession();
}

export async function startProfessorSession(session: ActiveSession): Promise<void> {
  await storage.saveActiveSession(session);

  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
    } catch (err) {
      console.warn('Start session sync to server failed:', err);
    }
  }
}

export async function endProfessorSession(session: ActiveSession, finalRoster: any[]): Promise<void> {
  await storage.clearActiveSession();

  // Save to history logs locally
  const logs = await storage.getHistoryLogs();
  const subjectCode = session.subjectName.split(' - ')[0] || 'CS 302';
  const newLog: AttendanceSessionLog = {
    id: session.id,
    subjectCode: subjectCode,
    subjectName: session.subjectName,
    classroomName: session.classroomName,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    totalPresent: finalRoster.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length,
    isOnline: session.isOnline,
    records: finalRoster,
  };
  logs.unshift(newLog);
  await storage.saveHistoryLogs(logs);

  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
    } catch (err) {
      console.warn('End session sync to server failed:', err);
    }
  }
}

// -------------------------------------------------------------
// HISTORY LOGS / RECORDS
// -------------------------------------------------------------

export async function getHistoryLogs(role?: string, usernameId?: string): Promise<AttendanceSessionLog[]> {
  const isUp = await pingServer();
  if (!isUp) {
    return await storage.getHistoryLogs();
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/logs/history`);
    if (res.ok) {
      const serverLogs = await res.json() as AttendanceSessionLog[];
      if (role === 'student' && usernameId) {
        return serverLogs.filter(log => log.records.some(r => r.studentId === usernameId));
      }
      if (role === 'professor' && usernameId) {
        return serverLogs.filter(log => log.professorId === usernameId);
      }
      return serverLogs;
    }
  } catch (err) {
    console.warn('Failed to fetch completed logs from server:', err);
  }
  return await storage.getHistoryLogs();
}

export async function saveHistoryLogs(logs: AttendanceSessionLog[]): Promise<void> {
  await storage.saveHistoryLogs(logs);
}

export async function getLiveSessionRecords(sessionId: string): Promise<any[]> {
  const isUp = await pingServer();
  if (!isUp) {
    return [];
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/sessions/records/${sessionId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to retrieve live session records:', err);
  }
  return [];
}

// -------------------------------------------------------------
// SUBMIT CHECK-IN / EXCUSE LETTER
// -------------------------------------------------------------

export async function submitStudentCheckIn(record: any): Promise<void> {
  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/sessions/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.warn('Checkin sync to server failed:', err);
    }
  }

  // Also write to active session roster locally for fallback/sim consistency
  const active = await storage.getActiveSession();
  if (active && active.id === record.sessionId) {
    // Stub
  }
}

export async function submitStudentExcuse(excuse: any): Promise<void> {
  // Save locally
  const excuses = await storage.getPendingExcuses();
  excuses.push(excuse);
  await storage.savePendingExcuses(excuses);

  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/excuses/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(excuse),
      });
    } catch (err) {
      console.warn('Excuse submit sync to server failed:', err);
    }
  }
}

export async function getPendingExcuses(): Promise<PendingExcuse[]> {
  const isUp = await pingServer();
  if (!isUp) {
    return await storage.getPendingExcuses();
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/excuses/pending`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to retrieve pending excuses from server:', err);
  }
  return await storage.getPendingExcuses();
}

export async function savePendingExcuses(excuses: PendingExcuse[]): Promise<void> {
  await storage.savePendingExcuses(excuses);
}

export async function actionExcuseOnServer(id: string): Promise<void> {
  const isUp = await pingServer();
  if (isUp) {
    try {
      await fetch(`${API_BASE_URL}/api/excuses/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn('Failed to execute excuse action on server:', err);
    }
  }
}

export async function getDeviceHardwareId(): Promise<string> {
  return await storage.getDeviceHardwareId();
}
