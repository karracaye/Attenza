import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceSessionLog } from '../data/mockData';

interface ProfileProps {
  onLogout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  appLanguage: 'English' | 'Filipino' | 'Spanish';
  setAppLanguage: (lang: 'English' | 'Filipino' | 'Spanish') => void;
  appFontSize: 'Small' | 'Medium' | 'Large';
  setAppFontSize: (sz: 'Small' | 'Medium' | 'Large') => void;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserId?: string;
  currentUserDept?: string;
  historyLogs: AttendanceSessionLog[];
}

export default function ProfessorProfileScreen({
  onLogout,
  isDarkMode,
  setIsDarkMode,
  appLanguage,
  setAppLanguage,
  appFontSize,
  setAppFontSize,
  currentUserName,
  currentUserEmail,
  currentUserId,
  currentUserDept,
  historyLogs = [],
}: ProfileProps) {
  // Calculate dynamic metrics from historyLogs
  const sessionsCount = historyLogs.length;
  let totalPresentCount = 0;
  let totalStudentsExpected = 0;
  const subjectAverages: Record<string, { totalPresent: number; totalExpected: number; name: string }> = {};

  historyLogs.forEach(log => {
    totalPresentCount += log.totalPresent;
    totalStudentsExpected += log.records.length;

    // Parse subject statistics
    const subjCode = log.subjectCode || log.subjectName.split(' - ')[0];
    const subjName = log.subjectName.includes(' - ') ? log.subjectName.split(' - ')[1] : log.subjectName;
    if (!subjectAverages[subjCode]) {
      subjectAverages[subjCode] = { totalPresent: 0, totalExpected: 0, name: subjName };
    }
    subjectAverages[subjCode].totalPresent += log.totalPresent;
    subjectAverages[subjCode].totalExpected += log.records.length;
  });

  const avgAttendance = totalStudentsExpected > 0 
    ? ((totalPresentCount / totalStudentsExpected) * 100).toFixed(1) 
    : '0.0';

  // Compute excused count and rate
  let totalExcusedCount = 0;
  historyLogs.forEach(log => {
    totalExcusedCount += log.records.filter(r => r.status === 'EXCUSED').length;
  });
  const excusedRate = totalStudentsExpected > 0
    ? ((totalExcusedCount / totalStudentsExpected) * 100).toFixed(1)
    : '0.0';

  // Accordion Toggle States
  const [isAccountOpen, setIsAccountOpen] = useState(true);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Account settings
  const [facultyName, setFacultyName] = useState(currentUserName);

  useEffect(() => {
    setFacultyName(currentUserName);
  }, [currentUserName]);
  const [facultyId, setFacultyId] = useState(currentUserId || '2018-9901');
  const [email, setEmail] = useState(currentUserEmail || 'jane.smith@university.edu.ph');
  const [dept, setDept] = useState(currentUserDept || 'College of Information Technology');

  useEffect(() => {
    if (currentUserId) setFacultyId(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserEmail) setEmail(currentUserEmail);
  }, [currentUserEmail]);

  useEffect(() => {
    if (currentUserDept) setDept(currentUserDept);
  }, [currentUserDept]);
  
  // Password states
  const [password, setPassword] = useState('••••••••••••');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // Hardware signature
  const [hardwareId] = useState('D75B-A23C-5582-FF21-4A2D');

  // Attendance states
  const [qrBackupEnabled, setQrBackupEnabled] = useState(true);
  const [sessionDuration, setSessionDuration] = useState<5 | 10 | 15 | 'Custom'>(10);
  const [customDuration, setCustomDuration] = useState('20');
  const [lateThreshold, setLateThreshold] = useState<5 | 10 | 15>(5);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);

  // Location settings
  const [gpsRequired, setGpsRequired] = useState(true);
  const [allowedRadius, setAllowedRadius] = useState<20 | 50 | 100>(50);
  const [accuracyCheckEnabled, setAccuracyCheckEnabled] = useState(true);
  const [highAccuracyRequired, setHighAccuracyRequired] = useState(true);

  // System theme is local state
  const [systemTheme, setSystemTheme] = useState(true);

  // Translations
  const translations = {
    English: {
      title: 'Faculty Terminal Settings',
      sub: 'Manage account, configure attendance parameters, geofencing coordinates, view summaries, and adjust appearance.',
      account: 'Account',
      attendanceSettings: 'Attendance Settings',
      locationSettings: 'Location Settings',
      reports: 'Reports & Analytics',
      appearance: 'Appearance',
      about: 'About Attenza',
    },
    Filipino: {
      title: 'Mga Setting ng Faculty',
      sub: 'Pamahalaan ang account, i-configure ang pagdalo, geofencing coordinates, tingnan ang mga buod, at ayusin ang hitsura.',
      account: 'Account',
      attendanceSettings: 'Mga Setting ng Pagdalo',
      locationSettings: 'Mga Setting ng Lokasyon',
      reports: 'Mga Ulat at Analitika',
      appearance: 'Hitsura',
      about: 'Tungkol sa Attenza',
    },
    Spanish: {
      title: 'Ajustes de Terminal de Facultad',
      sub: 'Administrar cuenta, configurar asistencia, geolocalización, ver informes y ajustar la apariencia.',
      account: 'Cuenta',
      attendanceSettings: 'Ajustes de Asistencia',
      locationSettings: 'Ajustes de Ubicación',
      reports: 'Informes y Analíticas',
      appearance: 'Apariencia',
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
      if (!newPassword.trim()) {
        Alert.alert('Error', 'Password cannot be blank');
        return;
      }
      setPassword(newPassword);
      setIsChangingPassword(false);
      setNewPassword('');
      Alert.alert('Success', 'Faculty password updated successfully.');
    } else {
      setIsChangingPassword(true);
    }
  };

  const triggerManualAttendance = () => {
    Alert.alert(
      'Manual Attendance Override',
      'This activates emergency manual roll call override. If a student QR scan fails, you can sign them in directly from the History tab. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Activate Override', onPress: () => Alert.alert('Override Active', 'Manual override has been unlocked for current logs.') }
      ]
    );
  };

  const triggerExport = () => {
    Alert.alert(
      'Export Attendance Records',
      'Generate semester attendance logs as Excel spreadsheet (XLSX)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export & Send Email', onPress: () => Alert.alert('Export Success', `Semester attendance summary exported and sent to ${email}`) }
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
            {/* ID Card preview */}
            <View style={[styles.innerCard, { backgroundColor: theme.innerCardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.idCardHeader}>
                <View style={[styles.avatarCircleLarge, { backgroundColor: '#1E5EFF', width: 44, height: 44, borderRadius: 22 }]}>
                  <Text style={[styles.avatarTextLarge, { fontSize: getFontSize(18) }]}>{facultyName.slice(0, 1).toUpperCase() || '👤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.idCardName, { color: theme.text, fontSize: getFontSize(15) }]}>Prof. {facultyName}</Text>
                  <Text style={[styles.idCardClass, { color: theme.subText, fontSize: getFontSize(11), marginTop: 1 }]}>
                    {dept}
                  </Text>
                </View>
              </View>
            </View>

            {/* Edit Profile name field */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Faculty Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBg, color: theme.inputText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={facultyName}
              onChangeText={setFacultyName}
            />

            {/* Faculty ID */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Faculty ID</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.disabledInputBg, color: theme.subText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={facultyId}
              editable={false}
            />

            {/* University Email */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>University Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.disabledInputBg, color: theme.subText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={email}
              editable={false}
            />

            {/* Department */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Department Division</Text>
            <TextInput
              style={[styles.input, styles.disabledInput, { backgroundColor: theme.disabledInputBg, color: theme.subText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
              value={dept}
              editable={false}
            />

            {/* Change Password */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Security Password</Text>
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
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Linked Devices</Text>
            <View style={[styles.deviceDetailGroup, { backgroundColor: theme.deviceDetailGroupBg, borderColor: theme.cardBorder }]}>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Faculty Key Signature:</Text>
                <Text style={[styles.deviceDetailVal, { color: theme.text, fontSize: getFontSize(10.5) }]}>{hardwareId}</Text>
              </View>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Key Status:</Text>
                <Text style={[styles.deviceDetailVal, { color: '#22C55E', fontWeight: '800', fontSize: getFontSize(11) }]}>✓ Authenticated Key Active</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 2: ATTENDANCE SETTINGS */}
      <View style={[styles.accordionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.accordionHeader, { backgroundColor: theme.accordionHeaderBg }]} 
          onPress={() => setIsAttendanceOpen(!isAttendanceOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="time" size={24} color="#1E5EFF" style={{ marginRight: 10 }} />
            <Text style={[styles.accordionTitle, { color: theme.text, fontSize: getFontSize(14) }]}>{t.attendanceSettings}</Text>
          </View>
          <Ionicons 
            name={isAttendanceOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={18} 
            color={theme.subText} 
          />
        </TouchableOpacity>

        {isAttendanceOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.cardBorder }]}>
            {/* QR Code Backup toggle */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>QR Code (optional backup)</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Enable screen QR generation backup for student scan failure</Text>
              </View>
              <Switch
                value={qrBackupEnabled}
                onValueChange={setQrBackupEnabled}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>

            {/* Manual Attendance override button */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Manual Attendance (Emergency)</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Unlock manual override roster sign-in for emergency cases</Text>
              </View>
              <TouchableOpacity style={styles.actionPillBtn} onPress={triggerManualAttendance}>
                <Text style={styles.actionPillBtnText}>Unlock</Text>
              </TouchableOpacity>
            </View>

            {/* Session Duration Selector */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Attendance Session Duration</Text>
            <View style={styles.fontSizeRow}>
              {([5, 10, 15, 'Custom'] as const).map((dur) => (
                <TouchableOpacity
                  key={dur}
                  style={[styles.fontSizePill, { borderColor: theme.cardBorder, backgroundColor: theme.innerCardBg }, sessionDuration === dur && styles.fontSizePillActive]}
                  onPress={() => setSessionDuration(dur)}
                >
                  <Text style={[styles.fontSizeText, { fontSize: getFontSize(11) }, sessionDuration === dur && styles.fontSizeTextActive]}>
                    {dur === 'Custom' ? 'Custom' : `${dur} mins`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {sessionDuration === 'Custom' && (
              <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: theme.text, fontSize: getFontSize(12) }}>Minutes limit:</Text>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 6, backgroundColor: theme.cardBg, color: theme.inputText, fontSize: getFontSize(13), borderColor: theme.cardBorder }]}
                  keyboardType="numeric"
                  value={customDuration}
                  onChangeText={setCustomDuration}
                />
              </View>
            )}

            {/* Late Threshold Selector */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10), marginTop: 16 }]}>Late Threshold</Text>
            <View style={styles.fontSizeRow}>
              {([5, 10, 15] as const).map((late) => (
                <TouchableOpacity
                  key={late}
                  style={[styles.fontSizePill, { borderColor: theme.cardBorder, backgroundColor: theme.innerCardBg }, lateThreshold === late && styles.fontSizePillActive]}
                  onPress={() => setLateThreshold(late)}
                >
                  <Text style={[styles.fontSizeText, { fontSize: getFontSize(11) }, lateThreshold === late && styles.fontSizeTextActive]}>
                    {late} mins
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Auto Close Session toggle */}
            <View style={[styles.settingToggleRow, { borderBottomColor: 'transparent', paddingBottom: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Auto Close Attendance Session</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Automatically end attendance checks when session duration expires</Text>
              </View>
              <Switch
                value={autoCloseEnabled}
                onValueChange={setAutoCloseEnabled}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 3: LOCATION SETTINGS */}
      <View style={[styles.accordionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.accordionHeader, { backgroundColor: theme.accordionHeaderBg }]} 
          onPress={() => setIsLocationOpen(!isLocationOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="location" size={24} color="#1E5EFF" style={{ marginRight: 10 }} />
            <Text style={[styles.accordionTitle, { color: theme.text, fontSize: getFontSize(14) }]}>{t.locationSettings}</Text>
          </View>
          <Ionicons 
            name={isLocationOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={18} 
            color={theme.subText} 
          />
        </TouchableOpacity>

        {isLocationOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.cardBorder }]}>
            {/* Require GPS switch */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Require GPS Verification</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Enforce students to verify coordinates proximity on F2F sessions</Text>
              </View>
              <Switch
                value={gpsRequired}
                onValueChange={setGpsRequired}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>

            {/* Allowed radius selector */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Allowed Attendance Radius</Text>
            <View style={styles.fontSizeRow}>
              {([20, 50, 100] as const).map((rad) => (
                <TouchableOpacity
                  key={rad}
                  style={[styles.fontSizePill, { borderColor: theme.cardBorder, backgroundColor: theme.innerCardBg }, allowedRadius === rad && styles.fontSizePillActive]}
                  onPress={() => setAllowedRadius(rad)}
                >
                  <Text style={[styles.fontSizeText, { fontSize: getFontSize(11) }, allowedRadius === rad && styles.fontSizeTextActive]}>
                    {rad} meters
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Classroom standpoints Info card */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10), marginTop: 16 }]}>Active Classroom locations</Text>
            <View style={[styles.deviceDetailGroup, { backgroundColor: theme.deviceDetailGroupBg, borderColor: theme.cardBorder, marginTop: 4 }]}>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Room 302 standpoint:</Text>
                <Text style={[styles.deviceDetailVal, { color: theme.text, fontSize: getFontSize(11) }]}>14.59951, 120.98421</Text>
              </View>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Virtual Remote bounds:</Text>
                <Text style={[styles.deviceDetailVal, { color: theme.text, fontSize: getFontSize(11) }]}>Unlimited (Bypassed)</Text>
              </View>
              <Text style={{ color: theme.subText, fontSize: getFontSize(9), marginTop: 4, fontStyle: 'italic' }}>
                Note: Standard coordinates are configured inside the active setup launcher.
              </Text>
            </View>

            {/* Location accuracy switch */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder, marginTop: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Enable Location Accuracy Check</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Identify mock GPS coords spoofers and proxy extensions</Text>
              </View>
              <Switch
                value={accuracyCheckEnabled}
                onValueChange={setAccuracyCheckEnabled}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>

            {/* High accuracy GPS switch */}
            <View style={[styles.settingToggleRow, { borderBottomColor: 'transparent', paddingBottom: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Require High Accuracy GPS</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Rejects check-ins with high location telemetry errors (&gt; 15m radius error)</Text>
              </View>
              <Switch
                value={highAccuracyRequired}
                onValueChange={setHighAccuracyRequired}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 4: REPORTS */}
      <View style={[styles.accordionCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.accordionHeader, { backgroundColor: theme.accordionHeaderBg }]} 
          onPress={() => setIsReportsOpen(!isReportsOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <Ionicons name="bar-chart" size={24} color="#1E5EFF" style={{ marginRight: 10 }} />
            <Text style={[styles.accordionTitle, { color: theme.text, fontSize: getFontSize(14) }]}>{t.reports}</Text>
          </View>
          <Ionicons 
            name={isReportsOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={18} 
            color={theme.subText} 
          />
        </TouchableOpacity>

        {isReportsOpen && (
          <View style={[styles.accordionBody, { borderTopColor: theme.cardBorder }]}>
            {/* Analytics overview card */}
            <View style={[styles.innerCard, { backgroundColor: theme.innerCardBg, borderColor: theme.cardBorder, padding: 12 }]}>
              <Text style={{ fontWeight: '800', color: theme.text, fontSize: getFontSize(12.5) }}>Attendance Analytics Overview</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View>
                  <Text style={{ fontSize: getFontSize(10), color: theme.subText }}>Average Present</Text>
                  <Text style={{ fontSize: getFontSize(18), fontWeight: '900', color: '#22C55E' }}>{avgAttendance}%</Text>
                </View>
                <View>
                  <Text style={{ fontSize: getFontSize(10), color: theme.subText }}>Sessions Run</Text>
                  <Text style={{ fontSize: getFontSize(18), fontWeight: '900', color: theme.text }}>{sessionsCount}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: getFontSize(10), color: theme.subText }}>Excused Absence</Text>
                  <Text style={{ fontSize: getFontSize(18), fontWeight: '900', color: '#1E5EFF' }}>{excusedRate}%</Text>
                </View>
              </View>
            </View>

            {/* Export records btn */}
            <TouchableOpacity style={styles.saveBtn} onPress={triggerExport}>
              <Text style={styles.saveBtnText}>Export Attendance (XLSX / CSV)</Text>
            </TouchableOpacity>

            {/* Weekly summaries */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Auto Summaries Dispatch</Text>
            <View style={[styles.deviceDetailGroup, { backgroundColor: theme.deviceDetailGroupBg, borderColor: theme.cardBorder, marginTop: 4 }]}>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Weekly Summary Digest:</Text>
                <Text style={[styles.deviceDetailVal, { color: '#22C55E', fontSize: getFontSize(11) }]}>Active (Every Friday 5 PM)</Text>
              </View>
              <View style={styles.deviceDetailRow}>
                <Text style={[styles.deviceDetailLabel, { color: theme.subText, fontSize: getFontSize(11) }]}>Monthly Summary Report:</Text>
                <Text style={[styles.deviceDetailVal, { color: '#22C55E', fontSize: getFontSize(11) }]}>Active (Dean Auto-send)</Text>
              </View>
            </View>

            {/* Subject statistics breakdown */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Subject Statistics Breakdown</Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {Object.keys(subjectAverages).length > 0 ? (
                Object.keys(subjectAverages).map(subjCode => {
                  const avg = subjectAverages[subjCode].totalExpected > 0
                    ? ((subjectAverages[subjCode].totalPresent / subjectAverages[subjCode].totalExpected) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <View key={subjCode} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ color: theme.text, fontSize: getFontSize(12) }}>{subjCode} ({subjectAverages[subjCode].name})</Text>
                      <Text style={{ color: '#22C55E', fontWeight: 'bold', fontSize: getFontSize(12) }}>{avg}% avg</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: theme.subText, fontSize: getFontSize(11), fontStyle: 'italic', paddingVertical: 4 }}>
                  No subject history logged yet.
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ACCORDION 5: APPEARANCE */}
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
            {/* Light/Dark Mode toggle */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Light / Dark Mode</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Switch app color mode layout globally</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#E5E7EB', true: '#1E5EFF' }}
                thumbColor="#FFFFFF"
                style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
              />
            </View>

            {/* System Theme toggle */}
            <View style={[styles.settingToggleRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>System Theme</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Sync theme to match mobile OS dark/light state</Text>
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
                <Text style={[styles.settingMainText, { color: theme.text, fontSize: getFontSize(12.5) }]}>App Language</Text>
                <Text style={[styles.settingSubText, { color: theme.subText, fontSize: getFontSize(9.5) }]}>Currently configured vocabulary language</Text>
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
                <Text style={[styles.badgeSelectorText, { color: theme.text }]}>{appLanguage} ▾</Text>
              </TouchableOpacity>
            </View>

            {/* Font Size Selector */}
            <Text style={[styles.formLabel, { color: theme.subText, fontSize: getFontSize(10) }]}>Font Size (Small / Medium / Large)</Text>
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

      {/* ACCORDION 6: ABOUT */}
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
              onPress={() => Alert.alert('Help Center', 'Need assistance? Browse common setup guidelines, geofencing coordinates troubleshooting, and excuse letter verification reviews.')}
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
              onPress={() => Alert.alert('Privacy Policy', 'Faculty accounts, geofence coordinates setup, class sessions, and student logs data conform strictly to the University Data Privacy Charter of 2026.')}
            >
              <Ionicons name="document-text-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Terms & Conditions */}
            <TouchableOpacity 
              style={[styles.legalLinkRow, { borderBottomColor: 'transparent', paddingBottom: 0 }]} 
              onPress={() => Alert.alert('Terms & Conditions', 'Faculty members are strictly required to use coordinate locations matching actual lectures to maintain the integrity of GPS verification bounds.')}
            >
              <Ionicons name="ribbon-outline" size={18} color={theme.subText} style={{ marginRight: 8 }} />
              <Text style={[styles.legalLinkText, { color: theme.text, fontSize: getFontSize(12.5) }]}>Terms & Conditions</Text>
              <Ionicons name="chevron-forward-outline" size={14} color={theme.subText} style={{ marginLeft: 'auto' }} />
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
        <Text style={styles.logoutBtnText}>Log Out Account</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileHeader: {
    marginBottom: 20,
  },
  profileHeaderTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileHeaderSub: {
    marginTop: 4,
    lineHeight: 18,
  },
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontWeight: '800',
  },
  accordionBody: {
    padding: 16,
    borderTopWidth: 1,
  },
  innerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  idCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatarCircleLarge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    fontWeight: '900',
    color: '#ffffff',
  },
  idCardName: {
    fontWeight: '800',
  },
  idCardClass: {
    marginTop: 2,
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  disabledInput: {
    opacity: 0.65,
  },
  innerBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  deviceDetailGroup: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  deviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  deviceDetailLabel: {
    fontWeight: '600',
  },
  deviceDetailVal: {
    fontWeight: '700',
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  settingMainText: {
    fontWeight: '700',
  },
  settingSubText: {
    marginTop: 2,
    lineHeight: 14,
  },
  actionPillBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionPillBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  fontSizePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizePillActive: {
    borderColor: '#1E5EFF',
    backgroundColor: '#1E5EFF20',
  },
  fontSizeText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  fontSizeTextActive: {
    color: '#1E5EFF',
  },
  badgeSelector: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeSelectorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  legalLinkText: {
    fontWeight: '600',
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
    marginTop: 14,
    marginBottom: 30,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
});
