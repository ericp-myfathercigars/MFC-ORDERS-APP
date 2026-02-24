// MFC Orders Application
class MFCOrdersApp {
    constructor() {
        this.orders = [];
        this.customers = [];
        this.products = [];
        this.historicalOrders = [];
        this.yoyData = null;
        this.currentOrder = null;
        this.currentOrderItems = [];
        this.selectedCategory = null;
        this.selectedState = 'all';
        this.orderStateFilter = 'all';
        this.visitFilter = 'all';
        this.currentCustomer = null;
        this.editingProductId = null;
        this.editingCustomerId = null;
        this.expandedCategories = new Set(); // Track which product categories are expanded
        
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
        
        // Migrate customers to include visit tracking fields
        this.customers = this.customers.map(c => ({
            ...c,
            lastVisitDate: c.lastVisitDate || null,
            visitNotes: c.visitNotes || '',
            visitHistory: c.visitHistory || []
        }));
        
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
        
        // Load year-over-year comparison data
        const yoyDataStr = localStorage.getItem('mfc_yoy_data');
        if (yoyDataStr) {
            try {
                this.yoyData = JSON.parse(yoyDataStr);
                setTimeout(() => this.renderYoYComparison(), 100);
            } catch (error) {
                console.error('Error loading YoY data:', error);
            }
        } else {
            // Render empty state
            setTimeout(() => this.renderYoYComparison(), 100);
        }
        
        // Render monthly orders on load
        setTimeout(() => this.renderMonthlyOrders(), 100);
    }

