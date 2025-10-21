# 🔧 Quick IP Update Guide

## Current Network IP: `192.168.56.83`

## Option 1: Run PowerShell Script (FASTEST)

```powershell
cd E:\copy\EntraDigimart-test\frontend
.\update-ip.ps1
```

This will automatically update ALL files with hardcoded IPs to your current IP.

## Option 2: Manual Update (if script doesn't work)

Update these files manually, replacing `192.168.8.124` with `192.168.56.83`:

### API Configuration:
- ✅ `api.js` - Already updated

### Image URLs (need to update):
- `app/customer/favorites.js`
- `app/customer/customerDashboard.js`
- `app/customer/orders.js`
- `app/customer/ProductDetail.js`
- `app/customer/ProductDetailSimple.js`
- `app/customer/orderDetails.js`
- `app/sellerCenter.js`
- `app/manageOrder.js`
- `app/orders.js`
- `app/out-of-stock.js`
- `app/low-stock-management.js`
- `app/inventory.js` - Partially updated with util function

## Better Solution: Use Centralized URL Config

I've created `config/urls.js` which exports:
- `buildImageUrl(path)` - Automatically builds full image URLs
- `IMAGE_BASE_URL` - Base URL for images

### How to use:

```javascript
// Instead of:
const imageUrl = `http://192.168.8.124:5000${item.image}`;

// Do this:
import { buildImageUrl } from '../config/urls';
const imageUrl = buildImageUrl(item.image);
```

This way, you only need to change the IP in ONE place (`api.js`)!

## Current Status:

✅ **api.js** - Set to `http://192.168.56.83:5000/api`  
✅ **Backend running** on port 5000  
⚠️ **Image URLs** - Need to run update script or use util function  

## Quick Test:

After updating, reload your Expo app and try:
1. Login
2. View product images
3. Check if images load correctly

If images don't load, the IPs haven't been updated yet!

## Future: Automatic URL Detection

To avoid this issue forever, we have the automatic URL detection system ready.
See: `QUICK_START_URL_DETECTION.md`

---

**Need help?** Run the PowerShell script - it's the fastest way!
