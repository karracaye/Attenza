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

  // Entities state
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AttendanceSessionLog[]>([]);
  const [professorSubjects, setProfessorSubjects] = useState<ProfessorSubject[]>([]);
  
  // Classrooms State (persisted list of university areas)
  const [classrooms, setClassrooms] = useState<Classroom[]>(INITIAL_CLASSROOMS);

  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
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
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity style={styles.roleTogglePill} onPress={toggleRole}>
                  <Text style={styles.roleToggleText}>
                    Role: <Text style={styles.roleTextHighlight}>{role.toUpperCase()}</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                  <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
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
                    <Ionicons
                      name={professorTab === 'dashboard' ? 'grid' : 'grid-outline'}
                      size={20}
                      color={professorTab === 'dashboard' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'dashboard' && styles.tabLabelActive]}>
                      Dashboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('launcher')}
                  >
                    <Ionicons
                      name={professorTab === 'launcher' ? 'rocket' : 'rocket-outline'}
                      size={20}
                      color={professorTab === 'launcher' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'launcher' && styles.tabLabelActive]}>
                      Roll Call
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('subjects')}
                  >
                    <Ionicons
                      name={professorTab === 'subjects' ? 'book' : 'book-outline'}
                      size={20}
                      color={professorTab === 'subjects' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, professorTab === 'subjects' && styles.tabLabelActive]}>
                      Subjects
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setProfessorTab('history')}
                  >
                    <Ionicons
                      name={professorTab === 'history' ? 'calendar' : 'calendar-outline'}
                      size={20}
                      color={professorTab === 'history' ? '#0066cc' : '#86868b'}
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
                    <Ionicons
                      name={studentTab === 'dashboard' ? 'home' : 'home-outline'}
                      size={20}
                      color={studentTab === 'dashboard' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'dashboard' && styles.tabLabelActive]}>
                      Dashboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('checkin')}
                  >
                    <Ionicons
                      name={studentTab === 'checkin' ? 'qr-code' : 'qr-code-outline'}
                      size={20}
                      color={studentTab === 'checkin' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'checkin' && styles.tabLabelActive]}>
                      Check In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('timetable')}
                  >
                    <Ionicons
                      name={studentTab === 'timetable' ? 'calendar' : 'calendar-outline'}
                      size={20}
                      color={studentTab === 'timetable' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'timetable' && styles.tabLabelActive]}>
                      Timetable
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('history')}
                  >
                    <Ionicons
                      name={studentTab === 'history' ? 'time' : 'time-outline'}
                      size={20}
                      color={studentTab === 'history' ? '#0066cc' : '#86868b'}
                    />
                    <Text style={[styles.tabLabel, studentTab === 'history' && styles.tabLabelActive]}>
                      Logs
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setStudentTab('profile')}
                  >
                    <Ionicons
                      name={studentTab === 'profile' ? 'person' : 'person-outline'}
                      size={20}
                      color={studentTab === 'profile' ? '#0066cc' : '#86868b'}
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
}

function StudentProfileScreen({ profile }: ProfileProps) {
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
          <View style={[styles.avatarCircleLarge, { backgroundColor: '#0066cc' }]}>
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
            trackColor={{ false: '#e5e7eb', true: '#ff9500' }}
            thumbColor="#ffffff"
            style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
          />
        </View>
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
    borderBottomColor: '#f4f4f4',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0066cc',
    letterSpacing: -1,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  roleTogglePill: {
    backgroundColor: '#f4f5f6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  roleToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86868b',
  },
  roleTextHighlight: {
    color: '#0066cc',
  },
  logoutBtn: {
    backgroundColor: '#ff3b3010',
    borderColor: '#ff3b3050',
    borderWidth: 0.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutBtnText: {
    color: '#ff3b30',
    fontSize: 10,
    fontWeight: '800',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 64,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    backgroundColor: '#ffffff',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    color: '#86868b',
    marginTop: 4,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#0066cc',
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
    color: '#86868b',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  // Profile specific styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileHeader: {
    marginBottom: 20,
  },
  profileHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1d1d1f',
    letterSpacing: -0.5,
  },
  profileHeaderSub: {
    fontSize: 12,
    color: '#86868b',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#1d1d1f',
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
    backgroundColor: '#f4f5f6',
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
    backgroundColor: '#ff95001a',
    borderColor: '#ff9500',
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  idCardIrregBadgeText: {
    color: '#ff9500',
    fontSize: 7,
    fontWeight: '900',
  },
  idCardNum: {
    color: '#86868b',
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
    borderColor: '#eaeaea',
    marginBottom: 40,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#1d1d1f',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 10,
  },
  disabledInput: {
    backgroundColor: '#f4f5f6',
    borderColor: '#eaeaea',
    color: '#86868b',
  },
  statusSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 12,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  switchSubText: {
    fontSize: 9,
    color: '#86868b',
    marginTop: 2,
  },

});
