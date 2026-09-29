/**
 * admin.js
 * ------------------------------------------------------------------
 * Logic for the two staff-facing pages:
 *   - Admin dashboard: sees every student & every clearance record.
 *   - Officer dashboard: scoped to the officer's own office only.
 * ------------------------------------------------------------------
 */

let adminFilterStatus = "All";
let adminSearchTerm = "";
let adminStudentsCache = [];
let adminClearancesCache = [];

// ================= ADMIN DASHBOARD =================

async function renderAdminDashboard() {
  const session = requireRole(["admin"]);
  if (!session) return;

  try {
    const [students, records] = await Promise.all([getAllStudents(), getAllClearances()]);
    adminStudentsCache = students;
    adminClearancesCache = records;

    setText("[data-admin-total-students]", students.length);
    setText("[data-admin-pending]", records.filter(r => r.status === "Pending").length);
    setText("[data-admin-approved]", records.filter(r => r.status === "Approved").length);
    setText("[data-admin-rejected]", records.filter(r => r.status === "Rejected").length);

    const clearedCount = students.filter(s => {
      const own = records.filter(r => r.studentId === s.studentId);
      return own.length > 0 && own.every(r => r.status === "Approved");
    }).length;
    setText("[data-admin-completed]", clearedCount);

    renderAdminTable();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function progressFor(studentId) {
  const records = adminClearancesCache.filter(r => r.studentId === studentId);
  const total = records.length;
  const approved = records.filter(r => r.status === "Approved").length;
  const rejected = records.filter(r => r.status === "Rejected").length;
  const percent = total === 0 ? 0 : Math.round((approved / total) * 100);
  const isCleared = total > 0 && approved === total;
  return { total, approved, rejected, percent, isCleared };
}

function renderAdminTable() {
  const tbody = document.querySelector("[data-admin-tbody]");
  if (!tbody) return;

  const rows = adminStudentsCache
    .map(student => {
      const progress = progressFor(student.studentId);
      const overall = progress.isCleared ? "Cleared" : progress.rejected > 0 ? "Rejected" : "Pending";
      return { student, progress, overall };
    })
    .filter(({ student, overall }) => {
      const matchesStatus = adminFilterStatus === "All" || overall === adminFilterStatus;
      const matchesSearch =
        !adminSearchTerm ||
        student.name.toLowerCase().includes(adminSearchTerm) ||
        student.studentId.toLowerCase().includes(adminSearchTerm);
      return matchesStatus && matchesSearch;
    });

  tbody.innerHTML =
    rows
      .map(
        ({ student, progress, overall }) => `
      <tr>
        <td data-label="Student ID">${student.studentId}</td>
        <td data-label="Name">${student.name}</td>
        <td data-label="Department">${student.department}</td>
        <td data-label="Progress">
          <div class="mini-progress"><div class="mini-progress__fill" style="width:${progress.percent}%"></div></div>
          <span class="mini-progress__label">${progress.percent}%</span>
        </td>
        <td data-label="Status"><span class="${overallBadgeClass(overall)}">${overall}</span></td>
        <td data-label="Action"><button class="btn btn--ghost btn--sm" onclick="openStudentReview('${student.studentId}')">Review</button></td>
      </tr>`
      )
      .join("") || `<tr><td colspan="6" class="table-empty">No students match your search or filter.</td></tr>`;
}

function overallBadgeClass(overall) {
  return { Cleared: "badge badge--approved", Rejected: "badge badge--rejected", Pending: "badge badge--pending" }[overall] || "badge";
}

function handleAdminSearch(event) {
  adminSearchTerm = event.target.value.trim().toLowerCase();
  renderAdminTable();
}

function handleAdminFilter(event) {
  adminFilterStatus = event.target.value;
  renderAdminTable();
}

/** Opens the review modal showing every office's clearance for one student, with approve/reject controls. */
async function openStudentReview(studentId) {
  try {
    const student = adminStudentsCache.find(s => s.studentId === studentId) || (await getStudentById(studentId));
    const records = await getClearancesForStudent(studentId);

    document.getElementById("review-student-name").textContent = student.name;
    document.getElementById("review-student-meta").textContent = `${student.studentId} - ${student.department}`;

    const body = document.getElementById("review-office-list");
    body.innerHTML = records
      .map(
        r => `
        <div class="review-row">
          <div class="review-row__office"><i class="fa-solid ${officeIcon(r.office)}"></i>${r.office}</div>
          <span class="${statusBadgeClass(r.status)}">${r.status}</span>
          <input type="text" class="review-row__comment" placeholder="Add a comment" id="comment-${r.id}" value="${r.comment && r.comment !== "Awaiting review." ? r.comment : ""}">
          <div class="review-row__actions">
            <button class="btn btn--approve btn--sm" onclick="adminSetStatus('${r.id}', 'Approved', '${studentId}')" title="Approve"><i class="fa-solid fa-check"></i></button>
            <button class="btn btn--reject btn--sm" onclick="adminSetStatus('${r.id}', 'Rejected', '${studentId}')" title="Reject"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>`
      )
      .join("");

    openModal("student-review-modal");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function adminSetStatus(recordId, status, studentId) {
  const commentInput = document.getElementById(`comment-${recordId}`);
  const comment = commentInput ? commentInput.value.trim() : "";
  try {
    await updateClearanceStatus(recordId, status, comment || undefined);
    showToast(`Clearance marked as ${status.toLowerCase()}.`, status === "Approved" ? "success" : "error");
    await renderAdminDashboard();
    await openStudentReview(studentId);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ================= OFFICER DASHBOARD =================

let officerSearchTerm = "";
let officerRecordsCache = [];
let officerStudentsCache = {}; // studentId -> student object, populated as needed

async function renderOfficerDashboard() {
  const session = requireRole(["officer"]);
  if (!session) return;
  try {
    const officer = await getStaffById(session.id);
    setText("[data-officer-office]", officer.office);
    await renderOfficerTable(officer.office);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function renderOfficerTable(office) {
  try {
    const records = await getClearancesForOffice(office);
    officerRecordsCache = records;

    // Fetch each distinct student once so we can show their name/department.
    const uniqueIds = [...new Set(records.map(r => r.studentId))];
    await Promise.all(
      uniqueIds.map(async id => {
        if (!officerStudentsCache[id]) {
          try {
            officerStudentsCache[id] = await getStudentById(id);
          } catch {
            officerStudentsCache[id] = null;
          }
        }
      })
    );

    const filtered = records.filter(r => {
      if (!officerSearchTerm) return true;
      const student = officerStudentsCache[r.studentId];
      return r.studentId.toLowerCase().includes(officerSearchTerm) || (student && student.name.toLowerCase().includes(officerSearchTerm));
    });

    const tbody = document.querySelector("[data-officer-tbody]");
    if (!tbody) return;

    tbody.innerHTML =
      filtered
        .map(r => {
          const student = officerStudentsCache[r.studentId];
          return `
          <tr>
            <td data-label="Student ID">${r.studentId}</td>
            <td data-label="Name">${student ? student.name : "-"}</td>
            <td data-label="Department">${student ? student.department : "-"}</td>
            <td data-label="Status"><span class="${statusBadgeClass(r.status)}">${r.status}</span></td>
            <td data-label="Action"><button class="btn btn--approve btn--sm" onclick="officerReview('${r.id}')">Review</button></td>
          </tr>`;
        })
        .join("") || `<tr><td colspan="5" class="table-empty">No clearance requests found.</td></tr>`;
  } catch (err) {
    showToast(err.message, "error");
  }
}

function handleOfficerSearch(event) {
  officerSearchTerm = event.target.value.trim().toLowerCase();
  const session = getSession();
  getStaffById(session.id).then(officer => renderOfficerTable(officer.office));
}

function officerReview(recordId) {
  const record = officerRecordsCache.find(r => r.id === recordId);
  if (!record) return;
  const student = officerStudentsCache[record.studentId];

  document.getElementById("officer-review-name").textContent = student ? student.name : record.studentId;
  document.getElementById("officer-review-meta").textContent = `${record.studentId} - ${record.office}`;
  document.getElementById("officer-review-status").innerHTML = `<span class="${statusBadgeClass(record.status)}">${record.status}</span>`;
  document.getElementById("officer-comment").value = record.comment && record.comment !== "Awaiting review." ? record.comment : "";
  document.getElementById("officer-review-modal").dataset.recordId = recordId;

  openModal("officer-review-modal");
}

async function officerSetStatus(status) {
  const modal = document.getElementById("officer-review-modal");
  const recordId = modal.dataset.recordId;
  const comment = document.getElementById("officer-comment").value.trim();
  try {
    await updateClearanceStatus(recordId, status, comment || undefined);
    showToast(`Clearance marked as ${status.toLowerCase()}.`, status === "Approved" ? "success" : "error");
    closeModal("officer-review-modal");
    const session = getSession();
    const officer = await getStaffById(session.id);
    await renderOfficerTable(officer.office);
  } catch (err) {
    showToast(err.message, "error");
  }
}
