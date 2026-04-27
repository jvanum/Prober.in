
// This automatically detects if it's running on Railway or localhost
const pb = new PocketBase(window.location.origin);

let isOtpSent = false;
let currentCategory = 'Vegetarian';
// This checks memory first. If empty, it defaults to an empty array []
let cart = JSON.parse(localStorage.getItem('prober_cart')) || [];
let currentUserPhone = null;
let adminItemsData = [];
let currentAdminCategory = 'All';
let isLoginMode = true;
let currentSlide = 0;
let fetchedBuilderData = { bases: [], proteins: [], fats: [] }; 
let currentBuild = { base: null, protein: null, fat: null };    

function checkUserSession() {
    const isAuth = pb.authStore.isValid;
    const user = pb.authStore.record; 

    // We removed the code that forcefully showed/hid the auth screen here.
    // Now, the auth screen will ONLY show when switchScreen('auth') is called via the menu!

    if (!isAuth) {
        localStorage.removeItem('prober_cart');
        if (typeof updateAuthUI === 'function') updateAuthUI(null);
    } else {
        if (typeof updateAuthUI === 'function') updateAuthUI(user);
    }
}
// Replace the auth listener:
pb.authStore.onChange((token, model) => {
    checkUserSession();
});

// Replace logout:
function handleLogout() {
    pb.authStore.clear(); // Logs the user out instantly
    showToast("You have been logged out.");
    if (document.getElementById('side-menu-panel').classList.contains('open')) toggleMenu();
    switchScreen('home'); 
}


function updateAuthUI(user) {
    const loginBtn = document.getElementById('login-menu-btn');
    const logoutBtn = document.getElementById('logout-menu-btn');
    
    if (user) {
        // Logged in
        loginBtn.innerHTML = `<i class="fas fa-user-circle fa-fw"></i> ${user.name || user.email}`;
        loginBtn.onclick = null; // Remove login redirect
        logoutBtn.style.display = 'block';
    } else {
        // Logged out
        loginBtn.innerHTML = `<i class="fas fa-user-circle fa-fw"></i> Login / Signup`;
        loginBtn.onclick = () => { switchScreen('auth'); toggleMenu(); };
        logoutBtn.style.display = 'none';
    }
}
let currentOtpId = null; // Stores the OTP session

async function handleAuthSubmit() {
    const emailInput = document.getElementById('auth-email');
    const otpInput = document.getElementById('auth-otp');
    const emailRaw = emailInput.value.trim();

    if (!emailRaw) {
        showToast("Please enter your email.");
        return;
    }

    if (!isOtpSent) {
        // STEP 1: Request OTP
        try {
            const result = await pb.collection('users').requestOTP(emailRaw);
            currentOtpId = result.otpId; 
            
            showToast("OTP sent to your email!");
            isOtpSent = true;
            
            document.getElementById('email-wrapper').style.display = 'none';
            otpInput.style.display = 'block';                
            document.getElementById('auth-submit-btn').innerText = 'Verify OTP';
        } catch (err) {
            showToast("Error sending OTP. Is it enabled in PocketBase?");
            console.error(err);
        }
    } else {
        // STEP 2: Verify OTP
        const otp = otpInput.value.trim();
        try {
            const authData = await pb.collection('users').authWithOTP(currentOtpId, otp);
            
            showToast("Welcome to Prober!");
            updateAuthUI(pb.authStore.record); // Update UI with user data
            switchScreen('home');
            
            // Reset form for next time
            isOtpSent = false;
            otpInput.value = '';
            emailInput.value = '';
            document.getElementById('email-wrapper').style.display = 'flex';
            otpInput.style.display = 'none';
            document.getElementById('auth-submit-btn').innerText = 'Login';
        } catch (err) {
            showToast("Invalid OTP. Please try again.");
            console.error(err);
        }
    }
}

const dataService = {
    getMenu: async () => {
        try {
            // getFullList fetches everything and handles pagination automatically
            const records = await pb.collection('menu_items').getFullList({
                filter: 'is_available = true',
                sort: 'id', // use +id or -id to control sorting
            });
            return records;
        } catch (error) {
            console.error("PocketBase Menu Fetch Error:", error);
            return [];
        }
    }
};



// Replaces sbClient.channel('...').subscribe()
pb.collection('messages').subscribe('*', function (e) {
    const currentUser = pb.authStore.record;
    
    // Check if a NEW message was created, it belongs to this user, and the admin sent it
    if (e.action === 'create' && e.record.user_id === currentUser?.id && e.record.sender_role === 'admin') {
        triggerNotification();
        loadChat(); 
    }
});

