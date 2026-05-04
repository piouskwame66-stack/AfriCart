/**
 * Orders Service - Handles checkout, order placement, and history rendering
 */

window.initOrdersPage = function() {
    console.log('[Orders] Initializing orders page...');
    const isProfilePage = window.location.pathname.includes('profile.html');
    const session = window.SupabaseService ? window.SupabaseService.getSession() : null;
    
    if (!session) {
        sessionStorage.setItem('auth_redirect', isProfilePage ? 'profile.html?section=orders' : 'profile.html?section=orders');
        if (window.showAuthModal) window.showAuthModal('signin');
        return;
    }

    const { user } = session;
    const metadata = user.user_metadata || {};

    const uiMap = {
        'mobile-display-name': user.name || 'AfriCart User',
        'desktop-display-name': user.name || 'AfriCart User',
        'mobile-display-email': user.email,
        'desktop-display-email': user.email
    };

    Object.keys(uiMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = uiMap[id];
    });

    const avatarUrl = metadata.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80';
    const elAvMobile = document.getElementById('mobile-avatar');
    if(elAvMobile) elAvMobile.style.backgroundImage = `url('${avatarUrl}')`;
    const elAvDesk = document.getElementById('desktop-avatar');
    if(elAvDesk) elAvDesk.src = avatarUrl;

    const container = document.getElementById('orders-container');
    const mobileContainer = document.getElementById('orders-container-mobile');
    console.log('[Orders] Containers found:', { container: !!container, mobileContainer: !!mobileContainer });

    const renderEmptyOrders = (message) => {
        const emptyHtml = `
            <div style="text-align:center; padding:60px 20px; color:var(--grey);">
                <h3 style="color:var(--black); margin-bottom:10px;">${message}</h3>
                <p style="margin-bottom:25px;">You haven't placed any orders yet.</p>
                <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                    <a href="product.html" class="btn btn-black" style="display:inline-block; padding:12px 30px; text-decoration:none;">Start Shopping</a>
                    ${window.handleAuthClick ? '<button onclick="window.handleAuthClick(event)" class="btn btn-outline" style="padding:12px 30px; font-size:13px;">Sign In</button>' : ''}
                </div>
            </div>
        `;
        if (container) container.innerHTML = emptyHtml;
        if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
    };

    const clearOrderContainers = () => {
        if (container) container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';
    };

    let activeOrders = [];
    window.showOrderDetails = function(targetId) {
        const order = activeOrders.find(o => (o.id || o.order_id || o.orderId) === targetId);
        if (!order) return;

        const modal = document.getElementById('order-details-modal');
        const inner = document.getElementById('order-details-inner');
        if (!modal || !inner) return;

        inner.innerHTML = `
            <div style="text-align:center; margin-bottom:30px;">
                <p style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:var(--grey); margin-bottom:5px;">Order Receipt</p>
                <h2 style="margin:0; color:var(--black); font-size:24px;">#${(order.id || order.order_id || order.orderId || '').toString().toUpperCase()}</h2>
                <p style="font-size:13px; color:var(--grey); margin-top:5px;">${new Date(order.created_at || order.date || Date.now()).toLocaleString()}</p>
            </div>
            <div style="margin-bottom:20px;">
                ${(order.items || []).map(item => `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <div style="display:flex; gap:12px; align-items:center;">
                            <div style="width:52px; height:52px; background:#f9f9f9; border-radius:10px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                <img src="${(item.images && item.images[0]) || item.image || 'assets/images/default.jpg'}" alt="${item.title}" style="max-width:100%; max-height:100%; object-fit:contain;">
                            </div>
                            <div>
                                <div style="font-size:14px; font-weight:600; color:#111;">${item.title}</div>
                                <div style="font-size:12px; color:#6b7280;">Qty: ${item.quantity}</div>
                            </div>
                        </div>
                        <div style="font-weight:700; color:#111;">GH₵ ${(item.quantity * item.price).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
            <div style="background:#fafafa; padding:20px; border-radius:12px; border:1px solid #ececec;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color:#6b7280;">
                    <span>Subtotal</span>
                    <span>GH₵ ${Number(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color:#6b7280;">
                    <span>Delivery</span>
                    <span>GH₵ ${Number(order.shipping || 0).toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:700; color:#111; border-top:1px solid #e5e7eb; padding-top:12px;">
                    <span>Total</span>
                    <span>GH₵ ${Number(order.total || 0).toFixed(2)}</span>
                </div>
            </div>
        `;
        modal.classList.add('active');
    };

    const clearTimestamp = parseInt(localStorage.getItem('africart_cleared_at') || '0');
    const localOrders = JSON.parse(localStorage.getItem('africart_orders') || '[]')
        .filter(o => o.userEmail === (session?.user?.email || ''))
        .filter(o => {
            if (clearTimestamp <= 0) return true;
            const orderTime = new Date(o.created_at || o.date).getTime();
            return orderTime >= clearTimestamp;
        });

    const renderOrdersFromData = (orders, source) => {
        activeOrders = orders;
        console.log('[Orders] Rendering', orders.length, 'orders from', source);
        const renderOrdersList = (target) => {
            if (!target) return;
            target.innerHTML = orders.map(order => {
                const firstItem = (order.items && order.items.length > 0) ? order.items[0] : null;
                const imgUrl = firstItem ? (firstItem.images && firstItem.images.length > 0 ? firstItem.images[0] : firstItem.image) : 'assets/images/default.jpg';
                const firstItemTitle = firstItem ? firstItem.title : `Order #${(order.id || order.order_id || order.orderId || '').slice(-8).toUpperCase()}`;
                const d = new Date(order.created_at || order.date || Date.now());
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const deliverDateStr = `${monthNames[d.getMonth()]} ${d.getDate()}`;
                const fullDateStr = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                const orderTotal = order.total || order.amount || 0;
                const orderRef = (order.id || order.order_id || order.orderId || 'ORDER').toString();

                if (target === document.getElementById('orders-container-mobile')) {
                    return `
                    <div style="border: 1px solid #eaebec; border-radius: 12px; margin-bottom: 20px; overflow: hidden; font-family: 'Inter', sans-serif;">
                        <div style="background: #fdfdfd; padding: 15px; border-bottom: 1px solid #eaebec;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <div style="font-size:13px; color:#6b7280;">Order <span style="font-weight:700; color:#111;">#${orderRef.replace('AF','').slice(-8).toUpperCase()}</span></div>
                                <div style="font-size:13px; font-weight:600;">GH₵ ${Number(orderTotal).toFixed(2)}</div>
                            </div>
                            <div style="font-size:12px; color:#6b7280; display:flex; justify-content:space-between;">
                                <span>${fullDateStr}</span>
                                <span style="text-align:right; max-width:50%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${order.shippingAddress || order.shipping_address || 'Accra'}</span>
                            </div>
                        </div>
                        <div style="padding: 15px; background: #ffffff;">
                            <h4 style="font-size: 15px; font-weight: 700; color: #111; margin-top: 0; margin-bottom: 15px;">Delivered ${deliverDateStr}</h4>
                            <div style="display: flex; gap: 15px;">
                                <div style="width: 80px; height: 80px; flex-shrink: 0; background: #f9f9f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 5px;">
                                    <img src="${imgUrl}" alt="${firstItemTitle}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; font-weight: 600; color: #111; margin-bottom: 5px; line-height: 1.3;">${firstItemTitle}</div>
                                    <div style="font-size: 11px; color: #9ca3af; margin-bottom: 10px;">Eligible through ${deliverDateStr}</div>
                                </div>
                            </div>
                            <div style="margin-top: 20px; display:flex; gap: 10px;">
                                <button onclick="window.showOrderDetails('${orderRef}')" style="flex: 1; background: var(--black, #000); color: #fff; border: 1px solid var(--black, #000); padding: 8px; border-radius: 6px; font-size: 13px; font-weight: 600;">View Order</button>
                            </div>
                        </div>
                    </div>
                    `;
                }

                return `
                <div style="border: 1px solid #eaebec; border-radius: 12px; margin-bottom: 25px; overflow: hidden; font-family: 'Inter', sans-serif;">
                    <div style="background: #fdfdfd; padding: 15px 25px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #eaebec;">
                        <div style="display: flex; gap: 40px; font-size: 13px;">
                            <div>
                                <div style="color: #6b7280; font-weight: 500; margin-bottom: 6px;">Order Date :</div>
                                <div style="color: #111827; font-weight: 600;">${fullDateStr}</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-weight: 500; margin-bottom: 6px;">Total Amount :</div>
                                <div style="color: #111827; font-weight: 600;">GH₵ ${Number(orderTotal).toFixed(2)}</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-weight: 500; margin-bottom: 6px;">Ship To :</div>
                                <div style="color: #111827; font-weight: 600;">${order.shippingAddress || order.shipping_address || 'Accra, Ghana'}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 12px;">Order : <span style="color: #111827; font-weight: 700;">#${orderRef.replace('AF','').slice(-11).toUpperCase()}</span></div>
                            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                <button onclick="window.showOrderDetails('${orderRef}')" style="background: var(--black, #000); border: 1px solid var(--black, #000); color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600; transition:all 0.2s;" onmouseover="this.style.backgroundColor='#333';" onmouseout="this.style.backgroundColor='var(--black)';">View Order</button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        };

        renderOrdersList(container);
        renderOrdersList(mobileContainer);
    };

    const localOnlyOrders = () => {
        if (localOrders.length > 0) {
            renderOrdersFromData(localOrders, 'local');
        } else {
            renderEmptyOrders('No orders found');
        }
    };

    window.SupabaseService.fetchOrders().then(({ data, error }) => {
        console.log('[Orders] fetchOrders result:', { data: data?.length || 0, error });
        let userOrders = data || [];

        if (error) {
            console.warn('[Orders] fetchOrders error, falling back to local orders', error);
            clearOrderContainers();
            localOnlyOrders();
            return;
        }

        if (clearTimestamp > 0) {
            userOrders = userOrders.filter(order => {
                const orderTime = new Date(order.created_at).getTime();
                return orderTime >= clearTimestamp;
            });
        }

        userOrders = [...userOrders, ...localOrders];
        console.log('[Orders] After filtering:', { userOrdersCount: userOrders.length });

        if (userOrders.length === 0) {
            clearOrderContainers();
            renderEmptyOrders('No orders found');
            return;
        }

        clearOrderContainers();
        renderOrdersFromData(userOrders, 'server+local');
    }).catch(err => {
        console.error('[Orders] fetchOrders failed:', err);
        clearOrderContainers();
        localOnlyOrders();
    });
};

window.initCheckoutPage = function() {
    const session = window.SupabaseService ? window.SupabaseService.getSession() : null;
    if (!session) {
        sessionStorage.setItem('auth_redirect', 'checkout.html');
        if (window.showAuthModal) window.showAuthModal('signin');
        return;
    }

    if (!window.CartService || window.CartService.cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    // Prefill form
    const setters = {
        'ship-first': session.user.name ? session.user.name.split(' ')[0] : '',
        'ship-last': session.user.name ? session.user.name.split(' ').slice(1).join(' ') : '',
        'ship-address': session.user.address || '',
        'ship-phone': session.user.phone || ''
    };

    Object.keys(setters).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = setters[id];
    });

    // Render Summary
    const list = document.getElementById('checkout-items-list');
    const cart = window.CartService.cart;
    
    if (list) {
        list.innerHTML = cart.map(item => `
            <div class="order-summary-item">
                <img src="${item.images[0]}" alt="${item.title}">
                <div style="flex:1;">
                    <h4 style="font-size:14px; margin-bottom:4px;">${item.title}</h4>
                    <div style="font-size:12px; color:var(--grey);">Qty: ${item.quantity} × GH₵ ${item.price.toFixed(2)}</div>
                </div>
                <div style="font-weight:600; font-size:14px;">GH₵ ${(item.quantity * item.price).toFixed(2)}</div>
            </div>
        `).join('');
    }

    const subtotal = window.CartService.getTotal();
    updateCheckoutTotals(subtotal);

    const shippingCards = document.querySelectorAll('#shipping-methods .shipping-card');
    shippingCards.forEach(card => {
        card.addEventListener('click', () => {
            shippingCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            updateCheckoutTotals(subtotal);
        });
    });

    // Payment method card selection
    const paymentCards = document.querySelectorAll('#payment-methods .payment-card');
    paymentCards.forEach(card => {
        card.addEventListener('click', () => {
            paymentCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
};

function updateCheckoutTotals(subtotal) {
    const activeShippingCard = document.querySelector('#shipping-methods .shipping-card.active');
    const shipping = activeShippingCard ? parseInt(activeShippingCard.dataset.shipping, 10) : 15.00;
    const total = subtotal + shipping;

    const shipEl = document.getElementById('check-shipping');
    if (shipEl) shipEl.textContent = `GH₵ ${shipping.toFixed(2)}`;
    
    const totEl = document.getElementById('check-total');
    if (totEl) totEl.textContent = `GH₵ ${total.toFixed(2)}`;

    const subEl = document.getElementById('check-subtotal');
    if (subEl) subEl.textContent = `GH₵ ${subtotal.toFixed(2)}`;
}

window.handlePlaceOrder = function(e) {
    if (e) e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Processing Order...';
    }

    const session = window.SupabaseService.getSession();
    const subtotal = window.CartService.getTotal();
    const activeShippingCard = document.querySelector('#shipping-methods .shipping-card.active');
    const shipping = activeShippingCard ? parseInt(activeShippingCard.dataset.shipping, 10) : 15.00;
    const total = subtotal + shipping; 
    
    const orderId = 'AF' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
        orderId: orderId,
        userEmail: session.user.email,
        date: new Date().toISOString(),
        items: [...window.CartService.cart],
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        shippingAddress: document.getElementById('ship-address').value
    };

    window.SupabaseService.saveOrder(newOrder).then(({ error }) => {
        if (!error) {
            let history = JSON.parse(localStorage.getItem('africart_orders') || '[]');
            history.unshift(newOrder); 
            localStorage.setItem('africart_orders', JSON.stringify(history));

            document.getElementById('order-hash').textContent = `#${orderId}`;
            const modal = document.getElementById('order-success-modal');
            if (modal) modal.classList.add('active');

            window.CartService.clear();

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Order Placed!';
            }
        } else {
            showToast('Order failed: ' + error.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Try Again';
            }
        }
    });
};

