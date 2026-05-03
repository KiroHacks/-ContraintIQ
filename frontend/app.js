// ─── Mock Issue Data ──────────────────────────────────────────────────────────
const MOCK_ISSUES = [
  {
    id: 1,
    title: "Missing Hole-to-Edge Dimension",
    severity: "high",
    category: "Missing Dimension",
    location: { x: "28%", y: "34%" },
    description:
      "The left mounting hole (Ø0.375) has no dimension specifying its distance from the left or bottom edge. Manufacturers cannot locate this feature without assuming a reference.",
    fix: "Add a horizontal dimension from the left edge to the hole centerline, and a vertical dimension from the bottom edge. Reference datum A as the primary locating surface.",
    costImpact: "High — likely RFI or incorrect placement",
    rfiRisk: "Very Likely",
  },
  {
    id: 2,
    title: "Ambiguous GD&T Datum Reference",
    severity: "high",
    category: "GD&T Issue",
    location: { x: "28%", y: "46%" },
    description:
      "The position callout ⌀0.005 references datum A, but datum A is not defined anywhere on the drawing. Without a datum feature symbol, the tolerance zone has no anchor.",
    fix: "Add a datum feature symbol 'A' to the primary locating surface (likely the bottom face). Ensure the datum reference frame is fully defined per ASME Y14.5-2018 §4.",
    costImpact: "High — tolerance cannot be inspected",
    rfiRisk: "Certain",
  },
  {
    id: 3,
    title: "Slot Width Tolerance Not Specified",
    severity: "medium",
    category: "Missing Tolerance",
    location: { x: "44%", y: "62%" },
    description:
      "The center slot shows a nominal width of 0.750 but carries no tolerance. The title block general tolerance (±0.010) may be insufficient for a mating slot feature.",
    fix: "Add an explicit bilateral tolerance to the slot width (e.g., 0.750 ±0.005). If this is a clearance fit, specify the fit class per ANSI B4.1.",
    costImpact: "Medium — potential fit issue at assembly",
    rfiRisk: "Likely",
  },
  {
    id: 4,
    title: "Surface Finish Not Called Out",
    severity: "medium",
    category: "Manufacturability",
    location: { x: "72%", y: "34%" },
    description:
      "The right mounting hole bore has no surface finish symbol. For a precision bore intended to accept a shoulder bolt, Ra should be specified to ensure proper seating.",
    fix: "Add a surface finish callout (e.g., Ra 1.6 µm / 63 µin) to the bore surface. Use the ASME Y14.36 surface texture symbol.",
    costImpact: "Medium — may require rework or re-inspection",
    rfiRisk: "Possible",
  },
  {
    id: 5,
    title: "Overall Height Dimension Missing",
    severity: "medium",
    category: "Missing Dimension",
    location: { x: "82%", y: "50%" },
    description:
      "The part height (vertical extent) is not dimensioned in the front view. Only the width (4.250) is shown. A manufacturer must infer height from the scale or a secondary view.",
    fix: "Add a vertical dimension to the front view showing the overall height of the part. Verify it matches the 3D model nominal.",
    costImpact: "Medium — part may be quoted at wrong stock size",
    rfiRisk: "Likely",
  },
  {
    id: 6,
    title: "No Material Callout on Drawing Field",
    severity: "low",
    category: "Documentation",
    location: { x: "50%", y: "88%" },
    description:
      "Material is listed in the title block as '6061-T6 ALUM' but there is no note specifying the applicable material specification (e.g., AMS 2770 or ASTM B209).",
    fix: "Add a general note: 'MATERIAL: 6061-T6 PER AMS 2770 OR ASTM B209.' This prevents substitution with non-compliant alloy.",
    costImpact: "Low — documentation gap only",
    rfiRisk: "Unlikely",
  },
];

// ─── State ────────────────────────────────────────────────────────────────────
let activeIssueId    = null;
let analysisRun      = false;
let uploadedFileName = null;
let activePage       = "landing"; // "landing" | "dashboard"
let activeProjectFilename = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const fileInput          = document.getElementById("fileInput");
const uploadBtn          = document.getElementById("uploadBtn");
const heroUploadBtn      = document.getElementById("heroUploadBtn");
const analyzeBtn         = document.getElementById("analyzeBtn");
const navBrand           = document.getElementById("navBrand");
const backBtn            = document.getElementById("backBtn");
const navDashBtn         = document.getElementById("navDashBtn");
const gotoDashboardBtn   = document.getElementById("gotoDashboardBtn");
const viewAllBtn         = document.getElementById("viewAllBtn");
const dashUploadBtn      = document.getElementById("dashUploadBtn");
const dashEmptyUploadBtn = document.getElementById("dashEmptyUploadBtn");

