
"use strict";

/* =====================================================
   CAREPOINT - PREMIUM CLINICAL EDITION
   FLASK + FIREBASE FIRESTORE
===================================================== */

const API = "/api";

const $ = id => document.getElementById(id);

const RESOURCES = [
    "patients",
    "doctors",
    "appointments"
];

const state = {

    page: "dashboard",

    view: "table",

    records: {
        patients: [],
        doctors: [],
        appointments: []
    },

    resource: null,

    editingId: null,

    deleteTarget: null,

    requestVersion: 0,

    searchTimer: null,

    toastTimer: null,

    saving: false,

    deleting: false

};


/* =====================================================
   PAGE CONFIGURATION
===================================================== */

const CONFIG = {

    dashboard: {

        title: "Dashboard Overview",
        breadcrumb: "Overview",

        hero: "Excellence in patient care.",

        description:
            "A connected clinical workspace for managing patient records, healthcare professionals, and medical appointments.",

        addText: "New Appointment"

    },

    patients: {

        title: "Patient Records",
        breadcrumb: "Patients",

        hero: "Patient-centered healthcare.",

        description:
            "Maintain organized patient information and manage clinical records in one connected workspace.",

        directory: "Patient Directory",

        subtitle:
            "Register, view, update and manage patient information.",

        addText: "Register Patient",

        singular: "Patient",

        icon: "patients"

    },

    doctors: {

        title: "Medical Doctors",
        breadcrumb: "Doctors",

        hero: "Healthcare professionals.",

        description:
            "Maintain a comprehensive directory of medical professionals, specialties and contact information.",

        directory: "Medical Doctor Directory",

        subtitle:
            "Manage healthcare professionals and their medical specialties.",

        addText: "Add Medical Doctor",

        singular: "Doctor",

        icon: "doctors"

    },

    appointments: {

        title: "Appointments",
        breadcrumb: "Appointments",

        hero: "Coordinated clinical care.",

        description:
            "Organize patient consultations, coordinate medical schedules and monitor appointment progress.",

        directory: "Appointment Directory",

        subtitle:
            "Schedule, update and monitor patient appointments.",

        addText: "Book Appointment",

        singular: "Appointment",

        icon: "appointments"

    }

};


/* =====================================================
   GENERAL HELPERS
===================================================== */

function icon(name) {

    return `
        <svg class="icon" aria-hidden="true">
            <use href="#i-${name}"></use>
        </svg>
    `;

}


function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,

        character => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"

        })[character]

    );

}


function today() {

    const now = new Date();

    const offset = now.getTimezoneOffset();

    return new Date(
        now.getTime() - offset * 60000
    ).toISOString().slice(0, 10);

}


function formatDate(value) {

    if (!value) return "—";

    const date = new Date(
        String(value).slice(0, 10) + "T00:00:00"
    );

    if (Number.isNaN(date.getTime())) {

        return String(value);

    }

    return date.toLocaleDateString("en-PH", {

        year: "numeric",
        month: "short",
        day: "numeric"

    });

}


function formatTime(value) {

    if (!value) return "—";

    const parts = String(value).split(":");

    const hours = Number(parts[0]);

    const minutes = Number(parts[1]);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {

        return String(value);

    }

    const period = hours >= 12 ? "PM" : "AM";

    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;

}


function initials(name) {

    return String(name || "?")

        .trim()

        .split(/\s+/)

        .filter(Boolean)

        .slice(0, 2)

        .map(word => word.charAt(0).toUpperCase())

        .join("") || "?";

}


function calculateAge(birthDate) {

    if (!birthDate) return "—";

    const birth = new Date(
        birthDate + "T00:00:00"
    );

    const now = new Date();

    if (Number.isNaN(birth.getTime())) {

        return "—";

    }

    let age = now.getFullYear() - birth.getFullYear();

    const month = now.getMonth() - birth.getMonth();

    if (
        month < 0 ||
        (
            month === 0 &&
            now.getDate() < birth.getDate()
        )
    ) {

        age--;

    }

    return age;

}


/* =====================================================
   API CONNECTION
===================================================== */

async function apiRequest(path, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        30000
    );

    try {

        const response = await fetch(
            `${API}${path}`,

            {

                ...options,

                headers: {

                    "Accept": "application/json",

                    ...(options.body
                        ? {
                            "Content-Type": "application/json"
                        }
                        : {}),

                    ...(options.headers || {})

                },

                signal: controller.signal

            }

        );

        let result;

        try {

            result = await response.json();

        } catch {

            throw new Error(
                `Invalid server response (${response.status}).`
            );

        }

        if (!response.ok || result.success === false) {

            throw new Error(
                result.message ||
                `Request failed (${response.status}).`
            );

        }

        return result;

    } catch (error) {

        if (error.name === "AbortError") {

            throw new Error(
                "The server request timed out. Refresh the records before retrying."
            );

        }

        throw error;

    } finally {

        clearTimeout(timeout);

    }

}


async function checkConnection() {

    $("connectionStatus").textContent = "Checking...";

    $("connectionDot").className = "connection-dot";

    try {

        const result = await apiRequest("/health");

        $("connectionStatus").textContent =
            "Firestore Connected";

        $("connectionDot").className =
            "connection-dot online";

        $("connectionStatus").title =
            result.project || "Firebase Firestore";

    } catch (error) {

        $("connectionStatus").textContent =
            "Connection Failed";

        $("connectionDot").className =
            "connection-dot offline";

        $("connectionStatus").title = error.message;

    }

}


async function fetchRecords(resource, query = "") {

    if (!RESOURCES.includes(resource)) {

        throw new Error("Invalid resource.");

    }

    const params = new URLSearchParams();

    if (query.trim()) {

        params.set("q", query.trim());

    }

    const suffix = params.toString()
        ? `?${params.toString()}`
        : "";

    const result = await apiRequest(
        `/${resource}${suffix}`
    );

    if (!Array.isArray(result.data)) {

        throw new Error(
            "Unexpected record format from the server."
        );

    }

    return result.data;

}


