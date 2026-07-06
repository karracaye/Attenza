const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite DB connection
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite Database connection error:', err);
  } else {
    console.log('Connected successfully to SQLite database at:', dbPath);
    initializeTables();
  }
});

// Setup Schema Tables
function initializeTables() {
  db.serialize(() => {
    // 1. Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        usernameId TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        password TEXT,
        role TEXT,
        profileRegistered INTEGER DEFAULT 0,
        year TEXT,
        section TEXT,
        isIrregular INTEGER DEFAULT 0,
        homeAddress TEXT,
        homeLatitude REAL,
        homeLongitude REAL,
        hasSecondAddress INTEGER DEFAULT 0,
        secondAddress TEXT,
        secondLatitude REAL,
        secondLongitude REAL,
        hardwareId TEXT
      )
    `);

    // 2. Professor Subjects table
    db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        professor_id TEXT,
        code TEXT,
        name TEXT,
        section TEXT,
        year TEXT,
        course TEXT,
        department TEXT,
        scheduleTime TEXT,
        originalScheduleTime TEXT
      )
    `);

    // 3. Active Sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        professor_id TEXT,
        subject_id TEXT,
        subject_code TEXT,
        subject_name TEXT,
        classroom_id TEXT,
        classroom_name TEXT,
        classroom_lat REAL,
        classroom_lng REAL,
        duration_seconds INTEGER,
        is_online INTEGER DEFAULT 0,
        created_at TEXT,
        expires_at TEXT,
        qr_code_payload TEXT
      )
    `);

    // 4. Roster Check-in logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        student_id TEXT,
        student_name TEXT,
        year TEXT,
        section TEXT,
        is_irregular INTEGER DEFAULT 0,
        status TEXT,
        timestamp TEXT,
        qr_verified INTEGER DEFAULT 0,
        selfie_verified INTEGER DEFAULT 0,
        gps_verified INTEGER DEFAULT 0,
        distance_meters REAL,
        latitude REAL,
        longitude REAL,
        is_remote_standpoint INTEGER DEFAULT 0,
        remote_location_name TEXT,
        remote_location_reason TEXT,
        excuse_reason TEXT,
        excuse_attachment_uri TEXT
      )
    `);

    // 5. Classrooms standpoints table
    db.run(`
      CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        name TEXT,
        latitude REAL,
        longitude REAL
      )
    `);

    // 6. Completed History Logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS history_logs (
        id TEXT PRIMARY KEY,
        professor_id TEXT,
        subject_code TEXT,
        subject_name TEXT,
        classroom_name TEXT,
        date TEXT,
        time TEXT,
        total_present INTEGER,
        is_online INTEGER DEFAULT 0,
        records_json TEXT
      )
    `);

    // 7. Pending Excuses table
    db.run(`
      CREATE TABLE IF NOT EXISTS pending_excuses (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        student_name TEXT,
        subject_code TEXT,
        date TEXT,
        timestamp TEXT,
        excuse_reason TEXT,
        excuse_attachment TEXT,
        excuse_attachment_uri TEXT,
        year TEXT,
        section TEXT,
        is_irregular INTEGER DEFAULT 0
      )
    `);

    // Seed default accounts & classrooms if tables are empty
    seedInitialData();
  });
}

function seedInitialData() {
  // Check if users empty
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      console.log('Seeding initial mock accounts...');
      // Student seed
      db.run(`
        INSERT INTO users (usernameId, email, name, password, role, profileRegistered, year, section, isIrregular, homeAddress, homeLatitude, homeLongitude)
        VALUES ('2024-0518', 'student@university.edu', 'Katrina Santillan', 'password123', 'student', 1, '3rd Year', 'Section B', 0, '123 Taft Avenue, Manila', 14.56841, 120.99182)
      `);
      // Professor seed
      db.run(`
        INSERT INTO users (usernameId, email, name, password, role, profileRegistered, year, section, isIrregular)
        VALUES ('prof1', 'professor@university.edu', 'Dr. Jane Smith', 'password123', 'professor', 1, 'N/A', 'N/A', 0)
      `);
    }
  });

  // Check if classrooms empty
  db.get("SELECT COUNT(*) as count FROM classrooms", (err, row) => {
    if (row && row.count === 0) {
      console.log('Seeding default campus classroom coordinates...');
      db.run("INSERT INTO classrooms (id, name, latitude, longitude) VALUES ('room1', 'Room 302 (College Building)', 14.59951, 120.98421)");
      db.run("INSERT INTO classrooms (id, name, latitude, longitude) VALUES ('room2', 'Information Technology Lab A', 14.59972, 120.98443)");
      db.run("INSERT INTO classrooms (id, name, latitude, longitude) VALUES ('room3', 'Engineering Lecture Hall II', 14.60010, 120.98390)");
    }
  });

  // Check if subjects empty
  db.get("SELECT COUNT(*) as count FROM subjects", (err, row) => {
    if (row && row.count === 0) {
      console.log('Seeding initial subjects list...');
      db.run(`
        INSERT INTO subjects (id, professor_id, code, name, section, year, course, department, scheduleTime, originalScheduleTime)
        VALUES ('sub1', 'prof1', 'CS 302', 'Software Engineering II', 'Section B', '3rd Year', 'CS', 'Computer Science Department', '07:00 AM - 09:00 AM', '07:00 AM - 09:00 AM')
      `);
      db.run(`
        INSERT INTO subjects (id, professor_id, code, name, section, year, course, department, scheduleTime, originalScheduleTime)
        VALUES ('sub2', 'prof1', 'IT 204', 'Mobile Application Development', 'Section B', '3rd Year', 'IT', 'Information Technology Department', '02:00 PM - 04:00 PM', '02:00 PM - 04:00 PM')
      `);
    }
  });

  // Check if history empty
  db.get("SELECT COUNT(*) as count FROM history_logs", (err, row) => {
    if (row && row.count === 0) {
      console.log('Seeding initial history logs database...');
      const defaultRecords = [
        {
          studentId: '2024-0518',
          studentName: 'Katrina Santillan',
          timestamp: '07:12 AM',
          selfieUri: '',
          latitude: 14.59951,
          longitude: 120.98421,
          distanceMeters: 2.4,
          qrVerified: true,
          selfieVerified: true,
          gpsVerified: true,
          verified: true,
          year: '3rd Year',
          section: 'Section B',
          isIrregular: false,
          status: 'PRESENT'
        }
      ];
      db.run(`
        INSERT INTO history_logs (id, professor_id, subject_code, subject_name, classroom_name, date, time, total_present, is_online, records_json)
        VALUES ('log_1', 'prof1', 'CS 302', 'CS 302 - Software Engineering II', 'Room 302 (College Building)', 'Jul 3, 2026', '07:00 AM - 09:00 AM', 1, 0, ?)
      `, [JSON.stringify(defaultRecords)]);
    }
  });
  // Check if excuses empty
  db.get("SELECT COUNT(*) as count FROM pending_excuses", (err, row) => {
    if (row && row.count === 0) {
      console.log('Seeding initial pending excuses database...');
      db.run(`
        INSERT INTO pending_excuses (id, student_id, student_name, subject_code, date, timestamp, excuse_reason, excuse_attachment, excuse_attachment_uri, year, section, is_irregular)
        VALUES ('ex-1', '2023-0149', 'Katrina Escoba', 'IT 204', 'Jul 3, 2026', '08:14 AM', 'Had a severe dental appointment extraction. Attached my clinical medical certificate.', 'medical_cert_katrina.jpg', '', '3rd Year', 'Section B', 0)
      `);
      db.run(`
        INSERT INTO pending_excuses (id, student_id, student_name, subject_code, date, timestamp, excuse_reason, excuse_attachment, excuse_attachment_uri, year, section, is_irregular)
        VALUES ('ex-2', '2022-9011', 'Julian Alvarez', 'CS 402', 'Jul 3, 2026', '08:25 AM', 'Representing the university in the national robotics league conference.', 'official_excuse_letter.pdf', '', '4th Year', 'Section A', 1)
      `);
    }
  });
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { usernameId, email, name, password, role, year, section, isIrregular, homeAddress, homeLatitude, homeLongitude, hasSecondAddress, secondAddress, secondLatitude, secondLongitude, hardwareId } = req.body;
  if (!usernameId || !email || !name || !password || !role) {
    return res.status(400).json({ error: 'Missing required credentials fields.' });
  }

  db.run(`
    INSERT INTO users (usernameId, email, name, password, role, profileRegistered, year, section, isIrregular, homeAddress, homeLatitude, homeLongitude, hasSecondAddress, secondAddress, secondLatitude, secondLongitude, hardwareId)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    usernameId, email, name, password, role, 
    year || 'N/A', section || 'N/A', isIrregular ? 1 : 0, 
    homeAddress || '', homeLatitude || 0, homeLongitude || 0,
    hasSecondAddress ? 1 : 0, secondAddress || '', secondLatitude || 0, secondLongitude || 0,
    hardwareId || ''
  ], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username ID or Email is already registered.' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    // Retrieve registered user
    db.get("SELECT * FROM users WHERE usernameId = ?", [usernameId], (err, user) => {
      if (user) {
        user.profileRegistered = !!user.profileRegistered;
        user.isIrregular = !!user.isIrregular;
        user.hasSecondAddress = !!user.hasSecondAddress;
        return res.status(201).json(user);
      }
      res.status(500).json({ error: 'User registration failed.' });
    });
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { usernameId, password } = req.body;
  if (!usernameId || !password) {
    return res.status(400).json({ error: 'Username ID and password are required.' });
  }

  db.get("SELECT * FROM users WHERE usernameId = ? OR email = ?", [usernameId, usernameId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid ID / Email or password.' });
    }

    user.profileRegistered = !!user.profileRegistered;
    user.isIrregular = !!user.isIrregular;
    user.hasSecondAddress = !!user.hasSecondAddress;
    res.json(user);
  });
});

