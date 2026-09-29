/**
 * student.js
 * ------------------------------------------------------------------
 * Renders every student-facing page: dashboard stats, the clearance
 * status table, the clearance request form, the profile page, and
 * the notifications panel. Each render* function is async and awaits
 * the fetch calls in api.js.
 * ------------------------------------------------------------------
 */

// Cache of the last-rendered clearance table rows, so the "View" modal
// can look a record up locally instead of needing an admin-only endpoint.
let lastRenderedClearances = [];

// ================= DASHBOARD =================

async function renderStudentDashboard() {
  const session = requireRole(["student"]);
  if (!session) return;
  try {
    const student = await getStudentById(session.id);
    const progress = await calculateClearanceProgress(student.studentId);

    setText("[data-student-name]", student.name);
    setText("[data-student-id]", student.studentId);
    setText("[data-student-department]", student.department);
    setText("[data-student-college]", student.college);
    setText("[data-student-program]", student.program);
    setText("[data-student-gradyear]", student.graduationYear);
    setText("[data-student-initials]", student.avatarInitials);

    setText("[data-stat-completed]", progress.approved);
    setText("[data-stat-pending]", progress.pending);
    setText("[data-stat-rejected]", progress.rejected);
    setText("[data-stat-total]", progress.total);
    setText("[data-progress-percent]", progress.percent + "%");

    const bar = document.querySelector("[data-progress-bar]");
    if (bar) {
      bar.style.width = progress.percent + "%";
      bar.classList.toggle("progress-bar__fill--complete", progress.isCleared);
    }

    const statusPill = document.querySelector("[data-overall-status]");
    if (statusPill) {
      if (progress.isCleared) {
        statusPill.textContent = "CLEARED";
        statusPill.className = "badge badge--approved badge--lg";
      } else if (progress.rejected > 0) {
        statusPill.textContent = "ACTION NEEDED";
        statusPill.className = "badge badge--rejected badge--lg";
      } else {
        statusPill.textContent = "IN PROGRESS";
        statusPill.className = "badge badge--pending badge--lg";
      }
    }

    const certBanner = document.querySelector("[data-cert-banner]");
    if (certBanner) certBanner.classList.toggle("is-hidden", !progress.isCleared);

    await renderRecentActivity(student.studentId);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function renderRecentActivity(studentId) {
  const list = document.querySelector("[data-recent-activity]");
  if (!list) return;
  const notifications = (await getNotificationsForStudent(studentId)).slice(0, 4);
  list.innerHTML =
    notifications
      .map(
        n => `
      <li class="activity-item">
        <i class="fa-solid ${notificationIcon(n.type)} activity-item__icon activity-item__icon--${n.type}"></i>
        <div>
          <p class="activity-item__title">${n.title}</p>
          <p class="activity-item__meta">${formatDate(n.date)}</p>
        </div>
      </li>`
      )
      .join("") || `<li class="activity-item__empty">No recent activity yet.</li>`;
}

// ================= CLEARANCE STATUS =================

async function renderClearanceTable() {
  const session = requireRole(["student"]);
  if (!session) return;
  try {
    const records = await getClearancesForStudent(session.id);
    lastRenderedClearances = records;
    const tbody = document.querySelector("[data-clearance-tbody]");
    if (!tbody) return;

    tbody.innerHTML = records
      .map(
        r => `
        <tr>
          <td data-label="Office"><span class="office-name"><i class="fa-solid ${officeIcon(r.office)}"></i>${r.office}</span></td>
          <td data-label="Status"><span class="${statusBadgeClass(r.status)}">${r.status}</span></td>
          <td data-label="Date">${formatDate(r.date)}</td>
          <td data-label="Officer Comment">${r.comment || "-"}</td>
          <td data-label="Action"><button class="btn btn--ghost btn--sm" onclick="viewClearanceDetail('${r.id}')">View</button></td>
        </tr>`
      )
      .join("");

    const progress = await calculateClearanceProgress(session.id);
    setText("[data-clearance-summary]", `${progress.approved} of ${progress.total} offices approved (${progress.percent}%)`);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function viewClearanceDetail(recordId) {
  const record = lastRenderedClearances.find(r => r.id === recordId);
  if (!record) return;
  document.getElementById("detail-office").textContent = record.office;
  document.getElementById("detail-status").innerHTML = `<span class="${statusBadgeClass(record.status)}">${record.status}</span>`;
  document.getElementById("detail-date").textContent = formatDate(record.date);
  document.getElementById("detail-comment").textContent = record.comment || "No comment provided.";
  openModal("clearance-detail-modal");
}

// ================= REQUEST CLEARANCE =================

async function prefillRequestForm() {
  const session = requireRole(["student"]);
  if (!session) return;
  try {
    const student = await getStudentById(session.id);
    const form = document.getElementById("request-form");
    if (!form) return;
    form.studentId.value = student.studentId;
    form.fullName.value = student.name;
    form.department.value = student.department;
    form.college.value = student.college;
    form.program.value = student.program;
    form.graduationYear.value = student.graduationYear;
    form.phone.value = student.phone;
    form.email.value = student.email;
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const reason = form.reason.value.trim();

  if (!reason) {
    showToast("Please describe your reason for requesting clearance.", "error");
    return false;
  }

  try {
    const request = await addClearanceRequest({
      fullName: form.fullName.value,
      department: form.department.value,
      college: form.college.value,
      program: form.program.value,
      graduationYear: form.graduationYear.value,
      phone: form.phone.value,
      email: form.email.value,
      reason
    });

    document.getElementById("confirm-request-id").textContent = request.id || request._id;
    openModal("request-confirm-modal");
    form.reset();
    await prefillRequestForm();
  } catch (err) {
    showToast(err.message, "error");
  }
  return false;
}

// ================= PROFILE =================

async function renderProfile() {
  const session = requireRole(["student"]);
  if (!session) return;
  try {
    const student = await getStudentById(session.id);

    setText("[data-profile-initials]", student.avatarInitials);
    setText("[data-profile-name]", student.name);
    setText("[data-profile-id]", student.studentId);
    setText("[data-profile-gender]", student.gender);
    setText("[data-profile-department]", student.department);
    setText("[data-profile-college]", student.college);
    setText("[data-profile-program]", student.program);
    setText("[data-profile-year]", student.graduationYear);
    setText("[data-profile-phone]", student.phone);
    setText("[data-profile-email]", student.email);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function openEditProfile() {
  const session = getSession();
  try {
    const student = await getStudentById(session.id);
    const form = document.getElementById("edit-profile-form");
    form.phone.value = student.phone;
    form.email.value = student.email;
    openModal("edit-profile-modal");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  const form = event.target;
  const phone = form.phone.value.trim();
  const email = form.email.value.trim();

  if (!isValidPhone(phone)) {
    showToast("Please enter a valid phone number.", "error");
    return false;
  }
  if (!isValidEmail(email)) {
    showToast("Please enter a valid email address.", "error");
    return false;
  }

  try {
    const session = getSession();
    await updateStudent(session.id, { phone, email });
    closeModal("edit-profile-modal");
    await renderProfile();
    showToast("Profile updated successfully.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
  return false;
}

// ================= NOTIFICATIONS =================

async function renderNotifications() {
  const session = requireRole(["student"]);
  if (!session) return;
  try {
    const notifications = await getNotificationsForStudent(session.id);
    const list = document.querySelector("[data-notification-list]");
    if (!list) return;

    list.innerHTML =
      notifications
        .map(
          n => `
        <li class="notification-card ${n.read ? "" : "notification-card--unread"}" onclick="handleNotificationClick('${n.id}')">
          <i class="fa-solid ${notificationIcon(n.type)} notification-card__icon notification-card__icon--${n.type}"></i>
          <div class="notification-card__body">
            <p class="notification-card__title">${n.title}</p>
            <p class="notification-card__message">${n.message}</p>
            <p class="notification-card__date">${formatDate(n.date)}</p>
          </div>
          ${n.read ? "" : `<span class="notification-card__dot"></span>`}
        </li>`
        )
        .join("") || `<li class="activity-item__empty">You're all caught up. No notifications yet.</li>`;
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleNotificationClick(id) {
  try {
    await markNotificationRead(id);
    await renderNotifications();
  } catch (err) {
    showToast(err.message, "error");
  }
}
