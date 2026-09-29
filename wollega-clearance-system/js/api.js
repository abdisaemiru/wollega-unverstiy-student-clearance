/**
 * api.js
 * ------------------------------------------------------------------
 * Talks to the Express + MongoDB backend in /backend. Every function
 * here is async and returns a Promise, mirroring the REST routes
 * documented in backend/routes/*.js.
 *
 * IMPORTANT: change API_BASE_URL if your backend runs somewhere other
 * than http://localhost:5000 (e.g. a deployed URL).
 * ------------------------------------------------------------------
 */

const API_BASE_URL = "http://localhost:5000/api";

const STORAGE_KEYS = {
  SESSION: "wu_session", // { token, role, id, office? }
  CERT_REF_PREFIX: "wu_cert_ref_"
};

const CLEARANCE_OFFICES = [
  "Library",
  "Finance",
  "Registrar",
  "Department",
  "College",
  "Student Affairs",
  "Cafeteria",
  "Dormitory",
  "ICT",
  "Property/Store"
];

// ---- Session helpers (kept in localStorage — only the auth token) -------

function setSession(session) {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}
function getSession() {
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
  return raw ? JSON.parse(raw) : null;
}
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// ---- Core fetch wrapper ---------------------------------------------------

async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const session = getSession();
    if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new Error("Could not reach the server. Is the backend running on http://localhost:5000?");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    throw new Error((data && data.message) || `Request failed (${response.status}).`);
  }
  return data;
}

/** Mongo documents use _id; the UI expects .id — this normalizes both single objects and arrays. */
function withId(doc) {
  if (Array.isArray(doc)) return doc.map(withId);
  if (doc && doc._id && !doc.id) doc.id = doc._id;
  return doc;
}

// ================= AUTH =================

async function registerStudent(formData) {
  try {
    const data = await apiFetch("/auth/register", { method: "POST", body: formData, auth: false });
    setSession({ token: data.token, role: "student", id: data.student.studentId });
    return { success: true, student: data.student };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function loginStudent(studentId, password, rememberMe) {
  try {
    const data = await apiFetch("/auth/login/student", { method: "POST", body: { studentId, password }, auth: false });
    setSession({ token: data.token, role: "student", id: data.student.studentId, rememberMe: !!rememberMe });
    return { success: true, student: data.student };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function loginStaff(staffId, password) {
  try {
    const data = await apiFetch("/auth/login/staff", { method: "POST", body: { staffId, password }, auth: false });
    setSession({ token: data.token, role: data.staff.role, id: data.staff.staffId, office: data.staff.office });
    return { success: true, staff: data.staff };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

/** Route guard: call at the top of any protected page. */
function requireRole(allowedRoles) {
  const session = getSession();
  if (!session || !allowedRoles.includes(session.role)) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

// ================= STUDENTS =================

async function getStudentById(studentId) {
  return apiFetch(`/students/${studentId}`);
}

async function updateStudent(studentId, updates) {
  return apiFetch(`/students/${studentId}`, { method: "PUT", body: updates });
}

async function getAllStudents() {
  return apiFetch("/students");
}

// ================= STAFF =================

async function getStaffById(staffId) {
  return apiFetch(`/staff/${staffId}`);
}

// ================= CLEARANCES =================

async function getClearancesForStudent(studentId) {
  return withId(await apiFetch(`/clearances?studentId=${encodeURIComponent(studentId)}`));
}

async function getClearancesForOffice(office) {
  return withId(await apiFetch(`/clearances?office=${encodeURIComponent(office)}`));
}

async function getAllClearances() {
  return withId(await apiFetch("/clearances"));
}

async function updateClearanceStatus(recordId, status, comment) {
  return withId(await apiFetch(`/clearances/${recordId}`, { method: "PATCH", body: { status, comment } }));
}

/** Computes { total, approved, pending, rejected, percent, isCleared } for one student. */
async function calculateClearanceProgress(studentId) {
  const records = await getClearancesForStudent(studentId);
  const total = records.length;
  const approved = records.filter(r => r.status === "Approved").length;
  const pending = records.filter(r => r.status === "Pending").length;
  const rejected = records.filter(r => r.status === "Rejected").length;
  const percent = total === 0 ? 0 : Math.round((approved / total) * 100);
  const isCleared = total > 0 && approved === total;
  return { total, approved, pending, rejected, percent, isCleared };
}

// ================= CLEARANCE REQUESTS =================

async function addClearanceRequest(request) {
  return apiFetch("/requests", { method: "POST", body: request });
}

async function getAllRequests() {
  return apiFetch("/requests");
}

// ================= NOTIFICATIONS =================

async function getNotificationsForStudent(studentId) {
  return withId(await apiFetch(`/notifications?studentId=${encodeURIComponent(studentId)}`));
}

async function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

// ================= CERTIFICATE REFERENCE (cosmetic, kept local) =================

/** Deterministic-looking unique clearance reference number, generated once per student. */
function generateClearanceReference(studentId) {
  const key = STORAGE_KEYS.CERT_REF_PREFIX + studentId;
  let ref = localStorage.getItem(key);
  if (!ref) {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    ref = `WU/CLR/${year}/${rand}`;
    localStorage.setItem(key, ref);
  }
  return ref;
}
