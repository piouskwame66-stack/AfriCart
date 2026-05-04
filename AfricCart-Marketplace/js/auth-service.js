/**
 * Auth Service - Handles user session, profile management, and auth page interactions
 */

window.handleAuthClick = function(e) {
    if (e) e.preventDefault();
    if (window.SupabaseService && window.SupabaseService.getSession()) {
        window.location.href = 'profile.html';
    } else {
        if (window.showAuthModal) window.showAuthModal('signin');
    }
};

/**
 * Initializes the profile page, sets up UI handlers, and loads the user session.
 * Connects to Supabase to fetch metadata like user avatars and addresses.
 */
function initProfilePage() {
    const session = window.SupabaseService ? window.SupabaseService.getSession() : null;
    if (!session) {
        // Save intended destination then show sign-in modal
        sessionStorage.setItem('auth_redirect', 'profile.html');
        if (window.showAuthModal) window.showAuthModal('signin');
        return;
    }
    
    const user = session.user;
    const metadata = user.user_metadata || {};
    
    // UI Helpers
    const isMobile = window.innerWidth <= 900;
    const mainContent = document.getElementById('desktop-main-content');
    const mobileContent = document.getElementById('mobile-sub-content');
    const mobileRoot = document.getElementById('mobile-menu-main');
    const mobileSubWrapper = document.getElementById('mobile-sub-page');

    window.showProfileSection = function(sectionId) {
        // Update URL state so page refreshes maintain the active tab
        const url = new URL(window.location);
        if (sectionId === 'main') {
            url.searchParams.delete('section');
        } else {
            url.searchParams.set('section', sectionId);
        }
        window.history.replaceState({}, '', url);

        if (sectionId === 'main') {
            if (mobileRoot) mobileRoot.style.display = 'block';
            if (mobileSubWrapper) mobileSubWrapper.style.display = 'none';
            return;
        }

        const templateId = 'temp-' + sectionId;
        const template = document.getElementById(templateId);
        if (!template) return;

        const content = template.innerHTML;
        const sectionTitle = sectionId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

        if (isMobile) {
            mobileRoot.style.display = 'none';
            mobileSubWrapper.style.display = 'block';
            mobileContent.innerHTML = content;
            document.getElementById('mobile-sub-title').textContent = sectionTitle;
        } else {
            mainContent.innerHTML = content;
            const pageHeader = document.querySelector('.page-h');
            if (pageHeader) pageHeader.textContent = sectionTitle;
            
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(a => a.classList.remove('active'));
            const navId = 'nav-item-' + sectionId;
            const navItem = document.getElementById(navId);
            if (navItem) navItem.classList.add('active');
        }

        if (sectionId === 'personal-info') reinitPersonalInfoInputs();
        if (sectionId === 'orders' && window.initOrdersPage) window.initOrdersPage();
    };

    function reinitPersonalInfoInputs() {
        let firstName = metadata.first_name || '';
        let lastName = metadata.last_name || '';
        if (!firstName && user.name) {
            const parts = user.name.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }

        const setters = {
            'profile-first-name': firstName,
            'profile-last-name': lastName,
            'profile-email-modern': user.email || '',
            'profile-phone-modern': metadata.phone || user.phone || '',
            'profile-address-modern': metadata.address || user.address || '',
            'profile-dob': metadata.dob || '',
            'profile-location': metadata.location || '',
            'profile-postal': metadata.postal_code || ''
        };

        Object.keys(setters).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = setters[id];
        });

        if (metadata.gender === 'female') {
            const genF = document.getElementById('gender-female');
            if(genF) genF.checked = true;
        }

        // Set avatar preview image dynamically
        const avatarUrl = metadata.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80';
        const elAvPreview = document.getElementById('profile-avatar-preview');
        if (elAvPreview) elAvPreview.src = avatarUrl;
    }

    window.handleAvatarSelect = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Basic filtering
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file.');
            return;
        }

        const avatarImg = document.getElementById('desktop-avatar');
        const origSrc = avatarImg ? avatarImg.src : '';
        
        if (avatarImg) {
            avatarImg.style.opacity = '0.5';
        }
        showToast('Uploading image...');

        const sessionRaw = JSON.parse(localStorage.getItem('sb-iehvheagzgztmaxutcvz-auth-token'));
        const userId = sessionRaw?.user?.id || 'unknown';

        const { data: publicUrl, error } = await window.SupabaseService.uploadAvatar(userId, file);

        if (!error && publicUrl) {
            // Update metadata
            const { error: updateError } = await window.SupabaseService.updateProfile(user.email, {
                avatar_url: publicUrl
            });

            if (!updateError) {
                showToast('Profile image updated!');
                if (avatarImg) {
                    avatarImg.src = publicUrl;
                    avatarImg.style.opacity = '1';
                }
                const elAvPreview = document.getElementById('profile-avatar-preview');
                if (elAvPreview) elAvPreview.src = publicUrl;
                
                const elAvMobile = document.getElementById('mobile-avatar');
                if(elAvMobile) elAvMobile.style.backgroundImage = `url('${publicUrl}')`;
            } else {
                showToast('Error updating profile metadata.');
                if (avatarImg) avatarImg.style.opacity = '1';
            }
        } else {
            showToast('Upload failed. Ensure "avatars" bucket is created and public.');
            if (avatarImg) {
                avatarImg.src = origSrc;
                avatarImg.style.opacity = '1';
            }
        }
    };

    window.handlePasswordUpdate = async function(e) {
        e.preventDefault();
        const p1 = document.getElementById('new-password').value;
        const p2 = document.getElementById('confirm-password').value;
        
        if (p1 !== p2) {
            showToast('Passwords do not match');
            return;
        }

        const { error } = await window.SupabaseService.updatePassword(p1);
        if (!error) {
            showToast('Password updated successfully!');
            setTimeout(() => window.showProfileSection('main'), 1500);
        } else {
            showToast('Error: ' + error.message);
        }
    };

    window.saveProfileDetails = async function(e) {
        e.preventDefault();
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const btn = e.target.querySelector('button[type="submit"]');
        const origText = btn ? btn.innerHTML : 'Save Changes';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span> Saving...';
        }

        const updates = {
            first_name: document.getElementById('profile-first-name').value,
            last_name: document.getElementById('profile-last-name').value,
            phone: document.getElementById('profile-phone-modern').value,
            address: document.getElementById('profile-address-modern').value,
            dob: document.getElementById('profile-dob').value,
            location: document.getElementById('profile-location').value,
            postal_code: document.getElementById('profile-postal').value,
            gender: gender,
            name: document.getElementById('profile-first-name').value + ' ' + document.getElementById('profile-last-name').value
        };

        const { error } = await window.SupabaseService.updateProfile(user.email, updates);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
        }

        if (!error) {
            showToast('Profile updated successfully!');
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast('Error updating profile: ' + error.message);
        }
    };

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

    const urlParams = new URLSearchParams(window.location.search);
    const targetSection = urlParams.get('section');
    
    if (targetSection) {
        window.showProfileSection(targetSection);
    } else if (isMobile) {
        window.showProfileSection('main');
    } else {
        window.showProfileSection('personal-info');
    }
}

window.initProfilePage = initProfilePage;
