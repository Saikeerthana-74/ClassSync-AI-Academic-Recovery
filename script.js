/* ========== GLOBAL ========== */
let currentUser = "";
let currentRole = "";
let currentUserId = null;
let currentDisplayName = "";
let particlesRafId = null;
let resizeHandler = null;

// Single-class hackathon scope (production would be multi-tenant)
const CLASS_ID = "default";

// Realtime DB caches
let data = []; // flattened recovery items {id, student, topic, date, status, difficulty}
let recoverySummary = {}; // { [studentKey]: { pendingCount } }
let attendanceToday = {}; // { [studentKey]: { present: boolean } }

function el(id) {
  return document.getElementById(id);
}

/* ========== TEACHER ENTERPRISE ROSTER ========== */
const TEACHER_FILTER = {
  section: "ALL",
  attendance: "ALL",
  recovery: "ALL",
};

const ROSTER_FIRST_NAMES = [
  "Arjun", "Aditya", "Rohan", "Siddharth", "Vivek", "Dhruv", "Karan", "Kabir", "Nitin",
  "Rahul", "Harsh", "Sahil", "Tejas", "Pranav", "Kunal", "Manav", "Parth", "Ishan",
  "Rudra", "Yash", "Neil", "Rohit", "Anirudh", "Varun", "Shaurya", "Mihir", "Omkar",
  "Aditi", "Priya", "Ananya", "Kavya", "Meera", "Sneha", "Shruti", "Ishita", "Tanvi",
  "Nikita", "Radhika", "Riya", "Diya", "Sana", "Navya", "Pooja", "Shreya", "Ira",
  "Neha", "Swati", "Varsha", "Mitali", "Ritika", "Simran", "Aishwarya", "Divya",
];

const ROSTER_LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Reddy", "Rao", "Nair", "Kapoor", "Agarwal", "Choudhary",
  "Mehta", "Jain", "Patel", "Singh", "Khan", "Deshmukh", "Mukherjee", "Iyer", "Pillai",
  "Bose", "Kulkarni", "Hegde", "Menon", "Krishnan", "Chopra", "Saxena", "Bansal",
  "Malhotra", "Khanna", "Bhatt", "Varma", "Subramaniam", "Nambiar", "George", "Mathew",
  "Fernandes", "D'Souza", "Chakraborty", "Banerjee", "Sen", "Das", "Ghosh", "Tripathi",
];

const ROSTER_SECTIONS = [
  { code: "CSE-A", rollPrefix: "BN22CSA" },
  { code: "CSE-B", rollPrefix: "BN22CSB" },
  { code: "AI&DS", rollPrefix: "BN22ADS" },
  { code: "ECE", rollPrefix: "BN22ECE" },
];

const ROSTER_PER_SECTION = 32;
const AVATAR_ACCENTS = ["acc-a", "acc-b", "acc-c", "acc-d", "acc-e", "acc-f", "acc-g", "acc-h"];

let collegeRosterCache = null;
let teacherEnterpriseBound = false;
let teacherFilterChipsBuilt = false;