    saveData() {
        localStorage.setItem('mfc_orders', JSON.stringify(this.orders));
        localStorage.setItem('mfc_customers', JSON.stringify(this.customers));
        localStorage.setItem('mfc_products', JSON.stringify(this.products));
        
        // Refresh monthly orders view if it exists
        if (document.getElementById('monthlyOrdersContainer')) {
            this.renderMonthlyOrders();
        }
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
        
        // Customer CSV Import/Export
        document.getElementById('exportCustomersCSV').addEventListener('click', () => this.exportCustomersCSV());
        document.getElementById('importCustomersCSV').addEventListener('click', () => document.getElementById('customerCSVInput').click());
        document.getElementById('customerCSVInput').addEventListener('change', (e) => this.importCustomersCSV(e));

        // New Product
        document.getElementById('newProductBtn').addEventListener('click', () => this.openNewProduct());
        document.getElementById('closeProductModal').addEventListener('click', () => this.closeProductModal());
        document.getElementById('cancelProductBtn').addEventListener('click', () => this.closeProductModal());
        document.getElementById('productForm').addEventListener('submit', (e) => this.saveProduct(e));
        document.getElementById('productCategory').addEventListener('change', (e) => this.onProductCategoryChange(e));

        // Customer Detail Modal (Visit Tracking)
        document.getElementById('closeCustomerDetailModal').addEventListener('click', () => this.closeCustomerDetailModal());
        document.getElementById('cancelCustomerDetailBtn').addEventListener('click', () => this.closeCustomerDetailModal());
        document.getElementById('markVisitedBtn').addEventListener('click', () => this.markVisitedToday());
        document.getElementById('saveCustomerNotesBtn').addEventListener('click', () => this.saveCustomerNotes());

        // State filters - customers view
        document.querySelectorAll('.state-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedState = e.target.dataset.state;
                this.renderCustomers();
            });
        });

        // Visit filters - customers view
        document.querySelectorAll('.visit-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.visit-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.visitFilter = e.target.dataset.visit;
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
        document.getElementById('addNoteBtn').addEventListener('click', () => this.addNoteToOrder());

        // Item Modal
        document.getElementById('closeItemModal').addEventListener('click', () => this.closeItemModal());
        document.getElementById('cancelItemBtn').addEventListener('click', () => this.closeItemModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.addItem(e));
        document.getElementById('itemCategory').addEventListener('change', (e) => this.onCategoryChange(e));
        document.getElementById('itemProduct').addEventListener('change', (e) => this.updateItemPrice(e));

        // Search
        document.getElementById('customerSearch').addEventListener('input', (e) => this.searchCustomers(e.target.value));
        
        // Product search
        document.getElementById('productSearch').addEventListener('input', () => this.renderProducts());
        document.getElementById('showActiveOnly').addEventListener('change', () => this.renderProducts());
        document.getElementById('productSearch').addEventListener('input', (e) => this.searchProducts(e.target.value));

        // Reports
        try {
            const downloadAllOrdersCSV = document.getElementById('downloadAllOrdersCSV');
            if (downloadAllOrdersCSV) {
                downloadAllOrdersCSV.addEventListener('click', () => this.downloadAllOrdersCSV());
            }
            
            const downloadAllOrdersJSON = document.getElementById('downloadAllOrdersJSON');
            if (downloadAllOrdersJSON) {
                downloadAllOrdersJSON.addEventListener('click', () => this.downloadAllOrdersJSON());
            }
            
            const importOrdersBtn = document.getElementById('importOrdersBtn');
            if (importOrdersBtn) {
                importOrdersBtn.addEventListener('click', () => this.importOrders());
            }
            
            const exportReportBtn = document.getElementById('exportReportBtn');
            if (exportReportBtn) {
                exportReportBtn.addEventListener('click', () => this.generateSalesReport());
            }
        } catch (error) {
            console.error('Error setting up Reports event listeners:', error);
        }

        // Analytics
        try {
            const importHistoricalBtn = document.getElementById('importHistoricalBtn');
            if (importHistoricalBtn) {
                console.log('Import Historical button found, attaching event listener');
                importHistoricalBtn.addEventListener('click', () => {
                    console.log('Import Historical button clicked!');
                    this.importHistoricalData();
                });
            } else {
                console.warn('importHistoricalBtn not found in DOM');
            }
            
            const importYoYBtn = document.getElementById('importYoYBtn');
            if (importYoYBtn) {
                importYoYBtn.addEventListener('click', () => this.importYoYData());
            }
            
            const searchHistoryBtn = document.getElementById('searchHistoryBtn');
            if (searchHistoryBtn) {
                searchHistoryBtn.addEventListener('click', () => this.searchHistory());
            }
            
            const exportTop10PDF = document.getElementById('exportTop10PDF');
            if (exportTop10PDF) {
                exportTop10PDF.addEventListener('click', () => this.exportTop10PDF());
            }
            
            const historyCustomerSearch = document.getElementById('historyCustomerSearch');
            if (historyCustomerSearch) {
                historyCustomerSearch.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchHistory();
                });
            }
        } catch (error) {
            console.error('Error setting up Analytics event listeners:', error);
        }

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
        
        // Update reports when switching to reports view
        if (viewName === 'reports') {
            this.renderMonthlyOrders();
        }
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
        document.getElementById('orderNotes').value = order.notes || '';
        
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
            date: document.getElementById('orderDate').value + 'T12:00:00',  // Add time to prevent timezone shift
            poNumber: document.getElementById('orderPO').value || this.generatePONumber(),
            notes: document.getElementById('orderNotes').value || '',
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
            updatedAt: new Date().toISOString(),
            emailedAt: this.currentOrder?.emailedAt || null,
            pdfDownloadedAt: this.currentOrder?.pdfDownloadedAt || null
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
        this.editingCustomerId = null;
        document.getElementById('customerModalTitle').textContent = 'New Customer';
        document.getElementById('customerForm').reset();
        document.getElementById('customerModal').classList.add('active');
    }

    editCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        this.editingCustomerId = customerId;
        
        // Populate form with customer data
        document.getElementById('customerName').value = customer.name || '';
        document.getElementById('customerContact').value = customer.contactName || '';
        document.getElementById('customerTier').value = customer.tier || 'Standard';
        document.getElementById('customerShipStreet').value = customer.shipStreet || '';
        document.getElementById('customerShipCity').value = customer.shipCity || '';
        document.getElementById('customerShipState').value = customer.shipState || '';
        document.getElementById('customerShipZip').value = customer.shipZip || '';
        document.getElementById('customerBillStreet').value = customer.billStreet || '';
        document.getElementById('customerBillCity').value = customer.billCity || '';
        document.getElementById('customerBillState').value = customer.billState || '';
        document.getElementById('customerBillZip').value = customer.billZip || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';

        // Change modal title
        document.getElementById('customerModalTitle').textContent = 'Edit Customer';
        
        // Show modal
        document.getElementById('customerModal').classList.add('active');
    }

    closeCustomerModal() {
        document.getElementById('customerModal').classList.remove('active');
        this.editingCustomerId = null;
    }

    saveCustomer(e) {
        e.preventDefault();
        
        if (this.editingCustomerId) {
            // EDIT EXISTING CUSTOMER
            const customer = this.customers.find(c => c.id === this.editingCustomerId);
            if (customer) {
                customer.name = document.getElementById('customerName').value;
                customer.contactName = document.getElementById('customerContact').value || null;
                customer.tier = document.getElementById('customerTier').value;
                customer.shipStreet = document.getElementById('customerShipStreet').value;
                customer.shipCity = document.getElementById('customerShipCity').value;
                customer.shipState = document.getElementById('customerShipState').value;
                customer.shipZip = document.getElementById('customerShipZip').value;
                customer.billStreet = document.getElementById('customerBillStreet').value;
                customer.billCity = document.getElementById('customerBillCity').value;
                customer.billState = document.getElementById('customerBillState').value;
                customer.billZip = document.getElementById('customerBillZip').value;
                customer.phone = document.getElementById('customerPhone').value;
                customer.email = document.getElementById('customerEmail').value;
                
                alert(`Customer "${customer.name}" updated successfully!`);
            }
            this.editingCustomerId = null;
        } else {
            // CREATE NEW CUSTOMER
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
                ytdSales: 0,
                // Visit tracking
                lastVisitDate: null,
                visitNotes: '',
                visitHistory: []
            };
            
            this.customers.push(customer);
            alert(`Customer "${customer.name}" added successfully!`);
        }
        
        this.customers.sort((a, b) => a.name.localeCompare(b.name));
        this.saveData();
        this.renderCustomers();
        this.closeCustomerModal();
    }

    // Customer CSV Export
    exportCustomersCSV() {
        if (this.customers.length === 0) {
            alert('No customers to export');
            return;
        }

        // CSV headers
        const headers = [
            'ID', 'Name', 'Contact Person', 'Tier', 'Phone', 'Email',
            'Ship Street', 'Ship City', 'Ship State', 'Ship Zip',
            'Bill Street', 'Bill City', 'Bill State', 'Bill Zip',
            'YTD Sales', 'Last Visit Date', 'Visit Notes'
        ];

        // Convert customers to CSV rows
        const rows = this.customers.map(c => [
            c.id,
            `"${c.name}"`,
            `"${c.contactName || ''}"`,
            c.tier,
            `"${c.phone || ''}"`,
            `"${c.email || ''}"`,
            `"${c.shipStreet}"`,
            `"${c.shipCity}"`,
            c.shipState,
            `"${c.shipZip}"`,
            `"${c.billStreet}"`,
            `"${c.billCity}"`,
            c.billState,
            `"${c.billZip}"`,
            c.ytdSales || 0,
            c.lastVisitDate || '',
            `"${c.visitNotes || ''}"`
        ].join(','));

        // Combine headers and rows
        const csv = [headers.join(','), ...rows].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mfc-customers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        alert(`Exported ${this.customers.length} customers to CSV`);
    }

    // Customer CSV Import
    importCustomersCSV(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const lines = csv.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    alert('CSV file is empty or invalid');
                    return;
                }

                // Skip header row
                const dataLines = lines.slice(1);
                const importedCustomers = [];

                dataLines.forEach((line, index) => {
                    // Parse CSV line (handle quoted fields)
                    const fields = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            fields.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current.trim());

                    if (fields.length < 14) {
                        console.warn(`Row ${index + 2}: Invalid number of fields, skipping`);
                        return;
                    }

                    const customer = {
                        id: parseInt(fields[0]) || Date.now() + index,
                        name: fields[1],
                        contactName: fields[2] || null,
                        tier: fields[3] || 'Standard',
                        phone: fields[4] || '',
                        email: fields[5] || '',
                        shipStreet: fields[6],
                        shipCity: fields[7],
                        shipState: fields[8],
                        shipZip: fields[9],
                        billStreet: fields[10],
                        billCity: fields[11],
                        billState: fields[12],
                        billZip: fields[13],
                        ytdSales: parseFloat(fields[14]) || 0,
                        lastVisitDate: fields[15] || null,
                        visitNotes: fields[16] || '',
                        visitHistory: []
                    };

                    importedCustomers.push(customer);
                });

                if (importedCustomers.length === 0) {
                    alert('No valid customer data found in CSV');
                    return;
                }

                // Ask user: Replace or Merge
                const replace = confirm(
                    `Found ${importedCustomers.length} customers in CSV.\n\n` +
                    `OK = REPLACE all current customers (${this.customers.length})\n` +
                    `Cancel = MERGE (update existing, add new)`
                );

                if (replace) {
                    // Replace all customers
                    this.customers = importedCustomers;
                    alert(`Replaced all customers with ${importedCustomers.length} from CSV`);
                } else {
                    // Merge: Update existing or add new
                    let updated = 0;
                    let added = 0;

                    importedCustomers.forEach(imported => {
                        const existing = this.customers.find(c => c.id === imported.id);
                        if (existing) {
                            // Update existing customer
                            Object.assign(existing, imported);
                            updated++;
                        } else {
                            // Add new customer
                            this.customers.push(imported);
                            added++;
                        }
                    });

                    alert(`Import complete!\nUpdated: ${updated} customers\nAdded: ${added} new customers`);
                }

                this.customers.sort((a, b) => a.name.localeCompare(b.name));
                this.saveData();
                this.renderCustomers();

            } catch (error) {
                console.error('Import error:', error);
                alert('Error importing CSV. Please check the file format.');
            }

            // Reset file input
            e.target.value = '';
        };

        reader.readAsText(file);
    }

    // Visit Tracking
    openCustomerDetail(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;
        
        this.currentCustomer = customer;
        
        // Populate customer info
        document.getElementById('customerDetailName').textContent = customer.name;
        document.getElementById('customerDetailContact').textContent = customer.contactName || '';
        document.getElementById('customerDetailLocation').textContent = `${customer.shipCity}, ${customer.shipState}`;
        
        // Last visit
        if (customer.lastVisitDate) {
            const daysSince = Math.floor((new Date() - new Date(customer.lastVisitDate)) / (1000 * 60 * 60 * 24));
            document.getElementById('customerLastVisit').textContent = `${this.formatDate(customer.lastVisitDate)} (${daysSince} days ago)`;
        } else {
            document.getElementById('customerLastVisit').textContent = 'Never';
        }
        
        // Visit notes
        document.getElementById('customerVisitNotes').value = customer.visitNotes || '';
        
        // Visit history
        this.renderVisitHistory(customer);
        
        // Show modal
        document.getElementById('customerDetailModal').classList.add('active');
    }

    closeCustomerDetailModal() {
        document.getElementById('customerDetailModal').classList.remove('active');
        this.currentCustomer = null;
    }

    markVisitedToday() {
        if (!this.currentCustomer) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        // Initialize visitHistory if it doesn't exist
        if (!this.currentCustomer.visitHistory) {
            this.currentCustomer.visitHistory = [];
        }
        
        // Add to visit history
        this.currentCustomer.visitHistory.unshift({
            date: today,
            note: document.getElementById('customerVisitNotes').value || 'Visited'
        });
        
        // Update last visit date
        this.currentCustomer.lastVisitDate = today;
        
        // Save
        this.saveData();
        this.renderCustomers();
        this.renderVisitHistory(this.currentCustomer);
        
        // Update display
        document.getElementById('customerLastVisit').textContent = `${this.formatDate(today)} (Today)`;
        
        alert('Visit logged successfully!');
    }

    saveCustomerNotes() {
        if (!this.currentCustomer) return;
        
        this.currentCustomer.visitNotes = document.getElementById('customerVisitNotes').value;
        this.saveData();
        
        alert('Notes saved!');
    }

    renderVisitHistory(customer) {
        const container = document.getElementById('visitHistoryList');
        
        if (!customer.visitHistory || customer.visitHistory.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No visit history yet</p>';
            return;
        }
        
        container.innerHTML = customer.visitHistory.map(visit => `
            <div class="visit-history-item">
                <div class="visit-history-date">${this.formatDate(visit.date)}</div>
                ${visit.note ? `<div class="visit-history-note">${visit.note}</div>` : ''}
            </div>
        `).join('');
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

    addNoteToOrder() {
        const noteText = prompt('Enter note text:');
        if (!noteText || !noteText.trim()) return;

        const note = {
            id: Date.now(),
            isNote: true,
            productName: noteText.trim(),
            sku: 'NOTE',
            quantity: 0,
            price: 0,
            total: 0
        };

        this.currentOrderItems.push(note);
        this.renderOrderItems();
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
                    ${order.emailedAt ? '<div title="Emailed" style="font-size: 1.2rem;">📧</div>' : ''}
                    ${order.pdfDownloadedAt ? '<div title="PDF Downloaded" style="font-size: 1.2rem;">📄</div>' : ''}
                </div>
                ${order.notes ? `<div class="order-notes-preview">📝 ${order.notes}</div>` : ''}
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

        container.innerHTML = this.currentOrderItems.map(item => {
            if (item.isNote) {
                // Render note item differently
                return `
                    <div class="order-item" style="background: #fff3cd; border-left: 4px solid #ffc107;">
                        <div class="order-item-info">
                            <div class="order-item-name">📝 ${item.productName}</div>
                            <div class="order-item-details" style="font-style: italic;">Note</div>
                        </div>
                        <div class="order-item-total">---</div>
                        <button class="order-item-remove" onclick="app.removeItem(${item.id})">✕</button>
                    </div>
                `;
            } else {
                // Render regular item
                return `
                    <div class="order-item">
                        <div class="order-item-info">
                            <div class="order-item-name">${item.productName}</div>
                            <div class="order-item-details">${item.quantity} × ${this.formatCurrency(item.price)}</div>
                        </div>
                        <div class="order-item-total">${this.formatCurrency(item.total)}</div>
                        <button class="order-item-remove" onclick="app.removeItem(${item.id})">✕</button>
                    </div>
                `;
            }
        }).join('');
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
        
        // Visit filter
        if (this.visitFilter && this.visitFilter !== 'all') {
            const today = new Date();
            filtered = filtered.filter(c => {
                if (this.visitFilter === 'never') {
                    return !c.lastVisitDate;
                }
                
                if (!c.lastVisitDate) return true; // Include never-visited in all time ranges
                
                const daysSince = Math.floor((today - new Date(c.lastVisitDate)) / (1000 * 60 * 60 * 24));
                const threshold = parseInt(this.visitFilter);
                return daysSince >= threshold;
            });
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

        container.innerHTML = filtered.map(customer => {
            // Calculate days since last visit
            let visitBadge = '';
            if (customer.lastVisitDate) {
                const daysSince = Math.floor((new Date() - new Date(customer.lastVisitDate)) / (1000 * 60 * 60 * 24));
                if (daysSince >= 60) {
                    visitBadge = `<span class="customer-visit-badge overdue">${daysSince}d ago</span>`;
                } else if (daysSince <= 7) {
                    visitBadge = `<span class="customer-visit-badge recent">${daysSince}d ago</span>`;
                }
            } else {
                visitBadge = '<span class="customer-visit-badge overdue">Never</span>';
            }
            
            return `
                <div class="customer-card" onclick="app.openCustomerDetail(${customer.id})" style="cursor: pointer;">
                    ${visitBadge}
                    <div class="customer-name">${customer.name}</div>
                    <div class="customer-info">${customer.shipCity}, ${customer.shipState}</div>
                    ${customer.contactName ? `<div class="customer-info">${customer.contactName}</div>` : ''}
                    ${customer.ytdSales ? `<div class="customer-info">YTD: ${this.formatCurrency(customer.ytdSales)}</div>` : ''}
                    <span class="customer-tier tier-${customer.tier.toLowerCase()}">${customer.tier}</span>
                    <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); app.editCustomer(${customer.id})" style="margin-top: 0.5rem;">Edit</button>
                </div>
            `;
        }).join('');
    }

    renderProducts() {
        const container = document.getElementById('productsGrid');
        
        if (this.products.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No products</h3></div>';
            return;
        }

        // Get search term and active filter
        const searchTerm = document.getElementById('productSearch')?.value.toLowerCase() || '';
        const showActiveOnly = document.getElementById('showActiveOnly')?.checked ?? true;
        
        // Group products by category
        const grouped = {};
        this.products.forEach(product => {
            const category = product.category || 'Other';
            
            // Filter by active status
            if (showActiveOnly && product.active === false) {
                return; // Skip inactive products when filter is on
            }
            
            if (!grouped[category]) {
                grouped[category] = [];
            }
            
            // Apply search filter
            if (!searchTerm || 
                product.name.toLowerCase().includes(searchTerm) ||
                product.sku.toLowerCase().includes(searchTerm) ||
                category.toLowerCase().includes(searchTerm)) {
                grouped[category].push(product);
            }
        });
        
        // Sort categories alphabetically
        const sortedCategories = Object.keys(grouped).sort();
        
        // If searching, expand all categories with results
        if (searchTerm) {
            sortedCategories.forEach(cat => {
                if (grouped[cat].length > 0) {
                    this.expandedCategories.add(cat);
                }
            });
        }
        
        // Render collapsible category sections
        container.innerHTML = sortedCategories.map(category => {
            const products = grouped[category];
            if (products.length === 0) return ''; // Skip empty categories
            
            const isExpanded = this.expandedCategories.has(category);
            const expandIcon = isExpanded ? '▼' : '▶';
            
            return `
                <div class="product-category">
                    <div class="product-category-header" onclick="app.toggleProductCategory('${category}')">
                        <span class="category-icon">${expandIcon}</span>
                        <h3>${category}</h3>
                        <span class="category-count">${products.length} products</span>
                    </div>
                    <div class="product-category-content ${isExpanded ? 'expanded' : 'collapsed'}">
                        ${products.map(product => {
                            const isInactive = product.active === false;
                            const statusBadge = isInactive ? '<span style="display: inline-block; background: #dc2626; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">DISCONTINUED</span>' : '';
                            const cardClass = isInactive ? 'product-card discontinued' : 'product-card';
                            const buttonText = isInactive ? 'Reactivate' : 'Discontinue';
                            const buttonClass = isInactive ? 'btn-success' : 'btn-danger';
                            
                            return `
                            <div class="${cardClass}">
                                <div class="product-name">${product.name}${statusBadge}</div>
                                <div class="product-info">SKU: ${product.sku}</div>
                                <div class="product-info">Price: ${this.formatCurrency(product.price)}</div>
                                <div class="product-info">Box Size: ${product.boxSize} units</div>
                                <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <button class="btn btn-small btn-secondary" onclick="app.editProduct(${product.id})">Edit</button>
                                    <button class="btn btn-small ${buttonClass}" onclick="app.toggleProductStatus(${product.id})">${buttonText}</button>
                                </div>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).filter(html => html).join('');
        
        if (container.innerHTML === '') {
            container.innerHTML = '<div class="empty-state"><h3>No products match your search</h3></div>';
        }
    }

    toggleProductCategory(category) {
        if (this.expandedCategories.has(category)) {
            this.expandedCategories.delete(category);
        } else {
            this.expandedCategories.add(category);
        }
        this.renderProducts();
    }

    toggleOrderHistory() {
        const content = document.getElementById('orderHistoryContent');
        const toggle = document.getElementById('orderHistoryToggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
        }
    }

    toggleOrderHistory2026() {
        const content = document.getElementById('orderHistory2026Content');
        const toggle = document.getElementById('orderHistory2026Toggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
        }
    }

    toggleOrderHistory2025() {
        const content = document.getElementById('orderHistory2025Content');
        const toggle = document.getElementById('orderHistory2025Toggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
        }
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Populate category dropdown (same as openNewProduct)
        const categorySelect = document.getElementById('productCategory');
        const categories = [...new Set(this.products.map(p => p.category))].sort();
        
        categorySelect.innerHTML = '<option value="">Select existing category...</option>' +
            '<option value="__new__">➕ Create New Category</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');

        // Populate form with existing values
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productName').value = product.name;
        document.getElementById('productSku').value = product.sku;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productBoxSize').value = product.boxSize;
        
        // Hide new category group
        document.getElementById('newCategoryGroup').style.display = 'none';

        // Change modal title - use querySelector as fallback if ID doesn't exist
        const modalTitle = document.getElementById('productModalTitle') || 
                          document.querySelector('#productModal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Product';
        }
        
        this.editingProductId = productId;
        
        document.getElementById('productModal').classList.add('active');
    }

    toggleProductStatus(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // Toggle active status (default is true if not set)
        product.active = product.active === false ? true : false;
        
        const action = product.active ? 'reactivated' : 'discontinued';
        
        // Save to localStorage
        this.saveData();
        
        // Re-render products
        this.renderProducts();
        
        // Update order form dropdown
        this.populateCategorySelect();
        
        // Show confirmation
        alert(`Product "${product.name}" has been ${action}.`);
    }

    openNewProduct() {
        // Populate category dropdown
        const categorySelect = document.getElementById('productCategory');
        const categories = [...new Set(this.products.map(p => p.category))].sort();
        
        categorySelect.innerHTML = '<option value="">Select existing category...</option>' +
            '<option value="__new__">➕ Create New Category</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        
        // Reset form
        document.getElementById('productForm').reset();
        document.getElementById('newCategoryGroup').style.display = 'none';
        
        // Show modal
        document.getElementById('productModal').classList.add('active');
        
        // Setup category change listener
        categorySelect.onchange = (e) => {
            const newCatGroup = document.getElementById('newCategoryGroup');
            if (e.target.value === '__new__') {
                newCatGroup.style.display = 'block';
                document.getElementById('newCategoryName').required = true;
            } else {
                newCatGroup.style.display = 'none';
                document.getElementById('newCategoryName').required = false;
            }
        };
        
        // Setup close handlers
        document.getElementById('closeProductModal').onclick = () => this.closeProductModal();
        document.getElementById('cancelProductBtn').onclick = () => this.closeProductModal();
    }

    closeProductModal() {
        document.getElementById('productModal').classList.remove('active');
        document.getElementById('productForm').reset();
        document.getElementById('newCategoryGroup').style.display = 'none';
    }

    saveProduct(e) {
        e.preventDefault();
        
        const categorySelect = document.getElementById('productCategory').value;
        const newCategoryName = document.getElementById('newCategoryName').value.trim();
        const name = document.getElementById('productName').value.trim();
        const sku = document.getElementById('productSku').value.trim().toUpperCase();
        const price = parseFloat(document.getElementById('productPrice').value);
        const boxSize = parseInt(document.getElementById('productBoxSize').value);
        
        // Determine category
        let category;
        if (categorySelect === '__new__') {
            if (!newCategoryName) {
                alert('Please enter a new category name');
                return;
            }
            category = newCategoryName;
        } else {
            category = categorySelect;
        }
        
        // Validate
        if (!category || !name || !sku || price < 0 || isNaN(price) || !boxSize) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (this.editingProductId) {
            // EDIT EXISTING PRODUCT
            const product = this.products.find(p => p.id === this.editingProductId);
            if (product) {
                // Check for duplicate SKU (exclude current product)
                if (this.products.some(p => p.sku === sku && p.id !== this.editingProductId)) {
                    alert('A product with this SKU already exists');
                    return;
                }
                
                product.category = category;
                product.name = name;
                product.sku = sku;
                product.price = price;
                product.boxSize = boxSize;
                product.categories = [category];
                
                alert(`Product "${name}" updated successfully!`);
            }
            this.editingProductId = null;
        } else {
            // CREATE NEW PRODUCT
            // Check for duplicate SKU
            if (this.products.some(p => p.sku === sku)) {
                alert('A product with this SKU already exists');
                return;
            }
            
            // Generate new ID (max + 1)
            const maxId = Math.max(...this.products.map(p => p.id), 0);
            
            // Create new product
            const newProduct = {
                id: maxId + 1,
                sku: sku,
                name: name,
                price: price,
                boxSize: boxSize,
                category: category,
                categories: [category] // For compatibility
            };
            
            // Add to products array
            this.products.push(newProduct);
            
            alert(`Product "${name}" added successfully to "${category}" category!`);
        }
        
        // Save to localStorage
        this.saveData();
        
        // Update UI
        this.renderProducts();
        this.populateCategorySelect(); // Update order form dropdown
        
        // Close modal and reset
        this.closeProductModal();
        document.getElementById('productModalTitle').textContent = 'New Product';
    }

    // Populate dropdowns
    populateCategorySelect() {
        // Define the price list order for categories
        const priceListOrder = [
            'My Father',
            'My Father Le Bijou',
            'My Father Connecticut',
            'My Father The Judge',
            'Jaime Garcia',
            'FDLA',
            'FDLA Maduro',
            'DPG Blue',
            'DPG CC Black',
            'DPG JJ',
            'DPG Vegas Cubanas',
            'DPG ERH Red',
            'La Antiguedad',
            'La Duena',
            'TBSF',
            'El Centurion',
            'El Centurion H2KCT',
            'MF La Opulencia',
            'My Father La Gran Oferta',
            'My Father Blue Honduras',
            'Jaime Garcia CT',
            'Fonseca',
            'Fonseca MX',
            'La Promesa',
            'Pepin Vintage Edition',
            'Samplers',
            'Event Goods',
            'Limited Editions',
            'TAA Exclusives'
        ];
        
        // Get unique categories from products
        const uniqueCategories = [...new Set(this.products.map(p => p.category))];
        
        // Sort categories by price list order, putting any unmatched categories at the end
        const categories = uniqueCategories.sort((a, b) => {
            const indexA = priceListOrder.indexOf(a);
            const indexB = priceListOrder.indexOf(b);
            
            // If both are in the price list, sort by their order
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // If only A is in the price list, it comes first
            if (indexA !== -1) return -1;
            // If only B is in the price list, it comes first
            if (indexB !== -1) return 1;
            // If neither is in the price list, sort alphabetically
            return a.localeCompare(b);
        });
        
        // Count products per category
        const categoryCounts = {};
        this.products.forEach(p => {
            categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        });
        
        const select = document.getElementById('itemCategory');
        select.innerHTML = '<option value="">Select category...</option>' +
            categories.map(c => `<option value="${c}">${c} (${categoryCounts[c]} products)</option>`).join('');
    }
    
    onCategoryChange(e) {
        const category = e.target.value;
        const productSelect = document.getElementById('itemProduct');
        
        if (!category) {
            productSelect.disabled = true;
            productSelect.innerHTML = '<option value="">Select category first...</option>';
            return;
        }
        
        // Filter products by category AND exclude discontinued products (active !== false)
        const filtered = this.products.filter(p => p.category === category && p.active !== false);
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
        // Combine current orders and historical orders
        const allOrders = [...this.orders];
        
        if (this.historicalOrders && this.historicalOrders.length > 0) {
            this.historicalOrders.forEach(order => {
                const isDuplicate = allOrders.some(o => 
                    o.poNumber === order.poNumber && o.date === order.date
                );
                if (!isDuplicate) {
                    allOrders.push(order);
                }
            });
        }
        
        // Calculate 2026 YTD from orders
        let sales2026 = 0;
        let orders2026 = 0;
        
        allOrders.forEach(order => {
            const year = parseInt(order.date.substring(0, 4));
            if (year === 2026) {
                sales2026 += order.total;
                orders2026++;
            }
        });
        
        // For 2025, prefer YoY data if available (to match Analytics tab)
        let sales2025 = 0;
        let orders2025 = 0;
        
        if (this.yoyData && this.yoyData.territory_total_2025) {
            // Use YoY data to match Analytics exactly
            sales2025 = this.yoyData.territory_total_2025;
            // Count 2025 orders from historical data
            orders2025 = allOrders.filter(o => parseInt(o.date.substring(0, 4)) === 2025).length;
        } else {
            // Fallback: calculate from orders
            allOrders.forEach(order => {
                const year = parseInt(order.date.substring(0, 4));
                if (year === 2025) {
                    sales2025 += order.total;
                    orders2025++;
                }
            });
        }
        
        // Find top customer across all years
        const customerSales = {};
        allOrders.forEach(order => {
            customerSales[order.customerName] = (customerSales[order.customerName] || 0) + order.total;
        });
        
        const topCustomer = Object.entries(customerSales)
            .sort((a, b) => b[1] - a[1])[0];
        
        // Update year-separated cards
        document.getElementById('sales2026').textContent = this.formatCurrency(sales2026);
        document.getElementById('orders2026').textContent = `${orders2026} order${orders2026 !== 1 ? 's' : ''}`;
        
        document.getElementById('sales2025').textContent = this.formatCurrency(sales2025);
        document.getElementById('orders2025').textContent = `${orders2025} order${orders2025 !== 1 ? 's' : ''}`;
        
        document.getElementById('topCustomer').textContent = topCustomer ? topCustomer[0] : '—';
        
        // Calculate daily, weekly, and monthly sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let todaySales = 0;
        let todayCount = 0;
        let weekSales = 0;
        let weekCount = 0;
        let monthSales = 0;
        let monthCount = 0;
        
        allOrders.forEach(order => {
            const orderDate = new Date(order.date);
            const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
            
            // Today's sales
            if (orderDateOnly.getTime() === today.getTime()) {
                todaySales += order.total;
                todayCount++;
            }
            
            // This week's sales
            if (orderDateOnly >= startOfWeek) {
                weekSales += order.total;
                weekCount++;
            }
            
            // This month's sales
            if (orderDateOnly >= startOfMonth) {
                monthSales += order.total;
                monthCount++;
            }
        });
        
        // Update daily/weekly/monthly cards
        document.getElementById('todaySales').textContent = this.formatCurrency(todaySales);
        document.getElementById('todayOrders').textContent = `${todayCount} order${todayCount !== 1 ? 's' : ''}`;
        
        document.getElementById('weekSales').textContent = this.formatCurrency(weekSales);
        document.getElementById('weekOrders').textContent = `${weekCount} order${weekCount !== 1 ? 's' : ''}`;
        
        document.getElementById('monthSales').textContent = this.formatCurrency(monthSales);
        document.getElementById('monthOrders').textContent = `${monthCount} order${monthCount !== 1 ? 's' : ''}`;
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

    downloadAllOrdersCSV() {
        // Combine current orders and historical orders
        const allOrders = [...this.orders];
        
        if (this.historicalOrders && this.historicalOrders.length > 0) {
            this.historicalOrders.forEach(order => {
                const isDuplicate = allOrders.some(o => 
                    o.poNumber === order.poNumber && o.date === order.date
                );
                if (!isDuplicate) {
                    allOrders.push(order);
                }
            });
        }
        
        if (allOrders.length === 0) {
            alert('No orders to download');
            return;
        }

        let csv = 'Date,Customer,Contact,PO Number,SKU,Product,Quantity,Unit Price,Total\n';
        
        allOrders.forEach(order => {
            order.items.forEach(item => {
                csv += `${order.date},"${order.customerName}","${order.customerContact || ''}","${order.poNumber || ''}",`;
                csv += `"${item.sku}","${item.productName}",${item.quantity},${item.price},${item.total}\n`;
            });
        });

        this.downloadFile(csv, `mfc-all-orders-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }

    downloadAllOrdersJSON() {
        // Combine current orders and historical orders
        const allOrders = [...this.orders];
        
        if (this.historicalOrders && this.historicalOrders.length > 0) {
            this.historicalOrders.forEach(order => {
                const isDuplicate = allOrders.some(o => 
                    o.poNumber === order.poNumber && o.date === order.date
                );
                if (!isDuplicate) {
                    allOrders.push(order);
                }
            });
        }
        
        if (allOrders.length === 0) {
            alert('No orders to download');
            return;
        }

        const json = JSON.stringify(allOrders, null, 2);
        this.downloadFile(json, `mfc-all-orders-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }

    importOrders() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedOrders = JSON.parse(event.target.result);
                    
                    if (!Array.isArray(importedOrders)) {
                        alert('Invalid file format. Please select a valid orders JSON file.');
                        return;
                    }
                    
                    // Ask user if they want to replace or merge
                    const action = confirm(
                        `Import ${importedOrders.length} orders.\n\n` +
                        `Click OK to REPLACE current orders.\n` +
                        `Click Cancel to MERGE with current orders.`
                    );
                    
                    if (action) {
                        // Replace
                        this.orders = importedOrders;
                    } else {
                        // Merge - avoid duplicates based on PO number and date
                        importedOrders.forEach(importOrder => {
                            const exists = this.orders.some(o => 
                                o.poNumber === importOrder.poNumber && o.date === importOrder.date
                            );
                            if (!exists) {
                                this.orders.push(importOrder);
                            }
                        });
                    }
                    
                    // Save and update
                    this.saveData();
                    this.renderOrders();
                    this.updateReports();
                    
                    alert(`Successfully imported ${importedOrders.length} orders!`);
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Error importing orders. Please check the file format.');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    downloadMonthOrdersCSV(month, orders) {
        let csv = 'Date,Customer,Contact,PO Number,SKU,Product,Quantity,Unit Price,Total\n';
        
        orders.forEach(order => {
            order.items.forEach(item => {
                csv += `${order.date},"${order.customerName}","${order.customerContact || ''}","${order.poNumber || ''}",`;
                csv += `"${item.sku}","${item.productName}",${item.quantity},${item.price},${item.total}\n`;
            });
        });

        this.downloadFile(csv, `mfc-orders-${month}.csv`, 'text/csv');
    }

    downloadMonthOrdersJSON(month, orders) {
        const json = JSON.stringify(orders, null, 2);
        this.downloadFile(json, `mfc-orders-${month}.json`, 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    renderMonthlyOrders() {
        const container = document.getElementById('monthlyOrdersContainer');
        
        // Combine current orders and historical orders
        const allOrders = [...this.orders];
        
        // Add historical orders if they exist
        if (this.historicalOrders && this.historicalOrders.length > 0) {
            this.historicalOrders.forEach(order => {
                // Avoid duplicates by checking PO number and date
                const isDuplicate = allOrders.some(o => 
                    o.poNumber === order.poNumber && o.date === order.date
                );
                if (!isDuplicate) {
                    allOrders.push(order);
                }
            });
        }
        
        if (allOrders.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); padding: 2rem; text-align: center;">No orders to display. Create your first order or import historical data!</p>';
            return;
        }

        // Group orders by month
        const ordersByMonth = {};
        allOrders.forEach(order => {
            const monthKey = order.date.substring(0, 7); // YYYY-MM
            if (!ordersByMonth[monthKey]) {
                ordersByMonth[monthKey] = [];
            }
            ordersByMonth[monthKey].push(order);
        });

        // Sort months descending (most recent first)
        const sortedMonths = Object.keys(ordersByMonth).sort().reverse();

        container.innerHTML = sortedMonths.map(month => {
            const orders = ordersByMonth[month];
            const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
            const monthDate = new Date(month + '-01');
            const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            return `
                <div class="month-container">
                    <div class="month-header" onclick="app.toggleMonth('${month}')">
                        <div class="month-header-left">
                            <span class="month-toggle" id="toggle-${month}">▶</span>
                            <span class="month-title">${monthName}</span>
                        </div>
                        <div class="month-stats">
                            <div class="month-stat">
                                <span>Orders:</span>
                                <strong>${orders.length}</strong>
                            </div>
                            <div class="month-stat">
                                <span>Revenue:</span>
                                <strong>${this.formatCurrency(totalRevenue)}</strong>
                            </div>
                        </div>
                        <div class="month-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-small" onclick="app.downloadMonthOrdersCSV('${month}', ${JSON.stringify(orders).replace(/"/g, '&quot;')})">CSV</button>
                            <button class="btn btn-small" onclick="app.downloadMonthOrdersJSON('${month}', ${JSON.stringify(orders).replace(/"/g, '&quot;')})">JSON</button>
                        </div>
                    </div>
                    <div class="month-content" id="content-${month}">
                        <table class="month-orders-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>PO Number</th>
                                    <th style="text-align: center;">Items</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => `
                                    <tr>
                                        <td>${this.formatDate(order.date)}</td>
                                        <td><strong>${order.customerName}</strong></td>
                                        <td>${order.poNumber || '—'}</td>
                                        <td style="text-align: center;">${order.items.length}</td>
                                        <td style="text-align: right;"><strong>${this.formatCurrency(order.total)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleMonth(month) {
        const content = document.getElementById(`content-${month}`);
        const toggle = document.getElementById(`toggle-${month}`);
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    }

    viewOrderDetails(orderId) {
        // For now, just edit the order
        this.editOrder(orderId);
    }

    generateOrderPDF(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Mark order as PDF downloaded
        order.pdfDownloadedAt = new Date().toISOString();
        this.saveData();
        this.renderOrders();

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
            if (item.isNote) {
                // Render note with special formatting
                doc.setFont(undefined, 'italic');
                doc.text('---', 20, y);
                const noteLines = doc.splitTextToSize(item.productName, 140);
                doc.text(noteLines, 30, y);
                y += noteLines.length * 5;
                doc.text('---', 20, y);
                doc.setFont(undefined, 'normal');
                y += 5;
            } else {
                // Render regular item
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
            }
            
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

        // Mark order as emailed
        order.emailedAt = new Date().toISOString();
        this.saveData();
        this.renderOrders();

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

Your balance for this purchase order is ${this.formatCurrency(order.total)} and does not include shipping charges. Shipping charges will be included on your final invoice.

Thank you for your business, we appreciate it very much.

My Father Cigars Southeast`;

            // Build mailto URL
            const mailtoUrl = `mailto:${to}?cc=${encodeURIComponent(cc)}&bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Open email client
            window.location.href = mailtoUrl;
        }, 500); // 500ms delay to let PDF download start
    }

    exportOrdersByDateRange() {
        const startDate = document.getElementById('exportStartDate').value;
        const endDate = document.getElementById('exportEndDate').value;
        
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }
        
        // Combine current and historical orders
        const allOrders = [...this.orders];
        if (this.historicalOrders && this.historicalOrders.length > 0) {
            this.historicalOrders.forEach(order => {
                const isDuplicate = allOrders.some(o => 
                    o.poNumber === order.poNumber && o.date === order.date
                );
                if (!isDuplicate) {
                    allOrders.push(order);
                }
            });
        }
        
        // Filter orders by date range
        const filteredOrders = allOrders.filter(order => {
            const orderDate = order.date;
            return orderDate >= startDate && orderDate <= endDate;
        });
        
        if (filteredOrders.length === 0) {
            alert('No orders found in the selected date range');
            return;
        }
        
        // Sort by date
        filteredOrders.sort((a, b) => a.date.localeCompare(b.date));
        
        // Create CSV content
        let csv = 'Date,Customer,State,PO Number,SKU,Product Name,Quantity,Price,Line Total,Order Total\n';
        
        filteredOrders.forEach(order => {
            const customerState = this.getStateFromCustomer(order.customerName) || '';
            order.items.forEach((item, index) => {
                // Only show order total on first line item
                const orderTotal = index === 0 ? order.total.toFixed(2) : '';
                
                csv += `${order.date},`;
                csv += `"${order.customerName}",`;
                csv += `${customerState},`;
                csv += `${order.poNumber || order.orderNumber || ''},`;
                csv += `${item.sku},`;
                csv += `"${item.productName}",`;
                csv += `${item.quantity},`;
                csv += `${item.price.toFixed(2)},`;
                csv += `${item.total.toFixed(2)},`;
                csv += `${orderTotal}\n`;
            });
        });
        
        // Add summary row
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
        csv += `\nSUMMARY,,,,,,,,,\n`;
        csv += `Total Orders: ${filteredOrders.length},,,,,,,,,\n`;
        csv += `Total Revenue: $${totalRevenue.toFixed(2)},,,,,,,,,\n`;
        csv += `Date Range: ${startDate} to ${endDate},,,,,,,,,\n`;
        
        // Create download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${startDate}_to_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert(`Exported ${filteredOrders.length} orders to CSV`);
    }

    // Analytics
    isPromotionalItem(sku) {
        // Exclude promotional items: MFPR* prefix and MFPETR
        return sku.startsWith('MFPR') || sku === 'MFPETR';
    }

    importHistoricalData() {
        console.log('Import Historical Data button clicked');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            console.log('File selected');
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }
            
            try {
                console.log('Reading file:', file.name);
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!Array.isArray(data)) {
                    alert('Invalid file format. Expected an array of orders.');
                    return;
                }
                
                console.log('Importing', data.length, 'orders');
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
        
        // Combine current orders and historical orders
        const allOrders = [...this.orders, ...this.historicalOrders];
        
        if (allOrders.length === 0) {
            alert('No order data available. Please create or import orders first.');
            return;
        }
        
        const searchLower = searchTerm.toLowerCase();
        const matchingOrders = allOrders.filter(order => 
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
        
        // Show Top 10 tables
        this.renderTop10Tables(matchingOrders[0].customerName);
        
        this.renderCustomerHistory(matchingOrders);
    }

    renderCustomerHistory(orders) {
        const container = document.getElementById('customerHistoryResults');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No orders found for this customer.</p></div>';
            return;
        }

        const customerName = orders[0].customerName;
        
        // Separate orders by year (handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS" formats)
        const customerOrders2026 = orders.filter(o => {
            const year = parseInt(o.date.substring(0, 4));
            return year === 2026;
        });
        const customerOrders2025 = orders.filter(o => {
            const year = parseInt(o.date.substring(0, 4));
            return year === 2025;
        });
        
        // Calculate 2026 YTD stats
        const totalRevenue2026 = customerOrders2026.reduce((sum, o) => sum + o.total, 0);
        const avgOrderSize2026 = customerOrders2026.length > 0 ? totalRevenue2026 / customerOrders2026.length : 0;
        const firstOrder2026 = customerOrders2026.length > 0 ? customerOrders2026[0].date : null;
        const lastOrder2026 = customerOrders2026.length > 0 ? customerOrders2026[customerOrders2026.length - 1].date : null;

        // 2026 YTD Summary Card (shown first, even if zeros)
        let html = `
            <div style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-bottom: 1.5rem; font-size: 1.5rem;">${customerName} - 2026 YTD</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem;">
                    <div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">Total Orders</div>
                        <div style="font-size: 2rem; font-weight: 700;">${customerOrders2026.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">Total Revenue</div>
                        <div style="font-size: 2rem; font-weight: 700;">${this.formatCurrency(totalRevenue2026)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">Avg Order</div>
                        <div style="font-size: 2rem; font-weight: 700;">${this.formatCurrency(avgOrderSize2026)}</div>
                    </div>
                    ${firstOrder2026 ? `
                    <div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">First Order</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">${new Date(firstOrder2026).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">Last Order</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">${new Date(lastOrder2026).toLocaleDateString()}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // 2026 Order History (if any orders exist)
        if (customerOrders2026.length > 0) {
            html += `
                <div style="margin-bottom: 2rem;">
                    <div style="background: #f0e6ff; padding: 1rem 1.5rem; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 2px solid #d8b4fe;" onclick="app.toggleOrderHistory2026()">
                        <h4 style="margin: 0; color: #7c3aed;">📋 2026 Order History (${customerOrders2026.length} orders - chronological)</h4>
                        <span id="orderHistory2026Toggle" style="font-size: 1.5rem; color: #7c3aed;">▼</span>
                    </div>
                    <div id="orderHistory2026Content" style="display: none; margin-top: 1rem;">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${customerOrders2026.map(order => `
                                <div style="background: white; border: 2px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                                    <div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div style="font-size: 0.875rem; opacity: 0.9;">Order #${order.poNumber || order.orderNumber}</div>
                                            <div style="font-size: 1.125rem; font-weight: 600;">${new Date(order.date).toLocaleDateString()}</div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 1.5rem; font-weight: 700;">${this.formatCurrency(order.total)}</div>
                                            <div style="font-size: 0.875rem; opacity: 0.9;">${order.items.length} items</div>
                                        </div>
                                    </div>
                                    <div style="padding: 1.5rem;">
                                        ${order.contactName ? `<div style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">Contact: ${order.contactName}</div>` : ''}
                                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                            ${order.items.map(item => 
                                                `<div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f5f5f5; border-radius: 6px;">
                                                    <span style="flex: 1;"><strong>${item.quantity}x</strong> ${item.productName}</span>
                                                    <span style="font-weight: 600; color: #7c3aed;">${this.formatCurrency(item.total)}</span>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // 2025 Summary Card (without Top 5 Products)
        if (customerOrders2025.length > 0) {
            const totalRevenue2025 = customerOrders2025.reduce((sum, o) => sum + o.total, 0);
            const avgOrderSize2025 = totalRevenue2025 / customerOrders2025.length;
            const firstOrder2025 = customerOrders2025[0].date;
            const lastOrder2025 = customerOrders2025[customerOrders2025.length - 1].date;

            html += `
                <div style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <h3 style="margin-bottom: 1.5rem; font-size: 1.5rem;">${customerName} - 2025 Total</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem;">
                        <div>
                            <div style="font-size: 0.875rem; opacity: 0.9;">Total Orders</div>
                            <div style="font-size: 2rem; font-weight: 700;">${customerOrders2025.length}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; opacity: 0.9;">Total Revenue</div>
                            <div style="font-size: 2rem; font-weight: 700;">${this.formatCurrency(totalRevenue2025)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; opacity: 0.9;">Avg Order</div>
                            <div style="font-size: 2rem; font-weight: 700;">${this.formatCurrency(avgOrderSize2025)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; opacity: 0.9;">First Order</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${new Date(firstOrder2025).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; opacity: 0.9;">Last Order</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${new Date(lastOrder2025).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            `;

            // 2025 Order History
            html += `
                <div style="margin-bottom: 2rem;">
                    <div style="background: #f5f5f5; padding: 1rem 1.5rem; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 2px solid #e0e0e0;" onclick="app.toggleOrderHistory2025()">
                        <h4 style="margin: 0; color: var(--secondary);">📋 2025 Order History (${customerOrders2025.length} orders - chronological)</h4>
                        <span id="orderHistory2025Toggle" style="font-size: 1.5rem; color: var(--secondary);">▼</span>
                    </div>
                    <div id="orderHistory2025Content" style="display: none; margin-top: 1rem;">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${customerOrders2025.map(order => `
                                <div style="background: white; border: 2px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                                    <div style="background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div style="font-size: 0.875rem; opacity: 0.9;">Order #${order.poNumber || order.orderNumber}</div>
                                            <div style="font-size: 1.125rem; font-weight: 600;">${new Date(order.date).toLocaleDateString()}</div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 1.5rem; font-weight: 700;">${this.formatCurrency(order.total)}</div>
                                            <div style="font-size: 0.875rem; opacity: 0.9;">${order.items.length} items</div>
                                        </div>
                                    </div>
                                    <div style="padding: 1.5rem;">
                                        ${order.contactName ? `<div style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">Contact: ${order.contactName}</div>` : ''}
                                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                            ${order.items.map(item => 
                                                `<div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f5f5f5; border-radius: 6px;">
                                                    <span style="flex: 1;"><strong>${item.quantity}x</strong> ${item.productName}</span>
                                                    <span style="font-weight: 600; color: #8B4513;">${this.formatCurrency(item.total)}</span>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        
        this.analyzeDropoffs(orders);
        this.analyzeReorderPatterns(orders);
        this.renderTop10Analysis(orders);
        this.renderProductUsageReport(orders);
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

    renderTop10Tables(searchedCustomer) {
        if (this.historicalOrders.length === 0) return;
        
        // Store for PDF export
        this.currentSearchedCustomer = searchedCustomer;
        
        const section = document.getElementById('top10Section');
        const container = document.getElementById('top10Tables');
        section.style.display = 'block';
        
        // Get the searched customer's state and metro area
        const customer = this.customers.find(c => c.name === searchedCustomer);
        const customerState = customer ? customer.shipState : null;
        const customerCity = customer ? customer.shipCity : null;
        
        // Calculate SKU totals for entire territory
        const territorySKUs = new Map();
        let territoryTotalQty = 0;
        this.historicalOrders.forEach(order => {
            order.items.forEach(item => {
                if (!this.isPromotionalItem(item.sku)) {
                    const current = territorySKUs.get(item.sku) || {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0
                    };
                    current.quantity += item.quantity;
                    current.revenue += item.total;
                    territorySKUs.set(item.sku, current);
                    territoryTotalQty += item.quantity;
                }
            });
        });
        
        // Calculate SKU totals by state
        const stateSKUs = new Map();
        let stateTotalQty = 0;
        if (customerState) {
            this.historicalOrders.forEach(order => {
                const orderCustomer = this.customers.find(c => c.name === order.customerName);
                if (orderCustomer && orderCustomer.shipState === customerState) {
                    order.items.forEach(item => {
                        if (!this.isPromotionalItem(item.sku)) {
                            const current = stateSKUs.get(item.sku) || {
                                name: item.productName,
                                quantity: 0,
                                revenue: 0
                            };
                            current.quantity += item.quantity;
                            current.revenue += item.total;
                            stateSKUs.set(item.sku, current);
                            stateTotalQty += item.quantity;
                        }
                    });
                }
            });
        }
        
        // Calculate SKU totals by metro area
        const metroSKUs = new Map();
        let metroTotalQty = 0;
        if (customerCity) {
            this.historicalOrders.forEach(order => {
                const orderCustomer = this.customers.find(c => c.name === order.customerName);
                if (orderCustomer && orderCustomer.shipCity === customerCity) {
                    order.items.forEach(item => {
                        if (!this.isPromotionalItem(item.sku)) {
                            const current = metroSKUs.get(item.sku) || {
                                name: item.productName,
                                quantity: 0,
                                revenue: 0
                            };
                            current.quantity += item.quantity;
                            current.revenue += item.total;
                            metroSKUs.set(item.sku, current);
                            metroTotalQty += item.quantity;
                        }
                    });
                }
            });
        }
        
        // Calculate SKU totals for searched account
        const accountSKUs = new Map();
        let accountTotalQty = 0;
        this.historicalOrders.forEach(order => {
            if (order.customerName === searchedCustomer) {
                order.items.forEach(item => {
                    if (!this.isPromotionalItem(item.sku)) {
                        const current = accountSKUs.get(item.sku) || {
                            name: item.productName,
                            quantity: 0,
                            revenue: 0
                        };
                        current.quantity += item.quantity;
                        current.revenue += item.total;
                        accountSKUs.set(item.sku, current);
                        accountTotalQty += item.quantity;
                    }
                });
            }
        });
        
        // Calculate last 6 months SKUs for searched account
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const last6MonthsSKUs = new Map();
        let last6MonthsTotalQty = 0;
        this.historicalOrders.forEach(order => {
            if (order.customerName === searchedCustomer && new Date(order.date) >= sixMonthsAgo) {
                order.items.forEach(item => {
                    if (!this.isPromotionalItem(item.sku)) {
                        const current = last6MonthsSKUs.get(item.sku) || {
                            name: item.productName,
                            quantity: 0,
                            revenue: 0
                        };
                        current.quantity += item.quantity;
                        current.revenue += item.total;
                        last6MonthsSKUs.set(item.sku, current);
                        last6MonthsTotalQty += item.quantity;
                    }
                });
            }
        });
        
        // Convert to arrays and sort by quantity, add percentages
        const territoryTop10 = Array.from(territorySKUs.entries())
            .map(([sku, data]) => ({ 
                sku, 
                ...data,
                percentage: (data.quantity / territoryTotalQty * 100).toFixed(1)
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        const stateTop10 = Array.from(stateSKUs.entries())
            .map(([sku, data]) => ({ 
                sku, 
                ...data,
                percentage: (data.quantity / stateTotalQty * 100).toFixed(1)
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        const metroTop10 = Array.from(metroSKUs.entries())
            .map(([sku, data]) => ({ 
                sku, 
                ...data,
                percentage: (data.quantity / metroTotalQty * 100).toFixed(1)
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        const accountTop10 = Array.from(accountSKUs.entries())
            .map(([sku, data]) => ({ 
                sku, 
                ...data,
                percentage: (data.quantity / accountTotalQty * 100).toFixed(1)
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        const last6MonthsTop10 = Array.from(last6MonthsSKUs.entries())
            .map(([sku, data]) => ({ 
                sku, 
                ...data,
                percentage: (data.quantity / last6MonthsTotalQty * 100).toFixed(1)
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        // Store for PDF export
        this.currentTop10Data = {
            territory: territoryTop10,
            state: stateTop10,
            metro: metroTop10,
            account: accountTop10,
            recent: last6MonthsTop10,
            customerName: searchedCustomer,
            customerState: customerState,
            customerCity: customerCity
        };
        
        // Render tables
        container.innerHTML = `
            <div class="top10-grid">
                ${this.renderTop10SKUTable('Territory Top 10 SKUs (All-Time)', territoryTop10, 'territory')}
                ${customerState ? this.renderTop10SKUTable(`${customerState} Top 10 SKUs (All-Time)`, stateTop10, 'state') : ''}
                ${customerCity ? this.renderTop10SKUTable(`${customerCity} Metro Top 10 SKUs (All-Time)`, metroTop10, 'metro') : ''}
                ${accountTop10.length > 0 ? this.renderTop10SKUTable(`${searchedCustomer} - Top 10 SKUs (All-Time)`, accountTop10, 'account') : ''}
                ${last6MonthsTop10.length > 0 ? this.renderTop10SKUTable(`${searchedCustomer} - Last 6 Months Top 10`, last6MonthsTop10, 'recent') : ''}
            </div>
        `;
    }
    
    renderTop10SKUTable(title, skus, colorClass) {
        if (!skus || skus.length === 0) return '';
        
        return `
            <div class="top10-table-container">
                <div class="top10-table-header ${colorClass}">${title}</div>
                <table class="top10-table">
                    <thead>
                        <tr>
                            <th class="top10-rank">#</th>
                            <th class="top10-product">Product</th>
                            <th class="top10-quantity">Qty</th>
                            <th class="top10-percentage">% of Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${skus.map((sku, index) => `
                            <tr>
                                <td class="top10-rank">${index + 1}</td>
                                <td class="top10-product">
                                    <div style="font-weight: 500;">${sku.name}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">SKU: ${sku.sku}</div>
                                </td>
                                <td class="top10-quantity">${sku.quantity}</td>
                                <td class="top10-percentage">${sku.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderAccountCard(account, rank) {
        return `
            <div class="top10-table-container">
                <div class="top10-table-header account">Searched Account</div>
                <div style="padding: 1.5rem; background: white;">
                    <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--primary);">
                        ${account.name}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">Territory Rank</div>
                            <div style="font-size: 2rem; font-weight: 600; color: #7c3aed;">
                                #${rank}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Revenue</div>
                            <div style="font-size: 1.5rem; font-weight: 600; color: #059669;">
                                ${this.formatCurrency(account.revenue)}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Total Orders</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">${account.orders}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    exportTop10PDF() {
        if (!this.currentTop10Data) {
            alert('Please search for a customer first to generate the report.');
            return;
        }
        
        const data = this.currentTop10Data;
        const printWindow = window.open('', '', 'width=1200,height=800');
        
        // Generate table HTML
        const createTableHTML = (skus, title, colorClass) => {
            if (!skus || skus.length === 0) return '';
            
            const colors = {
                territory: '#3b82f6',
                state: '#10b981',
                metro: '#ef4444',
                account: '#a78bfa',
                recent: '#fbbf24'
            };
            
            return `
                <div class="table-container">
                    <div class="table-header" style="background: ${colors[colorClass]};">${title}</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">#</th>
                                <th>Product</th>
                                <th style="width: 80px; text-align: center;">Qty</th>
                                <th style="width: 80px; text-align: right;">% Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${skus.map((sku, index) => `
                                <tr>
                                    <td class="rank">${index + 1}</td>
                                    <td>
                                        <div class="product-name">${sku.name}</div>
                                        <div class="sku-code">SKU: ${sku.sku}</div>
                                    </td>
                                    <td style="text-align: center; font-weight: 600;">${sku.quantity}</td>
                                    <td style="text-align: right; font-weight: 600; color: #059669;">${sku.percentage}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Top 10 SKUs Analysis - ${data.customerName}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 30px;
                        max-width: 1400px;
                        margin: 0 auto;
                        background: #f9fafb;
                    }
                    .header {
                        background: white;
                        border: 3px solid #1e40af;
                        border-radius: 8px;
                        padding: 25px;
                        margin-bottom: 30px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 { 
                        color: #1e40af; 
                        margin-bottom: 15px;
                        font-size: 2rem;
                    }
                    .account-name {
                        font-size: 1.8rem;
                        color: #059669;
                        font-weight: 700;
                        margin-bottom: 10px;
                    }
                    .meta {
                        color: #6b7280;
                        font-size: 0.95rem;
                        line-height: 1.6;
                    }
                    .meta strong {
                        color: #374151;
                        font-weight: 600;
                    }
                    .tables-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 25px;
                    }
                    .table-container {
                        background: white;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        page-break-inside: avoid;
                    }
                    .table-header {
                        color: white;
                        padding: 15px;
                        font-weight: 600;
                        font-size: 1.1rem;
                    }
                    .data-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .data-table thead {
                        background: #f3f4f6;
                    }
                    .data-table th {
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 0.875rem;
                        color: #6b7280;
                        border-bottom: 2px solid #e5e7eb;
                    }
                    .data-table td {
                        padding: 12px;
                        border-bottom: 1px solid #e5e7eb;
                        font-size: 0.9rem;
                    }
                    .data-table tbody tr:hover {
                        background: #f9fafb;
                    }
                    .rank {
                        font-weight: 600;
                        color: #1e40af;
                        font-size: 1rem;
                    }
                    .product-name {
                        font-weight: 500;
                        color: #1f2937;
                        margin-bottom: 3px;
                    }
                    .sku-code {
                        font-size: 0.75rem;
                        color: #9ca3af;
                    }
                    @media print {
                        body { 
                            padding: 15px;
                            background: white;
                        }
                        .tables-grid { 
                            display: block;
                        }
                        .table-container {
                            page-break-inside: avoid;
                            margin-bottom: 25px;
                        }
                        .header {
                            border: 2px solid #1e40af;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Top 10 SKUs Analysis</h1>
                    <div class="account-name">${data.customerName}</div>
                    <div class="meta">
                        <strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
                        ${data.customerState ? `<strong>State:</strong> ${data.customerState} | ` : ''}
                        ${data.customerCity ? `<strong>Metro:</strong> ${data.customerCity}` : ''}
                    </div>
                </div>
                
                <div class="tables-grid">
                    ${createTableHTML(data.territory, 'Territory Top 10 SKUs (All-Time)', 'territory')}
                    ${data.state && data.state.length > 0 ? createTableHTML(data.state, `${data.customerState} Top 10 SKUs (All-Time)`, 'state') : ''}
                    ${data.metro && data.metro.length > 0 ? createTableHTML(data.metro, `${data.customerCity} Metro Top 10 SKUs (All-Time)`, 'metro') : ''}
                    ${data.account && data.account.length > 0 ? createTableHTML(data.account, `${data.customerName} - Top 10 SKUs (All-Time)`, 'account') : ''}
                    ${data.recent && data.recent.length > 0 ? createTableHTML(data.recent, `${data.customerName} - Last 6 Months Top 10`, 'recent') : ''}
                </div>
                
                <script>
                    // Auto-print after brief delay
                    setTimeout(() => {
                        window.print();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
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

    // Year-over-Year Comparison
    importYoYData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    this.yoyData = JSON.parse(event.target.result);
                    localStorage.setItem('mfc_yoy_data', JSON.stringify(this.yoyData));
                    this.renderYoYComparison();
                    alert('Year-over-Year data imported successfully!');
                } catch (error) {
                    alert('Error parsing YoY data file. Please check the file format.');
                    console.error(error);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    renderYoYComparison() {
        const container = document.getElementById('yoyComparison');
        
        if (!this.yoyData) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Year-over-year comparison data not available. Upload yoy_comparison_2024_2025.json to enable this feature.</p>';
            return;
        }

        const data = this.yoyData;
        const states = ['AL', 'GA', 'MS', 'TN'];
        
        // Calculate 2026 YTD numbers from current orders + historical
        const allOrders = [...this.orders];
        if (this.historicalOrders && this.historicalOrders.length > 0) {
            this.historicalOrders.forEach(order => {
                const isDuplicate = allOrders.some(o => 
                    o.poNumber === order.poNumber && o.date === order.date
                );
                if (!isDuplicate) {
                    allOrders.push(order);
                }
            });
        }
        
        // Calculate 2026 totals by state
        const state2026 = {
            'AL': 0,
            'GA': 0,
            'MS': 0,
            'TN': 0
        };
        
        let territory2026 = 0;
        
        allOrders.forEach(order => {
            const year = parseInt(order.date.substring(0, 4));
            if (year === 2026) {
                // Extract state from customer name
                const match = order.customerName.match(/\b(AL|GA|MS|TN)\b/);
                if (match) {
                    state2026[match[1]] += order.total;
                }
                territory2026 += order.total;
            }
        });
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <div style="background: var(--background); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--primary);">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Territory Total 2026 YTD</div>
                    <div style="font-size: 1.75rem; font-weight: 600; color: var(--primary);">${this.formatCurrency(territory2026)}</div>
                </div>
                
                <div style="background: var(--background); padding: 1.5rem; border-radius: 8px; border-left: 4px solid #16a34a;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Territory Total 2025</div>
                    <div style="font-size: 1.75rem; font-weight: 600; color: #16a34a;">${this.formatCurrency(data.territory_total_2025)}</div>
                    <div style="font-size: 0.875rem; color: ${data.territory_change >= 0 ? '#16a34a' : '#dc2626'}; margin-top: 0.5rem;">
                        ${data.territory_change >= 0 ? '▲' : '▼'} ${this.formatCurrency(Math.abs(data.territory_change))} vs 2024 (${data.territory_pct_change >= 0 ? '+' : ''}${data.territory_pct_change.toFixed(1)}%)
                    </div>
                </div>
                
                <div style="background: var(--background); padding: 1.5rem; border-radius: 8px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Territory Total 2024</div>
                    <div style="font-size: 1.75rem; font-weight: 600;">${this.formatCurrency(data.territory_total_2024)}</div>
                </div>
            </div>
            
            <h4 style="margin: 1.5rem 0 1rem;">Performance by State</h4>
            <div style="display: grid; gap: 1rem;">
                ${states.map(state => {
                    const st = data.state_totals[state];
                    const isPositive = st.change >= 0;
                    const ytd2026 = state2026[state];
                    
                    return `
                        <div style="background: var(--surface); padding: 1rem; border-radius: 6px; border: 1px solid var(--border);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="font-size: 1.25rem; font-weight: 600; color: var(--primary); width: 40px;">${state}</div>
                                    <div>
                                        <div style="font-size: 0.875rem; color: var(--primary); font-weight: 600;">2026 YTD: ${this.formatCurrency(ytd2026)}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">2025: ${this.formatCurrency(st.sales_2025)}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">2024: ${this.formatCurrency(st.sales_2024)}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: 600; color: ${isPositive ? '#16a34a' : '#dc2626'};">
                                        ${isPositive ? '+' : ''}${this.formatCurrency(st.change)}
                                    </div>
                                    <div style="font-size: 0.875rem; color: ${isPositive ? '#16a34a' : '#dc2626'};">
                                        ${isPositive ? '▲' : '▼'} ${Math.abs(st.pct_change).toFixed(1)}% (25 vs 24)
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: var(--background); border-radius: 6px; font-size: 0.875rem; color: var(--text-secondary);">
                <strong>2026 YTD:</strong> Current year-to-date performance<br>
                <strong>2024 vs 2025:</strong> ${data.comparison_period}
            </div>
        `;
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

    renderTop10Analysis(orders) {
        const section = document.getElementById('top10Section');
        const container = document.getElementById('top10Tables');
        
        if (!orders || orders.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        // Get customer name and location from the first order
        const customerName = orders[0].customerName;
        const customerState = this.getStateFromCustomer(customerName);
        const customerMetro = this.getMetroFromCustomer(customerName);

        // Aggregate data from ALL historical orders for territory/state/metro context
        const territoryData = {};
        const stateData = {};
        const metroData = {};
        
        // Aggregate from searched customer's orders only
        const customerData = {};
        const customerData2025 = {};
        const customerData2026 = {};
        const customerData6m = {};

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Territory-wide data (all historical orders)
        this.historicalOrders.forEach(order => {
            order.items.forEach(item => {
                if (this.isPromotionalItem(item.sku)) return;

                // Territory totals
                if (!territoryData[item.sku]) {
                    territoryData[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                }
                territoryData[item.sku].qty += item.quantity;
                territoryData[item.sku].revenue += item.total;

                // State totals (only for customer's state)
                const orderState = this.getStateFromCustomer(order.customerName);
                if (orderState === customerState) {
                    if (!stateData[item.sku]) {
                        stateData[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                    }
                    stateData[item.sku].qty += item.quantity;
                    stateData[item.sku].revenue += item.total;
                }

                // Metro totals (only for customer's metro)
                const orderMetro = this.getMetroFromCustomer(order.customerName);
                if (customerMetro && orderMetro === customerMetro) {
                    if (!metroData[item.sku]) {
                        metroData[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                    }
                    metroData[item.sku].qty += item.quantity;
                    metroData[item.sku].revenue += item.total;
                }
            });
        });

        // Customer-specific data (from orders parameter)
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            const orderYear = parseInt(order.date.substring(0, 4));
            const isRecent = orderDate >= sixMonthsAgo;

            order.items.forEach(item => {
                if (this.isPromotionalItem(item.sku)) return;

                // All-time customer data
                if (!customerData[item.sku]) {
                    customerData[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                }
                customerData[item.sku].qty += item.quantity;
                customerData[item.sku].revenue += item.total;

                // 2025 customer data
                if (orderYear === 2025) {
                    if (!customerData2025[item.sku]) {
                        customerData2025[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                    }
                    customerData2025[item.sku].qty += item.quantity;
                    customerData2025[item.sku].revenue += item.total;
                }

                // 2026 YTD customer data
                if (orderYear === 2026) {
                    if (!customerData2026[item.sku]) {
                        customerData2026[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                    }
                    customerData2026[item.sku].qty += item.quantity;
                    customerData2026[item.sku].revenue += item.total;
                }

                // Last 6 months customer data
                if (isRecent) {
                    if (!customerData6m[item.sku]) {
                        customerData6m[item.sku] = { name: item.productName, qty: 0, revenue: 0 };
                    }
                    customerData6m[item.sku].qty += item.quantity;
                    customerData6m[item.sku].revenue += item.total;
                }
            });
        });

        const colors = {
            territory: { bg: '#8B4513', text: 'white', light: '#A0522D' },
            state: { bg: '#2563eb', text: 'white', light: '#3b82f6' },
            metro: { bg: '#ea580c', text: 'white', light: '#f97316' },
            customer: { bg: '#0891b2', text: 'white', light: '#06b6d4' },
            customer2025: { bg: '#059669', text: 'white', light: '#10b981' },
            customer2026: { bg: '#7c3aed', text: 'white', light: '#8b5cf6' },
            customer6m: { bg: '#db2777', text: 'white', light: '#ec4899' }
        };

        const renderTable = (title, data, totalQty, color) => {
            if (!data || Object.keys(data).length === 0) return '';
            
            const top10 = Object.entries(data).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
            if (top10.length === 0) return '';
            
            return `
                <div style="background: white; border: 3px solid ${color.bg}; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;">
                    <div style="background: linear-gradient(135deg, ${color.bg} 0%, ${color.light} 100%); color: ${color.text}; padding: 1rem 1.5rem;">
                        <h4 style="margin: 0; font-size: 1.25rem; font-weight: 700;">${title}</h4>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #666; font-weight: 600;">#</th>
                                    <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #666; font-weight: 600;">Product</th>
                                    <th style="padding: 0.75rem; text-align: right; font-size: 0.875rem; color: #666; font-weight: 600;">Qty</th>
                                    <th style="padding: 0.75rem; text-align: right; font-size: 0.875rem; color: #666; font-weight: 600;">% of Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${top10.map(([sku, info], idx) => `
                                    <tr style="border-bottom: 1px solid #e0e0e0;">
                                        <td style="padding: 0.75rem; font-weight: 700; color: ${color.bg}; font-size: 1.125rem;">${idx + 1}</td>
                                        <td style="padding: 0.75rem;">
                                            <div style="font-weight: 600; color: #1a1a1a;">${info.name}</div>
                                            <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">SKU: ${sku}</div>
                                        </td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 700; font-size: 1.125rem;">${info.qty}</td>
                                        <td style="padding: 0.75rem; text-align: right;">
                                            <span style="background: ${color.bg}20; color: ${color.bg}; padding: 0.375rem 0.75rem; border-radius: 6px; font-weight: 700; font-size: 0.875rem;">
                                                ${((info.qty / totalQty) * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        let html = '';

        // 1. Territory Top 10
        const territoryTotal = Object.values(territoryData).reduce((sum, s) => sum + s.qty, 0);
        html += renderTable('Territory Top 10 SKUs (All-Time)', territoryData, territoryTotal, colors.territory);

        // 2. Customer's State Top 10
        if (customerState && Object.keys(stateData).length > 0) {
            const stateTotal = Object.values(stateData).reduce((sum, s) => sum + s.qty, 0);
            html += renderTable(`${customerState} Top 10 SKUs (All-Time)`, stateData, stateTotal, colors.state);
        }

        // 3. Customer's Metro Top 10
        if (customerMetro && Object.keys(metroData).length > 0) {
            const metroTotal = Object.values(metroData).reduce((sum, s) => sum + s.qty, 0);
            html += renderTable(`${customerMetro} Metro Top 10 SKUs (All-Time)`, metroData, metroTotal, colors.metro);
        }

        // 4. Customer All-Time Top 10
        if (Object.keys(customerData).length > 0) {
            const customerTotal = Object.values(customerData).reduce((sum, s) => sum + s.qty, 0);
            html += renderTable(`${customerName} - Top 10 SKUs (All-Time)`, customerData, customerTotal, colors.customer);
        }

        // 5. Customer 2025 Top 10
        if (Object.keys(customerData2025).length > 0) {
            const customer2025Total = Object.values(customerData2025).reduce((sum, s) => sum + s.qty, 0);
            html += renderTable(`${customerName} - Top 10 SKUs (2025)`, customerData2025, customer2025Total, colors.customer2025);
        }

        // 6. Customer 2026 YTD Top 10
        if (Object.keys(customerData2026).length > 0) {
            const customer2026Total = Object.values(customerData2026).reduce((sum, s) => sum + s.qty, 0);
            html += renderTable(`${customerName} - Top 10 SKUs (2026 YTD)`, customerData2026, customer2026Total, colors.customer2026);
        }

        // 7. Customer Last 6 Months Top 10
        if (Object.keys(customerData6m).length > 0) {
            const customer6mTotal = Object.values(customerData6m).reduce((sum, s) => sum + s.qty, 0);
            html += renderTable(`${customerName} - Top 10 SKUs (Last 6 Months)`, customerData6m, customer6mTotal, colors.customer6m);
        }

        container.innerHTML = html;
    }

    renderProductUsageReport(orders) {
        const section = document.getElementById('productUsageSection');
        const container = document.getElementById('productUsageResults');
        
        if (!section || !container) return;
        
        if (!orders || orders.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const now = new Date();
        const days30 = new Date(now);
        days30.setDate(days30.getDate() - 30);
        const days60 = new Date(now);
        days60.setDate(days60.getDate() - 60);
        const days90 = new Date(now);
        days90.setDate(days90.getDate() - 90);

        const skuLastOrdered = {};
        
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            order.items.forEach(item => {
                if (!this.isPromotionalItem(item.sku)) {
                    if (!skuLastOrdered[item.sku] || orderDate > skuLastOrdered[item.sku].date) {
                        skuLastOrdered[item.sku] = {
                            date: orderDate,
                            name: item.productName,
                            sku: item.sku
                        };
                    }
                }
            });
        });

        const notOrdered30 = [];
        const notOrdered60 = [];
        const notOrdered90 = [];

        Object.entries(skuLastOrdered).forEach(([sku, data]) => {
            if (data.date < days90) {
                notOrdered90.push(data);
            } else if (data.date < days60) {
                notOrdered60.push(data);
            } else if (data.date < days30) {
                notOrdered30.push(data);
            }
        });

        notOrdered30.sort((a, b) => a.date - b.date);
        notOrdered60.sort((a, b) => a.date - b.date);
        notOrdered90.sort((a, b) => a.date - b.date);

        const renderTable = (title, data, color) => {
            if (data.length === 0) return '';
            
            return `
                <div style="background: white; border: 2px solid ${color}; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem;">
                    <div style="background: ${color}; color: white; padding: 1rem 1.5rem;">
                        <h4 style="margin: 0; font-size: 1.125rem;">${title} (${data.length} products)</h4>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #666;">Product</th>
                                    <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #666;">SKU</th>
                                    <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #666;">Last Ordered</th>
                                    <th style="padding: 0.75rem; text-align: right; font-size: 0.875rem; color: #666;">Days Ago</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(item => {
                                    const daysAgo = Math.floor((now - item.date) / (1000 * 60 * 60 * 24));
                                    return `
                                        <tr style="border-bottom: 1px solid #e0e0e0;">
                                            <td style="padding: 0.75rem; font-weight: 600;">${item.name}</td>
                                            <td style="padding: 0.75rem; color: #666; font-size: 0.875rem;">${item.sku}</td>
                                            <td style="padding: 0.75rem;">${item.date.toLocaleDateString()}</td>
                                            <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: ${color};">${daysAgo} days</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        let html = '<p style="margin-bottom: 1rem; color: #666;">Products not ordered recently - may need attention or promotion.</p>';
        html += renderTable('⚠️ Not Ordered in 30-60 Days', notOrdered30, '#f59e0b');
        html += renderTable('⚠️ Not Ordered in 60-90 Days', notOrdered60, '#ea580c');
        html += renderTable('🚨 Not Ordered in 90+ Days', notOrdered90, '#dc2626');

        if (notOrdered30.length === 0 && notOrdered60.length === 0 && notOrdered90.length === 0) {
            html = '<p style="color: #10b981; font-weight: 600; font-size: 1.125rem;">✓ All products have been ordered within the last 30 days!</p>';
        }

        container.innerHTML = html;
    }

    getStateFromCustomer(customerName) {
        if (customerName.includes(' - AL')) return 'AL';
        if (customerName.includes(' - GA')) return 'GA';
        if (customerName.includes(' - TN')) return 'TN';
        if (customerName.includes(' - MS')) return 'MS';
        if (customerName.includes(' AL')) return 'AL';
        if (customerName.includes(' GA')) return 'GA';
        if (customerName.includes(' TN')) return 'TN';
        if (customerName.includes(' MS')) return 'MS';
        return null;
    }

    getMetroFromCustomer(customerName) {
        const metros = {
            'Birmingham': ['280', 'Trussville', 'Patton Creek', 'Mountain Brook', 'Tuscaloosa', 'Hoover'],
            'Huntsville': ['Huntsville', 'Madison'],
            'Atlanta': ['Gwinnett', 'Buford', 'Conyers', 'Covington', 'Lawrenceville'],
            'Nashville': ['Nashville', 'Brentwood', 'Franklin'],
            'Memphis': ['Memphis', 'Germantown', 'Collierville'],
            'Chattanooga': ['Chattanooga', 'Chatanooga']
        };
        
        for (const [metro, keywords] of Object.entries(metros)) {
            if (keywords.some(k => customerName.includes(k))) {
                return metro;
            }
        }
        return null;
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
