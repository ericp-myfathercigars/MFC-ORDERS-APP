// MFC Orders Application
class MFCOrdersApp {
    constructor() {
        this.orders = [];
        this.customers = [];
        this.products = [];
        this.historicalOrders = [];
        this.currentOrder = null;
        this.currentOrderItems = [];
        this.selectedCategory = null;
        this.selectedState = 'all';
        this.orderStateFilter = 'all';
        
        this.init();
    }

    init() {
        this.loadData();
        this.initEventListeners();
        this.renderOrders();
        this.renderCustomers();
        this.renderProducts();
        this.updateReports();
        this.checkOnlineStatus();
    }

    // Data Management
    loadData() {
        this.orders = JSON.parse(localStorage.getItem('mfc_orders') || '[]');
        this.customers = JSON.parse(localStorage.getItem('mfc_customers') || '[]');
        this.products = JSON.parse(localStorage.getItem('mfc_products') || '[]');
        this.historicalOrders = JSON.parse(localStorage.getItem('mfc_historical_orders') || '[]');
        
        // Force initialize if empty
        if (this.customers.length === 0 || this.products.length === 0) {
            this.initializeSampleData();
        }
        
        // Render analytics charts if historical data exists
        if (this.historicalOrders.length > 0) {
            setTimeout(() => {
                this.renderTopProductsChart();
                this.renderMonthlySalesChart();
            }, 100);
        }
    }

    saveData() {
        localStorage.setItem('mfc_orders', JSON.stringify(this.orders));
        localStorage.setItem('mfc_customers', JSON.stringify(this.customers));
        localStorage.setItem('mfc_products', JSON.stringify(this.products));
    }

    initializeSampleData() {
        // Use real customer and product data from mfc-data.js
        this.customers = CUSTOMER_DATA;
        this.products = PRODUCT_DATA;
        
        // Extract unique categories
        this.categories = [...new Set(this.products.map(p => p.category))].sort();
        
        this.saveData();
        this.renderCustomers();
        this.renderProducts();
    }

    // Event Listeners
    initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // New Order
        document.getElementById('newOrderBtn').addEventListener('click', () => this.openNewOrder());

        // New Customer
        document.getElementById('newCustomerBtn').addEventListener('click', () => this.openNewCustomer());
        document.getElementById('closeCustomerModal').addEventListener('click', () => this.closeCustomerModal());
        document.getElementById('cancelCustomerBtn').addEventListener('click', () => this.closeCustomerModal());
        document.getElementById('customerForm').addEventListener('submit', (e) => this.saveCustomer(e));