const landingPage        = document.getElementById("landingPage");
const dashboardPage      = document.getElementById("dashboardPage");

const heroSection        = document.getElementById("heroSection");
const projectsSection    = document.getElementById("projectsSection");
const workspace          = document.getElementById("workspace");
const dashEmptyState     = document.getElementById("dashEmptyState");
const loadingOverlay     = document.getElementById("loadingOverlay");

const viewerFilename     = document.getElementById("viewerFilename");
const overlayContainer   = document.getElementById("overlayContainer");
const panelIssues        = document.getElementById("panelIssues");
const issueCountBadge    = document.getElementById("issueCountBadge");
const scoreValue         = document.getElementById("scoreValue");
const scoreArc           = document.getElementById("scoreArc");
const scoreLabel         = document.getElementById("scoreLabel");
const summaryChips       = document.getElementById("summaryChips");
const partName           = document.getElementById("partName");
const releaseStatus      = document.getElementById("releaseStatus");
const releaseStatusBadge = document.getElementById("releaseStatusBadge");

// Landing page project list
const projectsList       = document.getElementById("projectsList");
const projectsEmpty      = document.getElementById("projectsEmpty");
// Dashboard sidebar project list
const dashProjectList    = document.getElementById("dashProjectList");
const dashProjectEmpty   = document.getElementById("dashProjectEmpty");

// ─── Page routing ─────────────────────────────────────────────────────────────
function showLanding() {
  activePage = "landing";
  landingPage.style.display = "block";
  dashboardPage.style.display = "none";
  backBtn.style.display = "none";
  navDashBtn.classList.remove("nav-active");
  renderLandingProjects();
}

function showDashboard() {
  activePage = "dashboard";
  landingPage.style.display = "none";
  dashboardPage.style.display = "block";
  backBtn.style.display = "none";   // hide "Landing" button on dashboard
  navDashBtn.classList.add("nav-active");
  renderDashSidebar();
}

// ─── Navigation wiring ────────────────────────────────────────────────────────
navBrand.addEventListener("click", (e) => { e.preventDefault(); showLanding(); });
backBtn.addEventListener("click", () => showLanding());
navDashBtn.addEventListener("click", () => showDashboard());
gotoDashboardBtn.addEventListener("click", () => showDashboard());
viewAllBtn.addEventListener("click", () => showDashboard());

// ─── Upload wiring ────────────────────────────────────────────────────────────
function triggerUpload() { fileInput.click(); }

uploadBtn.addEventListener("click", triggerUpload);
heroUploadBtn.addEventListener("click", triggerUpload);
dashUploadBtn.addEventListener("click", triggerUpload);
dashEmptyUploadBtn.addEventListener("click", triggerUpload);

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploadedFileName = file.name;
  saveProject(file.name);
  fileInput.value = "";
  // Always route to dashboard and open the file
  showDashboard();
  openProjectInWorkspace(file.name);
});

analyzeBtn.addEventListener("click", () => {
  if (!analysisRun) runAnalysis();
});

// ─── Open a project in the workspace ─────────────────────────────────────────
function openProjectInWorkspace(filename) {
  activeProjectFilename = filename;
  viewerFilename.textContent = filename;
  partName.textContent = filename.replace(/\.[^.]+$/, "").toUpperCase().replace(/[-_]/g, " ");

  // Show workspace, hide empty state
  dashEmptyState.style.display = "none";
  workspace.style.display = "grid";

  analysisRun = false;
  clearResults();

  // Highlight active item in sidebar
  document.querySelectorAll(".dash-project-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.filename === filename);
  });
}

// ─── localStorage Projects ────────────────────────────────────────────────────
function saveProject(filename) {
  const projects = getProjects();
  const existing = projects.findIndex((p) => p.filename === filename);
  const entry = { filename, timestamp: Date.now(), status: "pending" };
  if (existing >= 0) {
    // preserve existing status when re-uploading same file
    entry.status = projects[existing].status || "pending";
    projects[existing] = entry;
  } else {
    projects.unshift(entry);
  }
  localStorage.setItem("ciq_projects", JSON.stringify(projects.slice(0, 10)));
}

function deleteProject(filename) {
  const projects = getProjects().filter((p) => p.filename !== filename);
  localStorage.setItem("ciq_projects", JSON.stringify(projects));
  // If the deleted project is currently open, reset workspace
  if (activeProjectFilename === filename) {
    activeProjectFilename = null;
    workspace.style.display = "none";
    dashEmptyState.style.display = "flex";
    clearResults();
  }
}