function hashStable(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function isPresentToday(studentKey, dateStr) {
  // If realtime attendance exists, trust it; else fall back to deterministic seed.
  const rt = attendanceToday?.[studentKey];
  if (rt && typeof rt.present === "boolean") return rt.present;
  const h = hashStable(`${studentKey}|${dateStr}|classsync`);
  return h % 100 >= 12;
}

function recoveryPendingCount(studentKey) {
  const s = recoverySummary?.[studentKey];
  if (s && typeof s.pendingCount === "number") return s.pendingCount;
  return data.filter((d) => d.student === studentKey && d.status === "pending")
    .length;
}

function isHighPriorityStudent(studentKey) {
  return recoveryPendingCount(studentKey) >= 2;
}

function buildCollegeRoster() {
  const usedKeys = new Set();
  const roster = [];
  const dateStr = todayDateKey();

  ROSTER_SECTIONS.forEach((sec, sIdx) => {
    for (let n = 1; n <= ROSTER_PER_SECTION; n++) {
      let fn;
      let ln;
      let displayName;
      let key;
      let attempts = 0;

      do {
        const i = sIdx * 199 + n * 17 + attempts * 23;
        fn = ROSTER_FIRST_NAMES[i % ROSTER_FIRST_NAMES.length];
        ln = ROSTER_LAST_NAMES[(i * 3 + sIdx * 11 + attempts) % ROSTER_LAST_NAMES.length];
        displayName = `${fn} ${ln}`;
        key = displayName.toLowerCase();
        attempts++;
      } while (usedKeys.has(key) && attempts < 80);

      usedKeys.add(key);
      const rollNo = `${sec.rollPrefix}${String(n).padStart(3, "0")}`;
      const presentToday = isPresentToday(key, dateStr);

      roster.push({
        key,
        displayName,
        roll: rollNo,
        section: sec.code,
        presentToday,
      });
    }
  });

  return roster;
}

function getCollegeRoster() {
  if (!collegeRosterCache) {
    collegeRosterCache = buildCollegeRoster();
  }
  return collegeRosterCache;
}

function resolveRosterKeyForStudent({ nameLower, roll, section }) {
  const r = (roll || "").trim().toUpperCase();
  const s = (section || "").trim();
  if (r && s) {
    const match = getCollegeRoster().find(
      (x) => x.roll.toUpperCase() === r && x.section === s
    );
    if (match) return match.key;
  }
  return nameLower;
}

function initialsFromName(name) {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function applyChipActive(container, activeBtn) {
  container.querySelectorAll(".teacher-chip").forEach((b) => {
    b.classList.toggle("teacher-chip--active", b === activeBtn);
  });
}

function buildFilterButtons(container, items, filterKey) {
  container.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "teacher-chip";
    btn.dataset.filterKey = filterKey;
    btn.dataset.value = item.value;
    btn.textContent = item.label;
    if (TEACHER_FILTER[filterKey] === item.value) {
      btn.classList.add("teacher-chip--active");
    }
    container.appendChild(btn);
  });
}

function syncTeacherChipUI() {
  [
    ["teacherSectionFilters", "section"],
    ["teacherAttendanceFilters", "attendance"],
    ["teacherRecoveryFilters", "recovery"],
  ].forEach(([hostId, fk]) => {
    const container = el(hostId);
    if (!container) return;
    const val = TEACHER_FILTER[fk];
    container.querySelectorAll("button[data-value]").forEach((b) => {
      b.classList.toggle("teacher-chip--active", b.dataset.value === val);
    });
  });
}

function initTeacherFilterChips() {
  if (teacherFilterChipsBuilt) return;
  teacherFilterChipsBuilt = true;

  const secHost = el("teacherSectionFilters");
  const attHost = el("teacherAttendanceFilters");
  const recHost = el("teacherRecoveryFilters");
  if (!secHost || !attHost || !recHost) return;

  buildFilterButtons(
    secHost,
    [
      { value: "ALL", label: "All sections" },
      { value: "CSE-A", label: "CSE-A" },
      { value: "CSE-B", label: "CSE-B" },
      { value: "AI&DS", label: "AI&DS" },
      { value: "ECE", label: "ECE" },
    ],
    "section"
  );

  buildFilterButtons(
    attHost,
    [
      { value: "ALL", label: "All" },
      { value: "present", label: "Present" },
      { value: "absent", label: "Absent" },
    ],
    "attendance"
  );

  buildFilterButtons(
    recHost,
    [
      { value: "ALL", label: "All learners" },
      { value: "high", label: "High-priority recovery" },
    ],
    "recovery"
  );
}

