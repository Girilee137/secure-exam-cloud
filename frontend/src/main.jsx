import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { BookOpen, CalendarClock, CheckCircle2, ClipboardList, GraduationCap, KeyRound, Lock, LogOut, Mail, Plus, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import { api, publicApi } from "./api";
import { auth, loginWithEmail } from "./firebase";
import "./styles.css";

const ROLE_CONFIG = {
  STUDENT: {
    label: "Student",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Take assigned exams, submit answers, and view scores"
  },
  TEACHER: {
    label: "Teacher",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Manage questions, configure and lock encrypted exam papers"
  },
  EXAM_CONTROLLER: {
    label: "Exam Controller",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    description: "Authorize Shamir key release and trigger timed paper publication"
  },
  ADMIN: {
    label: "System Admin",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    description: "Manage user roles, subjects, audit trails, and overall security"
  }
};

function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      try {
        await loginWithEmail(email.trim(), password);
      } catch (loginErr) {
        // If logging in as default admin and failed, try to trigger bootstrap and retry
        if (email.trim().toLowerCase() === "admin@gmail.com") {
          try {
            await publicApi("/auth/bootstrap-admin", { method: "POST" });
            await loginWithEmail(email.trim(), password);
          } catch {
            throw loginErr;
          }
        } else {
          throw loginErr;
        }
      }
      const profile = await api("/auth/me");
      onAuthSuccess?.(profile);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cloud">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-6 py-8 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-ink">Secure Exam Cloud</h1>
              <p className="text-slate-600">Controlled question-paper generation, encryption, and release.</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-slate-700">
            {[
              ["Role-Based Security", "Portals for Students, Teachers, Controllers & Admins."],
              ["Locked Paper", "AES-256-GCM encrypted papers stored without plaintext."],
              ["2-of-3 Release", "Teacher, controller, and admin Shamir key share authorization."]
            ].map(([title, text]) => (
              <div className="panel flex items-start gap-3 p-4" key={title}>
                <Lock className="mt-1 h-5 w-5 text-primary" />
                <div><strong>{title}</strong><p>{text}</p></div>
              </div>
            ))}
          </div>

          <div className="panel p-4 bg-white/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Role Portals</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800 font-semibold border border-emerald-200">🎓 Student</span>
              <span className="rounded bg-blue-50 px-2 py-1 text-blue-800 font-semibold border border-blue-200">👨‍🏫 Teacher</span>
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-800 font-semibold border border-amber-200">🛡️ Exam Controller</span>
              <span className="rounded bg-purple-50 px-2 py-1 text-purple-800 font-semibold border border-purple-200">⚙️ Admin</span>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="border-b border-line pb-4">
              <h2 className="text-xl font-bold text-ink">Sign In to Your Portal</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access your role-specific dashboard.
              </p>
            </div>

            {/* Default Admin Notice Card */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3.5 text-xs text-purple-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-purple-800">
                  <ShieldCheck className="h-4 w-4 text-purple-700" /> Default System Admin
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@gmail.com");
                    setPassword("password");
                  }}
                  className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Use Defaults
                </button>
              </div>
              <p className="font-mono text-purple-800">
                Email: <strong>admin@gmail.com</strong> &nbsp;|&nbsp; Password: <strong>password</strong>
              </p>
              <p className="text-[11px] text-purple-600">
                New accounts for Students, Teachers, and Controllers can only be created by an Administrator.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="label">Email address</span>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
              />
            </label>
            <label className="block space-y-1">
              <span className="label">Password</span>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            {error && <p className="text-sm font-semibold text-red-700 bg-red-50 p-3 rounded border border-red-200">{error}</p>}

            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 text-center">
              Student, Teacher, and Exam Controller accounts are created and managed by the System Administrator in the Admin portal.
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function authMessage(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password. Please check your credentials.";
  }
  if (code === "auth/email-already-in-use") {
    return "This email address is already in use. Please sign in instead.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many failed attempts. Please wait a few minutes and try again.";
  }
  return error?.message || "Authentication failed.";
}

