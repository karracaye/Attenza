# Attenza 🚀

Attenza is an ultra-modern, Discord- and Reddit-inspired mobile application built with **React Native (TypeScript)** and **Expo**. It is designed exclusively for a single IT/CS department to connect students, staff, and organizers in one unified, database-free environment utilizing local AsyncStorage persistence.

## 📱 Features

1. **📢 Official Announcements:** Verified department broadcasts with verified author roles and pin states.
2. **💬 Discord-style Chat:** Real-time channels (`#chat-general`, `#chat-programming`, `#chat-random`) with native-feeling bubble layouts and profile badges.
3. **❓ Reddit-style Q&A:** A forum for programming questions featuring tag filters, upvote/downvote tallies, threaded comment replies, and monospace formatting for code blocks.
4. **📝 CS Cheat Sheets:** Searchable quick-reference cards with syntax highlights for Git, SQL, Python, and more.
5. **🔍 Lost & Found:** A status-tracked dashboard (Active/Resolved) with categories for Lost vs Found, contact details, and locations.
6. **💼 Internships Board:** Curated, filterable IT internship postings with requirements lists and direct application redirects.
7. **📅 Events Calendar:** Department workshops, hackathons, and guest seminars with calendar timelines and active **RSVP counters**.
8. **🕵️ Anonymous Posting:** Global anonymous toggles on Chat messages, Q&A threads, and Lost & Found reports. When activated, the app dynamically generates a fun, IT-themed pseudonym (e.g. `PixelHacker`, `BinaryWizard`, `CyberGhost`).

---

## 🛠️ Project Structure

```
CampusConnect/
├── App.tsx                   # Central driver (layout, navigation drawer, state sync)
├── src/
│   ├── data/
│   │   ├── mockData.ts       # Realistic initial datasets & interfaces
│   │   └── storage.ts        # AsyncStorage wrappers for data load/save & pseudonyms
│   └── screens/
│       ├── AnnouncementsScreen.tsx
│       ├── ChatScreen.tsx
│       ├── ForumsScreen.tsx
│       ├── CheatSheetsScreen.tsx
│       ├── LostFoundScreen.tsx
│       ├── InternshipsScreen.tsx
│       └── EventsScreen.tsx
├── package.json
└── tsconfig.json
```

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

## 🎨 Styling & Design Aesthetics
* **Theme:** Discord Dark Slate (`#313338`) combined with Reddit Dark Card styling (`#1a1a1b`).
* **Accents:** Neon Indigo (`#5865f2`) for Discord-themed views, Reddit Coral (`#ff4500`) for Q&A nodes, and Cyan (`#00b0f4`) for technical categories.
* **Layout:** Built responsively. If run on a desktop web browser or tablet, it renders a split-pane sidebar on the left and content on the right. If run on a phone screen, it displays a slide-out drawer menu.
