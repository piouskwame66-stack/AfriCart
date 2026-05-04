const CartService = {
    cart: [],
    init() {
        // Redundant internally, kept for manual forces
        this.updateCartBadge();
    },
    save() {
        localStorage.setItem('africart_cart', JSON.stringify(this.cart));
        this.updateCartBadge();
    },
    addItem(product, quantity = 1) {
        const existing = this.cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += parseInt(quantity, 10);
        } else {
            this.cart.push({ ...product, quantity: parseInt(quantity, 10) });
        }
        this.save();
    },
    removeItem(productId) {
        this.cart = this.cart.filter(item => item.id != productId);
        this.save();
    },
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id == productId);
        if (item) {
            item.quantity = Math.max(1, parseInt(quantity, 10));
            this.save();
        }
    },
    clear() {
        this.cart = [];
        this.save();
    },
    getTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    updateCartBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        const count = this.cart.length; // Count unique products
        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        });
    }
};

if (typeof window !== 'undefined') {
    window.CartService = CartService;
    
    // Load data from LocalStorage synchronously
    const storedCart = localStorage.getItem('africart_cart');
    if (storedCart) {
        CartService.cart = JSON.parse(storedCart);
    }

    // Attach badge logic to when the DOM structure is finally painted
    window.addEventListener('DOMContentLoaded', () => {
        CartService.updateCartBadge();
    });

    window.initCartPage = function() {
        const tbody = document.getElementById('cart-tbody');
        if (!tbody) return;

        const cart = window.CartService.cart;
        if (cart.length === 0) {
            tbody.innerHTML = '<div style="text-align:center;padding:60px 20px; color:#555;">Your cart is empty. <br><a href="product.html" style="color:#ea580c; text-decoration:none; font-weight:600; display:inline-block; margin-top:15px;">&larr; Start shopping</a></div>';
            updateSummary(0);
            return;
        }

        tbody.innerHTML = cart.map(item => `
            <div class="cart-item-card-row">
                <div class="cart-item-card-left">
                    <div style="width:105px; height:105px; border:1px solid #f0f0f0; border-radius:4px; padding:10px; display:flex; align-items:center; justify-content:center; background:#fff;">
                        <img src="${item.images[0]}" alt="${item.title}" style="max-width:100%; max-height:100%; object-fit:contain;">
                    </div>
                    <div style="padding-top:5px;">
                        <div style="font-size:12px; font-weight:700; color:#111; margin-bottom:4px;">${item.title}</div>
                        <div style="font-size:10px; color:#999; margin-bottom:8px; text-transform:uppercase;">${item.category}</div>
                        <div style="font-size:10px; color:#999; margin-bottom:12px;">Color : <span style="font-weight:700; color:#333;">Standard</span></div>
                        <div style="font-size:14px; font-weight:700; color:#111;">GH₵ ${item.price.toFixed(2)}</div>
                    </div>
                </div>
                <div class="cart-item-card-right">
                    <!-- Quantities box -->
                    <div style="display:flex; align-items:center; border:1px solid #e0e0e0; border-radius:2px; overflow:hidden;">
                        <button onclick="window.CartService.updateQuantity('${item.id}', ${item.quantity - 1}); window.initCartPage();" style="width:28px; height:28px; background:#111; color:#fff; border:none; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">-</button>
                        <span style="width:36px; text-align:center; font-size:12px; font-weight:600; color:#333;">${item.quantity}</span>
                        <button onclick="window.CartService.updateQuantity('${item.id}', ${item.quantity + 1}); window.initCartPage();" style="width:28px; height:28px; background:#111; color:#fff; border:none; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
                    </div>
                    
                    <!-- Remove button -->
                    <button onclick="window.CartService.removeItem('${item.id}'); window.initCartPage();" style="background:transparent; border:none; font-size:11px; color:#999; cursor:pointer; display:flex; align-items:center; gap:5px;" onmouseover="this.style.color='#ef4444';" onmouseout="this.style.color='#999';">
                        <span style="font-size:12px; font-weight:300;">✕</span> Remove
                    </button>
                </div>
            </div>
        `).join('');

        const subtotal = window.CartService.getTotal();
        updateSummary(subtotal);
        
        const countTitle = document.getElementById('cart-count-title');
        if (countTitle) countTitle.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

        const summaryCount = document.getElementById('summary-count');
        if (summaryCount) summaryCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    function updateSummary(subtotal) {
        let shipping = 0;
        
        if (subtotal > 0) {
            const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked');
            if (deliveryMethod && deliveryMethod.value === 'delivery') {
                shipping = 15.00;
            }
        }
        
        const total = subtotal + shipping;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = `GH₵ ${val.toFixed(2)}`;
        };

        set('summary-subtotal', subtotal);
        set('summary-total', total);
    }
}