const appThemes = {
    "clean-white": { 
        name: "Clean White (Green Accent)", 
        vars: { "--brand-green": "#10b981", "--bg-light": "#fbfbfc", "--text-main": "#111827", "--text-muted": "#6b7280", "--nav-bg": "rgba(255, 255, 255, 0.85)", "--border-color": "#f3f4f6", "--card-bg": "#ffffff" } 
    },
    "dark-grey": { 
        name: "Dark Grey (Blue Accent)", 
        vars: { "--brand-green": "#3b82f6", "--bg-light": "#111827", "--text-main": "#f9fafb", "--text-muted": "#9ca3af", "--nav-bg": "rgba(31, 41, 55, 0.85)", "--border-color": "#374151", "--card-bg": "#1f2937" } 
    },
    "white-accent": { 
        name: "Clean White (Purple Accent)", 
        vars: { "--brand-green": "#8b5cf6", "--bg-light": "#ffffff", "--text-main": "#111827", "--text-muted": "#6b7280", "--nav-bg": "rgba(255, 255, 255, 0.85)", "--border-color": "#e5e7eb", "--card-bg": "#f9fafb" } 
    },
    "dark-accent": { 
        name: "Dark Grey (Orange Accent)", 
        vars: { "--brand-green": "#f97316", "--bg-light": "#1f2937", "--text-main": "#f9fafb", "--text-muted": "#9ca3af", "--nav-bg": "rgba(31, 41, 55, 0.85)", "--border-color": "#4b5563", "--card-bg": "#111827" } 
    }
};

const builderData = {
    bases: [
        { id: 'b1', name: 'Quinoa', price: 60, protein: 4, fat: 2 },
        { id: 'b2', name: 'Brown Rice', price: 40, protein: 3, fat: 1 },
        { id: 'b3', name: 'Mixed Greens', price: 30, protein: 2, fat: 0 }
    ],
    proteins: [
        { id: 'p1', name: 'Grilled Paneer', price: 80, protein: 18, fat: 14 },
        { id: 'p2', name: 'Boiled Eggs (3)', price: 40, protein: 18, fat: 15 },
        { id: 'p3', name: 'Pea Protein Chunks', price: 70, protein: 20, fat: 2 }
    ],
    fats: [
        { id: 'f1', name: 'Pure Ghee', price: 30, protein: 0, fat: 14 },
        { id: 'f2', name: 'Olive Oil Dressing', price: 25, protein: 0, fat: 12 },
        { id: 'f3', name: 'Avocado', price: 60, protein: 1, fat: 10 }
    ]
};


window.addEventListener('offline', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.style.display = 'block';
        showToast("Connection lost. Some features may not work.");
    }
});

window.addEventListener('online', () => {
    const banner = document.getElementById('offline-banner');
    if (banner) {
        banner.style.display = 'none';
        showToast("Back online!");
    }
});

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; 
    });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.style.display = 'flex'; 
        window.history.replaceState(null, null, '#' + screenId);
    }

    if (screenId === 'menu') renderMenu();
    if (screenId === 'admin') renderAdminMenu();
    if (screenId === 'orders') loadOrders(); 
    if (screenId === 'chat-screen') loadChat(); 
}