function Shell({ user, appUser }) {
  const userRole = appUser?.role || "STUDENT";

  // Define role-separated navigation according to who handles what
  const getNavItems = () => {
    switch (userRole) {
      case "STUDENT":
        return [
          ["Dashboard", "/", ShieldCheck],
          ["My Exams", "/student", BookOpen]
        ];
      case "TEACHER":
        return [
          ["Dashboard", "/", ShieldCheck],
          ["Questions", "/questions", ClipboardList],
          ["Exams", "/exams", CalendarClock],
          ["Approve Release", "/release", KeyRound]
        ];
      case "EXAM_CONTROLLER":
        return [
          ["Dashboard", "/", ShieldCheck],
          ["Exams", "/exams", CalendarClock],
          ["Release Portal", "/release", KeyRound]
        ];
      case "ADMIN":
      default:
        return [
          ["Dashboard", "/", ShieldCheck],
          ["Questions", "/questions", ClipboardList],
          ["Exams", "/exams", CalendarClock],
          ["Release", "/release", KeyRound],
          ["Student Portal", "/student", BookOpen],
          ["Admin", "/admin", Users]
        ];
    }
  };

  const nav = getNavItems();
  const roleMeta = ROLE_CONFIG[userRole] || ROLE_CONFIG.STUDENT;

  return (
    <div className="min-h-screen bg-cloud">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white p-4 md:block">
        <div className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck className="text-primary" />
          <span>Secure Exam</span>
        </div>
        <div className="mt-3">
          <span className={`inline-block text-xs font-bold px-2 py-1 rounded border ${roleMeta.badge}`}>
            {roleMeta.label}
          </span>
        </div>
        <nav className="mt-6 grid gap-1">
          {nav.map(([label, to, Icon]) => (
            <Link
              key={to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              to={to}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line bg-white/95 md:ml-64">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-bold">{appUser?.displayName || user?.email || user?.uid}</p>
              <p className="text-xs text-slate-500">{user?.email || appUser?.email}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${roleMeta.badge}`}>
              {roleMeta.label}
            </span>
          </div>
          <button className="btn-secondary" onClick={() => signOut(auth)}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="px-5 py-6 md:ml-64">
        <Routes>
          <Route path="/" element={<Dashboard appUser={appUser} />} />
          {(userRole === "TEACHER" || userRole === "ADMIN") && (
            <Route path="/questions" element={<Questions />} />
          )}
          {(userRole === "TEACHER" || userRole === "EXAM_CONTROLLER" || userRole === "ADMIN") && (
            <Route path="/exams" element={<Exams userRole={userRole} />} />
          )}
          {(userRole === "TEACHER" || userRole === "EXAM_CONTROLLER" || userRole === "ADMIN") && (
            <Route path="/release" element={<Release userRole={userRole} />} />
          )}
          {(userRole === "STUDENT" || userRole === "ADMIN") && (
            <Route path="/student" element={<Student />} />
          )}
          {userRole === "ADMIN" && (
            <Route path="/admin" element={<Admin />} />
          )}
          {/* Fallback to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Dashboard({ appUser }) {
  const role = appUser?.role || "STUDENT";
  const roleMeta = ROLE_CONFIG[role] || ROLE_CONFIG.STUDENT;

  return (
    <div className="space-y-6">
      <div className="panel p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Welcome, {appUser?.displayName || "User"}!</h1>
            <p className="text-sm text-slate-600 mt-1">
              You are logged in as <span className="font-semibold text-primary">{roleMeta.label}</span>. Here is what you handle:
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${roleMeta.badge}`}>
            {roleMeta.label} Portal
          </span>
        </div>
      </div>

      {role === "STUDENT" && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-5 space-y-2">
            <BookOpen className="h-8 w-8 text-emerald-600" />
            <h3 className="font-bold">Active & Assigned Exams</h3>
            <p className="text-sm text-slate-600">Access your scheduled tests, answer questions securely, and submit responses within the exam window.</p>
            <Link to="/student" className="btn-primary inline-block text-center mt-3 w-full">Go to My Exams</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h3 className="font-bold">Encrypted Exam Papers</h3>
            <p className="text-sm text-slate-600">All questions are protected by Shamir 2-of-3 secret sharing and released only during the active window.</p>
          </div>
          <div className="panel p-5 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold">Instant Receipts</h3>
            <p className="text-sm text-slate-600">Your answers and scores are verified and audited instantly upon single submission.</p>
          </div>
        </div>
      )}

      {role === "TEACHER" && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-5 space-y-2">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold">Question Bank</h3>
            <p className="text-sm text-slate-600">Create, organize, and categorize subject questions with options, marks, and difficulty.</p>
            <Link to="/questions" className="btn-primary inline-block text-center mt-3 w-full">Manage Questions</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <CalendarClock className="h-8 w-8 text-indigo-600" />
            <h3 className="font-bold">Exams & Paper Locking</h3>
            <p className="text-sm text-slate-600">Configure exam parameters, randomly sample questions, and lock with AES-256-GCM encryption.</p>
            <Link to="/exams" className="btn-secondary inline-block text-center mt-3 w-full">Schedule Exams</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <KeyRound className="h-8 w-8 text-amber-600" />
            <h3 className="font-bold">2-of-3 Key Authorization</h3>
            <p className="text-sm text-slate-600">As a teacher, authorize your Shamir key share to permit student paper release.</p>
            <Link to="/release" className="btn-secondary inline-block text-center mt-3 w-full">Authorize Release</Link>
          </div>
        </div>
      )}

      {role === "EXAM_CONTROLLER" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel p-5 space-y-2">
            <KeyRound className="h-8 w-8 text-amber-600" />
            <h3 className="font-bold">Paper Release Control</h3>
            <p className="text-sm text-slate-600">Review pending exams, approve Controller key shares, and trigger paper release once 2-of-3 quorum is reached.</p>
            <Link to="/release" className="btn-primary inline-block text-center mt-3 w-full">Release Control Panel</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <CalendarClock className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold">Exams Overview</h3>
            <p className="text-sm text-slate-600">Monitor scheduled exams, start times, expiration windows, and locking status.</p>
            <Link to="/exams" className="btn-secondary inline-block text-center mt-3 w-full">View Exams</Link>
          </div>
        </div>
      )}

      {role === "ADMIN" && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="panel p-5 space-y-2">
            <Users className="h-8 w-8 text-purple-600" />
            <h3 className="font-bold">User Management</h3>
            <p className="text-sm text-slate-600">Manage user accounts, assign roles, and activate/deactivate users.</p>
            <Link to="/admin" className="btn-primary inline-block text-center mt-3 w-full">Admin Panel</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold">Questions & Subjects</h3>
            <p className="text-sm text-slate-600">Full control over subject catalogs and master question banks.</p>
            <Link to="/questions" className="btn-secondary inline-block text-center mt-3 w-full">Questions</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <CalendarClock className="h-8 w-8 text-indigo-600" />
            <h3 className="font-bold">Exams Control</h3>
            <p className="text-sm text-slate-600">Create, lock, and oversee all scheduled examinations.</p>
            <Link to="/exams" className="btn-secondary inline-block text-center mt-3 w-full">Exams</Link>
          </div>
          <div className="panel p-5 space-y-2">
            <KeyRound className="h-8 w-8 text-amber-600" />
            <h3 className="font-bold">Key Release Oversight</h3>
            <p className="text-sm text-slate-600">Approve Admin share and oversee Shamir cryptographic threshold.</p>
            <Link to="/release" className="btn-secondary inline-block text-center mt-3 w-full">Release</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Questions() {
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ subjectId: "", questionText: "", options: ["", "", "", ""], correctAnswer: 0, marks: 1, difficulty: "MEDIUM", topic: "" });
  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    setSubjects(await api("/subjects"));
    setQuestions(await api("/questions"));
  };
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  async function save() {
    setError("");
    const trimmedOptions = form.options.map((option) => option.trim());
    if (!form.subjectId) {
      setError("Please select a subject before adding the question.");
      return;
    }
    if (!form.questionText.trim()) {
      setError("Please enter the question text.");
      return;
    }
    if (trimmedOptions.some((option) => !option)) {
      setError("Please fill all four answer options.");
      return;
    }
    if (new Set(trimmedOptions.map((option) => option.toLowerCase())).size !== 4) {
      setError("Options must be four distinct values.");
      return;
    }
    if (!form.topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    try {
      await api("/questions", { method: "POST", body: JSON.stringify({ ...form, questionText: form.questionText.trim(), options: trimmedOptions, topic: form.topic.trim() }) });
      setForm({ ...form, questionText: "", options: ["", "", "", ""] });
      await load();
    } catch (e) { setError(e.message); }
  }
  async function addSubject() {
    setError("");
    const name = subjectName.trim();
    if (!name) {
      setError("Please enter a subject name.");
      return;
    }
    try {
      const subject = await api("/subjects", { method: "POST", body: JSON.stringify({ name, code: name.slice(0, 6).toUpperCase() }) });
      setSubjectName("");
      setForm({ ...form, subjectId: subject.subjectId });
      await load();
    } catch (e) { setError(e.message); }
  }
  async function remove(id) {
    setError("");
    try {
      await api(`/questions/${id}`, { method: "DELETE" });
      await load();
    } catch (e) { setError(e.message); }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="panel p-5">
        <h2 className="font-bold">Question Bank</h2>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className="input" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="New subject name" />
            <button className="btn-secondary" onClick={addSubject}><Plus className="h-4 w-4" />Subject</button>
          </div>
          <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.name}</option>)}
          </select>
          <textarea className="input min-h-24" value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} placeholder="Question text" />
          {form.options.map((opt, i) => <input key={i} className="input" value={opt} onChange={(e) => {
            const options = [...form.options]; options[i] = e.target.value; setForm({ ...form, options });
          }} placeholder={`Option ${i + 1}`} />)}
          <div className="grid grid-cols-3 gap-3">
            <select className="input" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: Number(e.target.value) })}>{[0, 1, 2, 3].map((i) => <option key={i} value={i}>Correct {i + 1}</option>)}</select>
            <input className="input" type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} />
            <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>EASY</option><option>MEDIUM</option><option>HARD</option></select>
          </div>
          <input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topic" />
          <button className="btn-primary" onClick={save}><Plus className="h-4 w-4" />Add question</button>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </div>
      </div>
      <div className="grid gap-3">
        {questions.map((q) => <div className="panel p-4" key={q.questionId}>
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="font-semibold">{q.questionText}</h3><p className="text-sm text-slate-500">{q.topic} · {q.difficulty} · {q.marks} marks</p></div>
            <button className="btn-secondary" onClick={() => remove(q.questionId)}><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">{q.options?.map((o, i) => <p className="rounded border border-line px-3 py-2 text-sm" key={i}>{i + 1}. {o}</p>)}</div>
        </div>)}
      </div>
    </div>
  );
}

