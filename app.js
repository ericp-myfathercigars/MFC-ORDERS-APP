// MFC Orders App - Main Application Logic

// App State
const AppState = {
    orders: [],
    filteredOrders: [],
    customers: [],
    products: [],
    currentView: 'orders',
    searchTerm: '',
    dateFilter: 'all',
    sortOrder: 'date-desc',
    customDateFrom: null,
    customDateTo: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log('Initializing MFC Orders app...');
    
    // Load data from localStorage
    loadData();
    
    // Setup event listeners
    setupNavigation();
    setupOrderSearch();
    setupOrderFilters();
    setupCustomerSearch();
    setupProductSearch();
    
    // Render initial view
    renderOrders();
    
    console.log('App initialized successfully');
}

// Data Management
function loadData() {
    // Load orders
    const savedOrders = localStorage.getItem('mfc_orders');
    AppState.orders = savedOrders ? JSON.parse(savedOrders) : generateSampleOrders();
    AppState.filteredOrders = [...AppState.orders];
    
    // Load customers (from mfc-data.js if available, otherwise sample data)
    AppState.customers = typeof MFC_CUSTOMERS !== 'undefined' ? MFC_CUSTOMERS : generateSampleCustomers();
    
    // Load products (from mfc-data.js if available, otherwise sample data)
    AppState.products = typeof MFC_PRODUCTS !== 'undefined' ? MFC_PRODUCTS : generateSampleProducts();
    
    console.log(`Loaded ${AppState.orders.length} orders, ${AppState.customers.length} customers, ${AppState.products.length} products`);
}

function saveOrders() {
    localStorage.setItem('mfc_orders', JSON.stringify(AppState.orders));
    console.log('Orders saved to localStorage');
}

// Navigation
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const viewName = tab.getAttribute('data-view');
            switchView(viewName);
        });
    });
}

function switchView(viewName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Update active view
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    AppState.currentView = viewName;
    
    // Render view content
    switch(viewName) {
        case 'orders':
            renderOrders();
            break;
        case 'customers':
            renderCustomers();
            break;
        case 'products':
            renderProducts();
            break;
        case 'new-order':
            initNewOrderForm();
            break;
    }
}

// Order Search and Filtering
function setupOrderSearch() {
    const searchInput = document.getElementById('order-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            AppState.searchTerm = e.target.value.toLowerCase();
            filterAndRenderOrders();
        });
    }
}

function setupOrderFilters() {
    const dateFilter = document.getElementById('order-date-filter');
    const sortSelect = document.getElementById('order-sort');
    const applyDateBtn = document.getElementById('apply-date-filter');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const customDateRange = document.getElementById('custom-date-range');
    
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            AppState.dateFilter = e.target.value;
            
            if (e.target.value === 'custom') {
                customDateRange.style.display = 'grid';
            } else {
                customDateRange.style.display = 'none';
                filterAndRenderOrders();
            }
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            AppState.sortOrder = e.target.value;
            filterAndRenderOrders();
        });
    }
    
    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', () => {
            AppState.customDateFrom = dateFrom.value;
            AppState.customDateTo = dateTo.value;
            filterAndRenderOrders();
        });
    }
}

function filterAndRenderOrders() {
    let filtered = [...AppState.orders];
    
    // Apply search filter
    if (AppState.searchTerm) {
        filtered = filtered.filter(order => {
            const customerName = order.customerName || order.customer || '';
            return customerName.toLowerCase().includes(AppState.searchTerm);
        });
    }
    
    // Apply date filter
    filtered = applyDateFilter(filtered);
    
    // Apply sort
    filtered = applySortOrder(filtered);
    
    AppState.filteredOrders = filtered;
    renderOrders();
}

function applyDateFilter(orders) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(AppState.dateFilter) {
        case 'today':
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= today;
            });
            
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= weekAgo;
            });
            
        case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= monthStart;
            });
            
        case 'ytd':
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate >= yearStart;
            });
            
        case 'custom':
            if (AppState.customDateFrom && AppState.customDateTo) {
                const fromDate = new Date(AppState.customDateFrom);
                const toDate = new Date(AppState.customDateTo);
                toDate.setHours(23, 59, 59); // Include entire end date
                
                return orders.filter(order => {
                    const orderDate = new Date(order.date);
                    return orderDate >= fromDate && orderDate <= toDate;
                });
            }
            return orders;
            
        default:
            return orders;
    }
}

