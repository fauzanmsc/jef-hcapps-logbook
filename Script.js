/* =========================================
   CONFIG & GLOBAL VARIABLES
========================================= */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwbpJQas3xphkwdMC-JF_vBmmkSzo24QH3UefteN1HAr7Up0mwNjON1QW5gUZNDNjlJVw/exec";
let user = localStorage.getItem("jef_user_logged") || "";
let deferredPrompt = null;

/* =========================================
   HELPER & SHARED FUNCTIONS
========================================= */
async function callAPI(payload) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "data=" + encodeURIComponent(JSON.stringify(payload)),
        });
        return await response.json();
    } catch (err) {
        console.error("API Error:", err);
        Swal.fire("System Error", "Gagal terhubung ke server.", "error");
    }
}

function loader(text = "Loading...") {
    Swal.fire({
        title: text,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
    });
}

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

/* =========================================
   AUTH & SESSION (INDEX.HTML)
========================================= */
async function doLogin() {
    const u = document.getElementById("u").value.trim();
    const p = document.getElementById("p").value.trim();

    if (!u || !p) {
        return Swal.fire("Oops!", "Lengkapi kredensial login terlebih dahulu.", "warning");
    }

    loader("Proses Autentifikasi...");
    const res = await callAPI({ action: "checkLogin", u, p });
    Swal.close();

    if (res && res.success) {
        user = res.username;
        localStorage.setItem("jef_user_logged", res.username);
        localStorage.setItem("jef_user_name", res.name);
        
        if(document.getElementById("userLabel")) {
            document.getElementById("userLabel").innerText = res.name;
        }

        Swal.fire({
            title: "Login Berhasil",
            text: "Selamat datang, " + res.name,
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
        });
        nav("pageMenu");
    } else {
        Swal.fire("Login Gagal", "Username atau Password salah.", "error");
    }
}

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

/* =========================================
   PLAN & TASK MANAGEMENT (INDEX.HTML)
========================================= */
async function showPlan() {
    loader("Memuat logbook...");
    const p = await callAPI({ action: "getUserProfile", username: user });
    Swal.close();

    if (document.getElementById("disName")) {
        document.getElementById("disName").value = user;
        document.getElementById("disPos").value = p.position || "-";
        document.getElementById("disDiv").value = p.division || "-";
        document.getElementById("clockIn").value = new Date().toTimeString().slice(0, 5);
        nav("pagePlan");
        initTimePicker();
    }
}

function addPlanField() {
    const html = `
    <div class="row g-2 mb-2 task-row">
      <div class="col-5"><input type="text" class="form-control tn shadow-sm" placeholder="Isi task"></div>
      <div class="col-5"><input type="text" class="form-control tt shadow-sm" placeholder="Isi target"></div>
      <div class="col-2"><button type="button" class="btn btn-outline-secondary w-100 h-100" onclick="removeTask(this)"><i class="bi bi-trash3-fill"></i></button></div>
    </div>`;
    document.getElementById("planContainer").insertAdjacentHTML("beforeend", html);
}

function removeTask(button) {
    if (document.querySelectorAll(".task-row").length <= 1) {
        return Swal.fire("Oops!", "Minimal harus ada 1 task.", "warning");
    }
    button.closest(".task-row").remove();
}

async function submitPlan() {
    let tasks = [];
    document.querySelectorAll(".tn").forEach((el, i) => {
        if (el.value.trim()) {
            tasks.push({
                name: el.value.trim(),
                target: document.querySelectorAll(".tt")[i].value.trim(),
            });
        }
    });

    if (tasks.length === 0) return Swal.fire("Oops!", "Setidaknya harus ada 1 tugas.", "warning");

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
}

/* =========================================
   REPORTING (INDEX.HTML)
========================================= */
async function showReport() {
    loader("Memeriksa tugas aktif...");
    const tasks = await callAPI({ action: "getActiveTasks", username: user });
    Swal.close();

    if (!tasks || tasks.length === 0) {
        return Swal.fire("Tugas Tidak Ditemukan", "Tidak ada tugas aktif saat ini.", "info");
    }

    let h = "";
    tasks.forEach((t, i) => {
        if (!t.row) return;
        h += `
        <div class="bento-card mb-3 bg-light report-item" data-row="${t.row}" style="padding:18px;border-radius:16px;border-left:3px solid #f5c451;">
            <div class="mb-2"><span class="badge bg-primary text-dark mb-1">TASK ${i + 1}</span><p class="mb-1 fw-bold text-white small">${t.task}</p><small class="text-muted d-block mb-3">Target: ${t.target}</small></div>
            <div class="row g-2">
                <div class="col-6"><label class="small fw-semibold mb-2">Mulai*</label><input type="text" class="form-control timepicker r-start" placeholder="00:00"></div>
                <div class="col-6"><label class="small fw-semibold mb-2">Selesai*</label><input type="text" class="form-control timepicker r-end" placeholder="00:00"></div>
                <div class="col-12 mt-2"><input type="text" class="form-control form-control-sm r-out" placeholder="Output Hasil (Wajib)*"></div>
                <div class="col-12"><input type="text" class="form-control form-control-sm r-iss" placeholder="Kendala (Opsional)"></div>
                <div class="col-12 mt-2"><div class="form-check modern-check"><input class="form-check-input r-c" type="checkbox"><label class="form-check-label text-white small">Ya, Selesai</label></div></div>
            </div>
        </div>`;
    });
    document.getElementById("reportContainer").innerHTML = h;
    initTimePicker();
    nav("pageReport");
}

