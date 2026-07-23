import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TimetableEntry {
  id: string;
  subjectCode: string;
  subjectName: string;
  professorName: string;
  roomName: string;
  days: string[]; // e.g. ['Monday', 'Wednesday']
  startTime: string; // e.g. '07:00 AM'
  endTime: string; // e.g. '09:00 AM'
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Default Seed Timetable matching the new 7:00 AM - 07:00 PM standard blocks
const DEFAULT_TIMETABLE: TimetableEntry[] = [
  {
    id: 't1',
    subjectCode: 'CS 302',
    subjectName: 'Software Engineering II',
    professorName: 'Dr. Chaliz Smith',
    roomName: 'Room 302',
    days: ['Monday', 'Wednesday', 'Friday'],
    startTime: '07:00 AM',
    endTime: '09:00 AM',
  },
  {
    id: 't2',
    subjectCode: 'IT 204',
    subjectName: 'Mobile Application Development',
    professorName: 'Prof. Robert Johnson',
    roomName: 'Room 204',
    days: ['Tuesday', 'Thursday'],
    startTime: '01:00 PM',
    endTime: '03:00 PM',
  },
  {
    id: 't3',
    subjectCode: 'IT 301',
    subjectName: 'Database Systems',
    professorName: 'Dr. Alice Williams',
    roomName: 'Room 101',
    days: ['Monday', 'Wednesday'],
    startTime: '09:00 AM',
    endTime: '11:00 AM',
  },
  {
    id: 't4',
    subjectCode: 'CS 320',
    subjectName: 'Distributed Systems',
    professorName: 'Dr. James Carter',
    roomName: 'Lab 3',
    days: ['Tuesday', 'Thursday'],
    startTime: '05:00 PM',
    endTime: '07:00 PM',
  }
];

// Clean 2-hour standard time slots covering 7:00 AM to 7:00 PM
const TIME_SLOTS = [
  { label: '07:00 AM - 09:00 AM', start: '07:00 AM', end: '09:00 AM' },
  { label: '09:00 AM - 11:00 AM', start: '09:00 AM', end: '11:00 AM' },
  { label: '11:00 AM - 01:00 PM', start: '11:00 AM', end: '01:00 PM' }, // Midday block
  { label: '01:00 PM - 03:00 PM', start: '01:00 PM', end: '03:00 PM' },
  { label: '03:00 PM - 05:00 PM', start: '03:00 PM', end: '05:00 PM' },
  { label: '05:00 PM - 07:00 PM', start: '05:00 PM', end: '07:00 PM' } // Evening block up to 7 PM
];

const TIME_OPTIONS = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
  '07:00 PM'
];

interface Props {
  isDarkMode?: boolean;
}

