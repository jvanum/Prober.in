
let confirmationResult = null;
let isOtpSent = false;
let currentCategory = 'Vegetarian';
let cart = JSON.parse(localStorage.getItem('prober_cart')) || [];
let adminItemsData = [];
let currentAdminCategory = 'All';
let currentSlide = 0;
let fetchedBuilderData = { bases: [], proteins: [], fats: [] }; 
let currentBuild = { base: null, protein: null, fat: null };    
let verifyingOtp = false;
let pendingCartItem = null;


const STORE_LOCATION = {
  lat: 17.699306 ,   // replace with your kitchen lat
  lng: 83.159611 , // replace with your kitchen lng
};

const DELIVERY_RADIUS_KM = 3;

auth.onAuthStateChanged((user) => {

  if (window.location.pathname.includes("admin"))
    return;

  if (user) {
    updateLoggedInUI(
      window.currentCustomer?.name ||
      user.phoneNumber
    );
  } else {
    handleLogoutUIOnly();
  }

});

function handleLogoutUIOnly() {
  window.currentUser = null;

  document.getElementById("login-section").style.display = "block";
  document.getElementById("user-section").style.display = "none";
  document.getElementById("logout-menu-btn").style.display = "none";
}


async function handleLogout(){
 await auth.signOut();
// DESTROY THE VIP TOKEN
 pb.authStore.clear();
 window.currentUser = null;

 document.getElementById("login-section").style.display = "block";
 document.getElementById("user-section").style.display = "none";
 document.getElementById("logout-menu-btn").style.display = "none";

 showToast("Logged out", "success");
}

function updateAuthUI(user) {
  if (user) {
    updateLoggedInUI(user.phoneNumber || user.phone || "User");
  } else {
    handleLogoutUIOnly();
  }
}





const dataService = {
    getMenu: async () => {
        return fetchPublicMenuItems();
    }
};



pb.collection('messages').subscribe('*', function (e) {
    const currentUser = window.currentCustomer;
    
    
    if (e.action === 'create' && e.record.customer_id === currentUser?.id && e.record.sender_role === 'admin') {
        triggerNotification();
        loadChat(); 
    }
}).catch((err) => {
    if (!isAdminOnlyError(err)) console.warn("Message realtime subscription unavailable:", err);
});

/* =====================================================
   MENU DATA FETCHING (Strictly Database)
===================================================== */
const MENU_ITEMS_PUBLIC_READ_ENABLED = true; // Pipeline OPEN

let publicMenuCache = null;
let publicMenuRequest = null;
let hasLoggedMenuPermissionWarning = false;

// KEEP THIS: Used by the Live Chat system to ignore admin errors silently
function isAdminOnlyError(error) {
    return error?.status === 403 && /only admins/i.test(error?.message || error?.response?.message || '');
}

// KEEP THIS: Formats your macros perfectly
function normalizeMenuItem(item) {
    return {
        ...item,
        price: Number(item.price || 0),
        protein: Number(item.protein || 0),
        fat: Number(item.fat || 0),
        macros: item.macros || `${Number(item.protein || 0)}g P | ${Number(item.fat || 0)}g F`
    };
}



// THE FIX: Stripped out the fake menu loader. It only asks the database now.
async function fetchPublicMenuItems() {
    if (publicMenuCache) return publicMenuCache;
    if (publicMenuRequest) return publicMenuRequest;

    publicMenuRequest = pb.collection('menu_items').getFullList({
        filter: 'is_available = true',
        sort: 'name',
    }).then(records => {
        publicMenuCache = records.map(normalizeMenuItem);
        return publicMenuCache;
    }).catch(error => {
        console.error("PocketBase Menu Fetch Error. Did you unlock API rules?", error);
        return []; 
    }).finally(() => {
        publicMenuRequest = null;
    });

    return publicMenuRequest;
}


window.addEventListener('offline', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.style.display = 'block';
        showToast("Connection lost. Some features may not work.", "error");
    }
});

window.addEventListener('online', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.style.display = 'none';
        showToast("Back online!", "success");
    }
});


function switchScreen(screenId, isBackNavigation = false) {
    // 1. Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // 2. Show target screen
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }


if (screenId === "menu") {
  renderMenu();
}

    // 3. Update Bottom Nav UI
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${screenId}`);
    if (activeNav) activeNav.classList.add('active');

    // 4. Update Browser History
    if (!isBackNavigation) {
        history.pushState({ screenId: screenId }, '', `#${screenId}`);
    }
}

// 5. Handle the physical Back Button click
window.onpopstate = function(event) {
    if (event.state && event.state.screenId) {
        // Switch to the previous screen without pushing a new history entry
        switchScreen(event.state.screenId, true);
    } else {
        // If there's no state (like the very first load), default to Home
        switchScreen('home', true);
    }
};

// 6. Initialize on page load
window.onload = () => {
    const hash = window.location.hash.replace('#', '');
    const initialScreen = hash || 'home';
    switchScreen(initialScreen);
};
function openAdminPanel() {

    const user = auth.currentUser;

    if (!user || !isAdmin()) {
        showToast("Admin only", "error");
        return;
    }

    window.location.href = "admin.html";
}


let vaultResolve = null;

function askVaultKey() {
    document.getElementById("vault-modal").classList.remove("hidden");
    document.getElementById("vault-key-input").value = "";
    
    setTimeout(() => { document.getElementById("vault-key-input").focus(); }, 100);

    return new Promise(resolve => { vaultResolve = resolve; });
}

function closeVaultModal() {
    document.getElementById("vault-modal").classList.add("hidden");
    if (vaultResolve) { vaultResolve(null); vaultResolve = null; }
}

function submitVaultKey() {
    const val = document.getElementById("vault-key-input").value.trim();
    document.getElementById("vault-modal").classList.add("hidden");
    if (vaultResolve) { vaultResolve(val); vaultResolve = null; }
}
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  container.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => toast.remove(), 250);

  }, 2200);
}



function hasVerifiedLocation() {
  return localStorage.getItem("prober_location_verified") === "true";
}

