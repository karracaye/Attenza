import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { ActiveSession, Classroom, StudentCheckInRecord, Subject, getRollingTokenForTime } from '../data/mockData';
import { getDeviceHardwareId } from '../data/storage';

interface Props {
  activeSession: ActiveSession | null;
  studentProfile: { studentId: string; studentName: string; year: string; section: string; isIrregular: boolean };
  onCheckInSubmit: (record: StudentCheckInRecord) => void;
  classroomCoords: Classroom[];
  onSubmitGeneralExcuse?: (subjectCode: string, reason: string, attachment: string, attachmentUri?: string) => void;
  subjects?: Subject[];
}

const SIMULATED_LOCATIONS = [
  { id: 'home', label: '🏡 Home', lat: 14.60952, lng: 120.98924 },
  { id: 'coffee', label: '☕ Coffee Shop', lat: 14.58235, lng: 120.97541 },
  { id: 'classroom', label: '🏫 Inside Classroom Lab 3', lat: 14.59952, lng: 120.98422 },
];

const MOCK_FILES = [
  'Medical_Certificate.pdf',
  'Dean_Excuse_Pass.pdf',
  'Athletic_Meet_Exemption.pdf',
  'Official_Family_Letter.docx',
];

export default function StudentCheckIn({
  activeSession,
  studentProfile,
  onCheckInSubmit,
  classroomCoords,
  onSubmitGeneralExcuse,
  subjects = [],
}: Props) {
  // Mode switcher: 'select' (choose to checkin or excuse), 'checkin' (standard checks), 'excuse' (letter filing)
  const [subMode, setSubMode] = useState<'select' | 'checkin' | 'excuse'>('select');

  // Check-in steps state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: QR, 2: Selfie, 3: GPS, 4: Success
  
  // Step 1: QR State
  const [qrInput, setQrInput] = useState('');
  const [qrVerified, setQrVerified] = useState(false);

  // Step 2: Selfie State
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selfiePath, setSelfiePath] = useState('');

  // Step 3: GPS State
  const [gpsVerified, setGpsVerified] = useState(false);
  const [selectedLocId, setSelectedLocId] = useState('home'); // Default to home
  const [gpsDistance, setGpsDistance] = useState(0.0);
  const [checkingGps, setCheckingGps] = useState(false);

  // Virtual Session Custom Location reporting
  const [isRemoteStandpoint, setIsRemoteStandpoint] = useState(false);
  const [remoteLocationName, setRemoteLocationName] = useState('');
  const [remoteLocationReason, setRemoteLocationReason] = useState('');

  const [deviceHardwareId, setDeviceHardwareId] = useState('device_hw_loading');

  useEffect(() => {
    async function loadDeviceHwId() {
      const id = await getDeviceHardwareId();
      setDeviceHardwareId(id);
    }
    loadDeviceHwId();
  }, []);

  // Checked in status outcomes
  const [checkInStatus, setCheckInStatus] = useState<'PRESENT' | 'LATE' | 'EXCUSED'>('PRESENT');

  // Excuse Form State
  const [excuseReason, setExcuseReason] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [excuseAttachmentUri, setExcuseAttachmentUri] = useState('');
  const [submittingExcuse, setSubmittingExcuse] = useState(false);

  // General Excuse States (when no session is active)
  const [selectedGeneralSubjectCode, setSelectedGeneralSubjectCode] = useState(subjects[0]?.code || '');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [generalExcuseSuccess, setGeneralExcuseSuccess] = useState(false);
  const [showWaiverForm, setShowWaiverForm] = useState(false);

  // Auto reset form if session changes or expires, and auto-populate rolling token
  useEffect(() => {
    if (!activeSession) {
      setStep(1);
      setSubMode('select');
      setQrInput('');
      setQrVerified(false);
      setSelfieVerified(false);
      setSelfiePath('');
      setGpsVerified(false);
      setCheckInStatus('PRESENT');
      setExcuseReason('');
      setSelectedFile('');
      setExcuseAttachmentUri('');
      setGeneralExcuseSuccess(false);
      setShowWaiverForm(false);
      setIsRemoteStandpoint(false);
      setRemoteLocationName('');
      setRemoteLocationReason('');
    } else {
      // Auto-populate token to streamline roll-swapping tests
      setQrInput(getRollingTokenForTime(activeSession.qrCodePayload, Date.now()));
    }
  }, [activeSession]);

  const activeClassroom = activeSession
    ? classroomCoords.find(c => c.name === activeSession.classroomName)
    : null;

  // Step 1: QR Code Match
  const handleVerifyQR = () => {
    if (!activeSession) return;
    
    const cleanInput = qrInput.trim().toUpperCase();
    const basePayload = activeSession.qrCodePayload;

    // Generate valid rolling tokens for the current, previous, and next 60-second window
    // This allows a slight network/clock latency but expires the token within 3 minutes,
    // successfully preventing photo sharing and remote absent check-ins.
    const now = Date.now();
    const validTokens = [
      getRollingTokenForTime(basePayload, now).toUpperCase(),
      getRollingTokenForTime(basePayload, now - 60000).toUpperCase(),
      getRollingTokenForTime(basePayload, now + 60000).toUpperCase()
    ];

    if (validTokens.includes(cleanInput)) {
      setQrVerified(true);
      Alert.alert('QR Code Verified', 'Layer 1 check complete. Moving to Selfie capture.');
      setStep(2);
    } else {
      Alert.alert('Invalid or Expired QR Code', 'The entered rolling token is incorrect or has expired. Please look at the projector screen and input the current code.');
    }
  };

  // Step 2: Selfie Simulator (Camera Only)
  const handleCaptureSelfie = () => {
    setCapturing(true);
    setTimeout(() => {
      setCapturing(false);
      setSelfieVerified(true);
      setSelfiePath('📸 Student Live Snapshot');
      Alert.alert('Selfie Captured', 'Layer 2 check complete. Face verification matching OK.');
      setStep(3);
    }, 1500);
  };

  // Distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  // Step 3: Location verification
  const handleVerifyGPS = () => {
    if (!activeSession) return;

    setCheckingGps(true);
    setTimeout(() => {
      setCheckingGps(false);
      const studentLoc = SIMULATED_LOCATIONS.find(l => l.id === selectedLocId) || SIMULATED_LOCATIONS[0];
      
      if (activeSession.isOnline) {
        setGpsDistance(0.0);
        setGpsVerified(true);
        Alert.alert(
          'Location Captured',
          `Online Class Mode: Coordinates [${studentLoc.lat}, ${studentLoc.lng}] saved. Check-in approved.`
        );
      } else {
        const targetLat = activeSession.latitude !== undefined ? activeSession.latitude : (activeClassroom?.latitude || 14.59951);
        const targetLng = activeSession.longitude !== undefined ? activeSession.longitude : (activeClassroom?.longitude || 120.98421);
        const distance = calculateDistance(studentLoc.lat, studentLoc.lng, targetLat, targetLng);
        setGpsDistance(distance);

        if (distance <= 20) {
          setGpsVerified(true);
          Alert.alert('GPS Location Verified', `Inside Classroom Proximity. Estimated distance: ${distance.toFixed(1)} meters.`);
        } else {
          setGpsVerified(false);
          Alert.alert('Location Check Failed', `You are too far from the classroom (${distance.toFixed(1)}m). Proximity limit is 20m.`);
        }
      }
    }, 1000);
  };

  // Submit standard check-in
  const handleSubmitCheckIn = () => {
    if (!qrVerified || !selfieVerified || !gpsVerified || !activeSession) {
      Alert.alert('Error', 'Please complete all three layers of verification.');
      return;
    }

    const studentLoc = SIMULATED_LOCATIONS.find(l => l.id === selectedLocId) || SIMULATED_LOCATIONS[0];
    const elapsedMs = Date.now() - new Date(activeSession.createdAt).getTime();
    const isLate = elapsedMs > 3 * 60000; // Automatically LATE if timing in after 3 minutes (180 seconds)
    const status = isLate ? 'LATE' : 'PRESENT';
    setCheckInStatus(status);

    const newRecord: StudentCheckInRecord = {
      studentId: studentProfile.studentId,
      studentName: studentProfile.studentName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selfieUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80',
      latitude: studentLoc.lat,
      longitude: studentLoc.lng,
      distanceMeters: activeSession.isOnline ? 0.0 : gpsDistance,
      qrVerified: true,
      selfieVerified: true,
      gpsVerified: true,
      verified: true,
      year: studentProfile.year,
      section: studentProfile.section,
      isIrregular: studentProfile.isIrregular,
      status: status,
      isRemoteStandpoint: activeSession.isOnline ? isRemoteStandpoint : false,
      remoteLocationName: activeSession.isOnline && isRemoteStandpoint ? remoteLocationName.trim() : undefined,
      remoteLocationReason: activeSession.isOnline && isRemoteStandpoint ? remoteLocationReason.trim() : undefined,
      deviceId: deviceHardwareId,
    };

    onCheckInSubmit(newRecord);
    setStep(4);
  };

  // Submit excuse letter request for active session
  const handleSubmitExcuse = () => {
    if (!activeSession) return;
    if (!excuseReason.trim()) {
      Alert.alert('Error', 'Please state the reason for your excuse request.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Error', 'Please attach a support document.');
      return;
    }

    setSubmittingExcuse(true);
    setTimeout(() => {
      setSubmittingExcuse(false);
      setCheckInStatus('EXCUSED');
      const newRecord: StudentCheckInRecord = {
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
        excuseReason: excuseReason.trim(),
        excuseAttachment: selectedFile,
        excuseAttachmentUri: excuseAttachmentUri,
      };

      onCheckInSubmit(newRecord);
      setStep(4);
    }, 1500);
  };

  // Submit general excuse letter when no session is active (for target subject)
  const handleGeneralExcuseSubmit = () => {
    if (!selectedGeneralSubjectCode) {
      Alert.alert('Error', 'Please select the target subject.');
      return;
    }
    if (!excuseReason.trim()) {
      Alert.alert('Error', 'Please state the reason for your absence.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Error', 'Please attach your excuse letter document.');
      return;
    }

    setSubmittingExcuse(true);
    setTimeout(() => {
      setSubmittingExcuse(false);
      if (onSubmitGeneralExcuse) {
        onSubmitGeneralExcuse(selectedGeneralSubjectCode, excuseReason.trim(), selectedFile, excuseAttachmentUri);
      }
      setGeneralExcuseSuccess(true);
    }, 1200);
  };

  // Custom File Pickers Handlers
  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file.name);
    
    // Read local image to represent as a Base64 data URL
    const reader = new FileReader();
    reader.onload = () => {
      setExcuseAttachmentUri(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeviceUpload = () => {
    if (Platform.OS === 'web') {
      const el = document.getElementById('excuse-file-input-el');
      if (el) el.click();
    } else {
      // Native Simulator Mock image picker
      setSelectedFile('personal_medical_waver.jpg');
      setExcuseAttachmentUri('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=500&q=80');
      Alert.alert('Simulated Upload', 'Attached personal_medical_waver.jpg successfully from camera roll.');
    }
  };

  const studentLoc = SIMULATED_LOCATIONS.find(l => l.id === selectedLocId) || SIMULATED_LOCATIONS[0];

  // RENDER COMPONENT WHEN NO CLASS SESSION IS ACTIVE (Submit General Excuse Letter Portal)
  if (!activeSession) {
    if (generalExcuseSuccess) {
      return (
        <View style={styles.container}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Excuse Letter Sent</Text>
            <Text style={styles.successSub}>
              Your waiver has been filed successfully. It will automatically match this class session date in the professor's database.
            </Text>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryItem}>👤 Student: <Text style={styles.summaryVal}>{studentProfile.studentName}</Text></Text>
              <Text style={styles.summaryItem}>📚 Subject: <Text style={styles.summaryVal}>{selectedGeneralSubjectCode}</Text></Text>
              <Text style={styles.summaryItem}>📅 Date Filed: <Text style={styles.summaryVal}>Today (Waiver Active)</Text></Text>
              <Text style={styles.summaryItem}>📝 Reason: <Text style={styles.summaryVal}>{excuseReason}</Text></Text>
              <Text style={styles.summaryItem}>📎 Attachment: <Text style={[styles.summaryVal, { color: '#1E5EFF', fontWeight: 'bold' }]}>{selectedFile}</Text></Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={() => { setGeneralExcuseSuccess(false); setExcuseReason(''); setSelectedFile(''); setExcuseAttachmentUri(''); setShowWaiverForm(false); }}>
              <Text style={styles.doneBtnText}>Submit Another Waiver</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!showWaiverForm) {
      return (
        <View style={styles.container}>
          <View style={styles.noSessionCard}>
            <Text style={styles.noSessionIcon}>📡</Text>
            <Text style={styles.noSessionTitle}>Terminal Standby</Text>
            <Text style={styles.noSessionSub}>No active class attendance session detected. Please keep this screen open; it will update automatically when your professor starts roll call.</Text>

            {/* Muted secondary excuse waiver trigger */}
            <View style={styles.excuseFallbackContainer}>
              <Text style={styles.excuseFallbackText}>Absent today?</Text>
              <TouchableOpacity onPress={() => setShowWaiverForm(true)} activeOpacity={0.7}>
                <Text style={styles.excuseFallbackLink}>File absence excuse waiver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const currentSub = subjects.find(s => s.code === selectedGeneralSubjectCode) || subjects[0];

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Back Link to waiting screen */}
        <TouchableOpacity style={styles.backLinkRow} onPress={() => setShowWaiverForm(false)} activeOpacity={0.7}>
          <Text style={styles.backLinkRowText}>← Back to Terminal Standby</Text>
        </TouchableOpacity>

        {/* General Excuse Letter Submission Card */}
        <View style={[styles.wizardCard, { marginTop: 12, marginBottom: 40 }]}>
          <Text style={styles.wizardCardTitle}>✉️ File Absence Excuse Waiver</Text>
          <Text style={styles.wizardCardSub}>Select your subject course and submit your excuse letter details below.</Text>

          {/* Select Subject Dropdown */}
          <Text style={styles.manualLabel}>Select Subject:</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, isSubjectDropdownOpen && styles.dropdownTriggerActive]}
            onPress={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownTriggerText}>
              {currentSub ? `${currentSub.code} - ${currentSub.name}` : 'Select subject...'}
            </Text>
            <Text style={styles.dropdownChevron}>{isSubjectDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {isSubjectDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.dropdownItem, selectedGeneralSubjectCode === sub.code && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedGeneralSubjectCode(sub.code);
                    setIsSubjectDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedGeneralSubjectCode === sub.code && styles.dropdownTextActive]}>
                    {sub.code} - {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.manualLabel}>Reason for Absence:</Text>
          <TextInput
            style={styles.tokenInput}
            placeholder="e.g. Medical Checkup, Official Event, Family Urgency"
            placeholderTextColor="#6B7280"
            value={excuseReason}
            onChangeText={setExcuseReason}
          />

          <Text style={styles.manualLabel}>Attach Support Document / Letter:</Text>
          <Text style={styles.fileSelectorSub}>Upload your own excuse document file, or select a simulated file:</Text>
          
          {Platform.OS === 'web' && (
            <input
              type="file"
              accept="image/*"
              id="excuse-file-input-el"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}

          <TouchableOpacity style={styles.uploadBtnBox} onPress={handleDeviceUpload} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>📎</Text>
              <Text style={styles.uploadBtnBoxText}>Choose excuse file or document...</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.manualLabel, { marginTop: 18 }]}>Or select from mock documents:</Text>
          <View style={styles.fileOptionsList}>
            {MOCK_FILES.map((file) => {
              const isSelected = selectedFile === file;
              return (
                <TouchableOpacity
                  key={file}
                  style={[styles.fileCard, isSelected && styles.fileCardActive]}
                  onPress={() => {
                    setSelectedFile(file);
                    setExcuseAttachmentUri(''); // Clear upload to fallback to mock
                  }}
                >
                  <Text style={styles.fileIcon}>📄</Text>
                  <Text style={[styles.fileNameText, isSelected && styles.fileCardActiveText]}>{file}</Text>
                  {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedFile ? (
            <View style={styles.attachmentBox}>
              <Text style={styles.attachmentLabel}>Attached Document Ready:</Text>
              <Text style={styles.attachmentValue}>📎 {selectedFile}</Text>
              {excuseAttachmentUri ? (
                <Text style={styles.customUploadNotice}>✓ Custom user letter uploaded</Text>
              ) : (
                <Text style={styles.customUploadNotice}>✓ Preset mock document attached</Text>
              )}
            </View>
          ) : null}

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: '#1E5EFF', marginTop: 24 }]} 
            onPress={handleGeneralExcuseSubmit}
            disabled={submittingExcuse}
          >
            {submittingExcuse ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Excuse Waiver</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // STEP 4: SUCCESS SUMMARY STATE (Active session checkin complete)
  if (step === 4) {
    const isExcuse = subMode === 'excuse';
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>{isExcuse ? '✉️' : '🎉'}</Text>
          <Text style={styles.successTitle}>
            {isExcuse ? 'Excuse Submitted' : 'Attendance Verified'}
          </Text>
          <Text style={styles.successSub}>
            {isExcuse 
              ? 'Your excuse letter request has been sent to the professor for review.'
              : 'Your check-in has been validated. The professor\'s roster has been updated successfully.'}
          </Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryItem}>👤 Student: <Text style={styles.summaryVal}>{studentProfile.studentName}</Text></Text>
            <Text style={styles.summaryItem}>🏫 Room: <Text style={styles.summaryVal}>{activeSession.isOnline ? 'Remote / Online' : activeSession.classroomName}</Text></Text>
            <Text style={styles.summaryItem}>🕒 Timestamp: <Text style={styles.summaryVal}>Just now</Text></Text>
            <Text style={styles.summaryItem}>⏰ Arrival Status: <Text style={[styles.summaryVal, { fontWeight: 'bold', color: isExcuse ? '#1E5EFF' : (checkInStatus === 'LATE' ? '#F59E0B' : '#22C55E') }]}>
              {isExcuse ? 'EXCUSED' : (checkInStatus === 'LATE' ? 'LATE' : 'ON TIME')}
            </Text></Text>
            {isExcuse ? (
              <>
                <Text style={styles.summaryItem}>📝 Reason: <Text style={styles.summaryVal}>{excuseReason}</Text></Text>
                <Text style={styles.summaryItem}>📎 Attached File: <Text style={[styles.summaryVal, { color: '#1E5EFF', fontWeight: 'bold' }]}>{selectedFile}</Text></Text>
              </>
            ) : (
              <>
                <Text style={styles.summaryItem}>📍 GPS Coordinates: <Text style={styles.summaryVal}>{studentLoc.lat}, {studentLoc.lng}</Text></Text>
                <Text style={styles.summaryItem}>🛡️ Security check: <Text style={styles.summaryVal}>{activeSession.isOnline ? 'Passed (Online Session)' : 'Passed (3/3 Layers)'}</Text></Text>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => { setStep(1); setSubMode('select'); }}>
            <Text style={styles.doneBtnText}>Return Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTitleRow}>
          <Text style={styles.sessionClass}>{activeSession.subjectName}</Text>
          <View style={[styles.deliveryPill, activeSession.isOnline ? styles.pillOrange : styles.pillBlue]}>
            <Text style={[styles.deliveryPillText, activeSession.isOnline ? styles.textOrange : styles.textBlue]}>
              {activeSession.isOnline ? '🌐 ONLINE' : '🏫 F2F'}
            </Text>
          </View>
        </View>
        <Text style={styles.sessionRoom}>
          {activeSession.isOnline ? '🌐 Classroom: Remote Virtual Session' : `🏫 Classroom: ${activeSession.classroomName}`}
        </Text>
      </View>

      {/* SELECT MODE VIEW */}
      {subMode === 'select' && (
        <View style={styles.selectCard}>
          <Text style={styles.selectTitle}>Class Attendance Session Active</Text>
          <Text style={styles.selectSubtitle}>Please complete the security checkpoints to register your presence for this session.</Text>

          {/* Primary Action Button: Verify Presence */}
          <TouchableOpacity style={styles.primaryCheckinBtn} onPress={() => setSubMode('checkin')} activeOpacity={0.9}>
            <Text style={styles.primaryCheckinEmoji}>🏫🛡️</Text>
            <Text style={styles.primaryCheckinText}>Verify In-Class Presence</Text>
            <Text style={styles.primaryCheckinSub}>Start the 3-layer GPS, OTP QR & selfie checkpoints</Text>
          </TouchableOpacity>

          {/* Minimalist, subtle excuse link at the bottom (not highlighted) */}
          <View style={styles.excuseFallbackContainer}>
            <Text style={styles.excuseFallbackText}>Absent today?</Text>
            <TouchableOpacity onPress={() => setSubMode('excuse')} activeOpacity={0.7}>
              <Text style={styles.excuseFallbackLink}>Submit Excuse Letter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CHECKIN WIZARD VIEWS */}
      {subMode === 'checkin' && (
        <>
          <View style={styles.checklistCard}>
            <View style={styles.checkTitleRow}>
              <Text style={styles.checklistTitle}>Verification Steps</Text>
              <TouchableOpacity onPress={() => setSubMode('select')}>
                <Text style={styles.backSelectLink}>Back to Options</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.stepGrid}>
              <View style={[styles.stepItem, qrVerified && styles.stepItemDone, step === 1 && styles.stepItemActive]}>
                <Text style={[styles.stepNum, qrVerified && styles.stepNumDone]}>{qrVerified ? '✓' : '1'}</Text>
                <Text style={styles.stepLabel}>QR Code</Text>
              </View>
              <View style={[styles.stepItem, selfieVerified && styles.stepItemDone, step === 2 && styles.stepItemActive]}>
                <Text style={[styles.stepNum, selfieVerified && styles.stepNumDone]}>{selfieVerified ? '✓' : '2'}</Text>
                <Text style={styles.stepLabel}>Selfie</Text>
              </View>
              <View style={[styles.stepItem, gpsVerified && styles.stepItemDone, step === 3 && styles.stepItemActive]}>
                <Text style={[styles.stepNum, gpsVerified && styles.stepNumDone]}>{gpsVerified ? '✓' : '3'}</Text>
                <Text style={styles.stepLabel}>Location</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.wizardContent} showsVerticalScrollIndicator={false}>
            {/* STEP 1: QR CODE INPUT */}
            {step === 1 && (
              <View style={styles.wizardCard}>
                <Text style={styles.wizardCardTitle}>Step 1: Scan Classroom QR</Text>
                <Text style={styles.wizardCardSub}>Input the rolling security token displayed on the professor's projector screen.</Text>

                <View style={styles.viewfinderMock}>
                  <Text style={styles.viewfinderMockText}>📷 Camera Viewfinder Active</Text>
                  <Text style={styles.viewfinderMockSub}>Position the QR code inside the center frame</Text>
                  <View style={styles.viewfinderTarget} />
                </View>

                <Text style={styles.manualLabel}>Or input the rolling token value manually:</Text>
                <TextInput
                  style={styles.tokenInput}
                  placeholder="e.g. CS302_LOGS_83A"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                  value={qrInput}
                  onChangeText={setQrInput}
                />

                <TouchableOpacity 
                  style={styles.autofillLink} 
                  onPress={() => setQrInput(getRollingTokenForTime(activeSession.qrCodePayload, Date.now()))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.autofillLinkText}>⚡ Auto-fill Current Active Token ({getRollingTokenForTime(activeSession.qrCodePayload, Date.now())})</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyQR}>
                  <Text style={styles.verifyBtnText}>Verify QR Code</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: FRONT SELFIE CAPTURE */}
            {step === 2 && (
              <View style={styles.wizardCard}>
                <Text style={styles.wizardCardTitle}>Step 2: Live Front Selfie</Text>
                <Text style={styles.wizardCardSub}>Security rules block gallery uploads. Take a live front selfie to confirm your identity.</Text>

                <View style={styles.selfieViewfinder}>
                  {capturing ? (
                    <ActivityIndicator size="large" color="#1E5EFF" />
                  ) : selfiePath ? (
                    <View style={styles.selfiePreview}>
                      <Text style={styles.selfieIconLarge}>✅👤</Text>
                      <Text style={styles.selfieCaptureConfirm}>Ready for submission</Text>
                    </View>
                  ) : (
                    <View style={styles.ovalFrame}>
                      <Text style={styles.ovalFrameLabel}>Align Face Here</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.verifyBtn} onPress={handleCaptureSelfie} disabled={capturing}>
                  <Text style={styles.verifyBtnText}>
                    {selfiePath ? 'Retake Live Selfie' : 'Capture Live Selfie'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: GPS LOCATION PROXIMITY */}
            {step === 3 && (
              <View style={styles.wizardCard}>
                <Text style={styles.wizardCardTitle}>Step 3: Location Verification</Text>
                <Text style={styles.wizardCardSub}>
                  {activeSession.isOnline 
                    ? 'Online Session: GPS location coordinates are recorded. Proximity checks are bypassed.'
                    : 'Face-to-Face Session: Enforces distance proximity bounds (< 20 meters from classroom).'}
                </Text>

                {/* Virtual Session Location Reporting */}
                {activeSession.isOnline && (
                  <View style={styles.remoteReportContainer}>
                    <Text style={styles.remoteReportTitle}>🏠 Standpoint Location Report</Text>
                    <Text style={styles.remoteReportSub}>If you are attending class from a location other than your home address (e.g. WiFi center, grandmother's house), please toggle below to report it.</Text>
                    
                    <TouchableOpacity
                      style={[styles.remoteTogglePill, isRemoteStandpoint && styles.remoteTogglePillActive]}
                      onPress={() => setIsRemoteStandpoint(!isRemoteStandpoint)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.remoteToggleText, isRemoteStandpoint && styles.remoteToggleTextActive]}>
                        {isRemoteStandpoint ? '🚨 I am not at my registered home address' : '🏠 I am checking in from my registered home address'}
                      </Text>
                    </TouchableOpacity>

                    {isRemoteStandpoint && (
                      <View style={styles.remoteInputsBox}>
                        <Text style={styles.remoteInputLabel}>Current Location Name / Place:</Text>
                        <TextInput
                          style={styles.remoteTextInput}
                          placeholder="e.g. Grandmother's House, WIFI Facility, Cafe"
                          placeholderTextColor="#a0a0a5"
                          value={remoteLocationName}
                          onChangeText={setRemoteLocationName}
                        />

                        <Text style={styles.remoteInputLabel}>Reason for staying at this location:</Text>
                        <TextInput
                          style={[styles.remoteTextInput, { height: 60, textAlignVertical: 'top' }]}
                          placeholder="e.g. Power outage at home, Better internet connectivity, Visiting family"
                          placeholderTextColor="#a0a0a5"
                          multiline={true}
                          value={remoteLocationReason}
                          onChangeText={setRemoteLocationReason}
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* Simulated Locations Selectors */}
                <Text style={styles.simulatorTitle}>Test Location Simulator</Text>
                <View style={styles.locationOptionList}>
                  {SIMULATED_LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.locOptionBtn, selectedLocId === loc.id && styles.locOptionBtnActive]}
                      onPress={() => {
                        setSelectedLocId(loc.id);
                        setGpsVerified(false);
                      }}
                    >
                      <Text style={[styles.locOptionText, selectedLocId === loc.id && styles.locOptionTextActive]}>
                        {loc.label}
                      </Text>
                      <Text style={[styles.locOptionSubText, selectedLocId === loc.id && styles.locOptionTextActiveSub]}>
                        GPS: {loc.lat}, {loc.lng}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.locationDisplayBox}>
                  <Text style={styles.locDisplayHeader}>Captured Coordinates:</Text>
                  {checkingGps ? (
                    <ActivityIndicator size="small" color="#1E5EFF" />
                  ) : (
                    <>
                      <Text style={styles.coordinatesText}>
                        Lat: {studentLoc.lat}
                      </Text>
                      <Text style={styles.coordinatesText}>
                        Lng: {studentLoc.lng}
                      </Text>
                    </>
                  )}
                  <Text style={[styles.locDisplayStatus, gpsVerified && styles.distGreen]}>
                    {gpsVerified 
                      ? (activeSession.isOnline ? '✓ Coordinates Captured (Online Session approved)' : '✓ Within Proximity bounds (< 20m)') 
                      : 'Click Verify to calculate GPS location'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyGPS} disabled={checkingGps}>
                  <Text style={styles.verifyBtnText}>
                    {activeSession.isOnline ? 'Verify Presence Location' : 'Verify GPS Proximity'}
                  </Text>
                </TouchableOpacity>

                {/* Complete submit button - Active only when all checks green */}
                {gpsVerified && qrVerified && selfieVerified && (
                  <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCheckIn}>
                    <Text style={styles.submitBtnText}>Submit Verified Attendance</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* EXCUSE SUBMIT VIEW (Active session context) */}
      {subMode === 'excuse' && (
        <ScrollView style={styles.wizardContent} showsVerticalScrollIndicator={false}>
          <View style={styles.wizardCard}>
            <View style={styles.checkTitleRow}>
              <Text style={styles.wizardCardTitle}>Submit Semester Excuse Letter</Text>
              <TouchableOpacity onPress={() => setSubMode('select')}>
                <Text style={styles.backSelectLink}>Back to Options</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.wizardCardSub}>If absent from class due to official university events or illness, file your excuse credentials.</Text>

            <Text style={styles.manualLabel}>Reason for Excuse:</Text>
            <TextInput
              style={styles.tokenInput}
              placeholder="e.g. University Athletic Meet, Dean's Seminar, Medical Leave"
              placeholderTextColor="#6B7280"
              value={excuseReason}
              onChangeText={setExcuseReason}
            />

            <Text style={styles.manualLabel}>Attach Support Document / Letter:</Text>
            <Text style={styles.fileSelectorSub}>Upload your own excuse document file, or select a simulated file:</Text>
            
            {Platform.OS === 'web' && (
              <input
                type="file"
                accept="image/*"
                id="excuse-file-input-active-el"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            )}

            <TouchableOpacity 
              style={styles.uploadBtnBox} 
              onPress={() => {
                if (Platform.OS === 'web') {
                  const el = document.getElementById('excuse-file-input-active-el');
                  if (el) el.click();
                } else {
                  setSelectedFile('my_excuse_photo.jpg');
                  setExcuseAttachmentUri('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=500&q=80');
                  Alert.alert('Simulated Upload', 'Attached my_excuse_photo.jpg successfully.');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>📎</Text>
                <Text style={styles.uploadBtnBoxText}>Choose excuse file or document...</Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.manualLabel, { marginTop: 18 }]}>Or select from mock documents:</Text>
            <View style={styles.fileOptionsList}>
              {MOCK_FILES.map((file) => {
                const isSelected = selectedFile === file;
                return (
                  <TouchableOpacity
                    key={file}
                    style={[styles.fileCard, isSelected && styles.fileCardActive]}
                    onPress={() => {
                      setSelectedFile(file);
                      setExcuseAttachmentUri(''); // Clear upload to fallback to mock
                    }}
                  >
                    <Text style={styles.fileIcon}>📄</Text>
                    <Text style={[styles.fileNameText, isSelected && styles.fileCardActiveText]}>{file}</Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedFile ? (
              <View style={styles.attachmentBox}>
                <Text style={styles.attachmentLabel}>Attached Document Ready:</Text>
                <Text style={styles.attachmentValue}>📎 {selectedFile}</Text>
                {excuseAttachmentUri ? (
                  <Text style={styles.customUploadNotice}>✓ Custom user letter uploaded</Text>
                ) : (
                  <Text style={styles.customUploadNotice}>✓ Preset mock document attached</Text>
                )}
              </View>
            ) : null}

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: '#1E5EFF', marginTop: 24 }]} 
              onPress={handleSubmitExcuse}
              disabled={submittingExcuse}
            >
              {submittingExcuse ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Excuse Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  noSessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noSessionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  noSessionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  noSessionSub: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  sessionHeader: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionClass: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  deliveryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillBlue: {
    backgroundColor: '#1E5EFF15',
    borderColor: '#1E5EFF',
  },
  pillOrange: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B',
  },
  deliveryPillText: {
    fontSize: 8,
    fontWeight: '900',
  },
  textBlue: {
    color: '#1E5EFF',
  },
  textOrange: {
    color: '#F59E0B',
  },
  sessionRoom: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  // Selection Mode Styles
  selectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
  },
  selectTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  selectSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  optionGrid: {
    gap: 12,
  },
  optionSelectBtn: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  optionSelectExcuseBtn: {
    borderColor: '#1E5EFF50',
    backgroundColor: '#1E5EFF05',
  },
  optionSelectEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  optionSelectLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  optionSelectDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  checklistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
  },
  checkTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  backSelectLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  stepGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  stepItemActive: {
    borderColor: '#1E5EFF',
    backgroundColor: '#1E5EFF08',
  },
  stepItemDone: {
    backgroundColor: '#22C55E08',
    borderColor: '#22C55E',
  },
  stepNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6B7280',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  stepNumDone: {
    backgroundColor: '#22C55E',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  wizardContent: {
    flex: 1,
  },
  wizardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
  },
  wizardCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  wizardCardSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  viewfinderMock: {
    height: 140,
    backgroundColor: '#111827',
    borderRadius: 10,
    marginVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  viewfinderMockText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  viewfinderMockSub: {
    color: '#6B7280',
    fontSize: 9,
    marginTop: 4,
  },
  viewfinderTarget: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderWidth: 2,
    borderColor: '#22C55E',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  manualLabel: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokenInput: {
    backgroundColor: '#ffffff',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  verifyBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  // Selfie styles
  selfieViewfinder: {
    height: 160,
    backgroundColor: '#111827',
    borderRadius: 10,
    marginVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalFrame: {
    width: 90,
    height: 120,
    borderWidth: 2,
    borderColor: '#1E5EFF',
    borderStyle: 'dashed',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalFrameLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
  },
  selfiePreview: {
    alignItems: 'center',
  },
  selfieIconLarge: {
    fontSize: 40,
  },
  selfieCaptureConfirm: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  // File Selector simulation styles
  fileSelectorSub: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  fileOptionsList: {
    gap: 8,
  },
  fileCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileCardActive: {
    borderColor: '#1E5EFF',
    backgroundColor: '#1E5EFF0d',
    borderWidth: 1.5,
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  fileNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  fileCardActiveText: {
    color: '#1E5EFF',
  },
  checkIcon: {
    fontSize: 14,
    color: '#1E5EFF',
    fontWeight: 'bold',
  },
  attachmentBox: {
    backgroundColor: '#1E5EFF08',
    borderColor: '#1E5EFF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  attachmentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E5EFF',
    textTransform: 'uppercase',
  },
  attachmentValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  customUploadNotice: {
    fontSize: 9,
    color: '#22C55E',
    fontWeight: '700',
    marginTop: 4,
  },
  uploadBtnBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid',
    backgroundColor: '#f4f5f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadBtnBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  // Simulator styles
  simulatorTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  locationSimulator: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  simulatorToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  simulatorToggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  simulatorSubText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  locationOptionList: {
    gap: 8,
    marginBottom: 16,
  },
  locOptionBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  locOptionBtnActive: {
    borderColor: '#1E5EFF',
    backgroundColor: '#1E5EFF05',
    borderWidth: 1.5,
  },
  locOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  locOptionTextActive: {
    color: '#1E5EFF',
  },
  locOptionSubText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  locOptionTextActiveSub: {
    color: '#1E5EFFaa',
  },
  locationDisplayBox: {
    backgroundColor: '#f4f5f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  locDisplayHeader: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  // Success card styles
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22C55E',
  },
  successSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginVertical: 20,
    gap: 8,
  },
  summaryItem: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },
  summaryVal: {
    color: '#111827',
    fontWeight: 'normal',
  },
  doneBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  // Custom dropdown selector styles
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  dropdownTriggerActive: {
    borderColor: '#1E5EFF',
    borderWidth: 1.5,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownChevron: {
    fontSize: 10,
    color: '#6B7280',
  },
  dropdownListContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemActive: {
    backgroundColor: '#1E5EFF08',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#111827',
  },
  dropdownTextActive: {
    color: '#1E5EFF',
    fontWeight: '700',
  },
  locDisplayStatus: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 8,
  },
  distGreen: {
    color: '#22C55E',
  },
  autofillLink: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  autofillLinkText: {
    color: '#1E5EFF',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryCheckinBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#1E5EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
    marginTop: 10,
  },
  primaryCheckinEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  primaryCheckinText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  primaryCheckinSub: {
    fontSize: 10,
    color: '#ffffffcc',
    marginTop: 4,
    fontWeight: '500',
  },
  excuseFallbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    marginTop: 12,
  },
  excuseFallbackText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  excuseFallbackLink: {
    fontSize: 12,
    color: '#1E5EFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backLinkRow: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  backLinkRowText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  // Remote Location Reporting Styles
  remoteReportContainer: {
    backgroundColor: '#FAFBFC',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  remoteReportTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  remoteReportSub: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
    marginBottom: 12,
  },
  remoteTogglePill: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  remoteTogglePillActive: {
    backgroundColor: '#F59E0B10',
    borderColor: '#F59E0Baa',
  },
  remoteToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  remoteToggleTextActive: {
    color: '#F59E0B',
  },
  remoteInputsBox: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  remoteInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  remoteTextInput: {
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
    marginBottom: 8,
  },
});
