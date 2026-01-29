// PWA Installation and Service Worker Management

let deferredPrompt;
let installBanner;
let installButton;
let dismissButton;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
} else {
    initPWA();
}

function initPWA() {
    installBanner = document.getElementById('installBanner');
    installButton = document.getElementById('installButton');
    dismissButton = document.getElementById('dismissInstall');

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode (installed)');
        return;
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Handle install button click
    if (installButton) {
        installButton.addEventListener('click', installApp);
    }

    // Handle dismiss button click
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            if (installBanner) {
                installBanner.style.display = 'none';
            }
            // Remember dismissal for 7 days
            localStorage.setItem('installDismissed', Date.now());
        });
    }

    // Register service worker (optional - can be disabled if causing issues)
    if ('serviceWorker' in navigator) {
        // Uncomment to enable service worker
        // registerServiceWorker();
        console.log('Service worker registration disabled - app will work online only');
    }
}

function handleInstallPrompt(e) {
    console.log('Install prompt available');
    
    // Prevent the default install prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Check if user dismissed recently
    const dismissedTime = localStorage.getItem('installDismissed');
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (dismissedTime && (Date.now() - parseInt(dismissedTime)) < sevenDays) {
        console.log('Install banner dismissed recently, not showing');
        return;
    }
    
    // Show the install banner
    if (installBanner) {
        installBanner.style.display = 'flex';
    }
}

async function installApp() {
    if (!deferredPrompt) {
        console.log('No install prompt available');
        return;
    }

    // Hide the banner
    if (installBanner) {
        installBanner.style.display = 'none';
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
        console.log('App installation accepted');
    } else {
        console.log('App installation declined');
    }

    // Clear the deferred prompt
    deferredPrompt = null;
}

// Service Worker Registration (currently disabled)
function registerServiceWorker() {
    navigator.serviceWorker
        .register('sw.js')
        .then(registration => {
            console.log('Service Worker registered successfully:', registration);
            
            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60000); // Check every minute
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        });

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated, reloading page...');
        window.location.reload();
    });
}

// App lifecycle events
window.addEventListener('appinstalled', () => {
    console.log('MFC Orders app installed successfully!');
    deferredPrompt = null;
    if (installBanner) {
        installBanner.style.display = 'none';
    }
});

// Handle offline/online status
window.addEventListener('online', () => {
    console.log('App is online');
    showNotification('Back online', 'success');
});

window.addEventListener('offline', () => {
    console.log('App is offline');
    showNotification('Working offline', 'warning');
});

// Notification helper
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('app-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'app-notification';
        notification.className = 'app-notification';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.className = `app-notification ${type}`;
    notification.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Export for use in other modules
window.MFC_PWA = {
    installApp,
    showNotification
};
