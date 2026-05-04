/**
 * AfriCart Main Entry Point
 * Orchestrates the initialization of all services based on the current page.
 */

// Global scroll control - allow normal scrolling

document.addEventListener('DOMContentLoaded', () => {
    // Prevent scrolling on page load
    window.scrollTo(0, 0);
    
    // Delay reset to ensure it takes effect
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 50);
    
    // Prevent automatic scrolling for the first second
    let scrollDisabled = true;
    const scrollHandler = (e) => {
        if (scrollDisabled) {
            window.scrollTo(0, 0);
        }
    };
    
    window.addEventListener('scroll', scrollHandler);
    
    setTimeout(() => {
        scrollDisabled = false;
        window.removeEventListener('scroll', scrollHandler);
    }, 1000);
    
    // 0. Cleanup Legacy Cart Data
    if (!localStorage.getItem('africart_cart_cleaned_v1')) {
        if (window.CartService) window.CartService.clear();
        localStorage.setItem('africart_cart_cleaned_v1', 'true');
    }

    // 0.1 Load all products globally for Add to Cart / Buy Now functionality
    // ⚠️ THIS IS A CRITICAL OPTIMIZATION - Only fetch products ONCE
    let productsLoadPromise = null;
    
    if (window.SupabaseService) {
        // Create a single promise that all pages can reuse
        productsLoadPromise = window.SupabaseService.fetchProducts().then(({ data: allProducts }) => {
            if (allProducts && allProducts.length) {
                window.allCatalogProducts = allProducts;
                window.productsCacheTimestamp = Date.now();
                console.log('[App] Loaded', allProducts.length, 'products into global cache');
                return allProducts;
            }
            return [];
        });
    }

    // 0. Initialize Shared UI
    if (window.initSlider) window.initSlider();
    if (window.initMobileMenu) window.initMobileMenu();
    if (window.updateAuthUI) window.updateAuthUI();

    // 0.5.5 Global Search Handler with Suggestions
    const globalSearchInput = document.getElementById('main-search-input');
    let searchTimeout = null;
    let searchSuggestionsContainer = null;
    let clearButton = null;

    // Create clear button
    function createClearButton() {
        if (clearButton) return clearButton;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'search-clear-btn';
        btn.innerHTML = '&times;';
        btn.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 20px;
            color: #999;
            cursor: pointer;
            display: none;
            padding: 0;
            line-height: 1;
        `;
        btn.addEventListener('click', () => {
            globalSearchInput.value = '';
            handleSearch('', true); // Pass true to indicate we're clearing
            globalSearchInput.focus();
        });
        return btn;
    }

    // Create suggestions dropdown
    function createSuggestionsContainer() {
        if (searchSuggestionsContainer) return searchSuggestionsContainer;
        
        const container = document.createElement('div');
        container.id = 'search-suggestions';
        container.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            margin-top: 8px;
        `;
        return container;
    }

    async function ensureProductsLoaded() {
        if (!window.allCatalogProducts || window.allCatalogProducts.length === 0) {
            if (window.SupabaseService) {
                const { data } = await window.SupabaseService.fetchProducts();
                if (data && data.length) {
                    window.allCatalogProducts = data;
                }
            }
        }
    }

    function showSuggestions(query, products) {
        if (!searchSuggestionsContainer) return;
        
        const matchingProducts = products
            .filter(p => p.title && p.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 6);

        if (matchingProducts.length === 0) {
            searchSuggestionsContainer.style.display = 'none';
            return;
        }

        searchSuggestionsContainer.innerHTML = matchingProducts.map(product => `
            <div class="search-suggestion-item" 
                 style="display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background 0.2s;"
                 onmouseover="this.style.background='#fafafa'" 
                 onmouseout="this.style.background='transparent'"
                 onclick="window.location.href='product-details.html?id=${product.id}'">
                <img src="${(product.images && product.images[0]) || product.image || 'assets/images/prod_headphones.png'}" 
                     alt="${product.title}" 
                     style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 500; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.title}</div>
                    <div style="font-size: 12px; color: #888;">${product.category || ''}</div>
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #111;">GH₵ ${Number(product.price).toFixed(2)}</div>
            </div>
        `).join('');

        searchSuggestionsContainer.style.display = 'block';
    }

    function hideSuggestions() {
        if (searchSuggestionsContainer) {
            searchSuggestionsContainer.style.display = 'none';
        }
    }

    function updateClearButton() {
        if (clearButton) {
            clearButton.style.display = globalSearchInput.value.trim() ? 'block' : 'none';
        }
    }

    function handleSearch(query, isClearing = false) {
        updateClearButton();
        
        if (!query || isClearing) {
            hideSuggestions();
            // If on products page and query is cleared, reset the filters
            if (window.location.pathname.includes('product.html') || window.location.pathname.includes('/product')) {
                const url = new URL(window.location);
                url.searchParams.delete('search');
                window.history.pushState({}, '', url);
                // Also clear the search input field
                if (globalSearchInput) globalSearchInput.value = '';
                if (window.initFiltering) {
                    window.disableProductScroll = true;
                    window.initFiltering();
                }
            }
            return;
        }

        // If on products page, filter directly
        if (window.location.pathname.includes('product.html') || window.location.pathname.includes('/product')) {
            const url = new URL(window.location);
            url.searchParams.set('search', query);
            window.history.pushState({}, '', url);
            if (window.initFiltering) {
                window.disableProductScroll = true;
                window.initFiltering();
            }
        }

        // Show suggestions
        if (window.allCatalogProducts && window.allCatalogProducts.length > 0) {
            showSuggestions(query, window.allCatalogProducts);
        }
    }

    if (globalSearchInput) {
        const searchBarWrapper = globalSearchInput.closest('.search-bar');
        if (searchBarWrapper) {
            searchBarWrapper.style.position = 'relative';
            searchBarWrapper.style.display = 'flex';
            searchBarWrapper.style.alignItems = 'center';
            
            // Add clear button
            clearButton = createClearButton();
            globalSearchInput.parentNode.insertBefore(clearButton, globalSearchInput.nextSibling);
            
            // Add suggestions container
            searchSuggestionsContainer = createSuggestionsContainer();
            searchBarWrapper.appendChild(searchSuggestionsContainer);
        }

        // Input event for suggestions
        globalSearchInput.addEventListener('input', async (e) => {
            updateClearButton();
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (!query) {
                handleSearch('', true); // Passing true because this is clearing
                return;
            }

            // Ensure products are loaded before showing suggestions
            await ensureProductsLoaded();

            searchTimeout = setTimeout(() => {
                handleSearch(query);
                if (window.allCatalogProducts && window.allCatalogProducts.length > 0) {
                    showSuggestions(query, window.allCatalogProducts);
                }
            }, 300);
        });

        // Enter key handler
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                hideSuggestions();
                const query = globalSearchInput.value.trim();
                if (query) {
                    // Navigate to products page with search query
                    window.location.href = `product.html?search=${encodeURIComponent(query)}`;
                }
            }
        });

        // Escape key to clear and hide suggestions
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearTimeout(searchTimeout);
                globalSearchInput.value = '';
                handleSearch('', true); // Pass true to indicate we're clearing
                hideSuggestions();
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (searchSuggestionsContainer && !searchSuggestionsContainer.contains(e.target) && e.target !== globalSearchInput) {
                hideSuggestions();
            }
        });

        // Show suggestions on focus if there's text
        globalSearchInput.addEventListener('focus', async () => {
            updateClearButton();
            const query = globalSearchInput.value.trim();
            if (query) {
                await ensureProductsLoaded();
                if (window.allCatalogProducts && window.allCatalogProducts.length > 0) {
                    showSuggestions(query, window.allCatalogProducts);
                }
            }
        });
    }

    // 0.6 Check for Returning Cart Captures (Auth redirection logic)
    const pendingParams = JSON.parse(localStorage.getItem('pending_cart_item') || 'null');
    if (pendingParams && window.SupabaseService && window.SupabaseService.getSession()) {
        localStorage.removeItem('pending_cart_item');
        setTimeout(() => {
            window.SupabaseService.fetchProductById(pendingParams.productId).then(({ data: product }) => {
                if (product && window.CartService) {
                    window.CartService.addItem(product, pendingParams.qty);
                    if (window.showCustomCartPopup) window.showCustomCartPopup(product.images[0], product.title);
                }
            });
        }, 300);
    }

    // 1. Render Featured Products on Home - USE CACHED PRODUCTS
    const featuredContainer = document.getElementById('featured-products-container');
    if (featuredContainer) {
        // Use the promise we already created above - no new fetch!
        if (productsLoadPromise) {
            productsLoadPromise.then((data) => {
                if (data && data.length > 0) {
                    // Filter for featured products (isPremium OR badge)
                    let featuredProducts = data.filter(p => p.isPremium || p.badge).slice(0, 14);
                    
                    // If no featured products, fall back to first 14 products
                    if (featuredProducts.length === 0) {
                        featuredProducts = data.slice(0, 14);
                    }
                    
                    renderProductGrid(featuredProducts, featuredContainer);
                }
            });
        }
    }

    // 2. Newsletter Submit
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput ? emailInput.value.trim() : '';
            if (email && window.SupabaseService && window.SupabaseService.client) {
                await window.SupabaseService.client.from('subscribers').insert([{ email }]);
            }
            if (window.showToast) window.showToast('🎉 Thank you for subscribing!');
            newsletterForm.reset();
        });
    }

    // 3. Page specific Dispatcher
    const path = window.location.pathname;
    const url = window.location.href;
    console.log('[App] Page Detection - pathname:', path, 'href:', url);
    
    if (path.includes('product-details.html') || url.includes('product-details.html')) {
        console.log('[App] Detected product-details.html page');
        initProductDetails();
    } else if (path.includes('product.html') || url.includes('product.html') || path.includes('/product') || url.includes('/product')) {
        console.log('[App] Detected product.html page - calling initProductsListing');
        // initProductsListing handles loading products and applying filters internally
        if (window.initProductsListing) {
            console.log('[App] initProductsListing found, calling it');
            window.initProductsListing();
        } else {
            console.error('[App] initProductsListing NOT found!');
        }
        // Populate recommendations strip - USE CACHED PRODUCTS
        if (productsLoadPromise) {
            console.log('[App] Using cached products for recommendations...');
            productsLoadPromise.then((prods) => {
                const recContainer = document.getElementById('recommendations-scroll');
                if (recContainer && prods && prods.length) {
                    const recProds = [...prods].sort(() => Math.random() - 0.5).slice(0, 10);
                    recContainer.innerHTML = recProds.map(product => {
                        const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image || 'assets/images/prod_headphones.png'];
                        const oldPrice = product.oldPrice ?? product.original_price ?? null;
                        return `
                            <div onclick="window.location.href='product-details.html?id=${product.id}'" style="flex-shrink:0; width:220px; background:#fff; border:1px solid #f0f0f0; border-radius:12px; padding:16px; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                                <div style="background:#f5f5f5; border-radius:8px; height:140px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                                    <img src="${images[0]}" alt="${product.title}" style="max-height:110px; max-width:100%; object-fit:contain;" onerror="this.src='assets/images/prod_headphones.png'" loading="lazy">
                                </div>
                                <div style="font-size:11px; color:#888; margin-bottom:4px;">${product.category || ''}</div>
                                <div style="font-size:13px; font-weight:600; color:#111; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${product.title}</div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="font-weight:700; font-size:14px;">GH₵ ${Number(product.price).toFixed(2)}</span>
                                    ${oldPrice ? `<span style="font-size:12px; color:#aaa; text-decoration:line-through;">GH₵ ${Number(oldPrice).toFixed(2)}</span>` : ''}
                                </div>
                            </div>`;
                    }).join('');
                }
            });
        } else if (window.SupabaseService) {
            // Fallback if productsLoadPromise not available
            console.log('[App] Fetching products for recommendations...');
            window.SupabaseService.fetchProducts().then(({ data }) => {
                const prods = (data && data.length) ? data : [];
                console.log('[App] Got', prods.length, 'products for recommendations');
                const recContainer = document.getElementById('recommendations-scroll');
                if (recContainer && prods.length) {
                    const recProds = [...prods].sort(() => Math.random() - 0.5).slice(0, 10);
                    recContainer.innerHTML = recProds.map(product => {
                        const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image || 'assets/images/prod_headphones.png'];
                        const oldPrice = product.oldPrice ?? product.original_price ?? null;
                        return `
                            <div onclick="window.location.href='product-details.html?id=${product.id}'" style="flex-shrink:0; width:220px; background:#fff; border:1px solid #f0f0f0; border-radius:12px; padding:16px; cursor:pointer; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                                <div style="background:#f5f5f5; border-radius:8px; height:140px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                                    <img src="${images[0]}" alt="${product.title}" style="max-height:110px; max-width:100%; object-fit:contain;" onerror="this.src='assets/images/prod_headphones.png'" loading="lazy">
                                </div>
                                <div style="font-size:11px; color:#888; margin-bottom:4px;">${product.category || ''}</div>
                                <div style="font-size:13px; font-weight:600; color:#111; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${product.title}</div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="font-weight:700; font-size:14px;">GH₵ ${Number(product.price).toFixed(2)}</span>
                                    ${oldPrice ? `<span style="font-size:12px; color:#aaa; text-decoration:line-through;">GH₵ ${Number(oldPrice).toFixed(2)}</span>` : ''}
                                </div>
                            </div>`;
                    }).join('');
                }
            });
        }
    } else if (path.includes('cart.html') || url.includes('/cart') || path.includes('/cart')) {
        if (window.initCartPage) window.initCartPage();
    } else if (path.includes('checkout.html') || url.includes('/checkout') || path.includes('/checkout')) {
        if (window.initCheckoutPage) window.initCheckoutPage();
    } else if (path.includes('profile.html') || url.includes('/profile') || path.includes('/profile')) {
        if (window.initProfilePage) window.initProfilePage();
    } else if (path.includes('orders.html') || url.includes('/orders') || path.includes('/orders')) {
        // Redirection for legacy orders page if any
        window.location.href = 'profile.html?section=orders';
    }
});

