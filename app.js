let confirmationResult = null;
let isOtpSent = false;
let currentCategory = 'Vegetarian';
let adminItemsData = [];
let currentAdminCategory = 'All';
let currentSlide = 0;
let fetchedBuilderData = { bases: [], proteins: [], fats: [] }; 
let currentBuild = { base: null, protein: null, fat: null };    
let verifyingOtp = false;
let pendingCartItem = null;
const DELIVERY_RADIUS_KM = 3;

// --- SECRET ADMIN EASTER EGG ---
let logoTapCount = 0;
let logoTapTimer = null;


let mapInstance = null;
let currentMapCoords = { lat: 17.699306, lng: 83.159611 }; // Default to Store[cite: 4]


const MENU_ITEMS_PUBLIC_READ_ENABLED = true; // Pipeline OPEN

let publicMenuCache = null;
let publicMenuRequest = null;
let hasLoggedMenuPermissionWarning = false;

const STORE_LOCATION = {
  lat: 17.699306 ,
  lng: 83.159611 ,     };


let vaultResolve = null;
let selectedFileForUpload = null;
const otpInputs = document.querySelectorAll('.otp-digit');
let currentAdminChatUserId = null;

let cart = [];
try {
    const storedCart = localStorage.getItem('prober_cart');
    cart = storedCart ? JSON.parse(storedCart) : [];
} catch (error) {
    console.warn("Corrupted cart data found. Resetting cart.", error);
    localStorage.removeItem('prober_cart');
    cart = [];
}

function handleLogoClick() {
    switchScreen('home'); 

    logoTapCount++;
    // FIX: Clear the PREVIOUS timer so they don't overlap and reset prematurely
    if (logoTapTimer) clearTimeout(logoTapTimer);

    if (logoTapCount >= 7) {
        logoTapCount = 0;
        handleStealthAdminLogin();
    } else {
        // Start a fresh 1-second window from the most recent tap
        logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1000);
    }
}