/* =====================================================
   NOTIFICATIONS
===================================================== */

function showToast(message, type = "success") {

    clearTimeout(state.toastTimer);

    const toast = $("toast");

    toast.className = `toast show ${type}`;

    $("toastTitle").textContent =

        type === "error"
            ? "Unable to Complete"

            : type === "info"
                ? "Information"

                : "Success";

    $("toastMessage").textContent = message;

    $("toastIcon").innerHTML = icon(

        type === "error"
            ? "cancel"

            : type === "info"
                ? "info"

                : "check"

    );

    state.toastTimer = setTimeout(() => {

        toast.className = "toast";

    }, 4500);

}


/* =====================================================
   LOADING AND EMPTY STATES
===================================================== */

function loadingHTML(message = "Loading clinical records...") {

    return `

        <div class="loading-state">

            <svg class="loading-pulse"
                 viewBox="0 0 100 40">

                <path d="M0 20h25l10-15 12 30 12-22 9 7h32"
                      fill="none"
                      stroke="#168C89"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"/>

            </svg>

            <p>${escapeHTML(message)}</p>

        </div>

    `;

}


function emptyHTML(
    title,
    message,
    resource = null,
    retry = false
) {

    return `

        <div class="empty-state">

            <div class="empty-illustration">

                ${icon(
                    resource
                        ? CONFIG[resource].icon
                        : "file"
                )}

            </div>

            <h3>${escapeHTML(title)}</h3>

            <p>${escapeHTML(message)}</p>

            ${resource && !retry ? `

                <button class="btn btn-primary"
                        data-add="${resource}">

                    ${icon("plus")}

                    ${CONFIG[resource].addText}

                </button>

            ` : ""}

            ${retry ? `

                <button class="btn btn-outline"
                        data-retry="true">

                    ${icon("refresh")}

                    Try Again

                </button>

            ` : ""}

        </div>

    `;

}


/* =====================================================
   PAGE NAVIGATION
===================================================== */

async function navigate(page) {

    if (!CONFIG[page]) {

        page = "dashboard";

    }

    clearTimeout(state.searchTimer);

    state.requestVersion++;

    state.page = page;

    const config = CONFIG[page];

    document.querySelectorAll(".nav-item")

        .forEach(button => {

            const active =
                button.dataset.page === page;

            button.classList.toggle(
                "active",
                active
            );

            if (active) {

                button.setAttribute(
                    "aria-current",
                    "page"
                );

            } else {

                button.removeAttribute(
                    "aria-current"
                );

            }

        });

    $("pageTitle").textContent = config.title;

    $("breadcrumb").textContent =
        config.breadcrumb;

    $("heroTitle").textContent = config.hero;

    $("heroDescription").textContent =
        config.description;

    $("heroActionText").textContent =
        config.addText;

    $("dashboardPage").classList.toggle(
        "active",
        page === "dashboard"
    );

    $("managementPage").classList.toggle(
        "active",
        page !== "dashboard"
    );

    closeSidebar();

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });

    if (page === "dashboard") {

        await loadDashboard();

        return;

    }

    $("managementTitle").textContent =
        config.title;

    $("managementDescription").textContent =
        config.subtitle;

    $("directoryTitle").textContent =
        config.directory;

    $("addRecordText").textContent =
        config.addText;

    $("searchInput").value = "";

    $("recordCount").textContent =
        "Loading records...";

    configureFilters(page);

    await loadResource(page);

}


function configureFilters(resource) {

    const select = $("filterSelect");

    const options = {

        patients: [

            ["", "All Genders"],
            ["Female", "Female"],
            ["Male", "Male"],
            ["Prefer not to say", "Prefer not to say"]

        ],

        doctors: [

            ["", "All Specialties"]

        ],

        appointments: [

            ["", "All Statuses"],
            ["Scheduled", "Scheduled"],
            ["Completed", "Completed"],
            ["Cancelled", "Cancelled"]

        ]

    };

    select.innerHTML = options[resource]

        .map(([value, label]) => `

            <option value="${escapeHTML(value)}">
                ${escapeHTML(label)}
            </option>

        `).join("");

}


function updateSpecialtyFilter(records) {

    const select = $("filterSelect");

    const selected = select.value;

    const existing = Array.from(select.options)

        .map(option => option.value)

        .filter(Boolean);

    const specialties = [...new Set([

        ...existing,

        ...records.map(
            record => record.specialty
        ).filter(Boolean)

    ])].sort();

    select.innerHTML = `

        <option value="">
            All Specialties
        </option>

        ${specialties.map(specialty => `

            <option value="${escapeHTML(specialty)}">
                ${escapeHTML(specialty)}
            </option>

        `).join("")}

    `;

    select.value = selected;

}


/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {

    const version = ++state.requestVersion;

    $("statsGrid").innerHTML =

        Array.from(
            { length: 6 },
            () => '<div class="skeleton"></div>'
        ).join("");

    $("recentAppointments").innerHTML = `

        <tr>
            <td colspan="4">
                ${loadingHTML()}
            </td>
        </tr>

    `;

    try {

        const result = await apiRequest(
            "/dashboard"
        );

        if (
            version !== state.requestVersion ||
            state.page !== "dashboard"
        ) return;

        const data = result.data || {};

        const counts = data.counts || {};

        renderStatistics(counts);

        renderChart(counts);

        renderRecentAppointments(
            data.recent || []
        );

    } catch (error) {

        if (version !== state.requestVersion) {

            return;

        }

        $("statsGrid").innerHTML = `

            <div style="grid-column:1/-1">

                ${emptyHTML(
                    "Unable to load dashboard",
                    error.message,
                    null,
                    true
                )}

            </div>

        `;

        $("recentAppointments").innerHTML = `

            <tr>

                <td colspan="4">

                    ${escapeHTML(error.message)}

                </td>

            </tr>

        `;

        $("chartTotal").textContent = "—";

        $("appointmentChart").style.background =
            "var(--border)";

        $("chartLegend").textContent =
            "Statistics unavailable.";

        showToast(error.message, "error");

    }

}