window.showClearHistoryModal = function() {
    const modal = document.getElementById('clear-history-modal');
    if (modal) modal.classList.add('active');
};

window.clearOrderHistory = async function() {
    localStorage.removeItem('africart_orders');
    
    // Store timestamp to filter out older orders
    localStorage.setItem('africart_cleared_at', Date.now().toString());
    
    const btn = document.querySelector('.confirm-clear-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> Clearing...';
    }

    // Also clear from server
    try {
        if (window.SupabaseService && window.SupabaseService.deleteUserOrders) {
            await window.SupabaseService.deleteUserOrders();
        }
    } catch (e) {
        console.error('Delete error:', e);
    }
    
    const modal = document.getElementById('clear-history-modal');
    if (modal) modal.classList.remove('active');
    
    // Clear DOM
    const container = document.getElementById('orders-container');
    const mobileContainer = document.getElementById('orders-container-mobile');
    const emptyHtml = `
        <div style="text-align:center; padding:60px 20px; color:var(--grey);">
            <h3 style="color:var(--black); margin-bottom:10px;">No orders found</h3>
            <p style="margin-bottom:25px;">You haven't placed any orders yet.</p>
            <a href="product.html" class="btn btn-black" style="display:inline-block; padding:12px 30px; text-decoration:none;">Start Shopping</a>
        </div>
    `;
    if (container) container.innerHTML = emptyHtml;
    if (mobileContainer) mobileContainer.innerHTML = emptyHtml;

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Yes, Clear';
    }

    if (window.showToast) window.showToast('Order history cleared');
};
