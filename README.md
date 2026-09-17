# Secure Exam Cloud

Secure Exam Cloud is a role-based web application for secure examination paper management. It supports teachers creating question banks and exams, encrypted question-paper locking, two-party release authorization using Shamir 2-of-3 key sharing, and student exam access during the active exam window.

## Technologies Used

- Backend: Java 21, Spring Boot 4, Firebase Admin SDK, Google Firestore
- Frontend: React, Vite, Tailwind CSS, Firebase Web Auth
- Security: Firebase ID token verification, Spring Security roles, AES-256-GCM encryption, Shamir secret sharing
- Deployment targets: Render for backend, Vercel for frontend, Firebase Auth/Firestore for identity and data

## Project Structure

```text
cloud_project/
  backend/
    src/main/java/com/secureexam/
      config/       Spring, Firebase, CORS, Jackson, and scheduler configuration
      security/     Firebase authentication filter and authenticated user model
      service/      Firestore access, encryption, audit, and exam workflow logic
      web/          REST controllers and request/exception models
    src/main/resources/
      application.yml
    pom.xml
  frontend/
    src/
      api.js        Authenticated API helper for backend requests
      firebase.js   Firebase Web Auth setup
      main.jsx      React application, role dashboards, and forms
      styles.css    Tailwind and app styling
    package.json
  render.yaml
  README.md
```

## Main Modules

- Authentication: Firebase signs in users, then the backend verifies each Firebase ID token.
- Role portals: Student, Teacher, Exam Controller, and Admin dashboards show separate workflows.
- Question bank: Teachers and admins create subjects and active multiple-choice questions.
- Exam management: Teachers configure exams, select subjects, set time windows, and lock papers.
- Secure release: Teacher, Exam Controller, and Admin key shares require at least two distinct approvals.
- Student workflow: Students open assigned active exams and submit answers once.
- Audit logs: Important actions such as paper locking, share approval, release, and submission are recorded.

## Local Setup

### Prerequisites

- Java 21
- Maven
- Node.js and npm
- Firebase project with Email/Password Authentication enabled
- Firestore database enabled
- Firebase service account JSON for the backend

### Firebase Backend Credentials

Create `backend/.env` from `backend/.env.example`:

```env
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GOOGLE_APPLICATION_CREDENTIALS=C:\path\firebase-service-account.json
KEY_SHARE_WRAP_SECRET=replace-with-at-least-32-characters
FIRST_ADMIN_UID=replace-with-initial-firebase-admin-uid
```

Use either `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`. The `KEY_SHARE_WRAP_SECRET` value must be at least 32 characters.

### Frontend Environment

Create `frontend/.env.local` from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_FIREBASE_API_KEY=replace-me
VITE_FIREBASE_AUTH_DOMAIN=replace-me.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=replace-me
VITE_FIREBASE_APP_ID=replace-me
```

## Install and Run

### Backend

```powershell
cd backend
mvn spring-boot:run
```

The backend API runs at:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/api/health
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

If Vite prints a different local URL, open the URL shown in the terminal.

## Sample Input and Output
<img width="1875" height="814" alt="image" src="https://github.com/user-attachments/assets/5a355e79-89a7-4154-84cf-effdf76f3b62" />


### Register User

Sample request body sent to `POST /api/auth/register` after Firebase login:

```json
{
  "displayName": "Jane",
  "role": "TEACHER"
}
```

Sample response:

```json
{
  "uid": "firebase-user-id",
  "email": "jane@gmail.com",
  "phoneNumber": "",
  "displayName": "Jane",
  "role": "TEACHER",
  "status": "ACTIVE"
}
```

### Create Subject

Sample request body sent to `POST /api/subjects`:

```json
{
  "name": "Science",
  "code": "SCIENC"
}
```

Sample response:

```json
{
  "subjectId": "generated-subject-id",
  "name": "Science",
  "code": "SCIENC",
  "active": true
}
```

### Add Question

Sample request body sent to `POST /api/questions`:

```json
{
  "subjectId": "generated-subject-id",
  "questionText": "What is 2 + 2?",
  "options": ["1", "2", "3", "4"],
  "correctAnswer": 3,
  "marks": 1,
  "difficulty": "EASY",
  "topic": "Arithmetic"
}
```

Sample response:

```json
{
  "questionId": "generated-question-id",
  "subjectId": "generated-subject-id",
  "questionText": "What is 2 + 2?",
  "options": ["1", "2", "3", "4"],
  "correctAnswer": 3,
  "marks": 1,
  "difficulty": "EASY",
  "topic": "Arithmetic",
  "active": true
}
```

### Health Check

Sample response from `GET /api/health`:

```json
{
  "status": "UP",
  "time": "2026-09-18T00:00:00Z"
}
```

## Firestore Collections

The application uses these Firestore collections:

```text
users
subjects
questions
exams
examPapers
keyShares
examAssignments
submissions
auditLogs
systemSettings
```

## Security Model

- Firebase authenticates users.
- The backend verifies Firebase ID tokens on every protected API request.
- Roles are loaded from Firestore and are not trusted from browser state.
- Papers are generated server-side from active question-bank records.
- Paper payloads are encrypted with AES-256-GCM.
- The 256-bit content key is split with 2-of-3 Shamir secret sharing.
- Shares are individually wrapped using AES-GCM and `KEY_SHARE_WRAP_SECRET`.
- Paper release requires at least two distinct approved share holders.
- Students cannot retrieve plaintext papers before scheduled release.
- Expired exam papers and key material are purged by the backend workflow.
