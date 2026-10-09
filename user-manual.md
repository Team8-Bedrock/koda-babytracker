# Koda: Baby Tracker – User Manual
**Version:** 1.0  
**App Build:** 2.1  
**Team Name:** Team Bedrock (Team 8)  
**Date:** 10/09/2026 

---

## 1. Introduction
Koda is an intuitive, multi-user mobile application designed to help parents and caregivers record and analyze an infant's daily activities which can include feedings, sleep schedules, diaper changes, and mood updates. Built with offline-first capabilities and Tamagotchi-inspired virtual animal avatars, Koda simplifies multi-caregiver coordination while generating AI-driven behavioral insights and HIPAA-compliant PDF summaries for healthcare professionals.

---

## 2. System Requirements
- **Hardware:** 
  - Mobile or desktop device (iOS, Android, macOS, or Windows)
  - Minimum 2GB RAM
  - Touchscreen recommended for mobile navigation (supports tap and swipe gestures)
- **Software:** 
  - Modern web browser (Google Chrome, Apple Safari, or Microsoft Edge)
  - iOS 14.0+ or Android 10.0+ (if installed as a Progressive Web App)
- **Other Dependencies:** 
  - Internet connection required for initial sign-up, syncing across multi-user caregiver devices, and exporting PDF health reports. Note that all  core activity logging works entirely offline. 

---

## 3. Installation Guide
* **Web & Mobile Progressive Web App (PWA):** No traditional installation required.
  1. Access the application directly via your browser at `https://koda-app-8f5h.onrender.com`.
  2. *(Optional for Mobile)* Tap your browser's **Share** or **Menu** button and select **"Add to Home Screen"** to install Koda as a native-feeling app on iOS or Android smartphones.

---

## 4. Getting Started
1. **Launching the App:** Open your web browser or tap the **Koda** icon on your device's home screen.
2. **Select Account Type:** On the welcome screen, choose whether you are joining as a **Parent** (Primary Admin) or a **Caregiver**.
3. **Account Creation:**
   - **Parents:** Enter your name, email, and password. Next, create your child's profile by selecting a virtual animal character/avatar, assigning a habitat background, and entering your child's name and date of birth.
   - **Caregivers:** Enter your name, email, and password. Once logged in, navigate toward the settings and open up the linking to parent account. Enter the unique invite code provided by the primary parent to link directly to the child's account. Wait for approval. 
4. **First Navigation:** Once signed in, you will be directed to the main **Habitat Dashboard**, displaying your child's live status animation and current daily activity summaries.

---

## 5. Features & Functions

### Feature 1: Multi-Child Logging
**Description:**  
Allows parents and caregivers to record core baby activities—including feedings (breast, bottle, or solids), sleep durations, diaper changes, and mood updates, for multiple children independently under a single account. The interface includes an automated Dark Mode theme for nighttime data entry without waking the infant.

**How to Use:**
1. Select the child's profile you would like to log for from the top header drop-down menu on the **Habitat Dashboard**.
2. Tap the **+ (Log)** icon on the bottom navigation bar to open the activity selection menu.
3. Choose the activity category you wish to log (**Feeding**, **Sleeping**, **Diaper Change**, or **Mood**).
4. Enter the required activity details.
5. Tap **Submit** to save the entry.
6. *(Optional)* Toggle **Dark Mode** In the settings page for a low-light environment.


### Feature 2: Offline-First Synchronization
**Description:**  
Ensures full application functionality even without an active internet connection or cellular data. Activity entries created while offline are saved locally on the device and automatically synchronized with the central database and linked caregiver devices once connectivity is restored.

**How to Use:**
1. Open the app and log baby activities as usual while in areas with limited or no internet connection (e.g., waiting rooms or travel).
2. The app will save entries to local storage and display a pending sync status indicator.
3. Once your device reconnects to Wi-Fi or cellular data, the **Sync Manager** will automatically upload local logs and merge changes across linked devices in the background.


### Feature 3: AI Anomaly Detection and Analysis
**Description:**  
Utilizes an embedded AI engine to analyze at least one week of structured activity data, identifying routine deviations, behavioral shifts, and potential health patterns (such as irregular sleep cycles or missed feedings). Alerts are dispatched to primary parents while maintaining clear legal disclaimers that insights do not substitute for medical advice.

