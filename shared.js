/* =====================================================
   SHARED.JS
   Common layer for index.html + admin.html
===================================================== */

/* ---------- FIREBASE ---------- */
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


/* ---------- POCKETBASE ---------- */
const API_URL =
  "https://proberin-production.up.railway.app";

const pb = new PocketBase(API_URL);


/* ---------- GLOBAL STATE ---------- */
window.currentCustomer = null;


/* ---------- ADMIN USERS ---------- */
const ADMIN_UIDS = [
  "Yjeb54aT9uRirfnbakTxBN2qdF33"
];

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

window.applyTheme = function(name){

    const theme = appThemes[name];
    if(!theme) return;

    Object.entries(theme).forEach(
      ([k,v])=>{
        document.documentElement
          .style
          .setProperty(k,v);
      }
    );

    localStorage.setItem(
      "theme",
      name
    );
};

window.renderThemeSwatches = function(){

    const box =
      document.getElementById(
        "theme-swatch-container"
      );

    if(!box) return;

    const current =
      localStorage.getItem("theme")
      || "clean-white";

    box.innerHTML =
      Object.entries(appThemes)
      .map(([key,vars])=>`

        <button
          class="theme-swatch
            ${current===key?'active':''}"
          onclick="
            applyTheme('${key}');
            renderThemeSwatches();
            closeThemePanel();
          "
          style="
            background:${vars["--card-bg"]};
            border:2px solid ${vars["--brand-green"]};
          ">
        </button>

      `).join("");
};

window.openThemePanel = function () {

    const panel =
      document.getElementById("theme-panel");

    if (!panel) return;

    panel.classList.add("open");
    renderThemeSwatches();

    setTimeout(() => {
      document.addEventListener(
        "click",
        closeThemePanelOutsideClick
      );
    }, 0);
};

window.closeThemePanel = function () {

    const panel =
      document.getElementById("theme-panel");

    if (panel) {
      panel.classList.remove("open");
    }

    document.removeEventListener(
      "click",
      closeThemePanelOutsideClick
    );
};
function closeThemePanelOutsideClick(e) {

    const panel =
      document.getElementById("theme-panel");

    if (!panel) return;

    const clickedInsidePanel =
      panel.contains(e.target);

    const clickedThemeButton =
      e.target.closest(
        ".theme-open-btn"
      );

    if (
      !clickedInsidePanel &&
      !clickedThemeButton
    ) {
      closeThemePanel();
    }
}

/* =====================================================
   BULLETPROOF THEME DROPDOWN TOGGLE
===================================================== */
window.toggleThemeDropdown = function(e){
    e.stopPropagation();
    
    const box = document.getElementById("theme-dropdown");
    
    // Fix: Safely grab the button that was actually clicked
    // instead of relying on the sometimes-unreliable event target
    const btn = e.target.closest('.theme-open-btn') || document.querySelector('.theme-open-btn');
    
    if (!box || !btn) return;

    // Calculate position before opening
    if (!box.classList.contains("open")) {
        const rect = btn.getBoundingClientRect();
        
        box.style.top = (rect.bottom + 10) + "px";
        
        // Center it under the icon
        let dropLeft = rect.left + (rect.width / 2) - 48; 
        
        // Safety check for small mobile screens
        if (dropLeft + 96 > window.innerWidth) dropLeft = window.innerWidth - 106; 
        if (dropLeft < 10) dropLeft = 10;

        box.style.left = dropLeft + "px";
        box.style.right = "auto";
    }

    box.classList.toggle("open");
    
    // Ensure app.js hasn't forced it permanently hidden
    box.classList.remove("hidden"); 
};

/* =====================================================
   SAFE GLOBAL CLICK LISTENER (Replaces the old one)
===================================================== */
document.addEventListener("click", function(e) {
    const box = document.getElementById("theme-dropdown");
    const btn = document.querySelector('.theme-open-btn');
    
    if (box && box.classList.contains("open")) {
        // Only close it if the user clicked OUTSIDE both the dropdown and the button
        if (!box.contains(e.target) && btn && !btn.contains(e.target)) {
            box.classList.remove("open");
        }
    }
});

window.selectTheme = function(name){

    applyTheme(name);

    document
      .getElementById("theme-dropdown")
      .classList.remove("open");
};


document.addEventListener(
"DOMContentLoaded",()=>{

   const saved =
     localStorage.getItem("theme")
     || "clean-white";

   applyTheme(saved);

});




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