function saveVerifiedLocation(lat, lng) {
  localStorage.setItem("prober_location_verified", "true");
  localStorage.setItem("prober_user_lat", lat);
  localStorage.setItem("prober_user_lng", lng);
}

function clearVerifiedLocation() {
  localStorage.removeItem("prober_location_verified");
  localStorage.removeItem("prober_user_lat");
  localStorage.removeItem("prober_user_lng");
}

function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
    Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function guardedAddToCart(id, name, price) {
  if (hasVerifiedLocation()) {
    addToCart(id, name, price);
    return;
  }

  pendingCartItem = { id, name, price };

  openLocationGate();
}

function continuePendingCart() {
  if (!pendingCartItem) return;

  addToCart(
    pendingCartItem.id,
    pendingCartItem.name,
    pendingCartItem.price
  );

  pendingCartItem = null;
}

function openLocationGate() {
  document
    .getElementById("location-gate")
    .classList.remove("hidden");
}

function closeLocationGate() {
  document
    .getElementById("location-gate")
    .classList.add("hidden");
}

function detectUserLocation() {
  if (!navigator.geolocation) {
    showToast("Location not supported", "error");
    return;
  }

  showToast("Checking area...");

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const distance = getDistanceKm(
        STORE_LOCATION.lat,
        STORE_LOCATION.lng,
        lat,
        lng
      );

      if (distance <= DELIVERY_RADIUS_KM) {
        saveVerifiedLocation(lat, lng);

        closeLocationGate();

        showToast("We deliver there 🎉");

        continuePendingCart();

      } else {
        showToast("We don't deliver there yet");
      }
    },
    function() {
      showToast("Unable to fetch location", "error");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}


function toggleMenu() {
    const menu = document.getElementById('side-menu-panel');
    const overlay = document.getElementById('menu-overlay');
    document.getElementById('cart-panel').classList.remove('open');
    menu.classList.toggle('open');
    overlay.classList.toggle('hidden', !menu.classList.contains('open'));
}

function toggleCart() {
    const cart = document.getElementById('cart-panel');
    const overlay = document.getElementById('menu-overlay');
    document.getElementById('side-menu-panel').classList.remove('open');
    cart.classList.toggle('open');
    overlay.classList.toggle('hidden', !cart.classList.contains('open'));
}

function handleVegToggle(checkbox) {
    const nonVegBtn = document.getElementById('category-Non Vegetarian');
    const sideToggle = document.getElementById('side-veg-toggle');
    const headerToggle = document.getElementById('header-veg-toggle');
    
    if (sideToggle) sideToggle.checked = checkbox.checked;
    if (headerToggle) headerToggle.checked = checkbox.checked;

    if (checkbox.checked) {
        if (nonVegBtn) nonVegBtn.style.display = 'none';
        if (currentCategory === 'Non Vegetarian') setMenuCategory('Vegetarian');
    } else {
        if (nonVegBtn) nonVegBtn.style.display = 'inline-flex';
    }
}


