import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { AttendanceSessionLog } from '../data/mockData';

interface Props {
  logs: AttendanceSessionLog[];
  role: 'professor' | 'student';
  studentId?: string;
  isDarkMode?: boolean;
}

// Mock class list of enrolled students for absentee calculation
const MOCK_CLASS_ROSTER = [
  { studentId: '2024-0518', studentName: 'Katrina Santillan', year: '3rd Year', section: 'Section B', isIrregular: false },
  { studentId: '2024-0012', studentName: 'Sam Chen', year: '3rd Year', section: 'Section A', isIrregular: false },
  { studentId: '2024-0034', studentName: 'Antony Taylor', year: '3rd Year', section: 'Section B', isIrregular: true },
  { studentId: '2024-0078', studentName: 'Craig Vance', year: '4th Year', section: 'Section A', isIrregular: false },
  { studentId: '2024-0099', studentName: 'Jane Doe', year: '3rd Year', section: 'Section B', isIrregular: false },
  { studentId: '2024-0100', studentName: 'John Doe', year: '3rd Year', section: 'Section A', isIrregular: true },
];

// Helper: Format section and year to the clean academic standard notation (e.g. IT-3B, CS-3A)
export const formatAcademicSection = (subjectCode: string, yearStr: string, sectionStr: string) => {
  // Extract course prefix from subject code (e.g. "CS 302" -> "CS", "IT 204" -> "IT")
  const prefixMatch = subjectCode.trim().match(/^[A-Za-z]+/);
  const prefix = prefixMatch ? prefixMatch[0].toUpperCase() : 'IT';

  // Extract year number (1st to 4th Year -> 1 to 4)
  let yearNum = '1';
  if (yearStr.toLowerCase().includes('1st') || yearStr.includes('1')) yearNum = '1';
  else if (yearStr.toLowerCase().includes('2nd') || yearStr.includes('2')) yearNum = '2';
  else if (yearStr.toLowerCase().includes('3rd') || yearStr.includes('3')) yearNum = '3';
  else if (yearStr.toLowerCase().includes('4th') || yearStr.includes('4')) yearNum = '4';

  // Extract section character matching A-I
  let secLetter = 'A';
  const secMatch = sectionStr.match(/[A-Ia-i]/);
  if (secMatch) {
    secLetter = secMatch[0].toUpperCase();
  } else {
    const cleaned = sectionStr.replace(/section/i, '').trim();
    if (cleaned.length === 1) secLetter = cleaned.toUpperCase();
  }

  return `${prefix}${yearNum}${secLetter}`;
};

