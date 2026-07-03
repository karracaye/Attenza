import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  Platform,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Subject, Classroom, StudentCheckInRecord, ActiveSession, getRollingTokenForTime } from '../data/mockData';

interface Props {
  subjects: Subject[];
  classrooms: Classroom[];
  activeSession: ActiveSession | null;
  onStartSession: (
    subjectId: string, 
    classroomId: string, 
    secondsLimit: number, 
    isOnline: boolean,
    latitude?: number,
    longitude?: number
  ) => void;
  onEndSession: (records: StudentCheckInRecord[]) => void;
  liveRecords: StudentCheckInRecord[];
  onRegisterClassroom?: (newRoom: Classroom) => void;
}

export default function ProfessorDashboard({
  subjects,
  classrooms,
  activeSession,
  onStartSession,
  onEndSession,
  liveRecords,
  onRegisterClassroom,
}: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [selectedClassroomId, setSelectedClassroomId] = useState(classrooms[0]?.id || '');
  const [sessionDuration, setSessionDuration] = useState(600); // Default 10 mins (600s)
  const [isOnline, setIsOnline] = useState(false); // F2F by default
  
  // Wizard Step: 1 = Class/Room, 2 = Delivery Mode, 3 = Timer/Confirm
  const [launcherStep, setLauncherStep] = useState<1 | 2 | 3>(1);

  const [timeLeft, setTimeLeft] = useState(0);
  const [rollingToken, setRollingToken] = useState('');

  // Dropdown States
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isClassroomDropdownOpen, setIsClassroomDropdownOpen] = useState(false);
  // Register custom location states
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Lightbox modal states for viewing excuse attachments live
  const [isExcuseLightboxVisible, setIsExcuseLightboxVisible] = useState(false);
  const [lightboxStudentName, setLightboxStudentName] = useState('');
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);

  // Pagination states for live student check-ins roster list (limit to 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(liveRecords.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const paginatedRecords = liveRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Manage timer countdown
  useEffect(() => {
    if (!activeSession) return;
    
    const calculateTimeLeft = () => {
      const expires = new Date(activeSession.expiresAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);
      
      // Auto end session if time runs out
      if (diff <= 0) {
        handleEndSessionWithAlert();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Rolling OTP QR code payload (updates every 2s in memory to check bucket)
  useEffect(() => {
    if (!activeSession) return;
    
    const updateRollingToken = () => {
      setRollingToken(getRollingTokenForTime(activeSession.qrCodePayload, Date.now()));
    };

    updateRollingToken();
    const interval = setInterval(updateRollingToken, 2000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStart = () => {
    if (!selectedSubjectId) {
      Alert.alert('Error', 'Please select a subject.');
      return;
    }
    const finalRoomId = isOnline ? 'room4' : selectedClassroomId;
    if (!isOnline && !finalRoomId) {
      Alert.alert('Error', 'Please select a classroom.');
      return;
    }

    let targetLat: number | undefined;
    let targetLng: number | undefined;

    if (!isOnline) {
      const room = classrooms.find(c => c.id === finalRoomId);
      if (room) {
        targetLat = room.latitude;
        targetLng = room.longitude;
      }
    }

    onStartSession(selectedSubjectId, finalRoomId, sessionDuration, isOnline, targetLat, targetLng);
    setLauncherStep(1); // Reset step back for next session
  };

  const handleSaveCustomLocation = () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name.');
      return;
    }

    // Pinned standing coordinates center for new classroom registration
    const currentStandingLat = 14.59951; 
    const currentStandingLng = 120.98421;

    const newRoom: Classroom = {
      id: `room_${Date.now()}`,
      name: newLocationName.trim(),
      latitude: currentStandingLat,
      longitude: currentStandingLng,
    };

    onRegisterClassroom?.(newRoom);
    setSelectedClassroomId(newRoom.id);
    setNewLocationName('');
    setIsRegisterModalVisible(false);

    Alert.alert(
      'Location Registered 📍',
      `"${newRoom.name}" has been successfully added to the campus database. Coordinate center pinned to your standing position: [${newRoom.latitude.toFixed(5)}, ${newRoom.longitude.toFixed(5)}]`
    );
  };

  const handleEndSessionWithAlert = () => {
    onEndSession(liveRecords);
    Alert.alert('Session Ended', `Roster saved. Total checked in: ${liveRecords.length} students.`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId);

  // RENDER ACTIVE ATTENDANCE SCREEN
  if (activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.activeHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.activeCode}>{activeSession.subjectName}</Text>
              <View style={[styles.deliveryPill, activeSession.isOnline ? styles.pillOrange : styles.pillBlue]}>
                <Text style={[styles.deliveryPillText, activeSession.isOnline ? styles.textOrange : styles.textBlue]}>
                  {activeSession.isOnline ? '🌐 ONLINE' : '🏫 F2F'}
                </Text>
              </View>
            </View>
            <Text style={styles.activeRoom}>
              {activeSession.isOnline ? '🌐 Virtual Remote Class (No GPS limit)' : `📍 ${activeSession.classroomName}`}
            </Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Professor Dynamic QR code */}
          <View style={styles.qrContainerCard}>
            <Text style={styles.qrCardTitle}>Layer 1: Scanning QR Code</Text>
            <Text style={styles.qrCardSub}>Refreshes dynamically to prevent photo sharing and remote scans.</Text>
            
            <View style={styles.qrMockCodeOutline}>
              <View style={styles.qrGridSquare}>
                <View style={[styles.qrCornerBox, { top: 12, left: 12 }]} />
                <View style={[styles.qrCornerBox, { top: 12, right: 12 }]} />
                <View style={[styles.qrCornerBox, { bottom: 12, left: 12 }]} />
                <View style={styles.qrCenterDot} />
              </View>
            </View>

            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Secure Rolling Token:</Text>
              <Text style={styles.tokenValue}>{rollingToken}</Text>
            </View>
          </View>

          {/* Live Check-in Roster Tracker */}
          <View style={styles.rosterCard}>
            <View style={styles.rosterHeader}>
              <Text style={styles.rosterTitle}>Verified Student Roster</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {liveRecords.filter(r => r.status === 'PRESENT').length} On-Time • {liveRecords.filter(r => r.status === 'LATE').length} Late • {liveRecords.filter(r => r.status === 'EXCUSED').length} Excused
                </Text>
              </View>
            </View>

            {liveRecords.length === 0 ? (
              <View style={styles.emptyRosterBlock}>
                <Text style={styles.emptyRosterText}>Waiting for check-ins...</Text>
                <Text style={styles.emptyRosterSub}>Ask students to scan the QR code and verify themselves.</Text>
              </View>
            ) : (
              paginatedRecords.map((record) => {
                const isExcused = record.status === 'EXCUSED';
                const initials = record.studentName
                  .split(' ')
                  .filter(Boolean)
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                
                return (
                  <View key={record.studentId} style={styles.studentRosterCard}>
                    <View style={styles.rosterCardMain}>
                      <View style={styles.studentAvatarContainer}>
                        {isExcused ? (
                          <View style={[styles.avatarCircle, { backgroundColor: '#0066cc10', borderColor: '#0066cc30', borderWidth: 1 }]}>
                            <Text style={styles.avatarInitialsExcused}>✉️</Text>
                          </View>
                        ) : (
                          <View style={[
                            styles.avatarCircle, 
                            record.status === 'LATE' ? { backgroundColor: '#ff950010' } : { backgroundColor: '#34c75910' }
                          ]}>
                            <Text style={[
                              styles.avatarInitials,
                              record.status === 'LATE' ? { color: '#ff9500' } : { color: '#34c759' }
                            ]}>
                              {initials}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.studentInfo}>
                        <View style={styles.studentNameRow}>
                          <Text style={styles.studentName} numberOfLines={1}>{record.studentName}</Text>
                          
                          {/* Arrival status pill */}
                          <View style={[
                            styles.statusBadgeSim, 
                            record.status === 'LATE' ? styles.badgeLate : 
                            record.status === 'EXCUSED' ? styles.badgeExcused : styles.badgePresent
                          ]}>
                            <Text style={[
                              styles.statusTextSim, 
                              record.status === 'LATE' ? styles.textLate : 
                              record.status === 'EXCUSED' ? styles.textExcused : styles.textPresent
                            ]}>
                              {record.status === 'EXCUSED' ? 'EXCUSED' : (record.status === 'LATE' ? 'LATE' : 'ON TIME')}
                            </Text>
                          </View>

                          {record.isIrregular && (
                            <View style={styles.irregBadge}>
                              <Text style={styles.irregBadgeText}>IRREGULAR</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.studentIdText}>
                          ID: {record.studentId} • {record.year} ({record.section}) • {record.timestamp}
                        </Text>
                      </View>
                    </View>

                    {/* Verification Chips Status bar */}
                    <View style={styles.verificationBar}>
                      <View style={[styles.verifChip, record.qrVerified ? styles.verifChipGreen : styles.verifChipRed]}>
                        <Text style={[styles.verifChipText, record.qrVerified ? styles.verifTextGreen : styles.verifTextRed]}>
                          {record.qrVerified ? '✓ QR Verified' : '✗ QR Code'}
                        </Text>
                      </View>
                      
                      <View style={[styles.verifChip, record.selfieVerified ? styles.verifChipGreen : styles.verifChipRed]}>
                        <Text style={[styles.verifChipText, record.selfieVerified ? styles.verifTextGreen : styles.verifTextRed]}>
                          {record.selfieVerified ? '✓ Selfie Verified' : '✗ Selfie'}
                        </Text>
                      </View>

                      <View style={[styles.verifChip, record.gpsVerified ? styles.verifChipGreen : styles.verifChipRed]}>
                        <Text style={[styles.verifChipText, record.gpsVerified ? styles.verifTextGreen : styles.verifTextRed]}>
                          {record.gpsVerified 
                            ? (activeSession.isOnline ? '✓ Home GPS' : '✓ Room GPS') 
                            : '✗ GPS Location'}
                        </Text>
                      </View>
                    </View>

                    {/* Details row: excuse or distance details */}
                    <View style={styles.rosterDetailsRow}>
                      {isExcused ? (
                        <View style={styles.excuseCallout}>
                          <Text style={styles.excuseCalloutText} numberOfLines={1}>
                            📎 Excuse: {record.excuseReason}
                          </Text>
                          <TouchableOpacity 
                            style={styles.attachmentLinkPill}
                            onPress={() => {
                              setLightboxStudentName(record.studentName);
                              setLightboxImageUri(record.excuseAttachmentUri || null);
                              setIsExcuseLightboxVisible(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.attachmentLinkText}>View Letter</Text>
                          </TouchableOpacity>
                        </View>
                      ) : activeSession.isOnline ? (
                        <View style={{ width: '100%' }}>
                          <Text style={[styles.distanceLabel, styles.distGreen]}>
                            📍 GPS Coordinates: {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
                          </Text>
                          {record.isRemoteStandpoint && (
                            <View style={styles.remoteReportDetailsBox}>
                              <View style={styles.remoteReportHeader}>
                                <Text style={styles.remoteReportAlertTitle}>⚠️ ATTENDING CLASS OFF-SITE</Text>
                              </View>
                              <Text style={styles.remoteReportValueText}>
                                <Text style={{ fontWeight: '700', color: '#1d1d1f' }}>Location: </Text>
                                {record.remoteLocationName || 'N/A'}
                              </Text>
                              <Text style={styles.remoteReportValueText}>
                                <Text style={{ fontWeight: '700', color: '#1d1d1f' }}>Reason: </Text>
                                {record.remoteLocationReason || 'N/A'}
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.proximityDetailsBox}>
                          <Text style={[
                            styles.distanceLabel, 
                            record.distanceMeters <= 15 ? styles.distGreen : styles.distRed
                          ]}>
                            📍 {record.distanceMeters.toFixed(1)}m from Room Standpoint (within bounds)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity 
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} 
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>◀ Prev</Text>
                </TouchableOpacity>
                
                <Text style={styles.pageIndicator}>
                  Page {currentPage} of {totalPages}
                </Text>
                
                <TouchableOpacity 
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} 
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>Next ▶</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>

        <TouchableOpacity style={styles.endButton} onPress={handleEndSessionWithAlert}>
          <Text style={styles.endButtonText}>End Session & Save Logs</Text>
        </TouchableOpacity>

        {/* LIGHTBOX MODAL FOR MOCK EXCUSE LETTER IMAGE */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={isExcuseLightboxVisible}
          onRequestClose={() => setIsExcuseLightboxVisible(false)}
        >
          <View style={styles.lightboxOverlay}>
            <View style={styles.lightboxContent}>
              <View style={styles.lightboxHeader}>
                <View>
                  <Text style={styles.lightboxTitle}>Excuse Support Attachment</Text>
                  <Text style={styles.lightboxSubtitle}>Student: {lightboxStudentName}</Text>
                </View>
                <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setIsExcuseLightboxVisible(false)}>
                  <Text style={styles.lightboxCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.lightboxImageContainer}>
                {lightboxImageUri ? (
                  <Image 
                    source={{ uri: lightboxImageUri }}
                    style={styles.lightboxImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Image 
                    source={require('../../assets/excuse_letter_mock.jpg')}
                    style={styles.lightboxImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              
              <Text style={styles.lightboxFooterText}>
                ✓ Validated against official department dean waiver records.
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // RENDER INITIATION / CONFIGURATION SCREEN (Redesigned with Step-by-Step wizard indicators)
  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.headerTitle}>Professor Terminal</Text>
        <Text style={styles.headerSubtitle}>Start a secured class attendance roll call session.</Text>
      </View>

      {/* Modern Horizontal Wizard Step Indicator */}
      <View style={styles.wizardIndicatorRow}>
        <View style={styles.wizardStepNode}>
          <View style={[styles.stepNumberCircle, launcherStep >= 1 && styles.stepNumberCircleActive]}>
            <Text style={[styles.stepNumberText, launcherStep >= 1 && styles.stepNumberTextActive]}>1</Text>
          </View>
          <Text style={[styles.stepIndicatorLabelText, launcherStep === 1 && styles.stepIndicatorLabelTextActive]}>Mode</Text>
        </View>
        
        <View style={[styles.wizardLine, launcherStep >= 2 && styles.wizardLineActive]} />

        <View style={styles.wizardStepNode}>
          <View style={[styles.stepNumberCircle, launcherStep >= 2 && styles.stepNumberCircleActive]}>
            <Text style={[styles.stepNumberText, launcherStep >= 2 && styles.stepNumberTextActive]}>2</Text>
          </View>
          <Text style={[styles.stepIndicatorLabelText, launcherStep === 2 && styles.stepIndicatorLabelTextActive]}>Subject</Text>
        </View>

        <View style={[styles.wizardLine, launcherStep >= 3 && styles.wizardLineActive]} />

        <View style={styles.wizardStepNode}>
          <View style={[styles.stepNumberCircle, launcherStep >= 3 && styles.stepNumberCircleActive]}>
            <Text style={[styles.stepNumberText, launcherStep >= 3 && styles.stepNumberTextActive]}>3</Text>
          </View>
          <Text style={[styles.stepIndicatorLabelText, launcherStep === 3 && styles.stepIndicatorLabelTextActive]}>Timer</Text>
        </View>
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* STEP 1: Delivery Mode Selection */}
        {launcherStep === 1 && (
          <View style={styles.wizardCard}>
            <Text style={styles.wizardCardTitle}>Step 1: Choose Delivery Mode</Text>
            <Text style={styles.wizardCardSub}>Select how this class will be conducted. Face-to-Face enforces physical GPS verification check bounds.</Text>

            <View style={styles.deliveryModeSelector}>
              <TouchableOpacity
                style={[styles.deliveryBtnOption, !isOnline && styles.deliveryBtnOptionActive]}
                onPress={() => setIsOnline(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryBtnEmoji}>🏫</Text>
                <Text style={[styles.deliveryBtnLabel, !isOnline && styles.deliveryBtnLabelActive]}>Face-to-Face</Text>
                <Text style={styles.deliveryBtnSub}>Requires physical GPS classroom proximity check</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deliveryBtnOption, isOnline && styles.deliveryBtnOptionActive]}
                onPress={() => setIsOnline(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryBtnEmoji}>🌐</Text>
                <Text style={[styles.deliveryBtnLabel, isOnline && styles.deliveryBtnLabelActive]}>Online Class</Text>
                <Text style={styles.deliveryBtnSub}>Check in from home (Proximity check bypassed)</Text>
              </TouchableOpacity>
            </View>

            {isOnline && (
              <View style={styles.onlineClassroomNotice}>
                <Text style={styles.onlineNoticeEmoji}>🌐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onlineNoticeTitle}>Virtual Classroom Mode</Text>
                  <Text style={styles.onlineNoticeSub}>Location check-in coordinates are recorded, but proximity limit restrictions are disabled.</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Select Subject & Location */}
        {launcherStep === 2 && (
          <View style={styles.wizardCard}>
            <Text style={styles.wizardCardTitle}>Step 2: Select Subject {!isOnline && '& Location'}</Text>
            <Text style={styles.wizardCardSub}>
              {isOnline 
                ? 'Choose the course subject you are launching a session for.' 
                : 'Choose the target classroom and the subject you will teach this semester.'}
            </Text>

            {/* Select Class / Subject Dropdown */}
            <Text style={styles.formLabel}>Select Class / Subject</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, isSubjectDropdownOpen && styles.dropdownTriggerActive]}
              onPress={() => {
                setIsSubjectDropdownOpen(!isSubjectDropdownOpen);
                setIsClassroomDropdownOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownTriggerText}>
                {selectedSubject ? `${selectedSubject.code} - ${selectedSubject.name}` : 'Select a subject...'}
              </Text>
              <Text style={styles.dropdownChevron}>{isSubjectDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isSubjectDropdownOpen && (
              <ScrollView style={styles.dropdownListContainer} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {subjects.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.dropdownItem, selectedSubjectId === sub.id && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedSubjectId(sub.id);
                      setIsSubjectDropdownOpen(false);
                    }}
                  >
                    <View style={styles.dropdownItemInfo}>
                      <Text style={[styles.dropdownItemCode, selectedSubjectId === sub.id && styles.dropdownTextActive]}>{sub.code}</Text>
                      <Text style={[styles.dropdownItemName, selectedSubjectId === sub.id && styles.dropdownTextActiveSub]}>{sub.name}</Text>
                    </View>
                    {selectedSubjectId === sub.id && <Text style={styles.dropdownCheckMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Select Classroom Location (only shown if F2F mode, which is toggled next) */}
            {!isOnline && (
              <>
                <Text style={styles.formLabel}>Select Classroom Location</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, isClassroomDropdownOpen && styles.dropdownTriggerActive]}
                  onPress={() => {
                    setIsClassroomDropdownOpen(!isClassroomDropdownOpen);
                    setIsSubjectDropdownOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownTriggerText}>
                    {selectedClassroom ? selectedClassroom.name : 'Select a classroom location...'}
                  </Text>
                  <Text style={styles.dropdownChevron}>{isClassroomDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isClassroomDropdownOpen && (
                  <ScrollView style={styles.dropdownListContainer} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {classrooms.filter(c => c.id !== 'room4').map((room) => (
                      <TouchableOpacity
                        key={room.id}
                        style={[styles.dropdownItem, selectedClassroomId === room.id && styles.dropdownItemActive]}
                        onPress={() => {
                          setSelectedClassroomId(room.id);
                          setIsClassroomDropdownOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemInfo}>
                          <Text style={[styles.dropdownItemCode, selectedClassroomId === room.id && styles.dropdownTextActive]}>{room.name}</Text>
                          <Text style={[styles.dropdownItemName, selectedClassroomId === room.id && styles.dropdownTextActiveSub]}>
                            GPS: {room.latitude.toFixed(5)}, {room.longitude.toFixed(5)}
                          </Text>
                        </View>
                        {selectedClassroomId === room.id && <Text style={styles.dropdownCheckMark}>✓</Text>}
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.dropdownItem, { backgroundColor: '#34c75910', borderTopWidth: 1, borderTopColor: '#eaeaea' }]}
                      onPress={() => {
                        setIsClassroomDropdownOpen(false);
                        setIsRegisterModalVisible(true);
                      }}
                    >
                      <View style={styles.dropdownItemInfo}>
                        <Text style={[styles.dropdownItemCode, { color: '#34c759', fontWeight: 'bold' }]}>➕ Register New Area / Location...</Text>
                        <Text style={styles.dropdownItemName}>Capture where you are standing to save as a new class zone</Text>
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </>
            )}
          </View>
        )}

        {/* STEP 3: Duration Limit & Summary Confirmation */}
        {launcherStep === 3 && (
          <View style={styles.wizardCard}>
            <Text style={styles.wizardCardTitle}>Step 3: Verification Timer & Start</Text>
            <Text style={styles.wizardCardSub}>Choose how long the QR code remains active. Verify the details summary before launching.</Text>

            <Text style={styles.formLabel}>Verification Time Limit</Text>
            <View style={styles.durationSelector}>
              {[300, 600, 1200].map((dur) => (
                <TouchableOpacity
                  key={dur}
                  style={[styles.durationBtn, sessionDuration === dur && styles.durationBtnActive]}
                  onPress={() => setSessionDuration(dur)}
                >
                  <Text style={[styles.durationBtnText, sessionDuration === dur && styles.durationBtnTextActive]}>
                    {dur / 60} mins
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.durationHint}>
              Students timing in after 3 minutes will be automatically classified as LATE.
            </Text>

            {/* Launch Summary Checklist */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📝 Launch Summary Checklist</Text>
              
              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>Subject:</Text>
                <Text style={styles.summaryItemVal} numberOfLines={1}>{selectedSubject ? selectedSubject.code : 'N/A'}</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>Delivery Mode:</Text>
                <Text style={[styles.summaryItemVal, { color: isOnline ? '#ff9500' : '#0066cc' }]}>
                  {isOnline ? '🌐 Online' : '🏫 Face-to-Face'}
                </Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>Room / Location:</Text>
                <Text style={styles.summaryItemVal}>{isOnline ? 'Virtual Room' : (selectedClassroom ? selectedClassroom.name : 'N/A')}</Text>
              </View>



              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>Session Timer:</Text>
                <Text style={styles.summaryItemVal}>{sessionDuration / 60} minutes</Text>
              </View>

              <View style={styles.summaryItemRow}>
                <Text style={styles.summaryItemLabel}>Late Threshold:</Text>
                <Text style={[styles.summaryItemVal, { color: '#ff9500' }]}>After 3 mins</Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Buttons Row */}
        <View style={styles.wizardButtonsRow}>
          {launcherStep > 1 && (
            <TouchableOpacity style={styles.wizardBackBtn} onPress={() => setLauncherStep((prev) => (prev - 1) as any)}>
              <Text style={styles.wizardBackBtnLabel}>Back</Text>
            </TouchableOpacity>
          )}

          {launcherStep < 3 ? (
            <TouchableOpacity 
              style={styles.wizardNextBtn} 
              onPress={() => {
                if (launcherStep === 2) {
                  if (!selectedSubjectId) {
                    Alert.alert('Error', 'Please select a subject.');
                    return;
                  }
                  if (!isOnline && !selectedClassroomId) {
                    Alert.alert('Error', 'Please select a classroom.');
                    return;
                  }
                }
                setLauncherStep((prev) => (prev + 1) as any);
              }}
            >
              <Text style={styles.wizardNextBtnLabel}>Next Step</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.wizardNextBtn, { backgroundColor: '#34c759' }]} onPress={handleStart}>
              <Text style={styles.wizardNextBtnLabel}>🚀 Launch Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Register Custom Location Modal */}
      <Modal
        visible={isRegisterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRegisterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 360 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>📍 Register New Class Area</Text>
              <TouchableOpacity onPress={() => setIsRegisterModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTextBody}>
                Capture the coordinates where you are standing right now (e.g. at the Gymnasium or Lecture Hall) to register it as a new class zone.
              </Text>

              <Text style={styles.modalLabel}>Location Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Gymnasium, Court Area"
                value={newLocationName}
                onChangeText={setNewLocationName}
                placeholderTextColor="#a0a0a5"
              />

              <View style={styles.gpsDisplayBox}>
                <Text style={styles.gpsLabel}>📍 Pinned Coords (Standing Point):</Text>
                <Text style={styles.gpsValue}>
                  14.59951, 120.98421
                </Text>
                <Text style={styles.gpsSub}>
                  (Pins geofence center automatically to your current device GPS coordinates)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalBtnSave, { backgroundColor: '#34c759', marginTop: 14 }]}
                onPress={handleSaveCustomLocation}
              >
                <Text style={styles.modalBtnSaveText}>Save & Select Location</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Minimalist clean background
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dashboardHeader: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1d1d1f',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#86868b',
    marginTop: 4,
    lineHeight: 18,
  },
  formScroll: {
    flex: 1,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  deliveryModeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  deliveryBtnOption: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  deliveryBtnOptionActive: {
    borderColor: '#0066cc',
    backgroundColor: '#0066cc05',
    borderWidth: 1.5,
  },
  deliveryBtnEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  deliveryBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  deliveryBtnLabelActive: {
    color: '#0066cc',
  },
  deliveryBtnSub: {
    fontSize: 9,
    color: '#86868b',
    marginTop: 2,
    textAlign: 'center',
  },
  onlineNoticeEmoji: {
    fontSize: 20,
  },
  onlineClassroomNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 14,
    gap: 12,
    marginTop: 12,
  },
  onlineNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  onlineNoticeSub: {
    fontSize: 11,
    color: '#86868b',
    marginTop: 3,
    lineHeight: 15,
  },
  // Custom Dropdown Trigger Styles
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  dropdownTriggerActive: {
    borderColor: '#0066cc',
    borderWidth: 1.5,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  dropdownChevron: {
    fontSize: 10,
    color: '#86868b',
  },
  dropdownListContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 12,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f4f4f4',
  },
  dropdownItemActive: {
    backgroundColor: '#0066cc08',
  },
  dropdownItemInfo: {
    flex: 1,
  },
  dropdownItemCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  dropdownItemName: {
    fontSize: 11,
    color: '#86868b',
    marginTop: 2,
  },
  dropdownTextActive: {
    color: '#0066cc',
  },
  dropdownTextActiveSub: {
    color: '#0066ccaa',
  },
  dropdownCheckMark: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  durationBtnActive: {
    backgroundColor: '#1d1d1f',
    borderColor: '#1d1d1f',
  },
  durationBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#86868b',
  },
  durationBtnTextActive: {
    color: '#ffffff',
  },
  durationHint: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 4,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  standpointHint: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  startBtnContainer: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
  },
  startBtn: {
    backgroundColor: '#34c759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  // Active session display layouts
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 14,
    marginBottom: 16,
  },
  activeCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1d1d1f',
    letterSpacing: -0.3,
  },
  activeRoom: {
    fontSize: 11,
    color: '#86868b',
    marginTop: 4,
    fontWeight: '600',
  },
  timerBadge: {
    backgroundColor: '#ff3b3010',
    borderColor: '#ff3b3030',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  timerText: {
    color: '#ff3b30',
    fontSize: 13,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillBlue: {
    backgroundColor: '#0066cc10',
  },
  pillOrange: {
    backgroundColor: '#ff950010',
  },
  deliveryPillText: {
    fontSize: 8,
    fontWeight: '900',
  },
  textBlue: {
    color: '#0066cc',
  },
  textOrange: {
    color: '#ff9500',
  },
  scrollContainer: {
    flex: 1,
  },
  // Professor Display QR Code Card
  qrContainerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  qrCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  qrCardSub: {
    fontSize: 11,
    color: '#86868b',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 16,
  },
  qrMockCodeOutline: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#1d1d1f',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
  },
  qrGridSquare: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f4f5f6',
    borderRadius: 8,
    position: 'relative',
  },
  qrCornerBox: {
    width: 36,
    height: 36,
    borderWidth: 6,
    borderColor: '#1d1d1f',
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  qrCenterDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0066cc',
    alignSelf: 'center',
    top: '45%',
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#86868b',
  },
  tokenValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0066cc',
    letterSpacing: 1,
  },
  // Live Student Roster Check-ins
  rosterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 12,
    marginBottom: 16,
  },
  rosterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  countBadge: {
    backgroundColor: '#f4f5f6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86868b',
  },
  emptyRosterBlock: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyRosterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#86868b',
  },
  emptyRosterSub: {
    fontSize: 11,
    color: '#86868b',
    marginTop: 4,
    textAlign: 'center',
  },
  studentRosterCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  rosterCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentAvatarContainer: {
    marginRight: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '800',
  },
  avatarInitialsExcused: {
    fontSize: 13,
  },
  studentInfo: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  studentIdText: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 2,
    fontWeight: '500',
  },
  verificationBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  verifChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  verifChipGreen: {
    backgroundColor: '#34c75908',
    borderColor: '#34c75930',
  },
  verifChipRed: {
    backgroundColor: '#ff3b3008',
    borderColor: '#ff3b3030',
  },
  verifChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  verifTextGreen: {
    color: '#34c759',
  },
  verifTextRed: {
    color: '#ff3b30',
  },
  rosterDetailsRow: {
    borderTopWidth: 0.5,
    borderTopColor: '#f4f4f4',
    paddingTop: 8,
  },
  excuseCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0066cc05',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  excuseCalloutText: {
    fontSize: 10,
    color: '#0066cc',
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  remoteReportDetailsBox: {
    backgroundColor: '#ff950006',
    borderLeftWidth: 3,
    borderLeftColor: '#ff9500',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  remoteReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  remoteReportAlertTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff9500',
    letterSpacing: 0.5,
  },
  remoteReportValueText: {
    fontSize: 11,
    color: '#55555c',
    marginTop: 2,
  },
  proximityDetailsBox: {
    backgroundColor: '#f5f5f7',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  distanceLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  distGreen: {
    color: '#34c759',
  },
  distRed: {
    color: '#ff3b30',
  },
  endButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  endButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  // Lightbox layouts
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#000000ee',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lightboxContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    height: '75%',
    maxHeight: 550,
    padding: 20,
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 10,
    marginBottom: 16,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  lightboxSubtitle: {
    fontSize: 11,
    color: '#86868b',
    marginTop: 2,
    fontWeight: '600',
  },
  lightboxCloseBtn: {
    padding: 8,
  },
  lightboxCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#86868b',
  },
  lightboxImageContainer: {
    flex: 1,
    backgroundColor: '#f4f5f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooterText: {
    fontSize: 10,
    color: '#34c759',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  statusBadgeSim: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgePresent: {
    backgroundColor: '#34c75915',
  },
  badgeLate: {
    backgroundColor: '#ff950015',
  },
  badgeExcused: {
    backgroundColor: '#0066cc15',
  },
  statusTextSim: {
    fontSize: 7,
    fontWeight: '900',
  },
  textPresent: {
    color: '#34c759',
  },
  textLate: {
    color: '#ff9500',
  },
  textExcused: {
    color: '#0066cc',
  },
  irregBadge: {
    backgroundColor: '#ff950010',
    borderColor: '#ff950050',
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  irregBadgeText: {
    color: '#ff9500',
    fontSize: 7,
    fontWeight: '900',
  },
  attachmentLinkPill: {
    backgroundColor: '#0066cc10',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attachmentLinkText: {
    color: '#0066cc',
    fontSize: 8,
    fontWeight: '800',
  },
  // Step indicator styles
  wizardIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 6,
    paddingHorizontal: 6,
  },
  wizardStepNode: {
    alignItems: 'center',
    gap: 4,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberCircleActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#86868b',
  },
  stepNumberTextActive: {
    color: '#ffffff',
  },
  stepIndicatorLabelText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#86868b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepIndicatorLabelTextActive: {
    color: '#0066cc',
  },
  wizardLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#f4f5f6',
    marginHorizontal: 8,
    marginTop: -14, // align with circle centers
  },
  wizardLineActive: {
    backgroundColor: '#0066cc',
  },
  wizardCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  wizardCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  wizardCardSub: {
    fontSize: 11,
    color: '#86868b',
    lineHeight: 16,
    marginBottom: 14,
  },
  wizardButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 30,
  },
  wizardBackBtn: {
    flex: 1,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  wizardBackBtnLabel: {
    color: '#1d1d1f',
    fontWeight: '700',
    fontSize: 13,
  },
  wizardNextBtn: {
    flex: 1.5,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  wizardNextBtnLabel: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: '#0066cc05',
    borderColor: '#0066cc20',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0066cc',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#0066cc10',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#86868b',
    fontWeight: '600',
  },
  summaryItemVal: {
    fontSize: 12,
    color: '#1d1d1f',
    fontWeight: '700',
  },
  // Custom Location Registration Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 8,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  modalCloseIcon: {
    fontSize: 16,
    color: '#86868b',
    fontWeight: 'bold',
    padding: 4,
  },
  modalTextBody: {
    fontSize: 11,
    color: '#86868b',
    lineHeight: 16,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f5f5f7',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1d1d1f',
    marginBottom: 14,
  },
  gpsDisplayBox: {
    backgroundColor: '#f0f9ff',
    borderColor: '#b9e6fe',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  gpsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gpsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    marginTop: 2,
  },
  gpsSub: {
    fontSize: 9,
    color: '#0284c7aa',
    marginTop: 2,
  },
  modalBtnSave: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSaveText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  // Pagination Styles
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#eaeaea',
    paddingTop: 14,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0066cc0d',
    borderColor: '#0066cc20',
    borderWidth: 1,
  },
  pageBtnDisabled: {
    backgroundColor: '#f5f5f7',
    borderColor: '#eaeaea',
  },
  pageBtnText: {
    color: '#0066cc',
    fontSize: 11,
    fontWeight: '800',
  },
  pageBtnTextDisabled: {
    color: '#86868b',
  },
  pageIndicator: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1d1d1f',
  },
});
