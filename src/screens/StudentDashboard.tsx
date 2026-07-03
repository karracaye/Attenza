import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { ActiveSession } from '../data/mockData';

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
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner Header */}
      <View style={styles.welcomeBanner}>
        <View style={styles.bannerGrid}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {studentProfile.studentName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.welcomeTextColumn}>
            <Text style={styles.greetingText}>Good Day, {studentProfile.studentName.split(' ')[0]}! 🎓</Text>
            <Text style={styles.welcomeSub}>ID: {studentProfile.studentId} • {studentProfile.year} ({studentProfile.section})</Text>
          </View>
        </View>
      </View>

      {/* Active Session Notification Widget */}
      {activeSession ? (
        <TouchableOpacity 
          style={styles.activeSessionCard} 
          onPress={onNavigateToCheckIn}
          activeOpacity={0.9}
        >
          <View style={styles.pulseIndicatorRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>LIVE ROLL CALL IN PROGRESS</Text>
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
          <Text style={styles.standbyTitle}>🟢 Attendance Systems Standby</Text>
          <Text style={styles.standbySub}>
            No active QR roll calls detected for your account. Keep this tab open; your screen will notify you as soon as your professor starts class.
          </Text>
        </View>
      )}

      {/* Stats Cards Section */}
      <Text style={styles.sectionHeaderTitle}>📊 Attendance Summary</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Attendance Rate</Text>
          <Text style={[styles.statVal, { color: '#34c759' }]}>97.5%</Text>
          <Text style={styles.statSub}>Target: &gt; 90%</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Classes Attended</Text>
          <Text style={styles.statVal}>39 / 40</Text>
          <Text style={styles.statSub}>1 excused absence</Text>
        </View>
      </View>

      {/* 🏆 Attendance Achievements Grid */}
      <View style={styles.achievementsCard}>
        <Text style={styles.achievementsCardTitle}>🏆 Attendance Achievements</Text>
        <Text style={styles.achievementsCardSub}>Maintain consistency to unlock premium badges and streaks.</Text>
        
        <View style={styles.achievementsGrid}>
          {/* Badge 1: Perfect Attendance */}
          <View style={styles.badgeCard}>
            <View style={[styles.badgeIconBox, { backgroundColor: '#ffd70012', borderColor: '#ffd70040' }]}>
              <Text style={styles.badgeEmoji}>🏆</Text>
            </View>
            <View style={styles.badgeTextInfo}>
              <Text style={styles.badgeTitle}>Perfect Attendance</Text>
              <Text style={styles.badgeDesc}>100% attendance rate across all semester courses.</Text>
              <View style={styles.badgeStatusRow}>
                <View style={[styles.badgeStatusPill, { backgroundColor: '#34c75910' }]}>
                  <Text style={[styles.badgeStatusText, { color: '#34c759' }]}>✓ UNLOCKED</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Badge 2: Never Late */}
          <View style={styles.badgeCard}>
            <View style={[styles.badgeIconBox, { backgroundColor: '#34c75912', borderColor: '#34c75940' }]}>
              <Text style={styles.badgeEmoji}>🛡️</Text>
            </View>
            <View style={styles.badgeTextInfo}>
              <Text style={styles.badgeTitle}>Never Late</Text>
              <Text style={styles.badgeDesc}>Never marked late or excused this semester.</Text>
              <View style={styles.badgeStatusRow}>
                <View style={[styles.badgeStatusPill, { backgroundColor: '#34c75910' }]}>
                  <Text style={[styles.badgeStatusText, { color: '#34c759' }]}>✓ UNLOCKED</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Badge 3: Streak */}
          <View style={styles.badgeCard}>
            <View style={[styles.badgeIconBox, { backgroundColor: '#ff950012', borderColor: '#ff950040' }]}>
              <Text style={styles.badgeEmoji}>🔥</Text>
            </View>
            <View style={styles.badgeTextInfo}>
              <Text style={styles.badgeTitle}>100-Day Streak</Text>
              <Text style={styles.badgeDesc}>Consequent daily checks for 100 days.</Text>
              
              <View style={styles.badgeStatusRow}>
                <View style={[styles.badgeStatusPill, { backgroundColor: '#ff950010', marginRight: 10 }]}>
                  <Text style={[styles.badgeStatusText, { color: '#ff9500' }]}>⚡ 84/100 DAYS</Text>
                </View>
                <View style={styles.badgeProgressBg}>
                  <View style={[styles.badgeProgressBar, { width: '84%', backgroundColor: '#ff9500' }]} />
                </View>
              </View>
            </View>
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  welcomeBanner: {
    backgroundColor: '#f5f5f7',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  bannerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0066cc',
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
    color: '#1d1d1f',
  },
  welcomeSub: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 2,
    fontWeight: '600',
  },
  activeSessionCard: {
    backgroundColor: '#0066cc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  pulseIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34c759',
  },
  pulseText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffffaa',
    letterSpacing: 0.8,
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
    color: '#0066cc',
    fontSize: 12,
    fontWeight: '800',
  },
  standbyCard: {
    backgroundColor: '#34c75908',
    borderColor: '#34c75925',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  standbyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34c759',
  },
  standbySub: {
    fontSize: 10,
    color: '#86868b',
    lineHeight: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86868b',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1d1d1f',
    marginTop: 4,
  },
  statSub: {
    fontSize: 9,
    color: '#86868b',
    marginTop: 4,
    fontWeight: '600',
  },
  achievementsCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  achievementsCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  achievementsCardSub: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 2,
    marginBottom: 14,
  },
  achievementsGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f7',
    borderColor: '#eaeaea',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  badgeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeTextInfo: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  badgeDesc: {
    fontSize: 9,
    color: '#86868b',
    lineHeight: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeStatusText: {
    fontSize: 7.5,
    fontWeight: '900',
  },
  badgeProgressBg: {
    flex: 1,
    height: 3,
    backgroundColor: '#eaeaea',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  badgeProgressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
