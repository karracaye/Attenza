import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveSession } from '../data/mockData';
import { formatAcademicSection } from './HistoryScreen';

interface Props {
  studentProfile: { studentId: string; studentName: string; year: string; section: string };
  activeSession: ActiveSession | null;
  onNavigateToCheckIn: () => void;
}

export default function StudentDashboard({
  studentProfile,
  activeSession,
  onNavigateToCheckIn,
}: Props) {
  // Format section string similar to "CS4B" or standard format
  const sectionCode = formatAcademicSection('CS 402', studentProfile.year, studentProfile.section);
  const cleanSection = sectionCode.replace('-', ''); // e.g. CS3B or CS4B

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner Header Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {studentProfile.studentName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.welcomeTextColumn}>
          <Text style={styles.greetingText}>
            Good day, {studentProfile.studentName.split(' ')[0]}! 👋
          </Text>
          <Text style={styles.welcomeSub}>
            ID: {studentProfile.studentId}  •  {studentProfile.year} ({cleanSection})
          </Text>
        </View>
      </View>

      {/* Active Session Notification Widget / Standby Widget */}
      {activeSession ? (
        <TouchableOpacity 
          style={styles.activeSessionCard} 
          onPress={onNavigateToCheckIn}
          activeOpacity={0.9}
        >
          <View style={styles.activeHeaderRow}>
            <View style={styles.pulseIndicatorRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>LIVE ROLL CALL IN PROGRESS</Text>
            </View>
            <View style={styles.activeBellCircle}>
              <Ionicons name="notifications" size={16} color="#1E5EFF" />
            </View>
          </View>
          <Text style={styles.sessionSubject}>{activeSession.subjectName}</Text>
          <Text style={styles.sessionDetails}>
            Mode: {activeSession.isOnline ? '🌐 Online Session' : `🏫 Room ${activeSession.classroomName}`}
          </Text>
          
          <View style={styles.checkinActionBtn}>
            <Text style={styles.checkinActionText}>⚡ Tap to Verify Presence Now</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.standbyCard}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.standbyTitleRow}>
              <View style={styles.standbyDot} />
              <Text style={styles.standbyTitle}>Attendance Systems Standby</Text>
            </View>
            <Text style={styles.standbySub}>
              No active QR roll calls detected for your account. Keep this tab open; your screen will notify you as soon as your professor starts class.
            </Text>
          </View>
          <View style={styles.standbyBellCircle}>
            <Ionicons name="notifications-outline" size={20} color="#22C55E" />
          </View>
        </View>
      )}

      {/* Attendance Summary Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <Ionicons name="bar-chart" size={16} color="#1E5EFF" style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.viewAllLink}>View Details &gt;</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {/* Card 1: Attendance Rate */}
        <View style={styles.statBox}>
          <View style={styles.statTextGroup}>
            <Text style={styles.statLabel}>Attendance Rate</Text>
            <Text style={styles.statVal}>97.5 %</Text>
            <Text style={styles.statSub}>Target: &gt; 90%</Text>
          </View>
          <View style={styles.progressRingSim}>
            <Ionicons name="trending-up" size={16} color="#1E5EFF" />
          </View>
        </View>

        {/* Card 2: Classes Attended */}
        <View style={styles.statBox}>
          <View style={styles.statTextGroup}>
            <Text style={styles.statLabel}>Classes Attended</Text>
            <Text style={styles.statVal}>39 / 40</Text>
            <Text style={styles.statSub}>1 excused absence</Text>
          </View>
          <View style={styles.calendarIconBox}>
            <Ionicons name="calendar-outline" size={18} color="#1E5EFF" />
          </View>
        </View>
      </View>

      {/* Attendance Achievements Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <Ionicons name="trophy-outline" size={16} color="#1E5EFF" style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Attendance Achievements</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.viewAllLink}>View All &gt;</Text>
        </TouchableOpacity>
      </View>

      {/* Achievements Card enclosing items list */}
      <View style={styles.achievementsContainer}>
        {/* Item 1: Perfect Attendance */}
        <View style={styles.achievementItem}>
          <View style={[styles.badgeIconCircle, { backgroundColor: '#EAF2FF' }]}>
            <Ionicons name="trophy" size={16} color="#1E5EFF" />
          </View>
          <View style={styles.achievementTextInfo}>
            <Text style={styles.achievementTitle}>Perfect Attendance</Text>
            <Text style={styles.achievementDesc}>100% attendance rate across all semester courses.</Text>
          </View>
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedText}>✓ Unlocked</Text>
          </View>
        </View>

        {/* Item 2: Never Late */}
        <View style={styles.achievementItem}>
          <View style={[styles.badgeIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
          </View>
          <View style={styles.achievementTextInfo}>
            <Text style={styles.achievementTitle}>Never Late</Text>
            <Text style={styles.achievementDesc}>Never marked late or excused this semester.</Text>
          </View>
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedText}>✓ Unlocked</Text>
          </View>
        </View>

        {/* Item 3: 100-Day Streak */}
        <View style={[styles.achievementItem, { borderBottomWidth: 0, paddingBottom: 0, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.badgeIconCircle, { backgroundColor: '#FFF2E8' }]}>
              <Ionicons name="flame" size={16} color="#FF7A00" />
            </View>
            <View style={styles.achievementTextInfo}>
              <Text style={styles.achievementTitle}>100-Day Streak</Text>
              <Text style={styles.achievementDesc}>Consequent daily checks for 100 days.</Text>
            </View>
          </View>
          
          <View style={styles.streakProgressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBarFill, { width: '84%' }]} />
            </View>
            <Text style={styles.streakProgressText}>84 / 100 DAYS</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E5EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  welcomeTextColumn: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  welcomeSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  activeSessionCard: {
    backgroundColor: '#1E5EFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#1E5EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  pulseText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffffaa',
    letterSpacing: 0.8,
  },
  activeBellCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionSubject: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  sessionDetails: {
    fontSize: 11,
    color: '#ffffffcc',
    marginTop: 4,
    fontWeight: '600',
  },
  checkinActionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  checkinActionText: {
    color: '#1E5EFF',
    fontSize: 12,
    fontWeight: '800',
  },
  standbyCard: {
    backgroundColor: '#ECFDF550',
    borderColor: '#ECFDF5',
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  standbyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standbyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  standbyTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#22C55E',
  },
  standbySub: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  standbyBellCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    marginRight: 2,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  viewAllLink: {
    fontSize: 10.5,
    color: '#1E5EFF',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  statTextGroup: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4,
  },
  statSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  progressRingSim: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#1E5EFF',
    borderTopColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  calendarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  achievementsContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 14,
    marginBottom: 14,
  },
  badgeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTextInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  achievementDesc: {
    fontSize: 9.5,
    color: '#6B7280',
    lineHeight: 13,
    marginTop: 2,
  },
  unlockedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#22C55E50',
  },
  unlockedText: {
    fontSize: 9,
    color: '#22C55E',
    fontWeight: '800',
  },
  streakProgressRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 48, // Aligns progress bar nicely with text info
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF7A00',
    borderRadius: 2,
  },
  streakProgressText: {
    fontSize: 9,
    color: '#FF7A00',
    fontWeight: '800',
  },
});
