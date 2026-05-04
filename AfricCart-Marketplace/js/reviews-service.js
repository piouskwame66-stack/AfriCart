/**
 * Reviews Service - Handles product review loading and submission
 */

window.loadProductReviews = async function(productId) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (!window.SupabaseService) return;
    
    const { data: reviews, error } = await window.SupabaseService.fetchProductReviews(productId);
    
    if (error || !reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding:60px; color:var(--grey); background:#fdfdfd; border-radius:12px; border:1px dashed #eee;">
                <p style="margin-bottom:10px; font-size:24px;">📝</p>
                <p>No reviews yet. Be the first to share your thoughts!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(rev => `
        <div class="screenshot-review-card" style="border:1px solid #eaeaea; border-radius:16px; padding:25px; display:flex; gap:20px; background:#fff; margin-bottom:0;">
            <div style="flex-shrink:0;">
                <div style="width:80px; height:80px; border-radius:50%; background:#f5f5f5; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <div style="font-size:32px; font-weight:600; color:#555;">
                        ${(rev.user_name || 'U').charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div style="font-weight:600; font-size:16px; color:#111;">${rev.user_name || 'Anonymous User'}</div>
                    <div class="stars" style="color:#facc36; font-size:15px; letter-spacing:2px; display:flex;">
                        ${'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'.repeat(rev.rating)}
                        ${'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(5 - rev.rating)}
                    </div>
                </div>
                <p style="margin:0; font-size:14px; color:#999; line-height:1.6;">${rev.comment || 'Auctor magnis proin vitae laoreet ultrices ultricies diam. Sed duis mattis cras lacus donec. Aliquam'}</p>
            </div>
        </div>
    `).join('');
};

window.initReviewForm = function(productId) {
    const wrapper = document.getElementById('review-form-wrapper');
    if (!wrapper) return;

    const session = window.SupabaseService?.getSession();
    if (!session) {
        wrapper.innerHTML = `
            <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #eee; text-align:center;">
                <p style="font-size:14px; color:var(--grey); margin-bottom:15px;">Please log in to leave a review.</p>
                <button onclick="window.showAuthModal('signin')" class="btn btn-black btn-sm" style="cursor:pointer;">Log In / Sign Up</button>
            </div>
        `;
        return;
    }

    wrapper.innerHTML = `
        <style>
            #star-picker svg.active { fill: #facc36; stroke: #facc36; }
            #star-picker svg { stroke: #facc36; fill: none; transition: all 0.2s; }
        </style>
        <form id="product-review-form" class="review-form" style="width: 100%;">
            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size:14px; font-weight:500; color:#333; margin-bottom:8px;">Add Your Rating <span style="color:#d9534f;">*</span></label>
                <div class="star-rating-picker" id="star-picker" style="display:flex; gap:6px; cursor:pointer;">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <svg data-val="${i}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                    `).join('')}
                </div>
                <input type="hidden" id="review-rating" value="5">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size:14px; font-weight:500; color:#333; margin-bottom:8px;">Name <span style="color:#d9534f;">*</span></label>
                <input type="text" placeholder="John Doe" value="${session.user.name || ''}" disabled style="width:100%; border:1px solid #eaeaea; border-radius:8px; padding:15px; font-size:14px; color:#666; outline:none; background:#fff;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size:14px; font-weight:500; color:#333; margin-bottom:8px;">Email <span style="color:#d9534f;">*</span></label>
                <input type="email" placeholder="JohnDoe@gmail.com" value="${session.user.email || ''}" disabled style="width:100%; border:1px solid #eaeaea; border-radius:8px; padding:15px; font-size:14px; color:#666; outline:none; background:#fff;">
            </div>

            <div style="margin-bottom: 25px;">
                <label style="display:block; font-size:14px; font-weight:500; color:#333; margin-bottom:8px;">Write Your Review <span style="color:#d9534f;">*</span></label>
                <textarea id="review-comment" rows="5" placeholder="Write here..." required style="width:100%; border:1px solid #eaeaea; border-radius:8px; padding:15px; font-size:14px; color:#333; outline:none; resize:vertical; font-family:inherit; background:#fff;"></textarea>
            </div>
            
            <button type="submit" style="width:100%; background:var(--black); color:var(--white); border:none; border-radius:8px; padding:16px; font-size:16px; font-weight:600; cursor:pointer; transition: opacity 0.2s;">Submit</button>
        </form>
    `;

    const stars = wrapper.querySelectorAll('#star-picker svg');
    const input = wrapper.querySelector('#review-rating');
    
    const updateStars = (val) => {
        stars.forEach((s, idx) => {
            if (idx < val) s.classList.add('active');
            else s.classList.remove('active');
        });
        input.value = val;
    };

    updateStars(5);

    stars.forEach(s => {
        s.addEventListener('click', () => updateStars(parseInt(s.dataset.val, 10)));
    });

    const form = wrapper.querySelector('#product-review-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        const comment = document.getElementById('review-comment').value;
        const rating = parseInt(input.value, 10);

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        }

        const reviewData = {
            product_id: productId,
            user_id: session.user.id || (await window.SupabaseService.client.auth.getUser()).data.user?.id,
            user_name: session.user.name,
            rating: rating,
            comment: comment
        };

        const { error } = await window.SupabaseService.submitProductReview(reviewData);

        if (!error) {
            showToast('Review submitted! Thank you.');
            window.loadProductReviews(productId);
            form.reset();
            updateStars(5);
            if (window.initProductDetails) window.initProductDetails(); 
        } else {
            showToast('Error: ' + error.message);
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Submit Review';
        }
    });
};
