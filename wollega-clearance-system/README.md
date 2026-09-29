# Wollega University Student Online Clearance System

A full-stack clearance portal for Wollega University:

- **Frontend** — plain HTML5, CSS3, and vanilla JavaScript (no frameworks).
- **Backend** — Node.js + Express + MongoDB (via Mongoose), with password
  hashing (bcrypt) and JWT-based login sessions.

Students can create their own account, submit a clearance request, and track
every office's status until they can print their certificate. Admins and
department officers approve or reject requests from their own dashboards.
Everything is stored in MongoDB — there is no more localStorage "fake
database".

## 1. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `MONGODB_URI` — a local MongoDB instance (`mongodb://127.0.0.1:27017/wollega_clearance`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection string.
- `JWT_SECRET` — any long random string.
- `CORS_ORIGIN` — the origin(s) the frontend will be served from (see step 2).

Then seed the demo staff accounts and one fully-cleared sample student:

```bash
npm run seed
```

Start the API server:

```bash
npm start
```

You should see `Wollega Clearance API running on http://localhost:5000`.

## 2. Serve the frontend

The frontend calls the API from the browser, so it needs to be served over
`http://`, not opened directly as a `file://` path (the browser blocks
cross-origin requests from `file://`). From the project root:

```bash
npx serve . -l 5500
```

Then visit `http://localhost:5500`. If you use a different port or tool
(e.g. VS Code's Live Server), add that origin to `CORS_ORIGIN` in
`backend/.env` and restart the backend.

If your backend runs somewhere other than `http://localhost:5000`, update
`API_BASE_URL` at the top of `js/api.js` to match.

## 3. Create an account or use the demo logins

Click **Create Account** on the landing page to register a new student —
this calls `POST /api/auth/register`, hashes the password, saves the student
in MongoDB, and automatically creates a Pending clearance record for all 10
offices.

Or use the seeded demo accounts:

| Role                     | ID          | Password     |
|--------------------------|-------------|--------------|
| Student (fully cleared)  | `WU2026002` | `student123` |
| Registrar Admin          | `admin`     | `admin123`   |
| Library Officer          | `library01` | `officer123` |
| Finance Officer          | `finance01` | `officer123` |

(The mixed-status demo student from the earlier localStorage version isn't
seeded automatically — register a new account to see a fresh, all-Pending
clearance table, then approve/reject a few offices from the admin or officer
dashboard to see the mixed states.)

## Project structure

```
/wollega-clearance-system
    index.html, login.html, register.html      Public pages
    student-dashboard.html, clearance.html,
    profile.html, notifications.html,
    certificate.html                           Student pages
    admin-dashboard.html                        Registrar admin
    officer-dashboard.html                      Department officer
    css/style.css, css/responsive.css           Styling
    js/api.js            Fetch wrapper for every backend route + session/token storage
    js/app.js             Shared UI helpers (toasts, modals, nav, badges)
    js/student.js          Student-facing page logic (async, calls api.js)
    js/clearance.js        Certificate rendering + printing
    js/admin.js             Admin + officer dashboard logic

    backend/
        server.js            Express app entry point
        seed.js              Creates demo staff + one demo student
        config/db.js         MongoDB connection
        config/offices.js    The 10 clearance offices
        models/              Student, Staff, Clearance, ClearanceRequest, Notification
        routes/              auth, students, staff, clearances, requests, notifications
        middleware/auth.js   JWT verification + role guards
        .env.example         Copy to .env and fill in
```

## How login and registration work

- `POST /api/auth/register` — creates a Student document (password hashed
  with bcrypt), creates 10 Pending Clearance documents (one per office), and
  returns a JWT.
- `POST /api/auth/login/student` / `POST /api/auth/login/staff` — verify the
  password and return a JWT containing `{ id, role, office? }`.
- The frontend stores `{ token, role, id }` in `localStorage` under
  `wu_session` and sends `Authorization: Bearer <token>` on every API call
  (see `js/api.js`).
- Every protected route in `backend/routes/*.js` runs the token through
  `verifyToken`, and further restricts by role with `requireRole(...)` —
  e.g. only an officer assigned to "Library" can approve a Library record,
  and only admins can list every student.

## Notes

- Passwords are never stored or returned in plain text — `models/Student.js`
  and `models/Staff.js` hash them with bcrypt before saving and strip them
  from any JSON response.
- The certificate reference number (`WU/CLR/2026/xxxxxx`) is generated
  client-side and cached in `localStorage` purely for display — it isn't a
  security-sensitive value.
- "Download Certificate" opens the browser's print dialog so the person can
  choose "Save as PDF" — no server-side PDF generation is required.
