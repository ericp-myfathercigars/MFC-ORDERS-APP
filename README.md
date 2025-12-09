# MFC Orders - My Father Cigars Field Sales App

A Progressive Web App for managing orders in the field with offline support.

## Features

- **Order Management**: Create, edit, and track orders
- **Customer Database**: Manage customers with tier classifications (Main, High, Medium, Low)
- **Product Catalog**: Complete MFC product lineup with box sizes
- **Offline Support**: Works without internet connection
- **PDF Generation**: Export orders as downloadable files
- **Sales Reports**: Track performance with comprehensive reporting
- **Mobile-First Design**: Optimized for field use on phones and tablets

## Installation on GitHub Pages

1. **Upload to GitHub**:
   - All files should be in the root of your repository
   - Make sure the repository is set to "Public"

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "main" branch
   - Click "Save"
   - Your app will be live at: `https://yourusername.github.io/repository-name`

3. **Install on Mobile Device**:
   - Open the GitHub Pages URL on your phone/tablet
   - For iOS: Tap the Share button → "Add to Home Screen"
   - For Android: Tap the menu (3 dots) → "Add to Home Screen"

## Box Size Reference

The app includes the correct box conversions:
- **23 units per box**: My Father, My Father Connecticut, Le Bijou, My Father Judge
- **20 units per box**: All other My Father Cigars lines

## Initial Setup

The app comes pre-loaded with sample data including:
- 5 sample customers (The Cigar Room, Tinder Box, Spring Street, etc.)
- 7 sample products from the MFC lineup
- Tier classifications (Main, High, Medium, Low)

You can customize this data directly in the app or modify the `initializeSampleData()` function in `app.js`.

## Usage

### Creating an Order
1. Click "New Order"
2. Select customer
3. Add items (product, quantity, price)
4. Save order

### Offline Mode
- Orders created offline are stored locally
- Sync status shows "Offline" when no internet connection
- All data persists using browser localStorage

### Reports
- View sales summaries
- Export orders to CSV
- Generate sales reports

## Data Storage

All data is stored locally in your browser using localStorage. This means:
- Data persists between sessions
- Works completely offline
- No external database required
- Clear browser data will reset the app

## Browser Compatibility

Works on:
- iOS Safari 12+
- Chrome (mobile & desktop)
- Firefox (mobile & desktop)
- Edge

## Customization

To add your actual customer and product data:

1. Open `app.js`
2. Find the `initializeSampleData()` function
3. Replace the sample customers and products arrays with your actual data
4. Or use the app interface to manually add/edit data

## Support

For issues or questions, refer to the GitHub repository issues page.
