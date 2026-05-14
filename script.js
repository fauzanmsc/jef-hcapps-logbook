/* =========================================
   CONFIG & GLOBAL VARIABLES
========================================= */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyoJMMrNzST3TKi6_O0TvdE3UTPsfrJeVA4SN-LfqpnZarIbOQ2eO56zEdG49NhHxnxGw/exec";

let user = localStorage.getItem("jef_user_logged") || "";
let deferredPrompt = null;


/* =========================================
   DASHBOARD LOCAL STATE
========================================= */

let dashboardTasks = [];

let pendingChanges = {
    create: [],
    update: [],
    delete: []
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
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    const currentTime = now.toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    const dateEl = document.getElementById("currentDate");
    const clockEl = document.getElementById("liveClock");
    if (dateEl) dateEl.innerText = currentDate;
    if (clockEl) clockEl.innerText = currentTime;
}

function initTimePicker() {
    document.querySelectorAll(".timepicker").forEach((el) => {
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
        return Swal.fire("Oops!", "Lengkapi kredensial login terlebih dahulu.", "warning");
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
                text: "Selamat datang, " + res.name,
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
        loader("Memuat logbook...");
        const p = await callAPI({ action: "getUserProfile", username: user });
        Swal.close();

        document.getElementById("disName").value = user;
        document.getElementById("disPos").value = p.position || "-";
        document.getElementById("disDiv").value = p.division || "-";
        document.getElementById("clockIn").value = new Date().toTimeString().slice(0, 5);

        nav("pagePlan");
        initTimePicker();
    } catch (err) {
        Swal.close();
        Swal.fire("Error", "Gagal memuat data profile.", "error");
    }
}

function addPlanField() {
    const html = `
    <div class="row g-2 mb-2 task-row">
      <div class="col-5"><input type="text" class="form-control tn shadow-sm" placeholder="Isi task / activity"></div>
      <div class="col-5"><input type="text" class="form-control tt shadow-sm" placeholder="Isi target dari task"></div>
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

async function showReport() {
    try {
        loader("Memeriksa tugas aktif...");
        const tasks = await callAPI({ action: "getActiveTasks", username: user });
        Swal.close();

        if (!tasks || tasks.length === 0) {
            return Swal.fire({ title: "Tugas Tidak Ditemukan", text: "Tidak ada tugas aktif saat ini.", icon: "info" });
        }

        let h = "";
        tasks.forEach((t, i) => {
            if (!t.row) return;
            h += `<div class="bento-card mb-3 bg-light report-item" data-row="${t.row}" style="padding:18px;border-radius:16px;border-left:3px solid #f5c451;">
                <div class="mb-2"><span class="badge bg-primary text-dark mb-1">TASK ${i + 1}</span><p class="mb-1 fw-bold text-white small">${t.task}</p><small class="text-muted d-block mb-3">Target: ${t.target}</small></div>
                <div class="row g-2">
                    <div class="col-6"><label class="small fw-semibold mb-2">Waktu Mulai*</label><input type="text" class="form-control timepicker r-start" placeholder="00:00"></div>
                    <div class="col-6"><label class="small fw-semibold mb-2">Waktu Selesai*</label><input type="text" class="form-control timepicker r-end" placeholder="00:00"></div>
                    <div class="col-12 mt-2"><input type="text" class="form-control form-control-sm r-out" placeholder="Output Hasil (Wajib)*"></div>
                    <div class="col-12"><input type="text" class="form-control form-control-sm r-iss" placeholder="Kendala/Issue (Opsional)"></div>
                    <div class="col-12 mt-2"><div class="form-check modern-check m-0"><input class="form-check-input r-c" type="checkbox"><label class="form-check-label text-white small">Ya, Selesai</label></div></div>
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
    const reportItems = document.querySelectorAll(".report-item");
    if (reportItems.length === 0) return;

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
            completed,
        });
    });

    if (!isAllValid) return Swal.fire("Oops!", 'Mohon lengkapi Jam, Output, dan centang "Ya, Selesai".', "warning");

    try {
        loader("Mengirim Report...");
        const res = await callAPI({ action: "submitReport", data: { reports: JSON.stringify(reports), note: "" } });
        Swal.fire("Berhasil", res.message, "success");
        nav("pageMenu");
    } catch (err) {
        Swal.close();
        Swal.fire("Error", "Gagal mengirim laporan ke server.", "error");
    }
}

/* =========================================
   DASHBOARD FUNCTIONS (DASHBOARD)
========================================= */
async function loadDashboardProfile() {
    const dashUser = localStorage.getItem("jef_dashboard_user");
    if(!dashUser) return;
    try {
        let p = await callAPI({ action: "getUserProfile", username: dashUser });
        document.getElementById("name").innerText = dashUser;
        document.getElementById("position").innerHTML = "Jabatan : " + (p.position || "-");
        document.getElementById("division").innerHTML = "Divisi : " + (p.division || "-");
    } catch(e) { console.error("Profile load failed"); }
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
            date: filterDate.value
        });

        Swal.close();

        pendingChanges={
             create:[],
             update:[],
             delete:[]
         };
         
         renderDashboard();

    } catch(e){

        Swal.close();
        console.log(e);

    }

}