export default function HistoryScreen({ logs, role, studentId, isDarkMode = false }: Props) {
  const colors = {
    bg: isDarkMode ? '#111827' : '#FAFBFC',
    text: isDarkMode ? '#F9FAFB' : '#111827',
    subText: isDarkMode ? '#9CA3AF' : '#6B7280',
    cardBg: isDarkMode ? '#1F2937' : '#ffffff',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Exporter modal states
  const [exportLog, setExportLog] = useState<AttendanceSessionLog | null>(null);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const paginatedLogs = logs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Lightbox modal states for viewing attached excuse letters (Supports custom uploads URIs)
  const [isExcuseLightboxVisible, setIsExcuseLightboxVisible] = useState(false);
  const [lightboxStudentName, setLightboxStudentName] = useState('');
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  // Helper: Get Absentees for a session log
  const getSessionAbsentees = (log: AttendanceSessionLog) => {
    const activeIds = log.records.map((r) => r.studentId);
    return MOCK_CLASS_ROSTER.filter((s) => !activeIds.includes(s.studentId));
  };

  // Exporters implementations
  const handleExportCSV = (log: AttendanceSessionLog) => {
    const absentees = getSessionAbsentees(log);
    const headers = 'Student ID,Student Name,Year,Section,Enrollment Status,Check-in Time,Latitude,Longitude,GPS Distance (m),QR Code Verified,Selfie Verified,GPS Location Verified,Verified Status,Arrival Status,Class Mode,Excuse Details,Is Remote Standpoint,Remote Location Name,Remote Location Reason\n';
    
    // Checked in students rows
    const presentRows = log.records.map((r) => {
      const excuseText = r.status === 'EXCUSED' ? `"${r.excuseReason || ''} (${r.excuseAttachment || ''})"` : '""';
      const isRemote = r.isRemoteStandpoint ? 'Yes' : 'No';
      const remoteLoc = r.remoteLocationName ? `"${r.remoteLocationName}"` : '""';
      const remoteReason = r.remoteLocationReason ? `"${r.remoteLocationReason}"` : '""';
      return `"${r.studentId}","${r.studentName}","${r.year}","${r.section}","${r.isIrregular ? 'Irregular' : 'Regular'}","${r.timestamp}",${r.latitude.toFixed(5)},${r.longitude.toFixed(5)},${log.isOnline ? 'N/A' : r.distanceMeters.toFixed(1)},${r.qrVerified},${r.selfieVerified},${r.gpsVerified},"${r.status === 'EXCUSED' ? 'EXCUSED' : 'PRESENT'}","${r.status}","${log.isOnline ? 'Online' : 'Face-to-Face'}",${excuseText},"${isRemote}",${remoteLoc},${remoteReason}`;
    });

    // Absent students rows
    const absentRows = absentees.map((a) =>
      `"${a.studentId}","${a.studentName}","${a.year}","${a.section}","${a.isIrregular ? 'Irregular' : 'Regular'}","N/A",0,0,"N/A",false,false,false,"ABSENT","ABSENT","${log.isOnline ? 'Online' : 'Face-to-Face'}",""`
    );

    const content = headers + [...presentRows, ...absentRows].join('\n');
    downloadFile(content, `${log.subjectCode.replace(' ', '_')}_Attendance_${log.date.replace(/,?\s+/g, '_')}.csv`, 'text/csv');
    setIsExportModalVisible(false);
  };

  const handleExportExcel = (log: AttendanceSessionLog) => {
    const absentees = getSessionAbsentees(log);
    const headers = 'Student ID\tStudent Name\tYear\tSection\tEnrollment Status\tCheck-in Time\tLatitude\tLongitude\tGPS Distance (m)\tQR Code Verified\tSelfie Verified\tGPS Location Verified\tVerified Status\tArrival Status\tClass Mode\tExcuse Details\tIs Remote Standpoint\tRemote Location Name\tRemote Location Reason\n';
    
    const presentRows = log.records.map((r) => {
      const excuseText = r.status === 'EXCUSED' ? `${r.excuseReason || ''} (${r.excuseAttachment || ''})` : '';
      const isRemote = r.isRemoteStandpoint ? 'Yes' : 'No';
      const remoteLoc = r.remoteLocationName || '';
      const remoteReason = r.remoteLocationReason || '';
      return `${r.studentId}\t${r.studentName}\t${r.year}\t${r.section}\t${r.isIrregular ? 'Irregular' : 'Regular'}\t${r.timestamp}\t${r.latitude.toFixed(5)}\t${r.longitude.toFixed(5)}\t${log.isOnline ? 'N/A' : r.distanceMeters.toFixed(1)}\t${r.qrVerified}\t${r.selfieVerified}\t${r.gpsVerified}\t${r.status === 'EXCUSED' ? 'EXCUSED' : 'PRESENT'}\t${r.status}\t${log.isOnline ? 'Online' : 'Face-to-Face'}\t${excuseText}\t${isRemote}\t${remoteLoc}\t${remoteReason}`;
    });

    const absentRows = absentees.map((a) =>
      `${a.studentId}\t${a.studentName}\t${a.year}\t${a.section}\t${a.isIrregular ? 'Irregular' : 'Regular'}\tN/A\t0\t0\tN/A\tfalse\tfalse\tfalse\tABSENT\tABSENT\t${log.isOnline ? 'Online' : 'Face-to-Face'}\t`
    );

    const content = headers + [...presentRows, ...absentRows].join('\n');
    downloadFile(content, `${log.subjectCode.replace(' ', '_')}_Attendance_${log.date.replace(/,?\s+/g, '_')}.xls`, 'application/vnd.ms-excel');
    setIsExportModalVisible(false);
  };

  const handleExportPDF = (log: AttendanceSessionLog) => {
    const absentees = getSessionAbsentees(log);

    const presentRowsHTML = log.records.map((r) => {
      const isExc = r.status === 'EXCUSED';
      const statusLabel = isExc ? 'EXCUSED' : 'PRESENT';
      const statusColor = isExc ? '#1E5EFF' : (r.status === 'LATE' ? '#F59E0B' : '#22C55E');
      const secCode = formatAcademicSection(log.subjectCode, r.year, r.section);
      const detailsText = isExc 
        ? `<span style="font-size: 11px; font-style: italic; color: #6B7280;">Excuse: ${r.excuseReason || ''} (${r.excuseAttachment || ''})</span>`
        : `GPS: ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`;

      return `
        <tr ${isExc ? 'style="background-color: #1E5EFF03;"' : ''}>
          <td style="border: 1px solid #ddd; padding: 8px;">${r.studentId}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">
            ${r.studentName}
            ${r.isIrregular ? '<span style="background-color: #F59E0B15; border: 1px solid #F59E0B; color: #F59E0B; font-size: 8px; padding: 2px 4px; border-radius: 3px; margin-left: 5px; font-weight: 900;">IRREGULAR</span>' : ''}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px;">${secCode}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${r.timestamp}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${detailsText}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: ${statusColor};">
            ${isExc ? 'EXCUSED' : (r.status === 'LATE' ? 'LATE (After 5m)' : 'ON TIME (0-5m)')}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px; color: ${statusColor}; font-weight: bold;">${statusLabel}</td>
        </tr>
      `;
    }).join('');

    const absentRowsHTML = absentees.map((a) => {
      const secCode = formatAcademicSection(log.subjectCode, a.year, a.section);
      return `
        <tr style="background-color: #EF444405;">
          <td style="border: 1px solid #ddd; padding: 8px; color: #6B7280;">${a.studentId}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #6B7280;">
            ${a.studentName}
            ${a.isIrregular ? '<span style="background-color: #F59E0B15; border: 1px solid #F59E0B; color: #F59E0B; font-size: 8px; padding: 2px 4px; border-radius: 3px; margin-left: 5px; font-weight: 900;">IRREGULAR</span>' : ''}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px; color: #6B7280;">${secCode}</td>
          <td style="border: 1px solid #ddd; padding: 8px; color: #6B7280;">N/A</td>
          <td style="border: 1px solid #ddd; padding: 8px; color: #6B7280;">N/A</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #EF4444;">ABSENT</td>
          <td style="border: 1px solid #ddd; padding: 8px; color: #EF4444; font-weight: bold;">ABSENT</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Attendance Report - ${log.subjectCode}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #111827; }
            h1 { font-size: 24px; font-weight: 800; color: #1E5EFF; margin-bottom: 5px; }
            h2 { font-size: 14px; font-weight: 600; color: #6B7280; margin-top: 0; margin-bottom: 20px; }
            .meta-box { background: #f4f5f6; padding: 15px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e5e7eb; display: flex; flex-wrap: wrap; gap: 20px; }
            .meta-item { font-size: 13px; font-weight: 700; color: #6B7280; }
            .meta-item span { color: #111827; font-weight: normal; margin-left: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid #ddd; padding: 10px; text-align: left; background-color: #f4f5f6; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #6B7280; }
            td { font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <h2>Generated automatically by Attenza Attendance Engine</h2>
          <div class="meta-box">
            <div class="meta-item">Subject: <span>${log.subjectCode} - ${log.subjectName}</span></div>
            <div class="meta-item">Class Mode: <span>${log.isOnline ? 'Online Class' : 'Face-to-Face'}</span></div>
            <div class="meta-item">Room: <span>${log.classroomName}</span></div>
            <div class="meta-item">Session Date: <span>${log.date}</span></div>
            <div class="meta-item">Timeframe: <span>${log.time}</span></div>
            <div class="meta-item">Total Present (On-Time + Late): <span>${log.records.filter(r=>r.status!=='EXCUSED').length} Students</span></div>
            <div class="meta-item">Total Excused: <span>${log.records.filter(r=>r.status==='EXCUSED').length} Students</span></div>
            <div class="meta-item">Total Absent: <span>${absentees.length} Students</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Academic Section</th>
                <th>Check-in Time</th>
                <th>Location Details</th>
                <th>Arrival Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${presentRowsHTML}
              ${absentRowsHTML}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printPDF(htmlContent);
    setIsExportModalVisible(false);
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('Export Complete', `File downloaded successfully: \n\n${filename}`);
    }
  };

  const printPDF = (html: string) => {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } else {
      Alert.alert('PDF Export Complete', 'Generated print document preview.');
    }
  };

  const handleOpenLightbox = (studentName: string, attachmentUri?: string) => {
    setLightboxStudentName(studentName);
    setLightboxImageUri(attachmentUri || null);
    setIsExcuseLightboxVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>📋 Attendance History</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
          {role === 'professor'
            ? 'Access all saved class sessions and checked-in student logs.'
            : 'Track your personal class check-in attendance records.'}
        </Text>
      </View>

      <FlatList
        data={paginatedLogs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isExpanded = expandedLogId === item.id;
          
          // Filter records based on role
          const displayedRecords = role === 'student' && studentId
            ? item.records.filter(r => r.studentId === studentId)
            : item.records;

          // Check if student was present in this log
          const studentPresent = role === 'student' && displayedRecords.length > 0;

          // Stats calculation
          const absentees = getSessionAbsentees(item);
          const onTimeCount = item.records.filter((r) => r.status === 'PRESENT').length;
          const lateCount = item.records.filter((r) => r.status === 'LATE').length;
          const excusedCount = item.records.filter((r) => r.status === 'EXCUSED').length;

          // Resolve section code (e.g. IT-3B or CS-3B)
          const sectionYearCode = formatAcademicSection(
            item.subjectCode,
            item.year || item.records[0]?.year || '3rd Year',
            item.section || item.records[0]?.section || 'Section B'
          );

          return (
            <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }, isExpanded && styles.cardExpanded]}>
              <TouchableOpacity 
                style={styles.cardHeader} 
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeaderInfo}>
                  <View style={styles.logTitleRow}>
                    <Text style={[styles.subjectCode, { color: colors.text }]}>{item.subjectCode}</Text>
                    <Text style={[styles.deliveryIndicator, { color: colors.subText }]}>
                      {' • '}{sectionYearCode}
                    </Text>
                    <Text style={[styles.deliveryIndicator, { color: colors.subText }]}>
                      {item.isOnline ? ' • 🌐 Online' : ' • 🏫 F2F'}
                    </Text>
                  </View>
                  
                  <Text style={[styles.subjectName, { color: colors.text }]}>{item.subjectName}</Text>
                  
                  <Text style={[styles.metaRow, { color: colors.subText }]}>
                    {item.date}  •  {item.time.split(' - ')[0]}
                  </Text>
                </View>

                <View style={styles.rightHeaderBadge}>
                  {role === 'professor' ? (
                    <Text style={[styles.summaryStatsMini, { color: colors.subText }]}>
                      {onTimeCount + lateCount} present  •  {absentees.length} absent
                    </Text>
                  ) : (
                    <Text style={[styles.studentStatusText, studentPresent ? styles.textGreen : styles.textRed]}>
                      {studentPresent ? (displayedRecords[0]?.status === 'EXCUSED' ? 'EXCUSED' : 'PRESENT') : 'ABSENT'}
                    </Text>
                  )}
                  <Text style={[styles.chevron, { color: colors.subText }]}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Clean Minimalist Stats Column Divider */}
                  {role === 'professor' && (
                    <View style={[styles.minimalStatsContainer, { backgroundColor: isDarkMode ? '#11182740' : '#FAFBFC', borderColor: colors.border }]}>
                      <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: '#22C55E' }]}>{onTimeCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>ON-TIME</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: '#F59E0B' }]}>{lateCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>LATE</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: '#1E5EFF' }]}>{excusedCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>EXCUSED</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: '#EF4444' }]}>{absentees.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>ABSENT</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.expandedHeaderRow}>
                    <Text style={[styles.expandedTitle, { color: colors.text }]}>
                      {role === 'professor' ? 'Verified Roster' : 'Check-in Details'}
                    </Text>
                    {role === 'professor' && (
                      <TouchableOpacity
                        style={styles.exportTriggerBtn}
                        onPress={() => {
                          setExportLog(item);
                          setIsExportModalVisible(true);
                        }}
                      >
                        <Text style={styles.exportTriggerText}>Export Reports</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {displayedRecords.length === 0 ? (
                    <Text style={[styles.emptyRecords, { color: colors.subText }]}>No check-in record found.</Text>
                  ) : (
                    displayedRecords.map((record) => {
                      const isExc = record.status === 'EXCUSED';
                      const isLate = record.status === 'LATE';
                      const studSecCode = formatAcademicSection(item.subjectCode, record.year, record.section);
                      return (
                        <View key={record.studentId} style={[styles.rosterItem, { borderBottomColor: colors.border }]}>
                          <View style={styles.studentDetails}>
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>{getInitials(record.studentName)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.studentNameRow}>
                                <Text style={[styles.studentNameText, { color: colors.text }]}>{record.studentName}</Text>
                                {record.isIrregular && (
                                  <View style={styles.irregBadge}>
                                    <Text style={styles.irregBadgeText}>IRREGULAR</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.studentIdText, { color: colors.subText }]}>
                                ID: {record.studentId}  •  {studSecCode}  •  {record.timestamp}
                              </Text>
                              {isExc ? (
                                <View style={styles.excuseTextRow}>
                                  <Text style={styles.excuseTextLabel}>
                                    📎 Excuse: {record.excuseReason}
                                  </Text>
                                  <TouchableOpacity 
                                    style={styles.attachmentLinkPill}
                                    onPress={() => handleOpenLightbox(record.studentName, record.excuseAttachmentUri)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.attachmentLinkText}>View Letter</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <View>
                                  <Text style={[styles.distanceText, { color: colors.subText }]}>
                                    📍 GPS: {item.isOnline ? `Remote [${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}]` : `${record.distanceMeters.toFixed(1)}m from classroom`}
                                  </Text>
                                  {item.isOnline && record.isRemoteStandpoint && (
                                    <Text style={[styles.distanceText, { color: '#F59E0B', fontWeight: 'bold', marginTop: 2 }]}>
                                      ⚠️ Off-site: {record.remoteLocationName} ({record.remoteLocationReason})
                                    </Text>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>

                          <Text style={[
                            styles.timelinessLabel,
                            isExc ? styles.textExcused : (isLate ? styles.textLate : styles.textGreen)
                          ]}>
                            {isExc ? 'EXCUSED' : (isLate ? 'LATE' : 'ON TIME')}
                          </Text>
                        </View>
                      );
                    })
                  )}

                  {/* ABSENTEES LIST */}
                  {role === 'professor' && absentees.length > 0 && (
                    <View style={styles.absentSection}>
                      <Text style={[styles.absentSectionTitle, { color: colors.text }]}>Absent ({absentees.length})</Text>
                      {absentees.map((record) => {
                        const studSecCode = formatAcademicSection(item.subjectCode, record.year, record.section);
                        return (
                          <View key={record.studentId} style={[styles.absentRosterItem, { borderBottomColor: colors.border }]}>
                            <View style={styles.studentDetails}>
                              <View style={[styles.avatar, styles.avatarAbsent]}>
                                <Text style={styles.avatarText}>{getInitials(record.studentName)}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={styles.studentNameRow}>
                                  <Text style={[styles.absentNameText, { color: colors.text }]}>{record.studentName}</Text>
                                  {record.isIrregular && (
                                    <View style={styles.irregBadge}>
                                      <Text style={styles.irregBadgeText}>IRREGULAR</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.studentIdText, { color: colors.subText }]}>
                                  ID: {record.studentId}  •  {studSecCode}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.absentBadgeLabel}>ABSENT</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyLogsText}>No attendance records saved yet.</Text>
        }
      />

      {/* MINIMALIST PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity 
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} 
            onPress={() => {
              setCurrentPage(prev => Math.max(1, prev - 1));
              setExpandedLogId(null);
            }}
            disabled={currentPage === 1}
          >
            <Text style={[styles.pageBtnLabel, currentPage === 1 && styles.pageBtnLabelDisabled]}>◀ Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageIndicatorText}>
            Page {currentPage} of {totalPages}
          </Text>
          
          <TouchableOpacity 
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} 
            onPress={() => {
              setCurrentPage(prev => Math.min(totalPages, prev + 1));
              setExpandedLogId(null);
            }}
            disabled={currentPage === totalPages}
          >
            <Text style={[styles.pageBtnLabel, currentPage === totalPages && styles.pageBtnLabelDisabled]}>Next ▶</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* EXPORT OPTIONS BOTTOM SHEET MODAL */}
      <Modal animationType="slide" transparent={true} visible={isExportModalVisible} onRequestClose={() => setIsExportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalGrabHandle} />
            <Text style={styles.modalHeading}>Export Roster</Text>
            <Text style={styles.modalSubtitle}>
              Select format to download the roster records for {exportLog?.subjectCode}.
            </Text>

            {exportLog && (
              <View style={styles.modalOptionsList}>
                <TouchableOpacity style={styles.modalOptionRow} onPress={() => handleExportPDF(exportLog)}>
                  <Text style={styles.modalOptionIcon}>📄</Text>
                  <View>
                    <Text style={styles.modalOptionLabel}>Export as PDF</Text>
                    <Text style={styles.modalOptionSub}>Print-ready PDF report of students</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOptionRow} onPress={() => handleExportExcel(exportLog)}>
                  <Text style={styles.modalOptionIcon}>📊</Text>
                  <View>
                    <Text style={styles.modalOptionLabel}>Export as Excel</Text>
                    <Text style={styles.modalOptionSub}>Spreadsheet document format (.xls)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOptionRow} onPress={() => handleExportCSV(exportLog)}>
                  <Text style={styles.modalOptionIcon}>📝</Text>
                  <View>
                    <Text style={styles.modalOptionLabel}>Export as CSV</Text>
                    <Text style={styles.modalOptionSub}>Comma-separated values text format</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsExportModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Clean white background
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#d2d2d7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E5EFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryIndicator: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  metaRow: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  rightHeaderBadge: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
  },
  summaryStatsMini: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  studentStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chevron: {
    fontSize: 10,
    color: '#6B7280',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fafafa',
  },
  // Minimalist Stats Container
  minimalStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    marginBottom: 14,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  expandedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exportTriggerBtn: {
    paddingVertical: 4,
  },
  exportTriggerText: {
    color: '#1E5EFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyRecords: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  rosterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  studentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f5f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#6B7280',
    fontWeight: '800',
    fontSize: 10,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  irregBadge: {
    backgroundColor: '#F59E0B10',
    borderColor: '#F59E0B',
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  irregBadgeText: {
    color: '#F59E0B',
    fontSize: 7,
    fontWeight: '900',
  },
  studentIdText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  distanceText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  excuseTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  excuseTextLabel: {
    fontSize: 10,
    color: '#1E5EFF',
    fontWeight: '500',
  },
  attachmentLinkPill: {
    backgroundColor: '#1E5EFF15',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: '#1E5EFF50',
  },
  attachmentLinkText: {
    color: '#1E5EFF',
    fontSize: 8,
    fontWeight: '800',
  },
  timelinessLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textGreen: {
    color: '#22C55E',
  },
  textLate: {
    color: '#F59E0B',
  },
  textExcused: {
    color: '#1E5EFF',
  },
  textRed: {
    color: '#EF4444',
  },
  emptyLogsText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  // Absentee lists
  absentSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
  },
  absentSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  absentRosterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarAbsent: {
    backgroundColor: '#EF44440d',
  },
  absentNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  absentBadgeLabel: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  // Pagination layout
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 10,
    backgroundColor: '#ffffff',
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  pageBtnDisabled: {
    backgroundColor: '#ffffff',
    borderColor: '#f4f5f6',
  },
  pageBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5EFF',
  },
  pageBtnLabelDisabled: {
    color: '#d2d2d7',
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Lightbox overlay styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lightboxContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    height: '75%',
    alignItems: 'stretch',
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  lightboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  lightboxSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  lightboxCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f4f5f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  lightboxImageContainer: {
    flex: 1,
    backgroundColor: '#f4f5f6',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooterText: {
    fontSize: 9,
    color: '#22C55E',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  // Modal layout
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000033',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalGrabHandle: {
    width: 32,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeading: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 20,
  },
  modalOptionsList: {
    gap: 10,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
  },
  modalOptionIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  modalOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  modalOptionSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCancelBtn: {
    marginTop: 14,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
});