function applySortOrder(orders) {
    const sorted = [...orders];
    
    switch(AppState.sortOrder) {
        case 'date-desc':
            return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            
        case 'date-asc':
            return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            
        case 'customer-asc':
            return sorted.sort((a, b) => {
                const nameA = (a.customerName || a.customer || '').toLowerCase();
                const nameB = (b.customerName || b.customer || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
        case 'customer-desc':
            return sorted.sort((a, b) => {
                const nameA = (a.customerName || a.customer || '').toLowerCase();
                const nameB = (b.customerName || b.customer || '').toLowerCase();
                return nameB.localeCompare(nameA);
            });
            
        case 'amount-desc':
            return sorted.sort((a, b) => (b.total || 0) - (a.total || 0));
            
        case 'amount-asc':
            return sorted.sort((a, b) => (a.total || 0) - (b.total || 0));
            
        default:
            return sorted;
    }
}

// Render Orders
function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    const ordersCount = document.getElementById('orders-count');
    const ordersTotal = document.getElementById('orders-total');
    const noOrdersMessage = document.getElementById('no-orders-message');
    
    if (!ordersList) return;
    
    const orders = AppState.filteredOrders;
    
    // Update summary
    if (ordersCount) {
        ordersCount.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;
    }
    
    if (ordersTotal) {
        const total = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        ordersTotal.textContent = `Total: ${formatCurrency(total)}`;
    }
    
    // Show/hide no results message
    if (noOrdersMessage) {
        noOrdersMessage.style.display = orders.length === 0 ? 'block' : 'none';
    }
    
    if (orders.length === 0) {
        ordersList.innerHTML = '';
        return;
    }
    
    // Render order list
    ordersList.innerHTML = orders.map(order => `
        <div class="list-item" onclick="viewOrderDetail('${order.id}')">
            <div class="list-item-header">
                <div class="list-item-title">${order.customerName || order.customer || 'Unknown Customer'}</div>
                <div class="list-item-meta">${formatCurrency(order.total || 0)}</div>
            </div>
            <div class="list-item-meta">
                Order #${order.id || 'N/A'} • ${formatDate(order.date)} • ${order.items?.length || 0} items
            </div>
        </div>
    `).join('');
}

function viewOrderDetail(orderId) {
    const order = AppState.orders.find(o => o.id === orderId);
    if (!order) return;
    
    alert(`Order Details:\n\nCustomer: ${order.customerName}\nDate: ${formatDate(order.date)}\nTotal: ${formatCurrency(order.total)}\nItems: ${order.items?.length || 0}`);
}

// Customer Search
function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCustomers(e.target.value.toLowerCase());
        });
    }
}

function renderCustomers(searchTerm = '') {
    const customersList = document.getElementById('customers-list');
    if (!customersList) return;
    
    let customers = AppState.customers;
    
    if (searchTerm) {
        customers = customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.city?.toLowerCase().includes(searchTerm) ||
            customer.state?.toLowerCase().includes(searchTerm)
        );
    }
    
    customersList.innerHTML = customers.map(customer => `
        <div class="list-item">
            <div class="list-item-header">
                <div class="list-item-title">${customer.name}</div>
            </div>
            <div class="list-item-meta">
                ${customer.city ? `${customer.city}, ` : ''}${customer.state || ''} • ${customer.phone || 'No phone'}
            </div>
        </div>
    `).join('');
}

// Product Search
function setupProductSearch() {
    const searchInput = document.getElementById('product-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderProducts(e.target.value.toLowerCase());
        });
    }
}

function renderProducts(searchTerm = '') {
    const productsList = document.getElementById('products-list');
    if (!productsList) return;
    
    let products = AppState.products;
    
    if (searchTerm) {
        products = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.brand?.toLowerCase().includes(searchTerm)
        );
    }
    
    productsList.innerHTML = products.map(product => `
        <div class="list-item">
            <div class="list-item-header">
                <div class="list-item-title">${product.name}</div>
                <div class="list-item-meta">${formatCurrency(product.price || 0)}</div>
            </div>
            <div class="list-item-meta">
                ${product.brand || ''} • SKU: ${product.sku || 'N/A'}
            </div>
        </div>
    `).join('');
}

// New Order Form
function initNewOrderForm() {
    console.log('Initializing new order form...');
    // Form initialization logic would go here
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

// Sample Data Generators (for testing)
function generateSampleOrders() {
    const sampleCustomers = ['Cigars & More 280', 'Peaceful Henry', 'The Humidor', 'Premier Cigars'];
    const orders = [];
    
    for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 90));
        
        orders.push({
            id: `ORD${1000 + i}`,
            customerName: sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)],
            date: date.toISOString().split('T')[0],
            total: Math.random() * 5000 + 500,
            items: [
                { product: 'My Father Le Bijou 1922', quantity: Math.floor(Math.random() * 10) + 1 },
                { product: 'Flor de las Antillas', quantity: Math.floor(Math.random() * 10) + 1 }
            ]
        });
    }
    
    return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateSampleCustomers() {
    return [
        { name: 'Cigars & More 280', city: 'Birmingham', state: 'AL', phone: '(205) 555-0100' },
        { name: 'Peaceful Henry', city: 'Spartanburg', state: 'SC', phone: '(864) 555-0200' },
        { name: 'The Humidor', city: 'Nashville', state: 'TN', phone: '(615) 555-0300' }
    ];
}

function generateSampleProducts() {
    return [
        { name: 'My Father Le Bijou 1922', brand: 'My Father', sku: 'MF-LB-001', price: 12.50 },
        { name: 'Flor de las Antillas', brand: 'My Father', sku: 'MF-FDLA-001', price: 10.00 },
        { name: 'The Judge', brand: 'My Father', sku: 'MF-JDG-001', price: 15.00 }
    ];
}

console.log('App script loaded');