function saveDetail(row,btn){

    let card = btn.closest(".taskCard");

    const data={

        row:row,

        startTime:
        card.querySelector(".start").value,

        endTime:
        card.querySelector(".end").value,

        output:
        card.querySelector(".output").value,

        issue:
        card.querySelector(".issue").value

    };

    // update state dashboard lokal
    let task=
    dashboardTasks.find(
        x=>x.row==row
    );

    if(task){

        Object.assign(
            task,
            data
        );

    }

    // update pending
    const exist=
    pendingChanges.update.find(
        x=>x.row==row
    );

    if(exist){

        Object.assign(
            exist,
            data
        );

    }else{

        pendingChanges.update.push(
            data
        );

    }

    renderDashboard();

    Swal.fire({
        icon:"success",
        title:"Perubahan disimpan sementara",
        timer:1000,
        showConfirmButton:false
    });

}

async function editTask(row){

    let task=
    dashboardTasks.find(
        x=>x.row==row
    );

    if(!task)return;

    const p=
    await Swal.fire({

        title:"Edit Task",

        html:`

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

        showCancelButton:true,

        preConfirm:()=>({

            task:
            document.getElementById(
                "t1"
            ).value,

            target:
            document.getElementById(
                "t2"
            ).value

        })

    });

    if(!p.value)return;

    // update lokal
    task.task=
    p.value.task;

    task.target=
    p.value.target;

    const updateData={

        row:row,
        task:task.task,
        target:task.target

    };

    const exist=
    pendingChanges.update.find(
        x=>x.row==row
    );

    if(exist){

        Object.assign(
            exist,
            updateData
        );

    }else{

        pendingChanges.update.push(
            updateData
        );

    }

    renderDashboard();

}

/* =========================================
   DELETE TASK LOGIC (DASHBOARD)
========================================= */
async function deleteTask(row){

    const confirm=
    await Swal.fire({

        title:"Hapus Task?",

        icon:"warning",

        showCancelButton:true

    });

    if(!confirm.isConfirmed)
    return;

    dashboardTasks=
    dashboardTasks.filter(
        x=>x.row!=row
    );

    // cegah duplikat
    if(
        !pendingChanges.delete.includes(
            row
        )
    ){

        pendingChanges.delete.push(
            row
        );

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
            if(userLabel) userLabel.innerText = savedName;
            nav("pageMenu");
        }
    }
};

/* =========================================
   SERVICE WORKER & PWA INSTALL
========================================= */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then((reg) => console.log("SW Registered!", reg))
            .catch((err) => console.log("SW Registration failed:", err));
    });
}

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById("installBtn");
    if (installBtn) installBtn.style.display = "block";
    if (localStorage.getItem("jef_user_logged")) {
        setTimeout(() => {
            const modal = document.getElementById("pwaInstallModal");
            if (modal) modal.style.display = "flex";
        }, 3000);
    }
});

async function triggerInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
        const btn = document.getElementById("installBtn");
        if(btn) btn.style.display = "none";
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


function renderDashboard(){

    let tasks=[...dashboardTasks];

    const status=
    document.getElementById("filterStatus").value;

    if(status){
        tasks=tasks.filter(
            x=>x.status===status
        );
    }

    let done=
    tasks.filter(
        x=>x.status==="DONE"
    ).length;

    let pending=
    tasks.filter(
        x=>x.status!=="DONE"
    ).length;

    document.getElementById("stats").innerHTML=`
    <div class='cardx'>
        <div class='row text-center'>

        <div class='col'>
        📋<h4>${tasks.length}</h4>Total
        </div>

        <div class='col'>
        ✅<h4>${done}</h4>Done
        </div>

        <div class='col'>
        ⌛<h4>${pending}</h4>Pending
        </div>

        </div>
    </div>`;

    let html="";

    tasks.forEach((t)=>{

        html+=`

        <div class='taskCard' data-row='${t.row}'>

        <div class='d-flex justify-content-between'>

        <div>
        <h5>${t.task}</h5>
        <small>${t.target}</small>
        </div>

        <span class='badge ${t.status=="DONE"?"badgeDone":"badgePending"}'>
        ${t.status}
        </span>

        </div>

        <div class='row mt-3'>

        <div class='col-md-6'>
        <input class='form-control start'
        value='${t.startTime||""}'>
        </div>

        <div class='col-md-6'>
        <input class='form-control end'
        value='${t.endTime||""}'>
        </div>

        <div class='col-md-6 mt-2'>
        <input class='form-control output'
        value='${t.output||""}'>
        </div>

        <div class='col-md-6 mt-2'>
        <input class='form-control issue'
        value='${t.issue||""}'>
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

    html+=`

    <div class='mt-4 text-center'>

    <button
    class='btn btn-success'
    onclick='saveAllChanges()'>

    Simpan Semua
    (${totalPending()})

    </button>

    </div>

    `;

    document.getElementById(
    "taskContainer"
    ).innerHTML=html;

}

function totalPending(){

    return (
        pendingChanges.create.length+
        pendingChanges.update.length+
        pendingChanges.delete.length
    );

}

async function saveAllChanges(){

    if(
        totalPending()==0
    ){

        return Swal.fire(
            "Info",
            "Tidak ada perubahan",
            "info"
        );

    }

    loader(
        "Menyimpan..."
    );

    try{

        const res=
        await callAPI({

            action:
            "batchUpdate",

            payload:
            pendingChanges

        });

        Swal.close();

        pendingChanges={

            create:[],
            update:[],
            delete:[]

        };

        Swal.fire(
            "Berhasil",
            "Semua perubahan tersimpan",
            "success"
        );

        loadDashboardTasks();

    }catch(e){

        Swal.close();

        Swal.fire(
            "Error",
            e.toString(),
            "error"
        );

    }

}