function showToast(message) {
    let container = document.getElementById('toast-container') || document.createElement('div');
    if (!container.id) { container.id = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
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

function applyTheme(themeKey) {
    const theme = appThemes[themeKey];
    if (!theme) return;

    for (const [property, value] of Object.entries(theme.vars)) {
        document.documentElement.style.setProperty(property, value);
    }
    localStorage.setItem('prober-active-theme', themeKey);
    
    document.querySelectorAll('.theme-swatch').forEach(el => el.classList.remove('active'));
    const activeSwatch = document.getElementById(`swatch-${themeKey}`);
    if (activeSwatch) activeSwatch.classList.add('active');
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

function toggleThemeDropdown() {
    document.getElementById('theme-dropdown').classList.toggle('hidden');
}
// Global Click outside to close menus
document.addEventListener('mousedown', (e) => {
    const sideMenu = document.getElementById('side-menu-panel');
    const cartPanel = document.getElementById('cart-panel');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeBtn = document.getElementById('theme-btn');
    const overlay = document.getElementById('menu-overlay');

    if (sideMenu && cartPanel && !sideMenu.contains(e.target) && !cartPanel.contains(e.target) && !e.target.closest('.nav-btn')) {
        sideMenu.classList.remove('open');
        cartPanel.classList.remove('open');
        if(overlay) overlay.classList.add('hidden');
    }
    
    if (themeDropdown && !themeDropdown.contains(e.target) && !themeBtn.contains(e.target)) {
        themeDropdown.classList.add('hidden');
    }
});


function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    updateCartUI(); 
    
    // Header cart icon bounce
    const cartBtn = document.querySelector('.fa-shopping-cart').parentElement;
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
}

// Replace your existing processCheckout function with this:
async function processCheckout() {
    const phoneInput = document.getElementById('checkout-phone-input')?.value.trim() || '';
    
    // Check if user is logged in via PocketBase
    if (!pb.authStore.isValid) {
        showToast("Please login to place an order.");
        switchScreen('auth');
        toggleCheckoutModal();
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
        // STEP 1: Insert the main Order record into PocketBase
        const order = await pb.collection('orders').create({
            user_id: pb.authStore.record.id,
            total_price: total,
            customer_phone: phoneInput,
            status: 'Pending'
        });

        // STEP 2: Insert all items into the order_items table
        for (const item of cart) {
            await pb.collection('order_items').create({
                order_id: order.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.price
            });
        }

        // Proceed to WhatsApp as usual
        let message = `*New Order: Prober* \n`;
        cart.forEach(item => { message += `• ${item.quantity}x ${item.name}\n`; });
        window.open(`https://wa.me/918142581325?text=${encodeURIComponent(message)}`, '_blank');

        cart = [];
        updateCartUI();
        toggleCheckoutModal();
        switchScreen('orders');

    } catch (error) {
        console.error("Order failed:", error);
        showToast("Order failed. Please try again.");
    }
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

function updateCartUI() {

    localStorage.setItem('prober_cart', JSON.stringify(cart));

    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    document.getElementById('cart-total-price').innerText = total;

    const container = document.getElementById('cart-items-container');
    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); margin-top: 40px;">
                <i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>Your cart is empty.</p>
            </div>`;
    } else {
        container.innerHTML = cart.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color);">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${item.name}</div>
                    <div style="font-size: 0.85rem; color: var(--brand-green); font-weight: 700;">₹${item.price}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-light); border-radius: 8px; padding: 4px;">
                    <button style="background:none; border:none; padding:4px 8px; cursor:pointer; color:var(--text-main);" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    <span style="font-weight: 600; width: 16px; text-align: center;">${item.quantity}</span>
                    <button style="background:none; border:none; padding:4px 8px; cursor:pointer; color:var(--text-main);" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
        `).join('');
    }
    
    // NEW: Always sync the menu card buttons whenever the cart updates!
    syncAllMenuButtons();
}

