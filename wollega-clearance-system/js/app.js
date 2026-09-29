/**
 * app.js
 * ------------------------------------------------------------------
 * Shared utilities used across every page: toast messages, modal
 * open/close helpers, the mobile navigation toggle, and small DOM
 * helpers. Every page includes this file after api.js.
 * ------------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  wireMobileNav();
  wireGenericModalDismiss();
  paintSessionBadges();
});

// ---- Toasts -----------------------------------------------------------

/**
 * Shows a temporary toast notification in the corner of the screen.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-exclamation" : "fa-circle-info";
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// ---- Modals -------------------------------------------------------------

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("modal-overlay--open");
  document.body.classList.add("no-scroll");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("modal-overlay--open");
  document.body.classList.remove("no-scroll");
}

/** Closes any open modal when its overlay (not its content) is clicked. */
function wireGenericModalDismiss() {
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.classList.remove("modal-overlay--open");
      document.body.classList.remove("no-scroll");
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-overlay").classList.remove("modal-overlay--open");
      document.body.classList.remove("no-scroll");
    });
  });
}

// ---- Navigation ---------------------------------------------------------

/** Toggles the collapsible nav / sidebar on small screens. */
function wireMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav-menu]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("is-open"));
  }
  const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
  const sidebar = document.querySelector("[data-sidebar]");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("is-open"));
  }
}

/** Fills in "logged in as ..." badges wherever present, by asking the API who the session belongs to. */
async function paintSessionBadges() {
  const session = getSession();
  const nameEls = document.querySelectorAll("[data-session-name]");
  if (!session || nameEls.length === 0) return;
  try {
    if (session.role === "student") {
      const student = await getStudentById(session.id);
      nameEls.forEach(el => (el.textContent = student.name));
    } else {
      const staff = await getStaffById(session.id);
      nameEls.forEach(el => (el.textContent = staff.name));
    }
  } catch (err) {
    // Session token likely expired or backend unreachable — leave placeholder text in place.
  }
}

// ---- Small helpers --------------------------------------------------------

function formatDate(dateStr) {
  if (!dateStr || dateStr === "-") return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadgeClass(status) {
  return { Approved: "badge badge--approved", Pending: "badge badge--pending", Rejected: "badge badge--rejected" }[status] || "badge";
}

/** Basic email format check for form validation. */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Basic Ethiopian-style phone check (loose, demo-only). */
function isValidPhone(value) {
  return /^\+?\d[\d\s-]{7,14}\d$/.test(value.trim());
}

// Updates EVERY element matching the selector (a page may repeat the
// same data attribute in more than one place, e.g. avatar initials
// shown both in the sidebar topbar and on a profile card).
function setText(selector, value) {
  document.querySelectorAll(selector).forEach(el => (el.textContent = value));
}

/** Small icon map shared by student, admin and officer clearance tables. */
function officeIcon(office) {
  const icons = {
    Library: "fa-book",
    Finance: "fa-coins",
    Registrar: "fa-file-signature",
    Department: "fa-graduation-cap",
    College: "fa-building-columns",
    "Student Affairs": "fa-users",
    Cafeteria: "fa-utensils",
    Dormitory: "fa-bed",
    ICT: "fa-laptop-code",
    "Property/Store": "fa-boxes-stacked"
  };
  return icons[office] || "fa-circle";
}

function notificationIcon(type) {
  return { approved: "fa-circle-check", rejected: "fa-circle-xmark", submitted: "fa-paper-plane", message: "fa-envelope", announcement: "fa-bullhorn" }[type] || "fa-bell";
}