        // State filters - customers view
        document.querySelectorAll('.state-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedState = e.target.dataset.state;
                this.renderCustomers();
            });
        });

        // State filters - order form
        document.querySelectorAll('.state-btn-compact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.state-btn-compact').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.orderStateFilter = e.target.dataset.state;
                this.filterOrderCustomers();
            });
        });

        // Customer search in order form
        document.getElementById('orderCustomerSearch').addEventListener('input', () => this.filterOrderCustomers());

        // Order Modal
        document.getElementById('closeOrderModal').addEventListener('click', () => this.closeOrderModal());
        document.getElementById('cancelOrderBtn').addEventListener('click', () => this.closeOrderModal());
        document.getElementById('orderForm').addEventListener('submit', (e) => this.saveOrder(e));
        document.getElementById('addItemBtn').addEventListener('click', () => this.openItemModal());

        // Item Modal
        document.getElementById('closeItemModal').addEventListener('click', () => this.closeItemModal());
        document.getElementById('cancelItemBtn').addEventListener('click', () => this.closeItemModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.addItem(e));
        document.getElementById('itemCategory').addEventListener('change', (e) => this.onCategoryChange(e));
        document.getElementById('itemProduct').addEventListener('change', (e) => this.updateItemPrice(e));

        // Search
        document.getElementById('customerSearch').addEventListener('input', (e) => this.searchCustomers(e.target.value));
        document.getElementById('productSearch').addEventListener('input', (e) => this.searchProducts(e.target.value));

        // Reports
        document.getElementById('exportOrdersBtn').addEventListener('click', () => this.exportOrdersCSV());
        document.getElementById('exportReportBtn').addEventListener('click', () => this.generateSalesReport());

        // Analytics
        document.getElementById('importHistoricalBtn').addEventListener('click', () => this.importHistoricalData());
        document.getElementById('searchHistoryBtn').addEventListener('click', () => this.searchHistory());
        document.getElementById('historyCustomerSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchHistory();
        });

        // Modal backdrop click
        document.getElementById('orderModal').addEventListener('click', (e) => {
            if (e.target.id === 'orderModal') this.closeOrderModal();
        });
        document.getElementById('itemModal').addEventListener('click', (e) => {
            if (e.target.id === 'itemModal') this.closeItemModal();
        });

        // Online/Offline status
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
    }

    // View Management
    switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById(viewName + 'View').classList.add('active');
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    }

    // Order Management
    openNewOrder() {
        this.currentOrder = null;
        this.currentOrderItems = [];
        document.getElementById('orderModalTitle').textContent = 'New Order';
        document.getElementById('orderForm').reset();
        document.getElementById('orderDate').valueAsDate = new Date();
        
        // Auto-generate PO number
        const autoPO = this.generatePONumber();
        document.getElementById('orderPO').value = autoPO;
        document.getElementById('orderPO').placeholder = autoPO;
        
        this.populateCustomerSelect();
        this.renderOrderItems();
        this.updateOrderTotals();
        document.getElementById('orderModal').classList.add('active');
    }

    generatePONumber() {
        const year = new Date().getFullYear();
        const yearPrefix = year.toString();
        
        // Find all orders with PO numbers starting with this year
        const yearOrders = this.orders.filter(o => 
            o.poNumber && o.poNumber.startsWith(yearPrefix)
        );
        
        // Find the highest number for this year
        let maxNum = 0;
        yearOrders.forEach(o => {
            // Extract the last 4 digits
            const numPart = o.poNumber.substring(4);
            const num = parseInt(numPart);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        });
        
        // Next number, padded to 4 digits
        const nextNum = (maxNum + 1).toString().padStart(4, '0');
        return yearPrefix + nextNum;
    }

    editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        this.currentOrder = order;
        this.currentOrderItems = [...order.items];
        
        document.getElementById('orderModalTitle').textContent = 'Edit Order';
        document.getElementById('orderCustomer').value = order.customerId;
        document.getElementById('orderDate').value = order.date;
        document.getElementById('orderPO').value = order.poNumber || '';
        
        this.populateCustomerSelect();
        this.renderOrderItems();
        this.updateOrderTotals();
        document.getElementById('orderModal').classList.add('active');
    }

    closeOrderModal() {
        document.getElementById('orderModal').classList.remove('active');
        this.currentOrder = null;
        this.currentOrderItems = [];
    }

    saveOrder(e) {
        e.preventDefault();
        
        const customerId = parseInt(document.getElementById('orderCustomer').value);
        const customer = this.customers.find(c => c.id === customerId);
        
        if (!customer) {
            alert('Please select a customer');
            return;
        }

        if (this.currentOrderItems.length === 0) {
            alert('Please add at least one item');
            return;
        }

        const order = {
            id: this.currentOrder?.id || Date.now(),
            customerId: customerId,
            customerName: customer.name,
            customerContact: customer.contactName,
            customerPhone: customer.phone,
            date: document.getElementById('orderDate').value,
            poNumber: document.getElementById('orderPO').value || this.generatePONumber(),
            items: this.currentOrderItems,
            subtotal: this.calculateSubtotal(),
            total: this.calculateTotal(),
            // Shipping address
            shipStreet: customer.shipStreet,
            shipCity: customer.shipCity,
            shipState: customer.shipState,
            shipZip: customer.shipZip,
            // Billing address (may be empty)
            billStreet: customer.billStreet,
            billCity: customer.billCity,
            billState: customer.billState,
            billZip: customer.billZip,
            createdAt: this.currentOrder?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.currentOrder) {
            const index = this.orders.findIndex(o => o.id === this.currentOrder.id);
            this.orders[index] = order;
        } else {
            this.orders.unshift(order);
        }

        this.saveData();
        this.renderOrders();
        this.updateReports();
        this.closeOrderModal();
    }

    deleteOrder(orderId) {
        if (!confirm('Are you sure you want to delete this order?')) return;
        
        this.orders = this.orders.filter(o => o.id !== orderId);
        this.saveData();
        this.renderOrders();
        this.updateReports();
    }

    // Customer Management
    openNewCustomer() {
        document.getElementById('customerModalTitle').textContent = 'New Customer';
        document.getElementById('customerForm').reset();
        document.getElementById('customerModal').classList.add('active');
    }

    closeCustomerModal() {
        document.getElementById('customerModal').classList.remove('active');
    }

    saveCustomer(e) {
        e.preventDefault();
        
        const customer = {
            id: Date.now(),
            name: document.getElementById('customerName').value,
            contactName: document.getElementById('customerContact').value || null,
            tier: document.getElementById('customerTier').value,
            shipStreet: document.getElementById('customerShipStreet').value,
            shipCity: document.getElementById('customerShipCity').value,
            shipState: document.getElementById('customerShipState').value,
            shipZip: document.getElementById('customerShipZip').value,
            billStreet: document.getElementById('customerBillStreet').value,
            billCity: document.getElementById('customerBillCity').value,
            billState: document.getElementById('customerBillState').value,
            billZip: document.getElementById('customerBillZip').value,
            phone: document.getElementById('customerPhone').value,
            email: document.getElementById('customerEmail').value,
            ytdSales: 0
        };
        
        this.customers.push(customer);
        this.customers.sort((a, b) => a.name.localeCompare(b.name));
        this.saveData();
        this.renderCustomers();
        this.closeCustomerModal();
        
        alert(`Customer "${customer.name}" added successfully!`);
    }

    filterOrderCustomers() {
        const searchTerm = document.getElementById('orderCustomerSearch').value.toLowerCase();
        
        let filtered = this.customers;
        
        // Apply state filter
        if (this.orderStateFilter && this.orderStateFilter !== 'all') {
            filtered = filtered.filter(c => c.shipState === this.orderStateFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.shipCity.toLowerCase().includes(searchTerm)
            );
        }
        
        // Update select options
        const select = document.getElementById('orderCustomer');
        select.innerHTML = '<option value="">Select customer...</option>' +
            filtered.map(c => `<option value="${c.id}">${c.name} - ${c.shipCity}, ${c.shipState}</option>`).join('');
    }

    // Item Management
    openItemModal() {
        document.getElementById('itemForm').reset();
        this.populateCategorySelect();
        // Disable product select until category is chosen
        document.getElementById('itemProduct').disabled = true;
        document.getElementById('itemProduct').innerHTML = '<option value="">Select category first...</option>';
        document.getElementById('itemModal').classList.add('active');
    }

    closeItemModal() {
        document.getElementById('itemModal').classList.remove('active');
    }

    addItem(e) {
        e.preventDefault();
        
        const productId = parseInt(document.getElementById('itemProduct').value);
        const product = this.products.find(p => p.id === productId);
        const quantity = parseInt(document.getElementById('itemQuantity').value);
        const price = parseFloat(document.getElementById('itemPrice').value);

        if (!product) {
            alert('Please select a product');
            return;
        }

        const item = {
            id: Date.now(),
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: quantity,
            price: price,
            total: quantity * price
        };

        this.currentOrderItems.push(item);
        this.renderOrderItems();
        this.updateOrderTotals();
        this.closeItemModal();
    }

    removeItem(itemId) {
        this.currentOrderItems = this.currentOrderItems.filter(i => i.id !== itemId);
        this.renderOrderItems();
        this.updateOrderTotals();
    }

    updateItemPrice(e) {
        const productId = parseInt(e.target.value);
        const product = this.products.find(p => p.id === productId);
        if (product) {
            document.getElementById('itemPrice').value = product.price.toFixed(2);
        }
    }

    // Calculations
    calculateSubtotal() {
        return this.currentOrderItems.reduce((sum, item) => sum + item.total, 0);
    }

    calculateTotal() {
        return this.calculateSubtotal();
    }

    updateOrderTotals() {
        const subtotal = this.calculateSubtotal();
        const total = this.calculateTotal();
        
        document.getElementById('orderSubtotal').textContent = this.formatCurrency(subtotal);
        document.getElementById('orderTotal').textContent = this.formatCurrency(total);
    }

    // Rendering
    renderOrders() {
        const container = document.getElementById('ordersList');
        
        if (this.orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No orders yet</h3>
                    <p>Click "New Order" to create your first order</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.orders.map(order => `
            <div class="order-card" onclick="app.viewOrderDetails(${order.id})">
                <div class="order-card-header">
                    <div class="order-customer">${order.customerName}</div>
                    <div class="order-total">${this.formatCurrency(order.total)}</div>
                </div>
                <div class="order-meta">
                    <div class="order-date">📅 ${this.formatDate(order.date)}</div>
                    <div class="order-items-count">📦 ${order.items.length} items</div>
                    ${order.poNumber ? `<div>PO: ${order.poNumber}</div>` : ''}
                </div>
                <div class="order-actions">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); app.editOrder(${order.id})">Edit</button>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); app.emailOrder(${order.id})">Email</button>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); app.generateOrderPDF(${order.id})">PDF</button>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); app.deleteOrder(${order.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    renderOrderItems() {
        const container = document.getElementById('orderItems');
        
        if (this.currentOrderItems.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 1rem;">No items added yet</p>';
            return;
        }

        container.innerHTML = this.currentOrderItems.map(item => `
            <div class="order-item">
                <div class="order-item-info">
                    <div class="order-item-name">${item.productName}</div>
                    <div class="order-item-details">${item.quantity} × ${this.formatCurrency(item.price)}</div>
                </div>
                <div class="order-item-total">${this.formatCurrency(item.total)}</div>
                <button class="order-item-remove" onclick="app.removeItem(${item.id})">✕</button>
            </div>
        `).join('');
    }

    renderCustomers() {
        const container = document.getElementById('customersGrid');
        
        if (this.customers.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No customers</h3></div>';
            return;
        }

        // Apply filters
        let filtered = this.customers;
        
        // State filter
        if (this.selectedState && this.selectedState !== 'all') {
            filtered = filtered.filter(c => c.shipState === this.selectedState);
        }
        
        // Search filter
        const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.shipCity.toLowerCase().includes(searchTerm)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No customers match your filters</h3></div>';
            return;
        }

        container.innerHTML = filtered.map(customer => `
            <div class="customer-card">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-info">${customer.shipCity}, ${customer.shipState}</div>
                ${customer.contactName ? `<div class="customer-info">${customer.contactName}</div>` : ''}
                ${customer.ytdSales ? `<div class="customer-info">YTD: ${this.formatCurrency(customer.ytdSales)}</div>` : ''}
                <span class="customer-tier tier-${customer.tier.toLowerCase()}">${customer.tier}</span>
            </div>
        `).join('');
    }

    renderProducts() {
        const container = document.getElementById('productsGrid');
        
        if (this.products.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No products</h3></div>';
            return;
        }

        container.innerHTML = this.products.map(product => `
            <div class="product-card">
                <div class="product-name">${product.name}</div>
                <div class="product-info">SKU: ${product.sku}</div>
                <div class="product-info">Price: ${this.formatCurrency(product.price)}</div>
                <div class="product-info">Box Size: ${product.boxSize} units</div>
            </div>
        `).join('');
    }

    // Populate dropdowns
    populateCategorySelect() {
        const categories = [...new Set(this.products.map(p => p.category))].sort();
        const select = document.getElementById('itemCategory');
        select.innerHTML = '<option value="">Select category...</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    onCategoryChange(e) {
        const category = e.target.value;
        const productSelect = document.getElementById('itemProduct');
        
        if (!category) {
            productSelect.disabled = true;
            productSelect.innerHTML = '<option value="">Select category first...</option>';
            return;
        }
        
        // Filter products by category
        const filtered = this.products.filter(p => p.category === category);
        productSelect.disabled = false;
        productSelect.innerHTML = '<option value="">Select product...</option>' +
            filtered.map(p => `<option value="${p.id}">${p.name} - ${this.formatCurrency(p.price)}</option>`).join('');
    }
    
    populateCustomerSelect() {
        this.orderStateFilter = 'all';
        document.querySelectorAll('.state-btn-compact').forEach(b => b.classList.remove('active'));
        document.querySelector('.state-btn-compact[data-state="all"]')?.classList.add('active');
        document.getElementById('orderCustomerSearch').value = '';
        this.filterOrderCustomers();
    }

    populateProductSelect() {
        const select = document.getElementById('itemProduct');
        select.innerHTML = '<option value="">Select product...</option>' +
            this.products.map(p => `<option value="${p.id}">${p.name} - ${this.formatCurrency(p.price)}</option>`).join('');
    }

    // Search
    searchCustomers(query) {
        const filtered = this.customers.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.city.toLowerCase().includes(query.toLowerCase()) ||
            c.state.toLowerCase().includes(query.toLowerCase())
        );
        
        const container = document.getElementById('customersGrid');
        container.innerHTML = filtered.map(customer => `
            <div class="customer-card">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-info">${customer.city}, ${customer.state}</div>
                <div class="customer-info">YTD: ${this.formatCurrency(customer.ytdSales)}</div>
                <span class="customer-tier tier-${customer.tier.toLowerCase()}">${customer.tier}</span>
            </div>
        `).join('');
    }

    searchProducts(query) {
        const filtered = this.products.filter(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase())
        );
        
        const container = document.getElementById('productsGrid');
        container.innerHTML = filtered.map(product => `
            <div class="product-card">
                <div class="product-name">${product.name}</div>
                <div class="product-info">SKU: ${product.sku}</div>
                <div class="product-info">Price: ${this.formatCurrency(product.price)}</div>
                <div class="product-info">Box Size: ${product.boxSize} units</div>
            </div>
        `).join('');
    }

    // Reports
    updateReports() {
        const totalSales = this.orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = this.orders.length;
        
        // Find top customer
        const customerSales = {};
        this.orders.forEach(order => {
            customerSales[order.customerName] = (customerSales[order.customerName] || 0) + order.total;
        });
        
        const topCustomer = Object.entries(customerSales)
            .sort((a, b) => b[1] - a[1])[0];
        
        document.getElementById('totalSales').textContent = this.formatCurrency(totalSales);
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('topCustomer').textContent = topCustomer ? topCustomer[0] : '—';
    }

    // Export Functions
    exportOrdersCSV() {
        if (this.orders.length === 0) {
            alert('No orders to export');
            return;
        }

        let csv = 'Date,Customer,PO Number,Items,Subtotal,Total\n';
        
        this.orders.forEach(order => {
            const itemsList = order.items.map(i => `${i.productName} (${i.quantity})`).join('; ');
            csv += `${order.date},"${order.customerName}","${order.poNumber || ''}","${itemsList}",${order.subtotal},${order.total}\n`;
        });

        this.downloadFile(csv, 'mfc-orders.csv', 'text/csv');
    }

    generateSalesReport() {
        if (this.orders.length === 0) {
            alert('No orders to report');
            return;
        }

        const totalSales = this.orders.reduce((sum, o) => sum + o.total, 0);
        const avgOrder = totalSales / this.orders.length;

        let report = `MFC ORDERS SALES REPORT\n`;
        report += `Generated: ${new Date().toLocaleString()}\n\n`;
        report += `SUMMARY\n`;
        report += `Total Orders: ${this.orders.length}\n`;
        report += `Total Sales: ${this.formatCurrency(totalSales)}\n`;
        report += `Average Order: ${this.formatCurrency(avgOrder)}\n\n`;
        report += `ORDERS BY CUSTOMER\n`;
        
        const byCustomer = {};
        this.orders.forEach(order => {
            if (!byCustomer[order.customerName]) {
                byCustomer[order.customerName] = { count: 0, total: 0 };
            }
            byCustomer[order.customerName].count++;
            byCustomer[order.customerName].total += order.total;
        });

        Object.entries(byCustomer)
            .sort((a, b) => b[1].total - a[1].total)
            .forEach(([name, data]) => {
                report += `${name}: ${data.count} orders, ${this.formatCurrency(data.total)}\n`;
            });

        this.downloadFile(report, 'mfc-sales-report.txt', 'text/plain');
    }

    viewOrderDetails(orderId) {
        // For now, just edit the order
        this.editOrder(orderId);
    }

    generateOrderPDF(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Company Header
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('My Father Cigars', 20, 20);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('1890 NW 96th Ave', 20, 27);
        doc.text('Doral, FL 33172', 20, 32);
        doc.text('305-468-9501', 20, 37);
        
        // Work Order Title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Work Order EP', 140, 20);
        
        // Order Info
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Number', 130, 27);
        doc.text('Date', 130, 32);
        doc.text('P.O.', 130, 37);
        doc.text('Terms', 130, 42);
        doc.text('Ship Via', 130, 47);
        doc.text('Ship Date', 130, 52);
        
        doc.text(String(order.id), 160, 27);
        doc.text(this.formatDate(order.date), 160, 32);
        doc.text(order.poNumber || '', 160, 37);
        
        // Determine billing address (use billing if exists, otherwise use shipping)
        const hasSeparateBilling = order.billStreet && order.billCity && order.billState;
        
        // Bill To section
        let y = 65;
        doc.setFont(undefined, 'bold');
        doc.text('Bill To', 20, y);
        doc.setFont(undefined, 'normal');
        y += 5;
        doc.text(order.customerName, 20, y);
        
        if (order.customerContact) {
            y += 5;
            doc.text(order.customerContact, 20, y);
        }
        
        if (order.customerPhone) {
            y += 5;
            doc.text(order.customerPhone, 20, y);
        }
        
        y += 5;
        // Use billing address if exists, otherwise use shipping
        if (hasSeparateBilling) {
            if (order.billStreet) {
                doc.text(order.billStreet, 20, y);
                y += 5;
            }
            const billCityState = `${order.billCity}, ${order.billState} ${order.billZip || ''}`;
            doc.text(billCityState, 20, y);
        } else {
            if (order.shipStreet) {
                doc.text(order.shipStreet, 20, y);
                y += 5;
            }
            const shipCityState = `${order.shipCity}, ${order.shipState} ${order.shipZip || ''}`;
            doc.text(shipCityState, 20, y);
        }
        
        y += 5;
        doc.text('United States', 20, y);
        
        // Ship To section
        let shipY = 70;
        doc.setFont(undefined, 'bold');
        doc.text('Ship To', 110, shipY);
        doc.setFont(undefined, 'normal');
        shipY += 5;
        
        if (order.shipStreet) {
            doc.text(order.shipStreet, 110, shipY);
            shipY += 5;
        }
        
        const shipCityState = `${order.shipCity}, ${order.shipState} ${order.shipZip || ''}`;
        doc.text(shipCityState, 110, shipY);
        
        shipY += 5;
        doc.text('United States', 110, shipY);
        
        // Line Items Table
        y = Math.max(y, shipY) + 10;
        doc.setFont(undefined, 'bold');
        doc.text('Qty', 20, y);
        doc.text('ID', 30, y);
        doc.text('Description', 60, y);
        doc.text('Ext', 180, y, { align: 'right' });
        
        y += 2;
        doc.line(20, y, 190, y);
        
        // Items
        y += 7;
        doc.setFont(undefined, 'normal');
        
        order.items.forEach(item => {
            doc.text(String(item.quantity), 20, y);
            doc.text(item.sku, 30, y);
            
            // Wrap long product names
            const productName = item.productName;
            if (productName.length > 60) {
                const lines = doc.splitTextToSize(productName, 110);
                doc.text(lines, 60, y);
                y += (lines.length - 1) * 5;
            } else {
                doc.text(productName, 60, y);
            }
            
            doc.text(this.formatCurrency(item.total), 190, y, { align: 'right' });
            y += 5;
            
            // Check if we need a new page
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
        });
        
        // Totals
        y += 5;
        doc.line(20, y, 190, y);
        y += 7;
        
        doc.setFont(undefined, 'bold');
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
        doc.text(`Total (${totalItems})`, 20, y);
        doc.text(this.formatCurrency(order.total), 190, y, { align: 'right' });
        
        y += 5;
        doc.text('Payments', 20, y);
        doc.text('$0.00', 190, y, { align: 'right' });
        
        y += 5;
        doc.text('Balance', 20, y);
        doc.text(this.formatCurrency(order.total), 190, y, { align: 'right' });
        
        // Footer
        y += 10;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        const footer = [
            'Thank you! This is not a bill, this is a purchase order only and does',
            'NOT include shipping charges. Your payment method is on file and',
            'you will be billed at the time of shipping, with an invoice on package.',
            'All charges to your account will appear from My Father Cigars.'
        ];
        
        footer.forEach(line => {
            doc.text(line, 20, y);
            y += 4;
        });
        
        // Page number
        doc.text('Page 1 of 1', 190, 285, { align: 'right' });
        
        // Save PDF
        const filename = `MFC_Order_${order.id}_${order.customerName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        doc.save(filename);
    }

    emailOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Get customer email
        const customer = this.customers.find(c => c.id === order.customerId);
        const customerEmail = customer?.email || '';

        // If no customer email, alert user
        if (!customerEmail) {
            alert('This customer does not have an email address on file. Please add one in the customer profile first.');
            return;
        }

        // First, generate and download the PDF
        this.generateOrderPDF(orderId);
        
        // Small delay to ensure PDF download starts, then open email
        setTimeout(() => {
            // Email components
            const to = customerEmail;
            const cc = 'ericp@myfathercigars.com';
            const bcc = 'customerservice@myfathercigars.com';
            const subject = `Purchase Order ${order.poNumber || order.id}`;
            
            // Simple email body
            const body = `Your purchase order is attached.

Your balance for this purchase order is ${this.formatCurrency(order.total)} and does not include shipping charges. Shipping charges will be included on your final invoice.`;

            // Build mailto URL
            const mailtoUrl = `mailto:${to}?cc=${encodeURIComponent(cc)}&bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Open email client
            window.location.href = mailtoUrl;
        }, 500); // 500ms delay to let PDF download start
    }

    // Analytics
    isPromotionalItem(sku) {
        // Exclude promotional items: MFPR* prefix and MFPETR
        return sku.startsWith('MFPR') || sku === 'MFPETR';
    }

    importHistoricalData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!Array.isArray(data)) {
                    alert('Invalid file format. Expected an array of orders.');
                    return;
                }
                
                this.historicalOrders = data;
                localStorage.setItem('mfc_historical_orders', JSON.stringify(data));
                
                alert(`Successfully imported ${data.length} historical orders!`);
                
                // Show summary
                const totalRevenue = data.reduce((sum, o) => sum + o.total, 0);
                const customers = new Set(data.map(o => o.customerName)).size;
                
                document.getElementById('customerHistoryResults').innerHTML = `
                    <div style="padding: 1.5rem; background: var(--background); border-radius: 8px; text-align: center;">
                        <h3 style="color: var(--primary); margin-bottom: 1rem;">✅ Import Complete</h3>
                        <div style="font-size: 1.1rem;">
                            <strong>${data.length}</strong> orders imported<br>
                            <strong>${customers}</strong> unique customers<br>
                            <strong>${this.formatCurrency(totalRevenue)}</strong> total revenue
                        </div>
                        <p style="margin-top: 1rem; color: var(--text-secondary);">
                            Use the search box above to view customer purchase history
                        </p>
                    </div>
                `;
                
                // Render charts
                this.renderTopProductsChart();
                this.renderMonthlySalesChart();
            } catch (error) {
                alert('Error importing file: ' + error.message);
            }
        };
        
        input.click();
    }

    searchHistory() {
        const searchTerm = document.getElementById('historyCustomerSearch').value.trim();
        
        if (!searchTerm) {
            alert('Please enter a customer name to search');
            return;
        }
        
        if (this.historicalOrders.length === 0) {
            alert('No historical data loaded. Please import historical data first.');
            return;
        }
        
        const searchLower = searchTerm.toLowerCase();
        const matchingOrders = this.historicalOrders.filter(order => 
            order.customerName.toLowerCase().includes(searchLower)
        );
        
        if (matchingOrders.length === 0) {
            document.getElementById('customerHistoryResults').innerHTML = `
                <p>No orders found for "${searchTerm}"</p>
            `;
            return;
        }
        
        // Sort by date ascending (chronological order - oldest first)
        matchingOrders.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        this.renderCustomerHistory(matchingOrders);
    }

    renderCustomerHistory(orders) {
        const container = document.getElementById('customerHistoryResults');
        
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const avgOrderSize = totalRevenue / orders.length;
        
        // Group orders by month for trend
        const monthlyData = {};
        orders.forEach(order => {
            const month = order.date.substring(0, 7); // YYYY-MM
            monthlyData[month] = (monthlyData[month] || 0) + order.total;
        });
        
        // Get all unique SKUs (excluding promotional items)
        const allSkus = new Set();
        const skuFrequency = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                // Skip promotional items
                if (!this.isPromotionalItem(item.sku)) {
                    allSkus.add(item.sku);
                    skuFrequency[item.sku] = (skuFrequency[item.sku] || 0) + item.quantity;
                }
            });
        });
        
        // Top 5 SKUs (excluding promotional items)
        const topSkus = Object.entries(skuFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        // First and last order dates (orders are in chronological order)
        const firstOrder = orders[0];
        const lastOrder = orders[orders.length - 1];
        
        container.innerHTML = `
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: var(--background); border-radius: 8px;">
                <h3 style="color: var(--primary); margin-bottom: 1rem;">${orders[0].customerName}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Orders</div>
                        <div style="font-size: 1.5rem; font-weight: 600;">${orders.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Revenue</div>
                        <div style="font-size: 1.5rem; font-weight: 600;">${this.formatCurrency(totalRevenue)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Avg Order</div>
                        <div style="font-size: 1.5rem; font-weight: 600;">${this.formatCurrency(avgOrderSize)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">First Order</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">${this.formatDate(firstOrder.date)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Last Order</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">${this.formatDate(lastOrder.date)}</div>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <strong>Top 5 Products:</strong><br>
                    ${topSkus.map(([sku, qty]) => `<span style="display: inline-block; margin-right: 1rem;">${sku}: ${qty} units</span>`).join('')}
                </div>
            </div>
            
            <h4 style="margin-bottom: 0.75rem;">Order History (${orders.length} orders - chronological)</h4>
            ${orders.map(order => `
                <div class="history-order">
                    <div class="history-order-header">
                        <span>Order #${order.orderNumber} • ${this.formatDate(order.date)}</span>
                        <span style="font-weight: 700;">${this.formatCurrency(order.total)}</span>
                    </div>
                    ${order.contactName ? `<div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Contact: ${order.contactName}</div>` : ''}
                    <div class="history-order-items">
                        ${order.items.map(item => 
                            `<div style="padding: 0.25rem 0; display: flex; justify-content: space-between;">
                                <span>${item.quantity}x ${item.productName}</span>
                                <span>${this.formatCurrency(item.total)}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        `;
        
        // Also analyze for dropoffs and reorder predictions
        this.analyzeDropoffs(orders);
        this.analyzeReorderPatterns(orders);
    }

    analyzeDropoffs(orders) {
        const midYearDate = new Date('2025-07-01');
        
        // Get SKUs from first half
        const firstHalfOrders = orders.filter(o => new Date(o.date) < midYearDate);
        const firstHalfSKUs = new Map();
        firstHalfOrders.forEach(order => {
            order.items.forEach(item => {
                if (!this.isPromotionalItem(item.sku)) {
                    const current = firstHalfSKUs.get(item.sku) || { qty: 0, name: item.productName };
                    current.qty += item.quantity;
                    firstHalfSKUs.set(item.sku, current);
                }
            });
        });
        
        // Get SKUs from second half
        const secondHalfOrders = orders.filter(o => new Date(o.date) >= midYearDate);
        const secondHalfSKUs = new Set();
        secondHalfOrders.forEach(order => {
            order.items.forEach(item => {
                if (!this.isPromotionalItem(item.sku)) {
                    secondHalfSKUs.add(item.sku);
                }
            });
        });
        
        // Find dropoffs
        const dropoffs = [];
        firstHalfSKUs.forEach((data, sku) => {
            if (!secondHalfSKUs.has(sku) && data.qty >= 2) { // Only show if ordered 2+ times
                dropoffs.push({
                    sku: sku,
                    name: data.name,
                    quantity: data.qty
                });
            }
        });
        
        // Sort by quantity descending
        dropoffs.sort((a, b) => b.quantity - a.quantity);
        
        // Display dropoffs
        const section = document.getElementById('skuDropoffSection');
        const container = document.getElementById('skuDropoffResults');
        
        if (dropoffs.length > 0) {
            section.style.display = 'block';
            container.innerHTML = dropoffs.map(item => `
                <div class="dropoff-item">
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">${item.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        SKU: ${item.sku} • Ordered ${item.quantity}x in first half of 2025, but not in second half
                    </div>
                </div>
            `).join('');
        } else {
            section.style.display = 'none';
        }
    }

    analyzeReorderPatterns(orders) {
        // Group orders by SKU to find patterns
        const skuOrders = new Map();
        
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!this.isPromotionalItem(item.sku)) {
                    if (!skuOrders.has(item.sku)) {
                        skuOrders.set(item.sku, {
                            name: item.productName,
                            dates: [],
                            quantities: []
                        });
                    }
                    const data = skuOrders.get(item.sku);
                    data.dates.push(new Date(order.date));
                    data.quantities.push(item.quantity);
                }
            });
        });
        
        // Analyze patterns
        const predictions = [];
        const today = new Date();
        
        skuOrders.forEach((data, sku) => {
            if (data.dates.length >= 2) { // Need at least 2 orders to predict
                // Sort dates
                data.dates.sort((a, b) => a - b);
                
                // Calculate average days between orders
                let totalDays = 0;
                for (let i = 1; i < data.dates.length; i++) {
                    const days = (data.dates[i] - data.dates[i-1]) / (1000 * 60 * 60 * 24);
                    totalDays += days;
                }
                const avgDays = totalDays / (data.dates.length - 1);
                
                // Last order info
                const lastOrderDate = data.dates[data.dates.length - 1];
                const daysSinceLastOrder = (today - lastOrderDate) / (1000 * 60 * 60 * 24);
                
                // Calculate when next order is expected
                const expectedReorderDate = new Date(lastOrderDate.getTime() + (avgDays * 24 * 60 * 60 * 1000));
                const daysUntilReorder = (expectedReorderDate - today) / (1000 * 60 * 60 * 24);
                
                // Determine status
                let status = 'on-schedule';
                let statusText = 'On Schedule';
                if (daysSinceLastOrder > avgDays) {
                    status = 'overdue';
                    statusText = 'Overdue';
                } else if (daysUntilReorder <= 14) {
                    status = 'due-soon';
                    statusText = 'Due Soon';
                }
                
                predictions.push({
                    sku: sku,
                    name: data.name,
                    avgDays: Math.round(avgDays),
                    daysSince: Math.round(daysSinceLastOrder),
                    daysUntil: Math.round(daysUntilReorder),
                    status: status,
                    statusText: statusText,
                    orderCount: data.dates.length,
                    lastOrderDate: lastOrderDate
                });
            }
        });
        
        // Sort: overdue first, then due soon, then by days until reorder
        predictions.sort((a, b) => {
            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
            if (b.status === 'overdue' && a.status !== 'overdue') return 1;
            if (a.status === 'due-soon' && b.status !== 'due-soon') return -1;
            if (b.status === 'due-soon' && a.status !== 'due-soon') return 1;
            return a.daysUntil - b.daysUntil;
        });
        
        // Display top 10 predictions
        const section = document.getElementById('reorderPredictionSection');
        const container = document.getElementById('reorderPredictionResults');
        
        if (predictions.length > 0) {
            section.style.display = 'block';
            const topPredictions = predictions.slice(0, 10);
            
            container.innerHTML = topPredictions.map(item => {
                const statusClass = item.status;
                const reorderClass = item.status === 'overdue' ? 'due' : (item.status === 'due-soon' ? 'coming-soon' : '');
                
                return `
                    <div class="reorder-item ${reorderClass}">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div style="font-weight: 600;">${item.name}</div>
                            <span class="status-badge ${statusClass}">${item.statusText}</span>
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                            SKU: ${item.sku}
                        </div>
                        <div class="analytics-metric">
                            <span class="analytics-metric-label">Reorder Frequency:</span>
                            <span class="analytics-metric-value">Every ${item.avgDays} days</span>
                        </div>
                        <div class="analytics-metric">
                            <span class="analytics-metric-label">Last Ordered:</span>
                            <span class="analytics-metric-value">${this.formatDate(item.lastOrderDate.toISOString().split('T')[0])} (${item.daysSince} days ago)</span>
                        </div>
                        <div class="analytics-metric">
                            <span class="analytics-metric-label">Next Expected:</span>
                            <span class="analytics-metric-value">${item.daysUntil > 0 ? `In ${item.daysUntil} days` : `${Math.abs(item.daysUntil)} days overdue`}</span>
                        </div>
                        <div class="analytics-metric">
                            <span class="analytics-metric-label">Historical Orders:</span>
                            <span class="analytics-metric-value">${item.orderCount} times</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            section.style.display = 'none';
        }
    }

    renderTopProductsChart() {
        if (this.historicalOrders.length === 0) return;
        
        // Calculate top products
        const productCounts = {};
        this.historicalOrders.forEach(order => {
            order.items.forEach(item => {
                if (!this.isPromotionalItem(item.sku)) {
                    if (!productCounts[item.sku]) {
                        productCounts[item.sku] = {
                            name: item.productName,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productCounts[item.sku].quantity += item.quantity;
                    productCounts[item.sku].revenue += item.total;
                }
            });
        });
        
        // Get top 10
        const topProducts = Object.entries(productCounts)
            .sort((a, b) => b[1].quantity - a[1].quantity)
            .slice(0, 10);
        
        const container = document.getElementById('topProductsChart');
        
        if (topProducts.length === 0) {
            container.innerHTML = '<p>No product data available</p>';
            return;
        }
        
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${topProducts.map(([sku, data], index) => {
                    const maxQty = topProducts[0][1].quantity;
                    const barWidth = (data.quantity / maxQty * 100);
                    return `
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                                <span style="font-weight: 600;">${index + 1}. ${data.name}</span>
                                <span style="color: var(--text-secondary);">${data.quantity} units • ${this.formatCurrency(data.revenue)}</span>
                            </div>
                            <div style="background: var(--border); height: 24px; border-radius: 4px; overflow: hidden;">
                                <div style="background: var(--primary); height: 100%; width: ${barWidth}%; transition: width 0.3s;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderMonthlySalesChart() {
        if (this.historicalOrders.length === 0) return;
        
        // Calculate monthly sales
        const monthlySales = {};
        this.historicalOrders.forEach(order => {
            const month = order.date.substring(0, 7); // YYYY-MM
            monthlySales[month] = (monthlySales[month] || 0) + order.total;
        });
        
        // Sort by month
        const sortedMonths = Object.entries(monthlySales).sort((a, b) => a[0].localeCompare(b[0]));
        
        const container = document.getElementById('monthlySalesChart');
        
        if (sortedMonths.length === 0) {
            container.innerHTML = '<p>No sales data available</p>';
            return;
        }
        
        const maxSales = Math.max(...sortedMonths.map(([_, val]) => val));
        const totalSales = sortedMonths.reduce((sum, [_, val]) => sum + val, 0);
        const avgSales = totalSales / sortedMonths.length;
        
        container.innerHTML = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--background); border-radius: 8px; display: flex; gap: 2rem;">
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Sales</div>
                    <div style="font-size: 1.5rem; font-weight: 600;">${this.formatCurrency(totalSales)}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Average/Month</div>
                    <div style="font-size: 1.5rem; font-weight: 600;">${this.formatCurrency(avgSales)}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Peak Month</div>
                    <div style="font-size: 1.5rem; font-weight: 600;">${this.formatCurrency(maxSales)}</div>
                </div>
            </div>
            <div style="display: flex; align-items: end; gap: 0.5rem; height: 200px;">
                ${sortedMonths.map(([month, sales]) => {
                    const height = (sales / maxSales * 100);
                    const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
                    const isAboveAvg = sales > avgSales;
                    return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: ${isAboveAvg ? 'var(--primary)' : 'var(--text-secondary)'};">
                                ${this.formatCurrency(sales / 1000)}K
                            </div>
                            <div style="width: 100%; background: ${isAboveAvg ? 'var(--primary)' : '#94a3b8'}; height: ${height}%; min-height: 4px; border-radius: 4px 4px 0 0; transition: height 0.3s;" title="${monthName}: ${this.formatCurrency(sales)}"></div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${monthName}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Utilities
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    checkOnlineStatus() {
        this.updateOnlineStatus(navigator.onLine);
    }

    updateOnlineStatus(isOnline) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (isOnline) {
            statusDot.classList.remove('offline');
            statusText.textContent = 'Synced';
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new MFCOrdersApp();
    });
} else {
    app = new MFCOrdersApp();
}
