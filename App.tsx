import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  Platform,
  TextInput,
  Alert,
  Switch,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Data storage imports
import {
  initializeData,
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  getHistoryLogs,
  saveHistoryLogs,
  getStudentProfile,
  saveStudentProfile,
  StudentProfile,
  getProfessorSubjects,
  saveProfessorSubjects,
  ProfessorSubject,
  PendingExcuse,
  getPendingExcuses,
  savePendingExcuses,
  getCurrentUser,
  saveCurrentUser,
  logoutCurrentUser,
  UserAccount,
  getClassrooms,
  saveClassrooms,
} from './src/data/storage';

import {
  Subject,
  Classroom,
  ActiveSession,
  StudentCheckInRecord,
  AttendanceSessionLog,
  INITIAL_SUBJECTS,
  INITIAL_CLASSROOMS,
} from './src/data/mockData';

// Screens imports
import ProfessorLauncher from './src/screens/ProfessorDashboard';
import ProfessorDashboardScreen from './src/screens/ProfessorDashboardScreen';
import StudentCheckIn from './src/screens/StudentCheckIn';
import StudentDashboard from './src/screens/StudentDashboard';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfessorSubjectsScreen from './src/screens/ProfessorSubjectsScreen';
import AuthScreen from './src/screens/AuthScreen';
import StudentTimetableScreen from './src/screens/StudentTimetableScreen';

type RoleType = 'professor' | 'student';
type StudentTab = 'dashboard' | 'checkin' | 'timetable' | 'history' | 'profile';
type ProfessorTab = 'dashboard' | 'launcher' | 'subjects' | 'history';