function moveCarousel(direction) {
    const track = document.getElementById('carousel-track');
    if (!track) return;
    const slides = track.querySelectorAll('.carousel-img');
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    if (currentSlide >= slides.length) currentSlide = 0;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

function goToCreate() {
    document.getElementById('bmi-height').value = '';
    document.getElementById('bmi-weight').value = '';
    document.getElementById('bmi-score-container').style.display = 'none';
    document.getElementById('bmi-recommendations-container').style.display = 'none';
    document.getElementById('bmi-history-container').style.display = 'block';
    switchScreen('create');
}


document.addEventListener('mousedown', (e) => {

    const sideMenu =
      document.getElementById('side-menu-panel');

    const cartPanel =
      document.getElementById('cart-panel');

    const themeDropdown =
      document.getElementById('theme-dropdown');

    const themeBtn =
      document.querySelector('.theme-open-btn');

    const overlay =
      document.getElementById('menu-overlay');

    if (
        sideMenu &&
        cartPanel &&
        !sideMenu.contains(e.target) &&
        !cartPanel.contains(e.target) &&
        !e.target.closest('.nav-btn')
    ) {
        sideMenu.classList.remove('open');
        cartPanel.classList.remove('open');

        if (overlay)
          overlay.classList.add('hidden');
    }

    if (
        themeDropdown &&
        !themeDropdown.contains(e.target) &&
        (!themeBtn ||
         !themeBtn.contains(e.target))
    ) {
        themeDropdown.classList.add('hidden');
    }

});

/* =====================================================
   PRODUCTION-READY CART & BILLING
===================================================== */
function updateCartUI() {
    localStorage.setItem('prober_cart', JSON.stringify(cart));

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    const container = document.getElementById('cart-items-container');
    const footer = document.getElementById('cart-footer');

    if (cart.length === 0) {
        if (footer) footer.style.display = "none";
        container.innerHTML = `
            <div style="text-align:center; color:var(--text-muted); margin-top:60px; padding:20px; animation: popIn 0.4s ease;">
                <div style="background: var(--bg-light); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-shopping-bag" style="font-size:2.5rem; color: var(--border-color);"></i>
                </div>
                <h3 style="color: var(--text-main); margin-bottom: 8px;">Your cart is empty</h3>
                <p style="margin-bottom:24px; font-size: 0.9rem;">Looks like you haven't added any healthy meals yet.</p>
                <button onclick="toggleCart(); switchScreen('menu')" class="btn-large" style="width:100%; max-width:220px; margin:auto; border-radius: 99px;">
                    Browse Menu
                </button>
            </div>
        `;
    } else {
        if (footer) footer.style.display = "block";
        
        // 1. Calculate Taxes and Fees dynamically
        const gst = Math.round(subtotal * 0.05); // 5% GST
        const deliveryFee = subtotal > 499 ? 0 : 30; // Free delivery over ₹499
        const grandTotal = subtotal + gst + deliveryFee;

        // Update the footer button total
        const totalEl = document.getElementById('cart-total-price');
        if (totalEl) totalEl.innerText = grandTotal;

        // 2. Render Items with Serial Numbers & Subtotals
        let html = cart.map((item, index) => `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px dashed var(--border-color);">
                <div style="display: flex; gap: 12px; flex: 1;">
                    <div style="font-weight: 800; color: var(--text-muted); font-size: 0.9rem; margin-top: 2px;">${index + 1}.</div>
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px; line-height: 1.2;">${item.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">₹${item.price} <span style="font-size: 0.75rem; margin: 0 4px;">x</span> ${item.quantity}</div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                    <div style="font-size: 0.95rem; color: var(--text-main); font-weight: 800;">₹${item.price * item.quantity}</div>
                    <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 6px;">
                        <button style="background:none; border:none; padding:0; cursor:pointer; color:var(--brand-green); font-weight: bold; font-size: 1.1rem; width: 24px; display: flex; align-items: center; justify-content: center;" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                        <span style="font-weight: 700; font-size: 0.85rem; width: 14px; text-align: center; color: var(--text-main);">${item.quantity}</span>
                        <button style="background:none; border:none; padding:0; cursor:pointer; color:var(--brand-green); font-weight: bold; font-size: 1.1rem; width: 24px; display: flex; align-items: center; justify-content: center;" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `).join('');

        // 3. Render Production-Level Bill Summary
        html += `
            <div style="background: var(--bg-light); border-radius: 16px; padding: 16px; margin-top: 8px; border: 1px solid var(--border-color);">
                <h4 style="margin: 0 0 16px 0; font-size: 0.85rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Bill Details</h4>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.9rem; color: var(--text-main);">
                    <span>Item Total</span>
                    <span style="font-weight: 600;">₹${subtotal}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.9rem; color: var(--text-main);">
                    <span style="display: flex; align-items: center;">
                        Delivery Fee 
                        ${deliveryFee === 0 ? '<span style="background: var(--brand-green); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 8px; font-weight: 800;">FREE</span>' : ''}
                    </span>
                    <span style="font-weight: 600;">${deliveryFee === 0 ? '<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.8rem; margin-right: 6px;">₹30</span>₹0' : '₹' + deliveryFee}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.9rem; color: var(--text-main);">
                    <span>Platform & GST (5%)</span>
                    <span style="font-weight: 600;">₹${gst}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px dashed var(--border-color); font-size: 1.1rem; font-weight: 800; color: var(--text-main);">
                    <span>To Pay</span>
                    <span>₹${grandTotal}</span>
                </div>
            </div>
            
            <div style="background: rgba(16, 185, 129, 0.08); border-radius: 12px; padding: 30px; margin-top: 16px; margin-bottom: 30px; display: flex; gap: 12px; align-items: center; border: 1px dashed rgba(16, 185, 129, 0.3);">
                <i class="fas fa-shield-alt" style="color: var(--brand-green); font-size: 1.5rem;"></i>
                <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
                    <strong style="color: var(--brand-green);">100% Safe & Hygienic</strong><br>
                    Meals prepared in a sanitized cloud kitchen.
                </div>
            </div>
            <div style="height: 20px;"></div>
        `;

        container.innerHTML = html;
    }
    
    syncAllMenuButtons();
}

/* =====================================================
   UPDATED CHECKOUT LOGIC (Includes Taxes/Fees)
===================================================== */
async function processCheckout() {
    const addressInput = document.getElementById('checkout-address')?.value.trim() || '';
    const notesInput = document.getElementById('checkout-notes')?.value.trim() || '';
    
    if (!auth.currentUser) {
        showToast("Please login to place an order.", "info");
        switchScreen('auth');
        toggleCheckoutModal();
        return;
    }

    if (!addressInput) {
        showToast("Please enter a delivery location/address.", "error");
        document.getElementById('checkout-address').focus(); 
        return; 
    }

    const orderBtn = document.querySelector('#checkout-modal .btn-large');
    if (orderBtn) {
        orderBtn.disabled = true;
        orderBtn.innerText = "Processing...";
    }

    // Recalculate exact totals for the database & WhatsApp
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gst = Math.round(subtotal * 0.05);
    const deliveryFee = subtotal > 499 ? 0 : 30;
    const grandTotal = subtotal + gst + deliveryFee;

    try {
        const order = await pb.collection('orders').create({
            customer_id: window.currentCustomer.id,
            total_price: grandTotal, // Save the final amount to DB
            status: 'Pending',
        });

        for (const item of cart) {
            await pb.collection('order_items').create({
                order_id: order.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.price
            });
        }

        // Send the detailed bill to WhatsApp
        let message = `*New Order: Prober* \n\n`;
        message += `📍 *Location:* ${addressInput}\n`;
        if (notesInput) message += `📝 *Notes:* ${notesInput}\n`;
        
        message += `\n*Items:*\n`;
        cart.forEach((item, index) => { 
            message += `${index + 1}. ${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}\n`; 
        });
        
        message += `\n*Bill Summary:*\n`;
        message += `Item Total: ₹${subtotal}\n`;
        message += `GST (5%): ₹${gst}\n`;
        message += `Delivery: ₹${deliveryFee}\n`;
        message += `*Grand Total: ₹${grandTotal}*`;

        window.open(`https://wa.me/918142581325?text=${encodeURIComponent(message)}`, '_blank');

        cart = [];
        updateCartUI();
        toggleCheckoutModal();
        
        document.getElementById('checkout-address').value = '';
        document.getElementById('checkout-notes').value = '';
        
        switchScreen('orders');

    } catch (error) {
        console.error("Order failed:", error);
        showToast("Order failed. Please try again.", "error");
    } finally {
        if (orderBtn) {
            orderBtn.disabled = false;
            orderBtn.innerText = "Place Order";
        }
    }
}
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    updateCartUI(); 
    
    
    const cartBtn = document.querySelector('.fa-shopping-cart').parentElement;
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
}


function updateCartQuantity(id, change) {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        updateCartUI();
    }
}



