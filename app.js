const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "campusEmergencyReports";
const USER_KEY = "campusEmergencyUser";

let toastTimer;

function getReports() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveReports(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function generateId() {
  return "CE-" + Date.now().toString().slice(-6) +
    Math.floor(10 + Math.random() * 90);
}

function formatDate(date) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusClass(status) {
  if (status === "Resolved") return "resolved";
  if (status === "In Progress") return "in-progress";
  if (status === "Emergency Alert") return "alert";
  return "";
}

function refreshDashboard() {
  const reports = getReports();

  $("totalCount").textContent = reports.length;
  $("pendingCount").textContent =
    reports.filter(r => r.status === "Pending").length;
  $("resolvedCount").textContent =
    reports.filter(r => r.status === "Resolved").length;

  const user = getUser();
  const isTeacher = user?.role === "Teacher";
  const list = $("complaintList");

  if (!reports.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span>📋</span>
        <strong>No reports yet</strong>
        <p>Submitted campus reports will appear here.</p>
      </div>`;
    return;
  }

  list.innerHTML = [...reports].reverse().map(report => `
    <article class="complaint-item">
      <div>
        <h4>${escapeHTML(report.category)} — ${escapeHTML(report.id)}</h4>
        <p>📍 ${escapeHTML(report.location || "Campus")}</p>
        <p>${escapeHTML(report.name)} · ${escapeHTML(report.createdAt ? formatDate(report.createdAt) : "")}</p>
        <p>${escapeHTML(report.description)}</p>
      </div>
      <div class="complaint-meta">
        <span class="status ${statusClass(report.status)}">
          ${escapeHTML(report.status)}
        </span>
        ${isTeacher && report.status !== "Emergency Alert" ? `
          <select class="status-select" data-id="${escapeHTML(report.id)}"
            aria-label="Update status for ${escapeHTML(report.id)}">
            ${["Pending", "In Progress", "Resolved"].map(s =>
              `<option value="${s}" ${report.status === s ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>` : ""}
      </div>
    </article>
  `).join("");
}

function createReport(data) {
  const reports = getReports();
  const report = {
    id: generateId(),
    name: data.name,
    studentId: data.studentId || "",
    role: data.role || "Student",
    category: data.category,
    location: data.location,
    description: data.description,
    status: data.status || "Pending",
    createdAt: new Date().toISOString()
  };

  reports.push(report);
  saveReports(reports);
  refreshDashboard();
  return report;
}

// Mobile navigation
$("menuToggle").addEventListener("click", () => {
  $("navLinks").classList.toggle("open");
});

document.querySelectorAll("#navLinks a").forEach(link => {
  link.addEventListener("click", () => {
    $("navLinks").classList.remove("open");
  });
});

// Smooth scroll to report form from service cards
document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    $("category").value = button.dataset.category;
    $("report").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("studentName").focus({ preventScroll: true }), 500);
  });
});

// Complaint submission
$("complaintForm").addEventListener("submit", event => {
  event.preventDefault();

  const report = createReport({
    name: $("studentName").value.trim(),
    studentId: $("studentId").value.trim(),
    role: $("userRole").value,
    category: $("category").value,
    location: $("location").value.trim(),
    description: $("description").value.trim()
  });

  $("complaintForm").reset();

  $("trackId").value = report.id;
  $("trackResult").innerHTML = `
    <div class="result-card">
      <strong>✓ Complaint submitted successfully!</strong>
      <p>Your complaint ID: <strong>${escapeHTML(report.id)}</strong></p>
      <p>Save this ID to track your complaint later.</p>
    </div>`;

  $("track").scrollIntoView({ behavior: "smooth" });
  showToast("Complaint registered: " + report.id);
});

// Complaint tracking
$("trackForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("trackId").value.trim().toUpperCase();
  const report = getReports().find(r => r.id.toUpperCase() === id);

  if (!report) {
    $("trackResult").innerHTML = `
      <div class="result-card">
        <strong>Complaint not found</strong>
        <p>Check the complaint ID and try again on this device.</p>
      </div>`;
    return;
  }

  $("trackResult").innerHTML = `
    <div class="result-card">
      <strong>${escapeHTML(report.category)} · ${escapeHTML(report.id)}</strong>
      <p><strong>Status:</strong>
        <span class="status ${statusClass(report.status)}">
          ${escapeHTML(report.status)}
        </span>
      </p>
      <p><strong>Location:</strong> ${escapeHTML(report.location)}</p>
      <p><strong>Description:</strong> ${escapeHTML(report.description)}</p>
      <p><strong>Submitted:</strong> ${escapeHTML(formatDate(report.createdAt))}</p>
    </div>`;
});

$("refreshBtn").addEventListener("click", () => {
  refreshDashboard();
  showToast("Dashboard refreshed");
});

// Demo login
function openLogin() {
  $("loginModal").classList.add("open");
  $("loginModal").setAttribute("aria-hidden", "false");
}

function closeLogin() {
  $("loginModal").classList.remove("open");
  $("loginModal").setAttribute("aria-hidden", "true");
}

$("loginOpen").addEventListener("click", openLogin);
$("loginClose").addEventListener("click", closeLogin);

$("loginModal").addEventListener("click", event => {
  if (event.target === $("loginModal")) closeLogin();
});

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const user = {
    name: $("loginName").value.trim(),
    role: $("loginRole").value
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  closeLogin();
  updateLoginButton();
  refreshDashboard();

  showToast(
    user.role === "Teacher"
      ? "Teacher demo mode enabled"
      : "Student demo mode enabled"
  );
});

function updateLoginButton() {
  const user = getUser();
  $("loginOpen").textContent = user
    ? `${user.name} · ${user.role} ↗`
    : "Sign In";
}

// Teacher status updates
$("complaintList").addEventListener("change", event => {
  const select = event.target.closest(".status-select");
  if (!select) return;

  const user = getUser();

  if (user?.role !== "Teacher") {
    showToast("Sign in using Teacher / Admin demo mode first");
    refreshDashboard();
    return;
  }

  const reports = getReports();
  const report = reports.find(r => r.id === select.dataset.id);

  if (!report) return;

  report.status = select.value;
  saveReports(reports);
  refreshDashboard();
  showToast("Complaint status updated");
});

// Emergency alert recording (local demo only)
$("emergencyBtn").addEventListener("click", () => {
  const confirmed = confirm(
    "Record a demo emergency alert on this device?\n\n" +
    "This does not contact campus security or emergency services."
  );

  if (!confirmed) return;

  const report = createReport({
    name: getUser()?.name || "Campus User",
    role: getUser()?.role || "Student",
    category: "Safety Concern",
    location: "Location not provided",
    description: "Emergency alert recorded through the demo interface.",
    status: "Emergency Alert"
  });

  $("trackId").value = report.id;
  $("trackResult").innerHTML = `
    <div class="result-card">
      <strong>⚠ Demo alert recorded</strong>
      <p>Reference ID: <strong>${escapeHTML(report.id)}</strong></p>
      <p>This alert is stored locally only. It has NOT been sent to college staff.</p>
    </div>`;

  $("track").scrollIntoView({ behavior: "smooth" });
  showToast("Demo alert recorded");
});

// Scroll reveal animations
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(element => {
    observer.observe(element);
  });
} else {
  document.querySelectorAll(".reveal").forEach(element => {
    element.classList.add("visible");
  });
}

// Footer year and live clock
$("year").textContent = new Date().getFullYear();

function updateClock() {
  $("liveClock").textContent = new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

updateClock();
setInterval(updateClock, 30000);

updateLoginButton();
refreshDashboard();