function ensureTeacherEnterpriseBindings() {
  if (teacherEnterpriseBound) return;
  const teacherRoot = el("teacherSection");
  if (!teacherRoot) return;
  teacherEnterpriseBound = true;

  const onChipClick = (ev) => {
    const attBtn = ev.target.closest("button[data-att-toggle]");
    if (attBtn && teacherRoot.contains(attBtn)) {
      const studentKey = attBtn.dataset.attToggle;
      if (!studentKey) return;
      const dateStr = todayDateKey();
      const current = attendanceToday?.[studentKey]?.present;
      const next = typeof current === "boolean" ? !current : !isPresentToday(studentKey, dateStr);
      classDbRef(`attendance/${dateStr}/${studentKey}`).update({
        present: next,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        updatedBy: currentUserId || null,
      });
      return;
    }

    const btn = ev.target.closest("button[data-filter-key]");
    if (!btn || !teacherRoot.contains(btn)) return;
    const fk = btn.dataset.filterKey;
    const val = btn.dataset.value;
    if (!fk || val == null) return;
    if (!["section", "attendance", "recovery"].includes(fk)) return;
    TEACHER_FILTER[fk] = val;
    const grp = btn.parentElement;
    if (grp) applyChipActive(grp, btn);
    renderTeacherStudentList();
  };

  teacherRoot.addEventListener("click", onChipClick);

  const search = el("teacherSearch");
  if (search) {
    let tid = null;
    search.addEventListener("input", () => {
      clearTimeout(tid);
      tid = setTimeout(() => renderTeacherStudentList(), 160);
    });
  }

  const list = el("students");
  if (list) {
    list.addEventListener("change", updateTeacherSelectionMetrics);
  }
}

function rosterRowMatchesFilters(row, qNorm) {
  if (TEACHER_FILTER.section !== "ALL" && row.section !== TEACHER_FILTER.section) {
    return false;
  }
  if (TEACHER_FILTER.attendance === "present" && !row.presentToday) {
    return false;
  }
  if (TEACHER_FILTER.attendance === "absent" && row.presentToday) {
    return false;
  }
  if (TEACHER_FILTER.recovery === "high" && !isHighPriorityStudent(row.key)) {
    return false;
  }
  if (qNorm) {
    const blob = `${row.displayName} ${row.roll} ${row.section}`.toLowerCase();
    if (!blob.includes(qNorm)) return false;
  }
  return true;
}

