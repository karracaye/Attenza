import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';

interface Props {
  currentUserName: string;
  onNavigateToLauncher: () => void;
  onNavigateToSubjects: () => void;
  onNavigateToHistory: () => void;
}

interface PendingExcuse {
  id: string;
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

const INITIAL_EXCUSES: PendingExcuse[] = [
  {
    id: 'exc1',
    studentId: '2024-0812',
    studentName: 'Marc Lopez',
    subjectCode: 'CS 302',
    date: 'July 2, 2026',
    timestamp: '08:15 AM',
    excuseReason: 'Official University Athletic Meet representing the campus',
    excuseAttachment: 'Athletic_Meet_Exemption.pdf',
    year: '3rd Year',
    section: 'Section B',
    isIrregular: false,
  },
  {
    id: 'exc2',
    studentId: '2024-0518',
    studentName: 'Katrina Santillan',
    subjectCode: 'IT 204',
    date: 'July 1, 2026',
    timestamp: '02:30 PM',
    excuseReason: 'Severe dental surgery under medical certification',
    excuseAttachment: 'Medical_Certificate.pdf',
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
}: Props) {
  const [excuses, setExcuses] = useState<PendingExcuse[]>(INITIAL_EXCUSES);
  const [selectedExcuse, setSelectedExcuse] = useState<PendingExcuse | null>(null);
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner Header */}
      <View style={styles.welcomeBanner}>
        <View style={styles.bannerGrid}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {currentUserName.split(' ').pop()?.slice(0, 1).toUpperCase() || 'P'}
            </Text>
          </View>
          <View style={styles.welcomeTextColumn}>
            <Text style={styles.greetingText}>Welcome back, {currentUserName}! 🏫</Text>
            <Text style={styles.welcomeSub}>Campus Administrator • Attenza Secured Roster Terminal</Text>
          </View>
        </View>
      </View>

