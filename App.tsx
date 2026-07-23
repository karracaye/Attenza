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
  startProfessorSession,
  endProfessorSession,
  getLiveSessionRecords,
  submitStudentCheckIn,
  submitStudentExcuse,
} from './src/services/api';

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
import HistoryScreen, { formatAcademicSection } from './src/screens/HistoryScreen';
import ProfessorSubjectsScreen from './src/screens/ProfessorSubjectsScreen';
import AuthScreen from './src/screens/AuthScreen';
import StudentTimetableScreen from './src/screens/StudentTimetableScreen';
import ProfessorProfileScreen from './src/screens/ProfessorProfileScreen';

type RoleType = 'professor' | 'student';
type StudentTab = 'dashboard' | 'checkin' | 'timetable' | 'history' | 'profile';
type ProfessorTab = 'dashboard' | 'launcher' | 'subjects' | 'history' | 'profile';

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

  // Appearance States (Accessible across screens)
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [appLanguage, setAppLanguage] = useState<'English' | 'Filipino' | 'Spanish'>('English');
  const [appFontSize, setAppFontSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');

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
      
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setRole(user.role);
        setIsAuthenticated(true);
      }

      const session = await getActiveSession();
      const logs = await getHistoryLogs(user?.role, user?.usernameId);
      const profile = await getStudentProfile(user?.usernameId);
      const subjects = await getProfessorSubjects(user?.usernameId);
      const rooms = await getClassrooms();

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

  // Sync active session live check-ins database polling
  useEffect(() => {
    if (!activeSession) {
      setLiveRecords([]);
      return;
    }

    const fetchLiveRecords = async () => {
      try {
        const records = await getLiveSessionRecords(activeSession.id);
        if (records) {
          const normalized = records.map(r => ({
            id: r.id,
            sessionId: r.session_id || r.sessionId,
            studentId: r.student_id || r.studentId,
            studentName: r.student_name || r.studentName,
            year: r.year,
            section: r.section,
            isIrregular: r.is_irregular !== undefined ? !!r.is_irregular : !!r.isIrregular,
            status: r.status,
            timestamp: r.timestamp,
            qrVerified: r.qr_verified !== undefined ? !!r.qr_verified : !!r.qrVerified,
            selfieVerified: r.selfie_verified !== undefined ? !!r.selfie_verified : !!r.selfieVerified,
            gpsVerified: r.gps_verified !== undefined ? !!r.gps_verified : !!r.gpsVerified,
            distanceMeters: r.distance_meters !== undefined ? r.distance_meters : r.distanceMeters,
            latitude: r.latitude,
            longitude: r.longitude,
            isRemoteStandpoint: r.is_remote_standpoint !== undefined ? !!r.is_remote_standpoint : !!r.isRemoteStandpoint,
            remoteLocationName: r.remote_location_name || r.remoteLocationName,
            remoteLocationReason: r.remote_location_reason || r.remoteLocationReason,
            verified: true,
          }));
          setLiveRecords(normalized);
        }
      } catch (err) {
        console.warn('Polling live records error:', err);
      }
    };
    
    fetchLiveRecords();
    const interval = setInterval(fetchLiveRecords, 2000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Handler: Auth success callback
  const handleLoginSuccess = async (user: UserAccount, selectedRole: 'professor' | 'student') => {
    setCurrentUser(user);
    setRole(selectedRole);
    setIsAuthenticated(true);

    // Reload context details from Server
    const session = await getActiveSession();
    const logs = await getHistoryLogs(selectedRole, user.usernameId);
    const profile = await getStudentProfile(user.usernameId);
    const subjects = await getProfessorSubjects(user.usernameId);

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
    const classroom = classrooms.find(c => c.id === classroomId);

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
    await startProfessorSession(newSession);
  };

  // Handler: Register custom classroom standpoint
  const handleRegisterClassroom = async (newRoom: Classroom) => {
    const updated = [...classrooms, newRoom];
    setClassrooms(updated);
    await saveClassrooms(updated);
  };

  // Handler: Student submits check-in
  const handleStudentCheckInSubmit = async (record: StudentCheckInRecord) => {
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
    await submitStudentCheckIn(record);
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

    await submitStudentExcuse(newExcuse);
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
    await endProfessorSession(activeSession, combinedRecords);
    setActiveSession(null);
  };

  // Handler: Save dynamic professor semester subjects
  const handleSaveProfessorSubjects = async (updatedList: ProfessorSubject[]) => {
    setProfessorSubjects(updatedList);
    await saveProfessorSubjects(updatedList, currentUser?.usernameId);
  };

  // Switch role and update view
  const toggleRole = async () => {
    const nextRole = role === 'student' ? 'professor' : 'student';
    setRole(nextRole);
    if (nextRole === 'professor') {
      const profId = currentUser && currentUser.role === 'professor' ? currentUser.usernameId : 'prof1';
      try {
        const subjectsList = await getProfessorSubjects(profId);
        setProfessorSubjects(subjectsList);
      } catch (err) {
        console.warn('Failed to load professor subjects on toggle:', err);
      }
    }
  };

  // Render Student Profile View (Settings Panel)
  const renderStudentProfileView = () => {
    return (
      <StudentProfileScreen
        profile={studentProfile}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        appLanguage={appLanguage}
        setAppLanguage={setAppLanguage}
        appFontSize={appFontSize}
        setAppFontSize={setAppFontSize}
      />
    );
  };

  const renderActiveScreen = () => {
    if (role === 'professor') {
      switch (professorTab) {
        case 'dashboard':
          return (
            <ProfessorDashboardScreen
              currentUserName={currentUser && currentUser.role === 'professor' ? currentUser.name : 'Dr. Jane Smith'}
              onNavigateToLauncher={() => setProfessorTab('launcher')}
              onNavigateToSubjects={() => setProfessorTab('subjects')}
              onNavigateToHistory={() => setProfessorTab('history')}
              historyLogs={historyLogs}
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
          );
        case 'subjects':
          return (
            <ProfessorSubjectsScreen
              subjects={professorSubjects}
              onSaveSubjects={handleSaveProfessorSubjects}
              isDarkMode={isDarkMode}
            />
          );
        case 'history':
          return (
            <HistoryScreen
              logs={historyLogs}
              role="professor"
              isDarkMode={isDarkMode}
            />
          );
        case 'profile':
          return (
            <ProfessorProfileScreen
              onLogout={handleLogout}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              appLanguage={appLanguage}
              setAppLanguage={setAppLanguage}
              appFontSize={appFontSize}
              setAppFontSize={setAppFontSize}
              currentUserName={currentUser && currentUser.role === 'professor' ? currentUser.name : 'Dr. Jane Smith'}
              currentUserEmail={currentUser && currentUser.role === 'professor' ? currentUser.email : 'professor@university.edu'}
              currentUserId={currentUser && currentUser.role === 'professor' ? currentUser.usernameId : 'prof1'}
              historyLogs={historyLogs}
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
              historyLogs={historyLogs}
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
          );
        case 'timetable':
          return <StudentTimetableScreen isDarkMode={isDarkMode} />;
        case 'history':
          return (
            <HistoryScreen
              logs={historyLogs}
              role="student"
              studentId={studentProfile.studentId}
              isDarkMode={isDarkMode}
            />
          );
        case 'profile':
          return renderStudentProfileView();
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#111827' : '#ffffff' }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.appContainer, { backgroundColor: isDarkMode ? '#111827' : '#ffffff' }]}>
        {showSplash ? (
          <Animated.View style={[styles.splashOverlay, { opacity: splashOpacity, backgroundColor: isDarkMode ? '#111827' : '#ffffff' }]}>
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
              <ActivityIndicator size="small" color={isDarkMode ? '#ffffff' : '#001833'} style={styles.splashLoader} />
              <Text style={[styles.splashVersion, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>Version 1.0</Text>
            </View>
          </Animated.View>
        ) : !isAuthenticated ? (
          <AuthScreen onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} />
        ) : (
          <>
            <View style={[styles.appHeader, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff', borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
              <TouchableOpacity
                onPress={() => {
                  if (role === 'student') {
                    setStudentTab('dashboard');
                  } else {
                    setProfessorTab('dashboard');
                  }
                }}
                activeOpacity={0.7}
              >
                <Image source={require('./assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1000 }}>
                <TouchableOpacity style={[styles.roleTogglePill, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]} onPress={toggleRole}>
                  <Text style={[styles.roleToggleText, { color: isDarkMode ? '#E5E7EB' : '#374151' }]}>
                    Role: <Text style={styles.roleTextHighlight}>
                      {currentUser 
                        ? (role === currentUser.role 
                          ? currentUser.name 
                          : (role === 'professor' ? 'Dr. Jane Smith' : (studentProfile?.studentName || 'Katrina Santillan')))
                        : role.toUpperCase()}
                    </Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ position: 'relative', padding: 4 }} 
                  onPress={() => Alert.alert('🔔 Notifications', 'No new class session updates at the moment.')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={22} color={isDarkMode ? '#F3F4F6' : '#111827'} />
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
                  <Ionicons name="ellipsis-vertical" size={20} color={isDarkMode ? '#F3F4F6' : '#111827'} />
                </TouchableOpacity>

                {/* Settings & Logout Dropdown Menu */}
                {isRoleDropdownOpen && (
                  <View style={[styles.roleDropdownMenu, { top: 40, right: 0, backgroundColor: isDarkMode ? '#1F2937' : '#ffffff', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
                    <TouchableOpacity 
                      style={styles.dropdownMenuItem}
                      onPress={() => {
                        setIsRoleDropdownOpen(false);
                        if (role === 'student') {
                          setStudentTab('profile');
                        } else {
                          setProfessorTab('profile');
                        }
                      }}
                    >
                      <Ionicons name="settings-outline" size={15} color={isDarkMode ? '#F3F4F6' : '#111827'} style={{ marginRight: 8 }} />
                      <Text style={[styles.dropdownMenuItemText, { color: isDarkMode ? '#F3F4F6' : '#111827' }]}>Settings</Text>
                    </TouchableOpacity>

                    <View style={[styles.dropdownMenuDivider, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />

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
            <View style={[styles.mainContent, { backgroundColor: isDarkMode ? '#111827' : '#ffffff' }]}>{renderActiveScreen()}</View>

            {/* Dynamic Bottom Navigation tab bar depending on Role */}
            <View style={[styles.tabBar, { backgroundColor: isDarkMode ? '#1F2937' : '#ffffff', borderTopColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
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
                      color={professorTab === 'dashboard' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'dashboard' && styles.tabLabelActive, { color: professorTab === 'dashboard' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={professorTab === 'launcher' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'launcher' && styles.tabLabelActive, { color: professorTab === 'launcher' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={professorTab === 'subjects' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'subjects' && styles.tabLabelActive, { color: professorTab === 'subjects' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={professorTab === 'history' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'history' && styles.tabLabelActive, { color: professorTab === 'history' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={studentTab === 'dashboard' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'dashboard' && styles.tabLabelActive, { color: studentTab === 'dashboard' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={studentTab === 'checkin' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'checkin' && styles.tabLabelActive, { color: studentTab === 'checkin' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={studentTab === 'timetable' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'timetable' && styles.tabLabelActive, { color: studentTab === 'timetable' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={studentTab === 'history' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'history' && styles.tabLabelActive, { color: studentTab === 'history' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
                      color={studentTab === 'profile' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'profile' && styles.tabLabelActive, { color: studentTab === 'profile' ? '#1E5EFF' : (isDarkMode ? '#9CA3AF' : '#6B7280') }]}>
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
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  appLanguage: 'English' | 'Filipino' | 'Spanish';
  setAppLanguage: (val: 'English' | 'Filipino' | 'Spanish') => void;
  appFontSize: 'Small' | 'Medium' | 'Large';
  setAppFontSize: (val: 'Small' | 'Medium' | 'Large') => void;
}

function StudentProfileScreen({
  profile,
  onLogout,
  isDarkMode,
  setIsDarkMode,
  appLanguage,
  setAppLanguage,
  appFontSize,
  setAppFontSize,
}: ProfileProps) {
  const id = profile.studentId;
  const name = profile.studentName;
  const year = profile.year;
  const section = profile.section;
  const isIrregular = profile.isIrregular;

  // Accordion Toggle States
  const [isAccountOpen, setIsAccountOpen] = useState(true);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Form State Values
  const [email, setEmail] = useState(`${id}@university.edu.ph`);
  const [password, setPassword] = useState('••••••••••••');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // System theme is local state
  const [systemTheme, setSystemTheme] = useState(true);

  // Hardcoded device identifier
  const [hardwareId, setHardwareId] = useState('F8C2-E40B-998A-3211-DE5F');

  // Translation mapping dictionary
  const translations = {
    English: {
      title: 'Settings & Profile',
      sub: 'Manage your student account, modify appearance options, and review privacy details.',
      account: 'Account',
      profileInfo: 'Profile Information',
      studentId: 'Student ID',
      email: 'University Email',
      password: 'Security Password',
      linkedDevices: 'Linked Devices',
      appearance: 'Appearance',
      lightDark: 'Light / Dark Mode',
      lightDarkSub: 'Switch app color mode layout',
      systemTheme: 'System Theme',
      systemThemeSub: 'Sync theme to match mobile OS',
      language: 'App Language',
      languageSub: 'Currently configured vocabulary',
      fontSize: 'Font Size',
      privacy: 'Privacy & Security',
      privacyPolicy: 'Privacy Policy',
      terms: 'Terms & Conditions',
      delete: 'Delete Account',
      logout: 'Log Out Account',
      about: 'About Attenza',
    },
    Filipino: {
      title: 'Mga Setting at Profile',
      sub: 'Pamahalaan ang iyong account ng mag-aaral, baguhin ang mga pagpipilian sa hitsura, at suriin ang mga detalye ng privacy.',
      account: 'Account',
      profileInfo: 'Impormasyon ng Profile',
      studentId: 'Student ID',
      email: 'Email ng Unibersidad',
      password: 'Password sa Seguridad',
      linkedDevices: 'Mga Nakakonektang Device',
      appearance: 'Hitsura',
      lightDark: 'Light / Dark Mode',
      lightDarkSub: 'Baguhin ang kulay at tema ng app',
      systemTheme: 'Tema ng Sistema',
      systemThemeSub: 'I-sync ang tema sa mobile OS',
      language: 'Wika ng App',
      languageSub: 'Kasalukuyang ginagamit na wika',
      fontSize: 'Laki ng Font',
      privacy: 'Privacy at Seguridad',
      privacyPolicy: 'Patakaran sa Privacy',
      terms: 'Mga Tuntunin at Kundisyon',
      delete: 'I-delete ang Account',
      logout: 'Mag-log Out ng Account',
      about: 'Tungkol sa Attenza',
    },
    Spanish: {
      title: 'Configuración y Perfil',
      sub: 'Administre su cuenta de estudiante, modifique las opciones de apariencia y revise los detalles de privacidad.',
      account: 'Cuenta',
      profileInfo: 'Información de Perfil',
      studentId: 'ID de Estudiante',
      email: 'Correo de la Universidad',
      password: 'Contraseña de Seguridad',
      linkedDevices: 'Dispositivos Vinculados',
      appearance: 'Apariencia',
      lightDark: 'Modo Claro / Oscuro',
      lightDarkSub: 'Cambiar el tema de color de la aplicación',
      systemTheme: 'Tema del Sistema',
      systemThemeSub: 'Sincronizar el tema con el sistema operativo móvil',
      language: 'Idioma de la App',
      languageSub: 'Vocabulario configurado actualmente',
      fontSize: 'Tamaño de Fuente',
      privacy: 'Privacidad y Seguridad',
      privacyPolicy: 'Política de Privacidad',
      terms: 'Términos y Condiciones',
      delete: 'Eliminar Cuenta',
      logout: 'Cerrar Sesión',
      about: 'Acerca de Attenza',
    }
  };
  const t = translations[appLanguage] || translations.English;

  // Active theme properties
  const theme = {
    bg: isDarkMode ? '#111827' : '#FAFBFC',
    text: isDarkMode ? '#F9FAFB' : '#111827',
    subText: isDarkMode ? '#9CA3AF' : '#6B7280',
    cardBg: isDarkMode ? '#1F2937' : '#ffffff',
    cardBorder: isDarkMode ? '#374151' : '#E5E7EB',
    disabledInputBg: isDarkMode ? '#37415160' : '#FAFBFC',
    inputText: isDarkMode ? '#F3F4F6' : '#374151',
    accordionHeaderBg: isDarkMode ? '#1F2937' : '#FAFBFC',
    innerCardBg: isDarkMode ? '#11182740' : '#FAFBFC',
    deviceDetailGroupBg: isDarkMode ? '#11182740' : '#F9FAFB',
  };

  // Active font scaling mapper
  const getFontSize = (baseSize: number) => {
    if (appFontSize === 'Small') return baseSize * 0.85;
    if (appFontSize === 'Large') return baseSize * 1.15;
    return baseSize;
  };

  const handleChangePassword = () => {
    if (isChangingPassword) {
      if (newPassword.trim().length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters.');
        return;
      }
      setPassword(newPassword.replace(/./g, '•'));
      setIsChangingPassword(false);
      setNewPassword('');
      Alert.alert('Success', 'Password changed successfully!');
    } else {
      setIsChangingPassword(true);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'Are you sure you want to request account deletion? This action requires administrative approval from the University registrar.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Deletion', style: 'destructive', onPress: () => Alert.alert('Request Sent', 'Your account deletion request has been submitted for review.') }
      ]
    );
  };

  return (
    <ScrollView style={[styles.profileContainer, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <Text style={[styles.profileHeaderTitle, { color: theme.text, fontSize: getFontSize(20) }]}>{t.title}</Text>
        <Text style={[styles.profileHeaderSub, { color: theme.subText, fontSize: getFontSize(12) }]}>{t.sub}</Text>
      </View>

      {/* ACCORDION 1: ACCOUNT */}
      <View style={[styles.accordionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.accordionHeader, { backgroundColor: theme.accordionHeaderBg }]} 
          onPress={() => setIsAccountOpen(!isAccountOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="person-circle" size={24} color="#1E5EFF" style={{ marginRight: 10 }} />
            <Text style={[styles.accordionTitle, { color: theme.text, fontSize: getFontSize(14) }]}>{t.account}</Text>
          </View>
          <Ionicons 
            name={isAccountOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={18} 
            color={theme.subText} 
          />
        </TouchableOpacity>

        {isAccountOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.cardBorder }]}>
            {/* Profile Information ID Card preview */}
            <View style={[styles.innerCard, { backgroundColor: theme.innerCardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.idCardHeader}>
                <View style={[styles.avatarCircleLarge, { backgroundColor: '#1E5EFF', width: 44, height: 44, borderRadius: 22 }]}>
                  <Text style={[styles.avatarTextLarge, { fontSize: getFontSize(18) }]}>{name.slice(0, 1).toUpperCase() || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.idCardName, { color: theme.text, fontSize: getFontSize(15) }]}>{name}</Text>
                  <Text style={[styles.idCardClass, { color: theme.subText, fontSize: getFontSize(11), marginTop: 1 }]}>
                    {formatAcademicSection('CS 402', year, section)}  •  {isIrregular ? 'Irregular' : 'Regular'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Profile Information details (Disabled inputs) */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>{t.profileInfo}</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.disabledInputBg, color: theme.subText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={name}
              editable={false}
            />

            {/* Student ID */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>{t.studentId}</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.disabledInputBg, color: theme.subText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={id}
              editable={false}
            />

            {/* University Email */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>{t.email}</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.disabledInputBg, color: theme.subText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={email}
              editable={false}
            />

            {/* Change Password */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>{t.password}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: theme.cardBg, color: theme.inputText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
                value={isChangingPassword ? newPassword : password}
                onChangeText={setNewPassword}
                secureTextEntry={isChangingPassword}
                placeholder={isChangingPassword ? 'Enter new password' : ''}
                placeholderTextColor={theme.subText}
                editable={isChangingPassword}
              />
              <TouchableOpacity style={styles.innerBtn} onPress={handleChangePassword}>
                <Text style={[styles.innerBtnText, { fontSize: getFontSize(12) }]}>{isChangingPassword ? 'Confirm' : 'Change'}</Text>
              </TouchableOpacity>
            </View>

            {/* Linked Devices */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>{t.linkedDevices}</Text>
            <View style={[styles.deviceDetailGroup, { backgroundColor: theme.deviceDetailGroupBg, borderColor: theme.cardBorder }]}>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Active Device Signature:</Text>
                <Text style={[styles.deviceDetailVal, { color: theme.text, fontSize: getFontSize(10.5) }]}>{hardwareId}</Text>
              </View>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Hardware Status:</Text>
                <Text style={[styles.deviceDetailVal, { color: '#22C55E', fontWeight: '800', fontSize: getFontSize(11) }]}>✓ Verified & Device Locked</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 2: APPEARANCE */}
      <View style={[styles.accordionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.accordionHeader, { backgroundColor: theme.accordionHeaderBg }]} 
          onPress={() => setIsAppearanceOpen(!isAppearanceOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="color-palette" size={24} color="#1E5EFF" style={{ marginRight: 10 }} />
            <Text style={[styles.accordionTitle, { color: theme.text, fontSize: getFontSize(14) }]}>{t.appearance}</Text>
          </View>
          <Ionicons 
            name={isAppearanceOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={18} 
            color={theme.subText} 
          />
        </TouchableOpacity>

        {isAppearanceOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.cardBorder }]}>
            {/* Light/Dark Mode */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>{t.lightDark}</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>{t.lightDarkSub}</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>

            {/* System Theme */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>{t.systemTheme}</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>{t.systemThemeSub}</Text>
              </View>
              <Switch
                value={systemTheme}
                onValueChange={setSystemTheme}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>

            {/* App Language */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>{t.language}</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>{t.languageSub}</Text>
              </View>
              <TouchableOpacity
                style={[styles.badgeSelector, { backgroundColor: theme.innerCardBg, borderColor: theme.cardBorder }]}
                onPress={() => {
                  Alert.alert(
                    'App Language',
                    'Select your preferred display language:',
                    [
                      { text: 'English', onPress: () => setAppLanguage('English') },
                      { text: 'Filipino', onPress: () => setAppLanguage('Filipino') },
                      { text: 'Spanish', onPress: () => setAppLanguage('Spanish') },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.badgeSelectorText}>{appLanguage} ▾</Text>
              </TouchableOpacity>
            </View>

            {/* Font Size Selector */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>{t.fontSize}</Text>
            <View style={styles.fontSizeRow}>
              {(['Small', 'Medium', 'Large'] as const).map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[styles.fontSizePill, { borderColor: theme.cardBorder, backgroundColor: theme.innerCardBg }, appFontSize === sz && styles.fontSizePillActive]}
                  onPress={() => setAppFontSize(sz)}
                >
                  <Text style={[styles.fontSizeText, { fontSize: getFontSize(11) }, appFontSize === sz && styles.fontSizeTextActive]}>{sz}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 3: ABOUT */}
      <View style={[styles.accordionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.accordionHeader, { backgroundColor: theme.accordionHeaderBg }]} 
          onPress={() => setIsAboutOpen(!isAboutOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="information-circle" size={24} color="#1E5EFF" style={{ marginRight: 10 }} />
            <Text style={[styles.accordionTitle, { color: theme.text, fontSize: getFontSize(14) }]}>{t.about}</Text>
          </View>
          <Ionicons 
            name={isAboutOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={18} 
            color={theme.subText} 
          />
        </TouchableOpacity>

        {isAboutOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.cardBorder }]}>
            {/* App version */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>App Version</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Current release code package</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: getFontSize(12.5) }}>Version 1.0.4</Text>
            </View>

            {/* Help Center */}
            <TouchableOpacity 
              style={[styles.legalLinkRow, { borderBottomColor: theme.cardBorder }]} 
              onPress={() => Alert.alert('Help Center', 'Need assistance? Browse student help guides, selfie verification fixes, and geofencing coordinates instructions.')}
            >
              <Ionicons name="help-buoy-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Help Center Portal</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Contact Support */}
            <TouchableOpacity 
              style={[styles.legalLinkRow, { borderBottomColor: theme.cardBorder }]} 
              onPress={() => Alert.alert('Contact Support', 'Official IT administration support email: support.attenza@university.edu.ph')}
            >
              <Ionicons name="mail-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Contact Support</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Report a Bug */}
            <TouchableOpacity 
              style={[styles.legalLinkRow, { borderBottomColor: theme.cardBorder }]} 
              onPress={() => Alert.alert('Report a Bug', 'Found an issue with geofence proximity or scanning failures? Tap to log a telemetry report file.')}
            >
              <Ionicons name="bug-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Report a Bug</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity 
              style={[styles.legalLinkRow, { borderBottomColor: theme.cardBorder }]} 
              onPress={() => Alert.alert('Privacy Policy', 'Your personal account info, camera selfies, and GPS coordinate checkpoints are only visible to course instructors and are deleted automatically at the end of the academic period.')}
            >
              <Ionicons name="document-text-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Terms & Conditions */}
            <TouchableOpacity 
              style={[styles.legalLinkRow, { borderBottomColor: theme.cardBorder }]} 
              onPress={() => Alert.alert('Terms & Conditions', 'By checking in on Attenza, you certify that you are physically present in the designated classroom and checking in on your own locked device. Proxy check-ins are strictly prohibited.')}
            >
              <Ionicons name="ribbon-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity 
              style={[styles.deleteAccountBtn, { borderColor: isDarkMode ? '#EF444450' : '#EF444420', marginTop: 14 }]} 
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={[styles.deleteAccountBtnText, { fontSize: getFontSize(13) }]}>{t.delete}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* LOG OUT BUTTON */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={onLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
        <Text style={[styles.logoutBtnText, { fontSize: getFontSize(13) }]}>{t.logout}</Text>
      </TouchableOpacity>

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
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  sectionTitleLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSubLabel: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 15,
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
  switchRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  switchRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 10,
  },
  saveBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  settingToggleTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 15,
  },
  settingMainText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  settingSubText: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 2,
  },
  deviceDetailGroup: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginTop: 8,
  },
  deviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  deviceDetailLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  deviceDetailVal: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#EF44440d',
    borderColor: '#EF444430',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  accordionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFBFC',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  accordionBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  innerCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 16,
  },
  innerBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  badgeSelector: {
    backgroundColor: '#E5E7EB30',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeSelectorText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E5EFF',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  fontSizePill: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fontSizePillActive: {
    backgroundColor: '#1E5EFF',
    borderColor: '#1E5EFF',
  },
  fontSizeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  fontSizeTextActive: {
    color: '#ffffff',
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  legalLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF44440d',
    borderColor: '#EF444420',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
  },
  deleteAccountBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
  },
});
