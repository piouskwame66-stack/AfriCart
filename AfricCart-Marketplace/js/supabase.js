// Initialize Supabase Client
const SUPABASE_URL = 'https://iehvheagzgztmaxutcvz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaHZoZWFnemd6dG1heHV0Y3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzczOTgsImV4cCI6MjA5MDQ1MzM5OH0.CGAYCWMSb5TwU2yZUpFkUBPCqiqnLO41SkEGk4lk3tM';

let supabaseClient = null;

console.log('[Supabase] Initializing... window.supabase:', typeof window.supabase);
console.log('[Supabase] CDN Script Status:', document.currentScript ? 'Loading' : 'Ready');

// Wait for Supabase CDN to load
const initSupabase = () => {
    if (typeof window !== 'undefined' && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[Supabase] Client created successfully');
            console.log('[Supabase] URL:', SUPABASE_URL);
        } catch (err) {
            console.error('[Supabase] Error creating client:', err);
        }
    } else {
        console.error('[Supabase] Failed to initialize - window.supabase not found');
        console.log('[Supabase] Available globals:', Object.keys(window).filter(k => k.includes('supabase')));
    }
};

// Try to initialize immediately, or wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}

window.SupabaseService = {
    client: supabaseClient,
    
    // --- Database Logic ---
    fetchProducts: async () => {
        console.log('[Supabase] fetchProducts called, client:', !!supabaseClient);
        if (!supabaseClient) {
            console.error('[Supabase] No client - returning empty products');
            return { data: [], error: 'No Supabase client initialized' };
        }
        try {
            const { data, error } = await supabaseClient.from('products').select('*').order('id', { ascending: true });
            if (error) {
                console.error('[Supabase] fetchProducts error:', error);
                console.error('[Supabase] Error details:', {
                    message: error.message,
                    code: error.code,
                    status: error.status
                });
            } else {
                console.log('[Supabase] fetchProducts success:', data?.length || 0, 'products fetched');
            }
            return { data: data || [], error };
        } catch (err) {
            console.error('[Supabase] fetchProducts exception:', err);
            return { data: [], error: err.message };
        }
    },

    fetchProductById: async (id) => {
        if (!supabaseClient) return { data: window.ProductService.getProductById(id), error: null };
        const { data, error } = await supabaseClient.from('products').select('*').eq('id', id).single();
        return { data, error };
    },

    submitContactForm: async (formData) => {
        if (!supabaseClient) return { success: true, error: null };
        const { data, error } = await supabaseClient.from('contacts').insert([formData]);
        return { success: !error, error };
    },

    // --- Auth Logic ---
    getSession: () => {
        // First check real Supabase session
        const session = JSON.parse(localStorage.getItem('sb-iehvheagzgztmaxutcvz-auth-token'));
        if (session && session.user) {
            return { 
                user: {
                    email: session.user.email,
                    name: session.user.user_metadata.full_name || session.user.email.split('@')[0],
                    phone: session.user.user_metadata.phone || '',
                    address: session.user.user_metadata.address || '',
                    user_metadata: session.user.user_metadata // <--- Expose full metadata
                },
                access_token: session.access_token 
            };
        }
        // Fallback to legacy mock session during transition
        return JSON.parse(localStorage.getItem('africart_session') || 'null');
    },

    signIn: async (email, password) => {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (!error && data.session) {
            // Success: Clean up mock session
            localStorage.removeItem('africart_session');
        }
        return { data, error };
    },

    signUp: async (email, password, name) => {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });
        if (!error && data.user) {
            // Success: Clean up mock session
            localStorage.removeItem('africart_session');
        }
        return { data, error };
    },

    updateProfile: async (email, updates) => {
        const { data, error } = await supabaseClient.auth.updateUser({
            data: updates
        });
        return { data, error };
    },

    updatePassword: async (newPassword) => {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        return { data, error };
    },

    signOut: async () => {
        const { error } = await supabaseClient.auth.signOut();
        localStorage.removeItem('africart_session');
        return { error };
    },

    uploadAvatar: async (userId, file) => {
        if (!supabaseClient) return { data: null, error: new Error("Supabase not initialized") };
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) return { data: null, error: uploadError };

        const { data: { publicUrl } } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return { data: publicUrl, error: null };
    },

    // --- Order Logic ---
    saveOrder: async (orderData) => {
        try {
            // Strictly get the real Supabase user context directly from the client layer
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            if (authError || !authData || !authData.user) {
                return { error: { message: 'You must be logged into a real Supabase account.' } };
            }

            const { data, error } = await supabaseClient.from('orders').insert([{
                user_id: authData.user.id, 
                id: orderData.orderId,
                items: orderData.items,
                subtotal: orderData.subtotal,
                tax: orderData.tax,
                shipping: orderData.shipping,
                total: orderData.total,
                shipping_address: orderData.shippingAddress
            }]);
            
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error('Order saving error:', err);
            return { error: err };
        }
    },

    fetchOrders: async () => {
        if (!supabaseClient) return { data: [], error: null };
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData || !authData.user) {
            return { data: [], error: { message: 'You must be logged in.' } };
        }
        const { data, error } = await supabaseClient.from('orders').select('*').eq('user_id', authData.user.id).order('created_at', { ascending: false });
        
        // Filter out orders cleared before this timestamp
        const clearTimestamp = parseInt(localStorage.getItem('africart_cleared_at') || '0');
        const filteredData = data.filter(order => {
            const orderTime = new Date(order.created_at).getTime();
            return orderTime >= clearTimestamp;
        });
        
        return { data: filteredData, error };
    },

    deleteUserOrders: async () => {
        if (!supabaseClient) return { error: { message: 'Not connected' } };
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData || !authData.user) {
            return { error: { message: 'You must be logged in.' } };
        }
        const { data, error } = await supabaseClient.from('orders').delete().eq('user_id', authData.user.id);
        return { data, error };
    },

    // --- Review Logic ---
    fetchProductReviews: async (productId) => {
        if (!supabaseClient) return { data: [], error: null };
        const { data, error } = await supabaseClient
            .from('reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        return { data, error };
    },

    submitProductReview: async (reviewData) => {
        if (!supabaseClient) return { data: null, error: 'Database not connected' };
        const { data, error } = await supabaseClient.from('reviews').insert([reviewData]);
        return { data, error };
    }
};