function getMenuButtonHTML(id, name, price) {
    const cartItem = cart.find(c => c.id === id);
    if (!cartItem) {
        
        return `<button class="btn-outline" style="padding: 0; font-size: 0.85rem; border-color: white; color: white; width: 90px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: rgba(0,0,0,0.3); border-radius: 8px;" 
            onclick="guardedAddToCart('${id}', '${name}', ${price})">
            + Add
        </button>`;
    } else {
        
        return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--brand-green); border-radius: 8px; width: 90px; height: 32px; overflow: hidden; box-shadow: 0 4px 12px rgba(16,185,129,0.4);">
            <button style="background: transparent; border: none; color: white; width: 32px; height: 100%; cursor: pointer; font-weight: bold; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; padding-bottom: 2px;" onclick="updateCartQuantity('${id}', -1)">-</button>
            <span style="color: white; font-weight: 800; font-size: 0.95rem;">${cartItem.quantity}</span>
            <button style="background: transparent; border: none; color: white; width: 32px; height: 100%; cursor: pointer; font-weight: bold; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; padding-bottom: 2px;" onclick="updateCartQuantity('${id}', 1)">+</button>
        </div>`;
    }
}

function toggleCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    modal.classList.toggle('hidden');

    if (!modal.classList.contains('hidden')) {
        const input = document.getElementById('checkout-phone-input');
        if (input) {
            input.value = window.currentUser?.phone || "";
        }
    }
}

function checkoutWhatsApp() {
    if (cart.length === 0) {
        showToast("Add some meals to your cart first!", "info");
        return;
    }
    toggleCheckoutModal(); 
}

function syncAllMenuButtons() {
    document.querySelectorAll('[id^="menu-btn-wrapper-"]').forEach(wrapper => {
        const id = wrapper.id.replace('menu-btn-wrapper-', '');
        const name = wrapper.getAttribute('data-name');
        const price = parseFloat(wrapper.getAttribute('data-price'));
        wrapper.innerHTML = getMenuButtonHTML(id, name, price);
    });
}


async function renderMenu() {
    const container = document.getElementById('menu-items-area'); 
     document.getElementById("menu-container");

    if (!container) return;
    
    
    container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); width: 100%;">
            <div class="spinner"></div>
            <div>Fetching fresh menu...</div>
        </div>
    `;

    try {
        
        const menuItems = await dataService.getMenu();
        const filteredItems = menuItems.filter(item => item.category === currentCategory);
        
        
        if (filteredItems.length === 0) {
            container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); width: 100%;">Sold out for today!</div>';
            return;
        }

        
        container.innerHTML = filteredItems.map(item => {
            const bgStyle = item.img ? `background-image: url('${item.img}');` : `background: linear-gradient(135deg, var(--border-color), var(--card-bg));`;
            const price = item.price || 150; 
            
            return `
                <div class="menu-item" style="${bgStyle}">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 70%); z-index: 1;"></div>
                    <div style="position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; justify-content: flex-end;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                            <div>
                                <h3>${item.name}</h3>
                                <p>${item.macros}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: white; font-weight: 800; font-size: 1.1rem; margin-bottom: 8px;">₹${price}</div>
                                <div id="menu-btn-wrapper-${item.id}" data-name="${item.name}" data-price="${price}">
                                    ${getMenuButtonHTML(item.id, item.name, price)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        
        container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #ef4444;">Error loading menu. Please try again later.</div>';
        console.error("Render Error:", err);
    }
}

function getImagePath(item) {
    if (item.img && item.img !== "") return item.img;
    
    
    const fileName = item.name.toLowerCase().replace(/\s+/g, '') + '.png';
    return `/images/${fileName}`; 
}


function setMenuCategory(c){currentCategory=c;document.querySelectorAll('.category-pill').forEach(b=>b.classList.toggle('active',b.id===`category-${c}`));renderMenu()}
function handleSwipeCategory(d){const c=['Vegetarian','Vegan','Non Vegetarian','Beverage'];const isVeg=document.getElementById('header-veg-toggle')?.checked;const a=isVeg?c.filter(x=>x!=='Non Vegetarian'):c;let i=a.indexOf(currentCategory);i=(d==='left')?(i+1)%a.length:(i-1+a.length)%a.length;setMenuCategory(a[i])}

/* =====================================================
   MEAL BUILDER FETCHING (Strictly Database)
===================================================== */
async function fetchBuilderData() {
    try {
        const records = await fetchPublicMenuItems();

        // Filter the database records into the builder categories
        fetchedBuilderData.bases = records.filter(i => i.category === 'Base');
        fetchedBuilderData.proteins = records.filter(i => i.category === 'Protein');
        fetchedBuilderData.fats = records.filter(i => i.category === 'Fat');

        renderMealBuilder();
    } catch (err) {
        console.error("Builder Fetch Error:", err);
        // If the fetch fails, render empty arrays so the UI doesn't crash
        fetchedBuilderData = { bases: [], proteins: [], fats: [] };
        renderMealBuilder();
    }
}

function selectBuilderItem(category, id) {
    currentBuild[category] = id;
    renderMealBuilder(); 
    updateBuilderSummary(); 
}

function updateBuilderSummary() {
    let totalP = 0, totalF = 0, price = 0;
    
    ['base', 'protein', 'fat'].forEach(cat => {
        if (currentBuild[cat]) {
            
            const item = fetchedBuilderData[cat + 's'].find(i => i.id === currentBuild[cat]);
            if (item) {
                totalP += item.protein || 0;
                totalF += item.fat || 0;
                price += item.price || 0;
            }
        }
    });

    document.getElementById('builder-price').innerText = price;
    document.getElementById('builder-macros').innerText = `${totalP}g P | ${totalF}g F`;
}

function renderMealBuilder() {
    
    const isVegMode = document.getElementById('header-veg-toggle')?.checked;

    ['bases', 'proteins', 'fats'].forEach(catKey => {
        const container = document.getElementById(`builder-${catKey}`);
        if (!container) return;

        
        let items = fetchedBuilderData[catKey];
        if (isVegMode) {
            items = items.filter(item => item.category_type !== 'Non Vegetarian');
        }
        
        container.innerHTML = items.map(item => `
            <div class="builder-card ${currentBuild[catKey.slice(0,-1)] === item.id ? 'selected' : ''}" 
                 onclick="selectBuilderItem('${catKey.slice(0,-1)}', '${item.id}')">
                <div style="font-weight: 700;">${item.name}</div>
                <div style="font-size: 0.8rem; display: flex; justify-content: space-between;">
                    <span>₹${item.price}</span>
                    <span style="color: var(--brand-green);">${item.protein}g P</span>
                </div>
            </div>
        `).join('');
    });
}

function addCustomBowlToCart() {
    if (!currentBuild.base || !currentBuild.protein) {
        showToast("Please select at least a Base and a Protein.", "info");
        return;
    }
    
    
    const baseItem = fetchedBuilderData.bases.find(i => i.id === currentBuild.base);
    const proteinItem = fetchedBuilderData.proteins.find(i => i.id === currentBuild.protein);
    const fatItem = currentBuild.fat ? fetchedBuilderData.fats.find(i => i.id === currentBuild.fat) : null;
    
    let price = baseItem.price + proteinItem.price + (fatItem ? fatItem.price : 0);
    const bowlName = `Custom: ${proteinItem.name} Bowl`;
    const bowlId = 'custom_' + Date.now();
    
    addToCart(bowlId, bowlName, price);
    showToast("Custom bowl added to cart!", "success");
    
    
    currentBuild = { base: null, protein: null, fat: null };
    renderMealBuilder();
    updateBuilderSummary(); 
}


async function getBMIRecommendations(goal) {
  let items = await dataService.getMenu();

  // only visible meal categories
  items = items.filter(item =>
    ["Vegetarian", "Vegan", "Non Vegetarian", "Beverage"]
      .includes(item.category)
  );

  if (goal === "bulk") {
    return items
      .sort((a, b) =>
        ((b.protein || 0) + (b.fat || 0)) -
        ((a.protein || 0) + (a.fat || 0))
      )
      .slice(0, 4);
  }

  if (goal === "maintain") {
    return items
      .sort((a, b) =>
        (b.protein || 0) - (a.protein || 0)
      )
      .slice(0, 4);
  }

  // cut / fat loss
  return items
    .sort((a, b) =>
      ((b.protein || 0) - (b.fat || 0)) -
      ((a.protein || 0) - (a.fat || 0))
    )
    .slice(0, 4);
}

async function calculateBMI() {
  let height = parseFloat(document.getElementById("bmi-height").value);
  let weight = parseFloat(document.getElementById("bmi-weight").value);

  const heightUnitEl = document.getElementById("height-unit");
  const weightUnitEl = document.getElementById("weight-unit");

  const heightUnit = heightUnitEl ? heightUnitEl.value : "cm";
  const weightUnit = weightUnitEl ? weightUnitEl.value : "kg";

  const age = parseInt(document.getElementById("bmi-age").value);
  const gender = document.getElementById("bmi-gender").value;

  if (!height || !weight || !age) {
    showToast("Please fill all fields", "error");
    return;
  }

  // Convert units
  const heightCm = heightUnit === "in" ? height * 2.54 : height;
  const weightKg = weightUnit === "lbs" ? weight * 0.453592 : weight;

  const heightM = heightCm / 100;
  const bmi = +(weightKg / (heightM * heightM)).toFixed(1);

  // BMR
  let bmr =
    (10 * weightKg) +
    (6.25 * heightCm) -
    (5 * age);

  bmr = gender === "male" ? bmr + 5 : bmr - 161;

  const dailyCalories = Math.round(bmr * 1.2);

  // Category + Goal (Indian cutoffs)
  let category = "";
  let goal = "";

  if (bmi < 18.5) {
    category = "Underweight (Bulk)";
    goal = "bulk";

  } else if (bmi < 23) {
    category = "Normal (Maintain)";
    goal = "maintain";

  } else if (bmi < 27.5) {
    category = "Overweight (Cut)";
    goal = "cut";

  } else {
    category = "High BMI (Fat Loss)";
    goal = "cut";
  }

  // Update score card
  document.getElementById("bmi-value").innerText = bmi;
  document.getElementById("bmi-category").innerText = category;

  const caloriesEl =
    document.getElementById("bmi-calories");

  if (caloriesEl) {
    caloriesEl.innerText =
      `Est. Daily Goal: ${dailyCalories} kcal`;
  }

  // Get REAL recommendations from DB
  let meals = [];

  try {
    meals = await getBMIRecommendations(goal);

  } catch (e) {
    console.error(e);
    showToast("Could not load meals", "error");
  }

  // Render meals
  const mealsHTML = meals.map(item => `
    <div class="rec-card">
      <div>
        <div class="rec-type">
          ${item.category}
        </div>

        <div class="rec-name">
          ${item.name}
        </div>
      </div>

      <div class="rec-macros">
        ${(item.protein || 0)}g P |
        ${(item.fat || 0)}g F
        <br>
        ₹${item.price}
      </div>
    </div>
  `).join("");

  const customCardHTML = `
    <div class="rec-card-custom"
         onclick="goToCreate()">
      <i class="fas fa-plus"
         style="
           font-size:1.5rem;
           color:var(--brand-green);
           margin-bottom:8px;
         ">
      </i>

      <div style="
        font-weight:800;
        color:var(--brand-green);
      ">
        Build Your Bowl
      </div>
    </div>
  `;

  const mealsContainer =
    document.getElementById("bmi-meals");

  if (mealsContainer) {
    mealsContainer.innerHTML =
      mealsHTML + customCardHTML;
  }

  // Show sections
  document.getElementById(
    "bmi-score-container"
  ).style.display = "block";

  const recContainer =
    document.getElementById(
      "bmi-recommendations-container"
    );

  if (recContainer) {
    recContainer.style.display = "block";
  }

  // Save history
  saveBmiHistory(
    bmi,
    category,
    heightCm.toFixed(1),
    weightKg.toFixed(1)
  );

  // Protein Goal
  const proteinGoalMin =
    Math.round(weightKg * 1.8);

  const proteinGoalMax =
    Math.round(weightKg * 2.2);

  const scoreCard =
    document.querySelector(".bmi-score-card");

  if (scoreCard) {
    const oldGoal =
      document.getElementById(
        "protein-goal-line"
      );

    if (oldGoal) oldGoal.remove();

    const proteinDisplay =
      document.createElement("p");

    proteinDisplay.id =
      "protein-goal-line";

    proteinDisplay.style.cssText =
      "color:var(--brand-green);font-weight:800;margin-top:10px;font-size:0.9rem;";

    proteinDisplay.innerHTML =
      `<i class="fas fa-dumbbell"></i> Daily Protein Goal: ${proteinGoalMin}g - ${proteinGoalMax}g`;

    scoreCard.appendChild(
      proteinDisplay
    );
  }
}

async function saveBmiHistory(bmi, category, height, weight) {
    if (!auth.currentUser) {
        showToast("Log in to save history!", "info");
        return;
    }
    try {
        await pb.collection('bmi_history').create({
            customer_id: window.currentCustomer.id,
            height, weight, bmi, category
        });
        renderBmiHistory();
    } catch (err) { showToast("Failed to save BMI.", "error"); }
}

async function renderBmiHistory() {
    const container = document.getElementById('bmi-history-container');
    const listEl = document.getElementById('bmi-history-list');
    
    if (!container || !listEl) return;

    
    if (!auth.currentUser) {
        container.style.display = 'none';
        return;
    }

    try {
        
        
        const resultList = await pb.collection('bmi_history').getList(1, 5, {
            filter: `customer_id = "${window.currentCustomer.id}"`,
            sort: '-created', 
        });

        const records = resultList.items;

        if (records.length === 0) {
            container.style.display = 'none';
            return;
        }

        
        listEl.innerHTML = records.map(record => {
            
            const date = new Date(record.created).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            });
            
            let catColor = 'var(--text-muted)';
            if (record.category.includes('Normal')) catColor = 'var(--brand-green)';
            if (record.category.includes('Overweight')) catColor = '#f97316'; 
            if (record.category.includes('Underweight')) catColor = '#3b82f6'; 

            return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${date}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${record.weight}kg • ${record.height}cm</div>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); line-height: 1;">${record.bmi}</div>
                    <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${catColor};">${record.category.split(' ')[0]}</div>
                </div>
            </div>
            `;
        }).join('');
        
        container.style.display = 'block';

    } catch (err) {
        console.error("BMI History Load Error:", err);
        container.style.display = 'none';
    }
}