function renderTeacherStudentList() {
  const host = el("students");
  if (!host) return;

  const q = el("teacherSearch")?.value.trim().toLowerCase() ?? "";
  const roster = getCollegeRoster();

  host.innerHTML = "";
  let visible = 0;

  roster.forEach((row, idx) => {
    if (!rosterRowMatchesFilters(row, q)) return;
    visible++;

    const lbl = document.createElement("label");
    lbl.className = "teacher-roster-card";
    lbl.setAttribute("role", "listitem");
    lbl.style.setProperty(
      "--roster-accent",
      row.section === "ECE"
        ? "rgba(236, 72, 153, 0.4)"
        : row.section.includes("AI")
          ? "rgba(34, 211, 238, 0.42)"
          : "rgba(124, 108, 255, 0.42)"
    );

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "teacher-roster-card__chk";
    chk.value = row.key;
    chk.setAttribute("aria-label", `Select ${row.displayName} for recovery queue`);

    const body = document.createElement("div");
    body.className = "teacher-roster-card__body";

    const identity = document.createElement("div");
    identity.className = "teacher-roster-card__identity";

    const av = document.createElement("div");
    av.className = `teacher-roster-card__avatar ${AVATAR_ACCENTS[idx % AVATAR_ACCENTS.length]}`;
    av.textContent = initialsFromName(row.displayName);

    const nameRoll = document.createElement("div");
    nameRoll.className = "teacher-roster-card__name-roll";
    const nameEl = document.createElement("span");
    nameEl.className = "teacher-roster-card__name";
    nameEl.textContent = row.displayName;
    const rollEl = document.createElement("span");
    rollEl.className = "teacher-roster-card__roll";
    rollEl.textContent = row.roll;
    nameRoll.appendChild(nameEl);
    nameRoll.appendChild(rollEl);

    identity.appendChild(av);
    identity.appendChild(nameRoll);

    const meta = document.createElement("div");
    meta.className = "teacher-roster-card__meta";

    const secBadge = document.createElement("span");
    secBadge.className = "teacher-roster-badge teacher-roster-badge--section";
    secBadge.textContent = row.section;

    const attBadge = document.createElement("button");
    attBadge.type = "button";
    attBadge.dataset.attToggle = row.key;
    attBadge.className = row.presentToday
      ? "teacher-roster-badge teacher-roster-badge--present"
      : "teacher-roster-badge teacher-roster-badge--absent";
    attBadge.textContent = row.presentToday ? "Present" : "Absent";

    meta.appendChild(secBadge);
    meta.appendChild(attBadge);

    if (isHighPriorityStudent(row.key)) {
      const pr = document.createElement("span");
      pr.className = "teacher-roster-badge teacher-roster-badge--priority";
      pr.textContent = "High recovery";
      meta.appendChild(pr);
    }

    body.appendChild(identity);
    body.appendChild(meta);

    lbl.appendChild(chk);
    lbl.appendChild(body);
    host.appendChild(lbl);
  });

  const visEl = el("teacherMetricVisible");
  if (visEl) visEl.textContent = String(visible);

  if (visible === 0) {
    const empty = document.createElement("p");
    empty.className = "teacher-enterprise__empty";
    empty.textContent =
      "No learners match your search or filters. Adjust filters or clear the search box.";
    host.appendChild(empty);
  }

  updateTeacherSelectionMetrics();
}

function updateTeacherSelectionMetrics() {
  const selected = document.querySelectorAll("#students .teacher-roster-card__chk:checked");
  const elSel = el("teacherMetricSelected");
  if (elSel) elSel.textContent = String(selected.length);
}

function clearTeacherSelections() {
  document.querySelectorAll("#students .teacher-roster-card__chk").forEach((c) => {
    c.checked = false;
  });
  updateTeacherSelectionMetrics();
}

let teacherRealtimeBound = false;
let teacherRealtimeDate = null;
let studentRealtimeKey = null;

function classDbRef(path) {
  return firebase.database().ref(`classes/${CLASS_ID}/${path}`);
}

function seedRosterToFirebase() {
  const roster = getCollegeRoster();
  const payload = {};
  roster.forEach((r) => {
    payload[`roster/${r.key}`] = {
      displayName: r.displayName,
      roll: r.roll,
      section: r.section,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    };
  });
  return classDbRef("").update(payload).catch(() => {});
}

function bindTeacherRealtime() {
  const dateStr = todayDateKey();
  if (teacherRealtimeBound && teacherRealtimeDate === dateStr) return;
  teacherRealtimeBound = true;
  teacherRealtimeDate = dateStr;

  // Roster seed (idempotent)
  seedRosterToFirebase();

  classDbRef(`attendance/${dateStr}`).on("value", (snap) => {
    attendanceToday = snap.val() || {};
    renderTeacherStudentList();
  });

  classDbRef("recoverySummary").on("value", (snap) => {
    recoverySummary = snap.val() || {};
    renderTeacherStudentList();
  });
}

function bindStudentRealtime() {
  if (!currentUser) return;
  if (studentRealtimeKey === currentUser) return;
  studentRealtimeKey = currentUser;

  // Listen only to this student's queue (scales well)
  classDbRef(`recoveryQueue/${currentUser}`).on("value", (snap) => {
    const obj = snap.val() || {};
    const flat = [];
    Object.entries(obj).forEach(([id, item]) => {
      flat.push({
        id,
        student: currentUser,
        topic: item.topic,
        date: item.date,
        status: item.status,
        difficulty: item.difficulty ?? 2,
      });
    });
    // newest first
    flat.sort((a, b) => (a.date < b.date ? 1 : -1));
    data = flat;
    displayData();
  });

  classDbRef(`recoverySummary/${currentUser}`).on("value", (snap) => {
    recoverySummary[currentUser] = snap.val() || { pendingCount: 0 };
    displayData();
  });
}