async function finalReport() {
    let reports = [];
    let isAllValid = true;
    const reportItems = document.querySelectorAll(".report-item");

    reportItems.forEach((div) => {
        const startTime = div.querySelector(".r-start").value;
        const endTime = div.querySelector(".r-end").value;
        const output = div.querySelector(".r-out").value;
        const completed = div.querySelector(".r-c").checked;

        if (!startTime || !endTime || !output || !completed) {
            isAllValid = false;
            div.style.border = "2px solid #ff4d4d";
        } else {
            div.style.border = "none";
            div.style.borderLeft = "5px solid #f5c451";
        }

        reports.push({
            row: div.dataset.row,
            startTime, endTime, output,
            issue: div.querySelector(".r-iss").value || "-",
            completed
        });
    });

    if (!isAllValid) return Swal.fire("Oops!", "Mohon lengkapi Jam, Output, dan centang Selesai.", "warning");

    loader("Mengirim Report...");
    const res = await callAPI({ action: "submitReport", data: { reports: JSON.stringify(reports), note: "" } });
    Swal.fire("Berhasil", res.message, "success");
    nav("pageMenu");
}

/* =========================================
   DASHBOARD SPECIFIC (DASHBOARD.HTML)
========================================= */
async function loadDashboardProfile() {
    const dashUser = localStorage.getItem("jef_dashboard_user");
    if (!dashUser || !document.getElementById("position")) return;
    
    let p = await callAPI({ action: "getUserProfile", username: dashUser });
    document.getElementById("name").innerText = dashUser;
    document.getElementById("position").innerHTML = "Jabatan : " + (p.position || "-");
    document.getElementById("division").innerHTML = "Divisi : " + (p.division || "-");
}

async function loadDashboardTasks() {
    if (!document.getElementById("taskContainer")) return;
    const dashUser = localStorage.getItem("jef_dashboard_user");
    const filterDate = document.getElementById("filterDate").value;

    loader("Loading Dashboard...");
    let tasks = await callAPI({ action: "getDashboardTasks", username: dashUser, date: filterDate });
    Swal.close();

    const statusFilter = document.getElementById("filterStatus").value;
    if (statusFilter) tasks = tasks.filter(x => x.status == statusFilter);

    // Stats calculation
    let done = tasks.filter(x => x.status == "DONE").length;
    document.getElementById("stats").innerHTML = `<div class='cardx'><div class='row text-center'><div class='col'>📋<h4>${tasks.length}</h4>Total</div><div class='col'>✅<h4>${done}</h4>Done</div><div class='col'>⌛<h4>${tasks.length - done}</h4>Pending</div></div></div>`;

    // Render Tasks
    let html = "";
    tasks.forEach(t => {
        html += `<div class='taskCard'>
            <h5>${t.task}</h5><small>${t.target}</small>
            <div class='row mt-3'>
                <div class='col-6'><input class='form-control start' value='${t.startTime || ""}' placeholder='Mulai'></div>
                <div class='col-6'><input class='form-control end' value='${t.endTime || ""}' placeholder='Selesai'></div>
                <div class='col-6 mt-2'><input class='form-control output' value='${t.output || ""}' placeholder='Output'></div>
                <div class='col-6 mt-2'><input class='form-control issue' value='${t.issue || ""}' placeholder='Kendala'></div>
            </div>
            <div class='mt-3 d-flex gap-2'>
                <button class='btn btn-warning btn-sm' onclick='editTask(${t.row},"${t.task}","${t.target}")'><i class='bi bi-pencil'></i></button>
                <button class='btn btn-success btn-sm' onclick='saveDetail(${t.row},this)'><i class='bi bi-floppy'></i></button>
            </div>
        </div>`;
    });
    document.getElementById("taskContainer").innerHTML = html;
}

async function saveDetail(row, btn) {
    let card = btn.closest(".taskCard");
    await callAPI({
        action: "updateDashboardTask",
        data: {
            row: row,
            startTime: card.querySelector(".start").value,
            endTime: card.querySelector(".end").value,
            output: card.querySelector(".output").value,
            issue: card.querySelector(".issue").value,
        },
    });
    Swal.fire("Berhasil", "Task diperbarui", "success");
}

/* =========================================
   UTILS & INITIALIZATION
========================================= */
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
    const dateEl = document.getElementById("currentDate");
    const clockEl = document.getElementById("liveClock");
    if (dateEl) dateEl.innerText = now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (clockEl) clockEl.innerText = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function initTimePicker() {
    document.querySelectorAll(".timepicker").forEach((el) => {
        if (!el._flatpickr) flatpickr(el, { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, disableMobile: true });
    });
}

function openDashboard() {
    localStorage.setItem("jef_dashboard_user", user);
    window.location.href = "./dashboard.html";
}

// Global Init
window.onload = function () {
    // Clock
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Auto Login Check (Index)
    const savedUser = localStorage.getItem("jef_user_logged");
    const savedName = localStorage.getItem("jef_user_name");
    if (savedUser && savedName && document.getElementById("userLabel")) {
        user = savedUser;
        document.getElementById("userLabel").innerText = savedName;
        nav("pageMenu");
    }

    // Dashboard Init (jika di halaman dashboard)
    if (document.getElementById("taskContainer")) {
        loadDashboardProfile();
        loadDashboardTasks();
    }
};
