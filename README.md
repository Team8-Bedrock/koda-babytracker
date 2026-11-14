![Status](https://img.shields.io/badge/Status-In--Development-green?style=flat-square)
# Koda 
**Baby Tracker**

An offline-first, mobile-friendly app that uses AI-driven analytics and HIPAA-compliant reporting to help multiple caregivers track and coordinate infant health activities.

---

## Live Demos

---

## Technical Stack



---

## How It Works


---


---

## Key Features

  
---

## Technical Highlights



---

## The "Why"


## Security and data storage

- Activity requests use authenticated API routes, and passwords are stored as bcrypt hashes. These controls do not by themselves establish HIPAA compliance.
- Encryption at rest for production MongoDB data is a database-provider setting, not something this repository enables or verifies. Before claiming it is enabled, confirm the production cluster and its backups/snapshots are encrypted in the provider account. Store `MONGO_URI` in the hosting provider's secret manager, use TLS, restrict database network access, and use a least-privilege database account.
- Offline activities are stored in browser IndexedDB through LocalForage without application-level encryption. MongoDB provider encryption does not protect data on a device. Do not describe this application as end-to-end encrypted; device storage protection depends on the device and browser profile.
- The client tests cover queue retention and sync response handling. They do not constitute database integration tests or verify provider encryption settings.