function updateCartUI() {
    localStorage.setItem('prober_cart', JSON.stringify(cart));

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // --- 1. Dynamic 5th Nav Option (View Cart vs Cart) ---
    // --- 1. Dynamic 5th Nav Option (Locked to "Cart") ---
    const navText = document.getElementById('nav-cart-text');
    const navBadge = document.getElementById('nav-cart-badge');
    const isCartActive = document.getElementById('cart-screen')?.classList.contains('active');

    if (navText) {
        navText.innerText = "Cart"; // Locks text to stop the 4 other icons from moving
        
        if (count > 0 && !isCartActive) {
            navText.style.color = "var(--brand-green)"; 
        } else {
            navText.style.color = "var(--text-muted)";
        }
    }

    // THIS IS THE FIX: Forcing 'none' with !important
    if (navBadge) {
        if (count > 0) {
            navBadge.innerText = count;
            navBadge.style.setProperty('display', 'flex', 'important');
        } else {
            navBadge.style.setProperty('display', 'none', 'important');
        }
    }

    // --- 2. Top Header Badge ---
    const topBadge = document.getElementById('cart-count');
    if (topBadge) {
        topBadge.innerText = count;
        topBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    // --- 3. Sticky Cart Bar Logic ---
    const stickyBar = document.getElementById('sticky-cart-bar');
    const isMenuScreen = document.getElementById('menu')?.classList.contains('active');
    
    if (stickyBar) {
        if (isMenuScreen && count > 0 && !isCartActive) {
            stickyBar.classList.remove('hidden');
            document.getElementById('sticky-cart-count').innerText = `${count} item${count > 1 ? 's' : ''}`;
            document.getElementById('sticky-cart-total').innerText = `₹${subtotal}`;
        } else {
            stickyBar.classList.add('hidden');
        }
    }

    // --- 4. Render Cart Contents ---
    const container = document.getElementById('cart-items-container');
    const footer = document.getElementById('cart-footer');

    if (cart.length === 0) {
        if (footer) footer.style.display = "none";
        if (stickyBar) stickyBar.classList.add('hidden');

        // NEW WhatsApp-style empty layout
        if (container) {
            container.innerHTML = `
                <div class="empty-state-view">
                    <div class="empty-icon-wrapper">
                        <i class="fas fa-shopping-basket"></i>
                    </div>
                    <h2>Your cart is empty</h2>
                    <p>Looks like you haven't added any healthy meals yet.</p>
                    <button onclick="switchScreen('menu')" class="btn-white-pill">Browse Menu</button>
                </div>
            `;
        }
    } else {
        if (footer) footer.style.display = "block";
        
        const gst = Math.round(subtotal * 0.05); 
        const deliveryFee = subtotal > 499 ? 0 : 30; 
        const grandTotal = subtotal + gst + deliveryFee;

        const totalEl = document.getElementById('cart-total-price');
        if (totalEl) totalEl.innerText = grandTotal;

        if (container) {
            let html = cart.map((item, index) => `
                <div class="cart-item-row">
                    <div class="cart-item-info">
                        <div class="cart-item-number">${index + 1}.</div>
                        <div>
                            <div class="cart-item-title">${item.name}</div>
                            <div class="cart-item-calc">₹${item.price} x ${item.quantity}</div>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-price">₹${item.price * item.quantity}</div>
                        <div class="quantity-pill">
                            <button onclick="updateCartQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartQuantity('${item.id}', 1)">+</button>
                        </div>
                    </div>
                </div>
            `).join('');

            html += `
                <div class="bill-details-box">
                    <h4>Bill Details</h4>
                    <div class="bill-details-row">
                        <span>Item Total</span>
                        <span>₹${subtotal}</span>
                    </div>
                    <div class="bill-details-row">
                        <span style="display: flex; align-items: center;">
                            Delivery Fee 
                            ${deliveryFee === 0 ? '<span style="background: var(--brand-green); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 8px; font-weight: 800;">FREE</span>' : ''}
                        </span>
                        <span>${deliveryFee === 0 ? '<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.8rem; margin-right: 6px;">₹30</span>₹0' : '₹' + deliveryFee}</span>
                    </div>
                    <div class="bill-details-row">
                        <span>Platform & GST (5%)</span>
                        <span>₹${gst}</span>
                    </div>
                    <div class="bill-total-row">
                        <span>To Pay</span>
                        <span>₹${grandTotal}</span>
                    </div>
                </div>
                
                <!-- NEW: Add More Items Button -->
                <button class="btn-outline" style="margin-top: 16px; border: 2px dashed var(--brand-green); display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="switchScreen('menu')">
                    <i class="fas fa-plus"></i> Add More Items
                </button>
                <div style="height: 20px;"></div>
            `;

            container.innerHTML = html;
        }
    }
    
    syncAllMenuButtons();
}

async function loadChat() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    if (!auth.currentUser) {
        chatContainer.innerHTML = `
            <div class="empty-state-view" style="height: 100%;">
                <div class="empty-icon-wrapper" style="width: 80px; height: 80px; font-size: 2.5rem; margin-bottom: 16px;">
                    <i class="fas fa-lock"></i>
                </div>
                <h2 style="font-size: 1.3rem;">Login Required</h2>
                <p style="margin-bottom: 24px;">Please log in to chat with our support team.</p>
                <button class="btn-white-pill" onclick="switchScreen('auth')">Log In Now</button>
            </div>`;
        return;
    }

    try {
        const msgs = await pb.collection('messages').getFullList({
            filter: `customer_id = "${window.currentCustomer.id}"`,
            sort: 'created'
        });

        if (msgs.length === 0) {
            chatContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px;">
                    <div class="chat-avatar" style="margin: 0 auto 16px auto; width: 70px; height: 70px; font-size: 2.2rem;">
                        <i class="fas fa-hand-sparkles"></i>
                    </div>
                    <h3 style="color: var(--text-main); font-weight: 800; font-size: 1.4rem; margin-bottom: 8px;">Hi there, ${window.currentCustomer.name.split(' ')[0]}! 👋</h3>
                    <p style="color: var(--text-muted); font-size: 1rem;">Need help with your order or diet plan? Send us a message.</p>
                </div>
            `;
        } else {
            chatContainer.innerHTML = msgs.map(m => `
                <div class="message-bubble ${m.sender_role === 'admin' ? 'message-admin' : 'message-user'}">
                    ${m.message}
                </div>
            `).join('');
            
            // Auto scroll to the very bottom to see the newest message
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } catch (err) { 
        console.error("Chat Error", err); 
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    if (!auth.currentUser) {
        showToast("Please login first.", "info");
        switchScreen('auth');
        return;
    }

    // Clear input box immediately for good UX
    input.value = '';
    
    try {
        await pb.collection('messages').create({
            customer_id: window.currentCustomer.id,
            message: msg,
            sender_role: 'customer',
            sender_name: window.currentCustomer.name || 'Customer'
        });
        
        // Refresh the chat to show the new message
        loadChat();
    } catch (err) { 
        showToast("Failed to send message.", "error"); 
    }
}

window.switchScreen = function(screenId, isBackNavigation = false) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }

    if (screenId === "menu") renderMenu();
    if (screenId === "create") renderMealBuilder();
    if (screenId === "orders") loadOrders(); // <--- THIS is the new line that fetches your data!
    if (screenId === "chat-screen") loadChat();
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${screenId}`);
    if (activeNav) activeNav.classList.add('active');

    // Handle sticky cart visibility
    const stickyBar = document.getElementById('sticky-cart-bar');
    if (stickyBar) {
        if (screenId === 'menu' && cart.length > 0) {
            stickyBar.classList.remove('hidden');
        } else {
            stickyBar.classList.add('hidden');
        }
    }
    
    if (typeof updateCartUI === 'function') updateCartUI();

    if (!isBackNavigation) {
        history.pushState({ screenId: screenId }, '', `#${screenId}`);
    }
};

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


async function handleLogout() {
    try {
        await auth.signOut();
    } catch (firebaseErr) {
        console.warn("Firebase sign-out warning:", firebaseErr);
    }

    try {
        pb.authStore.clear();
    } catch (pbErr) {
        console.warn("PocketBase wipe warning:", pbErr);
    }

    // FIX: Explicitly wipe global session variables
    window.currentUser = null;
    window.currentCustomer = null;

    // Safe UI updates
    const loginSec = document.getElementById("login-section");
    const userSec = document.getElementById("user-section");
    const logoutBtn = document.getElementById("logout-menu-btn");

    if (loginSec) loginSec.style.display = "block";
    if (userSec) userSec.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";

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
    setTimeout(() => {
        if (!navigator.onLine) {
            showToast("Connection lost", "error");
        }
    }, 1500);
});

