import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { ProfessorSubject } from '../data/storage';
import { formatAcademicSection } from './HistoryScreen';

interface Props {
  subjects: ProfessorSubject[];
  onSaveSubjects: (updatedList: ProfessorSubject[]) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = ['2026', '2027', '2028'];

const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTIONS = Array.from({ length: 26 }, (_, i) => `Section ${String.fromCharCode(65 + i)}`);

const DEPARTMENTS = [
  'College of Information Technology',
  'College of Computer Studies',
  'College of Engineering',
  'College of Science',
  'College of Business Administration',
  'College of Liberal Arts'
];

const COURSES = [
  'BSIT',
  'BSCS',
  'BSIS',
  'BSDS',
  'BSCE',
  'BSME',
  'BSEE'
];

// Generate time options in 30-minute increments from 7:00 AM to 9:30 PM
const generateTimeOptions = () => {
  const options = [];
  for (let h = 7; h <= 21; h++) {
    const displayHour = h > 12 ? h - 12 : h;
    const period = h >= 12 ? 'PM' : 'AM';
    const hourStr = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
    options.push(`${hourStr}:00 ${period}`);
    options.push(`${hourStr}:30 ${period}`);
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export default function ProfessorSubjectsScreen({ subjects, onSaveSubjects }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default July 2026
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 6, 1));

  // Pagination states for subjects list (limit to 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(subjects.length / ITEMS_PER_PAGE);

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const paginatedSubjects = subjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Date Pickers Modals
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);

