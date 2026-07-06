import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import {
  UserAccount,
  StudentProfile,
  ProfessorSubject,
  getUserAccounts,
  saveUserAccounts,
  saveCurrentUser,
  saveStudentProfile,
  saveProfessorSubjects,
  loginUserAccount,
  registerUserAccount,
} from '../services/api';
import { formatAcademicSection } from './HistoryScreen';

interface Props {
  onLoginSuccess: (user: UserAccount, role: 'professor' | 'student') => void;
  isDarkMode?: boolean;
}

// Google Places Autocomplete mock suggestions
const GOOGLE_PLACES_SUGGESTIONS = [
  { description: 'Taft Avenue, Malate, Manila, Metro Manila', lat: 14.56841, lng: 120.99182 },
  { description: 'Katipunan Avenue, Loyola Heights, Quezon City, Metro Manila', lat: 14.63984, lng: 121.07751 },
  { description: 'Bonifacio High Street, BGC, Taguig, Metro Manila', lat: 14.55195, lng: 121.04786 },
  { description: 'University of Santo Tomas, España Blvd, Manila, Metro Manila', lat: 14.60952, lng: 120.98924 },
  { description: 'Roxas Boulevard, Pasay, Metro Manila', lat: 14.54921, lng: 120.98145 },
  { description: 'España Boulevard, Sampaloc, Manila, Metro Manila', lat: 14.60831, lng: 120.99042 },
  { description: 'EDSA, Cubao, Quezon City, Metro Manila', lat: 14.62215, lng: 121.05314 },
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

// Generate times for dropdown from 07:00 AM to 09:30 PM
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

const DotGrid = () => (
  <View style={styles.dotGridContainer}>
    {Array.from({ length: 7 }).map((_, r) => (
      <View key={r} style={styles.dotGridRow}>
        {Array.from({ length: 4 }).map((_, c) => (
          <View key={c} style={styles.dotGridDot} />
        ))}
      </View>
    ))}
  </View>
);

export default function AuthScreen({ onLoginSuccess, isDarkMode = false }: Props) {
  const colors = {
    bg: isDarkMode ? '#111827' : '#FAFBFC',
    text: isDarkMode ? '#F9FAFB' : '#111827',
    subText: isDarkMode ? '#9CA3AF' : '#6B7280',
    cardBg: isDarkMode ? '#1F2937' : '#ffffff',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'professor' | 'student'>('student');

  // Input states
  const [name, setName] = useState('');
  const [usernameId, setUsernameId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Wizard Step: 1 = Basic Info, 2 = Role-specific config
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Student specific signup states
  const [yearGroup, setYearGroup] = useState('');
  const [section, setSection] = useState('');
  const [isIrregular, setIsIrregular] = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [homeLat, setHomeLat] = useState(14.56841);
  const [homeLng, setHomeLng] = useState(120.99182);
  const [homeSuggestions, setHomeSuggestions] = useState<typeof GOOGLE_PLACES_SUGGESTIONS>([]);

  // Boarding house/apartment address fields
  const [hasSecondAddress, setHasSecondAddress] = useState(false);
  const [secondAddress, setSecondAddress] = useState('');
  const [secondLat, setSecondLat] = useState(0);
  const [secondLng, setSecondLng] = useState(0);
  const [secondSuggestions, setSecondSuggestions] = useState<typeof GOOGLE_PLACES_SUGGESTIONS>([]);

  // Professor specific subjects handled list
  const [profSubjects, setProfSubjects] = useState<ProfessorSubject[]>([]);
  // Subject builder temp form states (Added Course and Department)
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCourse, setNewSubCourse] = useState('');
  const [newSubDepartment, setNewSubDepartment] = useState('');
  const [newSubYear, setNewSubYear] = useState('');
  const [newSubSection, setNewSubSection] = useState('');
  const [newSubStartTime, setNewSubStartTime] = useState('08:00 AM');
  const [newSubEndTime, setNewSubEndTime] = useState('10:00 AM');

  // Form Dropdowns open/close controllers
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  
  const [isSubYearDropdownOpen, setIsSubYearDropdownOpen] = useState(false);
  const [isSubSecDropdownOpen, setIsSubSecDropdownOpen] = useState(false);
  const [isSubDeptDropdownOpen, setIsSubDeptDropdownOpen] = useState(false);
  const [isSubCourseDropdownOpen, setIsSubCourseDropdownOpen] = useState(false);
  const [isStartDropdownOpen, setIsStartDropdownOpen] = useState(false);
  const [isEndDropdownOpen, setIsEndDropdownOpen] = useState(false);

  // Handle address searches
  const handleHomeAddressChange = (text: string) => {
    setHomeAddress(text);
    if (text.length > 2) {
      setHomeSuggestions(GOOGLE_PLACES_SUGGESTIONS.filter(item => 
        item.description.toLowerCase().includes(text.toLowerCase())
      ));
    } else {
      setHomeSuggestions([]);
    }
  };

  const handleSecondAddressChange = (text: string) => {
    setSecondAddress(text);
    if (text.length > 2) {
      setSecondSuggestions(GOOGLE_PLACES_SUGGESTIONS.filter(item => 
        item.description.toLowerCase().includes(text.toLowerCase())
      ));
    } else {
      setSecondSuggestions([]);
    }
  };

  // Add subject temp builder (Supports course and department)
  const handleAddSubjectToProfList = () => {
    if (
      !newSubCode.trim() ||
      !newSubName.trim() ||
      !newSubYear ||
      !newSubSection ||
      !newSubCourse ||
      !newSubDepartment
    ) {
      Alert.alert('Error', 'Please fill in all subject builder fields.');
      return;
    }
    const sched = `${newSubStartTime} - ${newSubEndTime}`;
    const newSub: ProfessorSubject = {
      id: Math.random().toString(36).substring(2, 9),
      code: newSubCode.trim().toUpperCase(),
      name: newSubName.trim(),
      section: newSubSection,
      year: newSubYear,
      course: newSubCourse,
      department: newSubDepartment,
      scheduleTime: sched,
      originalScheduleTime: sched,
      daysOfWeek: ['Monday', 'Wednesday', 'Friday'], // Default days
    };
    setProfSubjects([...profSubjects, newSub]);
    setNewSubCode('');
    setNewSubName('');
    setNewSubYear('');
    setNewSubSection('');
    setNewSubCourse('');
    setNewSubDepartment('');
    Alert.alert('Subject Added', `${newSub.code} has been added to your workload.`);
  };

  const handleRemoveSubjectFromProfList = (id: string) => {
    setProfSubjects(profSubjects.filter(s => s.id !== id));
  };

  const handleLoginSubmit = async () => {
    if (!usernameId.trim() || !password) {
      Alert.alert('Error', 'Please fill in all login credentials.');
      return;
    }

    setLoading(true);
    try {
      const match = await loginUserAccount(usernameId.trim(), password);
      setLoading(false);
      if (match.role !== role) {
        Alert.alert('Login Failed', 'Incorrect ID/Email or password. Please verify your role selection.');
        return;
      }
      await saveCurrentUser(match);
      onLoginSuccess(match, role);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Login Failed', err.message || 'Incorrect ID/Email or password. Please verify your role selection.');
    }
  };

  // Signup Wizard triggers
  const handleSignupNext = () => {
    if (!name.trim() || !usernameId.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all basic registration details.');
      return;
    }
    setSignupStep(2);
  };

  const handleSignupComplete = async () => {
    if (role === 'student') {
      if (!yearGroup || !section || !homeAddress.trim()) {
        Alert.alert('Error', 'Please fill in all required student details, including your home address.');
        return;
      }
      if (hasSecondAddress && !secondAddress.trim()) {
        Alert.alert('Error', 'Please specify your second boarding/apartment address.');
        return;
      }
    } else {
      if (profSubjects.length === 0) {
        Alert.alert('Workload Empty', 'You are required to add at least 1 class subject to complete registration.');
        return;
      }
    }

    setLoading(true);
    try {
      const userPayload = {
        name: name.trim(),
        usernameId: usernameId.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role,
        year: yearGroup,
        section: section,
        isIrregular: isIrregular,
        homeAddress: homeAddress,
        homeLatitude: homeLat,
        homeLongitude: homeLng,
        hasSecondAddress: hasSecondAddress,
        secondAddress: hasSecondAddress ? secondAddress : undefined,
        secondLatitude: hasSecondAddress ? secondLat : undefined,
        secondLongitude: hasSecondAddress ? secondLng : undefined,
      };

      const newAccount = await registerUserAccount(userPayload);
      await saveCurrentUser(newAccount);

      if (role === 'professor') {
        await saveProfessorSubjects(profSubjects, newAccount.usernameId);
      }

      setLoading(false);
      Alert.alert('Registration Successful', `Welcome to Attenza, ${newAccount.name}!`);
      onLoginSuccess(newAccount, role);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Registration Failed', err.message || 'Registration request could not be processed.');
    }
  };

  if (authMode === 'login') {
    return (
      <ScrollView style={[styles.scrollStyle, { backgroundColor: colors.bg }]} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.backgroundSweep, isDarkMode && { backgroundColor: '#1e3a8a15', borderTopLeftRadius: 0 }]} />
        <View style={[styles.rightCircleBackground, isDarkMode && { backgroundColor: '#1e3a8a10' }]} />
        <DotGrid />
        <View style={styles.brandingHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
          <Text style={[styles.brandingSubText, { color: colors.subText }]}>Secure Real-time Attendance Engine</Text>
        </View>

        <View style={[styles.authCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.cardHeading, { color: colors.text }]}>Sign In</Text>

          {/* Role Segmented Selector */}
          <View style={[styles.roleToggleRow, { backgroundColor: isDarkMode ? '#111827' : '#f0f2f5' }]}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'student' && styles.roleBtnActive, role !== 'student' && isDarkMode && { backgroundColor: 'transparent' }]} 
              onPress={() => setRole('student')}
            >
              <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive, role !== 'student' && { color: colors.subText }]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'professor' && styles.roleBtnActive, role !== 'professor' && isDarkMode && { backgroundColor: 'transparent' }]} 
              onPress={() => setRole('professor')}
            >
              <Text style={[styles.roleBtnText, role === 'professor' && styles.roleBtnTextActive, role !== 'professor' && { color: colors.subText }]}>Professor</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Username, ID Number, or Email</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder={role === 'student' ? "e.g. 2024-0518" : "e.g. prof1"}
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            value={usernameId}
            onChangeText={setUsernameId}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder="••••••••"
            placeholderTextColor={colors.subText}
            secureTextEntry={true}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleLoginSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchModeLink} onPress={() => { setAuthMode('signup'); setSignupStep(1); setPassword(''); setUsernameId(''); }}>
            <Text style={[styles.switchModeText, { color: colors.subText }]}>Don't have an account? <Text style={styles.switchModeAccent}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (signupStep === 1) {
    return (
      <ScrollView style={[styles.scrollStyle, { backgroundColor: colors.bg }]} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.backgroundSweep, isDarkMode && { backgroundColor: '#1e3a8a15', borderTopLeftRadius: 0 }]} />
        <View style={[styles.rightCircleBackground, isDarkMode && { backgroundColor: '#1e3a8a10' }]} />
        <DotGrid />
        <View style={styles.brandingHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
          <Text style={[styles.brandingSubText, { color: colors.subText }]}>Create your secure account</Text>
        </View>

        <View style={[styles.authCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.stepHeaderRow}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>Sign Up</Text>
            <Text style={styles.stepIndicatorLabel}>Step 1 of 2</Text>
          </View>

          {/* Role Segmented Selector */}
          <View style={[styles.roleToggleRow, { backgroundColor: isDarkMode ? '#111827' : '#f0f2f5' }]}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'student' && styles.roleBtnActive, role !== 'student' && isDarkMode && { backgroundColor: 'transparent' }]} 
              onPress={() => setRole('student')}
            >
              <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive, role !== 'student' && { color: colors.subText }]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'professor' && styles.roleBtnActive, role !== 'professor' && isDarkMode && { backgroundColor: 'transparent' }]} 
              onPress={() => setRole('professor')}
            >
              <Text style={[styles.roleBtnText, role === 'professor' && styles.roleBtnTextActive, role !== 'professor' && { color: colors.subText }]}>Professor</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. Dr. Jane Smith"
            placeholderTextColor={colors.subText}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>{role === 'student' ? 'Student ID Number' : 'Professor Username / ID'}</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder={role === 'student' ? "e.g. 2024-0518" : "e.g. prof1"}
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            value={usernameId}
            onChangeText={setUsernameId}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>University Email Address</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. name@university.edu"
            placeholderTextColor={colors.subText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder="••••••••"
            placeholderTextColor={colors.subText}
            secureTextEntry={true}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignupNext}>
            <Text style={styles.primaryBtnText}>Next Step</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchModeLink} onPress={() => { setAuthMode('login'); setPassword(''); setUsernameId(''); }}>
            <Text style={[styles.switchModeText, { color: colors.subText }]}>Already have an account? <Text style={styles.switchModeAccent}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (role === 'student' && signupStep === 2) {
    return (
      <ScrollView style={[styles.scrollStyle, { backgroundColor: colors.bg }]} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.backgroundSweep, isDarkMode && { backgroundColor: '#1e3a8a15', borderTopLeftRadius: 0 }]} />
        <View style={[styles.rightCircleBackground, isDarkMode && { backgroundColor: '#1e3a8a10' }]} />
        <DotGrid />
        <View style={styles.brandingHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
          <Text style={[styles.brandingSubText, { color: colors.subText }]}>Complete Student Profile</Text>
        </View>

        <View style={[styles.authCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.stepHeaderRow}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>Student Profile Setup</Text>
            <Text style={styles.stepIndicatorLabel}>Step 2 of 2</Text>
          </View>
          <Text style={styles.infoLockNotice}>⚠️ Note: Once registration is complete, student profile details and home addresses are strictly locked and cannot be edited.</Text>

          <View style={styles.formSplitRow}>
            {/* Year Group Selection */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Year Level</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isYearDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsYearDropdownOpen(!isYearDropdownOpen);
                  setIsSectionDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{yearGroup || 'Select Year...'}</Text>
                <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isYearDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isYearDropdownOpen && (
                <View style={[styles.dropdownListInline, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  {YEAR_LEVELS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.dropdownItemInline, yearGroup === y && styles.dropdownItemInlineActive]}
                      onPress={() => {
                        setYearGroup(y);
                        setIsYearDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemTextInline, { color: colors.text }, yearGroup === y && styles.dropdownTextActiveInline]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Section Selection */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Section</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isSectionDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsSectionDropdownOpen(!isSectionDropdownOpen);
                  setIsYearDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{section || 'Select Sec...'}</Text>
                <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isSectionDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isSectionDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
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
                        <Text style={[styles.dropdownItemTextInline, { color: colors.text }, section === s && styles.dropdownTextActiveInline]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Primary Home Address search */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Primary Home Address</Text>
          <View style={styles.googleSearchContainer}>
            <TextInput
              style={[styles.textInput, { marginBottom: 0, backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
              placeholder="Search Taft Avenue, UST, Katipunan..."
              placeholderTextColor={colors.subText}
              value={homeAddress}
              onChangeText={handleHomeAddressChange}
            />
            {homeSuggestions.length > 0 && (
              <View style={[styles.suggestionsBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={styles.googlePoweredLabel}>Google Maps Autocomplete Predictions</Text>
                {homeSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setHomeAddress(item.description);
                      setHomeLat(item.lat);
                      setHomeLng(item.lng);
                      setHomeSuggestions([]);
                    }}
                  >
                    <Text style={styles.pinIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
                      <Text style={[styles.coordsSub, { color: colors.subText }]}>Coordinates: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Living in boarding house / apartment toggle */}
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Living in a Boarding House / Apartment?</Text>
              <Text style={[styles.toggleSubText, { color: colors.subText }]}>Enable to register a second address for proximity calculations</Text>
            </View>
            <Switch
              value={hasSecondAddress}
              onValueChange={setHasSecondAddress}
              trackColor={{ false: isDarkMode ? '#374151' : '#e5e7eb', true: '#1E5EFF' }}
              thumbColor="#ffffff"
              style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
            />
          </View>

          {/* Second Address search (Boarding house / Apartment) */}
          {hasSecondAddress && (
            <>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Secondary Address (Boarding/Apartment)</Text>
              <View style={styles.googleSearchContainer}>
                <TextInput
                  style={[styles.textInput, { marginBottom: 0, backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
                  placeholder="Search apartment or boarding coordinates..."
                  placeholderTextColor={colors.subText}
                  value={secondAddress}
                  onChangeText={handleSecondAddressChange}
                />
                {secondSuggestions.length > 0 && (
                  <View style={[styles.suggestionsBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={styles.googlePoweredLabel}>Google Maps Autocomplete Predictions</Text>
                    {secondSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setSecondAddress(item.description);
                          setSecondLat(item.lat);
                          setSecondLng(item.lng);
                          setSecondSuggestions([]);
                        }}
                      >
                        <Text style={styles.pinIcon}>🏠</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
                          <Text style={[styles.coordsSub, { color: colors.subText }]}>Coordinates: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* Irregular student status */}
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Irregular Student Status</Text>
              <Text style={[styles.toggleSubText, { color: colors.subText }]}>Enable if taking courses outside curriculum year</Text>
            </View>
            <Switch
              value={isIrregular}
              onValueChange={setIsIrregular}
              trackColor={{ false: isDarkMode ? '#374151' : '#e5e7eb', true: '#F59E0B' }}
              thumbColor="#ffffff"
              style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setSignupStep(1)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.primaryBtn, { flex: 2, marginTop: 0 }]} onPress={handleSignupComplete} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Register Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // Render Signup Step 2: Professor Class Workload config (Course and Department)
  return (
    <ScrollView style={[styles.scrollStyle, { backgroundColor: colors.bg }]} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.backgroundSweep, isDarkMode && { backgroundColor: '#1e3a8a15', borderTopLeftRadius: 0 }]} />
      <View style={[styles.rightCircleBackground, isDarkMode && { backgroundColor: '#1e3a8a10' }]} />
      <DotGrid />
      <View style={styles.brandingHeader}>
        <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
        <Text style={[styles.brandingSubText, { color: colors.subText }]}>Semester Workload Setup</Text>
      </View>

      <View style={[styles.authCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.stepHeaderRow}>
          <Text style={[styles.cardHeading, { color: colors.text }]}>Professor Workload Config</Text>
          <Text style={styles.stepIndicatorLabel}>Step 2 of 2</Text>
        </View>
        
        <View style={[styles.infoLockNotice, isDarkMode && { backgroundColor: '#1e3a8a20', borderColor: '#1e3a8a40' }]}>
          <Text style={[styles.noticeTextBold, { color: colors.text }]}>ℹ️ Workload Signup Notice:</Text>
          <Text style={[styles.noticeText, { color: colors.text }]}>
            You are only required to configure at least **1 subject** for now to complete your signup process. 
            Any other semester courses can be easily added, edited, or rescheduled later in the **"Classes"** tab once you log in, so you can finish registration quickly.
          </Text>
        </View>

        {/* Existing Added Subjects List */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Added Subjects Workload ({profSubjects.length})</Text>
        {profSubjects.length === 0 ? (
          <Text style={[styles.emptySubjectsLabel, { color: colors.subText }]}>No subjects added yet. Configure at least 1 subject below.</Text>
        ) : (
          <View style={styles.subjectsAddedList}>
            {profSubjects.map(sub => (
              <View key={sub.id} style={[styles.subjectWorkloadCard, { backgroundColor: isDarkMode ? '#11182740' : '#ffffff', borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subWorkloadCode}>{sub.code}</Text>
                  <Text style={[styles.subWorkloadName, { color: colors.text }]}>{sub.name}</Text>
                  <Text style={[styles.subWorkloadMeta, { color: colors.subText }]}>{sub.department}  •  {formatAcademicSection(sub.code, sub.year, sub.section)}</Text>
                  <Text style={[styles.subWorkloadMeta, { color: colors.subText }]}>🕒 {sub.scheduleTime}</Text>
                </View>
                <TouchableOpacity style={styles.subWorkloadRemoveBtn} onPress={() => handleRemoveSubjectFromProfList(sub.id)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Subject builder form details (Includes Course and Department Dropdowns) */}
        <View style={[styles.subjectBuilderContainer, { backgroundColor: isDarkMode ? '#11182740' : '#f4f5f6', borderColor: colors.border }]}>
          <Text style={[styles.builderTitle, { color: colors.text }]}>➕ Configure New Subject</Text>
          
          <Text style={[styles.inputLabel, { color: colors.text }]}>Subject Name / Code</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. IT 204 (Mobile Application Development)"
            placeholderTextColor={colors.subText}
            value={newSubName}
            onChangeText={setNewSubName}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Subject Code Identifier (Abbreviation)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. IT 204"
            placeholderTextColor={colors.subText}
            value={newSubCode}
            onChangeText={setNewSubCode}
          />

          {/* Department Dropdown */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Department</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isSubDeptDropdownOpen && styles.dropdownTriggerActive]}
            onPress={() => {
              setIsSubDeptDropdownOpen(!isSubDeptDropdownOpen);
              setIsSubCourseDropdownOpen(false);
              setIsSubYearDropdownOpen(false);
              setIsSubSecDropdownOpen(false);
              setIsStartDropdownOpen(false);
              setIsEndDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newSubDepartment || 'Select Department...'}</Text>
            <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isSubDeptDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {isSubDeptDropdownOpen && (
            <View style={[styles.dropdownListInline, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[styles.dropdownItemInline, newSubDepartment === dept && styles.dropdownItemInlineActive]}
                  onPress={() => {
                    setNewSubDepartment(dept);
                    setIsSubDeptDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemTextInline, { color: colors.text }, newSubDepartment === dept && styles.dropdownTextActiveInline]}>{dept}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Course Dropdown */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Course (Program Handle)</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isSubCourseDropdownOpen && styles.dropdownTriggerActive]}
            onPress={() => {
              setIsSubCourseDropdownOpen(!isSubCourseDropdownOpen);
              setIsSubDeptDropdownOpen(false);
              setIsSubYearDropdownOpen(false);
              setIsSubSecDropdownOpen(false);
              setIsStartDropdownOpen(false);
              setIsEndDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newSubCourse || 'Select Course / Program...'}</Text>
            <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isSubCourseDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {isSubCourseDropdownOpen && (
            <View style={[styles.dropdownListInline, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {COURSES.map((crs) => (
                <TouchableOpacity
                  key={crs}
                  style={[styles.dropdownItemInline, newSubCourse === crs && styles.dropdownItemInlineActive]}
                  onPress={() => {
                    setNewSubCourse(crs);
                    setIsSubCourseDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemTextInline, { color: colors.text }, newSubCourse === crs && styles.dropdownTextActiveInline]}>{crs}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.formSplitRow}>
            {/* Subject Year Dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Year Level Group</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isSubYearDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsSubYearDropdownOpen(!isSubYearDropdownOpen);
                  setIsSubSecDropdownOpen(false);
                  setIsSubDeptDropdownOpen(false);
                  setIsSubCourseDropdownOpen(false);
                  setIsStartDropdownOpen(false);
                  setIsEndDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newSubYear || 'Select Year...'}</Text>
                <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isSubYearDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isSubYearDropdownOpen && (
                <View style={[styles.dropdownListInline, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  {YEAR_LEVELS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.dropdownItemInline, newSubYear === y && styles.dropdownItemInlineActive]}
                      onPress={() => {
                        setNewSubYear(y);
                        setIsSubYearDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemTextInline, { color: colors.text }, newSubYear === y && styles.dropdownTextActiveInline]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Subject Section Dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Section</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isSubSecDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsSubSecDropdownOpen(!isSubSecDropdownOpen);
                  setIsSubYearDropdownOpen(false);
                  setIsSubDeptDropdownOpen(false);
                  setIsSubCourseDropdownOpen(false);
                  setIsStartDropdownOpen(false);
                  setIsEndDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newSubSection || 'Select Sec...'}</Text>
                <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isSubSecDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isSubSecDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                    {SECTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.dropdownItemInline, newSubSection === s && styles.dropdownItemInlineActive]}
                        onPress={() => {
                          setNewSubSection(s);
                          setIsSubSecDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemTextInline, { color: colors.text }, newSubSection === s && styles.dropdownTextActiveInline]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Time pickers builders */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Weekly Schedule Time Range</Text>
          <View style={styles.formSplitRow}>
            {/* Start time dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.timeSubLabel, { color: colors.subText }]}>Start Time</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isStartDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsStartDropdownOpen(!isStartDropdownOpen);
                  setIsEndDropdownOpen(false);
                  setIsSubYearDropdownOpen(false);
                  setIsSubSecDropdownOpen(false);
                  setIsSubDeptDropdownOpen(false);
                  setIsSubCourseDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newSubStartTime}</Text>
                <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isStartDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isStartDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                    {TIME_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.dropdownItemInline, newSubStartTime === t && styles.dropdownItemInlineActive]}
                        onPress={() => {
                          setNewSubStartTime(t);
                          setIsStartDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemTextInline, { color: colors.text }, newSubStartTime === t && styles.dropdownTextActiveInline]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* End time dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.timeSubLabel, { color: colors.subText }]}>End Time</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { backgroundColor: isDarkMode ? '#111827' : '#ffffff', borderColor: colors.border }, isEndDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsEndDropdownOpen(!isEndDropdownOpen);
                  setIsStartDropdownOpen(false);
                  setIsSubYearDropdownOpen(false);
                  setIsSubSecDropdownOpen(false);
                  setIsSubDeptDropdownOpen(false);
                  setIsSubCourseDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newSubEndTime}</Text>
                <Text style={[styles.dropdownChevron, { color: colors.subText }]}>{isEndDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isEndDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                    {TIME_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.dropdownItemInline, newSubEndTime === t && styles.dropdownItemInlineActive]}
                        onPress={() => {
                          setNewSubEndTime(t);
                          setIsEndDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemTextInline, { color: colors.text }, newSubEndTime === t && styles.dropdownTextActiveInline]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={[styles.builderAddBtn, isDarkMode && { backgroundColor: '#1E5EFF20', borderColor: '#1E5EFF' }]} onPress={handleAddSubjectToProfList}>
            <Text style={styles.builderAddBtnText}>+ Add Subject to Semester List</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSignupStep(1)}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.primaryBtn, { flex: 2, marginTop: 0 }]} onPress={handleSignupComplete} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Register Workload</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: '#ECF2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandingLogoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E5EFF',
    letterSpacing: -1,
  },
  brandingLogoImage: {
    width: 140,
    height: 48,
    marginBottom: 8,
    alignSelf: 'center',
  },
  brandingSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepIndicatorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  infoLockNotice: {
    fontSize: 11,
    color: '#1E5EFF',
    backgroundColor: '#1E5EFF08',
    borderColor: '#1E5EFF30',
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
  },
  noticeTextBold: {
    fontWeight: '900',
    color: '#1E5EFF',
    fontSize: 11,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 10.5,
    color: '#444444',
    lineHeight: 15,
  },
  roleToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f5f6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  roleBtnTextActive: {
    color: '#111827',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    color: '#111827',
    fontSize: 13,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#1E5EFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  switchModeLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  switchModeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  switchModeAccent: {
    color: '#1E5EFF',
    fontWeight: '700',
  },
  formSplitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  // Address Google Suggestions styling
  googleSearchContainer: {
    position: 'relative',
    marginBottom: 12,
    zIndex: 99,
  },
  suggestionsBox: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    maxHeight: 180,
    overflow: 'hidden',
    zIndex: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  googlePoweredLabel: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f4f5f6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },
  pinIcon: {
    fontSize: 14,
  },
  suggestionText: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '700',
  },
  coordsSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  toggleSubText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
  // Custom dropdown styles
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 10,
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
  dropdownListInline: {
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: -4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItemInline: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemInlineActive: {
    backgroundColor: '#1E5EFF08',
  },
  dropdownItemTextInline: {
    fontSize: 12,
    color: '#111827',
  },
  dropdownTextActiveInline: {
    color: '#1E5EFF',
    fontWeight: '700',
  },
  // Professor workload builder specific styles
  wizardSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  emptySubjectsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  subjectsAddedList: {
    gap: 8,
    marginBottom: 16,
  },
  subjectWorkloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E5EFF05',
    borderColor: '#1E5EFF20',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  subWorkloadCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E5EFF',
  },
  subWorkloadName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  subWorkloadMeta: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  subWorkloadRemoveBtn: {
    padding: 8,
  },
  removeText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
  subjectBuilderContainer: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  builderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  timeSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  builderAddBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#1E5EFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  builderAddBtnText: {
    color: '#1E5EFF',
    fontWeight: '800',
    fontSize: 13,
  },
  // Background Motifs Styles
  backgroundSweep: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: '#ECF2FD',
    borderTopLeftRadius: 280,
    zIndex: -1,
  },
  rightCircleBackground: {
    position: 'absolute',
    top: 60,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EAF2FF',
    zIndex: -1,
  },
  dotGridContainer: {
    position: 'absolute',
    top: 140,
    left: 20,
    zIndex: -1,
    opacity: 0.5,
  },
  dotGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dotGridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  scrollStyle: {
    backgroundColor: '#ECF2FD',
  },
});
