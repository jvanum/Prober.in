/* =========================================
   ADMIN V2 SYSTEM
========================================= */
window.addEventListener("load", () => {
    window.scrollTo(0, 0);
});
let adminCurrentPage = "orders";
let currentSupportUserId = null;


function adminAuthBoot(user) {
    if (!user || !isAdmin()) {
        document.body.innerHTML = "Access Denied";
        return;
    }

    adminShowPage("orders");
}
/* ---------- MENU TOGGLE ---------- */
function toggleAdminMenu() {

    document
      .getElementById("admin-flyout")
      .classList.toggle("open");
}
/* ---------- OPEN ADMIN ---------- */
function openAdminPanel() {
    if (!isAdmin()) {
        showToast("Access denied", "error");
        return;
    }

    window.location.href = "admin.html";
    adminShowPage("orders");
}

/* ---------- PAGE NAV ---------- */
function adminShowPage(page) {

    adminCurrentPage = page;

    // 1. Hide all pages
    document.querySelectorAll(".admin-page")
        .forEach(el => el.classList.remove("active"));

    // 2. Show target page
    const target = document.getElementById("admin-" + page);
    if (target) target.classList.add("active");

    // 3. Remove 'active' from all bottom nav buttons
    document.querySelectorAll(".admin-bottom-nav button")
        .forEach(btn => btn.classList.remove("active"));

    const map = {
        orders: 0,
        live: 1,
        manage: 2,
        support: 3
    };

    // 4. Add 'active' to the clicked button
    const btns = document.querySelectorAll(".admin-bottom-nav button");
    if (btns[map[page]]) {
        btns[map[page]].classList.add("active");
    }
    // Toggle the top-bar Add button visibility
    const topAddBtn = document.getElementById('top-add-btn');
    if (topAddBtn) {
        topAddBtn.style.display = (page === "manage") ? "flex" : "none";
    }
    // 5. Load page data
    if (page === "orders") adminLoadOrders();
    if (page === "live") adminLoadLive();
    if (page === "manage") adminLoadManage();
    if (page === "support") adminLoadSupport();
}
/* ---------- ORDERS ---------- */
async function adminLoadOrders() {

    const wrap =
      document.querySelector("#admin-orders .admin-list");

    if (!wrap) return;

    try {

        const orders =
          await pb.collection("orders").getFullList({
            sort:"-created"
          });

        if (!orders.length) {
            wrap.innerHTML =
              `<p>No incoming orders.</p>`;
            return;
        }

        wrap.innerHTML =
          orders.map(o => `
            <div class="admin-card"
              onclick="adminOpenOrder('${o.id}')">

              <strong>#${o.id.slice(0,5)}</strong>
              <p>₹${o.total_price} • ${o.status}</p>

            </div>
          `).join("");

    } catch(e) {
        console.error(e);
        wrap.innerHTML =
          `<p>Could not load orders.</p>`;
    }
}

async function adminOpenOrder(id) {

    const drawer =
      document.getElementById("order-drawer");

    if (!drawer) return;

    try {

        const order =
          await pb.collection("orders").getOne(id);

        drawer.querySelector(".drawer-body")
        .innerHTML = `
          <p><strong>#${id.slice(0,5)}</strong></p>
          <p>Status: ${order.status}</p>
          <p>Total: ₹${order.total_price}</p>

          <button class="btn-large"
            onclick="adminUpdateOrder(
              '${id}','Preparing'
            )">
            Accept
          </button>

          <button class="btn-large danger"
            onclick="adminUpdateOrder(
              '${id}','Cancelled'
            )">
            Reject
          </button>
        `;

        drawer.classList.add("open");

    } catch(e) {
        showToast("Order load failed","error");
    }
}

async function adminUpdateOrder(id,status){

    try{
        await pb.collection("orders")
        .update(id,{status});

        showToast("Updated","success");

        adminCloseOrder();
        adminLoadOrders();

    }catch(e){
        showToast("Failed","error");
    }
}

function adminCloseOrder(){
 document
 .getElementById("order-drawer")
 ?.classList.remove("open");
}

/* ---------- LIVE TAB (With Dynamic Categories) ---------- */
let liveItemsData = [];
let currentLiveCategory = 'All';