      {/* Launcher Action Shortcut Card */}
      <TouchableOpacity 
        style={styles.launcherCard} 
        onPress={onNavigateToLauncher}
        activeOpacity={0.9}
      >
        <View style={styles.launcherHeaderRow}>
          <Text style={styles.launcherEmoji}>🚀</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.launcherTitle}>Start Attendance Roll Call</Text>
            <Text style={styles.launcherSub}>Launch a secure Face-to-Face or Online class session with rolling OTP QR codes, selfies, and GPS bounds.</Text>
          </View>
        </View>
        <View style={styles.launcherBtn}>
          <Text style={styles.launcherBtnLabel}>Open Roll Call Setup Wizard</Text>
        </View>
      </TouchableOpacity>

      {/* Professor Stats Summary */}
      <Text style={styles.sectionHeaderTitle}>📊 Roster Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active Courses</Text>
            <Text style={styles.statVal}>2 Classes</Text>
            <TouchableOpacity onPress={onNavigateToSubjects}>
              <Text style={styles.statLink}>Manage Schedules ➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg Attendance</Text>
            <Text style={[styles.statVal, { color: '#34c759' }]}>92.4%</Text>
            <TouchableOpacity onPress={onNavigateToHistory}>
              <Text style={styles.statLink}>Review Logs ➔</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Excuse Queue</Text>
            <Text style={[styles.statVal, excuses.length > 0 ? { color: '#ff9500' } : { color: '#1d1d1f' }]}>
              {excuses.length} Pending
            </Text>
            <Text style={styles.statSub}>Requires approval</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Terminal Status</Text>
            <Text style={[styles.statVal, { color: '#34c759' }]}>Secured</Text>
            <Text style={styles.statSub}>1-Check-in-per-device active</Text>
          </View>
        </View>
      </View>

      {/* Today's Schedule Overview */}
      <Text style={styles.sectionHeaderTitle}>🗓️ Today's Classes</Text>
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleItem}>
          <View style={styles.scheduleTimeBox}>
            <Text style={styles.timeLabel}>07:00 AM</Text>
            <Text style={styles.timeSub}>09:00 AM</Text>
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.courseCode}>CS 302</Text>
            <Text style={styles.courseName}>Software Engineering II (3rd Year)</Text>
            <Text style={styles.courseLocation}>🏫 Room 403 • Face-to-Face</Text>
          </View>
        </View>

        <View style={[styles.scheduleItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <View style={styles.scheduleTimeBox}>
            <Text style={styles.timeLabel}>02:00 PM</Text>
            <Text style={styles.timeSub}>04:00 PM</Text>
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.courseCode}>IT 204</Text>
            <Text style={styles.courseName}>Mobile Application Development (3rd Year)</Text>
            <Text style={styles.courseLocation}>🌐 Online Virtual Session</Text>
          </View>
        </View>
      </View>

      {/* Pending Excuse Queue */}
      <Text style={styles.sectionHeaderTitle}>✉️ Pending Excuse Letters ({excuses.length})</Text>
      {excuses.length === 0 ? (
        <View style={styles.emptyExcuseCard}>
          <Text style={styles.emptyExcuseText}>🎉 All excuses processed</Text>
          <Text style={styles.emptyExcuseSub}>No pending student excuse letters in queue.</Text>
        </View>
      ) : (
        paginatedExcuses.map((exc) => (
          <View key={exc.id} style={styles.excuseCard}>
            <View style={styles.excuseHeader}>
              <View>
                <Text style={styles.excuseStudentName}>{exc.studentName}</Text>
                <Text style={styles.excuseStudentDetails}>
                  ID: {exc.studentId} • {exc.year} ({exc.section})
                </Text>
              </View>
              <View style={styles.excuseSubjectBadge}>
                <Text style={styles.excuseSubjectText}>{exc.subjectCode}</Text>
              </View>
            </View>

            <View style={styles.excuseBody}>
              <Text style={styles.excuseReasonText}>
                <Text style={{ fontWeight: '700', color: '#1d1d1f' }}>Reason: </Text>
                {exc.excuseReason}
              </Text>
              <TouchableOpacity 
                style={styles.excuseFileBox} 
                onPress={() => handleOpenLetter(exc)}
              >
                <Text style={styles.excuseFileText}>📎 {exc.excuseAttachment}</Text>
                <Text style={styles.excuseViewText}>View Document</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.excuseActionsRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnReject]} 
                onPress={() => handleRejectExcuse(exc.id, exc.studentName)}
              >
                <Text style={[styles.actionBtnLabel, { color: '#ff3b30' }]}>Reject Letter</Text>
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
            
            <Text style={styles.lightboxFooterText}>
              ✓ Verified against registered medical certificate and campus exempt credentials.
            </Text>
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#0066cc0c',
    borderColor: '#0066cc15',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0066cc',
  },
  welcomeTextColumn: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1d1d1f',
    letterSpacing: -0.2,
  },
  welcomeSub: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 2,
    fontWeight: '500',
  },
  launcherCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
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
    color: '#1d1d1f',
  },
  launcherSub: {
    fontSize: 10,
    color: '#86868b',
    lineHeight: 14,
    marginTop: 3,
    fontWeight: '500',
  },
  launcherBtn: {
    backgroundColor: '#0066cc',
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
    color: '#86868b',
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
    borderColor: '#eaeaea',
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
    color: '#86868b',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d1d1f',
    marginTop: 3,
  },
  statLink: {
    fontSize: 9.5,
    color: '#0066cc',
    fontWeight: '700',
    marginTop: 6,
  },
  statSub: {
    fontSize: 9,
    color: '#86868b',
    marginTop: 4,
    fontWeight: '500',
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
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
    borderBottomColor: '#f4f4f4',
    paddingBottom: 12,
    marginBottom: 12,
  },
  scheduleTimeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc06',
    borderRadius: 8,
    width: 60,
    height: 44,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0066cc',
  },
  timeSub: {
    fontSize: 8,
    color: '#86868b',
    fontWeight: '600',
    marginTop: 1,
  },
  scheduleInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  courseName: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 2,
    fontWeight: '500',
  },
  courseLocation: {
    fontSize: 9.5,
    color: '#86868b',
    fontWeight: '600',
    marginTop: 4,
  },
  emptyExcuseCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyExcuseText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#34c759',
  },
  emptyExcuseSub: {
    fontSize: 9.5,
    color: '#86868b',
    marginTop: 4,
  },
  excuseCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
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
    borderBottomColor: '#f4f4f4',
    paddingBottom: 8,
    marginBottom: 8,
  },
  excuseStudentName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  excuseStudentDetails: {
    fontSize: 9.5,
    color: '#86868b',
    marginTop: 2,
    fontWeight: '500',
  },
  excuseSubjectBadge: {
    backgroundColor: '#0066cc0c',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  excuseSubjectText: {
    color: '#0066cc',
    fontSize: 9,
    fontWeight: '800',
  },
  excuseBody: {
    marginBottom: 12,
  },
  excuseReasonText: {
    fontSize: 11,
    color: '#55555c',
    lineHeight: 16,
  },
  excuseFileBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  excuseFileText: {
    fontSize: 10,
    color: '#0066cc',
    fontWeight: '700',
  },
  excuseViewText: {
    fontSize: 9,
    color: '#86868b',
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
    borderColor: '#eaeaea',
  },
  btnApprove: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
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
    borderBottomColor: '#f4f4f4',
    paddingBottom: 8,
  },
  lightboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  lightboxSubtitle: {
    fontSize: 10.5,
    color: '#86868b',
    marginTop: 2,
  },
  lightboxCloseBtn: {
    padding: 4,
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
    fontSize: 9.5,
    color: '#34c759',
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