function renderStatistics(counts) {

    const stats = [

        {
            label: "Total Patients",
            value: counts.patients,
            icon: "patients",
            color: "teal",
            caption: "Patient directory"
        },

        {
            label: "Medical Doctors",
            value: counts.doctors,
            icon: "doctors",
            color: "blue",
            caption: "Healthcare team"
        },

        {
            label: "Total Appointments",
            value: counts.appointments,
            icon: "appointments",
            color: "purple",
            caption: "All consultations"
        },

        {
            label: "Scheduled",
            value: counts.scheduled,
            icon: "clock",
            color: "orange",
            caption: "Upcoming visits"
        },

        {
            label: "Completed",
            value: counts.completed,
            icon: "check",
            color: "green",
            caption: "Completed visits"
        },

        {
            label: "Cancelled",
            value: counts.cancelled,
            icon: "cancel",
            color: "red",
            caption: "Cancelled visits"
        }

    ];

    $("statsGrid").innerHTML = stats.map(
        (stat, index) => `

        <article class="stat-card"
                 style="animation-delay:${index * 60}ms">

            <div class="stat-top">

                <div class="stat-icon ${stat.color}">

                    ${icon(stat.icon)}

                </div>

                <span class="stat-caption">

                    ${stat.caption}

                </span>

            </div>

            <strong class="stat-number"
                    data-count="${Number(stat.value) || 0}">

                0

            </strong>

            <span class="stat-label">

                ${stat.label}

            </span>

        </article>

    `).join("");

    document.querySelectorAll("[data-count]")

        .forEach(element => {

            animateNumber(
                element,
                Number(element.dataset.count)
            );

        });

}


function animateNumber(element, target) {

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {

        element.textContent = target;

        return;

    }

    const duration = 700;

    const start = performance.now();

    function update(now) {

        const progress = Math.min(
            (now - start) / duration,
            1
        );

        const eased =
            1 - Math.pow(1 - progress, 3);

        element.textContent = Math.round(
            target * eased
        ).toLocaleString();

        if (progress < 1) {

            requestAnimationFrame(update);

        }

    }

    requestAnimationFrame(update);

}


function renderChart(counts) {

    const scheduled = Number(counts.scheduled) || 0;

    const completed = Number(counts.completed) || 0;

    const cancelled = Number(counts.cancelled) || 0;

    const total = scheduled + completed + cancelled;

    const first = total
        ? scheduled / total * 100
        : 0;

    const second = total
        ? (scheduled + completed) / total * 100
        : 0;

    $("appointmentChart").style.background = total

        ? `conic-gradient(
            #6194C9 0% ${first}%,
            #42A58E ${first}% ${second}%,
            #D78A97 ${second}% 100%
        )`

        : "var(--border)";

    animateNumber(
        $("chartTotal"),
        Number(counts.appointments) || 0
    );

    const legend = [

        ["Scheduled", scheduled, "#6194C9"],

        ["Completed", completed, "#42A58E"],

        ["Cancelled", cancelled, "#D78A97"]

    ];

    $("chartLegend").innerHTML = legend.map(
        ([label, value, color]) => `

        <div class="legend-item">

            <span class="legend-dot"
                  style="background:${color}"></span>

            <span>${label}</span>

            <strong>${value}</strong>

        </div>

    `).join("");

}


function statusBadge(status) {

    const allowed = [

        "Scheduled",
        "Completed",
        "Cancelled"

    ];

    const cssClass = allowed.includes(status)

        ? status.toLowerCase()

        : "neutral";

    return `

        <span class="status-badge status-${cssClass}">

            ${escapeHTML(status || "Unknown")}

        </span>

    `;

}


function renderRecentAppointments(records) {

    if (!records.length) {

        $("recentAppointments").innerHTML = `

            <tr>

                <td colspan="4">

                    ${emptyHTML(
                        "No appointments yet",
                        "New appointments will appear here.",
                        "appointments"
                    )}

                </td>

            </tr>

        `;

        return;

    }

    $("recentAppointments").innerHTML = records.map(
        record => `

        <tr>

            <td>

                ${personCell(
                    record.patient_name || record.patient_id,
                    "Patient"
                )}

            </td>

            <td>

                ${escapeHTML(
                    record.doctor_name ||
                    record.doctor_id ||
                    "—"
                )}

            </td>

            <td>

                ${escapeHTML(
                    formatDate(record.appointment_date)
                )}

                <small class="cell-subtitle">

                    ${escapeHTML(
                        formatTime(record.appointment_time)
                    )}

                </small>

            </td>

            <td>

                ${statusBadge(record.status)}

            </td>

        </tr>

    `).join("");

}


/* =====================================================
   LOAD MANAGEMENT RECORDS
===================================================== */

async function loadResource(
    resource = state.page
) {

    if (!RESOURCES.includes(resource)) return;

    const version = ++state.requestVersion;

    const query = $("searchInput").value.trim();

    $("recordsContainer").innerHTML =
        loadingHTML();

    try {

        const records = await fetchRecords(
            resource,
            query
        );

        if (
            version !== state.requestVersion ||
            state.page !== resource
        ) return;

        state.records[resource] = records;

        if (resource === "doctors") {

            updateSpecialtyFilter(records);

        }

        renderRecords();

    } catch (error) {

        if (version !== state.requestVersion) {

            return;

        }

        $("recordCount").textContent =
            "Unable to load records";

        $("recordsContainer").innerHTML =
            emptyHTML(
                "Unable to load records",
                error.message,
                null,
                true
            );

        showToast(error.message, "error");

    }

}


