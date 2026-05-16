/* =========================================
   CONFIG & GLOBAL VARIABLES
========================================= */
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyoJMMrNzST3TKi6_O0TvdE3UTPsfrJeVA4SN-LfqpnZarIbOQ2eO56zEdG49NhHxnxGw/exec";

let user = localStorage.getItem("jef_user_logged") || "";
let deferredPrompt = null;

/* =========================================
   DASHBOARD LOCAL STATE
========================================= */

let dashboardTasks = [];

let pendingChanges = {
  create: [],
  update: [],
  delete: [],
};

/* =========================================
   HELPER API (SHARED)
========================================= */
async function callAPI(payload) {
  const response = await fetch(WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "data=" + encodeURIComponent(JSON.stringify(payload)),
  });
  return await response.json();
}

function loader(text = "Loading...") {
  Swal.fire({
    title: text,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
}

/* =========================================
   NAVIGATION & UI UTILS (INDEX)
========================================= */
function nav(id) {
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const active = document.getElementById(id);
  if (active) {
    active.classList.add("active");
    active.style.display = "flex";
  }
}

function togglePassword() {
  const input = document.getElementById("p");
  const icon = document.querySelector(".toggle-password i");
  if (input.type === "password") {
    input.type = "text";
    icon.className = "bi bi-eye-slash-fill";
  } else {
    input.type = "password";
    icon.className = "bi bi-eye-fill";
  }
}

function updateDateTime() {
  const now = new Date();
  const currentDate = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const currentTime = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateEl = document.getElementById("currentDate");
  const clockEl = document.getElementById("liveClock");
  if (dateEl) dateEl.innerText = currentDate;
  if (clockEl) clockEl.innerText = currentTime;
}

// function initTimePicker() {
//     document.querySelectorAll(".timepicker").forEach((el) => {
//         if (el._flatpickr) return;
//         flatpickr(el, {
//             enableTime: true,
//             noCalendar: true,
//             dateFormat: "H:i",
//             time_24hr: true,
//             minuteIncrement: 5,
//             disableMobile: true,
//         });
//     });
// }

function initTimePicker() {
  document.querySelectorAll(".timepicker").forEach((el) => {
    if (el.type === "time") return;
    if (el._flatpickr) return;
    flatpickr(el, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      minuteIncrement: 5,
      disableMobile: true,
    });
  });
}

/* =========================================
   LOGIN LOGIC (INDEX)
========================================= */
async function doLogin() {
  const u = document.getElementById("u").value.trim();
  const p = document.getElementById("p").value.trim();

  if (!u || !p) {
    return Swal.fire(
      "Oops!",
      "Lengkapi kredensial login terlebih dahulu.",
      "warning",
    );
  }

  try {
    loader("Proses Autentifikasi...");
    const res = await callAPI({ action: "checkLogin", u, p });
    Swal.close();

    if (res.success) {
      user = res.username;
      localStorage.setItem("jef_user_logged", res.username);
      localStorage.setItem("jef_user_name", res.name);
      document.getElementById("userLabel").innerText = res.name;

      Swal.fire({
        title: "Login Berhasil",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      nav("pageMenu");
    } else {
      Swal.fire("Login Gagal", "Username atau Password salah.", "error");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("System Error", "Gagal terhubung ke server.", "error");
  }
}

/* =========================================
   PLAN & REPORT LOGIC (INDEX)
========================================= */
async function showPlan() {
  try {
    loader("Memuat Logbook...");
    const p = await callAPI({ action: "getUserProfile", username: user });
    Swal.close();

    document.getElementById("disName").value = user;
    document.getElementById("disPos").value = p.position || "-";
    document.getElementById("disDiv").value = p.division || "-";
    document.getElementById("clockIn").value = new Date()
      .toTimeString()
      .slice(0, 5);

    nav("pagePlan");
    initTimePicker();
  } catch (err) {
    Swal.close();
    Swal.fire("Error", "Gagal memuat data profile.", "error");
  }
}

function toggleOutputType(radio, index) {
  const reportCard = radio.closest(".report-card");
  const textInput = reportCard.querySelector(".r-out-text");
  const imageWrapper = reportCard.querySelector(".image-input-wrapper");
  const imageInput = reportCard.querySelector(".r-out-image");
  
  if (radio.value === "text") {
    textInput.style.display = "block";
    imageWrapper.style.display = "none";
    imageInput.value = "";
  } else {
    textInput.style.display = "none";
    imageWrapper.style.display = "block";
    textInput.value = "";
    
    // Tambah event listener untuk validasi file
    imageInput.addEventListener("change", function() {
      if (this.files && this.files.length > 0) {
        const file = this.files[0];
        const maxSize = 2 * 1024 * 1024; // 2MB
        
        if (file.size > maxSize) {
          Swal.fire("Oops!", "Ukuran file maksimal 2MB. File akan dikompres otomatis.", "warning");
        }
      }
    });
  }
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Compress image before converting to base64
function compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Hitung dimensi baru
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
  });
}

function addPlanField() {
  const html = `
    <div class="task-row mb-3">
      <div class="row g-2 mb-2">
        <div class="col-5"><label class="small fw-semibold mb-2 d-block">Task / Aktivitas <span class="text-danger">*</span></label><input type="text" class="form-control tn shadow-sm" placeholder="Isi task / activity" required></div>
        <div class="col-5"><label class="small fw-semibold mb-2 d-block">Target Task <span class="text-danger">*</span></label><input type="text" class="form-control tt shadow-sm" placeholder="Isi target dari task" required></div>
        <div class="col-2 d-flex align-items-end"><button type="button" class="btn btn-dark w-100 h-100" onclick="removeTask(this)"><i class="bi bi-trash3-fill"></i></button></div>
      </div>
    </div>`;
  document
    .getElementById("planContainer")
    .insertAdjacentHTML("beforeend", html);
}

function removeTask(button) {
  if (document.querySelectorAll(".task-row").length <= 1) {
    return Swal.fire("Oops!", "Minimal harus ada 1 task.", "warning");
  }
  button.closest(".task-row").remove();
}

async function submitPlan() {
  let tasks = [];
  let hasError = false;

  document.querySelectorAll(".tn").forEach((el, i) => {
    const taskName = el.value.trim();
    const taskTarget = document.querySelectorAll(".tt")[i].value.trim();

    if (taskName || taskTarget) {
      // Jika salah satu ada isi, keduanya wajib diisi
      if (!taskName || !taskTarget) {
        hasError = true;
        return;
      }
      tasks.push({
        name: taskName,
        target: taskTarget,
      });
    }
  });

  if (hasError) {
    return Swal.fire("Oops!", "Task dan Target wajib diisi bersama-sama.", "warning");
  }

  if (tasks.length === 0)
    return Swal.fire("Oops!", "Setidaknya harus ada 1 task.", "warning");

  try {
    loader("Sedang menyimpan task...");
    const data = {
      name: user,
      position: document.getElementById("disPos").value,
      division: document.getElementById("disDiv").value,
      clockIn: document.getElementById("clockIn").value,
      date: new Date().toLocaleDateString("sv-SE"),
      tasks: JSON.stringify(tasks),
    };
    const res = await callAPI({ action: "savePlan", data });
    Swal.fire("Success", res.message, "success");
    nav("pageMenu");
  } catch (err) {
    Swal.close();
    Swal.fire("Error", "Gagal menyimpan task.", "error");
  }
}

// async function showReport() {
//     try {
//         loader("Memeriksa task...");
//         const tasks = await callAPI({ action: "getActiveTasks", username: user });
//         Swal.close();

//         if (!tasks || tasks.length === 0) {
//             return Swal.fire({ title: "Task Tidak Ditemukan", text: "Tidak ada task aktif saat ini.", icon: "info" });
//         }

//         let h = "";
//         tasks.forEach((t, i) => {
//             if (!t.row) return;
//             h += `<div class="bento-card mb-3 bg-light report-item" data-row="${t.row}" style="padding:18px;border-radius:16px;border-left:3px solid #f5c451;">
//                 <div class="mb-2"><span class="badge bg-primary text-dark mb-1">TASK ${i + 1}</span><p class="mb-1 fw-bold text-white small">${t.task}</p><small class="text-muted d-block mb-3">Target: ${t.target}</small></div>
//                 <div class="row g-2">
//                     <div class="col-6"><label class="small fw-semibold mb-2">Waktu Mulai*</label><input type="text" class="form-control timepicker r-start" placeholder="00:00"></div>
//                     <div class="col-6"><label class="small fw-semibold mb-2">Waktu Selesai*</label><input type="text" class="form-control timepicker r-end" placeholder="00:00"></div>
//                     <div class="col-12 mt-2"><input type="text" class="form-control form-control-sm r-out" placeholder="Output / Hasil (Wajib)*"></div>
//                     <div class="col-12"><input type="text" class="form-control form-control-sm r-iss" placeholder="Kendala/Issue (Opsional)"></div>
//                     <div class="col-12 mt-2"><div class="form-check modern-check m-0"><input class="form-check-input r-c" type="checkbox"><label class="form-check-label text-white small">Ya, Selesai</label></div></div>
//                 </div>
//             </div>`;
//         });
//         document.getElementById("reportContainer").innerHTML = h;
//         initTimePicker();
//         nav("pageReport");
//     } catch (err) {
//         Swal.close();
//         Swal.fire("System Error", err.toString(), "error");
//     }
// }

async function showReport() {
  try {
    loader("Memeriksa task aktif...");
    const tasks = await callAPI({ action: "getActiveTasks", username: user });
    Swal.close();

    if (!tasks || tasks.length === 0) {
      return Swal.fire({
        title: "Task Tidak Ditemukan",
        text: "Tidak ada task aktif saat ini.",
        icon: "info",
        confirmButtonColor: "#3085d6",
      });
    }

    // Header Dashboard Sederhana
    let h = `
            <div class="dashboard-header mb-4 px-2 text-center">
                <h6 class="text-muted ">Ada <span style="font-weight: bold; color: #f5c451;">${tasks.length} task</span> yang perlu dilaporkan.</h6>
            </div>
        `;

    tasks.forEach((t, i) => {
      if (!t.row) return;
      h += `
            <div class="report-card mb-4 overflow-hidden shadow-sm" data-row="${t.row}" 
                 style="background: #141516;; border-radius: 20px; border: 1px solid #333;">
                
                <!-- Card Header -->
                <div class="p-3 d-flex justify-content-between align-items-center" style="background: rgba(255,255,255,0.03);">
                    <span class="badge rounded-pill px-3 py-2" style="background: #f5c451; color: #000; font-size: 14px">Task ke-${i + 1}</span>
                    <i class="bi bi-clipboard-check text-muted" style="
    font-size: 18px;
"></i>
                </div>

                <div class="p-4">
                    <!-- Task Info -->
                    <div class="task-info mb-3">
                        <h6 class="text-white fw-bold mb-2">${t.task}</h6>
                        <div class="d-flex align-items-center text-muted">
                            <i class="bi bi-bullseye me-1 small"></i>
                            <span style="font-size: 0.85rem;">Target: ${t.target}</span>
                        </div>
                    </div>

                    <!-- Input Grid -->
                    <div class="row g-3 align-items-end">
                        <div class="col-6">
                            <label class="form-label small text-uppercase fw-bold text-muted mb-1">Mulai*</label>
                            <input type="time" class="form-control timepicker r-start" placeholder="00:00" min="00:00" max="23:59">
                        </div>
                        <div class="col-6">
                            <label class="form-label small text-uppercase fw-bold text-muted mb-1">Selesai*</label>
                            <input type="time" class="form-control timepicker r-end" placeholder="00:00" min="00:00" max="23:59">
                        </div>
                        <!-- Output Type Selection -->
                        <div class="col-12">
                            <label class="form-label small text-uppercase fw-bold text-muted">Output / Hasil*</label>
                            <textarea class="form-control r-out" rows="2" placeholder="Apa yang dihasilkan hari ini?"></textarea>
                        </div>

                        <div class="col-12">
                            <label class="form-label small text-uppercase fw-bold text-muted">Kendala (Opsional)</label>
                            <input type="text" class="form-control r-iss" placeholder="Ada hambatan?">
                        </div>

                        <!-- Completion Status -->
                        <div class="col-12 mt-3">
                            <div class="completion-toggle p-3 rounded-4 d-flex align-items-center justify-content-between" style="background: rgba(255,255,255,0.05);">
                                <label class="form-check-label text-white fw-medium m-0">Selesai / Achive Target ?</label>
                                <div class="form-check form-switch m-0">
                                    <input class="form-check-input r-c" type="checkbox" style="width: 2.5em; height: 1.25em; cursor: pointer;">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById("reportContainer").innerHTML = h;
    initTimePicker();
    nav("pageReport");
  } catch (err) {
    Swal.close();
    Swal.fire("System Error", err.toString(), "error");
  }
}

async function finalReport() {
  let reports = [];
  let isAllValid = true;

  const reportItems = document.querySelectorAll(".report-card");

  if (reportItems.length === 0) return;

  reportItems.forEach((div) => {
    const startTime = div.querySelector(".r-start").value.trim();
    const endTime = div.querySelector(".r-end").value.trim();
    const output = div.querySelector(".r-out").value.trim();
    const completed = div.querySelector(".r-c").checked;

    // Validasi: Waktu dan output harus diisi
    if (!startTime || !endTime || !output) {
      isAllValid = false;
      div.style.border = "2px solid #ff4d4d";
    } else {
      div.style.border = "1px solid #333";
    }

    reports.push({
      row: div.dataset.row,
      startTime,
      endTime,
      output,
      issue: div.querySelector(".r-iss").value || "-",
      completed: completed,
    });
  });

  if (!isAllValid) {
    return Swal.fire(
      "Oops!",
      "Mohon lengkapi data agar laporan bisa terkirim.",
      "warning",
    );
  }

  try {
    loader("Mengirim Report...");
    const res = await callAPI({
      action: "submitReport",
      data: {
        reports: JSON.stringify(reports),
        note: "",
      },
    });

    if (res.success) {
      Swal.fire("Berhasil", res.message, "success");
      nav("pageMenu");
    } else {
      throw new Error(res.error || "Gagal menyimpan");
    }
  } catch (err) {
    Swal.close();
    Swal.fire("Error", "Gagal mengirim laporan: " + err.message, "error");
  }
}

/* =========================================
   DASHBOARD FUNCTIONS (DASHBOARD)
========================================= */
async function loadDashboardProfile() {
  const dashUser = localStorage.getItem("jef_dashboard_user");
  if (!dashUser) return;
  try {
    let p = await callAPI({ action: "getUserProfile", username: dashUser });
    document.getElementById("name").innerText = dashUser;
    document.getElementById("position").innerHTML =
      "Jabatan : " + (p.position || "-");
    document.getElementById("division").innerHTML =
      "Divisi : " + (p.division || "-");
  } catch (e) {
    console.error("Profile load failed");
  }
}

async function loadDashboardTasks() {
  const dashUser = localStorage.getItem("jef_dashboard_user");
  const filterDate = document.getElementById("filterDate");
  const filterStatus = document.getElementById("filterStatus");

  loader("Loading Dashboard...");

  try {
    dashboardTasks = await callAPI({
      action: "getDashboardTasks",
      username: dashUser,
      date: filterDate.value,
    });

    Swal.close();

    pendingChanges = {
      create: [],
      update: [],
      delete: [],
    };

    renderDashboard();
  } catch (e) {
    Swal.close();
    console.log(e);
  }
}

function saveDetail(row, btn) {
  let card = btn.closest(".task-card");

  const data = {
    row: row,

    startTime: card.querySelector(".start").value,

    endTime: card.querySelector(".end").value,

    output: card.querySelector(".output").value,

    issue: card.querySelector(".issue").value,
    // include status if present on the card
    status:
      (card.querySelector(".status-checkbox") &&
        (card.querySelector(".status-checkbox").checked ? "DONE" : "PENDING")) ||
      undefined,
  };

  // update state dashboard lokal
  let task = dashboardTasks.find((x) => x.row == row);

  if (task) {
    Object.assign(task, data);
  }

  // update pending
  const exist = pendingChanges.update.find((x) => x.row == row);

  if (exist) {
    Object.assign(exist, data);
  } else {
    pendingChanges.update.push(data);
  }

  renderDashboard();

  Swal.fire({
    icon: "success",
    title: "Perubahan disimpan sementara",
    timer: 1000,
    showConfirmButton: false,
  });
}

// Toggle status quickly from checkbox (updates local state + pendingChanges)
function toggleTaskStatus(row, checked) {
  const status = checked ? "DONE" : "PENDING";
  let task = dashboardTasks.find((x) => x.row == row);
  if (task) task.status = status;

  const exist = pendingChanges.update.find((x) => x.row == row);
  const data = { row: row, status: status };
  if (exist) {
    Object.assign(exist, data);
  } else {
    pendingChanges.update.push(data);
  }
  renderDashboard();
}

async function editTask(row) {
  let task = dashboardTasks.find((x) => x.row == row);

  if (!task) return;

  const p = await Swal.fire({
    title: "Edit Task",

    html: `

        <input
        id="t1"
        class="form-control"
        value="${task.task}">

        <br>

        <input
        id="t2"
        class="form-control"
        value="${task.target}">

        `,

    showCancelButton: true,

    preConfirm: () => ({
      task: document.getElementById("t1").value,

      target: document.getElementById("t2").value,
    }),
  });

  if (!p.value) return;

  // update lokal
  task.task = p.value.task;

  task.target = p.value.target;

  const updateData = {
    row: row,
    task: task.task,
    target: task.target,
  };

  const exist = pendingChanges.update.find((x) => x.row == row);

  if (exist) {
    Object.assign(exist, updateData);
  } else {
    pendingChanges.update.push(updateData);
  }

  renderDashboard();
}

/* =========================================
   DELETE TASK LOGIC (DASHBOARD)
========================================= */
async function deleteTask(row) {
  const confirm = await Swal.fire({
    title: "Hapus Task?",

    icon: "warning",

    showCancelButton: true,
  });

  if (!confirm.isConfirmed) return;

  dashboardTasks = dashboardTasks.filter((x) => x.row != row);

  // cegah duplikat
  if (!pendingChanges.delete.includes(row)) {
    pendingChanges.delete.push(row);
  }

  renderDashboard();
}

/* =========================================
   APP CORE (EXIT, PWA, AUTO LOGIN)
========================================= */
function confirmExit() {
  Swal.fire({
    title: "Keluar dari aplikasi?",
    text: "Kamu harus login kembali nanti.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#f5c451",
    confirmButtonText: "Ya, keluar",
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("jef_user_logged");
      localStorage.removeItem("jef_user_name");
      location.reload();
    }
  });
}

function openDashboard() {
  localStorage.setItem("jef_dashboard_user", user);
  window.location.href = "./dashboard.html";
}

// Global App Initialization
function hideInitialLoader() {
  const loader = document.getElementById("initialLoader");
  if (!loader) return;
  loader.classList.add("hidden");
}

window.onload = function () {
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Cek apakah ini halaman Dashboard atau Index
  const isDashboard = !!document.getElementById("taskContainer");

  if (isDashboard) {
    // Init Halaman Dashboard
    loadDashboardProfile();
    loadDashboardTasks();
  } else {
    // Init Halaman Index
    const savedUser = localStorage.getItem("jef_user_logged");
    const savedName = localStorage.getItem("jef_user_name");
    if (savedUser && savedName) {
      user = savedUser;
      const userLabel = document.getElementById("userLabel");
      if (userLabel) userLabel.innerText = savedName;
      nav("pageMenu");
    }
  }

  setTimeout(hideInitialLoader, 500);
};

/* =========================================
   SERVICE WORKER & PWA INSTALL
========================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/js/sw.js")
      .then((reg) => console.log("SW Registered!", reg))
      .catch((err) => console.log("SW Registration failed:", err));
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById("installBtn");
  if (installBtn) installBtn.style.display = "block";
  setTimeout(() => {
    const modal = document.getElementById("pwaInstallModal");
    if (modal) modal.style.display = "flex";
  }, 3000);
});

async function triggerInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    const btn = document.getElementById("installBtn");
    if (btn) btn.style.display = "none";
  }
  deferredPrompt = null;
}

async function executePwaInstall() {
  if (!deferredPrompt) return;
  closePwaModal();
  deferredPrompt.prompt();
  deferredPrompt = null;
}

function closePwaModal() {
  const modal = document.getElementById("pwaInstallModal");
  if (modal) modal.style.display = "none";
}

function renderDashboard() {
  let tasks = [...dashboardTasks];

  const status = document.getElementById("filterStatus").value;

  if (status) {
    tasks = tasks.filter((x) => x.status === status);
  }

  let done = tasks.filter((x) => x.status === "DONE").length;

  let pending = tasks.filter((x) => x.status !== "DONE").length;

  // Stats with UI-friendly icons
  document.getElementById("stats").innerHTML = `
    <div class='stats-grid mb-4'>
      <div class='stat-card'>
        <i class="bi bi-list" style="font-size:20px;"></i>
        <h5>${tasks.length}</h5>
        <small>Total</small>
      </div>
      <div class='stat-card'>
        <i class="bi bi-check-circle-fill" style="font-size:20px;"></i>
        <h5>${done}</h5>
        <small>Done</small>
      </div>
      <div class='stat-card'>
        <i class="bi bi-hourglass-split" style="font-size:20px;"></i>
        <h5>${pending}</h5>
        <small>Pending</small>
      </div>
    </div>`;

  let html = "";

  tasks.forEach((t) => {
    html += `

        <div class='taskCard' data-row='${t.row}'>

        <div class='d-flex justify-content-between'>

        <div>
        <h5>${t.task}</h5>
        <small class='text-muted'>${t.target}</small>
        </div>

        <span class='badge ${t.status == "DONE" ? "badgeDone" : "badgePending"}'>
        ${t.status}
        </span>

        </div>

        <div class='row mt-3'>

        <div class='col-md-6'>
        <input type='time' class='form-control start' min='00:00' max='23:59'
        value='${t.startTime || ""}'>
        </div>

        <div class='col-md-6'>
        <input type='time' class='form-control end' min='00:00' max='23:59'
        value='${t.endTime || ""}'>
        </div>

        <div class='col-md-6 mt-2'>
        <input class='form-control output'
        value='${t.output || ""}'>
        </div>

        <div class='col-md-6 mt-2'>
        <input class='form-control issue'
        value='${t.issue || ""}'>
        </div>

        <div class='col-12 mt-2'>
          <div class='form-check modern-check m-0'>
            <input id='status-${t.row}' class='form-check-input status-checkbox' type='checkbox' ${t.status == "DONE" ? "checked" : ""} onchange='toggleTaskStatus(${t.row}, this.checked)'>
            <label class='form-check-label text-white small' for='status-${t.row}'>Ya, Selesai</label>
          </div>
        </div>

        </div>

        <div class='mt-3 d-flex gap-2'>

        <button class='btn btn-warning btn-sm'
        onclick='editTask(${t.row})'>
        <i class='bi bi-pencil'></i>
        </button>

        <button class='btn btn-danger btn-sm'
        onclick='deleteTask(${t.row})'>
        <i class='bi bi-trash'></i>
        </button>

        <button class='btn btn-info btn-sm'
        onclick='saveDetail(${t.row},this)'>
        Update
        </button>

        </div>

        </div>
        `;
  });

  html += `

    <div class='mt-4 text-center gap-2'>

    <button
class="btn btn-outline-light"
onclick="loadDashboardTasks()">
<i class="bi bi-arrow-clockwise"></i>
Refresh
</button>


    <button
    class='btn btn-success'
    onclick='saveAllChanges()'>

    Simpan Semua
    (${totalPending()})

    </button>

    </div>

    `;

  document.getElementById("taskContainer").innerHTML = html;
}

function totalPending() {
  return (
    pendingChanges.create.length +
    pendingChanges.update.length +
    pendingChanges.delete.length
  );
}

async function saveAllChanges() {
  if (totalPending() == 0) {
    return Swal.fire("Info", "Tidak ada perubahan", "info");
  }

  loader("Menyimpan...");

  try {
    const res = await callAPI({
      action: "batchUpdate",

      payload: pendingChanges,
    });

    Swal.close();

    pendingChanges = {
      create: [],
      update: [],
      delete: [],
    };

    Swal.fire("Berhasil", "Semua perubahan tersimpan", "success");

    loadDashboardTasks();
  } catch (e) {
    Swal.close();

    Swal.fire("Error", e.toString(), "error");
  }
}