window.addEventListener('online', () => {
    if (navigator.onLine) {
        showToast("You're online", "success");
    }
});

// 6. Initialize on page load
window.onload = () => {
    const hash = window.location.hash.replace('#', '');
    const initialScreen = hash || 'home';
    switchScreen(initialScreen);
      applyVegToggleState();
};

function openAdminPanel() {
    const user = auth.currentUser;

    if (!user || !isAdmin()) {
        showToast("Admin only", "error");
        return;
    }

    window.location.href = "admin.html";
}


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

function goToCreate() {
    // FIX: Safe DOM updates
    const heightInput = document.getElementById('bmi-height');
    const weightInput = document.getElementById('bmi-weight');
    if (heightInput) heightInput.value = '';
    if (weightInput) weightInput.value = '';
    
    const scoreBox = document.getElementById('bmi-score-container');
    const recBox = document.getElementById('bmi-recommendations-container');
    const historyBox = document.getElementById('bmi-history-container');
    
    if (scoreBox) scoreBox.style.display = 'none';
    if (recBox) recBox.style.display = 'none';
    if (historyBox) historyBox.style.display = 'block';
    
    switchScreen('create');
}

function toggleCart() {
    switchScreen('cart-screen');
}

/* =====================================================
   UPDATED CHECKOUT LOGIC (Includes Taxes/Fees)
===================================================== */