export default function App() {
  const [loading, setLoading] = useState(true);
  
  // Splash Screen States
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.95)).current;

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Role & Tabs state
  const [role, setRole] = useState<RoleType>('student');
  const [studentTab, setStudentTab] = useState<StudentTab>('dashboard');
  const [professorTab, setProfessorTab] = useState<ProfessorTab>('dashboard');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Entities state
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AttendanceSessionLog[]>([]);
  const [professorSubjects, setProfessorSubjects] = useState<ProfessorSubject[]>([]);
  
  // Classrooms State (persisted list of university areas)
  const [classrooms, setClassrooms] = useState<Classroom[]>(INITIAL_CLASSROOMS);

  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    studentId: '2024-0518',
    studentName: 'Katrina Santillan',
    avatarColor: '#1E5EFF',
    year: '3rd Year',
    section: 'Section B',
    isIrregular: false,
    homeAddress: '123 Taft Avenue, Manila',
    homeLatitude: 14.56841,
    homeLongitude: 120.99182,
    hasSecondAddress: false,
  });

  // Live incoming check-ins in the active class session
  const [liveRecords, setLiveRecords] = useState<StudentCheckInRecord[]>([]);

  // Load persistence and handle Splash Screen Timing
  useEffect(() => {
    // Fade in and scale up splash logo
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(splashScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    async function loadData() {
      const startTime = Date.now();
      await initializeData();
      const session = await getActiveSession();
      const logs = await getHistoryLogs();
      const profile = await getStudentProfile();
      const subjects = await getProfessorSubjects();
      const rooms = await getClassrooms();
      
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setRole(user.role);
        setIsAuthenticated(true);
      }

      setActiveSession(session);
      setHistoryLogs(logs);
      setStudentProfile(profile);
      setProfessorSubjects(subjects);
      setClassrooms(rooms);

      // Force splash screen display for at least 2.5 seconds for branding presence
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 2500 - elapsed);
      
      setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
          setLoading(false);
        });
      }, delay);
    }
    loadData();
  }, []);

  // Sync active session live check-ins simulation
  useEffect(() => {
    if (!activeSession) {
      setLiveRecords([]);
    }
  }, [activeSession]);

  // Handler: Auth success callback
  const handleLoginSuccess = async (user: UserAccount, selectedRole: 'professor' | 'student') => {
    setCurrentUser(user);
    setRole(selectedRole);
    setIsAuthenticated(true);

    // Reload context details from AsyncStorage
    const session = await getActiveSession();
    const logs = await getHistoryLogs();
    const profile = await getStudentProfile();
    const subjects = await getProfessorSubjects();

    setActiveSession(session);
    setHistoryLogs(logs);
    setStudentProfile(profile);
    setProfessorSubjects(subjects);
  };

  // Handler: Logout current user session
  const handleLogout = async () => {
    await logoutCurrentUser();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRole('student');
    setStudentTab('checkin');
    setProfessorTab('dashboard');
  };

  // Handler: Start session (Professor)
  const handleStartSession = async (
    subjectId: string, 
    classroomId: string, 
    secondsLimit: number, 
    isOnline: boolean,
    latitude?: number,
    longitude?: number
  ) => {
    const subject = professorSubjects.find(s => s.id === subjectId);
    const classroom = INITIAL_CLASSROOMS.find(c => c.id === classroomId);

    if (!subject || !classroom) return;

    const expiresAt = new Date(new Date().getTime() + secondsLimit * 1000).toISOString();
    const cleanSubjectCode = subject.code.replace(' ', '');
    
    // Add schedule notes to session e.g. "Shifted"
    const isShifted = subject.scheduleTime !== subject.originalScheduleTime;
    const scheduleSuffix = isShifted ? ' (Rescheduled Shift)' : '';

    const newSession: ActiveSession = {
      id: `session_${Date.now()}`,
      subjectId,
      subjectName: `${subject.code} - ${subject.name}${scheduleSuffix}`,
      classroomId,
      classroomName: classroom.name,
      qrCodePayload: `SECURE_ATTENDANCE_${cleanSubjectCode}`,
      createdAt: new Date().toISOString(),
      expiresAt,
      timeLimitSeconds: secondsLimit,
      isOnline,
      latitude,
      longitude,
    };

    setActiveSession(newSession);
    await saveActiveSession(newSession);
  };

  // Handler: Register custom classroom standpoint
  const handleRegisterClassroom = async (newRoom: Classroom) => {
    const updated = [...classrooms, newRoom];
    setClassrooms(updated);
    await saveClassrooms(updated);
  };

  // Handler: Student submits check-in
  const handleStudentCheckInSubmit = (record: StudentCheckInRecord) => {
    // Append to live session roster
    const exists = liveRecords.some(r => r.studentId === record.studentId);
    if (exists) {
      Alert.alert('Verification Warning', 'You have already checked in to this class session.');
      return;
    }

    // Check if another account has already checked in from the same device hardware
    if (record.deviceId) {
      const deviceUsedByOther = liveRecords.find(
        (r) => r.deviceId === record.deviceId && r.studentId !== record.studentId
      );
      if (deviceUsedByOther) {
        Alert.alert(
          'Device Binding Violation 🛡️',
          `Security block: Another student (${deviceUsedByOther.studentName}) has already checked in using this phone.\n\nAttendance is strictly limited to one check-in per physical device.`
        );
        return;
      }
    }

    setLiveRecords([...liveRecords, record]);
  };

  // Handler: Student submits excuse waiver without scanning QR code
  const handleStudentGeneralExcuseSubmit = async (subjectCode: string, reason: string, attachment: string, attachmentUri?: string) => {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const todayShortStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    let logUpdated = false;
    
    // Check if log is already completed and saved in history database
    const updatedLogs = historyLogs.map((log) => {
      if (log.subjectCode === subjectCode && (log.date === todayShortStr || log.date === todayStr)) {
        const alreadyExists = log.records.some(r => r.studentId === studentProfile.studentId);
        if (!alreadyExists) {
          logUpdated = true;
          const newExcuseRecord: StudentCheckInRecord = {
            studentId: studentProfile.studentId,
            studentName: studentProfile.studentName,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            selfieUri: '',
            latitude: 0,
            longitude: 0,
            distanceMeters: 0,
            qrVerified: false,
            selfieVerified: false,
            gpsVerified: false,
            verified: true,
            year: studentProfile.year,
            section: studentProfile.section,
            isIrregular: studentProfile.isIrregular,
            status: 'EXCUSED',
            excuseReason: reason,
            excuseAttachment: attachment,
            excuseAttachmentUri: attachmentUri,
          };
          return {
            ...log,
            records: [...log.records, newExcuseRecord],
            totalPresent: log.records.length + 1
          };
        }
      }
      return log;
    });

    if (logUpdated) {
      setHistoryLogs(updatedLogs);
      await saveHistoryLogs(updatedLogs);
      Alert.alert('Success', 'Excuse waiver has been attached to today\'s saved attendance log.');
      return;
    }

    // Save as pending, to be merged when the session is ended by the professor
    const pending = await getPendingExcuses();
    const newExcuse: PendingExcuse = {
      studentId: studentProfile.studentId,
      studentName: studentProfile.studentName,
      subjectCode: subjectCode,
      date: todayStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      excuseReason: reason,
      excuseAttachment: attachment,
      excuseAttachmentUri: attachmentUri,
      year: studentProfile.year,
      section: studentProfile.section,
      isIrregular: studentProfile.isIrregular,
    };

    await savePendingExcuses([...pending, newExcuse]);
    Alert.alert('Waiver Registered', 'Your excuse letter is queued for today\'s session. It will sync automatically when your professor completes roll call.');
  };

  // Handler: End session & save log (Professor)
  const handleEndSession = async (records: StudentCheckInRecord[]) => {
    if (!activeSession) return;

    const matchingSubject = professorSubjects.find(s => activeSession.subjectName.includes(s.code));
    const matchingSubjectCode = matchingSubject?.code || 'CS 301';

    // Retrieve pending excuses to merge them into this log
    const pending = await getPendingExcuses();
    const todayStr = new Date(activeSession.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const todayShortStr = new Date(activeSession.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const matchingExcuses = pending.filter(e => 
      e.subjectCode === matchingSubjectCode && 
      (e.date === todayStr || e.date === todayShortStr)
    );
    
    // Clear matched excuses
    const remainingExcuses = pending.filter(e => 
      !(e.subjectCode === matchingSubjectCode && 
        (e.date === todayStr || e.date === todayShortStr))
    );
    await savePendingExcuses(remainingExcuses);

    // Map matched excuses to check-in records
    const mappedExcuses: StudentCheckInRecord[] = matchingExcuses.map((exc) => ({
      studentId: exc.studentId,
      studentName: exc.studentName,
      timestamp: exc.timestamp,
      selfieUri: '',
      latitude: 0,
      longitude: 0,
      distanceMeters: 0,
      qrVerified: false,
      selfieVerified: false,
      gpsVerified: false,
      verified: true,
      year: exc.year,
      section: exc.section,
      isIrregular: exc.isIrregular,
      status: 'EXCUSED',
      excuseReason: exc.excuseReason,
      excuseAttachment: exc.excuseAttachment,
      excuseAttachmentUri: exc.excuseAttachmentUri,
    }));

    // Combine standard check-ins and excuses, filtering duplicate check-ins
    const finalRecordsMap = new Map<string, StudentCheckInRecord>();
    
    // Add excuses first
    mappedExcuses.forEach(r => finalRecordsMap.set(r.studentId, r));
    // Add live standard check-ins (overwriting duplicate student excuses if they verified in person)
    records.forEach(r => finalRecordsMap.set(r.studentId, r));

    const combinedRecords = Array.from(finalRecordsMap.values());

    const newLog: AttendanceSessionLog = {
      id: activeSession.id,
      subjectName: activeSession.subjectName,
      subjectCode: matchingSubjectCode,
      classroomName: activeSession.classroomName,
      date: new Date(activeSession.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: `${new Date(activeSession.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(activeSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      totalPresent: combinedRecords.length,
      records: combinedRecords,
      isOnline: activeSession.isOnline,
      year: matchingSubject?.year,
      section: matchingSubject?.section,
    };

    const updatedLogs = [newLog, ...historyLogs];
    setHistoryLogs(updatedLogs);
    await saveHistoryLogs(updatedLogs);

    setActiveSession(null);
    await clearActiveSession();
  };

  // Handler: Save dynamic professor semester subjects
  const handleSaveProfessorSubjects = async (updatedList: ProfessorSubject[]) => {
    setProfessorSubjects(updatedList);
    await saveProfessorSubjects(updatedList);
  };

  // Switch role and update view
  const toggleRole = () => {
    setRole(role === 'student' ? 'professor' : 'student');
  };

  // Render Student Profile View (Read-Only)
  const renderStudentProfileView = () => {
    return (
      <StudentProfileScreen
        profile={studentProfile}
        onLogout={handleLogout}
      />
    );
  };

  const renderActiveScreen = () => {
    if (role === 'professor') {
      switch (professorTab) {
        case 'dashboard':
          return (
            <ProfessorDashboardScreen
              currentUserName={currentUser?.name || 'Dr. Jane Smith'}
              onNavigateToLauncher={() => setProfessorTab('launcher')}
              onNavigateToSubjects={() => setProfessorTab('subjects')}
              onNavigateToHistory={() => setProfessorTab('history')}
            />
          );
        case 'launcher':
          return (
            <ProfessorLauncher
              subjects={professorSubjects}
              classrooms={classrooms}
              activeSession={activeSession}
              onStartSession={handleStartSession}
              onEndSession={handleEndSession}
              liveRecords={liveRecords}
              onRegisterClassroom={handleRegisterClassroom}
            />
          );
        case 'subjects':
          return (
            <ProfessorSubjectsScreen
              subjects={professorSubjects}
              onSaveSubjects={handleSaveProfessorSubjects}
            />
          );
        case 'history':
          return (
            <HistoryScreen
              logs={historyLogs}
              role="professor"
            />
          );
      }
    } else {
      switch (studentTab) {
        case 'dashboard':
          return (
            <StudentDashboard
              studentProfile={studentProfile}
              activeSession={activeSession}
              onNavigateToCheckIn={() => setStudentTab('checkin')}
            />
          );
        case 'checkin':
          return (
            <StudentCheckIn
              activeSession={activeSession}
              studentProfile={studentProfile}
              onCheckInSubmit={handleStudentCheckInSubmit}
              classroomCoords={classrooms}
              onSubmitGeneralExcuse={handleStudentGeneralExcuseSubmit}
              subjects={INITIAL_SUBJECTS}
            />
          );
        case 'timetable':
          return <StudentTimetableScreen />;
        case 'history':
          return (
            <HistoryScreen
              logs={historyLogs}
              role="student"
              studentId={studentProfile.studentId}
            />
          );
        case 'profile':
          return renderStudentProfileView();
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appContainer}>
        {showSplash ? (
          <Animated.View style={[styles.splashOverlay, { opacity: splashOpacity }]}>
            <View style={styles.splashContent}>
              <Animated.Image
                source={require('./assets/logo.png')}
                style={[
                  styles.splashLogo,
                  {
                    transform: [{ scale: splashScale }],
                  },
                ]}
                resizeMode="contain"
              />
              <ActivityIndicator size="small" color="#001833" style={styles.splashLoader} />
              <Text style={styles.splashVersion}>Version 1.0</Text>
            </View>
          </Animated.View>
        ) : !isAuthenticated ? (
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            <View style={styles.appHeader}>
              <Image source={require('./assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1000 }}>
                <TouchableOpacity style={styles.roleTogglePill} onPress={toggleRole}>
                  <Text style={styles.roleToggleText}>
                    Role: <Text style={styles.roleTextHighlight}>{role.toUpperCase()}</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ position: 'relative', padding: 4 }} 
                  onPress={() => Alert.alert('🔔 Notifications', 'No new class session updates at the moment.')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={22} color="#111827" />
                  <View 
                    style={{ 
                      position: 'absolute', 
                      top: 4, 
                      right: 4, 
                      width: 7, 
                      height: 7, 
                      borderRadius: 3.5, 
                      backgroundColor: '#1E5EFF' 
                    }} 
                  />
                </TouchableOpacity>

                {/* More Options / Settings Dropdown Trigger */}
                <TouchableOpacity 
                  style={[styles.menuTriggerBtn, isRoleDropdownOpen && styles.menuTriggerBtnActive]} 
                  onPress={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
                </TouchableOpacity>

                {/* Settings & Logout Dropdown Menu */}
                {isRoleDropdownOpen && (
                  <View style={[styles.roleDropdownMenu, { top: 40, right: 0 }]}>
                    <TouchableOpacity 
                      style={styles.dropdownMenuItem}
                      onPress={() => {
                        setIsRoleDropdownOpen(false);
                        if (role === 'student') {
                          setStudentTab('profile');
                        } else {
                          setProfessorTab('subjects');
                        }
                      }}
                    >
                      <Ionicons name="settings-outline" size={15} color="#111827" style={{ marginRight: 8 }} />
                      <Text style={styles.dropdownMenuItemText}>Settings</Text>
                    </TouchableOpacity>

                    <View style={styles.dropdownMenuDivider} />

                    <TouchableOpacity 
                      style={styles.dropdownMenuItem}
                      onPress={() => {
                        setIsRoleDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <Ionicons name="log-out-outline" size={15} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={[styles.dropdownMenuItemText, { color: '#EF4444' }]}>Log Out</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Content View */}
            <View style={styles.mainContent}>{renderActiveScreen()}</View>

            {/* Dynamic Bottom Navigation tab bar depending on Role */}
            <View style={styles.tabBar}>
              {role === 'professor' ? (
                <>
                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('dashboard')}
                  >
                    <View style={[styles.tabIndicator, professorTab === 'dashboard' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={professorTab === 'dashboard' ? 'grid' : 'grid-outline'}
                      size={20}
                      color={professorTab === 'dashboard' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'dashboard' && styles.tabLabelActive]}>
                      Dashboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('launcher')}
                  >
                    <View style={[styles.tabIndicator, professorTab === 'launcher' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={professorTab === 'launcher' ? 'rocket' : 'rocket-outline'}
                      size={20}
                      color={professorTab === 'launcher' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'launcher' && styles.tabLabelActive]}>
                      Roll Call
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('subjects')}
                  >
                    <View style={[styles.tabIndicator, professorTab === 'subjects' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={professorTab === 'subjects' ? 'book' : 'book-outline'}
                      size={20}
                      color={professorTab === 'subjects' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'subjects' && styles.tabLabelActive]}>
                      Subjects
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('history')}
                  >
                    <View style={[styles.tabIndicator, professorTab === 'history' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={professorTab === 'history' ? 'calendar' : 'calendar-outline'}
                      size={20}
                      color={professorTab === 'history' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'history' && styles.tabLabelActive]}>
                      Logs
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('dashboard')}
                  >
                    <View style={[styles.tabIndicator, studentTab === 'dashboard' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={studentTab === 'dashboard' ? 'home' : 'home-outline'}
                      size={20}
                      color={studentTab === 'dashboard' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'dashboard' && styles.tabLabelActive]}>
                      Dashboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('checkin')}
                  >
                    <View style={[styles.tabIndicator, studentTab === 'checkin' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={studentTab === 'checkin' ? 'qr-code' : 'qr-code-outline'}
                      size={20}
                      color={studentTab === 'checkin' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'checkin' && styles.tabLabelActive]}>
                      Check In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('timetable')}
                  >
                    <View style={[styles.tabIndicator, studentTab === 'timetable' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={studentTab === 'timetable' ? 'calendar' : 'calendar-outline'}
                      size={20}
                      color={studentTab === 'timetable' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'timetable' && styles.tabLabelActive]}>
                      Timetable
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('history')}
                  >
                    <View style={[styles.tabIndicator, studentTab === 'history' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={studentTab === 'history' ? 'time' : 'time-outline'}
                      size={20}
                      color={studentTab === 'history' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'history' && styles.tabLabelActive]}>
                      Logs
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('profile')}
                  >
                    <View style={[styles.tabIndicator, studentTab === 'profile' && styles.tabIndicatorActive]} />
                    <Ionicons
                      name={studentTab === 'profile' ? 'person' : 'person-outline'}
                      size={20}
                      color={studentTab === 'profile' ? '#1E5EFF' : '#6B7280'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'profile' && styles.tabLabelActive]}>
                      Identity
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// Student Profile Settings View (Locked Read-Only version)
interface ProfileProps {
  profile: StudentProfile;
  onLogout: () => void;
}

function StudentProfileScreen({ profile, onLogout }: ProfileProps) {
  const id = profile.studentId;
  const name = profile.studentName;
  const year = profile.year;
  const section = profile.section;
  const isIrregular = profile.isIrregular;
  const homeAddress = profile.homeAddress;
  const hasSecondAddress = profile.hasSecondAddress || false;
  const secondAddress = profile.secondAddress || '';

  return (
    <ScrollView style={styles.profileContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileHeaderTitle}>Student Credentials</Text>
        <Text style={styles.profileHeaderSub}>🔒 Registered identity details. Profile modifications are locked for security verification.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.idCardHeader}>
          <View style={[styles.avatarCircleLarge, { backgroundColor: '#1E5EFF' }]}>
            <Text style={styles.avatarTextLarge}>{name.slice(0, 1).toUpperCase() || '👤'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.idCardTitleRow}>
              <Text style={styles.idCardName} numberOfLines={1}>{name || 'Student Name'}</Text>
              {isIrregular && (
                <View style={styles.idCardIrregBadge}>
                  <Text style={styles.idCardIrregBadgeText}>IRREGULAR</Text>
                </View>
              )}
            </View>
            <Text style={styles.idCardNum}>ID: {id || '---'}</Text>
            <Text style={styles.idCardClass}>{year} • {section}</Text>
            <Text style={styles.idCardHome} numberOfLines={1}>📍 Primary: {homeAddress || 'No Address Set'}</Text>
            {hasSecondAddress && (
              <Text style={styles.idCardHome} numberOfLines={1}>🏠 Boarding: {secondAddress || 'No Address Set'}</Text>
            )}
          </View>
        </View>
      </View>



      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Full Name</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={name}
          editable={false}
        />

        <Text style={styles.formLabel}>Student ID Number</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={id}
          editable={false}
        />

        <Text style={styles.formLabel}>Year Level</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={year}
          editable={false}
        />

        <Text style={styles.formLabel}>Section</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={section}
          editable={false}
        />

        <Text style={styles.formLabel}>Primary Home Address</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={homeAddress}
          editable={false}
        />

        {hasSecondAddress && (
          <>
            <Text style={styles.formLabel}>Secondary Address (Boarding House/Apartment)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={secondAddress}
              editable={false}
            />
          </>
        )}

        {/* Enrollment Status toggle - Disabled */}
        <View style={styles.statusSwitchRow}>
          <View>
            <Text style={styles.switchLabel}>Irregular Student</Text>
            <Text style={styles.switchSubText}>Enable if taking courses outside curriculum year</Text>
          </View>
          <Switch
            value={isIrregular}
            disabled={true}
            trackColor={{ false: '#e5e7eb', true: '#F59E0B' }}
            thumbColor="#ffffff"
            style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
          />
        </View>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#EF44440d', 
            borderColor: '#EF444430', 
            borderWidth: 1, 
            borderRadius: 12, 
            paddingVertical: 14, 
            alignItems: 'center', 
            marginTop: 16 
          }} 
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800' }}>Log Out Account</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  appContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    zIndex: 10000,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E5EFF',
    letterSpacing: -1,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  roleTogglePill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  roleTextHighlight: {
    color: '#1E5EFF',
  },
  roleDropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 4,
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    width: 130,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
      } as any,
    }),
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dropdownMenuItemText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
  },
  dropdownMenuDivider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  menuTriggerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTriggerBtnActive: {
    borderColor: '#1E5EFF',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 64,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabIndicator: {
    height: 3,
    width: 36,
    backgroundColor: 'transparent',
    marginBottom: 4,
    borderRadius: 1.5,
  },
  tabIndicatorActive: {
    backgroundColor: '#1E5EFF',
  },
  tabLabel: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#1E5EFF',
  },
  // Splash Screen specific layout
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  splashContent: {
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 100, // Make room for version
  },
  splashLogo: {
    width: 300,
    height: 200,
  },
  splashLoader: {
    marginTop: 20,
  },
  splashVersion: {
    position: 'absolute',
    bottom: 20,
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  // Profile specific styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileHeader: {
    marginBottom: 20,
  },
  profileHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  profileHeaderSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  idCardHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  avatarCircleLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  idCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idCardName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  idCardIrregBadge: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F59E0B',
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  idCardIrregBadgeText: {
    color: '#F59E0B',
    fontSize: 7,
    fontWeight: '900',
  },
  idCardNum: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  idCardClass: {
    color: '#d2d2d7',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  idCardHome: {
    color: '#ffffff99',
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  idCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ffffff22',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  idCardBadge: {
    color: '#ffffffaa',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 40,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 10,
  },
  disabledInput: {
    backgroundColor: '#FAFBFC',
    borderColor: '#E5E7EB',
    color: '#6B7280',
  },
  statusSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  switchSubText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },

});