function initTeacherEnterprisePanel() {
  initTeacherFilterChips();
  syncTeacherChipUI();
  ensureTeacherEnterpriseBindings();
  bindTeacherRealtime();
  renderTeacherStudentList();
  const log = el("log");
  if (log) log.textContent = "";
}

/* ========== LANDING EFFECTS ========== */
function setupParticles() {
  const canvas = el("particles");
  if (!canvas) return;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  const dots = [];

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(80, (w * h) / 22000));
    dots.length = 0;
    for (let i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + Math.random() * 1.6,
        vx: (-0.5 + Math.random()) * 0.18,
        vy: (-0.5 + Math.random()) * 0.18,
        a: 0.15 + Math.random() * 0.55,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    dots.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      const tw = p.a + Math.sin(p.pulse) * 0.12;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      g.addColorStop(0, `rgba(159,178,255,${tw})`);
      g.addColorStop(0.35, `rgba(124,108,255,${tw * 0.5})`);
      g.addColorStop(1, "rgba(10,15,35,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(220,228,255,${tw * 0.45})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    particlesRafId = requestAnimationFrame(tick);
  }

  resize();
  tick();

  resizeHandler = () => {
    resize();
  };
  window.addEventListener("resize", resizeHandler);
}

function setupGlassCardGlow() {
  const selectors = ".glass-card--role, .feature-spotlight__card";
  document.querySelectorAll(selectors).forEach((card) => {
    if (card.dataset.boundSpotlightGlow === "1") return;
    card.dataset.boundSpotlightGlow = "1";

    card.addEventListener("mousemove", (ev) => {
      const rect = card.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--sx", `${x}%`);
      card.style.setProperty("--sy", `${y}%`);
    });

    if (card.classList.contains("glass-card--role")) {
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          card.click();
        }
      });
    }
  });
}

function teardownParticles() {
  if (particlesRafId !== null) {
    cancelAnimationFrame(particlesRafId);
    particlesRafId = null;
  }
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
}

/* ========== INIT ========== */
document.addEventListener("DOMContentLoaded", () => {
  const teacherCard = el("teacherCard");
  const studentCard = el("studentCard");

  if (teacherCard) {
    teacherCard.onclick = () => openLogin("teacher");
  }
  if (studentCard) {
    studentCard.onclick = () => openLogin("student");
  }

  setupParticles();
  setupGlassCardGlow();

  // Auth persistence (session restore across refreshes)
  try {
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  } catch {
    // ignore (older browsers / blocked storage)
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      currentUserId = null;
      currentUser = "";
      currentRole = "";
      hideAll();
      const home = el("home");
      if (home) home.style.display = "block";
      setupParticles();
      return;
    }

    currentUserId = user.uid;
    firebase
      .database()
      .ref("users/" + user.uid)
      .on("value", (snapshot) => {
        const userData = snapshot.val();
        if (!userData) return;
        currentRole = userData.role;
        currentDisplayName = (userData.name || "").toString();
        currentUser =
          (userData.rosterKey || userData.name || "").toString().toLowerCase();
        showUserSection();
      });
  });
});

function closeLoginPopup() {
  const popup = el("loginPopup");
  const home = el("home");
  if (popup) popup.style.display = "none";
  if (home) home.style.display = "block";
}