function getFilteredRecords() {

    const resource = state.page;

    const filter = $("filterSelect").value;

    const records = state.records[resource] || [];

    if (!filter) return records;

    const fields = {

        patients: "gender",

        doctors: "specialty",

        appointments: "status"

    };

    return records.filter(

        record => record[fields[resource]] === filter

    );

}


function renderRecords() {

    const resource = state.page;

    if (!RESOURCES.includes(resource)) return;

    const records = getFilteredRecords();

    $("recordCount").textContent =

        `${records.length} ${records.length === 1 ? "record" : "records"} found`;

    if (!records.length) {

        const filtered =

            $("searchInput").value.trim() ||

            $("filterSelect").value;

        $("recordsContainer").innerHTML =

            emptyHTML(

                filtered
                    ? "No matching records"
                    : "No records available",

                filtered
                    ? "Try another search or clear the selected filters."
                    : "Create your first record to get started.",

                filtered ? null : resource

            );

        return;

    }

    $("recordsContainer").innerHTML =

        state.view === "cards"

            ? renderCardView(resource, records)

            : renderTableView(resource, records);

}


/* =====================================================
   RECORD COMPONENTS
===================================================== */

function personCell(
    name,
    subtitle = "",
    doctor = false
) {

    return `

        <div class="person-cell">

            <div class="person-avatar ${doctor ? "doctor" : ""}">

                ${doctor
                    ? icon("doctors")
                    : escapeHTML(initials(name))
                }

            </div>

            <div class="person-info">

                <strong>
                    ${escapeHTML(name || "—")}
                </strong>

                <small>
                    ${escapeHTML(subtitle)}
                </small>

            </div>

        </div>

    `;

}


function actionButtons(resource, id) {

    return `

        <div class="action-group">

            <button class="action-btn action-view"
                    data-action="view"
                    data-resource="${resource}"
                    data-id="${escapeHTML(id)}"
                    title="View record">

                ${icon("eye")}

                View

            </button>

            <button class="action-btn action-edit"
                    data-action="edit"
                    data-resource="${resource}"
                    data-id="${escapeHTML(id)}"
                    title="Edit record">

                ${icon("edit")}

                Edit

            </button>

            <button class="action-btn action-delete"
                    data-action="delete"
                    data-resource="${resource}"
                    data-id="${escapeHTML(id)}"
                    title="Delete record">

                ${icon("trash")}

                Delete

            </button>

        </div>

    `;

}


/* =====================================================
   TABLE VIEW
===================================================== */