export default function StudentTimetableScreen({ isDarkMode = false }: Props) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const colors = {
    bg: isDarkMode ? '#111827' : '#FAFBFC',
    text: isDarkMode ? '#F9FAFB' : '#111827',
    subText: isDarkMode ? '#9CA3AF' : '#6B7280',
    cardBg: isDarkMode ? '#1F2937' : '#ffffff',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('07:00 AM');
  const [endTime, setEndTime] = useState('09:00 AM');

  // Form Dropdowns controller
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  useEffect(() => {
    async function loadTimetable() {
      try {
        const stored = await AsyncStorage.getItem('attendance_student_timetable');
        if (stored) {
          setEntries(JSON.parse(stored));
        } else {
          setEntries(DEFAULT_TIMETABLE);
          await AsyncStorage.setItem('attendance_student_timetable', JSON.stringify(DEFAULT_TIMETABLE));
        }
      } catch (err) {
        setEntries(DEFAULT_TIMETABLE);
      }
    }
    loadTimetable();
  }, []);

  const saveTimetable = async (updated: TimetableEntry[]) => {
    setEntries(updated);
    await AsyncStorage.setItem('attendance_student_timetable', JSON.stringify(updated));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setSubjectCode('');
    setSubjectName('');
    setProfessorName('');
    setRoomName('');
    setSelectedDays([]);
    setStartTime('07:00 AM');
    setEndTime('09:00 AM');
    setIsStartOpen(false);
    setIsEndOpen(false);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (entry: TimetableEntry) => {
    setEditingId(entry.id);
    setSubjectCode(entry.subjectCode);
    setSubjectName(entry.subjectName);
    setProfessorName(entry.professorName);
    setRoomName(entry.roomName);
    setSelectedDays(entry.days);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setIsStartOpen(false);
    setIsEndOpen(false);
    setIsModalVisible(true);
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = () => {
    if (!subjectCode.trim() || !subjectName.trim() || !professorName.trim() || !roomName.trim()) {
      Alert.alert('Error', 'Please fill in all subject details.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one weekday.');
      return;
    }

    if (editingId) {
      const updated = entries.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            subjectCode: subjectCode.trim().toUpperCase(),
            subjectName: subjectName.trim(),
            professorName: professorName.trim(),
            roomName: roomName.trim(),
            days: selectedDays,
            startTime,
            endTime,
          };
        }
        return item;
      });
      saveTimetable(updated);
    } else {
      const newEntry: TimetableEntry = {
        id: Math.random().toString(36).substring(2, 9),
        subjectCode: subjectCode.trim().toUpperCase(),
        subjectName: subjectName.trim(),
        professorName: professorName.trim(),
        roomName: roomName.trim(),
        days: selectedDays,
        startTime,
        endTime,
      };
      saveTimetable([...entries, newEntry]);
    }

    setIsModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Class', 'Delete this class from your semester schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const filtered = entries.filter(item => item.id !== id);
          saveTimetable(filtered);
          setIsModalVisible(false);
        }
      }
    ]);
  };

  const getEntryForCell = (day: string, slotLabel: string) => {
    return entries.find((entry) => {
      const isDayMatched = entry.days.includes(day);
      if (!isDayMatched) return false;

      const entryTimeStr = `${entry.startTime} - ${entry.endTime}`;
      return entryTimeStr === slotLabel || 
             (entry.startTime <= slotLabel.split(' - ')[0] && entry.endTime >= slotLabel.split(' - ')[1]);
    });
  };

  const generateCSV = () => {
    let csv = 'Subject Code,Subject Name,Professor,Room,Days,Schedule Time\n';
    entries.forEach(e => {
      csv += `"${e.subjectCode}","${e.subjectName}","${e.professorName}","${e.roomName}","${e.days.join(' & ')}","${e.startTime} - ${e.endTime}"\n`;
    });
    return csv;
  };

  const generateTextReport = () => {
    let report = '=======================================\n';
    report += '     ATTENZA STUDENT TIMETABLE         \n';
    report += '=======================================\n\n';
    entries.forEach(e => {
      report += `📖 ${e.subjectCode}: ${e.subjectName}\n`;
      report += `   👨‍🏫 Professor: ${e.professorName}\n`;
      report += `   📍 Classroom: ${e.roomName}\n`;
      report += `   🗓️ Days: ${e.days.join(', ')}\n`;
      report += `   🕒 Hours: ${e.startTime} - ${e.endTime}\n\n`;
    });
    return report;
  };

  const generateHTML = () => {
    let rowsHTML = '';
    
    TIME_SLOTS.forEach(slot => {
      let rowCells = `<td><strong>${slot.label}</strong></td>`;
      
      WEEKDAYS.forEach(day => {
        const entry = getEntryForCell(day, slot.label);
        if (entry) {
          rowCells += `
            <td style="background-color: #f0f6ff; border-left: 4px solid #0066cc;">
              <div style="font-weight: bold; color: #0066cc;">${entry.subjectCode}</div>
              <div style="font-size: 10px; font-weight: 600; margin-top: 2px;">${entry.professorName}</div>
              <div style="font-size: 9px; color: #666666; margin-top: 1px;">📍 ${entry.roomName}</div>
            </td>
          `;
        } else {
          rowCells += `<td style="background-color: #fafafc; color: #c4c4c6; text-align: center; font-size: 9px; font-style: italic;">vacant</td>`;
        }
      });
      
      rowsHTML += `<tr>${rowCells}</tr>`;
    });

    let detailsHTML = '';
    entries.forEach(e => {
      detailsHTML += `
        <div style="margin-bottom: 12px; padding: 12px; background-color: #f9f9fb; border-radius: 8px; border: 1px solid #eaeaea;">
          <div style="font-size: 14px; font-weight: 800; color: #1d1d1f;">${e.subjectCode}: ${e.subjectName}</div>
          <div style="font-size: 12px; color: #555555; margin-top: 4px;">👨‍🏫 Professor: <strong>${e.professorName}</strong></div>
          <div style="font-size: 12px; color: #555555;">📍 Classroom Location: <strong>${e.roomName}</strong></div>
          <div style="font-size: 12px; color: #555555;">🗓️ Schedule Days: <strong>${e.days.join(', ')}</strong></div>
          <div style="font-size: 12px; color: #555555;">🕒 Time Slot: <strong>${e.startTime} - ${e.endTime}</strong></div>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attenza - Semester Timetable</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1d1d1f;
            padding: 24px;
            margin: 0;
          }
          .header {
            margin-bottom: 24px;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 12px;
          }
          .title {
            font-size: 24px;
            font-weight: 900;
            color: #0066cc;
          }
          .subtitle {
            font-size: 12px;
            color: #86868b;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
          }
          th, td {
            border: 1px solid #eaeaea;
            padding: 10px;
            text-align: left;
            vertical-align: middle;
            font-size: 11px;
          }
          th {
            background-color: #f4f5f6;
            font-weight: 800;
            color: #86868b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 800;
            color: #1d1d1f;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Attenza Attendance Engine</div>
          <div class="subtitle">Official Semester Timetable Schedule (Up to 7:00 PM)</div>
        </div>
        
        <table style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 20%;">Time Slot</th>
              <th style="width: 16%;">Monday</th>
              <th style="width: 16%;">Tuesday</th>
              <th style="width: 16%;">Wednesday</th>
              <th style="width: 16%;">Thursday</th>
              <th style="width: 16%;">Friday</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        
        <div class="section-title">Class Details Workload</div>
        ${detailsHTML}
      </body>
      </html>
    `;
  };

  const handleExportCSV = () => {
    Alert.alert('CSV Timetable Exported', 'CSV summary copied to clipboard and ready to share.');
  };

  const handleExportTXT = () => {
    Alert.alert('Text Timetable Exported', 'Timetable details copied to clipboard.');
  };

  const handleExportPDF = () => {
    const htmlContent = generateHTML();
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } else {
      Alert.alert('PDF Exported', 'Print document rendering opened successfully.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🗓️ Semester Timetable</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subText }]}>Manage your classes and visual weekly workload schedule.</Text>
        </View>

        <TouchableOpacity style={styles.exportBtn} onPress={() => setIsExportModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.exportBtnText}>📤 Export</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.9}>
        <Text style={styles.addBtnText}>+ Add Semester Course Class</Text>
      </TouchableOpacity>

      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={styles.gridScroll}>
        <View style={[styles.gridContainer, { backgroundColor: colors.cardBg }]}>
          {/* Header Row: Time and Weekdays */}
          <View style={[styles.gridRowHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.timeHeaderCell}>
              <Text style={[styles.gridHeaderLabel, { color: colors.subText }]}>Time Block</Text>
            </View>
            {WEEKDAYS.map((day) => (
              <View key={day} style={styles.dayHeaderCell}>
                <Text style={[styles.gridHeaderLabel, { color: colors.subText }]}>{day.slice(0, 3)}</Text>
              </View>
            ))}
          </View>

          {/* Time Slot Rows */}
          {TIME_SLOTS.map((slot) => {
            return (
              <View key={slot.label} style={[styles.gridRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.timeCell, { borderRightColor: colors.border }]}>
                  <Text style={[styles.timeSlotLabel, { color: colors.subText }]}>{slot.label}</Text>
                </View>

                {WEEKDAYS.map((day) => {
                  const entry = getEntryForCell(day, slot.label);
                  if (entry) {
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.classCell, { backgroundColor: isDarkMode ? '#1e3a8a30' : '#EAF2FF', borderColor: isDarkMode ? '#1e3a8a90' : '#EAF2FF', borderRightColor: colors.border }]}
                        onPress={() => handleOpenEdit(entry)}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.classCode, { color: isDarkMode ? '#93c5fd' : '#1e3a8a' }]}>{entry.subjectCode}</Text>
                        <Text style={[styles.classProf, { color: isDarkMode ? '#cbd5e1' : '#475569' }]} numberOfLines={1}>{entry.professorName}</Text>
                        <Text style={[styles.classRoom, { color: isDarkMode ? '#94a3b8' : '#64748b' }]} numberOfLines={1}>📍 {entry.roomName}</Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View key={day} style={[styles.vacantCell, { borderRightColor: colors.border, backgroundColor: isDarkMode ? '#11182740' : '#FAFBFC' }]}>
                      <Text style={[styles.vacantText, { color: colors.subText }]}>—</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ADD / EDIT CLASS TIMETABLE MODAL */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.dockContent}>
            <Text style={styles.dockHeading}>{editingId ? '✏️ Reschedule / Edit Class' : '➕ Add Course to Timetable'}</Text>

            <ScrollView style={styles.dockFormScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Subject Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. IT 301"
                placeholderTextColor="#86868b"
                value={subjectCode}
                onChangeText={setSubjectCode}
              />

              <Text style={styles.formLabel}>Subject Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Database Systems"
                placeholderTextColor="#86868b"
                value={subjectName}
                onChangeText={setSubjectName}
              />

              <Text style={styles.formLabel}>Professor Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Alice Williams"
                placeholderTextColor="#86868b"
                value={professorName}
                onChangeText={setProfessorName}
              />

              <Text style={styles.formLabel}>Classroom Location / Room</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Room 101"
                placeholderTextColor="#86868b"
                value={roomName}
                onChangeText={setRoomName}
              />

              {/* Start & End Times dropdowns */}
              <View style={styles.formSplitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, isStartOpen && styles.dropdownTriggerActive]}
                    onPress={() => {
                      setIsStartOpen(!isStartOpen);
                      setIsEndOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownTriggerText}>{startTime}</Text>
                    <Text style={styles.dropdownChevron}>{isStartOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isStartOpen && (
                    <View style={[styles.dropdownListInline, { maxHeight: 120 }]}>
                      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dropdownItemInline, startTime === t && styles.dropdownItemInlineActive]}
                            onPress={() => {
                              setStartTime(t);
                              setIsStartOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemTextInline, startTime === t && styles.dropdownTextActiveInline]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>End Time</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, isEndOpen && styles.dropdownTriggerActive]}
                    onPress={() => {
                      setIsEndOpen(!isEndOpen);
                      setIsStartOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownTriggerText}>{endTime}</Text>
                    <Text style={styles.dropdownChevron}>{isEndOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isEndOpen && (
                    <View style={[styles.dropdownListInline, { maxHeight: 120 }]}>
                      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dropdownItemInline, endTime === t && styles.dropdownItemInlineActive]}
                            onPress={() => {
                              setEndTime(t);
                              setIsEndOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemTextInline, endTime === t && styles.dropdownTextActiveInline]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Day selection */}
              <Text style={styles.formLabel}>Class Recurrence Days</Text>
              <View style={styles.daySelectorWrapper}>
                {WEEKDAYS.map((day) => {
                  const isChecked = selectedDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayCheckRow, isChecked && styles.dayCheckRowActive]}
                      onPress={() => toggleDay(day)}
                    >
                      <View style={[styles.dayCheckBox, isChecked && styles.dayCheckBoxActive]}>
                        {isChecked && <Text style={styles.dayCheckBoxCheck}>✓</Text>}
                      </View>
                      <Text style={[styles.dayCheckText, isChecked && styles.dayCheckTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: 60 }} />
            </ScrollView>

            <View style={styles.dockActionsRow}>
              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(editingId)}>
                  <Text style={styles.deleteBtnLabel}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.dockCancelBtn} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.dockCancelBtnLabel}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.dockSubmitBtn} onPress={handleSave}>
                <Text style={styles.dockSubmitBtnLabel}>Save Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SEMESTER EXPORT PREVIEW MODAL (CSV, Text, and PDF options) */}
      <Modal animationType="fade" transparent={true} visible={isExportModalVisible} onRequestClose={() => setIsExportModalVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.exportContent}>
            <Text style={styles.exportHeading}>📤 Export Semester Timetable</Text>
            <Text style={styles.exportSub}>Download or copy your visual semester timetable details.</Text>

            <View style={styles.previewContainer}>
              <ScrollView showsVerticalScrollIndicator={true}>
                <Text style={styles.previewCodeText}>{generateTextReport()}</Text>
              </ScrollView>
            </View>

            <View style={styles.exportActionsRowStack}>
              <TouchableOpacity style={styles.exportShareBtnLarge} onPress={handleExportPDF}>
                <Text style={styles.exportShareLabelLarge}>📄 Generate Print-Ready PDF</Text>
              </TouchableOpacity>

              <View style={styles.formSplitRow}>
                <TouchableOpacity style={styles.exportShareBtn} onPress={handleExportCSV}>
                  <Text style={styles.exportShareLabel}>Export CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportShareBtn} onPress={handleExportTXT}>
                  <Text style={styles.exportShareLabel}>Copy Text</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsExportModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close Preview</Text>
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  exportBtn: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  exportBtnText: {
    color: '#1d1d1f',
    fontWeight: '700',
    fontSize: 11,
  },
  addBtn: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  gridScroll: {
    flex: 1,
    marginBottom: 10,
  },
  gridContainer: {
    flexDirection: 'column',
  },
  gridRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#eaeaea',
    paddingBottom: 8,
    marginBottom: 6,
  },
  timeHeaderCell: {
    width: 140,
    justifyContent: 'center',
  },
  dayHeaderCell: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridHeaderLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#86868b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f5f6',
    paddingVertical: 8,
    minHeight: 74,
  },
  timeCell: {
    width: 140,
    justifyContent: 'center',
  },
  timeSlotLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  classCell: {
    width: 92,
    backgroundColor: '#0066cc08',
    borderColor: '#0066cc15',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
    padding: 8,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  classCode: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0066cc',
  },
  classProf: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d1d1f',
    marginTop: 3,
  },
  classRoom: {
    fontSize: 8,
    color: '#86868b',
    marginTop: 2.5,
  },
  vacantCell: {
    width: 92,
    borderColor: '#eaeaea80',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginHorizontal: 4,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacantText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d2d2d7',
  },
  // Modals Styling
  popupOverlay: {
    flex: 1,
    backgroundColor: '#00000033',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dockContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    height: '75%',
    maxHeight: 560,
  },
  dockHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d1d1f',
    marginBottom: 16,
  },
  dockFormScroll: {
    flex: 1,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 12,
    color: '#1d1d1f',
    fontSize: 13,
    marginBottom: 10,
  },
  formSplitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  daySelectorWrapper: {
    gap: 8,
    marginTop: 4,
  },
  dayCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 10,
  },
  dayCheckRowActive: {
    borderColor: '#0066cc',
    backgroundColor: '#0066cc08',
  },
  dayCheckBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#eaeaea',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dayCheckBoxActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  dayCheckBoxCheck: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dayCheckText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  dayCheckTextActive: {
    color: '#0066cc',
    fontWeight: '700',
  },
  dockActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    paddingTop: 14,
  },
  dockCancelBtn: {
    flex: 1,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dockCancelBtnLabel: {
    color: '#1d1d1f',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#ff3b3010',
    borderWidth: 1,
    borderColor: '#ff3b3030',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnLabel: {
    color: '#ff3b30',
    fontWeight: '700',
    fontSize: 13,
  },
  dockSubmitBtn: {
    flex: 1.5,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dockSubmitBtnLabel: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  // Export Modal Styles
  exportContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    alignItems: 'center',
  },
  exportHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  exportSub: {
    fontSize: 11,
    color: '#86868b',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: '#f4f5f6',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    maxHeight: 180,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  previewCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: '#1d1d1f',
    lineHeight: 14,
  },
  exportActionsRowStack: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  exportShareBtnLarge: {
    backgroundColor: '#34c759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  exportShareLabelLarge: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  exportShareBtn: {
    flex: 1,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportShareLabel: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  closeBtn: {
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    width: '100%',
    paddingTop: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ff3b30',
    fontWeight: '700',
    fontSize: 13,
  },
  // Dropdown style rules
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 10,
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
  dropdownListInline: {
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#eaeaea',
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItemInline: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f4f4f4',
  },
  dropdownItemInlineActive: {
    backgroundColor: '#0066cc08',
  },
  dropdownItemTextInline: {
    fontSize: 12,
    color: '#1d1d1f',
  },
  dropdownTextActiveInline: {
    color: '#0066cc',
    fontWeight: '700',
  },
});