function getMenuButtonHTML(id, name, price) {
    const cartItem = cart.find(c => c.id === id);
    if (!cartItem) {
        // Default "Add" State
        return `<button class="btn-outline" style="padding: 0; font-size: 0.85rem; border-color: white; color: white; width: 90px; height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: rgba(0,0,0,0.3); border-radius: 8px;" 
            onclick="addToCart('${id}', '${name}', ${price})">
            + Add
        </button>`;
    } else {
        // Active "Quantity Control" State
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
    
    // Auto-fill phone if user is logged in
    if (!modal.classList.contains('hidden')) {
        const input = document.getElementById('checkout-phone-input');
        input.value = currentUserPhone || "";
    }
}

function checkoutWhatsApp() {
    if (cart.length === 0) {
        showToast("Add some meals to your cart first!");
        return;
    }
    toggleCheckoutModal(); // Open our beautiful new prompt
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
    
    // 1. Show the Loading Spinner immediately
    container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); width: 100%;">
            <div class="spinner"></div>
            <div>Fetching fresh menu...</div>
        </div>
    `;

    try {
        // 2. Fetch the data
        const menuItems = await dataService.getMenu();
        const filteredItems = menuItems.filter(item => item.category === currentCategory);
        
        // 3. Handle empty state
        if (filteredItems.length === 0) {
            container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); width: 100%;">Sold out for today!</div>';
            return;
        }

        // 4. Render the items
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
        // 5. Handle errors if the fetch fails
        container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #ef4444;">Error loading menu. Please try again later.</div>';
        console.error("Render Error:", err);
    }
}

function getImagePath(item) {
    if (item.img && item.img !== "") return item.img;
    
    // Formats "Veg Meal Dish 1 Chicken Bowl" to "vegmealdish1chickenbowl.png"
    const fileName = item.name.toLowerCase().replace(/\s+/g, '') + '.png';
    return `/images/${fileName}`; 
}


function setMenuCategory(c){currentCategory=c;document.querySelectorAll('.category-pill').forEach(b=>b.classList.toggle('active',b.id===`category-${c}`));renderMenu()}
function handleSwipeCategory(d){const c=['Vegetarian','Vegan','Non Vegetarian','Beverage'];const isVeg=document.getElementById('header-veg-toggle')?.checked;const a=isVeg?c.filter(x=>x!=='Non Vegetarian'):c;let i=a.indexOf(currentCategory);i=(d==='left')?(i+1)%a.length:(i-1+a.length)%a.length;setMenuCategory(a[i])}

async function fetchBuilderData() {
    const { data, error } = await sbClient
        .from('menu_items')
        .select('*')
        .in('category', ['Base', 'Protein', 'Fat'])
        .eq('is_available', true);

    if (error) return;

    // Sort into categories
    fetchedBuilderData.bases = data.filter(i => i.category === 'Base');
    fetchedBuilderData.proteins = data.filter(i => i.category === 'Protein');
    fetchedBuilderData.fats = data.filter(i => i.category === 'Fat');
    
    renderMealBuilder();
}

function selectBuilderItem(category, id) {
    currentBuild[category] = id;
    renderMealBuilder(); 
    updateBuilderSummary(); // <-- ADDED: Forces the math to recalculate on click
}

function updateBuilderSummary() {
    let totalP = 0, totalF = 0, price = 0;
    
    ['base', 'protein', 'fat'].forEach(cat => {
        if (currentBuild[cat]) {
            // FIX: Now looks at fetchedBuilderData instead of the old hardcoded list
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
    // 1. Check Veg Mode status
    const isVegMode = document.getElementById('header-veg-toggle')?.checked;

    ['bases', 'proteins', 'fats'].forEach(catKey => {
        const container = document.getElementById(`builder-${catKey}`);
        if (!container) return;

        // 2. FILTER: If Veg Mode is ON, hide 'Non Vegetarian' items
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
        showToast("Please select at least a Base and a Protein.");
        return;
    }
    
    // FIX: Look at the live Supabase data to get the cart prices
    const baseItem = fetchedBuilderData.bases.find(i => i.id === currentBuild.base);
    const proteinItem = fetchedBuilderData.proteins.find(i => i.id === currentBuild.protein);
    const fatItem = currentBuild.fat ? fetchedBuilderData.fats.find(i => i.id === currentBuild.fat) : null;
    
    let price = baseItem.price + proteinItem.price + (fatItem ? fatItem.price : 0);
    const bowlName = `Custom: ${proteinItem.name} Bowl`;
    const bowlId = 'custom_' + Date.now();
    
    addToCart(bowlId, bowlName, price);
    showToast("Custom bowl added to cart!");
    
    // Reset builder back to zero
    currentBuild = { base: null, protein: null, fat: null };
    renderMealBuilder();
    updateBuilderSummary(); // <-- ADDED: Resets the text back to Total: ₹0
}

// --- DIET DATABASE ---
const dietDatabase = {
    underweight: [
        { type: 'Vegetarian', name: 'Paneer Power Bowl', macros: '35g P | 22g F' },
        { type: 'Non-Veg', name: 'Chicken Ghee Roast', macros: '45g P | 28g F' },
        { type: 'Vegan', name: 'Tofu Peanut Curry', macros: '28g P | 24g F' },
        { type: 'Beverage', name: 'Banana Oat Shake', macros: '15g P | 8g F' }
    ],
    normal: [
        { type: 'Vegetarian', name: 'Quinoa Lentil Bowl', macros: '22g P | 12g F' },
        { type: 'Non-Veg', name: 'Grilled Chicken Salad', macros: '40g P | 15g F' },
        { type: 'Vegan', name: 'Chickpea Buddha Bowl', macros: '20g P | 14g F' },
        { type: 'Beverage', name: 'Green Detox Smoothie', macros: '5g P | 2g F' }
    ],
    overweight: [
        { type: 'Vegetarian', name: 'Broccoli Moong Sprout', macros: '18g P | 5g F' },
        { type: 'Non-Veg', name: 'Lean Fish Tikka', macros: '35g P | 8g F' },
        { type: 'Vegan', name: 'Zucchini Noodle Tofu', macros: '22g P | 9g F' },
        { type: 'Beverage', name: 'Matcha Clear Tea', macros: '1g P | 0g F' }
    ]
};

// --- CORE CALCULATOR LOGIC ---
function calculateBMI() {
    let height = parseFloat(document.getElementById('bmi-height').value);
    let weight = parseFloat(document.getElementById('bmi-weight').value);
    
    const heightUnitEl = document.getElementById('height-unit');
    const weightUnitEl = document.getElementById('weight-unit');
    const heightUnit = heightUnitEl ? heightUnitEl.value : 'cm';
    const weightUnit = weightUnitEl ? weightUnitEl.value : 'kg';
    
    const age = parseInt(document.getElementById('bmi-age').value);
    const gender = document.getElementById('bmi-gender').value;
    
    if (!height || !weight || !age) {
        showToast("Please fill out all fields.");
        return;
    }
    
    const heightCm = heightUnit === 'in' ? height * 2.54 : height;
    const weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;
    
    const heightM = heightCm / 100;
    const bmi = (weightKg / (heightM * heightM)).toFixed(1);
    
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;
    const dailyCalories = Math.round(bmr * 1.2); 
    
    let category = '';
    let meals = [];
    
    if (bmi < 18.5) {
        category = 'Underweight (Bulk)';
        meals = dietDatabase.underweight;
    } else if (bmi >= 18.5 && bmi <= 24.9) {
        category = 'Normal (Maintain)';
        meals = dietDatabase.normal;
    } else {
        category = 'Overweight (Cut)';
        meals = dietDatabase.overweight;
    }
    
    // Update UI Text
    document.getElementById('bmi-value').innerText = bmi;
    document.getElementById('bmi-category').innerText = category;
    
    const caloriesEl = document.getElementById('bmi-calories');
    if (caloriesEl) caloriesEl.innerText = `Est. Daily Goal: ${dailyCalories} kcal`;
    
    // Render Meals + "Build Custom" Card
    const mealsHTML = meals.map(meal => `
        <div class="rec-card">
            <div>
                <div class="rec-type">${meal.type}</div>
                <div class="rec-name">${meal.name}</div>
            </div>
            <div class="rec-macros">${meal.macros}</div>
        </div>
    `).join('');

    const customCardHTML = `
        <div class="rec-card-custom" onclick="goToCreate()">
            <i class="fas fa-plus" style="font-size: 1.5rem; color: var(--brand-green); margin-bottom: 8px;"></i>
            <div style="font-weight: 800; color: var(--brand-green);">Build Your Bowl</div>
        </div>
    `;

    const mealsContainer = document.getElementById('bmi-meals');
    if (mealsContainer) mealsContainer.innerHTML = mealsHTML + customCardHTML;
    
    // Reveal the hidden containers
    document.getElementById('bmi-score-container').style.display = 'block';
    const recContainer = document.getElementById('bmi-recommendations-container');
    if (recContainer) recContainer.style.display = 'block';

    // Save record to Supabase (which triggers the History rendering)
    saveBmiHistory(bmi, category, heightCm.toFixed(1), weightKg.toFixed(1));    
}

// --- DATABASE HISTORY LOGIC ---
async function saveBmiHistory(bmi, category, height, weight) {
    const { data: { session } } = await sbClient.auth.getSession();
    
    if (!session) {
        showToast("Log in to save this to your BMI history!");
        return; // Stops here if they are a guest
    }

    const { error } = await sbClient.from('bmi_history').insert([{
        user_id: session.user.id,
        height: height,
        weight: weight,
        bmi: bmi,
        category: category
    }]);

    if (error) {
        console.error("Error saving BMI:", error);
        showToast("Could not save BMI. Check your connection.");
    } else {
        renderBmiHistory(); // Refresh the list instantly
    }
}

async function renderBmiHistory() {
    const container = document.getElementById('bmi-history-container');
    const listEl = document.getElementById('bmi-history-list');
    
    if (!container || !listEl) return;

    const { data: { session } } = await sbClient.auth.getSession();
    
    if (!session) {
        container.style.display = 'none';
        return;
    }

    const { data, error } = await sbClient
        .from('bmi_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error || !data || data.length === 0) {
        container.style.display = 'none';
        return;
    }

    listEl.innerHTML = data.map(record => {
        const date = new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        
        // Dynamic color coding for the category text
        let catColor = 'var(--text-muted)';
        if (record.category.includes('Normal')) catColor = 'var(--brand-green)';
        if (record.category.includes('Overweight')) catColor = '#f97316'; // Orange
        if (record.category.includes('Underweight')) catColor = '#3b82f6'; // Blue

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
}

async function loadChat() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;

    const { data, error } = await sbClient.from('messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Chat fetch error:", error);
        return;
    }

    // Render messages with better structure
    container.innerHTML = data.map(m => `
        <div class="message-bubble ${m.sender_role === 'admin' ? 'message-admin' : 'message-user'}">
            ${m.message}
        </div>
    `).join('');
    
    // Crucial: Scroll to the bottom so the newest message is visible
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;

    // FIX: Try metadata first, then local storage, then fallback
    const phone = session.user.phone?.replace('+91', '');
    const savedName = localStorage.getItem('prober_user_' + phone);
    const customerName = session.user.user_metadata?.full_name || savedName || 'Customer';

    try {
        await sbClient.from('messages').insert([{
            user_id: session.user.id,
            sender_name: customerName, // Ensures name is attached to every message
            message: message,
            sender_role: 'user'
        }]);
        input.value = '';
        loadChat();
    } catch (err) {
        showToast("Failed to send message.");
    }
}


function triggerNotification(){if(navigator.vibrate)navigator.vibrate(200);new Audio('/assets/notification.mp3').play().catch(()=>{})}


// Global variable to hold the selected image file
let selectedFileForUpload = null;

// --- 1. ADMIN MENU RENDERING (STATUS & DELETE TABS) ---
async function renderAdminMenu() {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;

    const { data, error } = await sbClient
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Admin Load Error:", error);
        return;
    }

    adminItemsData = data; 
    updateAdminView(currentAdminCategory || 'All');
}

// Replace your existing updateAdminView function in app.js with this:
function updateAdminView(category) {
    // 1. Remove 'active' class from ALL tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
        // 2. Add 'active' class to the matching button dynamically
        if (tab.innerText.trim() === category || 
           (category === 'Vegetarian' && tab.innerText.trim() === 'Veg') ||
           (category === 'Non Vegetarian' && tab.innerText.trim() === 'Non-Veg')) {
            tab.classList.add('active');
        }
    });

    //3.Set the category and refresh the list
    currentAdminCategory = category;

    // Filter Data for the Status List
    let filteredData = (category === 'All') 
        ? adminItemsData 
        : adminItemsData.filter(item => item.category === category);

    const statusContainer = document.getElementById('admin-menu-list-status');
    const deleteContainer = document.getElementById('admin-menu-list-delete');

    // --- RENDER STATUS TAB (Filtered) ---
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

    // --- RENDER DELETE TAB (Always All Items) ---
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

async function updateItemAvailability(itemId, isAvailable) {
    const { error } = await sbClient
        .from('menu_items')
        .update({ is_available: isAvailable })
        .eq('id', itemId);

    if (error) {
        showToast("Update failed");
        renderAdminMenu(); 
    } else {
        renderMenu(); // Keep main menu in sync
    }
}

async function deleteMenuItem(id, name) {
    // 1. Basic check: Is a user even logged in?
    if (!pb.authStore.isValid) {
        showToast("Access Denied: Please login.");
        return;
    }

    // 2. Simple confirmation instead of a public passcode
    const confirmDelete = confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirmDelete) return;

    // 3. PocketBase Delete Call
    try {
        await pb.collection('menu_items').delete(id);
        
        showToast("Dish deleted successfully");
        renderAdminMenu(); // Refresh the list you are looking at
        renderMenu();      // Sync the customer-facing menu
    } catch (err) {
        console.error("Delete Error:", err);
        showToast("Failed to delete. Check your permissions.");
    }
}

// --- 2. ADMIN SUPPORT CHAT LOGIC ---
let currentAdminChatUserId = null;

async function loadAdminChat() {
    const listContainer = document.getElementById('admin-chat-users-list');
    const windowContainer = document.getElementById('admin-chat-window');
    
    if (!listContainer) return;
    
    // Reset view to show inbox, hide chat window
    listContainer.style.display = 'flex'; 
    listContainer.style.flexDirection = 'column';
    listContainer.innerHTML = '<div class="spinner"></div>';
    if (windowContainer) windowContainer.style.display = 'none';

    // Fetch all messages to build the inbox list
    const { data, error } = await sbClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error loading messages.</p>';
        return;
    }

    // Group messages by unique users
    const uniqueUsers = {};
    data.forEach(msg => {
        if (msg.user_id && !uniqueUsers[msg.user_id]) {
            uniqueUsers[msg.user_id] = {
                userId: msg.user_id,
                userName: msg.sender_name || 'Customer',
                lastMessage: msg.message,
                time: new Date(msg.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            };
        }
    });

    const usersArray = Object.values(uniqueUsers);

    if (usersArray.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No support messages yet.</p>';
        return;
    }

    // Render the Inbox Cards
    listContainer.innerHTML = usersArray.map(u => `
        <div onclick="openAdminChat('${u.userId}', '${u.userName.replace(/'/g, "\\'")}')" style="background: var(--card-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm); transition: transform 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: var(--text-main); font-size: 1.05rem;">${u.userName}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${u.time}</span>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${u.lastMessage}
            </div>
        </div>
    `).join('');
}

async function openAdminChat(userId, userName) {
    const windowEl = document.getElementById('admin-chat-window');
    const listEl = document.getElementById('admin-chat-users-list');
    const container = document.getElementById('admin-chat-messages');

    currentAdminChatUserId = userId;
    document.getElementById('admin-chat-customer-name').innerText = userName;
    
    listEl.style.display = 'none';
    windowEl.style.display = 'flex';
    
    const { data } = await sbClient.from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    container.innerHTML = data.map(m => {
        const isAdmin = m.sender_role === 'admin';
        return `<div class="message-bubble ${isAdmin ? 'message-user' : 'message-admin'}">
            ${m.message}
        </div>`;
    }).join('');
    
    // Auto scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

function closeAdminChat() {
    currentAdminChatUserId = null;
    loadAdminChat(); // Go back to inbox
}

async function sendAdminReply() {
    if (!currentAdminChatUserId) return;
    const input = document.getElementById('admin-reply-input');
    const text = input.value.trim();
    if (!text) return;

    await sbClient.from('messages').insert([{
        user_id: currentAdminChatUserId,
        message: text,
        sender_role: 'admin'
    }]);
    
    input.value = '';
    openAdminChat(currentAdminChatUserId, document.getElementById('admin-chat-customer-name').innerText);
}

// --- 3. TAB & UTILITY LOGIC ---
function showAdminTab(t) {
    // Hide all contents
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    
    // Strip active classes from navigation tabs
    document.querySelectorAll('.admin-tab, .ribbon-btn').forEach(b => b.classList.remove('active'));
    
    // Show specific target content
    const content = document.getElementById(`admin-tab-${t}`);
    if(content) content.classList.add('active');
    
    // Highlight specific target button
    const btn = document.getElementById(`tab-${t}`);
    if(btn) btn.classList.add('active');
    
    // Load chat data if we clicked the support tab
    if (t === 'support') loadAdminChat();
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
    
    if (!activeList || !recentList) return;

    // Show loading state
    activeList.innerHTML = '<div class="spinner"></div>';
    recentList.innerHTML = '';

    const { data: { session } } = await sbClient.auth.getSession();
    if (!session) return;

    // Fetch orders and join with order_items
    const { data: orders, error } = await sbClient
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading orders:", error);
        activeList.innerHTML = '<p style="color:var(--text-muted);">Error loading orders.</p>';
        return;
    }

    // Categorize orders
    const activeOrders = orders.filter(o => ['Pending', 'Preparing', 'Out for Delivery'].includes(o.status));
    const recentOrders = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.status));

    // Render Active Orders
    if (activeOrders.length > 0) {
        activeList.innerHTML = activeOrders.map(o => renderOrderCard(o)).join('');
    } else {
        activeList.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">No active orders right now.</p>';
    }

    // Render Recent History
    if (recentOrders.length > 0) {
        recentList.innerHTML = recentOrders.map(o => renderOrderCard(o)).join('');
    } else {
        recentList.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">No previous orders found.</p>';
    }
}

function renderOrderCard(order) {
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
    
    // Generate the list of items from the joined order_items table
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





// --- 1. APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("MARKER 1: App started");

    const spinner = document.getElementById('loading-spinner');
    
    // 1. Force the spinner on immediately
    if (spinner) spinner.style.display = 'flex';

    try {
        console.log("MARKER 2: Checking session...");

        // 2. The Safety Net: If Supabase takes > 5s, we force the app to continue
        const sessionCheck = checkUserSession();
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase Timeout")), 5000)
        );

        await Promise.race([sessionCheck, timeout]);
        console.log("MARKER 3: Session check finished.");

        // 3. Setup Theme & Routing
        initializeThemeSwatches();
        const savedTheme = localStorage.getItem('prober-active-theme') || 'clean-white';
        applyTheme(savedTheme);

        let hash = window.location.hash.replace('#', '') || 'home';
        // Only route if we aren't in the middle of a Google Auth redirect
        if (!window.location.hash.includes('access_token')) {
            switchScreen(hash);
        }

        // 4. Data Initialization (Non-blocking)
        // We use allSettled so the app loads even if one API call fails
        Promise.allSettled([
            fetchBuilderData().then(() => {
                if (typeof renderMenu === 'function') renderMenu();
            }),
            renderBmiHistory(),
            updateCartUI()
        ]);

        console.log("MARKER 4: App fully initialized.");

    } catch (err) {
        // 5. Robust Error Handling: Ensure UI shows even on failure
        console.error("CRITICAL STARTUP ERROR:", err);
        
        // Ensure user isn't stuck on a blank screen
        switchScreen('home'); 
        showToast("Connected in offline/limited mode."); 
    } finally {
        // 6. Final safety: Remove spinner regardless of success or failure
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
});

// --- 2. SCREEN NAVIGATION ---

function switchScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Show target screen
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        window.location.hash = screenId;
    } else {
        // Fallback if ID doesn't exist
        document.getElementById('home')?.classList.add('active');
    }

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(n => {
        const onclick = n.getAttribute('onclick') || '';
        n.classList.toggle('active', onclick.includes(screenId));
    });
}

// --- 3. THEME MANAGEMENT ---

function initializeThemeSwatches() {
    const container = document.getElementById('theme-swatch-container');
    if (!container) return;

    let html = '';
    for (const key in appThemes) {
        const theme = appThemes[key];
        const bgLight = theme.vars['--bg-light'];
        const brand = theme.vars['--brand-green'];
        const gradient = `linear-gradient(135deg, ${bgLight} 0%, ${bgLight} 40%, ${brand} 100%)`;
        html += `<div class="theme-swatch" id="swatch-${key}" title="${theme.name}" style="background: ${gradient};" onclick="applyTheme('${key}')"></div>`;
    }
    container.innerHTML = html;
}

function applyTheme(themeKey) {
    const theme = appThemes[themeKey];
    if (!theme) return;
    
    for (const [varName, value] of Object.entries(theme.vars)) {
        document.documentElement.style.setProperty(varName, value);
    }
    localStorage.setItem('prober-active-theme', themeKey);
    
    document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    const activeSwatch = document.getElementById(`swatch-${themeKey}`);
    if (activeSwatch) activeSwatch.classList.add('active');
}

// --- 4. CART LOGIC ---

function updateCartUI() {
    // Sync cart with local storage
    if (typeof cart !== 'undefined') {
        localStorage.setItem('prober_cart', JSON.stringify(cart));
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.getElementById('cart-count');
        if (badge) {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }
}

// --- 5. TOUCH GESTURES ---

// --- 5. TOUCH GESTURES ---

document.addEventListener('touchstart', e => {
    window.startX = e.touches[0].clientX;
}, {passive: true});

document.addEventListener('touchend', e => {
    if (typeof window.startX === 'undefined') return;
    const d = e.changedTouches[0].clientX - window.startX;
    if (Math.abs(d) > 50 && window.location.hash === '#menu') {
        if (typeof handleSwipeCategory === 'function') {
            handleSwipeCategory(d > 0 ? 'right' : 'left');
        }
    }
}, {passive: true});
// The extra '}' that was here has been removed.

async function handleAddItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('add-name').value;
    const category = document.getElementById('add-category').value;
    const price = parseFloat(document.getElementById('add-price').value);
    
    // This now saves to PocketBase instead of Supabase
    try {
        await pb.collection('menu_items').create({
            name: name,
            category: category,
            price: price,
            is_available: true
        });
        showToast("Dish published!");
        event.target.reset();
        renderAdminMenu();
    } catch (err) {
        showToast("Error adding dish.");
    }
}