function setProjectStatus(filename, status) {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.filename === filename);
  if (idx >= 0) {
    projects[idx].status = status;
    localStorage.setItem("ciq_projects", JSON.stringify(projects));
  }
}

function getProjects() {
  try { return JSON.parse(localStorage.getItem("ciq_projects") || "[]"); }
  catch { return []; }
}

// Returns { label, cls } for a project status value
function statusMeta(status) {
  switch (status) {
    case "ready":    return { label: "Ready for Release",     cls: "proj-status-ready" };
    case "review":   return { label: "Needs Review",          cls: "proj-status-review" };
    case "blocked":  return { label: "Blocked",               cls: "proj-status-blocked" };
    default:         return { label: "Not Ready for Release", cls: "proj-status-not-ready" };
  }
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Render landing page project list ────────────────────────────────────────
function renderLandingProjects() {
  const projects = getProjects();
  document.querySelectorAll("#projectsList .project-item").forEach((el) => el.remove());

  if (!projects.length) {
    projectsEmpty.style.display = "flex";
    return;
  }
  projectsEmpty.style.display = "none";

  projects.forEach((p) => {
    const { label, cls } = statusMeta(p.status);
    const item = document.createElement("div");
    item.className = "project-item";
    item.innerHTML = `
      <div class="project-item-left">
        <svg class="project-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div>
          <div class="project-item-name">${p.filename}</div>
          <div class="project-item-time">Uploaded ${formatTimeAgo(p.timestamp)}</div>
          <span class="proj-status-badge ${cls}">${label}</span>
        </div>
      </div>
      <span class="project-item-arrow">›</span>`;
    item.addEventListener("click", () => {
      showDashboard();
      openProjectInWorkspace(p.filename);
    });
    projectsList.appendChild(item);
  });
}

// ─── Render dashboard sidebar ─────────────────────────────────────────────────
function renderDashSidebar() {
  const projects = getProjects();
  document.querySelectorAll("#dashProjectList .dash-project-item").forEach((el) => el.remove());

  if (!projects.length) {
    dashProjectEmpty.style.display = "flex";
    return;
  }
  dashProjectEmpty.style.display = "none";

  projects.forEach((p) => {
    const { label, cls } = statusMeta(p.status);
    const item = document.createElement("div");
    item.className = "dash-project-item";
    item.dataset.filename = p.filename;
    if (p.filename === activeProjectFilename) item.classList.add("active");

    item.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <div class="dash-project-item-body">
        <div class="dash-project-item-name">${p.filename}</div>
        <div class="dash-project-item-time">${formatTimeAgo(p.timestamp)}</div>
        <span class="proj-status-badge ${cls}">${label}</span>
      </div>
      <div class="dash-project-item-actions">
        <select class="proj-status-select" title="Change status" data-filename="${p.filename}">
          <option value="pending"  ${p.status === "pending"  ? "selected" : ""}>Not Ready</option>
          <option value="review"   ${p.status === "review"   ? "selected" : ""}>Needs Review</option>
          <option value="ready"    ${p.status === "ready"    ? "selected" : ""}>Ready</option>
          <option value="blocked"  ${p.status === "blocked"  ? "selected" : ""}>Blocked</option>
        </select>
        <button class="dash-delete-btn" title="Delete project" data-filename="${p.filename}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>`;

    // Click on the body area opens the project
    item.querySelector(".dash-project-item-body").addEventListener("click", () => {
      openProjectInWorkspace(p.filename);
    });
    item.querySelector("svg:first-child").addEventListener("click", () => {
      openProjectInWorkspace(p.filename);
    });

    // Status dropdown
    item.querySelector(".proj-status-select").addEventListener("change", (e) => {
      e.stopPropagation();
      setProjectStatus(p.filename, e.target.value);
      renderDashSidebar();
      renderLandingProjects();
    });

    // Delete button
    item.querySelector(".dash-delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${p.filename}"?`)) {
        deleteProject(p.filename);
        renderDashSidebar();
        renderLandingProjects();
      }
    });

    dashProjectList.appendChild(item);
  });
}

// ─── Analysis simulation ──────────────────────────────────────────────────────
function runAnalysis() {
  if (analysisRun) return;
  loadingOverlay.style.display = "flex";

  const steps = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3"),
    document.getElementById("step4"),
    document.getElementById("step5"),
  ];

  // Reset steps
  steps.forEach((s) => { s.className = "loading-step"; });
  steps[0].classList.add("active");

  let current = 0;
  const interval = setInterval(() => {
    if (current < steps.length) {
      steps[current].classList.remove("active");
      steps[current].classList.add("done");
      current++;
      if (current < steps.length) steps[current].classList.add("active");
    } else {
      clearInterval(interval);
      setTimeout(() => {
        loadingOverlay.style.display = "none";
        analysisRun = true;
        renderResults();
      }, 400);
    }
  }, 900);
}

// ─── Render results ───────────────────────────────────────────────────────────
function clearResults() {
  overlayContainer.innerHTML = "";
  panelIssues.innerHTML = `
    <div class="issues-placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>Run AI-assisted review to detect manufacturing risks</p>
    </div>`;
  issueCountBadge.textContent = "0 issues";
  scoreValue.textContent = "—";
  scoreLabel.textContent = "Awaiting review";
  summaryChips.innerHTML = "";
  scoreArc.style.strokeDashoffset = "150.8";
  scoreArc.style.stroke = "#f59e0b";
  releaseStatus.style.display = "none";
  activeIssueId = null;
}

function renderResults() {
  const issues = MOCK_ISSUES;

  // Count by severity
  const highCount   = issues.filter((i) => i.severity === "high").length;
  const medCount    = issues.filter((i) => i.severity === "medium").length;
  const lowCount    = issues.filter((i) => i.severity === "low").length;

  // Score: start at 100, deduct per issue
  const score = Math.max(0, 100 - highCount * 18 - medCount * 8 - lowCount * 3);
  const circumference = 150.8;
  const offset = circumference - (score / 100) * circumference;

  scoreValue.textContent = score;
  scoreArc.style.strokeDashoffset = offset;
  scoreArc.style.stroke = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  scoreLabel.textContent = score >= 70 ? "Acceptable" : score >= 45 ? "Needs Review" : "Critical Issues";

  issueCountBadge.textContent = `${issues.length} issue${issues.length !== 1 ? "s" : ""}`;

  // Release status
  releaseStatus.style.display = "block";
  if (score >= 70 && highCount === 0) {
    releaseStatusBadge.className = "release-status-badge ready";
    releaseStatusBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> READY FOR RELEASE`;
  } else {
    releaseStatusBadge.className = "release-status-badge not-ready";
    releaseStatusBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> NOT READY FOR RELEASE`;
  }

  // Summary chips
  summaryChips.innerHTML = `
    ${highCount ? `<span class="chip chip-high">● ${highCount} High</span>` : ""}
    ${medCount  ? `<span class="chip chip-medium">● ${medCount} Medium</span>` : ""}
    ${lowCount  ? `<span class="chip chip-low">● ${lowCount} Low</span>` : ""}
  `;

  // Overlays on drawing
  overlayContainer.innerHTML = "";
  issues.forEach((issue, idx) => {
    const dot = document.createElement("div");
    dot.className = "issue-overlay";
    dot.style.left = issue.location.x;
    dot.style.top  = issue.location.y;
    dot.innerHTML = `<div class="overlay-marker severity-${issue.severity}" data-id="${issue.id}">${idx + 1}</div>`;
    dot.addEventListener("click", () => selectIssue(issue.id));
    overlayContainer.appendChild(dot);
  });

  // Issue cards
  panelIssues.innerHTML = "";
  issues.forEach((issue, idx) => {
    const card = document.createElement("div");
    card.className = `issue-card severity-${issue.severity}`;
    card.dataset.id = issue.id;
    card.innerHTML = `
      <div class="issue-card-header">
        <span class="issue-title">${idx + 1}. ${issue.title}</span>
        <span class="issue-severity-tag tag-${issue.severity}">${issue.severity}</span>
      </div>
      <p class="issue-desc">${issue.description}</p>
      <div class="issue-meta">
        <span class="issue-meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          ${issue.category}
        </span>
        <span class="issue-meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          ${issue.costImpact}
        </span>
        <span class="issue-meta-item">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Supplier RFI Risk: ${issue.rfiRisk}
        </span>
      </div>
      <div class="issue-fix">
        <strong>Suggested Fix:</strong> ${issue.fix}
      </div>
    `;
    card.addEventListener("click", () => selectIssue(issue.id));
    panelIssues.appendChild(card);
  });

  // Select first issue automatically
  setTimeout(() => selectIssue(issues[0].id), 200);
}

// ─── Select issue ─────────────────────────────────────────────────────────────
function selectIssue(id) {
  activeIssueId = id;

  // Update cards
  document.querySelectorAll(".issue-card").forEach((c) => {
    c.classList.toggle("active", parseInt(c.dataset.id) === id);
  });

  // Update overlay markers
  document.querySelectorAll(".overlay-marker").forEach((m) => {
    m.classList.toggle("active", parseInt(m.dataset.id) === id);
  });

  // Scroll card into view
  const activeCard = document.querySelector(`.issue-card[data-id="${id}"]`);
  if (activeCard) activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
showLanding();