function renderTableView(resource, records) {

    const columns = {

        patients: [

            "Patient Name",
            "Age",
            "Gender",
            "Phone",
            "Email",
            "Actions"

        ],

        doctors: [

            "Medical Doctor",
            "Specialty",
            "Phone",
            "Email",
            "Actions"

        ],

        appointments: [

            "Patient",
            "Medical Doctor",
            "Date & Time",
            "Status",
            "Actions"

        ]

    };

    return `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        ${columns[resource].map(
                            column => `<th>${escapeHTML(column)}</th>`
                        ).join("")}

                    </tr>

                </thead>

                <tbody>

                    ${records.map(
                        record => renderTableRow(
                            resource,
                            record
                        )
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;

}


function renderTableRow(resource, record) {

    if (resource === "patients") {

        return `

            <tr>

                <td>

                    ${personCell(
                        record.full_name,
                        record.id
                    )}

                </td>

                <td>

                    ${escapeHTML(
                        record.age ??
                        calculateAge(record.birth_date)
                    )}

                </td>

                <td>${escapeHTML(record.gender)}</td>

                <td>${escapeHTML(record.phone)}</td>

                <td>${escapeHTML(record.email)}</td>

                <td>

                    ${actionButtons(resource, record.id)}

                </td>

            </tr>

        `;

    }

    if (resource === "doctors") {

        return `

            <tr>

                <td>

                    ${personCell(
                        record.full_name,
                        record.id,
                        true
                    )}

                </td>

                <td>${escapeHTML(record.specialty)}</td>

                <td>${escapeHTML(record.phone)}</td>

                <td>${escapeHTML(record.email)}</td>

                <td>

                    ${actionButtons(resource, record.id)}

                </td>

            </tr>

        `;

    }

    return `

        <tr>

            <td>

                ${personCell(
                    record.patient_name || record.patient_id,
                    record.id
                )}

            </td>

            <td>

                ${escapeHTML(
                    record.doctor_name ||
                    record.doctor_id
                )}

            </td>

            <td>

                ${escapeHTML(
                    formatDate(record.appointment_date)
                )}

                <small class="cell-subtitle">

                    ${escapeHTML(
                        formatTime(record.appointment_time)
                    )}

                </small>

            </td>

            <td>

                ${statusBadge(record.status)}

            </td>

            <td>

                ${actionButtons(resource, record.id)}

            </td>

        </tr>

    `;

}


/* =====================================================
   CARD VIEW
===================================================== */

function cardDetail(iconName, value) {

    return `

        <div class="record-detail">

            ${icon(iconName)}

            <span>

                ${escapeHTML(value || "—")}

            </span>

        </div>

    `;

}


function renderCardView(resource, records) {

    return `

        <div class="records-grid">

            ${records.map(record => {

                let name = record.full_name;

                let subtitle = record.id;

                let details = "";

                if (resource === "patients") {

                    details =

                        cardDetail(
                            "patients",
                            `${record.gender || "—"} · Age ${record.age ?? calculateAge(record.birth_date)}`
                        ) +

                        cardDetail(
                            "appointments",
                            formatDate(record.birth_date)
                        ) +

                        cardDetail("phone", record.phone) +

                        cardDetail("mail", record.email);

                }

                if (resource === "doctors") {

                    subtitle = record.specialty;

                    details =

                        cardDetail(
                            "doctors",
                            record.specialty
                        ) +

                        cardDetail("phone", record.phone) +

                        cardDetail("mail", record.email);

                }

                if (resource === "appointments") {

                    name =

                        record.patient_name ||
                        record.patient_id;

                    subtitle = "Medical Appointment";

                    details =

                        cardDetail(
                            "doctors",
                            record.doctor_name ||
                            record.doctor_id
                        ) +

                        cardDetail(
                            "appointments",
                            formatDate(
                                record.appointment_date
                            )
                        ) +

                        cardDetail(
                            "clock",
                            formatTime(
                                record.appointment_time
                            )
                        ) +

                        cardDetail(
                            "file",
                            record.reason
                        ) +

                        statusBadge(record.status);

                }

                return `

                    <article class="record-card">

                        <div class="record-card-header">

                            <div class="person-avatar ${resource === "doctors" ? "doctor" : ""}">

                                ${resource === "doctors"

                                    ? icon("doctors")

                                    : escapeHTML(initials(name))

                                }

                            </div>

                            <div>

                                <h4>

                                    ${escapeHTML(name)}

                                </h4>

                                <small>

                                    ${escapeHTML(subtitle)}

                                </small>

                            </div>

                        </div>

                        ${details}

                        ${actionButtons(
                            resource,
                            record.id
                        )}

                    </article>

                `;

            }).join("")}

        </div>

    `;

}


/* =====================================================
   FORM FIELD HELPERS
===================================================== */

function inputField(
    name,
    label,
    type,
    value = "",
    options = {}
) {

    return `

        <div class="form-group ${options.full ? "full-width" : ""}">

            <label for="field-${name}">

                ${escapeHTML(label)}

                <span class="required">*</span>

            </label>

            <input

                id="field-${name}"

                name="${name}"

                type="${type}"

                value="${escapeHTML(value)}"

                placeholder="${escapeHTML(options.placeholder || "")}"

                ${options.maxlength
                    ? `maxlength="${options.maxlength}"`
                    : ""
                }

                ${options.max
                    ? `max="${escapeHTML(options.max)}"`
                    : ""
                }

                required

            >

        </div>

    `;

}


function selectField(
    name,
    label,
    options,
    value = "",
    full = false
) {

    return `

        <div class="form-group ${full ? "full-width" : ""}">

            <label for="field-${name}">

                ${escapeHTML(label)}

                <span class="required">*</span>

            </label>

            <select id="field-${name}"
                    name="${name}"
                    required>

                <option value="">
                    Select ${escapeHTML(label)}
                </option>

                ${options.map(option => `

                    <option

                        value="${escapeHTML(option.value)}"

                        ${String(option.value) === String(value)
                            ? "selected"
                            : ""
                        }

                    >

                        ${escapeHTML(option.label)}

                    </option>

                `).join("")}

            </select>

        </div>

    `;

}


function textareaField(
    name,
    label,
    value = ""
) {

    return `

        <div class="form-group full-width">

            <label for="field-${name}">

                ${escapeHTML(label)}

                <span class="required">*</span>

            </label>

            <textarea

                id="field-${name}"

                name="${name}"

                maxlength="2000"

                placeholder="Enter consultation details..."

                required

            >${escapeHTML(value)}</textarea>

        </div>

    `;

}


/* =====================================================
   BUILD PATIENT FORM
===================================================== */

function patientForm(record = {}) {

    return [

        inputField(
            "full_name",
            "Full Name",
            "text",
            record.full_name,
            {
                full: true,
                maxlength: 150,
                placeholder: "Enter patient's full name"
            }
        ),

        inputField(
            "birth_date",
            "Birth Date",
            "date",
            record.birth_date,
            {
                max: today()
            }
        ),

        selectField(

            "gender",

            "Gender",

            [
                "Female",
                "Male",
                "Prefer not to say"
            ].map(value => ({
                value,
                label: value
            })),

            record.gender

        ),

        inputField(
            "phone",
            "Phone Number",
            "tel",
            record.phone,
            {
                maxlength: 30,
                placeholder: "09XXXXXXXXX"
            }
        ),

        inputField(
            "email",
            "Email Address",
            "email",
            record.email,
            {
                placeholder: "patient@example.com"
            }
        )

    ].join("");

}


/* =====================================================
   BUILD DOCTOR FORM
===================================================== */

function doctorForm(record = {}) {

    return [

        inputField(
            "full_name",
            "Doctor's Full Name",
            "text",
            record.full_name,
            {
                full: true,
                maxlength: 150,
                placeholder: "Dr. Full Name"
            }
        ),

        inputField(
            "specialty",
            "Medical Specialty",
            "text",
            record.specialty,
            {
                full: true,
                maxlength: 150,
                placeholder: "e.g. General Medicine"
            }
        ),

        inputField(
            "phone",
            "Phone Number",
            "tel",
            record.phone,
            {
                maxlength: 30,
                placeholder: "09XXXXXXXXX"
            }
        ),

        inputField(
            "email",
            "Email Address",
            "email",
            record.email,
            {
                placeholder: "doctor@example.com"
            }
        )

    ].join("");

}


/* =====================================================
   BUILD APPOINTMENT FORM
===================================================== */

async function appointmentForm(record = {}) {

    const [patients, doctors] = await Promise.all([

        fetchRecords("patients"),

        fetchRecords("doctors")

    ]);

    if (!patients.length || !doctors.length) {

        throw new Error(
            "Register at least one patient and one medical doctor before creating an appointment."
        );

    }

    return [

        selectField(

            "patient_id",

            "Patient",

            patients.map(patient => ({

                value: patient.id,

                label: patient.full_name

            })),

            record.patient_id,

            true

        ),

        selectField(

            "doctor_id",

            "Medical Doctor",

            doctors.map(doctor => ({

                value: doctor.id,

                label:
                    `${doctor.full_name} — ${doctor.specialty}`

            })),

            record.doctor_id,

            true

        ),

        inputField(
            "appointment_date",
            "Appointment Date",
            "date",
            record.appointment_date || today()
        ),

        inputField(
            "appointment_time",
            "Appointment Time",
            "time",
            record.appointment_time
        ),

        selectField(

            "status",

            "Appointment Status",

            [
                "Scheduled",
                "Completed",
                "Cancelled"
            ].map(value => ({
                value,
                label: value
            })),

            record.status || "Scheduled",

            true

        ),

        textareaField(

            "reason",

            "Reason for Consultation",

            record.reason

        )

    ].join("");

}


/* =====================================================
   OPEN ADD / EDIT MODAL
===================================================== */

let modalVersion = 0;


async function openRecordModal(
    resource,
    id = null
) {

    if (
        !RESOURCES.includes(resource) ||
        state.saving
    ) return;

    const version = ++modalVersion;

    state.resource = resource;

    state.editingId = id;

    const config = CONFIG[resource];

    $("modalTitle").textContent =

        id

            ? `Edit ${config.singular}`

            : config.addText;

    $("modalDescription").textContent =
        "Complete all required clinical information.";

    $("modalIcon").innerHTML =
        icon(config.icon);

    $("formError").hidden = true;

    $("saveButton").hidden = false;

    $("saveButton").disabled = true;

    $("saveButton").innerHTML =

        `${icon("check")} ${id ? "Save Changes" : "Save Record"}`;

    $("cancelModal").textContent = "Cancel";

    $("formFields").innerHTML =
        loadingHTML("Preparing form...");

    $("modalBackdrop").hidden = false;

    document.body.style.overflow = "hidden";

    $("closeModal").focus();

    try {

        let record = {};

        if (id) {

            const result = await apiRequest(

                `/${resource}/${encodeURIComponent(id)}`

            );

            record = result.data;

        }

        let fields;

        if (resource === "patients") {

            fields = patientForm(record);

        } else if (resource === "doctors") {

            fields = doctorForm(record);

        } else {

            fields = await appointmentForm(record);

        }

        if (version !== modalVersion) return;

        $("formFields").innerHTML = fields;

        $("saveButton").disabled = false;

        $("formFields")

            .querySelector("input, select, textarea")

            ?.focus();

    } catch (error) {

        if (version !== modalVersion) return;

        $("formFields").innerHTML = "";

        showFormError(error.message);

    }

}


function closeRecordModal() {

    if (state.saving) return;

    modalVersion++;

    $("modalBackdrop").hidden = true;

    $("recordForm").reset();

    $("formFields").innerHTML = "";

    $("formError").hidden = true;

    state.resource = null;

    state.editingId = null;

    document.body.style.overflow = "";

}


function showFormError(message) {

    $("formError").textContent = message;

    $("formError").hidden = false;

}


/* =====================================================
   FORM VALIDATION
===================================================== */

function validateForm(resource, data) {

    const required = {

        patients: [

            "full_name",
            "birth_date",
            "gender",
            "phone",
            "email"

        ],

        doctors: [

            "full_name",
            "specialty",
            "phone",
            "email"

        ],

        appointments: [

            "patient_id",
            "doctor_id",
            "appointment_date",
            "appointment_time",
            "reason",
            "status"

        ]

    };

    for (const field of required[resource]) {

        if (!String(data[field] || "").trim()) {

            return "Please complete all required fields.";

        }

    }

    if (
        data.email &&
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)
    ) {

        return "Please enter a valid email address.";

    }

    if (
        resource === "patients" &&
        data.birth_date > today()
    ) {

        return "Birth date cannot be in the future.";

    }

    if (
        resource === "patients" &&
        ![
            "Female",
            "Male",
            "Prefer not to say"
        ].includes(data.gender)
    ) {

        return "Please select a valid gender.";

    }

    if (
        resource === "appointments" &&
        ![
            "Scheduled",
            "Completed",
            "Cancelled"
        ].includes(data.status)
    ) {

        return "Please select a valid appointment status.";

    }

    return null;

}


/* =====================================================
   CREATE AND UPDATE RECORDS
===================================================== */

async function saveRecord(event) {

    event.preventDefault();

    if (
        state.saving ||
        !state.resource
    ) return;

    $("formError").hidden = true;

    const resource = state.resource;

    const id = state.editingId;

    const formData = new FormData(
        $("recordForm")
    );

    const payload = {};

    formData.forEach((value, key) => {

        payload[key] = String(value).trim();

    });

    const validationError = validateForm(
        resource,
        payload
    );

    if (validationError) {

        showFormError(validationError);

        return;

    }

    state.saving = true;

    $("saveButton").disabled = true;

    $("closeModal").disabled = true;

    $("cancelModal").disabled = true;

    $("saveButton").innerHTML = `

        <span class="spinner"></span>

        Saving Record...

    `;

    try {

        const result = await apiRequest(

            id

                ? `/${resource}/${encodeURIComponent(id)}`

                : `/${resource}`,

            {

                method: id ? "PUT" : "POST",

                body: JSON.stringify(payload)

            }

        );

        state.saving = false;

        closeRecordModal();

        showToast(

            result.message ||

            `${CONFIG[resource].singular} ${id ? "updated" : "created"} successfully.`

        );

        await refreshCurrentPage();

    } catch (error) {

        showFormError(error.message);

        showToast(error.message, "error");

    } finally {

        state.saving = false;

        $("saveButton").disabled = false;

        $("closeModal").disabled = false;

        $("cancelModal").disabled = false;

        $("saveButton").innerHTML =

            `${icon("check")} ${id ? "Save Changes" : "Save Record"}`;

    }

}


/* =====================================================
   VIEW RECORD
===================================================== */

function detailField(
    label,
    value,
    full = false
) {

    return `

        <div class="detail-box ${full ? "full-width" : ""}">

            <small>

                ${escapeHTML(label)}

            </small>

            <strong>

                ${escapeHTML(value ?? "—")}

            </strong>

        </div>

    `;

}


async function viewRecord(resource, id) {

    const version = ++modalVersion;

    state.resource = null;

    state.editingId = null;

    $("modalTitle").textContent =

        `${CONFIG[resource].singular} Details`;

    $("modalDescription").textContent =
        "Information retrieved from Firestore.";

    $("modalIcon").innerHTML =
        icon(CONFIG[resource].icon);

    $("formError").hidden = true;

    $("saveButton").hidden = true;

    $("cancelModal").textContent = "Close";

    $("formFields").innerHTML =
        loadingHTML();

    $("modalBackdrop").hidden = false;

    document.body.style.overflow = "hidden";

    $("closeModal").focus();

    try {

        const result = await apiRequest(

            `/${resource}/${encodeURIComponent(id)}`

        );

        if (version !== modalVersion) return;

        const record = result.data;

        let details = detailField(

            "Record ID",

            record.id,

            true

        );

        if (resource === "patients") {

            details +=

                detailField(
                    "Full Name",
                    record.full_name,
                    true
                ) +

                detailField(
                    "Birth Date",
                    formatDate(record.birth_date)
                ) +

                detailField(
                    "Age",
                    record.age ??
                    calculateAge(record.birth_date)
                ) +

                detailField(
                    "Gender",
                    record.gender
                ) +

                detailField(
                    "Phone Number",
                    record.phone
                ) +

                detailField(
                    "Email Address",
                    record.email,
                    true
                );

        }

        if (resource === "doctors") {

            details +=

                detailField(
                    "Doctor's Name",
                    record.full_name,
                    true
                ) +

                detailField(
                    "Medical Specialty",
                    record.specialty,
                    true
                ) +

                detailField(
                    "Phone Number",
                    record.phone
                ) +

                detailField(
                    "Email Address",
                    record.email
                );

        }

        if (resource === "appointments") {

            details +=

                detailField(
                    "Patient",
                    record.patient_name ||
                    record.patient_id,
                    true
                ) +

                detailField(
                    "Medical Doctor",
                    record.doctor_name ||
                    record.doctor_id,
                    true
                ) +

                detailField(
                    "Appointment Date",
                    formatDate(record.appointment_date)
                ) +

                detailField(
                    "Appointment Time",
                    formatTime(record.appointment_time)
                ) +

                detailField(
                    "Status",
                    record.status
                ) +

                detailField(
                    "Reason for Consultation",
                    record.reason,
                    true
                );

        }

        $("formFields").innerHTML = details;

    } catch (error) {

        if (version !== modalVersion) return;

        $("formFields").innerHTML = "";

        showFormError(error.message);

    }

}


/* =====================================================
   DELETE RECORD
===================================================== */

function openDeleteModal(resource, id) {

    if (state.deleting) return;

    const record = state.records[resource]

        .find(item => item.id === id);

    const name =

        record?.full_name ||

        record?.patient_name ||

        id;

    state.deleteTarget = {

        resource,

        id

    };

    $("confirmMessage").textContent =

        `Are you sure you want to delete the record for "${name}"? This action cannot be undone.`;

    $("confirmBackdrop").hidden = false;

    document.body.style.overflow = "hidden";

    $("cancelDelete").focus();

}


function closeDeleteModal() {

    if (state.deleting) return;

    $("confirmBackdrop").hidden = true;

    state.deleteTarget = null;

    document.body.style.overflow = "";

}


async function deleteRecord() {

    if (
        !state.deleteTarget ||
        state.deleting
    ) return;

    const {

        resource,

        id

    } = state.deleteTarget;

    state.deleting = true;

    $("confirmDelete").disabled = true;

    $("cancelDelete").disabled = true;

    $("confirmDelete").innerHTML = `

        <span class="spinner"></span>

        Deleting...

    `;

    try {

        const result = await apiRequest(

            `/${resource}/${encodeURIComponent(id)}`,

            {

                method: "DELETE"

            }

        );

        state.deleting = false;

        closeDeleteModal();

        showToast(

            result.message ||

            "Record deleted successfully."

        );

        await refreshCurrentPage();

    } catch (error) {

        state.deleting = false;

        closeDeleteModal();

        showToast(error.message, "error");

    } finally {

        state.deleting = false;

        $("confirmDelete").disabled = false;

        $("cancelDelete").disabled = false;

        $("confirmDelete").innerHTML =

            `${icon("trash")} Delete Record`;

    }

}


/* =====================================================
   REFRESH DATA
===================================================== */

async function refreshCurrentPage() {

    if (state.page === "dashboard") {

        await loadDashboard();

    } else {

        await loadResource(state.page);

    }

}


/* =====================================================
   LIGHT AND DARK MODE
===================================================== */

function applyTheme(theme) {

    const dark = theme === "dark";

    document.body.classList.toggle(

        "dark-mode",

        dark

    );

    $("themeIcon").setAttribute(

        "href",

        dark ? "#i-sun" : "#i-moon"

    );

    try {

        localStorage.setItem(
            "carepoint-theme",
            theme
        );

    } catch {

        // Theme still works without local storage.

    }

}


function toggleTheme() {

    const dark = document.body.classList.contains(
        "dark-mode"
    );

    applyTheme(dark ? "light" : "dark");

}


/* =====================================================
   MOBILE NAVIGATION
===================================================== */

function openSidebar() {

    $("sidebar").classList.add("open");

    $("mobileOverlay").classList.add("show");

}


function closeSidebar() {

    $("sidebar").classList.remove("open");

    $("mobileOverlay").classList.remove("show");

}


/* =====================================================
   RIPPLE BUTTON EFFECT
===================================================== */

function createRipple(event, button) {

    if (button.disabled) return;

    const rect = button.getBoundingClientRect();

    const ripple = document.createElement("span");

    ripple.className = "ripple";

    ripple.style.left =

        `${event.detail ? event.clientX - rect.left : rect.width / 2}px`;

    ripple.style.top =

        `${event.detail ? event.clientY - rect.top : rect.height / 2}px`;

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 650);

}


/* =====================================================
   GLOBAL CLICK HANDLER
===================================================== */

document.addEventListener("click", async event => {

    const button = event.target.closest("button");

    if (!button) return;

    if (
        button.matches(
            ".btn, .nav-item, .action-btn"
        )
    ) {

        createRipple(event, button);

    }

    if (button.dataset.page) {

        await navigate(button.dataset.page);

        return;

    }

    if (button.dataset.add) {

        await openRecordModal(
            button.dataset.add
        );

        return;

    }

    if (button.dataset.retry) {

        await refreshCurrentPage();

        return;

    }

    if (button.dataset.view) {

        state.view = button.dataset.view;

        document.querySelectorAll(".view-button")

            .forEach(item => {

                item.classList.toggle(

                    "active",

                    item.dataset.view === state.view

                );

            });

        renderRecords();

        return;

    }

    const action = button.dataset.action;

    const resource = button.dataset.resource;

    const id = button.dataset.id;

    if (
        !action ||
        !id ||
        !RESOURCES.includes(resource)
    ) return;

    if (action === "view") {

        await viewRecord(resource, id);

    }

    if (action === "edit") {

        await openRecordModal(resource, id);

    }

    if (action === "delete") {

        openDeleteModal(resource, id);

    }

});


/* =====================================================
   EVENT LISTENERS
===================================================== */

$("heroAction").addEventListener(
    "click",
    () => {

        openRecordModal(

            state.page === "dashboard"

                ? "appointments"

                : state.page

        );

    }
);


$("addRecordButton").addEventListener(
    "click",
    () => openRecordModal(state.page)
);


$("searchInput").addEventListener(
    "input",
    () => {

        clearTimeout(state.searchTimer);

        state.requestVersion++;

        state.searchTimer = setTimeout(() => {

            loadResource(state.page);

        }, 300);

    }
);


$("filterSelect").addEventListener(
    "change",
    renderRecords
);


$("clearFilters").addEventListener(
    "click",
    async () => {

        clearTimeout(state.searchTimer);

        $("searchInput").value = "";

        $("filterSelect").value = "";

        await loadResource(state.page);

    }
);


$("recordForm").addEventListener(
    "submit",
    saveRecord
);


$("closeModal").addEventListener(
    "click",
    closeRecordModal
);


$("cancelModal").addEventListener(
    "click",
    closeRecordModal
);


$("cancelDelete").addEventListener(
    "click",
    closeDeleteModal
);


$("confirmDelete").addEventListener(
    "click",
    deleteRecord
);


$("themeButton").addEventListener(
    "click",
    toggleTheme
);


$("menuButton").addEventListener(
    "click",
    openSidebar
);


$("mobileOverlay").addEventListener(
    "click",
    closeSidebar
);


$("closeToast").addEventListener(
    "click",
    () => {

        clearTimeout(state.toastTimer);

        $("toast").className = "toast";

    }
);


$("refreshButton").addEventListener(
    "click",
    async () => {

        $("refreshButton").disabled = true;

        try {

            await Promise.all([

                checkConnection(),

                refreshCurrentPage()

            ]);

        } finally {

            $("refreshButton").disabled = false;

        }

    }
);


$("modalBackdrop").addEventListener(
    "click",
    event => {

        if (event.target === $("modalBackdrop")) {

            closeRecordModal();

        }

    }
);


$("confirmBackdrop").addEventListener(
    "click",
    event => {

        if (event.target === $("confirmBackdrop")) {

            closeDeleteModal();

        }

    }
);


document.querySelector(".brand").addEventListener(
    "click",
    event => {

        event.preventDefault();

        navigate("dashboard");

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeRecordModal();

            closeDeleteModal();

            closeSidebar();

        }

        if (event.key === "Tab") {

            const dialog =

                !$("confirmBackdrop").hidden

                    ? $("confirmBackdrop")

                    : !$("modalBackdrop").hidden

                        ? $("modalBackdrop")

                        : null;

            if (!dialog) return;

            const elements = Array.from(

                dialog.querySelectorAll(

                    "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)"

                )

            ).filter(element =>

                !element.hidden &&
                element.getClientRects().length

            );

            if (!elements.length) return;

            const first = elements[0];

            const last = elements[elements.length - 1];

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {

                event.preventDefault();

                last.focus();

            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {

                event.preventDefault();

                first.focus();

            }

        }

    }
);


/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

async function initialize() {

    $("currentDate").textContent =

        new Date().toLocaleDateString(

            "en-PH",

            {

                month: "short",

                day: "numeric",

                year: "numeric"

            }

        );

    let theme = "light";

    try {

        theme = localStorage.getItem(
            "carepoint-theme"
        ) || "light";

    } catch {

        // Default to light mode.

    }

    applyTheme(theme);

    await Promise.all([

        checkConnection(),

        navigate("dashboard")

    ]);

}


initialize();