async function adminLoadLive() {
    const wrap = document.getElementById("admin-live");
    if (!wrap) return;

    // Show spinner while fetching
    wrap.innerHTML = `<div class="spinner" style="margin-top: 40px;"></div>`;

    try {
        liveItemsData = await pb.collection("menu_items").getFullList({ sort: "name" });
        adminRenderLiveView(currentLiveCategory);
    } catch (e) {
        wrap.innerHTML = "<p style='text-align:center;'>Failed to load live data.</p>";
    }
}

function adminRenderLiveView(category) {
    currentLiveCategory = category;
    const wrap = document.getElementById("admin-live");
    if (!wrap) return;

    // 1. Get unique categories dynamically from the database
    const categories = [...new Set(liveItemsData.map(i => i.category))].filter(Boolean);
    categories.unshift('All'); // Always put 'All' at the beginning

    // 2. Build the horizontal category scrollbar
    const catsHTML = categories.map(c => `
        <button class="admin-cat-pill ${c === currentLiveCategory ? 'active' : ''}"
                onclick="adminRenderLiveView('${c}')">
            ${c}
        </button>
    `).join('');

    // 3. Filter Items based on selection
    const filtered = currentLiveCategory === 'All'
        ? liveItemsData
        : liveItemsData.filter(i => i.category === currentLiveCategory);

    // 4. Render the locked layout 
    wrap.innerHTML = `
        <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <div class="admin-page-head" style="margin-bottom: 0 !important;">
                <h2 style="margin:0; font-size:1.5rem; font-weight:800;">Live Availability</h2>
            </div>
            <div class="admin-category-bar">
                ${catsHTML}
            </div>
        </div>
        
        <div class="admin-list manage-grid" style="align-content: start;">
            ${filtered.map(i => `
                <div class="stock-row">
                    <span style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">${i.name}</span>
                    <button class="${i.is_available ? '' : 'danger'}"
                            onclick="adminToggleStock('${i.id}', ${i.is_available})">
                        ${i.is_available ? 'IN' : 'OUT'}
                    </button>
                </div>
            `).join("")}
            ${filtered.length === 0 ? '<p style="color:var(--text-muted); grid-column: 1/-1;">No items in this category.</p>' : ''}
        </div>
    `;
}

async function adminToggleStock(id, current) {
    try {
        // Update PocketBase
        await pb.collection("menu_items").update(id, { is_available: !current });
        
        // Instantly update the local array to prevent screen jumping/loading
        const item = liveItemsData.find(i => i.id === id);
        if (item) item.is_available = !current;
        
        // Re-render UI
        adminRenderLiveView(currentLiveCategory);
        
        // Update the main app menu silently in the background
        if (typeof renderMenu === "function") renderMenu();

    } catch (e) {
        showToast("Update failed", "error");
    }
}
/* ---------- MANAGE ---------- */
function adminLoadManage(){
    const wrap = document.getElementById("admin-manage");
    if(!wrap) return;

    // Stripped the title and big buttons. Just the grid now.
    wrap.innerHTML = `
        <div id="manage-items-list" class="admin-list" style="margin-top: 10px;"></div>
    `;

    adminDeleteMode();
}

async function adminDeleteMode(){
    const list = document.getElementById("manage-items-list");
    if(!list) return;

    const items = await pb.collection("menu_items").getFullList({sort:"name"});

    // Render cards exactly like the Orders screen
    list.innerHTML = items.map(i=>`
        <div class="admin-card">
            <div>
                <strong>${i.name}</strong>
                <p>₹${i.price} • ${i.category}</p>
            </div>
            <button class="btn-large danger" onclick="adminDeleteItem('${i.id}')">
                Delete
            </button>
        </div>
    `).join("");
}

async function adminDeleteItem(id){

 if(!confirm("Delete item?")) return;

 try{
   await pb.collection("menu_items")
   .delete(id);

   showToast("Deleted","success");

   adminDeleteMode();
   renderMenu();

 }catch(e){
   showToast("Failed","error");
 }
}
/* ---------- ADD ITEM MODAL ---------- */
function adminOpenAddItem() {
    const drawer = document.getElementById('add-item-drawer');
    if (drawer) drawer.classList.add('open');
}

function adminCloseAddItem() {
    const drawer = document.getElementById('add-item-drawer');
    if (drawer) drawer.classList.remove('open');
}

