# Attenza 🚀

Attenza is a modern, AI-powered attendance management system designed for universities to simplify and automate classroom attendance. Instead of traditional roll calls, students verify their attendance by taking a real-time selfie within the classroom. The system uses facial verification, GPS location validation, and timestamp recording to ensure secure and accurate attendance.

Built with a clean, user-friendly interface, Attenza provides students with an easy way to check in while giving professors powerful tools to monitor attendance, view reports, and manage classes efficiently.

## 📱 Features

📸 Real-time selfie attendance
📍 GPS location verification
🕒 Automatic date and time recording
👤 Face verification for identity confirmation
👨‍🏫 Professor dashboard for attendance management
👨‍🎓 Student attendance history
📊 Attendance analytics and reports
🔔 Notifications and attendance reminders
📱 Responsive and modern user interface
🔒 Secure authentication and user management

---

## Goals
Attenza aims to eliminate manual attendance tracking, reduce fraudulent check-ins, and provide a faster, smarter, and more reliable attendance experience for both students and faculty.

---

## 🚀 How to Run the App

This is a mobile app project. You can run it on your physical phone (using Expo Go) or on local emulator simulators.

### 1. Prerequisites
Make sure you have Node.js installed on your machine.

### 2. Install Dependencies
Run the following command inside the `CampusConnect` project directory to install all packages:
```bash
npm install
```

### 3. Run on iOS or Android (Via Expo Go)
1. Install the **Expo Go** app on your physical iPhone (App Store) or Android device (Google Play Store).
2. Start the Metro bundler:
   ```bash
   npm run start
   ```
3. A large QR code will display in your terminal.
4. **iOS:** Scan the QR code using your phone's native Camera app.
5. **Android:** Scan the QR code using the Expo Go app.

### 4. Run on Simulators
If you have Xcode (Mac) or Android Studio (Mac/Windows/Linux) installed with emulators configured:
* For iOS Simulator: `npm run ios`
* For Android Emulator: `npm run android`

### 5. Run on Web (Browser Preview)
To preview the app layout inside a standard desktop web browser:
```bash
npm run web
```
*Navigates to `http://localhost:8081` in your browser.*

---

* **Layout:** Built responsively. If run on a desktop web browser or tablet, it renders a split-pane sidebar on the left and content on the right. If run on a phone screen, it displays a slide-out drawer menu.