function Exams({ userRole }) {
  const isController = userRole === "EXAM_CONTROLLER";
  const isAdmin = userRole === "ADMIN";
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [form, setForm] = useState({ title: "", subjectId: "", description: "", scheduledStart: "", scheduledEnd: "", durationMinutes: 60, questionCount: 5 });
  const [error, setError] = useState("");
  const load = async () => { setSubjects(await api("/subjects")); setExams(await api("/exams")); };
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  async function create() {
    setError("");
    try {
      await api("/exams", { method: "POST", body: JSON.stringify({ ...form, scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() }) });
      await load();
    } catch (e) { setError(e.message); }
  }
  async function lock(id) {
    setError("");
    try { await api(`/exams/${id}/lock`, { method: "POST" }); await load(); } catch (e) { setError(e.message); }
  }
  async function deleteExam(id) {
    setError("");
    if (!window.confirm("Are you sure you want to permanently delete this exam? This will also remove all key shares and assignments.")) return;
    try { await api(`/exams/${id}`, { method: "DELETE" }); await load(); } catch (e) { setError(e.message); }
  }
  return (
    <div className={isController ? "max-w-4xl space-y-4" : "grid gap-5 xl:grid-cols-[420px_1fr]"}>
      {!isController && (
        <div className="panel p-5">
          <h2 className="font-bold">Create Exam</h2>
          <div className="mt-4 grid gap-3">
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}><option value="">Subject</option>{subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.name}</option>)}</select>
            <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="input" type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} />
            <input className="input" type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} />
            <div className="grid grid-cols-2 gap-3"><input className="input" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /><input className="input" type="number" value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })} /></div>
            <button className="btn-primary" onClick={create}><Plus className="h-4 w-4" />Create</button>
            {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          </div>
        </div>
      )}
      <div>
        <h2 className="font-bold text-lg mb-3">{isController ? "Scheduled & Locked Exams" : "All Exams"}</h2>
        {error && !isController && <p className="text-sm font-semibold text-red-700 mb-2">{error}</p>}
        <ExamList
          exams={exams}
          actionLabel={isController ? null : "Generate & Lock"}
          onAction={lock}
          deleteLabel={isAdmin ? "Delete" : null}
          onDelete={deleteExam}
        />
      </div>
    </div>
  );
}

