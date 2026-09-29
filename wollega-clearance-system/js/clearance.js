/**
 * clearance.js
 * ------------------------------------------------------------------
 * Handles the clearance certificate page: verifies the student is
 * fully cleared, renders their certificate, and provides print /
 * "download" (print-to-PDF) actions.
 * ------------------------------------------------------------------
 */

async function renderCertificatePage() {
  const session = requireRole(["student"]);
  if (!session) return;

  try {
    const student = await getStudentById(session.id);
    const progress = await calculateClearanceProgress(student.studentId);

    const notCleared = document.querySelector("[data-not-cleared]");
    const certificate = document.querySelector("[data-certificate]");
    const certActions = document.querySelector("[data-cert-actions]");

    if (!progress.isCleared) {
      notCleared.classList.remove("is-hidden");
      certificate.classList.add("is-hidden");
      certActions.classList.add("is-hidden");
      setText("[data-remaining-count]", progress.total - progress.approved);
      return;
    }

    notCleared.classList.add("is-hidden");
    certificate.classList.remove("is-hidden");
    certActions.classList.remove("is-hidden");

    const reference = generateClearanceReference(student.studentId);
    const completionDate = formatDate(new Date().toISOString().slice(0, 10));

    setText("[data-cert-name]", student.name);
    setText("[data-cert-id]", student.studentId);
    setText("[data-cert-department]", student.department);
    setText("[data-cert-college]", student.college);
    setText("[data-cert-program]", student.program);
    setText("[data-cert-year]", student.graduationYear);
    setText("[data-cert-reference]", reference);
    setText("[data-cert-date]", completionDate);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function printCertificate() {
  window.print();
}

/**
 * Simulates a "download" by opening the print dialog with the
 * destination set to PDF (the browser handles the actual file
 * save). This avoids needing a backend file-generation service.
 */
function downloadCertificate() {
  showToast("Preparing certificate for download - use \"Save as PDF\" in the print dialog.", "info");
  setTimeout(() => window.print(), 400);
}
