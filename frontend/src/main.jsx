import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { BookOpen, CalendarClock, CheckCircle2, ClipboardList, GraduationCap, KeyRound, Lock, LogOut, Mail, Plus, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import { api } from "./api";
import { auth, loginWithEmail, registerWithEmail } from "./firebase";
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
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      const profile = await api("/auth/me");
      onAuthSuccess?.(profile);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e?.preventDefault();
    setError("");
    if (!displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, displayName.trim());
      // Register role & details in backend
      const profile = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ displayName: displayName.trim(), role })
      });
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
              ["Email & Password Auth", "Role-separated portal for Students, Teachers, Controllers & Admins."],
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Role Portals Available</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800 font-semibold border border-emerald-200">🎓 Student</span>
              <span className="rounded bg-blue-50 px-2 py-1 text-blue-800 font-semibold border border-blue-200">👨‍🏫 Teacher</span>
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-800 font-semibold border border-amber-200">🛡️ Exam Controller</span>
              <span className="rounded bg-purple-50 px-2 py-1 text-purple-800 font-semibold border border-purple-200">⚙️ Admin</span>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          {/* Mode Switcher */}
          <div className="flex border-b border-line mb-6">
            <button
              type="button"
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                mode === "login"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              Sign In with Email
            </button>
            <button
              type="button"
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                mode === "register"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => { setMode("register"); setError(""); }}
            >
              Register New Account
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-xl font-bold text-ink">Sign In to Your Portal</h2>
              <p className="text-xs text-slate-500">Access your role-specific exam dashboard.</p>
              <label className="block space-y-1">
                <span className="label">Email address</span>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
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
                className="btn-primary w-full mt-2"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              {error && <p className="text-sm font-semibold text-red-700 bg-red-50 p-3 rounded border border-red-200">{error}</p>}
              <p className="text-xs text-center text-slate-500 mt-4">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-primary font-bold hover:underline"
                >
                  Register here
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-xl font-bold text-ink">Register New Account</h2>
              <p className="text-xs text-slate-500">Choose your role to get separate portal access.</p>
              <label className="block space-y-1">
                <span className="label">Full Name</span>
                <input
                  type="text"
                  required
                  className="input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dr. Jane Smith or Alex Johnson"
                />
              </label>
              <label className="block space-y-1">
                <span className="label">Email address</span>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                />
              </label>
              <label className="block space-y-1">
                <span className="label">Password (min 6 characters)</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <label className="block space-y-1">
                <span className="label">Select Your Role / Portal</span>
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="STUDENT">🎓 Student (Take exams & view results)</option>
                  <option value="TEACHER">👨‍🏫 Teacher (Manage questions & lock exams)</option>
                  <option value="EXAM_CONTROLLER">🛡️ Exam Controller (Approve & release papers)</option>
                  <option value="ADMIN">⚙️ Administrator (Full system management)</option>
                </select>
              </label>
              <p className="text-xs text-slate-500 italic">
                {ROLE_CONFIG[role]?.description}
              </p>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? "Creating account..." : "Register & Enter"}
              </button>
              {error && <p className="text-sm font-semibold text-red-700 bg-red-50 p-3 rounded border border-red-200">{error}</p>}
              <p className="text-xs text-center text-slate-500 mt-4">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-primary font-bold hover:underline"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}
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
        <ExamList exams={exams} actionLabel={isController ? null : "Generate & Lock"} onAction={lock} />
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
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [userForm, setUserForm] = useState({ uid: "", role: "STUDENT", status: "ACTIVE", displayName: "", phoneNumber: "", email: "" });
  const [error, setError] = useState("");
  const load = async () => { setSubjects(await api("/subjects")); setUsers(await api("/admin/users")); setLogs(await api("/admin/audit-logs")); };
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function addSubject() {
    setError("");
    try {
      await api("/subjects", { method: "POST", body: JSON.stringify({ name: subjectName, code: subjectName.slice(0, 6).toUpperCase() }) });
      setSubjectName("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function saveUser() {
    setError("");
    try {
      await api(`/admin/users/${userForm.uid}`, { method: "PUT", body: JSON.stringify(userForm) });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  return <div className="grid gap-5 xl:grid-cols-2">
    <div className="panel p-5"><h2 className="font-bold">Subjects</h2><div className="mt-3 flex gap-2"><input className="input" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} /><button className="btn-primary" onClick={addSubject}>Add</button></div><div className="mt-4 grid gap-2">{subjects.map((s) => <p className="rounded border border-line px-3 py-2 text-sm" key={s.subjectId}>{s.name}</p>)}</div></div>
    <div className="panel p-5"><h2 className="font-bold">Users</h2><div className="mt-3 grid gap-2">{["uid", "displayName", "phoneNumber", "email"].map((f) => <input className="input" key={f} placeholder={f} value={userForm[f]} onChange={(e) => setUserForm({ ...userForm, [f]: e.target.value })} />)}<select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option>ADMIN</option><option>TEACHER</option><option>EXAM_CONTROLLER</option><option>STUDENT</option></select><button className="btn-primary" onClick={saveUser}>Save user</button></div><div className="mt-4 max-h-64 overflow-auto text-sm">{users.map((u) => <p className="border-b border-line py-2" key={u.uid}>{u.displayName || u.uid} · {u.role}</p>)}</div></div>
    {error && <div className="panel border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 xl:col-span-2">{error}</div>}
    <div className="panel p-5 xl:col-span-2"><h2 className="font-bold">Audit Logs</h2><div className="mt-3 max-h-96 overflow-auto text-sm">{logs.map((l) => <p className="border-b border-line py-2" key={l.logId}>{l.timestamp} · {l.actorRole} · {l.action} · {l.success ? "success" : "failed"}</p>)}</div></div>
  </div>;
}

function ExamList({ exams, actionLabel, onAction, secondaryLabel, onSecondary }) {
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