  // Form States
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);

  // Dropdown Open States inside Form
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isStartDropdownOpen, setIsStartDropdownOpen] = useState(false);
  const [isEndDropdownOpen, setIsEndDropdownOpen] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setCourse('');
    setDepartment('');
    setSection('');
    setYearGroup('');
    setStartTime('08:00 AM');
    setEndTime('10:00 AM');
    setRecurrenceDays([]);
    setIsYearDropdownOpen(false);
    setIsSectionDropdownOpen(false);
    setIsDeptDropdownOpen(false);
    setIsCourseDropdownOpen(false);
    setIsStartDropdownOpen(false);
    setIsEndDropdownOpen(false);
    setIsFormVisible(true);
  };

  const openEditModal = (sub: ProfessorSubject) => {
    setEditingId(sub.id);
    setCode(sub.code);
    setName(sub.name);
    setCourse(sub.course || '');
    setDepartment(sub.department || '');
    setSection(sub.section);
    setYearGroup(sub.year);
    
    // Parse "08:00 AM - 10:00 AM" into start and end time
    const parts = sub.scheduleTime.split(' - ');
    if (parts.length === 2) {
      setStartTime(parts[0]);
      setEndTime(parts[1]);
    } else {
      setStartTime('08:00 AM');
      setEndTime('10:00 AM');
    }

    setRecurrenceDays(sub.daysOfWeek || []);
    setIsYearDropdownOpen(false);
    setIsSectionDropdownOpen(false);
    setIsDeptDropdownOpen(false);
    setIsCourseDropdownOpen(false);
    setIsStartDropdownOpen(false);
    setIsEndDropdownOpen(false);
    setIsFormVisible(true);
  };

  const toggleDay = (day: string) => {
    if (recurrenceDays.includes(day)) {
      setRecurrenceDays(recurrenceDays.filter((d) => d !== day));
    } else {
      setRecurrenceDays([...recurrenceDays, day]);
    }
  };

  const handleSave = () => {
    if (!code.trim() || !name.trim() || !section.trim() || !yearGroup.trim() || !course || !department) {
      Alert.alert('Error', 'Please fill in all subject details.');
      return;
    }

    if (recurrenceDays.length === 0) {
      Alert.alert('Error', 'Please select at least one teaching weekday.');
      return;
    }

    // Compile time range
    const scheduleTimeStr = `${startTime} - ${endTime}`;

    if (editingId) {
      // Edit mode
      const updated = subjects.map((sub) => {
        if (sub.id === editingId) {
          return {
            ...sub,
            code: code.trim(),
            name: name.trim(),
            course: course,
            department: department,
            section: section.trim(),
            year: yearGroup.trim(),
            scheduleTime: scheduleTimeStr,
            daysOfWeek: recurrenceDays,
          };
        }
        return sub;
      });
      onSaveSubjects(updated);
    } else {
      // Create mode
      const newSubject: ProfessorSubject = {
        id: Math.random().toString(36).substring(2, 9),
        code: code.trim(),
        name: name.trim(),
        course: course,
        department: department,
        section: section.trim(),
        year: yearGroup.trim(),
        scheduleTime: scheduleTimeStr,
        originalScheduleTime: scheduleTimeStr,
        daysOfWeek: recurrenceDays,
      };
      onSaveSubjects([...subjects, newSubject]);
    }

    setIsFormVisible(false);
  };

  const handleDeleteSubject = (id: string) => {
    Alert.alert('Delete Subject', 'Are you sure you want to remove this subject from your semester workload?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onSaveSubjects(subjects.filter((sub) => sub.id !== id));
        },
      },
    ]);
  };

  // Calendar utility calculations
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  const prevMonth = () => {
    const prev = new Date(selectedYear, selectedMonth - 1, 1);
    setCurrentDate(prev);
  };

  const nextMonth = () => {
    const next = new Date(selectedYear, selectedMonth + 1, 1);
    setCurrentDate(next);
  };

  const selectMonth = (monthIdx: number) => {
    setCurrentDate(new Date(selectedYear, monthIdx, 1));
    setIsMonthPickerVisible(false);
  };

  const selectYear = (yearStr: string) => {
    setCurrentDate(new Date(parseInt(yearStr, 10), selectedMonth, 1));
    setIsYearPickerVisible(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0: Sunday, 1: Monday, ... 6: Saturday
    const day = new Date(year, month, 1).getDay();
    // Shift Sunday to last element to map Mon-Sun grid nicely
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDayOffset = getFirstDayOfMonth(selectedYear, selectedMonth);

  // Generate calendar grid cells representation
  const calendarCells = [];
  // Offset cells for preceding month
  for (let i = 0; i < firstDayOffset; i++) {
    calendarCells.push({ id: `empty-${i}`, isDay: false, dayNum: 0 });
  }
  // Month day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(selectedYear, selectedMonth, d);
    calendarCells.push({ id: `day-${d}`, isDay: true, dayNum: d, date: dateObj });
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Find subjects scheduled for selected weekday
  const getSubjectsForDate = (date: Date) => {
    const dayOfWeekStr = getDayName(date);
    return subjects.filter((sub) => sub.daysOfWeek?.includes(dayOfWeekStr));
  };

  // Check if date has classes indicator dot
  const hasClassesOnDate = (date: Date) => {
    return getSubjectsForDate(date).length > 0;
  };

  const isSameDate = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const selectedDateClasses = getSubjectsForDate(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎓 Course Workload Manager</Text>
        <Text style={styles.headerSubtitle}>
          Configure your teaching subjects, sections, and track schedule timelines.
        </Text>
      </View>

      {/* View Switcher Segmented Control */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
            Workload List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
          onPress={() => setViewMode('calendar')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, viewMode === 'calendar' && styles.toggleBtnTextActive]}>
            Calendar Monitor
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.9}>
            <Text style={styles.addBtnText}>+ Add Semester Subject</Text>
          </TouchableOpacity>

          <FlatList
            data={paginatedSubjects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isShifted = item.scheduleTime !== item.originalScheduleTime;

              return (
                <View style={styles.card}>
                  <View style={styles.cardInfo}>
                    <View style={styles.codeRow}>
                      <Text style={styles.subjectCode}>{item.code}</Text>
                      {isShifted && (
                        <View style={styles.shiftedBadge}>
                          <Text style={styles.shiftedBadgeText}>🕒 SCHEDULE SHIFTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.subjectName}>{item.name}</Text>
                    
                    <Text style={styles.metaLabel}>
                      Department: <Text style={styles.metaValue}>{item.department || 'N/A'}</Text>
                    </Text>

                    <Text style={styles.metaLabel}>
                      Course: <Text style={styles.metaValue}>{item.course || 'N/A'}</Text>
                    </Text>

                    <Text style={styles.metaLabel}>
                      Target Class: <Text style={styles.metaValue}>{formatAcademicSection(item.code, item.year, item.section)}</Text>
                    </Text>

                    <Text style={styles.metaLabel}>
                      Schedule: <Text style={[styles.metaValue, isShifted && styles.shiftedTimeText]}>{item.scheduleTime}</Text>
                    </Text>
                    {isShifted && (
                      <Text style={styles.originalScheduleLabel}>
                        Original schedule: {item.originalScheduleTime}
                      </Text>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
                      <Text style={styles.actionLinkText}>✏️ Reschedule / Edit</Text>
                    </TouchableOpacity>
                    <Text style={styles.actionLinkDivider}>•</Text>
                    <TouchableOpacity onPress={() => handleDeleteSubject(item.id)} activeOpacity={0.7}>
                      <Text style={[styles.actionLinkText, { color: '#ff3b30' }]}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No subjects configured for this semester yet.</Text>
            }
          />
        </>
      ) : (
        /* FULL MONTHLY & YEARLY GRID CALENDAR MONITOR */
        <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.calendarBox}>
            {/* Header controls for Month & Year */}
            <View style={styles.calendarControlHeader}>
              <TouchableOpacity style={styles.arrowBtn} onPress={prevMonth}>
                <Text style={styles.arrowText}>◀</Text>
              </TouchableOpacity>

              <View style={styles.pickerSelectorRow}>
                <TouchableOpacity style={styles.pickerPill} onPress={() => setIsMonthPickerVisible(true)}>
                  <Text style={styles.pickerPillText}>{MONTHS[selectedMonth]} ▾</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.pickerPill} onPress={() => setIsYearPickerVisible(true)}>
                  <Text style={styles.pickerPillText}>{selectedYear} ▾</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.arrowBtn} onPress={nextMonth}>
                <Text style={styles.arrowText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Grid Week Days Header */}
            <View style={styles.calendarWeekHeader}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, idx) => (
                <Text key={idx} style={styles.weekLabel}>{label}</Text>
              ))}
            </View>

            {/* Grid Days List */}
            <View style={styles.calendarGrid}>
              {calendarCells.map((cell) => {
                if (!cell.isDay || !cell.date) {
                  return <View key={cell.id} style={styles.gridCellEmpty} />;
                }

                const isSelected = isSameDate(cell.date, selectedDate);
                const hasClass = hasClassesOnDate(cell.date);

                return (
                  <TouchableOpacity
                    key={cell.id}
                    style={[styles.gridCellDay, isSelected && styles.gridCellDaySelected]}
                    onPress={() => setSelectedDate(cell.date!)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayNumberText, isSelected && styles.dayNumberTextSelected]}>
                      {cell.dayNum}
                    </Text>
                    {hasClass && (
                      <View style={[styles.classDot, isSelected && styles.classDotSelected]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Timeline Schedule Drawer */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineHeader}>
              📅 Agenda: {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>

            {selectedDateClasses.length === 0 ? (
              <View style={styles.emptyCalendarBlock}>
                <Text style={styles.emptyCalendarText}>No scheduled classes today</Text>
                <Text style={styles.emptyCalendarSub}>Tap another calendar grid date to view that day's scheduled subjects.</Text>
              </View>
            ) : (
              selectedDateClasses.map((item) => {
                const isShifted = item.scheduleTime !== item.originalScheduleTime;
                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineMarkerContainer}>
                      <View style={[styles.timelineNode, isShifted && styles.timelineNodeShifted]} />
                      <View style={styles.timelineLine} />
                    </View>
                    
                    <View style={styles.timelineDetails}>
                      <View style={styles.timelineTimeRow}>
                        <Text style={[styles.timelineTimeText, isShifted && styles.shiftedTimeText]}>{item.scheduleTime}</Text>
                        {isShifted && (
                          <View style={styles.shiftedBadge}>
                            <Text style={styles.shiftedBadgeText}>SHIFTED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineCode}>{item.code}</Text>
                      <Text style={styles.timelineName}>{item.name}</Text>
                      <Text style={styles.timelineClassGroup}>
                        🏫 {formatAcademicSection(item.code, item.year, item.section)}
                      </Text>
                      {isShifted && (
                        <Text style={styles.timelineOriginalLabel}>
                          Originally: {item.originalScheduleTime}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* MONTH SELECTION POPUP MODAL */}
      <Modal animationType="fade" transparent={true} visible={isMonthPickerVisible} onRequestClose={() => setIsMonthPickerVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupHeading}>Select Month</Text>
            <ScrollView contentContainerStyle={styles.popupGrid} showsVerticalScrollIndicator={false}>
              {MONTHS.map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.pickerItem, selectedMonth === idx && styles.pickerItemActive]}
                  onPress={() => selectMonth(idx)}
                >
                  <Text style={[styles.pickerItemLabel, selectedMonth === idx && styles.pickerItemLabelActive]}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.popupCancel} onPress={() => setIsMonthPickerVisible(false)}>
              <Text style={styles.popupCancelLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* YEAR SELECTION POPUP MODAL */}
      <Modal animationType="fade" transparent={true} visible={isYearPickerVisible} onRequestClose={() => setIsYearPickerVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupHeading}>Select Year</Text>
            <View style={styles.popupGrid}>
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.pickerItem, selectedYear.toString() === y && styles.pickerItemActive]}
                  onPress={() => selectYear(y)}
                >
                  <Text style={[styles.pickerItemLabel, selectedYear.toString() === y && styles.pickerItemLabelActive]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.popupCancel} onPress={() => setIsYearPickerVisible(false)}>
              <Text style={styles.popupCancelLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD / EDIT SUBJECT DOCK MODAL (Time pickers, course, and department dropdowns) */}
      <Modal animationType="slide" transparent={true} visible={isFormVisible} onRequestClose={() => setIsFormVisible(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.dockContent}>
            <Text style={styles.dockHeading}>{editingId ? '✏️ Reschedule / Edit Class' : '➕ Add New Subject'}</Text>
            
            <ScrollView style={styles.dockFormScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Subject Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. IT 204"
                placeholderTextColor="#86868b"
                value={code}
                onChangeText={setCode}
              />

              <Text style={styles.formLabel}>Subject Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mobile Application Development"
                placeholderTextColor="#86868b"
                value={name}
                onChangeText={setName}
              />

              {/* Course Dropdown */}
              <Text style={styles.formLabel}>Course</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isCourseDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsCourseDropdownOpen(!isCourseDropdownOpen);
                  setIsDeptDropdownOpen(false);
                  setIsYearDropdownOpen(false);
                  setIsSectionDropdownOpen(false);
                  setIsStartDropdownOpen(false);
                  setIsEndDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>{course || 'Select Course...'}</Text>
                <Text style={styles.dropdownChevron}>{isCourseDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isCourseDropdownOpen && (
                <View style={styles.dropdownListInline}>
                  {COURSES.map((crs) => (
                    <TouchableOpacity
                      key={crs}
                      style={[styles.dropdownItemInline, course === crs && styles.dropdownItemInlineActive]}
                      onPress={() => {
                        setCourse(crs);
                        setIsCourseDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemTextInline, course === crs && styles.dropdownTextActiveInline]}>
                        {crs}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Department Dropdown */}
              <Text style={styles.formLabel}>Department</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isDeptDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsDeptDropdownOpen(!isDeptDropdownOpen);
                  setIsCourseDropdownOpen(false);
                  setIsYearDropdownOpen(false);
                  setIsSectionDropdownOpen(false);
                  setIsStartDropdownOpen(false);
                  setIsEndDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>{department || 'Select Department...'}</Text>
                <Text style={styles.dropdownChevron}>{isDeptDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isDeptDropdownOpen && (
                <View style={styles.dropdownListInline}>
                  {DEPARTMENTS.map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      style={[styles.dropdownItemInline, department === dept && styles.dropdownItemInlineActive]}
                      onPress={() => {
                        setDepartment(dept);
                        setIsDeptDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemTextInline, department === dept && styles.dropdownTextActiveInline]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.formSplitRow}>
                {/* Year Level Dropdown */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Year Level Group</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, isYearDropdownOpen && styles.dropdownTriggerActive]}
                    onPress={() => {
                      setIsYearDropdownOpen(!isYearDropdownOpen);
                      setIsSectionDropdownOpen(false);
                      setIsDeptDropdownOpen(false);
                      setIsCourseDropdownOpen(false);
                      setIsStartDropdownOpen(false);
                      setIsEndDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownTriggerText}>{yearGroup || 'Select Year...'}</Text>
                    <Text style={styles.dropdownChevron}>{isYearDropdownOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isYearDropdownOpen && (
                    <View style={styles.dropdownListInline}>
                      {YEAR_LEVELS.map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[styles.dropdownItemInline, yearGroup === y && styles.dropdownItemInlineActive]}
                          onPress={() => {
                            setYearGroup(y);
                            setIsYearDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemTextInline, yearGroup === y && styles.dropdownTextActiveInline]}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Section Dropdown */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Section</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, isSectionDropdownOpen && styles.dropdownTriggerActive]}
                    onPress={() => {
                      setIsSectionDropdownOpen(!isSectionDropdownOpen);
                      setIsYearDropdownOpen(false);
                      setIsDeptDropdownOpen(false);
                      setIsCourseDropdownOpen(false);
                      setIsStartDropdownOpen(false);
                      setIsEndDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownTriggerText}>{section || 'Select Sec...'}</Text>
                    <Text style={styles.dropdownChevron}>{isSectionDropdownOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isSectionDropdownOpen && (
                    <View style={[styles.dropdownListInline, { maxHeight: 160 }]}>
                      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        {SECTIONS.map((s) => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.dropdownItemInline, section === s && styles.dropdownItemInlineActive]}
                            onPress={() => {
                              setSection(s);
                              setIsSectionDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemTextInline, section === s && styles.dropdownTextActiveInline]}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Time Range Filter Picker */}
              <Text style={styles.formLabel}>Class Time Schedule</Text>
              <View style={styles.formSplitRow}>
                {/* Start Time Dropdown */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeSubLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, isStartDropdownOpen && styles.dropdownTriggerActive]}
                    onPress={() => {
                      setIsStartDropdownOpen(!isStartDropdownOpen);
                      setIsEndDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsSectionDropdownOpen(false);
                      setIsDeptDropdownOpen(false);
                      setIsCourseDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownTriggerText}>{startTime}</Text>
                    <Text style={styles.dropdownChevron}>{isStartDropdownOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isStartDropdownOpen && (
                    <View style={[styles.dropdownListInline, { maxHeight: 150 }]}>
                      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dropdownItemInline, startTime === t && styles.dropdownItemInlineActive]}
                            onPress={() => {
                              setStartTime(t);
                              setIsStartDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemTextInline, startTime === t && styles.dropdownTextActiveInline]}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* End Time Dropdown */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeSubLabel}>End Time</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, isEndDropdownOpen && styles.dropdownTriggerActive]}
                    onPress={() => {
                      setIsEndDropdownOpen(!isEndDropdownOpen);
                      setIsStartDropdownOpen(false);
                      setIsYearDropdownOpen(false);
                      setIsSectionDropdownOpen(false);
                      setIsDeptDropdownOpen(false);
                      setIsCourseDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownTriggerText}>{endTime}</Text>
                    <Text style={styles.dropdownChevron}>{isEndDropdownOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isEndDropdownOpen && (
                    <View style={[styles.dropdownListInline, { maxHeight: 150 }]}>
                      <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dropdownItemInline, endTime === t && styles.dropdownItemInlineActive]}
                            onPress={() => {
                              setEndTime(t);
                              setIsEndDropdownOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemTextInline, endTime === t && styles.dropdownTextActiveInline]}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Class Days of Week Checkboxes */}
              <Text style={styles.formLabel}>Recurrence Weekly Days</Text>
              <View style={styles.daySelectorWrapper}>
                {WEEKDAYS.map((day) => {
                  const isChecked = recurrenceDays.includes(day);
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
              <TouchableOpacity style={styles.dockCancelBtn} onPress={() => setIsFormVisible(false)}>
                <Text style={styles.dockCancelBtnLabel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.dockSubmitBtn} onPress={handleSave}>
                <Text style={styles.dockSubmitBtnLabel}>Save Subject</Text>
              </TouchableOpacity>
            </View>
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f4f5f6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#86868b',
  },
  toggleBtnTextActive: {
    color: '#1d1d1f',
  },
  addBtn: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 18,
    marginBottom: 16,
  },
  cardInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 12,
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0066cc',
    textTransform: 'uppercase',
  },
  shiftedBadge: {
    backgroundColor: '#ff950010',
    borderColor: '#ff9500',
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  shiftedBadgeText: {
    color: '#ff9500',
    fontSize: 7,
    fontWeight: '900',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: '#86868b',
    marginTop: 4,
    fontWeight: '700',
  },
  metaValue: {
    color: '#1d1d1f',
    fontWeight: 'normal',
  },
  shiftedTimeText: {
    color: '#ff9500',
    fontWeight: 'bold',
  },
  originalScheduleLabel: {
    fontSize: 9,
    color: '#86868b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  actionLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066cc',
  },
  actionLinkDivider: {
    color: '#eaeaea',
    fontSize: 11,
  },
  emptyText: {
    textAlign: 'center',
    color: '#86868b',
    fontStyle: 'italic',
    marginTop: 40,
  },
  // Calendar styles
  calendarScroll: {
    flex: 1,
  },
  calendarBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 16,
    marginBottom: 16,
  },
  calendarControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 10,
    color: '#1d1d1f',
    fontWeight: 'bold',
  },
  pickerSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerPill: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pickerPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 6,
    marginBottom: 10,
  },
  weekLabel: {
    width: 40,
    fontSize: 10,
    fontWeight: '800',
    color: '#86868b',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  gridCellEmpty: {
    width: 40,
    height: 44,
  },
  gridCellDay: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  gridCellDaySelected: {
    backgroundColor: '#0066cc',
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  dayNumberTextSelected: {
    color: '#ffffff',
  },
  classDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0066cc',
    position: 'absolute',
    bottom: 6,
  },
  classDotSelected: {
    backgroundColor: '#ffffff',
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eaeaea',
    padding: 16,
  },
  timelineHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86868b',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCalendarBlock: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyCalendarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#86868b',
  },
  emptyCalendarSub: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineMarkerContainer: {
    width: 20,
    alignItems: 'center',
  },
  timelineNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066cc',
    zIndex: 1,
    marginTop: 4,
  },
  timelineNodeShifted: {
    backgroundColor: '#ff9500',
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#eaeaea',
    marginVertical: 4,
  },
  timelineDetails: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 14,
  },
  timelineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timelineTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d1d1f',
  },
  timelineCode: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0066cc',
    textTransform: 'uppercase',
  },
  timelineName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d1d1f',
    marginTop: 2,
  },
  timelineClassGroup: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 2,
  },
  timelineOriginalLabel: {
    fontSize: 9,
    color: '#86868b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Popups layout
  popupOverlay: {
    flex: 1,
    backgroundColor: '#00000033',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
  },
  popupHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1d1d1f',
    textAlign: 'center',
    marginBottom: 16,
  },
  popupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pickerItem: {
    width: 80,
    paddingVertical: 10,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerItemActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  pickerItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  pickerItemLabelActive: {
    color: '#ffffff',
  },
  popupCancel: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    paddingTop: 12,
    alignItems: 'center',
  },
  popupCancelLabel: {
    color: '#ff3b30',
    fontWeight: '700',
    fontSize: 13,
  },
  // Form Dock details
  dockContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    height: '80%',
    maxHeight: 600,
  },
  dockHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1d1d1f',
    marginBottom: 16,
  },
  dockFormScroll: {
    flex: 1,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  timeSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginTop: 4,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
