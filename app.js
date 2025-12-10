// MFC Orders Application
class MFCOrdersApp {
    constructor() {
        this.orders = [];
        this.customers = [];
        this.products = [];
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
        
        // Force initialize if empty
        if (this.customers.length === 0 || this.products.length === 0) {
            this.initializeSampleData();
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
            date: document.getElementById('orderDate').value,
            poNumber: document.getElementById('orderPO').value || null,
            items: this.currentOrderItems,
            subtotal: this.calculateSubtotal(),
            total: this.calculateTotal(),
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
            street: document.getElementById('customerStreet').value,
            city: document.getElementById('customerCity').value,
            state: document.getElementById('customerState').value,
            zip: document.getElementById('customerZip').value,
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
            filtered = filtered.filter(c => c.state === this.orderStateFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.city.toLowerCase().includes(searchTerm)
            );
        }
        
        // Update select options
        const select = document.getElementById('orderCustomer');
        select.innerHTML = '<option value="">Select customer...</option>' +
            filtered.map(c => `<option value="${c.id}">${c.name} - ${c.city}, ${c.state}</option>`).join('');
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
            filtered = filtered.filter(c => c.state === this.selectedState);
        }
        
        // Search filter
        const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.city.toLowerCase().includes(searchTerm)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No customers match your filters</h3></div>';
            return;
        }

        container.innerHTML = filtered.map(customer => `
            <div class="customer-card">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-info">${customer.city}, ${customer.state}</div>
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

    generateOrderPDF(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Simple text-based PDF content
        let content = `MY FATHER CIGARS ORDER\n\n`;
        content += `Order Date: ${this.formatDate(order.date)}\n`;
        content += `Customer: ${order.customerName}\n`;
        if (order.poNumber) content += `PO Number: ${order.poNumber}\n`;
        content += `\n--- ORDER ITEMS ---\n\n`;
        
        order.items.forEach(item => {
            content += `${item.productName}\n`;
            content += `  SKU: ${item.sku}\n`;
            content += `  Qty: ${item.quantity} @ ${this.formatCurrency(item.price)} = ${this.formatCurrency(item.total)}\n\n`;
        });
        
        content += `\n--- TOTALS ---\n`;
        content += `Subtotal: ${this.formatCurrency(order.subtotal)}\n`;
        content += `Total: ${this.formatCurrency(order.total)}\n`;

        this.downloadFile(content, `order-${order.id}.txt`, 'text/plain');
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
        
        // Bill To / Ship To
        let y = 65;
        doc.setFont(undefined, 'bold');
        doc.text('Bill To', 20, y);
        doc.text('Ship To', 110, y);
        
        doc.setFont(undefined, 'normal');
        y += 5;
        doc.text(order.customerName, 20, y);
        if (order.customerStreet) {
            doc.text(order.customerStreet, 110, y);
        }
        
        if (order.customerContact) {
            y += 5;
            doc.text(order.customerContact, 20, y);
        }
        
        if (order.customerPhone) {
            y += 5;
            doc.text(order.customerPhone, 20, y);
        }
        
        y += 5;
        if (order.customerStreet) {
            doc.text(order.customerStreet, 20, y);
            y += 5;
        }
        
        const cityState = `${order.customerCity}, ${order.customerState} ${order.customerZip}`;
        doc.text(cityState, 20, y);
        doc.text(cityState, 110, y + 5);
        
        y += 5;
        doc.text('United States', 20, y);
        doc.text('United States', 110, y);
        
        // Line Items Table
        y += 15;
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
