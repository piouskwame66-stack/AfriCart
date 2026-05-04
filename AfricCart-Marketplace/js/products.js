const products = [];

// Utility functions for products
const ProductService = {
    getAllProducts: () => {
        return products;
    },
    getProductById: (id) => {
        return products.find(p => p.id === id);
    },
    getProductsByCategory: (category) => {
        return products.filter(p => p.category === category);
    },
    getFeaturedProducts: (limit = 12) => {
        return products.slice(0, limit);
    },
    getRelatedProducts: (category, excludeId, limit = 4) => {
        return products.filter(p => p.category === category && p.id !== excludeId).slice(0, limit);
    }
};

if (typeof window !== 'undefined') {
    window.products = products;
    window.ProductService = ProductService;

    window.allCatalogProducts = products;
    window.currentFilteredProducts = products;
    const PAGE_SIZE = 50;
    let isInitialLoad = true; // Track if this is the first page load

    function renderPage(filtered, page) {
        const container = document.getElementById('all-products-container');
        const paginationEl = document.getElementById('pagination-container');
        if (!container) {
            console.log('[Products] Container not found!');
            return;
        }
        
        console.log('[Products] Rendering page', page, 'with', filtered.length, 'products');

        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const start = (page - 1) * PAGE_SIZE;
        const pageProducts = filtered.slice(start, start + PAGE_SIZE);

        console.log('[Products] Rendering', pageProducts.length, 'products to grid');

        if (window.renderProductGrid) {
            window.renderProductGrid(pageProducts, container);
        }

        // Scroll to top of grid only if NOT the initial load and if scrolling hasn't been disabled.
        if (!isInitialLoad && !window.disableProductScroll) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        isInitialLoad = false;
        if (window.disableProductScroll) {
            window.disableProductScroll = false;
        }

        // Build pagination
        if (paginationEl) {
            if (totalPages <= 1) {
                paginationEl.innerHTML = '';
                return;
            }

            const btnStyle = (active) => `
                padding: 9px 14px;
                border-radius: 6px;
                border: 1px solid ${active ? '#111' : '#ddd'};
                background: ${active ? '#111' : '#fff'};
                color: ${active ? '#fff' : '#333'};
                font-size: 13px;
                font-weight: ${active ? '700' : '500'};
                cursor: ${active ? 'default' : 'pointer'};
                transition: all 0.2s;
            `;

            let html = `<button onclick="window._goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}
                style="${btnStyle(false)} ${page === 1 ? 'opacity:0.4; cursor:default;' : ''}">← Prev</button>`;

            // Smart page number range
            let pages = [];
            if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
                pages = [1];
                if (page > 3) pages.push('...');
                for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                if (page < totalPages - 2) pages.push('...');
                pages.push(totalPages);
            }

            pages.forEach(p => {
                if (p === '...') {
                    html += `<span style="padding:9px 4px; color:#aaa;">…</span>`;
                } else {
                    html += `<button onclick="window._goToPage(${p})" style="${btnStyle(p === page)}">${p}</button>`;
                }
            });

            html += `<button onclick="window._goToPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}
                style="${btnStyle(false)} ${page === totalPages ? 'opacity:0.4; cursor:default;' : ''}">Next →</button>`;

            paginationEl.innerHTML = html;
        }
    }

    window._goToPage = function(page) {
        const filtered = window.currentFilteredProducts || window.allCatalogProducts;
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        if (page < 1 || page > totalPages) return;
        window._currentPage = page;
        renderPage(filtered, page);
    };

    window._currentPage = 1;

    window.initProductsListing = async function() {
        console.log('[Products] ========== initProductsListing STARTED ==========');
        const container = document.getElementById('all-products-container');
        console.log('[Products] Container found:', !!container, 'element:', container);
        if (!container) {
            console.error('[Products] FATAL: all-products-container not found');
            return;
        }
        
        // Save scroll position before loading products
        const originalScrollY = window.scrollY;
        
        console.log('[Products] initProductsListing called');

        // ⚠️ OPTIMIZATION: Use cached products or fetch if not available
        let data = window.allCatalogProducts;
        
        if (!data || data.length === 0) {
            // Only fetch if cache is empty
            console.log('[Products] Cache empty, fetching products...');
            if (window.SupabaseService) {
                const result = await window.SupabaseService.fetchProducts();
                data = result.data;
            }
        } else {
            console.log('[Products] Using cached products:', data.length);
        }

        if (data && data.length) {
            // User Request: Put fashion and electronic product before the other
            window.allCatalogProducts = data.sort((a, b) => {
                const weight = (cat) => (cat === 'Fashion' || cat === 'Electronics') ? 1 : 0;
                return weight(b.category) - weight(a.category);
            });
        }

        // Wait a tick for URL to be ready, then apply filters
        setTimeout(() => {
            window.initFiltering();
        }, 10);
        
        return Promise.resolve();
    }

    window.initFiltering = async function() {
        // If products not loaded yet, load them first
        if (!window.allCatalogProducts || window.allCatalogProducts.length === 0) {
            console.log('[Products] Products not loaded, fetching from Supabase...');
            if (window.SupabaseService) {
                const { data } = await window.SupabaseService.fetchProducts();
                console.log('[Products] Fetched products in initFiltering:', data?.length || 0);
                if (data && data.length) {
                    window.allCatalogProducts = data.sort((a, b) => {
                        const weight = (cat) => (cat === 'Fashion' || cat === 'Electronics') ? 1 : 0;
                        return weight(b.category) - weight(a.category);
                    });
                }
            }
        } else {
            console.log('[Products] Products already loaded:', window.allCatalogProducts.length);
        }

        // Still no products? Show empty state
        if (!window.allCatalogProducts || window.allCatalogProducts.length === 0) {
            const container = document.getElementById('all-products-container');
            if (container) {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--grey);"><p>No products found.</p></div>';
            }
            return;
        }

        const checks = document.querySelectorAll('#category-filters input');
        const priceSlider = document.getElementById('price-slider');
        const priceLabel = document.getElementById('price-max-label');
        const sortDropdown = document.getElementById('sort-dropdown');
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        const categoryQuery = urlParams.get('category');

        // Sync search input field
        const searchInput = document.getElementById('main-search-input');
        if (searchInput) {
            searchInput.value = searchQuery || '';
        }

        // If category is in URL, check the corresponding checkbox and filter
        if (categoryQuery) {
            // Decode URL-encoded category (e.g., "Home%20%26%20Office" -> "Home & Office")
            const decodedCategory = decodeURIComponent(categoryQuery);
            checks.forEach(c => {
                if (c.value.toLowerCase() === decodedCategory.toLowerCase()) {
                    c.checked = true;
                } else if (c.value === 'all') {
                    c.checked = false;
                }
            });
        }

        const applyFilters = () => {
            const activeCats = Array.from(checks).filter(c => c.checked).map(c => c.value.toLowerCase());
            const maxPrice = priceSlider ? parseInt(priceSlider.value, 10) : 1000;

            let filtered = window.allCatalogProducts || products;

            // Filter by search query
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                filtered = filtered.filter(p => 
                    (p.title && p.title.toLowerCase().includes(searchLower)) ||
                    (p.description && p.description.toLowerCase().includes(searchLower)) ||
                    (p.category && p.category.toLowerCase().includes(searchLower))
                );
            }

            if (activeCats.length > 0 && !activeCats.includes('all')) {
                filtered = filtered.filter(p => p.category && activeCats.includes(p.category.toLowerCase()));
            }

            filtered = filtered.filter(p => p.price <= maxPrice);

            if (sortDropdown) {
                const sort = sortDropdown.value;
                if (sort === 'price-low') filtered = [...filtered].sort((a, b) => a.price - b.price);
                if (sort === 'price-high') filtered = [...filtered].sort((a, b) => b.price - a.price);
                if (sort === 'newest') filtered = [...filtered].sort((a, b) => b.id - a.id);
            }

            window.currentFilteredProducts = filtered;
            window._currentPage = 1;
            renderPage(filtered, 1);

            // Show "X products found" only when there's a search query
            const countEl = document.getElementById('results-count');
            if (countEl) {
                if (searchQuery) {
                    countEl.style.display = 'block';
                    countEl.textContent = `${filtered.length} products found for "${searchQuery}"`;
                } else {
                    countEl.style.display = 'none';
                }
            }
        };

        checks.forEach(c => c.addEventListener('change', (e) => {
            if (e.target.value === 'all' && e.target.checked) {
                checks.forEach(other => { if(other !== e.target) other.checked = false; });
            } else if (e.target.checked) {
                const allCheck = Array.from(checks).find(i => i.value === 'all');
                if (allCheck) allCheck.checked = false;
            }
            applyFilters();
        }));

        if (priceSlider) {
            priceSlider.addEventListener('input', (e) => {
                if (priceLabel) priceLabel.textContent = `GH₵ ${e.target.value}`;
                applyFilters();
            });
        }

        if (sortDropdown) {
            sortDropdown.addEventListener('change', applyFilters);
        }

        // Apply filters on initial load
        applyFilters();
    };

    window.loadRelatedProducts = async function(category, currentId) {
        const container = document.getElementById('related-products-container');
        if (!container) return;

        let allProds = products || [];
        if (window.SupabaseService) {
            const { data } = await window.SupabaseService.fetchProducts();
            if (data && data.length > 0) {
                allProds = data;
            }
        }
        
        // Find by category first
        let related = allProds.filter(p => (p.category === category) && (p.id.toString() !== currentId.toString()));
        
        // Pad with other categories to ensure a full grid
        if (related.length < 8) {
            const otherProds = allProds.filter(p => (p.category !== category) && (p.id.toString() !== currentId.toString()));
            related = [...related, ...otherProds];
        }

        related = related.slice(0, 8);

        if (related.length === 0) {
            const section = document.querySelector('#related-products-container').closest('section');
            if (section) section.style.display = 'none';
            return;
        }

        if (window.renderProductGrid) {
            window.renderProductGrid(related, container);
        }
    };
}
