/**
 * UI Service - Handles shared UI components and utility functions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Shared UI initialization can go here if needed
});

window.initSlider = function() {
    const slider = document.getElementById('hero-slider');
    if (!slider) return;

    let currentSlide = 0;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const totalSlides = slides.length;

    window.goToSlide = function(index) {
        currentSlide = index;
        showSlide(currentSlide);
    };

    function showSlide(index) {
        // Shift the slider track horizontally
        slider.style.transform = `translateX(-${index * (100 / totalSlides)}%)`;
        
        // Update dots
        dots.forEach(d => d.classList.remove('active'));
        if (dots[index]) {
            dots[index].classList.add('active');
        }
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }

    // Auto-advance
    window.heroSliderInterval = setInterval(nextSlide, 5000);
    showSlide(0);
};

window.initMobileMenu = function() {
    const btn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-menu-close');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (btn && overlay) {
        btn.addEventListener('click', () => overlay.classList.add('active'));
    }
    if (closeBtn && overlay) {
        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
    }
    
    // Close overlay on link click
    const navLinks = overlay ? overlay.querySelectorAll('nav a') : [];
    navLinks.forEach(link => {
        link.addEventListener('click', () => overlay.classList.remove('active'));
    });
};

window.toggleMobileFilters = function() {
    const sidebar = document.querySelector('.shop-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        
        // Change button text or state if needed
        const btn = document.getElementById('filter-toggle-btn');
        if (btn) {
            btn.classList.toggle('active');
        }
    }
};

window.renderStars = function(rating) {
    const fullStars = Math.floor(rating);
    let starsHtml = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHtml += '<span class="star active" style="color: #666666;">★</span>';
        } else {
            starsHtml += '<span class="star" style="color: #dddddd;">★</span>';
        }
    }
    return starsHtml;
};

window.showToast = function(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

let popupTimer;
window.showCustomCartPopup = function(imgUrl, title) {
    let popup = document.getElementById('cart-auth-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'cart-auth-popup';
        popup.className = 'cart-popup';
        document.body.appendChild(popup);
    }
    popup.innerHTML = `
        <div class="cart-popup-inner">
            <div style="color:var(--primary-color); font-weight: 600; font-size:14px; text-align:left;">Success!</div>
            <div class="cart-popup-header">
                <img src="${imgUrl}" alt="item">
                <p style="text-align:left; line-height:1.4;"><strong>${title}</strong> has been added to your cart.</p>
            </div>
            <div class="cart-popup-actions">
                <button class="btn btn-outline" onclick="document.getElementById('cart-auth-popup').classList.remove('show')" style="padding:10px;">Continue</button>
                <button class="btn btn-black" onclick="window.location.href='cart.html'" style="padding:10px;">Checkout</button>
            </div>
        </div>
    `;
    
    clearTimeout(popupTimer);
    setTimeout(() => popup.classList.add('show'), 10);
    popupTimer = setTimeout(() => {
        popup.classList.remove('show');
    }, 6000);
};

window.showSignOutModal = function() {
    let modal = document.getElementById('signout-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'signout-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:var(--primary-color); margin-bottom:15px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <h3>Sign Out</h3>
                <p>Are you sure you want to sign out of your account?</p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('signout-modal').classList.remove('active')" style="flex:1;">Cancel</button>
                    <button class="btn btn-black" onclick="window.SupabaseService.signOut().then(() => window.location.href='index.html')" style="flex:1;">Sign Out</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    setTimeout(() => modal.classList.add('active'), 10);
};

window.updateAuthUI = function() {
    const session = window.SupabaseService ? window.SupabaseService.getSession() : null;
    const profileIcons = document.querySelectorAll('#nav-user-profile');
    const mobileUserContainer = document.getElementById('mobile-menu-user');

    if (session) {
        let initials = session.user.email.charAt(0).toUpperCase();
        const userName = session.user.name || session.user.email;
        if (session.user.name) {
            let parts = session.user.name.split(' ');
            if (parts.length > 1) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else {
                initials = parts[0].substring(0, 2).toUpperCase();
            }
        }

        // Desktop Display
        const avatarUrl = session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80';
        
        profileIcons.forEach(btn => {
            btn.outerHTML = `
                <div class="user-avatar-wrapper">
                    <img id="desktop-avatar" class="user-avatar" src="${avatarUrl}" style="object-fit: cover;">
                    <div class="user-dropdown-menu">
                        <div style="padding:10px 20px; font-size:12px; color:var(--grey); cursor:default;">
                            Signed in as<br><span style="color:var(--black);font-weight:600;font-size:14px;">${userName}</span>
                        </div>
                        <hr>
                        <a href="profile.html">My Account</a>
                        <a href="javascript:void(0)" onclick="window.showSignOutModal(); return false;">Sign Out</a>
                    </div>
                </div>
            `;
        });

        // Mobile Sidebar Display
        if (mobileUserContainer) {
            mobileUserContainer.innerHTML = `
                <div class="mobile-menu-user-header">
                    <img class="mobile-menu-user-avatar" src="${avatarUrl}" style="object-fit: cover;">
                    <div class="mobile-menu-user-info">
                        <span>Logged in as</span>
                        <p>${userName}</p>
                    </div>
                </div>
            `;
        }
    } else {
        // Reset Mobile Sidebar if logged out
        if (mobileUserContainer) {
            mobileUserContainer.innerHTML = `
                <div class="mobile-menu-user-header" style="background:#f7f7f7; color:var(--black);">
                    <div class="mobile-menu-user-avatar" style="background:#eee; color:#aaa;">?</div>
                    <div class="mobile-menu-user-info">
                        <span>Welcome to AfriCart</span>
                        <p onclick="window.showAuthModal()" style="color:var(--primary-color); cursor:pointer;">Sign In / Register</p>
                    </div>
                </div>
            `;
        }
    }
};

// ─────────────────────────────────────────────
// Auth Modal — Sign In / Sign Up popup
// ─────────────────────────────────────────────
window.showAuthModal = function(defaultTab) {
    let modal = document.getElementById('auth-modal');
    if (modal) {
        // Reset display + re-animate
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        const box = document.getElementById('auth-modal-box');
        if (box) box.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            if (box) box.style.transform = 'translateY(0)';
        });
        if (defaultTab) _switchAuthTab(defaultTab);
        return;
    }

    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = [
        'position:fixed','inset:0','z-index:99999',
        'background:rgba(0,0,0,0.55)',
        'display:flex','align-items:center','justify-content:center',
        'opacity:0','transition:opacity 0.25s',
        'padding:20px'
    ].join(';');

    modal.innerHTML = `
    <div id="auth-modal-box" style="
        background:#fff; border-radius:12px; width:100%; max-width:420px;
        box-shadow:0 24px 60px rgba(0,0,0,0.18); overflow:hidden;
        transform:translateY(20px); transition:transform 0.25s;
        font-family:'Poppins',sans-serif;
    ">
        <!-- Header -->
        <div style="background:#111; padding:28px 30px 0; position:relative;">
            <button onclick="window.hideAuthModal()" style="
                position:absolute; top:14px; right:16px;
                background:none; border:none; color:#fff; font-size:22px;
                cursor:pointer; line-height:1; opacity:0.6;
            " aria-label="Close">&times;</button>
            <div style="text-align:center; padding-bottom:20px;">
                <div style="font-size:22px; font-weight:700; color:#fff; margin-bottom:4px;">Welcome to AfriCart</div>
                <div style="font-size:12px; color:#aaa;">Sign in to your account or create a new one</div>
            </div>
            <!-- Tabs -->
            <div style="display:flex; gap:0;">
                <button id="auth-tab-signin" onclick="_switchAuthTab('signin')" style="
                    flex:1; padding:11px; border:none; background:transparent; color:#fff;
                    font-size:13px; font-weight:600; cursor:pointer; border-bottom:3px solid #ea580c;
                    transition:all 0.2s;
                ">Sign In</button>
                <button id="auth-tab-signup" onclick="_switchAuthTab('signup')" style="
                    flex:1; padding:11px; border:none; background:transparent; color:#888;
                    font-size:13px; font-weight:600; cursor:pointer; border-bottom:3px solid transparent;
                    transition:all 0.2s;
                ">Create Account</button>
            </div>
        </div>

        <!-- Body -->
        <div style="padding:28px 30px;">

            <!-- Sign In Form -->
            <form id="auth-signin-form" onsubmit="_handleSignIn(event)" style="display:block;">
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Email Address</label>
                    <input id="auth-email" type="email" placeholder="you@example.com" required autocomplete="email" style="
                        width:100%; padding:11px 14px; border:1px solid #e0e0e0; border-radius:6px;
                        font-size:13px; color:#111; outline:none; box-sizing:border-box;
                        transition:border-color 0.2s; background:#fafafa;
                    " onfocus="this.style.borderColor='#ea580c'" onblur="this.style.borderColor='#e0e0e0'">
                </div>
                <div style="margin-bottom:8px;">
                    <label style="display:block; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Password</label>
                    <input id="auth-password" type="password" placeholder="Enter your password" required autocomplete="current-password" style="
                        width:100%; padding:11px 14px; border:1px solid #e0e0e0; border-radius:6px;
                        font-size:13px; color:#111; outline:none; box-sizing:border-box;
                        transition:border-color 0.2s; background:#fafafa;
                    " onfocus="this.style.borderColor='#ea580c'" onblur="this.style.borderColor='#e0e0e0'">
                </div>
                <div id="auth-signin-error" style="font-size:12px; color:#e74c3c; min-height:18px; margin-bottom:10px;"></div>
                <button type="submit" id="auth-signin-btn" style="
                    width:100%; padding:13px; background:#ea580c; color:#fff; border:none;
                    border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;
                    text-transform:uppercase; letter-spacing:0.5px; display:flex;
                    align-items:center; justify-content:center; gap:8px;
                    transition:background 0.2s;
                ">Sign In</button>
                <p style="text-align:center; font-size:12px; color:#777; margin-top:18px; margin-bottom:0;">
                    Don't have an account? 
                    <a href="#" onclick="_switchAuthTab('signup'); return false;" style="color:#ea580c; font-weight:600; text-decoration:none;">Create one &rarr;</a>
                </p>
            </form>

            <!-- Sign Up Form -->
            <form id="auth-signup-form" onsubmit="_handleSignUp(event)" style="display:none;">
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Full Name</label>
                    <input id="auth-name" type="text" placeholder="Kwame Mensah" required autocomplete="name" style="
                        width:100%; padding:11px 14px; border:1px solid #e0e0e0; border-radius:6px;
                        font-size:13px; color:#111; outline:none; box-sizing:border-box;
                        transition:border-color 0.2s; background:#fafafa;
                    " onfocus="this.style.borderColor='#ea580c'" onblur="this.style.borderColor='#e0e0e0'">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Email Address</label>
                    <input id="auth-reg-email" type="email" placeholder="you@example.com" required autocomplete="email" style="
                        width:100%; padding:11px 14px; border:1px solid #e0e0e0; border-radius:6px;
                        font-size:13px; color:#111; outline:none; box-sizing:border-box;
                        transition:border-color 0.2s; background:#fafafa;
                    " onfocus="this.style.borderColor='#ea580c'" onblur="this.style.borderColor='#e0e0e0'">
                </div>
                <div style="margin-bottom:8px;">
                    <label style="display:block; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Password</label>
                    <input id="auth-reg-password" type="password" placeholder="At least 8 characters" required autocomplete="new-password" minlength="8" style="
                        width:100%; padding:11px 14px; border:1px solid #e0e0e0; border-radius:6px;
                        font-size:13px; color:#111; outline:none; box-sizing:border-box;
                        transition:border-color 0.2s; background:#fafafa;
                    " onfocus="this.style.borderColor='#ea580c'" onblur="this.style.borderColor='#e0e0e0'">
                </div>
                <div id="auth-signup-error" style="font-size:12px; color:#e74c3c; min-height:18px; margin-bottom:10px;"></div>
                <div id="auth-signup-success" style="font-size:12px; color:#22c55e; min-height:18px; margin-bottom:10px; display:none;"></div>
                <button type="submit" id="auth-signup-btn" style="
                    width:100%; padding:13px; background:#111; color:#fff; border:none;
                    border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;
                    text-transform:uppercase; letter-spacing:0.5px; display:flex;
                    align-items:center; justify-content:center; gap:8px;
                    transition:background 0.2s;
                ">Create Account</button>
                <p style="text-align:center; font-size:12px; color:#777; margin-top:18px; margin-bottom:0;">
                    Already have an account? 
                    <a href="#" onclick="_switchAuthTab('signin'); return false;" style="color:#ea580c; font-weight:600; text-decoration:none;">Sign in &rarr;</a>
                </p>
            </form>

        </div>
    </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) window.hideAuthModal();
    });

    // Animate in
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        const box = document.getElementById('auth-modal-box');
        if (box) box.style.transform = 'translateY(0)';
    });

    if (defaultTab) _switchAuthTab(defaultTab);
};

window.hideAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.style.opacity = '0';
    const box = document.getElementById('auth-modal-box');
    if (box) box.style.transform = 'translateY(20px)';
    setTimeout(() => modal.classList.remove('active'), 250);
    // Actually hide it properly
    setTimeout(() => { if (modal) modal.style.display = 'none'; }, 250);
};

function _switchAuthTab(tab) {
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');
    if (!signinForm || !signupForm) return;

    if (tab === 'signup') {
        signinForm.style.display = 'none';
        signupForm.style.display = 'block';
        if (tabSignin) { tabSignin.style.borderBottomColor = 'transparent'; tabSignin.style.color = '#888'; }
        if (tabSignup) { tabSignup.style.borderBottomColor = '#ea580c'; tabSignup.style.color = '#fff'; }
    } else {
        signinForm.style.display = 'block';
        signupForm.style.display = 'none';
        if (tabSignin) { tabSignin.style.borderBottomColor = '#ea580c'; tabSignin.style.color = '#fff'; }
        if (tabSignup) { tabSignup.style.borderBottomColor = 'transparent'; tabSignup.style.color = '#888'; }
    }
}

async function _handleSignIn(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-signin-btn');
    const errEl = document.getElementById('auth-signin-error');
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (btn) { btn.disabled = true; btn.innerHTML = '<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block;"></span> Signing in...'; }
    if (errEl) errEl.textContent = '';

    const { data, error } = await window.SupabaseService.signIn(email, password);

    if (error) {
        if (errEl) errEl.textContent = error.message || 'Invalid email or password.';
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        return;
    }

    if (window.showToast) window.showToast('✅ Signed in successfully!');
    window.hideAuthModal();
    setTimeout(() => {
        if (window.updateAuthUI) window.updateAuthUI();
        // If on a protected page redirect was pending, go there. Otherwise reload.
        const redirect = sessionStorage.getItem('auth_redirect');
        if (redirect) { sessionStorage.removeItem('auth_redirect'); window.location.href = redirect; }
        else { window.location.reload(); }
    }, 400);
}

async function _handleSignUp(e) {
    e.preventDefault();
    const btn = document.getElementById('auth-signup-btn');
    const errEl = document.getElementById('auth-signup-error');
    const successEl = document.getElementById('auth-signup-success');
    const email = document.getElementById('auth-reg-email').value.trim();
    const password = document.getElementById('auth-reg-password').value;
    const name = document.getElementById('auth-name').value.trim();

    if (btn) { btn.disabled = true; btn.innerHTML = '<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block;"></span> Creating account...'; }
    if (errEl) errEl.textContent = '';
    if (successEl) { successEl.style.display = 'none'; successEl.textContent = ''; }

    const { data, error } = await window.SupabaseService.signUp(email, password, name);

    if (error) {
        if (errEl) errEl.textContent = error.message || 'Registration failed. Please try again.';
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
        return;
    }

    if (successEl) {
        successEl.style.display = 'block';
        successEl.textContent = '✅ Account created! Check your email to confirm, then sign in.';
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    // Auto-switch to sign-in tab after 2s
    setTimeout(() => _switchAuthTab('signin'), 2500);
}