/**
 * Reusable Render Function — handles both camelCase (local) and snake_case (Supabase)
 * Optimized with native lazy loading, error handling, and efficient rendering
 */
window.renderProductGrid = function (products, container) {
    if (!products || products.length === 0) {
        console.log('[Products] No products to render');
        container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--grey);"><p>No products found.</p></div>';
        return;
    }
    
    console.log('[renderProductGrid] Rendering', products.length, 'products');
    
    // Build HTML in a single string (more efficient than DOM manipulation)
    const html = products.map(product => {
        const isPremium = product.isPremium ?? product.is_premium ?? (!!product.badge);
        const reviewsCount = product.reviewsCount ?? product.review_count ?? 0;
        const oldPrice = product.oldPrice ?? product.original_price ?? null;
        const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image || 'assets/images/prod_headphones.png'];
        const rating = product.rating || 0;
        const primaryImage = images[0];
        const fallbackImage = 'assets/images/prod_headphones.png';

        // Use srcset for responsive images and loading="lazy" for native lazy loading
        return `
        <div class="product-card" onclick="window.location.href='product-details.html?id=${product.id}'"
             style="border-radius:10px; overflow:hidden; border:1px solid #f0f0f0; padding:0; background:#fff;">
            <div style="background:#f5f5f5; display:flex; align-items:center; justify-content:center; height:180px; position:relative; padding:16px;">
                <img 
                     src="${primaryImage}" 
                     alt="${product.title}" 
                     style="max-height:140px; max-width:100%; object-fit:contain;"
                     loading="lazy" 
                     decoding="async"
                     onerror="this.src='${fallbackImage}'">
                ${isPremium ? '<span style="position:absolute;top:10px;right:10px;background:#ff7a00;color:#fff;font-size:10px;padding:3px 8px;border-radius:12px;font-weight:600;">Premium</span>' : ''}
            </div>
            <div style="padding:14px;">
                <div style="font-size:11px; color:#888; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.5px;">${product.category || ''}</div>
                <h3 style="font-size:13px; font-weight:600; color:#111; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${product.title}</h3>
                <div style="font-size:12px; color:#facc36; margin-bottom:8px;">
                    ${window.renderStars ? window.renderStars(rating) : '★'.repeat(Math.floor(rating))}
                    <span style="color:#aaa; font-size:11px; margin-left:4px;">(${reviewsCount})</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <span style="font-weight:700; font-size:15px; color:#111;">GH₵ ${Number(product.price).toFixed(2)}</span>
                    ${oldPrice ? `<span style="color:#aaa; text-decoration:line-through; font-size:13px;">GH₵ ${Number(oldPrice).toFixed(2)}</span>` : ''}
                </div>
                <div style="display:flex; gap:8px;" onclick="event.stopPropagation();">
                    <button onclick="window.handleAddToCart(event, '${product.id}')" style="flex:1; padding:9px 6px; background:#111; color:#fff; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; transition:opacity 0.2s;">Add to Cart</button>
                    <button onclick="window.handleBuyNow(event, '${product.id}')" style="flex:1; padding:9px 6px; background:#fff; color:#111; border:1px solid #ddd; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;">Buy Now</button>
                </div>
            </div>
        </div>
    `}).join('');

    // Set innerHTML once (more efficient than appending elements one by one)
    container.innerHTML = html;
    
    // Optional: Add Intersection Observer for advanced image lazy loading if needed
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });

        // Observe lazy images if they exist
        container.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
    }
};

