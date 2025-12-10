// Service Worker registration disabled temporarily
// Can be re-enabled once all files are stable

/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
*/

// Note: App works perfectly without service worker
// Service worker only adds offline caching capability

// Handle app installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Optionally show install button
    console.log('App can be installed');
});

window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
    deferredPrompt = null;
});
