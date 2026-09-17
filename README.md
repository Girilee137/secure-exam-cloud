# Secure Exam Cloud

Secure examination paper management and controlled release platform.

## Stack

- Backend: Java 21, Spring Boot 4, Firebase Admin SDK, Firestore
- Frontend: React, Vite, Tailwind CSS, Firebase Web Auth
- Deploy: Render backend, Vercel frontend, Firebase Auth/Firestore

## Local Setup

### Firebase

Create a Firebase project with Phone Authentication and Firestore enabled.

Create a service account JSON and set one of:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

or:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\service-account.json'
```

### Backend

```powershell
cd backend
$env:APP_CORS_ALLOWED_ORIGINS='http://localhost:5173'
$env:KEY_SHARE_WRAP_SECRET='replace-with-32-byte-minimum-secret'
$env:FIRST_ADMIN_UID='firebase-uid-to-bootstrap-as-admin'
mvn spring-boot:run
```

The API runs on `http://localhost:8080`.

### Frontend

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Then run:

```powershell
cd frontend
npm install
npm run dev
```

## Security Model

- Firebase phone OTP authenticates users.
- Backend verifies Firebase ID tokens on every API request.
- Roles are loaded from Firestore, never trusted from the browser.
- Papers are generated server-side from active question-bank records.
- Paper payloads are encrypted with AES-256-GCM.
- The 256-bit content key is split with real 2-of-3 Shamir secret sharing.
- Shares are individually AES-GCM wrapped with `KEY_SHARE_WRAP_SECRET`.
- Release requires at least two distinct approved share holders.
- Students cannot retrieve plaintext papers before scheduled release.
- Plaintext papers and content keys are not persisted.

## Firestore Collections

`users`, `subjects`, `questions`, `exams`, `examPapers`, `keyShares`,
`examAssignments`, `submissions`, `auditLogs`, `systemSettings`.