window.scrollRecommendations = function (dir) {
    const el = document.getElementById('recommendations-scroll');
    if (el) el.scrollBy({ left: dir * 260, behavior: 'smooth' });
};

/**
 * Product Details — Quantity Controls
 * Called by the − / + buttons on product-details.html
 */
window.updateQty = function (delta) {
    const input = document.getElementById('qty-input');
    if (!input) return;
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, val + delta);
    input.value = val;
};

window.handleAddToCart = function (event, productId) {
    if (event) event.stopPropagation();

    // Look up product from Supabase cache (allCatalogProducts) first,
    // then fall back to the local static ProductService array.
    let product = null;
    if (window.allCatalogProducts && window.allCatalogProducts.length) {
        product = window.allCatalogProducts.find(p => String(p.id) === String(productId));
    }
    if (!product && window.ProductService) {
        product = window.ProductService.getProductById(productId);
    }

    if (!product) {
        console.warn('handleAddToCart: product not found for id', productId);
        return;
    }

    if (window.CartService) {
        window.CartService.addItem(product, 1);
        const imgSrc = Array.isArray(product.images) && product.images.length ? product.images[0] : (product.image || '');
        if (window.showCustomCartPopup) window.showCustomCartPopup(imgSrc, product.title);
    }
};

window.handleBuyNow = function (event, productId) {
    if (event) event.stopPropagation();

    // Look up product from Supabase cache (allCatalogProducts) first,
    // then fall back to the local static ProductService array.
    let product = null;
    if (window.allCatalogProducts && window.allCatalogProducts.length) {
        product = window.allCatalogProducts.find(p => String(p.id) === String(productId));
    }
    if (!product && window.ProductService) {
        product = window.ProductService.getProductById(productId);
    }

    if (!product) {
        console.warn('handleBuyNow: product not found for id', productId);
        return;
    }

    if (window.CartService) {
        window.CartService.addItem(product, 1);
        window.location.href = 'cart.html';
    }
};