// NEW: Dedicated Order Success Screen
function showOrderConfirmation(orderId) {
    const modal = document.createElement('div');
    modal.className = 'overlay centered-modal';
    modal.style.zIndex = '100000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Using your app's native card styling
    modal.innerHTML = `
        <div class="checkout-modal-box" style="text-align: center; padding: 40px 24px; animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
            <div style="width: 80px; height: 80px; background: rgba(16, 185, 129, 0.1); color: var(--brand-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 20px;">
                <i class="fas fa-check"></i>
            </div>
            <h2 style="margin-bottom: 12px; font-size: 1.8rem; font-weight: 900; color: var(--text-main);">Order Placed!</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px;">Your order <strong>#${orderId.slice(0,5)}</strong> has been received and sent to the kitchen.</p>
<button class="order-track-btn" onclick="this.closest('.overlay').remove(); switchScreen('orders');">
    Track Order
</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}
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
        const addressField = document.getElementById('checkout-address');
        addressField.classList.add("input-error");
        addressField.placeholder = "Please enter a delivery location/address";
        addressField.value = "";
        addressField.focus();
        return; 
    }

    const orderBtn = document.querySelector('#checkout-modal .confirm-btn');
    if (orderBtn) {
        orderBtn.disabled = true;
        orderBtn.innerText = "Processing...";
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gst = Math.round(subtotal * 0.05);
    const deliveryFee = subtotal > 499 ? 0 : 30;
    const grandTotal = subtotal + gst + deliveryFee;

    try {
        // 1. Send Order to PocketBase (Added address & notes)
        const order = await pb.collection('orders').create({
            customer_id: window.currentCustomer.id,
            total_price: grandTotal,
            status: 'Pending',
            address: addressInput, 
            notes: notesInput      
        });

        for (const item of cart) {
            await pb.collection('order_items').create({
                order_id: order.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.price
            });
        }

        // 2. Clean up UI
        cart = [];
        updateCartUI();
        toggleCheckoutModal(); // Hide the address modal
        
        document.getElementById('checkout-address').value = '';
        document.getElementById('checkout-notes').value = '';
        
        // 3. Show Success Confirmation Modal
        showOrderConfirmation(order.id);

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
        // Dashed border, orange text, jump animation applied!
        return `<button class="btn-add-dashed jump-btn" 
            onclick="guardedAddToCart('${id}', '${name}', ${price})">
            + Add
        </button>`;
    } else {
        // Solid Orange Pill
        return `
        <div class="btn-quantity-solid">
            <button onclick="updateCartQuantity('${id}', -1)">-</button>
            <span>${cartItem.quantity}</span>
            <button onclick="updateCartQuantity('${id}', 1)">+</button>
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
    toggleCart();
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

    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); width: 100%;">
            <div class="spinner"></div>
            <div>Fetching fresh menu...</div>
        </div>
    `;

    try {
        const menuItems = await dataService.getMenu();

        const vegOnly = localStorage.getItem('prober_veg_only') === 'true';

        let filteredItems = menuItems.filter(item => {
            // normalize once (this kills ALL hidden bugs)
            const category = (item.category || '').trim();

            // 🚫 remove non-veg if toggle ON
            if (vegOnly && category === 'Nonvegetarian') {
                return false;
            }

            // 🎯 match current category
            return category === currentCategory;
        });

        if (filteredItems.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); width: 100%;">
                    Sold out for today!
                </div>`;
            return;
        }

        container.innerHTML = filteredItems.map(item => {
            // FIX: Properly construct the PocketBase API URL for the image
            let imageUrl = '';
            if (item.img && item.img !== "") {
                imageUrl = pb.files.getUrl(item, item.img);
            }
            
            const bgStyle = imageUrl 
                ? `background-image: url('${imageUrl}');` 
                : `background: linear-gradient(135deg, var(--border-color), var(--card-bg));`;

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
        container.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #ef4444;">
                Error loading menu. Please try again later.
            </div>`;
        console.error("Render Error:", err);
    }
}

function getImagePath(item) {
    if (item.img && item.img !== "") return item.img;
    
    
    const fileName = item.name.toLowerCase().replace(/\s+/g, '') + '.png';
    return `/images/${fileName}`; 
}

function setMenuCategory(category) {
    currentCategory = category;
    
    // 1. Target all sidebar buttons using the correct class
    const buttons = document.querySelectorAll('.side-cat-pill');
    
    buttons.forEach(btn => {
        // 2. Remove active class from everyone
        btn.classList.remove('active');
        
        // 3. Add active class ONLY to the matching ID
        if (btn.id === `category-${category}`) {
            btn.classList.add('active');
        }
    });
    
    renderMenu();
}
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
    const vegToggle = document.getElementById('sidebar-veg-toggle');
    const isVegMode = vegToggle ? vegToggle.checked : false;

    ['bases', 'proteins', 'fats'].forEach(catKey => {
        const container = document.getElementById(`builder-${catKey}`);
        if (!container) return;

        let items = fetchedBuilderData[catKey];
        
        if (isVegMode) {
            items = items.filter(item => {
                if (item.category === 'Nonvegetarian') return false;
                
                // Filter out non-veg proteins by checking the item name
                const name = (item.name || '').toLowerCase();
                const meatWords = ['chicken', 'egg', 'fish', 'beef', 'mutton', 'prawn', 'meat'];
                return !meatWords.some(word => name.includes(word));
            });
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
    
    // FIX: Ensure the items were successfully found in the database arrays
    if (!baseItem || !proteinItem) {
        showToast("Menu error. Please refresh the page.", "error");
        return;
    }
    
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
    ["Vegetarian", "Vegan", "Nonvegetarian", "Beverage"]
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
        Create Your Bowl
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

  // ==========================================
    // NEW: TRIGGER THE DYNAMIC SPLIT ANIMATION
    // ==========================================
    const dynamicWrapper = document.getElementById('diet-dynamic-wrapper');
    if (dynamicWrapper) {
        dynamicWrapper.classList.remove('state-initial');
        dynamicWrapper.classList.add('state-calculated');
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

            // NEW: Split Flexbox Layout
            return `
<div style="box-sizing: border-box; width: 100%; display: flex; background: var(--card-bg); border-radius: 14px; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; transition: transform 0.2s ease;">
    
    <!-- Info Section (Left Side - 90%) -->
    <div style="flex: 1; padding: 16px; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${date}</div>
            <div style="font-size: 1.4rem; font-weight: 900; color: var(--text-main); line-height: 1;">${record.bmi}</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${record.weight}kg • ${record.height}cm</div>
            <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${catColor};">${record.category.split(' ')[0]}</div>
        </div>
    </div>

    <!-- Delete Button Section (Right Side - 10%) -->
    <button onclick="deleteBmiRecord('${record.id}')" 
            style="width: 55px; flex-shrink: 0; background: transparent; border: none; border-left: 1px dashed var(--border-color); color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: background 0.2s, filter 0.2s;"
            onmouseover="this.style.background='rgba(239, 68, 68, 0.08)'" 
            onmouseout="this.style.background='transparent'">
        <i class="fas fa-trash-alt"></i>
    </button>

</div>
`;
        }).join('');
        
        container.style.display = 'block';

    } catch (err) {
        console.error("BMI History Load Error:", err);
        container.style.display = 'none';
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

function updateAdminView(category) {
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
        
        if (tab.innerText.trim() === category || 
           (category === 'Vegetarian' && tab.innerText.trim() === 'Veg') ||
           (category === 'Nonvegetarian' && tab.innerText.trim() === 'Non-Veg')) {
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
function renderOrderCard(order) {
    const date = new Date(order.created).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
    
    // SAFELY locate the items array (whether natively attached or inside PB's expand object)
    const items = order.order_items || (order.expand && order.expand.order_items_via_order_id) || [];
    
    const itemsList = items.map(item => 
        `<span>${item.quantity}x ${item.item_name}</span>`
    ).join(', ');

    return `
    <div class="order-card" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; animation: fadeUp 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">Order #${order.id.slice(0, 5)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${date}</div>
            </div>
            <div class="status-badge status-${statusClass}">${order.status}</div>
        </div>
        <div style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 16px; line-height: 1.4; font-weight: 600;">
            ${itemsList || '<span style="color: var(--text-muted); font-style: italic;">Processing items...</span>'}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 16px;">
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Total Paid</span>
            <span style="font-weight: 900; color: var(--brand-green); font-size: 1.15rem;">₹${order.total_price}</span>
        </div>
    </div>`;
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


async function handleSendOtp() {
  // FIX: Updated to look for the new 'auth-phone' ID
  const inputEl = document.getElementById("auth-phone");
  const sendBtn = document.getElementById("send-otp-btn");

  // Safeguard just in case the element hasn't loaded
  if (!inputEl) {
      console.error("Phone input element not found!");
      return;
  }

  const digits = inputEl.value.trim().replace(/\D/g, "");

  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    showToast("Enter a valid 10-digit mobile number", "error");
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
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("send-otp-btn", {
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
    showToast("OTP failed to send", "error");
    
    // Reset the reCAPTCHA so the user can click "Send OTP" again
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(function(widgetId) {
            grecaptcha.reset(widgetId);
        });
    }

  } finally {
    sendBtn.disabled = false;
    sendBtn.innerText = "Continue";
  }
}
function showNameModal() {
    // FIX: Remove 'active' class to properly hide the auth screen
    // The inline style was being overridden by CSS !important rules
    document.getElementById("auth").classList.remove("active");

    const modal = document.getElementById("name-modal");
    modal.classList.remove("hidden");
}

function updateLoggedInUI(phone) {
    // Optional chaining (?.) prevents the "null" error if the ID is missing[cite: 5]
    document.getElementById("login-section")?.style.setProperty("display", "none");
    document.getElementById("user-section")?.style.setProperty("display", "flex");
    document.getElementById("logout-menu-btn")?.style.setProperty("display", "flex");
    
    const userDisplay = document.getElementById("user-display-name");
    if (userDisplay) userDisplay.innerText = phone;
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

async function handleVegToggle(checkbox) {
    const isChecked = checkbox.checked;

    // Check for cart conflicts before applying the toggle
    if (isChecked && cart.length > 0) {
        const hasNonVeg = cart.some(cartItem => {
            const menuRecord = publicMenuCache?.find(m => m.id === cartItem.id);
            return menuRecord && menuRecord.category === 'Nonvegetarian';
        });

        if (hasNonVeg) {
            const confirmClear = confirm("Your cart contains Non-Veg items. Turning on Pure Veg mode will remove them. Continue?");
            if (!confirmClear) {
                checkbox.checked = false; // Revert the toggle visually
                return; // Stop execution
            }
            
            // Filter out non-veg items
            cart = cart.filter(cartItem => {
                const menuRecord = publicMenuCache?.find(m => m.id === cartItem.id);
                return !(menuRecord && menuRecord.category === 'Nonvegetarian');
            });
            updateCartUI();
            showToast("Non-Veg items removed from cart", "info");
        }
    }

    // Proceed with normal toggle logic
    localStorage.setItem('prober_veg_only', isChecked);
    const nonVegBtn = document.getElementById('category-Nonvegetarian');
    
    if (nonVegBtn) {
        nonVegBtn.style.setProperty('display', isChecked ? 'none' : 'flex', 'important');
    }

    if (isChecked && currentCategory === 'Nonvegetarian') {
        setMenuCategory('Vegetarian');
    } else {
        renderMenu();
    }
    renderMealBuilder();
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        // --- 1. RESTORE PERSISTENT STATES ---
        const isVegOnly = localStorage.getItem('prober_veg_only') === 'true';
        const vegToggle = document.getElementById('sidebar-veg-toggle');
        
        if (vegToggle) {
            vegToggle.checked = isVegOnly;
            handleVegToggle(vegToggle);
        }

    

        // --- 2. HANDLE ROUTING ---
        let hash = window.location.hash.replace('#', '') || 'home';
        if (typeof window.switchScreen === 'function') {
            window.switchScreen(hash);
        }

        // --- 3. DATA LOAD (Runs instantly in the background) ---
        Promise.allSettled([
            fetchBuilderData().then(() => {
                if (typeof renderMenu === 'function') renderMenu();
            }),
            renderBmiHistory(),
            updateCartUI()
        ]);

    } catch (err) {
        console.error("STARTUP ERROR:", err);
        if (typeof window.switchScreen === 'function') window.switchScreen('home');
        showToast("Connected in offline/limited mode.", "error");
    } 

    // --- 4. REALTIME SUBSCRIPTIONS ---
    if (MENU_ITEMS_PUBLIC_READ_ENABLED) {
        pb.collection('menu_items').subscribe('*', (e) => {
            publicMenuCache = null; 
        }).catch((err) => {
            if (!isAdminOnlyError(err)) console.warn("Menu subscription unavailable:", err);
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
    
    // --- ADD THIS LINE HERE ---
    await syncUserVegPreference(); 
    
    return existing;

  } catch (err) {
    const created = await pb.collection("customers").create({
      phone: phone,
      name: phone,
      firebase_uid: user.uid,
      last_login: new Date().toISOString(),
      order_count: 0,
      veg_only: false // Initialize the field for new users
    });

    window.currentCustomer = created;
    return created;
  }
}

async function handleStealthAdminLogin() {
    // FIX: In v0.22, 'isAdmin' is replaced by 'isSuperuser'
    if (pb.authStore.isValid && pb.authStore.isSuperuser) {
        openAdminPanel();
        return;
    }

    const password = await askVaultKey(); 
    if (!password) return; 

    try {
        // FIX: Point to the new v0.22 superusers collection endpoint
        const response = await fetch(`${pb.baseUrl}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'admin@prober.in', // Use the EXACT email from your dashboard
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // FIX: In v0.22, the user data object is returned under 'record', not 'admin'
            pb.authStore.save(data.token, data.record);
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

async function syncUserVegPreference() {
    if (!window.currentCustomer) return;

    // 1. Pull the true preference FROM the database
    const cloudVeg = window.currentCustomer.veg_only === true;
    localStorage.setItem('prober_veg_only', cloudVeg);

    // 2. Visually update the toggle switch on the screen
    const vegToggle = document.getElementById('sidebar-veg-toggle');
    if (vegToggle) vegToggle.checked = cloudVeg;

    // 3. Force the app to apply the rules (hide buttons, filter menus)
    handleVegToggle(vegToggle || { checked: cloudVeg });
}

async function deleteBmiRecord(id) {
    if (!confirm("Delete this result?")) return;
    
    try {
        await pb.collection('bmi_history').delete(id);
        showToast("Record deleted", "success");
        renderBmiHistory(); // Refresh the list
    } catch (err) {
        showToast("Failed to delete record", "error");
    }
}

function applyVegToggleState() {
    const isVegOnly = localStorage.getItem('prober_veg_only') === 'true';

    document.querySelectorAll('input[onchange*="handleVegToggle"]').forEach(toggle => {
        toggle.checked = isVegOnly;
    });

    const nonVegBtn = document.getElementById('category-Nonvegetarian');
    // Using setProperty bypasses the !important CSS override
    if (nonVegBtn) nonVegBtn.style.setProperty('display', isVegOnly ? 'none' : 'flex', 'important');

    if (isVegOnly && currentCategory === 'Nonvegetarian') {
        setMenuCategory('Vegetarian');
    }
}


/* =====================================================
   DETERMINISTIC TOGGLE LOGIC
===================================================== */
function toggleMenu() {
    const menu = document.getElementById('side-menu-panel');
    const cart = document.getElementById('cart-panel');
    const overlay = document.getElementById('menu-overlay');

    if (menu.classList.contains('open')) {
        // If it's already open, DEFINITELY close it
        menu.classList.remove('open');
        overlay.classList.add('hidden');
    } else {
        // If it's closed, open it (and ensure cart is closed)
        cart?.classList.remove('open');
        menu.classList.add('open');
        overlay.classList.remove('hidden');
    }
}


function skipNameEntry() {
    // Hide the modal
    document.getElementById("name-modal").classList.add("hidden");
    
    // Update UI with their phone number (since they didn't provide a name)
    updateLoggedInUI(window.currentCustomer.name || window.currentCustomer.phone);
    
    // Send them to the home screen
    switchScreen("home");
    showToast("Welcome to Prober!");
}

function handleViewMenuClick(btn) {
    if (btn.disabled) return;
    
    // Disable and show loading state
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Switch screen with a tiny delay so the user registers the click
    setTimeout(() => {
        switchScreen('menu');
        
        // Restore button state 1 second later in the background
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 1000);
    }, 150);
}


function openMapPicker() {
    const mapModal = document.getElementById('map-modal');
    const overlay = document.getElementById('menu-overlay');
    
    // 1. Remove the display:none class
    mapModal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    
    // 2. Trigger the pop-in animation
    mapModal.classList.add('open');

    // 3. Initialize map if it doesn't exist yet
    if (!mapInstance) {
        mapInstance = L.map('map-picker').setView([currentMapCoords.lat, currentMapCoords.lng], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);

        mapInstance.on('move', () => {
            const center = mapInstance.getCenter();
            currentMapCoords = { lat: center.lat, lng: center.lng };
        });
    }

    // CRITICAL FIX: Leaflet needs to recalculate its size *after* 
    // the CSS modal animation finishes (which takes ~300ms).
    setTimeout(() => {
        if (mapInstance) {
            mapInstance.invalidateSize();
        }
    }, 350); 
}
// Add this function anywhere in app.js
function locateUserOnMap() {
    const btn = document.querySelector('.locate-me-btn');
    const originalIcon = btn.innerHTML;
    
    if (!navigator.geolocation) {
        showToast("Location not supported by browser", "error");
        return;
    }

    // Change icon to a loading spinner
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: var(--brand-green);"></i>';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            // Update the global map coordinates variable
            currentMapCoords = { lat, lng };
            
            // Smoothly fly the Leaflet map to the new coordinates
            if (mapInstance) {
                mapInstance.flyTo([lat, lng], 17, {
                    animate: true,
                    duration: 1.5 // 1.5 second animation
                });
            }
            
            showToast("Location found!", "success");
            
            // Restore button state
            btn.innerHTML = '<i class="fas fa-crosshairs" style="color: var(--brand-green);"></i>'; // Keep it green to show it's active
            btn.disabled = false;
        },
        (err) => {
            console.warn("Geolocation Error:", err);
            showToast("Could not get location. Check permissions.", "error");
            
            // Restore button state
            btn.innerHTML = originalIcon;
            btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}
function closeMapPicker() {
    const mapModal = document.getElementById('map-modal');
    mapModal.classList.remove('open');
    document.getElementById('menu-overlay').classList.add('hidden');
    
    // Give the fade-out animation time to finish before applying display:none
    setTimeout(() => {
        mapModal.classList.add('hidden');
    }, 300);
}

async function confirmMapLocation() {
    // Reverse Geocoding (Optional: Turn Lat/Lng into text)
    showToast("Location Captured", "success");
    
    // Update the address input with coordinates (or coordinates + landmark)
    const addressField = document.getElementById('checkout-address');
    if (addressField) {
        addressField.value = `Pinned: ${currentMapCoords.lat.toFixed(5)}, ${currentMapCoords.lng.toFixed(5)}`;
        addressField.classList.remove('input-error'); //[cite: 4]
    }
    
    closeMapPicker();
}
/* =====================================================
   SAFE GLOBAL CLICK LISTENER
===================================================== */
document.addEventListener('click', (e) => {
    // FIX 1: If the clicked element was destroyed by a UI re-render, ignore the click.
    // This stops the cart from closing when adding/removing items.
    if (!document.body.contains(e.target)) return;

    const sideMenu = document.getElementById('side-menu-panel');
    const cartPanel = document.getElementById('cart-panel');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeBtn = document.querySelector('.theme-open-btn');
    const overlay = document.getElementById('menu-overlay');
    const stickyBar = document.getElementById('sticky-cart-bar');

    // FIX 2: Only close if clicking outside the modals 
    // AND NOT clicking a toggle button, nav item, or the sticky-cart-bar
    if (
        sideMenu && cartPanel &&
        !sideMenu.contains(e.target) &&
        !cartPanel.contains(e.target) &&
        !e.target.closest('.nav-btn') &&
        !e.target.closest('.header-icon-btn') &&
        !e.target.closest('#sticky-cart-bar') // <-- This line prevents the auto-hide bug
    ) {
        sideMenu.classList.remove('open');
        cartPanel.classList.remove('open');
        if (overlay) overlay.classList.add('hidden');

        // Restore sticky bar visibility if the cart is closed and has items
        if (cart.length > 0 && stickyBar) {
            stickyBar.classList.remove('hidden');
        }
    }

    // Handle floating theme dropdown (if still used anywhere)
    if (themeDropdown && !themeDropdown.contains(e.target) && (!themeBtn || !themeBtn.contains(e.target))) {
        themeDropdown.classList.remove('open');
    }
});

/* =====================================================
   CHECKOUT ERROR CLEANUP
===================================================== */
document.getElementById("checkout-address")?.addEventListener("input", function() {
    // Removes the red border and restores the original placeholder
    this.classList.remove("input-error");
    this.placeholder = "Flat / House No / Landmark";
});

