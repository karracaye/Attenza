import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAcademicSection } from './HistoryScreen';
import { AttendanceSessionLog } from '../data/mockData';

interface PendingExcuse {
  id: string;
  studentId: string;
  studentName: string;
  subjectCode: string;
  excuseReason: string;
  excuseAttachment: string;
  excuseAttachmentUri?: string;
  year: string;
  section: string;
  isIrregular: boolean;
}

interface Props {
  currentUserName: string;
  onNavigateToLauncher: () => void;
  onNavigateToSubjects: () => void;
  onNavigateToHistory: () => void;
  historyLogs: AttendanceSessionLog[];
  isDarkMode?: boolean;
}

const INITIAL_EXCUSES: PendingExcuse[] = [
  {
    id: 'ex-1',
    studentId: '2023-0149',
    studentName: 'Katrina Escoba',
    subjectCode: 'IT 204',
    excuseReason: 'Had a severe dental appointment extraction. Attached my clinical medical certificate.',
    excuseAttachment: 'medical_cert_katrina.jpg',
    year: '3rd Year',
    section: 'Section B',
    isIrregular: false,
  },
  {
    id: 'ex-2',
    studentId: '2022-9011',
    studentName: 'Julian Alvarez',
    subjectCode: 'CS 402',
    excuseReason: 'Representing the university in the national robotics league conference.',
    excuseAttachment: 'official_excuse_letter.pdf',
    year: '4th Year',
    section: 'Section A',
    isIrregular: true,
  },
  {
    id: 'ex-3',
    studentId: '2023-0081',
    studentName: 'Sarah Jenkins',
    subjectCode: 'IT 204',
    excuseReason: 'Home Wi-Fi router malfunctioned during the virtual session, preventing QR scan.',
    excuseAttachment: 'isp_ticket_receipt.jpg',
    year: '3rd Year',
    section: 'Section B',
    isIrregular: false,
  },
];