**How to Use:**
1. Maintain consistent daily logs for at least 7 days to establish your child's baseline routine.
2. Tap the **Analytics (Chart)** icon on the bottom navigation bar (Parent access only).
3. View the **Status Evaluation** panel and graphical summaries to review identified behavioral trends or routine changes.
4. If an irregular pattern is detected, review the notification alert on your dashboard for recommended topics to discuss with your pediatrician.


### Feature 4: HIPAA-Compliant Report and Exporting PDF
**Description:**  
Compiles raw activity logs, visual trend charts, and AI summaries into a professionally formatted, encrypted PDF report. Designed specifically to adhere to HIPAA technical safeguards, allowing parents to securely share verified child health data with pediatricians and medical providers.

**How to Use:**
1. Tap the **Analytics** icon on the bottom navigation bar or access **Log History** from the dashboard.
2. Select the desired date range for the report (e.g., daily, weekly, or custom date range).
3. Scroll to the bottom of the screen and tap **Share/Export PDF**.
4. Save the client-side encrypted PDF to your device or share it directly with your pediatrician via secure channels.


### Feature 5: Multi-User Access and Management
**Description:**  
Enables Primary Parent account admins to grant, manage, or revoke access for secondary caregivers (such as nannies, babysitters, and extended family). Includes role-based permission controls and a secure in-app messaging feature for direct communication between parents and active caregivers.

**How to Use:**
1. Navigate to **Settings > Caregiver Settings** (Parent access only).
2. Tap **Send an Invite** to generate a link or invite code for a nanny or secondary caregiver.
3. Toggle individual permissions to grant or restrict specific privileges (e.g., enabling/disabling Chat Access or Logging Access).
4. To communicate with linked caregivers, tap the **Chat** icon on the bottom navigation bar to open the encrypted family messaging room.


### Feature 6: Duplicate Entries Detection
**Description:**  
Monitors incoming activity logs across all linked parent and caregiver accounts in real time. If a log matches an existing entry for the same child and activity type within a 15-minute window, an interactive pop-up dialog triggers to prevent redundant database records.

**How to Use:**
1. When submitting an activity log that closely matches a recently saved log, the **"Duplicate Log Detected"** overlay will automatically pop up.
2. Review the pop-up modal to see who created the original entry, the activity type, and the exact timestamp.
3. Tap **Keep / Confirm** if the new entry was intentional and you wish to save it anyway.
4. Tap **Cancel Log / Discard** to discard the entry and keep your activity history clean.

---

## 6. Troubleshooting Examples

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Activity logs are not syncing between Parent and Caregiver** | Device is offline or experiencing unstable network connection. | Koda stores data locally while offline. Reconnect to Wi-Fi or cellular data; the Sync Manager will automatically merge saved logs. |
| **Caregiver cannot access child profile** | Caregiver account is unverified or the invite code has expired. | Ask the Primary Parent to navigate to **Settings > Caregiver Settings** to resend a valid invite code or check the access status. |
| **Duplicate entry warning appears for a valid separate log** | Two similar activities were recorded within the 15-minute safety window. | Tap **"Keep"** on the duplicate confirmation modal to force-save the second entry. |
| **Cannot view Analytics or Export PDF** | Account is signed in under a Caregiver role instead of Primary Parent Admin. | Log out and sign back in using the Primary Parent credentials. Caregiver accounts do not have permission to view full medical analytics or export reports. |

---

## 7. Contact Information
- **Support Email:** kodababytracker@gmail.com
- **Website:** https://koda-app-8f5h.onrender.com
- **Project Repository:** https://github.com/Team8-Bedrock/koda-babytracker
- **Other Support Channels:** TBD

---

## 8. FAQ

**Q: Is Koda safe to use offline during travel or outages?**  
**A:** Yes! Koda uses an offline-first architecture. You can log all baby activities without Wi-Fi or cellular service. All data is saved securely on your local device and will automatically sync to the cloud once a network connection is re-established.

**Q: Can I manage tracking for twins or multiple infants on one account?**  
**A:** Absolutely. Tap the child drop-down menu on the top header of your dashboard to switch between child profiles or create a new profile with its own unique avatar and logs.

**Q: Are the AI insights considered medical advice?**  
**A:** No. AI anomaly detection is designed strictly to help parents track behavioral trends and spot routine changes. Koda’s insights are not clinical advice. Always consult your pediatrician or healthcare professional for a proper medical evaluation.