function openLogin(role) {
  currentRole = role;
  const input = el("loginName");
  if (input) {
    input.value = "";
    input.placeholder = role === "teacher" ? "Teacher name…" : "Student name…";
  }
  const extra = el("studentExtraFields");
  if (extra) extra.style.display = role === "student" ? "block" : "none";
  if (role !== "student") {
    const r = el("studentRoll");
    const s = el("studentSection");
    if (r) r.value = "";
    if (s) s.value = "";
  }
  const popup = el("loginPopup");
  if (popup) popup.style.display = "flex";
}

function signupUser() {
  const name = el("loginName")?.value.trim() ?? "";
  const email = el("email")?.value.trim() ?? "";
  const password = el("password")?.value.trim() ?? "";
  const studentRoll = el("studentRoll")?.value.trim() ?? "";
  const studentSection = el("studentSection")?.value ?? "";

  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      const nameLower = name.toLowerCase();
      const rosterKey =
        currentRole === "student"
          ? resolveRosterKeyForStudent({
              nameLower,
              roll: studentRoll,
              section: studentSection,
            })
          : nameLower;

      if (currentRole === "student" && (!studentRoll || !studentSection)) {
        throw new Error("Student sign up requires roll number and section.");
      }

      return firebase.database().ref("users/" + uid).set({
        name,
        role: currentRole,
        email,
        rosterKey,
        studentProfile:
          currentRole === "student"
            ? { roll: studentRoll.toUpperCase(), section: studentSection }
            : null,
        createdAt: new Date().toISOString(),
      });
    })
    .then(() => {
      alert("Account created successfully.");
      closeLoginPopup();
    })
    .catch((error) => {
      alert(error.message);
    });
}

