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
} from '../data/storage';

interface Props {
  onLoginSuccess: (user: UserAccount, role: 'professor' | 'student') => void;
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

export default function AuthScreen({ onLoginSuccess }: Props) {
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

  // Login handler
  const handleLoginSubmit = async () => {
    if (!usernameId.trim() || !password) {
      Alert.alert('Error', 'Please fill in all login credentials.');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      const accounts = await getUserAccounts();
      const match = accounts.find(
        (acc) =>
          acc.role === role &&
          (acc.usernameId.toLowerCase() === usernameId.trim().toLowerCase() ||
            acc.email.toLowerCase() === usernameId.trim().toLowerCase()) &&
          acc.password === password
      );

      if (match) {
        await saveCurrentUser(match);
        onLoginSuccess(match, role);
      } else {
        Alert.alert('Login Failed', 'Incorrect ID/Email or password. Please verify your role selection.');
      }
    }, 1000);
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
    setTimeout(async () => {
      setLoading(false);
      const accounts = await getUserAccounts();
      
      // Check if username/ID is taken
      const exists = accounts.some(acc => acc.usernameId.toLowerCase() === usernameId.trim().toLowerCase());
      if (exists) {
        Alert.alert('Error', 'This Username/ID is already registered.');
        return;
      }

      // Save user account credentials
      const newAccount: UserAccount = {
        name: name.trim(),
        usernameId: usernameId.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role,
        profileRegistered: true
      };

      await saveUserAccounts([...accounts, newAccount]);
      await saveCurrentUser(newAccount);

      if (role === 'student') {
        // Build and save locked student profile details
        const profile: StudentProfile = {
          studentId: usernameId.trim(),
          studentName: name.trim(),
          avatarColor: '#0066cc',
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
        await saveStudentProfile(profile);
      } else {
        // Save professor initial subjects list
        await saveProfessorSubjects(profSubjects);
      }

      Alert.alert('Registration Successful', `Welcome to Attenza, ${newAccount.name}!`);
      onLoginSuccess(newAccount, role);
    }, 1500);
  };

  // Render Login view
  if (authMode === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandingHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
          <Text style={styles.brandingSubText}>Secure Real-time Attendance Engine</Text>
        </View>

        <View style={styles.authCard}>
          <Text style={styles.cardHeading}>Sign In</Text>

          {/* Role Segmented Selector */}
          <View style={styles.roleToggleRow}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]} 
              onPress={() => setRole('student')}
            >
              <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'professor' && styles.roleBtnActive]} 
              onPress={() => setRole('professor')}
            >
              <Text style={[styles.roleBtnText, role === 'professor' && styles.roleBtnTextActive]}>Professor</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Username, ID Number, or Email</Text>
          <TextInput
            style={styles.textInput}
            placeholder={role === 'student' ? "e.g. 2024-0518" : "e.g. prof1"}
            placeholderTextColor="#86868b"
            autoCapitalize="none"
            value={usernameId}
            onChangeText={setUsernameId}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="••••••••"
            placeholderTextColor="#86868b"
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
            <Text style={styles.switchModeText}>Don't have an account? <Text style={styles.switchModeAccent}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Render Signup Step 1: Credentials
  if (signupStep === 1) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandingHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
          <Text style={styles.brandingSubText}>Create your secure account</Text>
        </View>

        <View style={styles.authCard}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.cardHeading}>Sign Up</Text>
            <Text style={styles.stepIndicatorLabel}>Step 1 of 2</Text>
          </View>

          {/* Role Segmented Selector */}
          <View style={styles.roleToggleRow}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]} 
              onPress={() => setRole('student')}
            >
              <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'professor' && styles.roleBtnActive]} 
              onPress={() => setRole('professor')}
            >
              <Text style={[styles.roleBtnText, role === 'professor' && styles.roleBtnTextActive]}>Professor</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Dr. Jane Smith"
            placeholderTextColor="#86868b"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>{role === 'student' ? 'Student ID Number' : 'Professor Username / ID'}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={role === 'student' ? "e.g. 2024-0518" : "e.g. prof1"}
            placeholderTextColor="#86868b"
            autoCapitalize="none"
            value={usernameId}
            onChangeText={setUsernameId}
          />

          <Text style={styles.inputLabel}>University Email Address</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. name@university.edu"
            placeholderTextColor="#86868b"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="••••••••"
            placeholderTextColor="#86868b"
            secureTextEntry={true}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignupNext}>
            <Text style={styles.primaryBtnText}>Next Step</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchModeLink} onPress={() => { setAuthMode('login'); setPassword(''); setUsernameId(''); }}>
            <Text style={styles.switchModeText}>Already have an account? <Text style={styles.switchModeAccent}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Render Signup Step 2: Student Profile Config
  if (role === 'student' && signupStep === 2) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandingHeader}>
          <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
          <Text style={styles.brandingSubText}>Complete Student Profile</Text>
        </View>

        <View style={styles.authCard}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.cardHeading}>Student Profile Setup</Text>
            <Text style={styles.stepIndicatorLabel}>Step 2 of 2</Text>
          </View>
          <Text style={styles.infoLockNotice}>⚠️ Note: Once registration is complete, student profile details and home addresses are strictly locked and cannot be edited.</Text>

          <View style={styles.formSplitRow}>
            {/* Year Group Selection */}
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Year Level</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isYearDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsYearDropdownOpen(!isYearDropdownOpen);
                  setIsSectionDropdownOpen(false);
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
                      <Text style={[styles.dropdownItemTextInline, yearGroup === y && styles.dropdownTextActiveInline]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Section Selection */}
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Section</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isSectionDropdownOpen && styles.dropdownTriggerActive]}
                onPress={() => {
                  setIsSectionDropdownOpen(!isSectionDropdownOpen);
                  setIsYearDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>{section || 'Select Sec...'}</Text>
                <Text style={styles.dropdownChevron}>{isSectionDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isSectionDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150 }]}>
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
                        <Text style={[styles.dropdownItemTextInline, section === s && styles.dropdownTextActiveInline]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Primary Home Address search */}
          <Text style={styles.inputLabel}>Primary Home Address</Text>
          <View style={styles.googleSearchContainer}>
            <TextInput
              style={[styles.textInput, { marginBottom: 0 }]}
              placeholder="Search Taft Avenue, UST, Katipunan..."
              placeholderTextColor="#86868b"
              value={homeAddress}
              onChangeText={handleHomeAddressChange}
            />
            {homeSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                <Text style={styles.googlePoweredLabel}>Google Maps Autocomplete Predictions</Text>
                {homeSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setHomeAddress(item.description);
                      setHomeLat(item.lat);
                      setHomeLng(item.lng);
                      setHomeSuggestions([]);
                    }}
                  >
                    <Text style={styles.pinIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionText}>{item.description}</Text>
                      <Text style={styles.coordsSub}>Coordinates: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Living in boarding house / apartment toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Living in a Boarding House / Apartment?</Text>
              <Text style={styles.toggleSubText}>Enable to register a second address for proximity calculations</Text>
            </View>
            <Switch
              value={hasSecondAddress}
              onValueChange={setHasSecondAddress}
              trackColor={{ false: '#e5e7eb', true: '#0066cc' }}
              thumbColor="#ffffff"
              style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
            />
          </View>

          {/* Second Address search (Boarding house / Apartment) */}
          {hasSecondAddress && (
            <>
              <Text style={styles.inputLabel}>Secondary Address (Boarding/Apartment)</Text>
              <View style={styles.googleSearchContainer}>
                <TextInput
                  style={[styles.textInput, { marginBottom: 0 }]}
                  placeholder="Search apartment or boarding coordinates..."
                  placeholderTextColor="#86868b"
                  value={secondAddress}
                  onChangeText={handleSecondAddressChange}
                />
                {secondSuggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    <Text style={styles.googlePoweredLabel}>Google Maps Autocomplete Predictions</Text>
                    {secondSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setSecondAddress(item.description);
                          setSecondLat(item.lat);
                          setSecondLng(item.lng);
                          setSecondSuggestions([]);
                        }}
                      >
                        <Text style={styles.pinIcon}>🏠</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionText}>{item.description}</Text>
                          <Text style={styles.coordsSub}>Coordinates: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* Irregular student status */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Irregular Student Status</Text>
              <Text style={styles.toggleSubText}>Enable if taking courses outside curriculum year</Text>
            </View>
            <Switch
              value={isIrregular}
              onValueChange={setIsIrregular}
              trackColor={{ false: '#e5e7eb', true: '#ff9500' }}
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.brandingHeader}>
        <Image source={require('../../assets/logo.png')} style={styles.brandingLogoImage} resizeMode="contain" />
        <Text style={styles.brandingSubText}>Semester Workload Setup</Text>
      </View>

      <View style={styles.authCard}>
        <View style={styles.stepHeaderRow}>
          <Text style={styles.cardHeading}>Professor Workload Config</Text>
          <Text style={styles.stepIndicatorLabel}>Step 2 of 2</Text>
        </View>
        
        <View style={styles.infoLockNotice}>
          <Text style={styles.noticeTextBold}>ℹ️ Workload Signup Notice:</Text>
          <Text style={styles.noticeText}>
            You are only required to configure at least **1 subject** for now to complete your signup process. 
            Any other semester courses can be easily added, edited, or rescheduled later in the **"Classes"** tab once you log in, so you can finish registration quickly.
          </Text>
        </View>

        {/* Existing Added Subjects List */}
        <Text style={styles.sectionHeader}>Added Subjects Workload ({profSubjects.length})</Text>
        {profSubjects.length === 0 ? (
          <Text style={styles.emptySubjectsLabel}>No subjects added yet. Configure at least 1 subject below.</Text>
        ) : (
          <View style={styles.subjectsAddedList}>
            {profSubjects.map(sub => (
              <View key={sub.id} style={styles.subjectWorkloadCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subWorkloadCode}>{sub.code}</Text>
                  <Text style={styles.subWorkloadName}>{sub.name}</Text>
                  <Text style={styles.subWorkloadMeta}>{sub.department}  •  {sub.course}  •  {sub.year} ({sub.section})</Text>
                  <Text style={styles.subWorkloadMeta}>🕒 {sub.scheduleTime}</Text>
                </View>
                <TouchableOpacity style={styles.subWorkloadRemoveBtn} onPress={() => handleRemoveSubjectFromProfList(sub.id)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Subject builder form details (Includes Course and Department Dropdowns) */}
        <View style={styles.subjectBuilderContainer}>
          <Text style={styles.builderTitle}>➕ Configure New Subject</Text>
          
          <Text style={styles.inputLabel}>Subject Name / Code</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. IT 204 (Mobile Application Development)"
            placeholderTextColor="#86868b"
            value={newSubName}
            onChangeText={setNewSubName}
          />

          <Text style={styles.inputLabel}>Subject Code Identifier (Abbreviation)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. IT 204"
            placeholderTextColor="#86868b"
            value={newSubCode}
            onChangeText={setNewSubCode}
          />

          {/* Department Dropdown */}
          <Text style={styles.inputLabel}>Department</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, isSubDeptDropdownOpen && styles.dropdownTriggerActive]}
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
            <Text style={styles.dropdownTriggerText}>{newSubDepartment || 'Select Department...'}</Text>
            <Text style={styles.dropdownChevron}>{isSubDeptDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {isSubDeptDropdownOpen && (
            <View style={styles.dropdownListInline}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[styles.dropdownItemInline, newSubDepartment === dept && styles.dropdownItemInlineActive]}
                  onPress={() => {
                    setNewSubDepartment(dept);
                    setIsSubDeptDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemTextInline, newSubDepartment === dept && styles.dropdownTextActiveInline]}>{dept}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Course Dropdown */}
          <Text style={styles.inputLabel}>Course (Program Handle)</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, isSubCourseDropdownOpen && styles.dropdownTriggerActive]}
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
            <Text style={styles.dropdownTriggerText}>{newSubCourse || 'Select Course / Program...'}</Text>
            <Text style={styles.dropdownChevron}>{isSubCourseDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {isSubCourseDropdownOpen && (
            <View style={styles.dropdownListInline}>
              {COURSES.map((crs) => (
                <TouchableOpacity
                  key={crs}
                  style={[styles.dropdownItemInline, newSubCourse === crs && styles.dropdownItemInlineActive]}
                  onPress={() => {
                    setNewSubCourse(crs);
                    setIsSubCourseDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemTextInline, newSubCourse === crs && styles.dropdownTextActiveInline]}>{crs}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.formSplitRow}>
            {/* Subject Year Dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Year Level Group</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isSubYearDropdownOpen && styles.dropdownTriggerActive]}
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
                <Text style={styles.dropdownTriggerText}>{newSubYear || 'Select Year...'}</Text>
                <Text style={styles.dropdownChevron}>{isSubYearDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isSubYearDropdownOpen && (
                <View style={styles.dropdownListInline}>
                  {YEAR_LEVELS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.dropdownItemInline, newSubYear === y && styles.dropdownItemInlineActive]}
                      onPress={() => {
                        setNewSubYear(y);
                        setIsSubYearDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemTextInline, newSubYear === y && styles.dropdownTextActiveInline]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Subject Section Dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Section</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isSubSecDropdownOpen && styles.dropdownTriggerActive]}
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
                <Text style={styles.dropdownTriggerText}>{newSubSection || 'Select Sec...'}</Text>
                <Text style={styles.dropdownChevron}>{isSubSecDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isSubSecDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150 }]}>
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
                        <Text style={[styles.dropdownItemTextInline, newSubSection === s && styles.dropdownTextActiveInline]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Time pickers builders */}
          <Text style={styles.inputLabel}>Weekly Schedule Time Range</Text>
          <View style={styles.formSplitRow}>
            {/* Start time dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={styles.timeSubLabel}>Start Time</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isStartDropdownOpen && styles.dropdownTriggerActive]}
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
                <Text style={styles.dropdownTriggerText}>{newSubStartTime}</Text>
                <Text style={styles.dropdownChevron}>{isStartDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isStartDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150 }]}>
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
                        <Text style={[styles.dropdownItemTextInline, newSubStartTime === t && styles.dropdownTextActiveInline]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* End time dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={styles.timeSubLabel}>End Time</Text>
              <TouchableOpacity
                style={[styles.dropdownTrigger, isEndDropdownOpen && styles.dropdownTriggerActive]}
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
                <Text style={styles.dropdownTriggerText}>{newSubEndTime}</Text>
                <Text style={styles.dropdownChevron}>{isEndDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isEndDropdownOpen && (
                <View style={[styles.dropdownListInline, { maxHeight: 150 }]}>
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
                        <Text style={[styles.dropdownItemTextInline, newSubEndTime === t && styles.dropdownTextActiveInline]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.builderAddBtn} onPress={handleAddSubjectToProfList}>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: '#ffffff',
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
    color: '#0066cc',
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
    color: '#86868b',
    marginTop: 4,
    fontWeight: '600',
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
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
    color: '#1d1d1f',
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
    color: '#86868b',
    textTransform: 'uppercase',
  },
  infoLockNotice: {
    fontSize: 11,
    color: '#0066cc',
    backgroundColor: '#0066cc08',
    borderColor: '#0066cc30',
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
  },
  noticeTextBold: {
    fontWeight: '900',
    color: '#0066cc',
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
    color: '#86868b',
  },
  roleBtnTextActive: {
    color: '#1d1d1f',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 12,
    color: '#1d1d1f',
    fontSize: 13,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#0066cc',
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
    color: '#86868b',
  },
  switchModeAccent: {
    color: '#0066cc',
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
    borderColor: '#eaeaea',
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
    color: '#86868b',
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f4f5f6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eaeaea',
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f4f4f4',
    alignItems: 'center',
    gap: 8,
  },
  pinIcon: {
    fontSize: 14,
  },
  suggestionText: {
    fontSize: 11,
    color: '#1d1d1f',
    fontWeight: '700',
  },
  coordsSub: {
    fontSize: 9,
    color: '#86868b',
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
    borderColor: '#eaeaea',
    borderRadius: 8,
    padding: 12,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d1d1f',
  },
  toggleSubText: {
    fontSize: 9,
    color: '#86868b',
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
    borderColor: '#eaeaea',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#1d1d1f',
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
  // Professor workload builder specific styles
  wizardSubText: {
    fontSize: 12,
    color: '#86868b',
    marginBottom: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  emptySubjectsLabel: {
    fontSize: 12,
    color: '#86868b',
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
    backgroundColor: '#0066cc05',
    borderColor: '#0066cc20',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  subWorkloadCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0066cc',
  },
  subWorkloadName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d1d1f',
    marginTop: 2,
  },
  subWorkloadMeta: {
    fontSize: 10,
    color: '#86868b',
    marginTop: 4,
  },
  subWorkloadRemoveBtn: {
    padding: 8,
  },
  removeText: {
    color: '#ff3b30',
    fontWeight: 'bold',
    fontSize: 13,
  },
  subjectBuilderContainer: {
    backgroundColor: '#f4f5f6',
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  builderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1d1d1f',
    marginBottom: 12,
  },
  timeSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86868b',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  builderAddBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  builderAddBtnText: {
    color: '#0066cc',
    fontWeight: '800',
    fontSize: 13,
  },
});
