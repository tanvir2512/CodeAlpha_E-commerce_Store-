const state = {
    products: [],
    cart: [],
    currentUser: JSON.parse(localStorage.getItem('rc_session_user') || 'null'),
    activeCategory: 'All',
    searchQuery: '',
    sortBy: 'featured',
    appliedPromo: false,
    activeModalProduct: null,
    modalQty: 1
};

const API = {
    async getProducts() {
        try {
            const res = await fetch('/api/products');
            return await res.json();
        } catch (err) {
            console.error('Failed to fetch products', err);
            return [];
        }
    },
    async getCart(userId) {
        try {
            const res = await fetch(`/api/cart/${userId}`);
            return await res.json();
        } catch (err) {
            return [];
        }
    },
    async saveCart(userId, cart) {
        try {
            await fetch(`/api/cart/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart })
            });
        } catch (err) {
            console.error('Failed to save cart', err);
        }
    },
    async createOrder(orderData) {
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            return await res.json();
        } catch (err) {
            console.error('Order creation failed', err);
            return { success: false };
        }
    },
    async getOrders(userId) {
        try {
            const res = await fetch(`/api/orders/${userId}`);
            return await res.json();
        } catch (err) {
            return [];
        }
    }
};

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    
    toast.className = `glass-panel px-4 py-3 rounded-2xl flex items-center gap-3 border shadow-xl text-xs transform transition-all duration-300 translate-y-[-10px] opacity-0 pointer-events-auto ${
        isSuccess ? 'border-gold text-cream bg-slate-900/90' : 'border-red-500 text-red-200 bg-slate-900/90'
    }`;
    
    toast.innerHTML = `
        <i class="${isSuccess ? 'fa-solid fa-circle-check text-gold' : 'fa-solid fa-triangle-exclamation text-red-400'} text-base"></i>
        <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-[-10px]', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const app = {
    async init() {
        state.products = await API.getProducts();
        
        if (state.currentUser) {
            state.cart = await API.getCart(state.currentUser.email);
        } else {
            state.cart = JSON.parse(localStorage.getItem('rc_guest_cart') || '[]');
        }

        this.renderCategories();
        this.renderProducts();
        cartUI.updateCartUI();
        authUI.updateAuthNavState();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchInputMobile = document.getElementById('searchInputMobile');

        const handleSearch = (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            const clearBtn = document.getElementById('clearSearchBtn');
            const heroBanner = document.getElementById('heroBanner');

            // Sync both search inputs if typing in one
            if (searchInput && e.target !== searchInput) searchInput.value = e.target.value;
            if (searchInputMobile && e.target !== searchInputMobile) searchInputMobile.value = e.target.value;

            if (state.searchQuery.length > 0) {
                if (clearBtn) clearBtn.classList.remove('hidden');
                // Hide Hero Banner when searching
                if (heroBanner) heroBanner.classList.add('hidden');
            } else {
                if (clearBtn) clearBtn.classList.add('hidden');
                // Show Hero Banner back when search is empty
                if (heroBanner) heroBanner.classList.remove('hidden');
            }
            this.renderProducts();
        };

        if (searchInput) searchInput.addEventListener('input', handleSearch);
        if (searchInputMobile) searchInputMobile.addEventListener('input', handleSearch);
    },

    clearSearch() {
        document.getElementById('searchInput').value = '';
        if (document.getElementById('searchInputMobile')) document.getElementById('searchInputMobile').value = '';
        document.getElementById('clearSearchBtn').classList.add('hidden');
        
        // Show Hero Banner again when search is cleared
        const heroBanner = document.getElementById('heroBanner');
        if (heroBanner) heroBanner.classList.remove('hidden');

        state.searchQuery = '';
        this.renderProducts();
    },

    renderCategories() {
        const categories = ['All', 'Flight Controllers', 'ESC & Motors', 'Power & Batteries', 'Companion Computers', 'Accessories'];
        const container = document.getElementById('categoryContainer');
        if (!container) return;
        
        container.innerHTML = categories.map(cat => {
            const isActive = state.activeCategory === cat;
            return `
                <button onclick="app.setCategory('${cat}')" 
                        class="px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                            isActive 
                            ? 'bg-gold text-darkBg font-bold shadow-md shadow-gold/20' 
                            : 'glass-panel text-cream/80 hover:text-gold hover:border-gold/40'
                        }">
                    ${cat}
                </button>
            `;
        }).join('');
    },

    setCategory(cat) {
        state.activeCategory = cat;
        this.renderCategories();
        this.renderProducts();
    },

    handleSortChange(val) {
        state.sortBy = val;
        this.renderProducts();
    },

    resetFilters() {
        state.activeCategory = 'All';
        state.searchQuery = '';
        state.sortBy = 'featured';
        document.getElementById('searchInput').value = '';
        if (document.getElementById('searchInputMobile')) document.getElementById('searchInputMobile').value = '';
        document.getElementById('clearSearchBtn').classList.add('hidden');
        
        const heroBanner = document.getElementById('heroBanner');
        if (heroBanner) heroBanner.classList.remove('hidden');

        document.getElementById('sortSelect').value = 'featured';
        this.renderCategories();
        this.renderProducts();
    },

    getFilteredProducts() {
        let list = [...state.products];

        if (state.activeCategory !== 'All') {
            list = list.filter(p => p.category === state.activeCategory);
        }

        if (state.searchQuery) {
            list = list.filter(p => 
                p.title.toLowerCase().includes(state.searchQuery) || 
                p.description.toLowerCase().includes(state.searchQuery) ||
                p.category.toLowerCase().includes(state.searchQuery)
            );
        }

        if (state.sortBy === 'price-low') {
            list.sort((a, b) => a.price - b.price);
        } else if (state.sortBy === 'price-high') {
            list.sort((a, b) => b.price - a.price);
        } else if (state.sortBy === 'rating') {
            list.sort((a, b) => b.rating - a.rating);
        }

        return list;
    },

    renderProducts() {
        const container = document.getElementById('productGrid');
        const emptyState = document.getElementById('emptyCatalogState');
        const countLabel = document.getElementById('productCountLabel');
        if (!container) return;

        const products = this.getFilteredProducts();
        countLabel.innerText = `Showing ${products.length} component${products.length === 1 ? '' : 's'}`;

        if (products.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = products.map(p => `
            <div class="glass-panel rounded-2xl p-4 flex flex-col justify-between glass-panel-hover group border border-white/10">
                <div>
                    <div class="relative bg-black/20 rounded-xl p-4 mb-4 flex items-center justify-center h-44 overflow-hidden border border-white/5">
                        <span class="absolute top-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/30">
                            ${p.category}
                        </span>
                        <img src="${p.image}" alt="${p.title}" 
                             class="max-h-36 object-contain group-hover:scale-110 transition-transform duration-500 filter drop-shadow-md"
                             onerror="this.src='https://placehold.co/400x300/1e293b/fcbf49?text=RC+Component'">
                    </div>

                    <div class="flex items-center gap-1 text-gold text-xs mb-1">
                        <i class="fa-solid fa-star"></i>
                        <span class="font-bold">${p.rating}</span>
                        <span class="text-cream/40 text-[10px] ml-1">(${p.stock} in stock)</span>
                    </div>

                    <h3 class="font-tech text-sm font-bold text-cream line-clamp-1 group-hover:text-gold transition-colors">
                        ${p.title}
                    </h3>
                    <p class="text-xs text-cream/60 line-clamp-2 mt-1 mb-3">
                        ${p.description}
                    </p>
                </div>

                <div class="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div class="font-tech text-base font-bold text-gold">$${p.price.toFixed(2)}</div>
                    <div class="flex items-center gap-2">
                        <button onclick="app.openProductModal('${p.id}')" 
                                class="glass-panel p-2 rounded-xl text-cream/70 hover:text-gold transition text-xs" title="View Specifications">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button onclick="cartUI.addToCart('${p.id}')" 
                                class="bg-gold hover:bg-goldHover text-darkBg font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-md shadow-gold/20">
                            <i class="fa-solid fa-cart-plus"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    openProductModal(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        state.activeModalProduct = product;
        state.modalQty = 1;

        document.getElementById('modalProductCategory').innerText = product.category;
        document.getElementById('modalProductTitle').innerText = product.title;
        document.getElementById('modalProductRating').innerText = `★ ${product.rating}`;
        document.getElementById('modalProductStock').innerText = `${product.stock} Units Available`;
        document.getElementById('modalProductPrice').innerText = `$${product.price.toFixed(2)}`;
        document.getElementById('modalProductDesc').innerText = product.description;
        document.getElementById('modalProductImg').src = product.image;
        document.getElementById('modalQtyVal').innerText = '1';

        document.getElementById('specVoltage').innerText = product.specs?.voltage || 'Standard 5V/12V';
        document.getElementById('specWeight').innerText = product.specs?.weight || 'N/A';
        document.getElementById('specMCU').innerText = product.specs?.mcu || 'Integrated IC';

        document.getElementById('productDetailModal').classList.remove('hidden');
    },

    closeProductModal() {
        document.getElementById('productDetailModal').classList.add('hidden');
        state.activeModalProduct = null;
    },

    adjustModalQty(delta) {
        state.modalQty = Math.max(1, state.modalQty + delta);
        document.getElementById('modalQtyVal').innerText = state.modalQty;
    },

    addModalProductToCart() {
        if (state.activeModalProduct) {
            cartUI.addToCart(state.activeModalProduct.id, state.modalQty);
            this.closeProductModal();
        }
    },

    async openOrdersModal() {
        if (!state.currentUser) return;
        const orders = await API.getOrders(state.currentUser.email);
        const container = document.getElementById('ordersHistoryContainer');

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-cream/50 text-xs">
                    <i class="fa-solid fa-box-open text-3xl mb-2 text-gold/40"></i>
                    <p>No past orders recorded yet.</p>
                </div>
            `;
        } else {
            container.innerHTML = orders.map(ord => `
                <div class="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
                    <div class="flex justify-between items-center border-b border-white/10 pb-2 text-xs">
                        <div>
                            <span class="font-tech font-bold text-gold">${ord.id}</span>
                            <span class="text-cream/50 text-[10px] block">${new Date(ord.date).toLocaleString()}</span>
                        </div>
                        <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                            ${ord.status}
                        </span>
                    </div>
                    <div class="text-xs text-cream/80 space-y-1">
                        ${ord.items.map(i => `<div class="flex justify-between"><span>${i.title} (x${i.qty})</span><span class="font-mono">$${(i.price * i.qty).toFixed(2)}</span></div>`).join('')}
                    </div>
                    <div class="flex justify-between items-center border-t border-white/10 pt-2 text-xs font-bold">
                        <span class="text-cream/70">Total Paid:</span>
                        <span class="text-gold font-tech">$${ord.total.toFixed(2)}</span>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('ordersModal').classList.remove('hidden');
    },

    closeOrdersModal() {
        document.getElementById('ordersModal').classList.add('hidden');
    },

    async updateActiveOrdersBadge() {
        const badge = document.getElementById('activeOrdersBadge');
        if (!badge || !state.currentUser) return;
        const orders = await API.getOrders(state.currentUser.email);
        if (orders.length > 0) {
            badge.innerText = orders.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
};

const cartUI = {
    toggleCartDrawer() {
        document.getElementById('cartDrawer').classList.toggle('hidden');
    },

    async addToCart(productId, quantity = 1) {
        const existing = state.cart.find(item => item.id === productId);
        const product = state.products.find(p => p.id === productId);

        if (!product) return;

        if (existing) {
            existing.qty += quantity;
        } else {
            state.cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                qty: quantity
            });
        }

        if (state.currentUser) {
            await API.saveCart(state.currentUser.email, state.cart);
        } else {
            localStorage.setItem('rc_guest_cart', JSON.stringify(state.cart));
        }

        this.updateCartUI();
        showToast(`Added ${quantity}x "${product.title}" to cart`);
    },

    async updateQty(productId, delta) {
        const item = state.cart.find(i => i.id === productId);
        if (!item) return;

        item.qty += delta;
        if (item.qty <= 0) {
            state.cart = state.cart.filter(i => i.id !== productId);
        }

        if (state.currentUser) {
            await API.saveCart(state.currentUser.email, state.cart);
        } else {
            localStorage.setItem('rc_guest_cart', JSON.stringify(state.cart));
        }

        this.updateCartUI();
    },

    async removeItem(productId) {
        state.cart = state.cart.filter(i => i.id !== productId);
        if (state.currentUser) {
            await API.saveCart(state.currentUser.email, state.cart);
        } else {
            localStorage.setItem('rc_guest_cart', JSON.stringify(state.cart));
        }
        this.updateCartUI();
        showToast('Item removed from cart');
    },

    applyPromoCode() {
        const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
        if (code === 'ROBOTICS10') {
            state.appliedPromo = true;
            showToast('Promo code ROBOTICS10 applied (10% OFF)!');
            document.getElementById('discountRow').classList.remove('hidden');
        } else {
            showToast('Invalid promo code. Try ROBOTICS10', 'error');
        }
        this.updateCartUI();
    },

    calculateTotals() {
        const subtotal = state.cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
        const discount = state.appliedPromo ? subtotal * 0.10 : 0;
        const shipping = subtotal > 0 ? 12.00 : 0;
        const tax = (subtotal - discount) * 0.05;
        const grandTotal = subtotal - discount + shipping + tax;

        return { subtotal, discount, shipping, tax, grandTotal };
    },

    updateCartUI() {
        const container = document.getElementById('cartItemsContainer');
        const badge = document.getElementById('cartCountBadge');
        const navTotal = document.getElementById('navCartTotal');
        const totalCount = state.cart.reduce((acc, i) => acc + i.qty, 0);

        if (badge) badge.innerText = totalCount;
        
        const totals = this.calculateTotals();
        if (navTotal) navTotal.innerText = `$${totals.grandTotal.toFixed(2)}`;

        document.getElementById('cartSubtotal').innerText = `$${totals.subtotal.toFixed(2)}`;
        document.getElementById('cartDiscount').innerText = `-$${totals.discount.toFixed(2)}`;
        document.getElementById('cartShipping').innerText = `$${totals.shipping.toFixed(2)}`;
        document.getElementById('cartTax').innerText = `$${totals.tax.toFixed(2)}`;
        document.getElementById('cartGrandTotal').innerText = `$${totals.grandTotal.toFixed(2)}`;
        document.getElementById('checkoutFinalTotal').innerText = `$${totals.grandTotal.toFixed(2)}`;

        if (state.cart.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-cream/40 space-y-3">
                    <i class="fa-solid fa-cart-arrow-down text-4xl text-gold/30"></i>
                    <p class="text-xs">Your shopping cart is currently empty.</p>
                </div>
            `;
            document.getElementById('proceedCheckoutBtn').disabled = true;
            document.getElementById('proceedCheckoutBtn').classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            document.getElementById('proceedCheckoutBtn').disabled = false;
            document.getElementById('proceedCheckoutBtn').classList.remove('opacity-50', 'cursor-not-allowed');

            container.innerHTML = state.cart.map(item => `
                <div class="glass-panel p-3 rounded-2xl flex items-center justify-between border border-white/10 gap-3">
                    <img src="${item.image}" class="w-12 h-12 object-contain bg-black/20 rounded-lg p-1 border border-white/5">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-bold text-cream truncate">${item.title}</h4>
                        <div class="text-xs text-gold font-tech">$${item.price.toFixed(2)}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center glass-panel rounded-lg overflow-hidden border border-white/10 text-xs">
                            <button onclick="cartUI.updateQty('${item.id}', -1)" class="px-2 py-1 hover:bg-white/10">-</button>
                            <span class="px-2 py-1 font-mono font-bold">${item.qty}</span>
                            <button onclick="cartUI.updateQty('${item.id}', 1)" class="px-2 py-1 hover:bg-white/10">+</button>
                        </div>
                        <button onclick="cartUI.removeItem('${item.id}')" class="text-cream/40 hover:text-red-400 text-xs p-1">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
};

const checkoutUI = {
    openCheckoutModal() {
        if (state.cart.length === 0) return;
        cartUI.toggleCartDrawer();

        if (state.currentUser) {
            document.getElementById('shipName').value = state.currentUser.name || '';
            document.getElementById('shipEmail').value = state.currentUser.email || '';
        }

        document.getElementById('checkoutModal').classList.remove('hidden');
    },

    closeCheckoutModal() {
        document.getElementById('checkoutModal').classList.add('hidden');
    },

    async handleOrderSubmit(e) {
        e.preventDefault();
        const totals = cartUI.calculateTotals();

        const orderData = {
            userId: state.currentUser ? state.currentUser.email : document.getElementById('shipEmail').value,
            items: [...state.cart],
            total: totals.grandTotal,
            shippingAddress: {
                name: document.getElementById('shipName').value,
                address: document.getElementById('shipAddress').value,
                city: document.getElementById('shipCity').value
            }
        };

        const res = await API.createOrder(orderData);
        if (res.success) {
            state.cart = [];
            cartUI.updateCartUI();
            this.closeCheckoutModal();
            this.triggerOrderTracker(res.order.id);
        } else {
            showToast('Order placement failed', 'error');
        }
    },

    triggerOrderTracker(orderId) {
        document.getElementById('trackOrderId').innerText = `Order #${orderId}`;
        document.getElementById('trackingModal').classList.remove('hidden');

        const s2 = document.getElementById('step2');
        const s3 = document.getElementById('step3');
        const s4 = document.getElementById('step4');

        s2.classList.add('opacity-40');
        s3.classList.add('opacity-40');
        s4.classList.add('opacity-40');

        setTimeout(() => s2.classList.remove('opacity-40'), 1500);
        setTimeout(() => s3.classList.remove('opacity-40'), 3500);
        setTimeout(() => s4.classList.remove('opacity-40'), 5500);
    },

    closeTrackingModal() {
        document.getElementById('trackingModal').classList.add('hidden');
        showToast('Order saved! Track anytime from your profile/orders.');
        app.updateActiveOrdersBadge();
    }
};

const authUI = {
    openAuthModal() {
        if (state.currentUser) {
            if (confirm(`Logged in as ${state.currentUser.name}. Do you want to Sign Out?`)) {
                this.logout();
            }
            return;
        }
        // Clear previous error messages when opening modal
        document.getElementById('loginError')?.classList.add('hidden');
        document.getElementById('regError')?.classList.add('hidden');
        document.getElementById('authModal').classList.remove('hidden');
    },

    closeAuthModal() {
        document.getElementById('authModal').classList.add('hidden');
    },

    switchTab(tab) {
        const loginBtn = document.getElementById('loginTabBtn');
        const regBtn = document.getElementById('registerTabBtn');
        const loginForm = document.getElementById('loginForm');
        const regForm = document.getElementById('registerForm');

        // Clear errors on tab switch
        document.getElementById('loginError')?.classList.add('hidden');
        document.getElementById('regError')?.classList.add('hidden');

        if (tab === 'login') {
            loginBtn.className = 'flex-1 py-3 text-xs font-tech font-bold text-gold border-b-2 border-gold transition';
            regBtn.className = 'flex-1 py-3 text-xs font-tech font-bold text-cream/60 hover:text-cream border-b-2 border-transparent transition';
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
        } else {
            regBtn.className = 'flex-1 py-3 text-xs font-tech font-bold text-gold border-b-2 border-gold transition';
            loginBtn.className = 'flex-1 py-3 text-xs font-tech font-bold text-cream/60 hover:text-cream border-b-2 border-transparent transition';
            regForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPass').value;
        const errorEl = document.getElementById('loginError');
        
        if (errorEl) errorEl.classList.add('hidden');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                state.currentUser = data.user;
                localStorage.setItem('rc_session_user', JSON.stringify(state.currentUser));
                state.cart = await API.getCart(state.currentUser.email);
                cartUI.updateCartUI();
                this.updateAuthNavState();
                this.closeAuthModal();
                showToast(`Welcome back, ${data.user.name}!`);
            } else {
                if (errorEl) {
                    errorEl.innerText = data.error || 'Invalid credentials';
                    errorEl.classList.remove('hidden');
                }
            }
        } catch (err) {
            if (errorEl) {
                errorEl.innerText = 'Login request failed';
                errorEl.classList.remove('hidden');
            }
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPass').value;
        const errorEl = document.getElementById('regError');

        if (errorEl) errorEl.classList.add('hidden');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (data.success) {
                state.currentUser = data.user;
                localStorage.setItem('rc_session_user', JSON.stringify(state.currentUser));
                state.cart = await API.getCart(state.currentUser.email);
                cartUI.updateCartUI();
                this.updateAuthNavState();
                this.closeAuthModal();
                showToast(`Account created successfully! Welcome ${name}`);
            } else {
                if (errorEl) {
                    errorEl.innerText = data.error || 'Registration failed';
                    errorEl.classList.remove('hidden');
                }
            }
        } catch (err) {
            if (errorEl) {
                errorEl.innerText = 'Registration request failed';
                errorEl.classList.remove('hidden');
            }
        }
    },

    logout() {
        state.currentUser = null;
        localStorage.removeItem('rc_session_user');
        state.cart = JSON.parse(localStorage.getItem('rc_guest_cart') || '[]');
        cartUI.updateCartUI();
        this.updateAuthNavState();
        showToast('Signed out successfully');
    },

    updateAuthNavState() {
        const label = document.getElementById('navAuthLabel');
        const ordersBtn = document.getElementById('navOrdersBtn');

        if (state.currentUser) {
            if (label) label.innerText = state.currentUser.name;
            if (ordersBtn) ordersBtn.classList.remove('hidden');
        } else {
            if (label) label.innerText = 'Sign In / Register';
            if (ordersBtn) ordersBtn.classList.add('hidden');
        }
        app.updateActiveOrdersBadge();
    }
};

window.onload = () => {
    app.init();
};