function loginUser() {
  const email = el("email")?.value.trim() ?? "";
  const password = el("password")?.value.trim() ?? "";

  if (!email || !password) {
    alert("Enter email & password");
    return;
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      currentUserId = userCredential.user.uid;
      return firebase.database().ref("users/" + currentUserId).once("value");
    })
    .then((snapshot) => {
      const userData = snapshot.val();

      if (!userData) {
        alert("User profile not found. Please sign up again.");
        firebase.auth().signOut();
        return;
      }

      currentUser = userData.name.toLowerCase();
      currentRole = userData.role;

      closeLoginPopup();
      showUserSection();
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
}

function safeHide(id) {
  const node = el(id);
  if (node) node.style.display = "none";
}

function hideAll() {
  teardownParticles();
  safeHide("home");
  safeHide("teacherSection");
  safeHide("studentSection");
  safeHide("planSection");
  safeHide("quizPopup");
}

function showUserSection() {
  hideAll();

  if (currentRole === "teacher") {
    const section = el("teacherSection");
    if (section) section.style.display = "block";
    initTeacherEnterprisePanel();
  } else {
    const section = el("studentSection");
    if (section) section.style.display = "block";

    const nameEl = el("studentName");
    if (nameEl) {
      const nm = currentDisplayName || currentUser || "";
      nameEl.innerText = nm ? nm : "Student";
    }

    bindStudentRealtime();
    displayData();
  }
}

function goHome() {
  firebase.auth().signOut();
  hideAll();

  const home = el("home");
  if (home) home.style.display = "block";

  setupParticles();
}

function backToDashboard() {
  safeHide("planSection");

  const section = el("studentSection");
  if (section) section.style.display = "block";

  displayData();
}

function getDifficulty(topic) {
  const t = topic.toLowerCase();
  if (t.includes("basics")) return 1;
  if (t.includes("advanced")) return 3;
  return 2;
}

function markAbsent() {
  const topicInput = el("topic");
  const topic = topicInput?.value.trim() ?? "";
  const selected = document.querySelectorAll("#students input:checked");

  if (!topic || selected.length === 0) {
    alert("Enter a topic and select at least one learner from the roster.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const updates = {};
  const difficulty = getDifficulty(topic);
  selected.forEach((cb) => {
    const studentKey = cb.value.toLowerCase();
    const id = firebase.database().ref().push().key;
    updates[`recoveryQueue/${studentKey}/${id}`] = {
      topic,
      date: today,
      status: "pending",
      difficulty,
      createdBy: currentUserId || null,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    };
  });

  classDbRef("").update(updates).then(() => {
    // Update summary counts (best-effort, eventually consistent)
    selected.forEach((cb) => {
      const studentKey = cb.value.toLowerCase();
      classDbRef(`recoverySummary/${studentKey}/pendingCount`).transaction(
        (n) => (typeof n === "number" ? n + 1 : 1)
      );
    });

    const log = el("log");
    if (log) {
      log.textContent = `Recovery queue updated for ${selected.length} learner${selected.length === 1 ? "" : "s"}.`;
    }
    clearTeacherSelections();
    renderTeacherStudentList();
  }).catch((err) => {
    alert("Failed to sync to Firebase: " + (err?.message || err));
  });
}

function displayData() {
  const list = el("bucket");
  if (!list) return;
  list.innerHTML = "";

  const filtered = data.filter((d) => d.student === currentUser);
  const pending = filtered.filter((d) => d.status === "pending");

  const countEl = el("count");
  const daysEl = el("days");
  if (countEl) countEl.innerText = pending.length;
  if (daysEl) daysEl.innerText = String(Math.ceil(pending.length / 2));

  if (pending.length === 0) {
    list.innerHTML = "<li>No missed topics right now.</li>";
    return;
  }

  pending.forEach((item) => {
    const li = document.createElement("li");
    const topicLabel = document.createElement("span");
    topicLabel.textContent = `${item.topic} (${item.date}) `;
    li.appendChild(topicLabel);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Done";
    btn.style.marginLeft = "8px";
    btn.addEventListener("click", () => markComplete(item.topic));
    li.appendChild(btn);

    list.appendChild(li);
  });
}

function markComplete(topicName) {
  const item = data.find(
    (d) =>
      d.student === currentUser &&
      d.topic === topicName &&
      d.status === "pending"
  );

  if (!item) return;

  classDbRef(`recoveryQueue/${currentUser}/${item.id}`)
    .update({
      status: "completed",
      completedAt: firebase.database.ServerValue.TIMESTAMP,
    })
    .then(() => {
      classDbRef(`recoverySummary/${currentUser}/pendingCount`).transaction(
        (n) => {
          if (typeof n !== "number") return 0;
          return Math.max(0, n - 1);
        }
      );
    })
    .catch((err) => {
      alert("Failed to update: " + (err?.message || err));
    });
}

function generatePlanFromUI() {
  const filtered = data.filter(
    (d) => d.student === currentUser && d.status === "pending"
  );

  if (filtered.length === 0) {
    alert("No topics available.");
    return;
  }

  filtered.sort((a, b) => a.difficulty - b.difficulty);
  const topics = filtered.map((d) => d.topic);

  hideAll();

  const planSection = el("planSection");
  const container = el("planContainer");

  if (planSection) planSection.style.display = "block";
  if (!container) return;

  container.innerHTML = "";

  const headerCard = document.createElement("div");
  headerCard.className = "feature main";
  headerCard.innerHTML = `
    <h3>Smart recovery plan</h3>
    <p>${topics.length}-day roadmap · adaptive pacing</p>
  `;
  container.appendChild(headerCard);

  topics.forEach((topic, index) => {
    const card = document.createElement("div");
    card.className = "feature";
    card.innerHTML = `
      <h4>Day ${index + 1}</h4>
      <p>${topic}</p>
    `;
    container.appendChild(card);
  });
}

/* ========== FEATURE STUBS (extend as needed) ========== */
function startQuiz() {
  alert("Quick quiz module — connect your question bank or API next.");
}

function openExplain() {
  alert("Simple explanations — tie this to your LLM or syllabus notes.");
}

function openProgress() {
  alert("Progress analytics — visualize streaks and completion here.");
}