window.initProductDetails = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || "1";

    if (window.SupabaseService) {
        // ⚠️ OPTIMIZATION: Check cache first before fetching
        let product = null;
        
        if (window.allCatalogProducts && window.allCatalogProducts.length > 0) {
            product = window.allCatalogProducts.find(p => p.id == id);
            if (product) {
                console.log('[ProductDetails] Found product in cache:', product.title);
            }
        }

        // Fetch from Supabase only if not in cache
        const fetchPromise = product 
            ? Promise.resolve({ data: product })
            : window.SupabaseService.fetchProductById(id);

        fetchPromise.then(({ data: product }) => {
            if (product) {
                document.title = product.title + " | AfriCart";

                const breadCat = document.getElementById('breadcrumb-category');
                const breadProd = document.getElementById('breadcrumb-product');
                if (breadCat) breadCat.textContent = product.category;
                if (breadProd) breadProd.textContent = product.title;

                if (window.loadProductReviews) window.loadProductReviews(id);
                if (window.initReviewForm) window.initReviewForm(id);
                if (window.loadRelatedProducts) window.loadRelatedProducts(product.category, id);

                const isPremium = product.isPremium ?? product.is_premium ?? (!!product.badge);
                const reviewsCount = product.reviewsCount ?? product.review_count ?? 0;
                const oldPrice = product.oldPrice ?? product.original_price ?? null;
                const stockStatus = product.stockStatus ?? (product.in_stock !== false ? 'In Stock' : 'Out of Stock');
                const images = Array.isArray(product.images) ? product.images : [product.image || 'assets/images/prod_headphones.png'];

                const mainImg = document.getElementById('main-product-image');
                if (mainImg) {
                    mainImg.src = images[0];
                    mainImg.setAttribute('loading', 'lazy');
                }

                const thumbnails = document.getElementById('product-thumbnails');
                if (thumbnails) {
                    thumbnails.innerHTML = images.map((img, idx) => `
                        <img src="${img}" 
                             class="thumbnail ${idx === 0 ? 'active' : ''}" 
                             onclick="window.changeMainImage(this, '${img}')" 
                             alt="thumbnail" 
                             loading="lazy"
                             onerror="this.style.display='none'">
                    `).join('');
                }

                const elementsToUpdate = {
                    'premium-badge': isPremium ? 'inline-block' : 'none',
                    'product-title': product.title,
                    'product-rating-stars': window.renderStars ? window.renderStars(product.rating || 0) : '★'.repeat(Math.round(product.rating || 0)),
                    'product-reviews-count': `(${reviewsCount} Reviews)`,
                    'product-stock': stockStatus,
                    'product-price': `GH₵ ${Number(product.price).toFixed(2)}`,
                    'product-old-price': oldPrice ? `GH₵ ${Number(oldPrice).toFixed(2)}` : '',
                    'product-description': product.description
                };

                Object.keys(elementsToUpdate).forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (id === 'premium-badge') {
                        el.style.display = elementsToUpdate[id];
                    } else if (id === 'product-rating-stars' || id === 'product-reviews-count') {
                        el.innerHTML = elementsToUpdate[id];
                    } else {
                        el.textContent = elementsToUpdate[id];
                    }
                });

                const addBtn = document.getElementById('btn-add-to-cart');
                if (addBtn) {
                    addBtn.onclick = () => {
                        const qtyInput = document.getElementById('qty-input');
                        const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
                        if (window.CartService) {
                            window.CartService.addItem(product, qty);
                            if (window.showCustomCartPopup) window.showCustomCartPopup(images[0], product.title);
                        }
                    };
                }

                // Wire up Buy Now button on product details page
                const buyNowBtn = document.getElementById('btn-buy-now');
                if (buyNowBtn) {
                    buyNowBtn.onclick = () => {
                        const qtyInput = document.getElementById('qty-input');
                        const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
                        if (window.CartService) {
                            window.CartService.addItem(product, qty);
                            window.location.href = 'cart.html';
                        }
                    };
                }
            }
        });
    }
};

window.changeMainImage = function (el, src) {
    const main = document.getElementById('main-product-image');
    if (main) main.src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
};
