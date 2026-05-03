const firebaseConfig = {
  apiKey: "AIzaSyBdmozHYLYhk6WEalzEr5KnuSJ15HwrTzI",
  authDomain: "prober-in.firebaseapp.com",
  projectId: "prober-in",
  appId: "1:1010127732292:web:643dca6fd31a7c762b8611"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const API_URL =  "https://proberin-production.up.railway.app";

const pb = new PocketBase(API_URL);
/* ---------- GLOBAL STATE ---------- */
window.currentCustomer = null;
/* ---------- ADMIN USERS ---------- */
const ADMIN_UIDS = ["Yjeb54aT9uRirfnbakTxBN2qdF33"];
/* ==================================
   GLOBAL THEME SYSTEM
================================== */
window.appThemes = {
  "clean-white": {
    "--brand-green":"#10b981",
    "--bg-light":"#ffffff",
    "--text-main":"#111827",
    "--text-muted":"#6b7280",
    "--border-color":"#e5e7eb",
    "--card-bg":"#f9fafb"
  },
  "dark-grey": {
    "--brand-green":"#3b82f6",
    "--bg-light":"#111827",
    "--text-main":"#f9fafb",
    "--text-muted":"#9ca3af",
    "--border-color":"#374151",
    "--card-bg":"#1f2937"
  },
  "white-accent": {
    "--brand-green":"#8b5cf6",
    "--bg-light":"#ffffff",
    "--text-main":"#111827",
    "--text-muted":"#6b7280",
    "--border-color":"#e5e7eb",
    "--card-bg":"#ffffff"
  },
  "dark-accent": {
    "--brand-green":"#f97316",
    "--bg-light":"#1f2937",
    "--text-main":"#f9fafb",
    "--text-muted":"#9ca3af",
    "--border-color":"#4b5563",
    "--card-bg":"#111827"
  }
};

window.applyTheme = function(name) {
    const theme = window.appThemes[name];
    if (!theme) return;

    // Apply CSS variables to document
    Object.entries(theme).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
    });

    // Update the mobile status bar color dynamically
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", theme["--card-bg"] || theme["--bg-light"]);
    }

    localStorage.setItem("theme", name);
};

window.selectTheme = function(name) {
    // 1. Apply the CSS variables to the document
    window.applyTheme(name);

    // 2. Visually update the buttons in the sidebar to show which is active
    const themeBtns = document.querySelectorAll('.theme-box');
    if (themeBtns.length > 0) {
        themeBtns.forEach(btn => {
            btn.classList.remove('active');
            // Check if this button's onclick attribute matches the selected theme
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(name)) {
                btn.classList.add('active');
            }
        });
    }
};

/* ---------- HELPERS ---------- */
function isAdmin() {

  const user = auth.currentUser;

  if (!user) return false;

  return ADMIN_UIDS.includes(user.uid);
}


/* ---------- TOAST ---------- */
function showToast(
  message,
  type = "info"
) {

  let wrap =
    document.getElementById(
      "toast-container"
    );

  if (!wrap) {

    wrap =
      document.createElement("div");

    wrap.id =
      "toast-container";

    wrap.style.cssText = `
      position:fixed;
      left:50%;
      bottom:90px;
      transform:translateX(-50%);
      z-index:9999;
      display:flex;
      flex-direction:column;
      gap:10px;
      align-items:center;
      pointer-events:none;
    `;

    document.body.appendChild(wrap);
  }

  const toast =
    document.createElement("div");

  let bg = "#111827";

  if (type === "success")
    bg = "#16a34a";

  if (type === "error")
    bg = "#dc2626";

  toast.innerText = message;

  toast.style.cssText = `
    background:${bg};
    color:#fff;
    padding:12px 18px;
    border-radius:999px;
    font-size:.92rem;
    font-weight:700;
    opacity:0;
    transform:translateY(10px);
    transition:.25s ease;
    box-shadow:0 10px 25px rgba(0,0,0,.18);
    max-width:85vw;
    text-align:center;
  `;

  wrap.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform =
      "translateY(0)";
  });

  setTimeout(() => {

    toast.style.opacity = "0";
    toast.style.transform =
      "translateY(8px)";

    setTimeout(() => {
      toast.remove();
    }, 250);

  }, 2600);
}


/* ---------- CUSTOMER FETCH ---------- */
async function syncCurrentCustomer(
  user
) {

  if (!user) {
    window.currentCustomer = null;
    return null;
  }

  try {

    const customer =
      await pb.collection(
        "customers"
      ).getFirstListItem(
        `phone="${user.phoneNumber}"`
      );

    window.currentCustomer =
      customer;

    return customer;

  } catch (e) {

    console.warn(
      "Customer not found"
    );

    window.currentCustomer =
      null;

    return null;
  }
}


/* ---------- GLOBAL AUTH LISTENER ---------- */
auth.onAuthStateChanged(
  async (user) => {

    await syncCurrentCustomer(
      user
    );

    /* Customer page only */
    if (
      typeof updateAuthUI ===
      "function"
    ) {
      updateAuthUI(user);
    }

    /* Admin page only */
    if (
      typeof adminAuthBoot ===
      "function"
    ) {
      adminAuthBoot(user);
    }
  }
);


/* ---------- LOGOUT ---------- */
async function sharedLogout() {

  try {

    await auth.signOut();

  } catch (e) {
    console.error(e);
  }

  try {

    pb.authStore.clear();

  } catch (e) {}
}


/* ---------- SAFE PAGE CHECK ---------- */
function isAdminPage() {

  return window.location
    .pathname
    .toLowerCase()
    .includes("admin");
}
/* =====================================================
   INITIALIZATION ON PAGE LOAD
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Load Theme & Highlight correct button in sidebar
    const savedTheme = localStorage.getItem("theme") || "clean-white";
    if (typeof window.selectTheme === 'function') {
        window.selectTheme(savedTheme); 
    } else {
        applyTheme(savedTheme);
    }

    // Load Font & Highlight correct button in sidebar
    const savedFont = localStorage.getItem("prober_font") || "Outfit";
    if (typeof window.changeFont === 'function') {
        window.changeFont(savedFont);
    }
});