// GET /api/user/profile/:usernameId
app.get('/api/user/profile/:usernameId', (req, res) => {
  db.get("SELECT * FROM users WHERE usernameId = ?", [req.params.usernameId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    user.profileRegistered = !!user.profileRegistered;
    user.isIrregular = !!user.isIrregular;
    user.hasSecondAddress = !!user.hasSecondAddress;
    res.json(user);
  });
});

// POST /api/user/update-profile
app.post('/api/user/update-profile', (req, res) => {
  const { usernameId, name, email, year, section, homeAddress, homeLatitude, homeLongitude, hasSecondAddress, secondAddress, secondLatitude, secondLongitude } = req.body;
  
  db.run(`
    UPDATE users 
    SET name = ?, email = ?, year = ?, section = ?, homeAddress = ?, homeLatitude = ?, homeLongitude = ?, hasSecondAddress = ?, secondAddress = ?, secondLatitude = ?, secondLongitude = ?
    WHERE usernameId = ?
  `, [
    name, email, year, section, homeAddress, homeLatitude, homeLongitude, 
    hasSecondAddress ? 1 : 0, secondAddress, secondLatitude, secondLongitude, 
    usernameId
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// POST /api/user/change-password
app.post('/api/user/change-password', (req, res) => {
  const { usernameId, newPassword } = req.body;
  db.run("UPDATE users SET password = ? WHERE usernameId = ?", [newPassword, usernameId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// GET /api/subjects/:profId
app.get('/api/subjects/:profId', (req, res) => {
  db.all("SELECT * FROM subjects WHERE professor_id = ?", [req.params.profId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/subjects/save
app.post('/api/subjects/save', (req, res) => {
  const { professorId, subjectsList } = req.body;
  
  db.serialize(() => {
    db.run("DELETE FROM subjects WHERE professor_id = ?", [professorId]);
    const stmt = db.prepare(`
      INSERT INTO subjects (id, professor_id, code, name, section, year, course, department, scheduleTime, originalScheduleTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    subjectsList.forEach(sub => {
      stmt.run(sub.id, professorId, sub.code, sub.name, sub.section, sub.year, sub.course, sub.department, sub.scheduleTime, sub.originalScheduleTime);
    });
    stmt.finalize();
    res.json({ success: true });
  });
});

// GET /api/classrooms
app.get('/api/classrooms', (req, res) => {
  db.all("SELECT * FROM classrooms", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/classrooms/add
app.post('/api/classrooms/add', (req, res) => {
  const { id, name, latitude, longitude } = req.body;
  db.run(`
    INSERT INTO classrooms (id, name, latitude, longitude)
    VALUES (?, ?, ?, ?)
  `, [id, name, latitude, longitude], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id, name, latitude, longitude });
  });
});

// GET /api/sessions/active
app.get('/api/sessions/active', (req, res) => {
  const now = new Date().toISOString();
  db.get("SELECT * FROM sessions WHERE expires_at > ? ORDER BY created_at DESC LIMIT 1", [now], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.json(null);
    }
    session.is_online = !!session.is_online;
    res.json(session);
  });
});

// POST /api/sessions/start
app.post('/api/sessions/start', (req, res) => {
  const { id, professorId, subjectId, subjectCode, subjectName, classroomId, classroomName, classroomLat, classroomLng, durationSeconds, isOnline, qrCodePayload } = req.body;
  
  const created_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + durationSeconds * 1000).toISOString();

  // Clear any existing active sessions first
  db.serialize(() => {
    db.run("DELETE FROM sessions");
    db.run(`
      INSERT INTO sessions (id, professor_id, subject_id, subject_code, subject_name, classroom_id, classroom_name, classroom_lat, classroom_lng, duration_seconds, is_online, created_at, expires_at, qr_code_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, professorId, subjectId, subjectCode, subjectName, 
      classroomId, classroomName, classroomLat, classroomLng, 
      durationSeconds, isOnline ? 1 : 0, created_at, expires_at, qrCodePayload
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id, expires_at, created_at });
    });
  });
});

// GET /api/sessions/records/:sessionId
app.get('/api/sessions/records/:sessionId', (req, res) => {
  db.all("SELECT * FROM records WHERE session_id = ?", [req.params.sessionId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    rows.forEach(r => {
      r.is_irregular = !!r.is_irregular;
      r.qr_verified = !!r.qr_verified;
      r.selfie_verified = !!r.selfie_verified;
      r.gps_verified = !!r.gps_verified;
      r.is_remote_standpoint = !!r.is_remote_standpoint;
    });
    res.json(rows);
  });
});

// POST /api/sessions/checkin
app.post('/api/sessions/checkin', (req, res) => {
  const { id, sessionId, studentId, studentName, year, section, isIrregular, status, timestamp, qrVerified, selfieVerified, gpsVerified, distanceMeters, latitude, longitude, isRemoteStandpoint, remoteLocationName, remoteLocationReason } = req.body;
  
  db.run(`
    INSERT OR REPLACE INTO records (id, session_id, student_id, student_name, year, section, is_irregular, status, timestamp, qr_verified, selfie_verified, gps_verified, distance_meters, latitude, longitude, is_remote_standpoint, remote_location_name, remote_location_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, sessionId, studentId, studentName, year, section, isIrregular ? 1 : 0, 
    status, timestamp, qrVerified ? 1 : 0, selfieVerified ? 1 : 0, gpsVerified ? 1 : 0, 
    distanceMeters, latitude, longitude, isRemoteStandpoint ? 1 : 0, 
    remoteLocationName || '', remoteLocationReason || ''
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// POST /api/sessions/excuse
app.post('/api/sessions/excuse', (req, res) => {
  const { id, sessionId, studentId, studentName, year, section, isIrregular, status, timestamp, excuseReason, excuseAttachmentUri } = req.body;
  
  db.run(`
    INSERT OR REPLACE INTO records (id, session_id, student_id, student_name, year, section, is_irregular, status, timestamp, excuse_reason, excuse_attachment_uri)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, sessionId, studentId, studentName, year, section, isIrregular ? 1 : 0, 
    status, timestamp, excuseReason, excuseAttachmentUri || ''
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// POST /api/sessions/end
app.post('/api/sessions/end', (req, res) => {
  const { sessionId } = req.body;
  db.run("DELETE FROM sessions WHERE id = ?", [sessionId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// GET /api/logs/history
app.get('/api/logs/history', (req, res) => {
  db.all("SELECT * FROM history_logs ORDER BY date DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const parsed = rows.map(r => ({
      id: r.id,
      professorId: r.professor_id,
      subjectCode: r.subject_code,
      subjectName: r.subject_name,
      classroomName: r.classroom_name,
      date: r.date,
      time: r.time,
      totalPresent: r.total_present,
      isOnline: !!r.is_online,
      records: JSON.parse(r.records_json || '[]')
    }));
    res.json(parsed);
  });
});

// POST /api/logs/save
app.post('/api/logs/save', (req, res) => {
  const { id, subjectCode, subjectName, classroomName, date, time, totalPresent, isOnline, records, professorId } = req.body;
  db.run(`
    INSERT OR REPLACE INTO history_logs (id, professor_id, subject_code, subject_name, classroom_name, date, time, total_present, is_online, records_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, professorId || 'prof1', subjectCode, subjectName, classroomName, date, time, totalPresent, isOnline ? 1 : 0, JSON.stringify(records || [])
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// GET /api/excuses/pending
app.get('/api/excuses/pending', (req, res) => {
  db.all("SELECT * FROM pending_excuses", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const parsed = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      subjectCode: r.subject_code,
      date: r.date,
      timestamp: r.timestamp,
      excuseReason: r.excuse_reason,
      excuseAttachment: r.excuse_attachment,
      excuseAttachmentUri: r.excuse_attachment_uri,
      year: r.year,
      section: r.section,
      isIrregular: !!r.is_irregular
    }));
    res.json(parsed);
  });
});

// POST /api/excuses/submit
app.post('/api/excuses/submit', (req, res) => {
  const { id, studentId, studentName, subjectCode, date, timestamp, excuseReason, excuseAttachment, excuseAttachmentUri, year, section, isIrregular } = req.body;
  const entryId = id || `ex-${Date.now()}`;
  db.run(`
    INSERT OR REPLACE INTO pending_excuses (id, student_id, student_name, subject_code, date, timestamp, excuse_reason, excuse_attachment, excuse_attachment_uri, year, section, is_irregular)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    entryId, studentId, studentName, subjectCode, date, timestamp, excuseReason, excuseAttachment || '', excuseAttachmentUri || '', year, section, isIrregular ? 1 : 0
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ success: true, id: entryId });
  });
});

// POST /api/excuses/action
app.post('/api/excuses/action', (req, res) => {
  const { id } = req.body;
  db.run("DELETE FROM pending_excuses WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Attenza REST API server is listening on port ${PORT}`);
  console.log(`Local link: http://localhost:${PORT}`);
});