function Release({ userRole }) {
  const [exams, setExams] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => setExams(await api("/exams"));
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function approve(id) {
    setError("");
    setMessage("");
    try {
      const r = await api(`/releases/${id}/approve`, { method: "POST" });
      setMessage(`Approved ${r.approvedShares}/${r.requiredShares}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function release(id) {
    setError("");
    setMessage("");
    try {
      await api(`/releases/${id}/release`, { method: "POST" });
      setMessage("Paper released");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  return <div className="space-y-4">
    {message && <div className="panel border-accent bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</div>}
    {error && <div className="panel border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    <ExamList
      exams={exams}
      actionLabel="Approve Share"
      onAction={approve}
      secondaryLabel={userRole === "TEACHER" ? null : "Release Paper"}
      onSecondary={release}
    />
  </div>;
}

function Student() {
  const [exams, setExams] = useState([]);
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/student/exams").then(setExams).catch(e => setError(e.message)); }, []);
  async function open(id) {
    setError("");
    try {
      setPaper(await api(`/student/exams/${id}/paper`));
      setReceipt(null);
    } catch (e) {
      setError(e.message);
    }
  }
  async function submit() {
    setError("");
    try {
      setReceipt(await api("/student/submissions", { method: "POST", body: JSON.stringify({ examId: paper.examId, answers }) }));
    } catch (e) {
      setError(e.message);
    }
  }
  return <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
    <ExamList exams={exams} actionLabel="Open" onAction={open} />
    <div className="space-y-4">
      {error && <div className="panel border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {paper?.questions?.map((q, index) => <div className="panel p-4" key={q.questionId}>
        <h3 className="font-semibold">{index + 1}. {q.questionText}</h3>
        <div className="mt-3 grid gap-2">{q.options.map((o, i) => <label className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm" key={i}><input type="radio" name={q.questionId} onChange={() => setAnswers({ ...answers, [q.questionId]: i })} />{o}</label>)}</div>
      </div>)}
      {paper && <button className="btn-primary" onClick={submit}>Submit answers</button>}
      {receipt && <div className="panel border-accent bg-green-50 p-4 font-semibold text-green-800">Submitted. Score: {receipt.score}/{receipt.totalMarks}</div>}
    </div>
  </div>;
}

function Admin() {
  const [activeTab, setActiveTab] = useState("accounts"); // "accounts" | "assignments" | "subjects" | "audit"
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [logs, setLogs] = useState([]);

  // Create User form
  const [newUser, setNewUser] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "STUDENT",
    studentGroup: "Group A",
    phoneNumber: ""
  });

  // Assign Exam form
  const [assignForm, setAssignForm] = useState({
    examId: "",
    assignMode: "group", // "group" or "individual"
    studentGroup: "Group A",
    customGroup: "",
    studentUid: ""
  });

  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [subs, us, ex, as, lg] = await Promise.all([
        api("/subjects"),
        api("/admin/users"),
        api("/exams"),
        api("/admin/assignments"),
        api("/admin/audit-logs")
      ]);
      setSubjects(subs);
      setUsers(us);
      setExams(ex);
      setAssignments(as);
      setLogs(lg);
      if (ex.length > 0 && !assignForm.examId) {
        setAssignForm(prev => ({ ...prev, examId: ex[0].examId }));
      }
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  // Compute available student groups
  const existingGroups = Array.from(new Set(
    users
      .filter(u => u.role === "STUDENT" && u.studentGroup && u.studentGroup.trim())
      .map(u => u.studentGroup.trim())
  ));
  if (!existingGroups.includes("Group A")) existingGroups.unshift("Group A");
  if (!existingGroups.includes("Group B")) existingGroups.push("Group B");

  // Create new user (Student, Teacher, Exam Controller, Admin)
  async function handleCreateUser(e) {
    e?.preventDefault();
    setError("");
    setMessage("");
    if (!newUser.displayName.trim() || !newUser.email.trim() || !newUser.password) {
      setError("Please fill in Name, Email, and Password.");
      return;
    }
    if (newUser.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await api("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...newUser,
          displayName: newUser.displayName.trim(),
          email: newUser.email.trim(),
          studentGroup: newUser.role === "STUDENT" ? newUser.studentGroup.trim() : ""
        })
      });
      setMessage(`Account created successfully for ${newUser.displayName} (${newUser.role}).`);
      setNewUser({
        displayName: "",
        email: "",
        password: "",
        role: "STUDENT",
        studentGroup: "Group A",
        phoneNumber: ""
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Delete user account
  async function handleDeleteUser(uid, displayName, email) {
    setError("");
    setMessage("");
    if (email === "admin@gmail.com") {
      setError("Cannot delete the default administrator account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user account "${displayName || email}" (${email})?`)) {
      return;
    }
    try {
      await api(`/admin/users/${uid}`, { method: "DELETE" });
      setMessage(`User account ${displayName || email} deleted.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  // Assign exam to a group of students or an individual student
  async function handleAssignExam(e) {
    e?.preventDefault();
    setError("");
    setMessage("");
    if (!assignForm.examId) {
      setError("Please select an exam to assign.");
      return;
    }
    setLoading(true);
    try {
      let body = { examId: assignForm.examId };
      if (assignForm.assignMode === "group") {
        const group = assignForm.customGroup.trim() || assignForm.studentGroup;
        if (!group) {
          setError("Please select or type a student group.");
          setLoading(false);
          return;
        }
        body.studentGroup = group;
      } else {
        if (!assignForm.studentUid) {
          setError("Please select a student.");
          setLoading(false);
          return;
        }
        body.studentUid = assignForm.studentUid;
      }

      const res = await api("/admin/assignments", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (res.assignedStudents !== undefined) {
        setMessage(`Exam assigned to group "${res.group}" (${res.assignedStudents} student(s) enrolled).`);
      } else {
        setMessage("Exam assigned to student successfully.");
      }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Delete assignment
  async function handleDeleteAssignment(assignmentId) {
    setError("");
    setMessage("");
    if (!window.confirm("Remove this exam assignment?")) return;
    try {
      await api(`/admin/assignments/${assignmentId}`, { method: "DELETE" });
      setMessage("Assignment removed.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  // Add subject
  async function addSubject(e) {
    e?.preventDefault();
    setError("");
    setMessage("");
    const name = subjectName.trim();
    if (!name) return;
    try {
      await api("/subjects", {
        method: "POST",
        body: JSON.stringify({ name, code: name.slice(0, 6).toUpperCase() })
      });
      setSubjectName("");
      setMessage(`Subject "${name}" added.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const studentUsers = users.filter(u => u.role === "STUDENT");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {[
          ["accounts", "👥 User Accounts", "Manage Students, Teachers, Controllers"],
          ["assignments", "📋 Exam Assignments", "Assign Exams to Student Groups"],
          ["subjects", "📚 Subjects", "Course Catalogs"],
          ["audit", "🛡️ Audit Logs", "System Event History"]
        ].map(([tabKey, title]) => (
          <button
            key={tabKey}
            type="button"
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === tabKey
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-line"
            }`}
            onClick={() => { setActiveTab(tabKey); setError(""); setMessage(""); }}
          >
            {title}
          </button>
        ))}
      </div>

      {message && <div className="panel border-accent bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</div>}
      {error && <div className="panel border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      {/* Tab 1: User Accounts (Admin only can create other account called student, teacher, exam controller and delete) */}
      {activeTab === "accounts" && (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="panel p-5 space-y-4">
            <div>
              <h2 className="font-bold text-lg text-ink">Create New Account</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin-controlled user creation for Students, Teachers, and Exam Controllers.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <label className="block space-y-1">
                <span className="label">Full Name</span>
                <input
                  type="text"
                  required
                  className="input"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  placeholder="e.g. Alice Smith"
                />
              </label>

              <label className="block space-y-1">
                <span className="label">Email Address</span>
                <input
                  type="email"
                  required
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="student1@university.edu"
                />
              </label>

              <label className="block space-y-1">
                <span className="label">Password (min 6 characters)</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                />
              </label>

              <label className="block space-y-1">
                <span className="label">Account Role</span>
                <select
                  className="input font-semibold"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="STUDENT">🎓 Student</option>
                  <option value="TEACHER">👨‍🏫 Teacher</option>
                  <option value="EXAM_CONTROLLER">🛡️ Exam Controller</option>
                  <option value="ADMIN">⚙️ Administrator</option>
                </select>
              </label>

              {newUser.role === "STUDENT" && (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                  <label className="block space-y-1">
                    <span className="label text-emerald-900 font-bold">Student Group / Batch</span>
                    <input
                      type="text"
                      className="input bg-white"
                      value={newUser.studentGroup}
                      onChange={(e) => setNewUser({ ...newUser, studentGroup: e.target.value })}
                      placeholder="e.g. Group A, Batch 2026, Section 1"
                    />
                  </label>
                  <p className="text-[11px] text-emerald-800">
                    Group assignments will automatically enroll this student when exams are assigned to this group.
                  </p>
                </div>
              )}

              <label className="block space-y-1">
                <span className="label">Phone Number (Optional)</span>
                <input
                  type="tel"
                  className="input"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>

          {/* User List with Delete capability */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-ink">Registered Accounts ({users.length})</h2>
                <p className="text-xs text-slate-500">View and manage all system users.</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                {studentUsers.length} Students
              </span>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {users.map((u) => {
                const roleMeta = ROLE_CONFIG[u.role] || ROLE_CONFIG.STUDENT;
                const isDefaultAdmin = u.email === "admin@gmail.com";
                return (
                  <div
                    key={u.uid}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-line bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-ink font-semibold">{u.displayName || "No Name"}</strong>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${roleMeta.badge}`}>
                          {roleMeta.label}
                        </span>
                        {u.studentGroup && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            🏷️ {u.studentGroup}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono">{u.email || u.uid}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDefaultAdmin ? (
                        <span className="text-xs font-semibold text-slate-400 italic px-2 py-1">Protected Admin</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.uid, u.displayName, u.email)}
                          className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-xs px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
                          title="Permanently delete this account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Exam Assignments (Assign exam to particular group of students or student) */}
      {activeTab === "assignments" && (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="panel p-5 space-y-4">
            <div>
              <h2 className="font-bold text-lg text-ink">Assign Exam</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign scheduled exams to a specific group of students or an individual student.
              </p>
            </div>

            <form onSubmit={handleAssignExam} className="space-y-4">
              <label className="block space-y-1">
                <span className="label">Select Exam</span>
                <select
                  className="input font-semibold"
                  value={assignForm.examId}
                  onChange={(e) => setAssignForm({ ...assignForm, examId: e.target.value })}
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map((ex) => (
                    <option key={ex.examId} value={ex.examId}>
                      {ex.title} ({ex.status}) - {new Date(ex.scheduledStart).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <span className="label">Assignment Type</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer ${
                      assignForm.assignMode === "group"
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-700 border-line hover:bg-slate-50"
                    }`}
                    onClick={() => setAssignForm({ ...assignForm, assignMode: "group" })}
                  >
                    👥 Assign to Group
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer ${
                      assignForm.assignMode === "individual"
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-700 border-line hover:bg-slate-50"
                    }`}
                    onClick={() => setAssignForm({ ...assignForm, assignMode: "individual" })}
                  >
                    👤 Single Student
                  </button>
                </div>
              </div>

              {assignForm.assignMode === "group" ? (
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <label className="block space-y-1">
                    <span className="label font-bold text-blue-900">Choose Student Group</span>
                    <select
                      className="input bg-white font-semibold"
                      value={assignForm.studentGroup}
                      onChange={(e) => setAssignForm({ ...assignForm, studentGroup: e.target.value, customGroup: "" })}
                    >
                      <option value="ALL">🌟 ALL (All registered students)</option>
                      {existingGroups.map((g) => (
                        <option key={g} value={g}>🏷️ {g}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="label text-xs text-blue-800">Or type custom group name:</span>
                    <input
                      type="text"
                      className="input bg-white"
                      value={assignForm.customGroup}
                      onChange={(e) => setAssignForm({ ...assignForm, customGroup: e.target.value })}
                      placeholder="e.g. Group C, Section B"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <label className="block space-y-1">
                    <span className="label font-bold text-emerald-900">Select Student</span>
                    <select
                      className="input bg-white font-semibold"
                      value={assignForm.studentUid}
                      onChange={(e) => setAssignForm({ ...assignForm, studentUid: e.target.value })}
                    >
                      <option value="">-- Choose Student --</option>
                      {studentUsers.map((s) => (
                        <option key={s.uid} value={s.uid}>
                          {s.displayName || s.email} {s.studentGroup ? `[${s.studentGroup}]` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || exams.length === 0}
                className="btn-primary w-full mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {loading ? "Assigning..." : "Assign Exam"}
              </button>
            </form>
          </div>

          {/* Current Assignments List */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-ink">Active Assignments ({assignments.length})</h2>
                <p className="text-xs text-slate-500">Exams assigned to students and groups.</p>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 border border-dashed rounded-lg">
                No assignments created yet. Assign an exam above to a student group or individual student.
              </div>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {assignments.map((a) => (
                  <div
                    key={a.assignmentId}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-line bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-ink font-semibold">{a.examTitle || a.examId}</strong>
                        {a.studentGroup && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                            👥 Group: {a.studentGroup}
                          </span>
                        )}
                        {a.studentUid && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            👤 {a.studentName || "Student"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Assigned on {a.assignedAt ? new Date(a.assignedAt).toLocaleString() : "N/A"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(a.assignmentId)}
                      className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-xs px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Subjects */}
      {activeTab === "subjects" && (
        <div className="panel p-5 space-y-4 max-w-2xl">
          <h2 className="font-bold text-lg text-ink">Manage Subjects</h2>
          <form onSubmit={addSubject} className="flex gap-2">
            <input
              className="input flex-1"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="New subject name (e.g. Mathematics, Cloud Computing)"
            />
            <button type="submit" className="btn-primary cursor-pointer">
              Add Subject
            </button>
          </form>
          <div className="grid gap-2 pt-2">
            {subjects.map((s) => (
              <div key={s.subjectId} className="flex items-center justify-between p-3 rounded border border-line bg-white">
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-xs font-mono text-slate-400">{s.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === "audit" && (
        <div className="panel p-5 space-y-4">
          <h2 className="font-bold text-lg text-ink">Security Audit Logs ({logs.length})</h2>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto font-mono text-xs">
            {logs.map((l) => (
              <div key={l.logId} className="flex items-center justify-between p-2.5 rounded border-b border-line hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ""}</span>
                  <span className="font-bold text-slate-700">[{l.actorRole || "SYSTEM"}]</span>
                  <span className="text-primary font-semibold">{l.action}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${l.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {l.success ? "SUCCESS" : "FAILED"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExamList({ exams, actionLabel, onAction, secondaryLabel, onSecondary, deleteLabel, onDelete }) {
  if (!exams || exams.length === 0) {
    return <div className="panel p-4 text-center text-sm text-slate-500">No exams scheduled.</div>;
  }
  return <div className="grid gap-3">{exams.map((e) => <div className="panel p-4" key={e.examId}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">{e.title}</h3>
        <p className="text-sm text-slate-500">{e.status} · {new Date(e.scheduledStart).toLocaleString()}</p>
        <p className="text-xs text-slate-400 mt-0.5">Duration: {e.durationMinutes} mins · Questions: {e.questionCount}</p>
      </div>
      <div className="flex gap-2">
        {actionLabel && <button className="btn-secondary" onClick={() => onAction(e.examId)}>{actionLabel}</button>}
        {secondaryLabel && <button className="btn-primary" onClick={() => onSecondary(e.examId)}>{secondaryLabel}</button>}
        {deleteLabel && <button className="btn-secondary text-red-600 border-red-300 hover:bg-red-50" onClick={() => onDelete(e.examId)}><Trash2 className="h-4 w-4" />{deleteLabel}</button>}
      </div>
    </div>
  </div>)}</div>;
}

function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAppUser(user) {
    if (user) {
      try {
        const profile = await api("/auth/me");
        setAppUser(profile);
      } catch {
        setAppUser(null);
      }
    } else {
      setAppUser(null);
    }
  }

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    setFirebaseUser(user);
    await loadAppUser(user);
    setLoading(false);
  }), []);

  if (loading) return <main className="grid min-h-screen place-items-center bg-cloud font-semibold">Loading Secure Exam Cloud...</main>;
  if (!firebaseUser || !appUser) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Auth onAuthSuccess={(profile) => setAppUser(profile)} />} />
        </Routes>
      </BrowserRouter>
    );
  }
  return <BrowserRouter><Shell user={firebaseUser} appUser={appUser} /></BrowserRouter>;
}

createRoot(document.getElementById("root")).render(<App />);