export default function ProfessorDashboardScreen({
  currentUserName,
  onNavigateToLauncher,
  onNavigateToSubjects,
  onNavigateToHistory,
  historyLogs = [],
  isDarkMode = false,
}: Props) {
  const colors = {
    bg: isDarkMode ? '#111827' : '#FAFBFC',
    text: isDarkMode ? '#F9FAFB' : '#111827',
    subText: isDarkMode ? '#9CA3AF' : '#6B7280',
    cardBg: isDarkMode ? '#1F2937' : '#ffffff',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  // Calculate dynamic metrics
  const sessionsCount = historyLogs.length;
  let totalPresentCount = 0;
  let totalStudentsExpected = 0;
  historyLogs.forEach(log => {
    totalPresentCount += log.totalPresent;
    totalStudentsExpected += log.records.length;
  });
  const avgAttendance = totalStudentsExpected > 0 
    ? ((totalPresentCount / totalStudentsExpected) * 100).toFixed(1) 
    : '0.0';

  const [excuses, setExcuses] = useState<PendingExcuse[]>(INITIAL_EXCUSES);
  const [selectedExcuse, setSelectedExcuse] = useState<PendingExcuse | null>(null);
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  // Pagination states for excuses queue list (limit to 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(excuses.length / ITEMS_PER_PAGE);

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const paginatedExcuses = excuses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleApproveExcuse = (id: string, name: string) => {
    setExcuses((prev) => prev.filter((ex) => ex.id !== id));
    Alert.alert('Excuse Approved ✓', `Excuse letter for "${name}" has been approved. Roster record set to EXCUSED.`);
  };

  const handleRejectExcuse = (id: string, name: string) => {
    setExcuses((prev) => prev.filter((ex) => ex.id !== id));
    Alert.alert('Excuse Rejected ✗', `Excuse letter for "${name}" has been marked invalid.`);
  };

  const handleOpenLetter = (excuse: PendingExcuse) => {
    setSelectedExcuse(excuse);
    setIsLightboxVisible(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Banner Header */}
      <View style={styles.welcomeBanner}>
        <View style={styles.bannerGrid}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {currentUserName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.welcomeTextColumn}>
            <Text style={styles.greetingText}>Welcome, Prof. {currentUserName} 👋</Text>
            <Text style={styles.welcomeSub}>College of Information Technology • Academic Faculty</Text>
          </View>
        </View>
      </View>

      {/* Start Roll Call Shortcut Card */}
      <View style={[styles.launcherCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.launcherHeaderRow}>
          <Text style={styles.launcherEmoji}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.launcherTitle, { color: colors.text }]}>Start Attendance Roll Call</Text>
            <Text style={[styles.launcherSub, { color: colors.subText }]}>
              Set subject, target classroom coordinates, delivery mode, and display secure QR code for students.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.launcherBtn} onPress={onNavigateToLauncher}>
          <Text style={styles.launcherBtnLabel}>Start Session Setup</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Statistics Panels */}
      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>📈 Academic Stats Summary</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          {/* Average Attendance rate */}
          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Avg Attendance</Text>
            <Text style={[styles.statVal, { color: '#22C55E' }]}>{avgAttendance}%</Text>
            <Text style={[styles.statSub, { color: colors.subText }]}>{sessionsCount > 0 ? 'Target: > 90%' : 'No sessions run'}</Text>
          </View>

          {/* Pending excuses letters */}
          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Excuse Queue</Text>
            <Text style={[styles.statVal, excuses.length > 0 ? { color: '#F59E0B' } : { color: colors.text }]}>
              {excuses.length} Pending
            </Text>
            <Text style={[styles.statSub, { color: colors.subText }]}>Action required</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {/* Sessions Run */}
          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Sessions Run</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>{sessionsCount}</Text>
            <Text style={[styles.statSub, { color: colors.subText }]}>{sessionsCount === 1 ? '1 session logged' : `${sessionsCount} sessions logged`}</Text>
          </View>

          {/* Quick links to Logs */}
          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Past Records</Text>
            <TouchableOpacity onPress={onNavigateToHistory}>
              <Text style={styles.statLink}>View History Logs ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Today's Teaching Timeline */}
      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>📅 Today's Timetable Schedule</Text>
      <View style={[styles.scheduleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {/* Course 1 */}
        <View style={[styles.scheduleItem, { borderBottomColor: colors.border }]}>
          <View style={styles.scheduleTimeBox}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>08:00 AM</Text>
            <Text style={[styles.timeSub, { color: colors.subText }]}>2 Hours</Text>
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={[styles.courseCode, { color: colors.text }]}>CS 402</Text>
            <Text style={[styles.courseName, { color: colors.text }]}>Software Engineering (4th Year)</Text>
            <Text style={[styles.courseLocation, { color: colors.subText }]}>🏫 Room 302 (F2F Session)</Text>
          </View>
        </View>

        {/* Course 2 */}
        <View style={[styles.scheduleItem, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
          <View style={styles.scheduleTimeBox}>
            <Text style={[styles.timeLabel, { color: colors.text }]}>10:30 AM</Text>
            <Text style={[styles.timeSub, { color: colors.subText }]}>3 Hours</Text>
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={[styles.courseCode, { color: colors.text }]}>IT 204</Text>
            <Text style={[styles.courseName, { color: colors.text }]}>Mobile Application Development (3rd Year)</Text>
            <Text style={[styles.courseLocation, { color: colors.subText }]}>🌐 Online Virtual Session</Text>
          </View>
        </View>
      </View>

      {/* Pending Excuse Queue */}
      <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>✉️ Pending Excuse Letters ({excuses.length})</Text>
      {excuses.length === 0 ? (
        <View style={[styles.emptyExcuseCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.emptyExcuseText, { color: colors.text }]}>🎉 All excuses processed</Text>
          <Text style={[styles.emptyExcuseSub, { color: colors.subText }]}>No pending student excuse letters in queue.</Text>
        </View>
      ) : (
        paginatedExcuses.map((exc) => (
          <View key={exc.id} style={[styles.excuseCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.excuseHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.excuseStudentName, { color: colors.text }]}>{exc.studentName}</Text>
                <Text style={[styles.excuseStudentDetails, { color: colors.subText }]}>
                  ID: {exc.studentId} • {formatAcademicSection(exc.subjectCode, exc.year, exc.section)}
                </Text>
              </View>
              <View style={styles.excuseSubjectBadge}>
                <Text style={styles.excuseSubjectText}>{exc.subjectCode}</Text>
              </View>
            </View>

            <View style={styles.excuseBody}>
              <Text style={[styles.excuseReasonText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Reason: </Text>
                {exc.excuseReason}
              </Text>
              <TouchableOpacity 
                style={[styles.excuseFileBox, { backgroundColor: isDarkMode ? '#11182740' : '#FAFBFC', borderColor: colors.border }]} 
                onPress={() => handleOpenLetter(exc)}
              >
                <Text style={[styles.excuseFileText, { color: colors.text }]}>📎 {exc.excuseAttachment}</Text>
                <Text style={styles.excuseViewText}>View Document</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.excuseActionsRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnReject]} 
                onPress={() => handleRejectExcuse(exc.id, exc.studentName)}
              >
                <Text style={[styles.actionBtnLabel, { color: '#EF4444' }]}>Reject Letter</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnApprove]} 
                onPress={() => handleApproveExcuse(exc.id, exc.studentName)}
              >
                <Text style={[styles.actionBtnLabel, { color: '#ffffff' }]}>Approve & Excuse</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
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

      {/* Lightbox for excuse letter preview */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLightboxVisible}
        onRequestClose={() => setIsLightboxVisible(false)}
      >
        <View style={styles.lightboxOverlay}>
          <View style={styles.lightboxContent}>
            <View style={styles.lightboxHeader}>
              <View>
                <Text style={styles.lightboxTitle}>Excuse Support Attachment</Text>
                <Text style={styles.lightboxSubtitle}>Student: {selectedExcuse?.studentName}</Text>
              </View>
              <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setIsLightboxVisible(false)}>
                <Text style={styles.lightboxCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.lightboxImageContainer}>
              <Image 
                source={require('../../assets/excuse_letter_mock.jpg')}
                style={styles.lightboxImage as any}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.lightboxFooterText}>✓ Image Verification Mock Standby</Text>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  welcomeBanner: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 10,
    marginBottom: 16,
  },
  bannerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF2FF',
    borderColor: '#1E5EFF20',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E5EFF',
  },
  welcomeTextColumn: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  welcomeSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  launcherCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  launcherHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  launcherEmoji: {
    fontSize: 24,
  },
  launcherTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  launcherSub: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
    marginTop: 3,
    fontWeight: '500',
  },
  launcherBtn: {
    backgroundColor: '#1E5EFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  launcherBtnLabel: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 12,
    letterSpacing: 0.8,
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 3,
  },
  statLink: {
    fontSize: 9.5,
    color: '#1E5EFF',
    fontWeight: '700',
    marginTop: 6,
  },
  statSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
    marginBottom: 12,
  },
  scheduleTimeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F9FF',
    borderRadius: 8,
    width: 60,
    height: 44,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E5EFF',
  },
  timeSub: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 1,
  },
  scheduleInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
  courseName: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  courseLocation: {
    fontSize: 9.5,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  emptyExcuseCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyExcuseText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#22C55E',
  },
  emptyExcuseSub: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 4,
  },
  excuseCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  excuseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  excuseStudentName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
  excuseStudentDetails: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  excuseSubjectBadge: {
    backgroundColor: '#F6F9FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  excuseSubjectText: {
    color: '#1E5EFF',
    fontSize: 9,
    fontWeight: '800',
  },
  excuseBody: {
    marginBottom: 12,
  },
  excuseReasonText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 16,
  },
  excuseFileBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  excuseFileText: {
    fontSize: 10,
    color: '#1E5EFF',
    fontWeight: '700',
  },
  excuseViewText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  excuseActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnReject: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
  },
  btnApprove: {
    backgroundColor: '#1E5EFF',
    borderColor: '#1E5EFF',
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Lightbox styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lightboxContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    height: '75%',
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  lightboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  lightboxSubtitle: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
  },
  lightboxCloseBtn: {
    padding: 4,
  },
  lightboxCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  lightboxImageContainer: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    borderRadius: 8,
    overflow: 'hidden',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooterText: {
    fontSize: 9.5,
    color: '#22C55E',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  // Pagination styles
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EAF2FF',
    borderColor: '#1E5EFF20',
    borderWidth: 1,
  },
  pageBtnDisabled: {
    backgroundColor: '#FAFBFC',
    borderColor: '#E5E7EB',
  },
  pageBtnText: {
    color: '#1E5EFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pageBtnTextDisabled: {
    color: '#6B7280',
  },
  pageIndicator: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111827',
  },
});