async function adminHandleAddItem(event) {
    event.preventDefault(); // Stop the page from refreshing

    // 1. Grab all the values from your clean new form
    const name = document.getElementById('add-name').value.trim();
    const price = parseFloat(document.getElementById('add-price').value) || 0;
    const protein = parseFloat(document.getElementById('add-protein').value) || 0;
    const fat = parseFloat(document.getElementById('add-fat').value) || 0;
    const category = document.getElementById('add-category').value;

    if (!name || price <= 0) {
        showToast("Please enter a valid name and price.", "error");
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    if (btn) btn.innerText = "Saving...";

    try {
        // 2. Send the new dish directly to PocketBase
        await pb.collection('menu_items').create({
            name: name,
            price: price,
            protein: protein,
            fat: fat,
            category: category,
            is_available: true
        });

        showToast("Item added successfully!", "success");

        // 3. Clear the form and close the centered modal
        event.target.reset();
        adminCloseAddItem();

        // 4. Instantly refresh the Admin Manage grid to show the new item
        adminDeleteMode(); 
        
        // Update the live home screen menu in the background
        if (typeof renderMenu === "function") renderMenu();

    } catch (error) {
        console.error("Failed to create item:", error);
        showToast("Failed to create item. Check PocketBase API rules.", "error");
    } finally {
        if (btn) btn.innerText = "Save Item";
    }
}
/* ---------- SUPPORT ---------- */
async function adminLoadSupport(){

 const wrap =
 document.querySelector(
   "#admin-support .admin-list"
 );

 if(!wrap) return;

 try{

  const users =
   await pb.collection("customers")
   .getFullList({sort:"name"});

  wrap.innerHTML =
   users.map(u=>`
    <div class="admin-card"
      onclick="
       adminOpenSupport(
        '${u.id}',
        '${(u.name||u.phone).replace(/'/g,"")}
       )
      ">

      <strong>${u.name||u.phone}</strong>
      <p>Open chat</p>

    </div>
   `).join("");

 }catch(e){
  wrap.innerHTML="<p>Failed.</p>";
 }
}

async function adminOpenSupport(id,name){

 currentSupportUserId = id;

 const drawer =
 document.getElementById(
   "support-drawer"
 );

 document.getElementById(
   "chat-user-name"
 ).innerText = name;

 const chat =
 drawer.querySelector(".drawer-chat");

 try{

 const msgs =
 await pb.collection("messages")
 .getFullList({
   filter:`customer_id="${id}"`,
   sort:"created"
 });

 chat.innerHTML =
 msgs.map(m=>`
  <div class="${
   m.sender_role==="admin"
   ?"msg-right":"msg-left"
  }">
   ${m.message}
  </div>
 `).join("");

 drawer.classList.add("open");

 }catch(e){
  showToast("Chat failed","error");
 }
}

function adminCloseSupport(){
 document
 .getElementById("support-drawer")
 ?.classList.remove("open");
}

async function sendAdminReply(){

 if(!currentSupportUserId) return;

 const drawer =
 document.getElementById(
   "support-drawer"
 );

 const input =
 drawer.querySelector("input");

 const msg =
 input.value.trim();

 if(!msg) return;

 try{

 await pb.collection("messages")
 .create({
   customer_id:
    currentSupportUserId,
   message:msg,
   sender_role:"admin",
   sender_name:"Admin"
 });

 input.value="";

 adminOpenSupport(
   currentSupportUserId,
   document.getElementById(
    "chat-user-name"
   ).innerText
 );

 }catch(e){
  showToast("Failed","error");
 }
}



/* =========================
   LOGOUT ADMIN FUNCTION
========================= */
/* =========================
   LOGOUT ADMIN FUNCTION
========================= */
async function adminLogout() {
    
    // NEW: Ask for confirmation before logging out
    if (!confirm("Are you sure you want to log out of the Admin Panel?")) {
        // If they click "Cancel", close the menu and stay on the page
        document.getElementById("admin-flyout").classList.remove("open");
        return; 
    }

    try {
        await auth.signOut();
    } catch (e) {}

    try {
        pb.authStore.clear();
    } catch (e) {}

    localStorage.removeItem("prober_cart");

    window.location.href = "index.html";
}