async function loadChat() {
    if (!auth.currentUser) return;
    try {
        const msgs = await pb.collection('messages').getFullList({
            filter: `customer_id = "${window.currentCustomer.id}"`,
            sort: 'created'
        });
        document.getElementById('chat-messages').innerHTML = msgs.map(m => `
            <div class="message-bubble ${m.sender_role === 'admin' ? 'message-admin' : 'message-user'}">
                ${m.message}
            </div>
        `).join('');
    } catch (err) { console.error("Chat Error", err); }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || !auth.currentUser) return;

    try {
        await pb.collection('messages').create({
            customer_id: window.currentCustomer.id,
            message: msg,
            sender_role: 'customer',
            sender_name: window.currentCustomer.name || 'Customer'
        });
        input.value = '';
        loadChat();
    } catch (err) { showToast("Failed to send.", "error"); }
}


function triggerNotification(){if(navigator.vibrate)navigator.vibrate(200);new Audio('/assets/notification.mp3').play().catch(()=>{})}



function showAdminTab(tabId) {
    // 1. Hide all tab content sections
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 2. Remove the "active" highlight from all ribbon buttons
    document.querySelectorAll('.ribbon-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show the specific tab content you clicked
    const targetTab = document.getElementById(`admin-tab-${tabId}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // 4. Highlight the specific button you clicked
    const targetBtn = document.getElementById(`tab-${tabId}`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // 5. Fetch fresh data based on the tab you opened
    if (tabId === 'status' || tabId === 'delete') {
        renderAdminMenu();
    } else if (tabId === 'support') {
        loadAdminChat();
    }
}
let selectedFileForUpload = null;

async function renderAdminMenu() {
    if (!isAdmin()) return; // Protection added
    
    try {
        const records = await pb.collection('menu_items').getFullList({ sort: 'name' });
        adminItemsData = records;
        updateAdminView(currentAdminCategory || 'All');
    } catch (err) { console.error("Admin Load Error", err); }
}

async function updateItemAvailability(itemId, isAvailable) {
    if (!isAdmin()) return; 

    try {
        // Try to update the database
        await pb.collection('menu_items').update(itemId, { is_available: isAvailable });
        
        // If successful, re-fetch and update the screen
        renderAdminMenu(); 
        renderMenu();
    } catch (err) { 
        console.error(err);
        showToast("Update failed. Check PB Permissions.", "error"); 
        
        // THE FIX: Re-render the view using our cached data to snap the toggle back to reality
        updateAdminView(currentAdminCategory || 'All');
    }
}


async function handleAddItem(event) {
    event.preventDefault();
    if (!isAdmin()) {
        showToast("Access Denied.", "error");
        return;
    } // Protection added

    const formData = new FormData();
    formData.append('name', document.getElementById('add-name').value);
    formData.append('category', document.getElementById('add-category').value);
    formData.append('price', parseFloat(document.getElementById('add-price').value));
    formData.append('is_available', true);
    
    if (selectedFileForUpload) formData.append('img', selectedFileForUpload);

    try {
        await pb.collection('menu_items').create(formData);
        showToast("Dish published!", "success");
        event.target.reset();
        clearPreview();
        renderAdminMenu();
    } catch (err) { showToast("Error adding dish.", "error"); }
}



async function loadAdminChat() {
    if (!isAdmin()) return; // Protection added
    
    const listContainer = document.getElementById('admin-chat-users-list');
    const windowContainer = document.getElementById('admin-chat-window');
    // ... [rest of your existing loadAdminChat code remains exactly the same]
}

async function openAdminChat(userId, userName) {
    if (!isAdmin()) return; // Protection added
    // ... [rest of your existing openAdminChat code remains exactly the same]
}



async function deleteMenuItem(id, name) {
    if (!isAdmin()) {
        showToast("Access Denied: Please login with admin credentials.", "error");
        return;
    } // Protection added

    const confirmDelete = confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirmDelete) return;

    try {
        await pb.collection('menu_items').delete(id);
        showToast("Dish deleted successfully", "success");
        renderAdminMenu(); 
        renderMenu();      
    } catch (err) {
        console.error("Delete Error:", err);
        showToast("Failed to delete. Check your permissions.", "error");
    }
}

async function sendAdminReply() {
    if (!isAdmin()) return; // Protection added
    if (!currentAdminChatUserId) return;
    // ... [rest of your existing sendAdminReply code remains exactly the same]
}

function updateAdminView(category) {
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
        
        if (tab.innerText.trim() === category || 
           (category === 'Vegetarian' && tab.innerText.trim() === 'Veg') ||
           (category === 'Non Vegetarian' && tab.innerText.trim() === 'Non-Veg')) {
            tab.classList.add('active');
        }
    });

    
    currentAdminCategory = category;

    
    let filteredData = (category === 'All') 
        ? adminItemsData 
        : adminItemsData.filter(item => item.category === category);

    const statusContainer = document.getElementById('admin-menu-list-status');
    const deleteContainer = document.getElementById('admin-menu-list-delete');

    
    if (statusContainer) {
        if (filteredData.length === 0) {
            statusContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No items found.</p>';
        } else {
            statusContainer.innerHTML = filteredData.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                    <span style="font-weight: 600;">${item.name}</span>
                    <label class="switch"><input type="checkbox" ${item.is_available ? 'checked' : ''} onchange="updateItemAvailability('${item.id}', this.checked)"><span class="slider"></span></label>
                </div>
            `).join('');
        }
    }

    
    if (deleteContainer) {
        if (adminItemsData.length === 0) {
            deleteContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No items found.</p>';
        } else {
            deleteContainer.innerHTML = adminItemsData.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 12px;">
                    <span style="font-weight: 600;">${item.name}</span>
                    <button onclick="deleteMenuItem('${item.id}', '${item.name.replace(/'/g, "\\'")}')" style="background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 700;">
                        <i class="fas fa-trash-alt" style="margin-right: 4px;"></i> Delete
                    </button>
                </div>
            `).join('');
        }
    }
}




let currentAdminChatUserId = null;


function closeAdminChat() {
    currentAdminChatUserId = null;
    loadAdminChat(); 
}



function previewImage(input) {
    const container = document.getElementById('img-preview-container');
    const preview = document.getElementById('img-preview');
    
    if (input.files && input.files[0]) {
        selectedFileForUpload = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            container.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        clearPreview();
    }
}

function clearPreview() {
    selectedFileForUpload = null;
    const fileInput = document.getElementById('add-img-file');
    if (fileInput) fileInput.value = "";
    const container = document.getElementById('img-preview-container');
    if (container) container.style.display = 'none';
}


async function loadOrders() {
    const activeList = document.getElementById('active-orders-list');
    const recentList = document.getElementById('recent-orders-list');
    if (!activeList || !recentList || !auth.currentUser) return;

    try {
        const orders = await pb.collection('orders').getFullList({
            filter: `customer_id = "${window.currentCustomer.id}"`,
            sort: '-created',
            expand: 'order_items_via_order_id' 
        });

        const activeOrders = orders.filter(o => ['Pending', 'Preparing', 'Out for Delivery'].includes(o.status));
        const recentOrders = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.status));

        activeList.innerHTML = activeOrders.length ? activeOrders.map(o => renderOrderCard(o)).join('') : '<p>No active orders.</p>';
        recentList.innerHTML = recentOrders.length ? recentOrders.map(o => renderOrderCard(o)).join('') : '<p>No past orders.</p>';
    } catch (err) { console.error("Order Load Error", err); }
}



function renderOrderCard(order) {
    const date = new Date(order.created).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
    
    
    const itemsList = order.order_items.map(item => 
        `<span>${item.quantity}x ${item.item_name}</span>`
    ).join(', ');

    return `
    <div class="order-card" style="animation: fadeUp 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">Order #${order.id.slice(0, 5)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${date}</div>
            </div>
            <div class="status-badge status-${statusClass}">${order.status}</div>
        </div>
        <div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; line-height: 1.4;">
            ${itemsList}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 10px;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Total Paid</span>
            <span style="font-weight: 800; color: var(--brand-green); font-size: 1.1rem;">₹${order.total_price}</span>
        </div>
    </div>`;
}




async function handleSendOtp() {
  const inputEl = document.getElementById("auth-input");
  const sendBtn = document.getElementById("send-otp-btn");

  const digits = inputEl.value.trim().replace(/\D/g, "");

  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    showToast("Enter valid mobile", "error");
    return;
  }

  const phone = "+91" + digits;

const userIdEl = document.getElementById("user-identifier");

if (userIdEl) {
  userIdEl.innerText = phone;
}

  try {
    sendBtn.disabled = true;
    sendBtn.innerText = "Sending...";

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier =
        new firebase.auth.RecaptchaVerifier("send-otp-btn", {
          size: "invisible"
        });

      await window.recaptchaVerifier.render();
    }

    confirmationResult = await auth.signInWithPhoneNumber(
      phone,
      window.recaptchaVerifier
    );

    document.getElementById("step-input").classList.add("hidden");
    document.getElementById("step-otp").classList.remove("hidden");

    const firstOtp = document.querySelector(".otp-digit");
    if (firstOtp) firstOtp.focus();

    showToast("OTP sent", "success");

  } catch (e) {
    console.error(e);
    showToast("OTP failed", "error");

  } finally {
    sendBtn.disabled = false;
    sendBtn.innerText = "Send OTP";
  }
}


function updateLoggedInUI(phone){
  document.getElementById("login-section").style.display = "none";
  document.getElementById("user-section").style.display = "flex";
  document.getElementById("logout-menu-btn").style.display = "flex";
  document.getElementById("user-display-name").innerText = phone;

  // --- Stealth Admin Trigger Logic ---
  const dogIconWrapper = document.getElementById("secret-admin-trigger");
  
  if (dogIconWrapper) {
      if (isAdmin()) {
          // You are verified by Firebase! Turn on the neon lights.
          dogIconWrapper.classList.add("admin-shimmer");
          
          // THE FIX: Route the click through the Token generator
          dogIconWrapper.onclick = handleStealthAdminLogin; 
      } else {
          dogIconWrapper.classList.remove("admin-shimmer");
          dogIconWrapper.onclick = null;
      }
  }
}

async function handleVerifyOtp() {
  if (verifyingOtp) return;

  const verifyBtn = document.getElementById("verify-otp-btn");

  let code = "";
  document.querySelectorAll(".otp-digit").forEach(input => {
    code += input.value.trim();
  });

  if (code.length !== 6) {
    showToast("Enter 6-digit OTP");
    return;
  }

  try {
    verifyingOtp = true;

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerText = "Verifying...";
    }


    const result = await confirmationResult.confirm(code);
    const user = result.user;

    const customer = await syncUserToPocketBase(user);

    // New user -> ask name
    if (!customer.name || customer.name === customer.phone) {
      showNameModal();
      return;
    }

    // Returning user
    updateLoggedInUI(customer.name);
    switchScreen("home");
    showToast("Welcome back " + customer.name);

  } catch (e) {
    console.error(e);
    showToast("Invalid OTP", "error");

  } finally {
    verifyingOtp = false;

    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerText = "Verify OTP";
    }
  }
}



const otpInputs = document.querySelectorAll('.otp-digit');

otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }

        
        if (index === otpInputs.length - 1) {
            handleVerifyOtp();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});


otpInputs[0].addEventListener('paste', (e) => {
    e.preventDefault();

    const paste = e.clipboardData.getData('text').slice(0, 6);

    otpInputs.forEach((input, i) => {
        input.value = paste[i] || '';
    });

    
    const lastIndex = paste.length - 1;
    if (otpInputs[lastIndex]) {
        otpInputs[lastIndex].focus();
    }

    
    if (paste.length === 6) {
        handleVerifyOtp();
    }
});


function handleLoginClick() {

    if (auth.currentUser) {
        toggleMenu();
        showToast("Already logged in 🙂", "success");
        return;
    }

    toggleMenu();
    switchScreen("auth");
}
document.addEventListener('DOMContentLoaded', async () => {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'flex';

    try {
        
        let hash = window.location.hash.replace('#', '') || 'home';
        switchScreen(hash);

        
        Promise.allSettled([
            fetchBuilderData().then(() => {
                if (typeof renderMenu === 'function') renderMenu();
            }),
            renderBmiHistory(),
            updateCartUI()
        ]);

    } catch (err) {
        console.error("STARTUP ERROR:", err);
        switchScreen('home'); 
        showToast("Connected in offline/limited mode.", "error"); 
    } finally {
        if (spinner) spinner.style.display = 'none';
    }

    
    if (MENU_ITEMS_PUBLIC_READ_ENABLED) {
        pb.collection('menu_items').subscribe('*', (e) => {
            publicMenuCache = null;
        }).catch((err) => {
            if (!isAdminOnlyError(err)) console.warn("Menu realtime subscription unavailable:", err);
        });
    }
});

function requireLogin() {
    if (!window.currentUser) {
        showToast("Please login to continue", "info");
        switchScreen('auth');
        return false;
    }
    return true;
}

function showNameModal() {
  document.getElementById("auth").style.display = "none";

  const modal = document.getElementById("name-modal");
  modal.classList.remove("hidden");
}

async function saveCustomerName() {
  const inputEl = document.getElementById("customer-name-input");
  const btn = document.querySelector("#name-modal .btn-large");

  const input = inputEl.value.trim();

  if (input.length < 2) {
    showToast("Enter valid name");
    inputEl.focus();
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Saving...";
    }

    await pb.collection("customers").update(
      window.currentCustomer.id,
      { name: input }
    );

    window.currentCustomer.name = input;

    // Hide modal
    document.getElementById("name-modal")
      .classList.add("hidden");

    // Optional: restore auth container if hidden
    const authScreen = document.getElementById("auth");
    if (authScreen) authScreen.style.display = "";

    updateLoggedInUI(input);
    switchScreen("home");

    showToast("Welcome " + input);

  } catch (e) {
    console.error(e);
    showToast("Could not save name", "error");

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Continue";
    }
  }
}


async function syncUserToPocketBase(user) {
  const phone = user.phoneNumber;

  try {
    const existing = await pb.collection("customers")
      .getFirstListItem(`phone="${phone}"`);

    window.currentCustomer = existing;
    return existing;

  } catch (err) {
    const created = await pb.collection("customers").create({
      phone: phone,
      name: phone,
      firebase_uid: user.uid,
      last_login: new Date().toISOString(),
      order_count: 0
    });

    window.currentCustomer = created;
    return created;
  }
}

async function handleStealthAdminLogin() {
    if (pb.authStore.isValid && pb.authStore.isAdmin) {
        openAdminPanel();
        return;
    }

    const password = await askVaultKey(); 
    if (!password) return; 

    try {
        // We use a raw 'fetch' to hit the OLD endpoint directly, bypassing the SDK version conflict
        const response = await fetch(`${pb.baseUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'admin@prober.in', // Use the EXACT email from your dashboard
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Manually save the token into the SDK's memory
            pb.authStore.save(data.token, data.admin);
            showToast("Vault Unlocked.", "success");
            openAdminPanel();
        } else {
            throw new Error(data.message || "Invalid Key.");
        }
    } catch (err) {
        console.error("Login Failed:", err);
        showToast("Access Denied: Check your password.", "error");
    }
}
