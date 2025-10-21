# Image Display Fix Checklist

## ✅ What Has Been Fixed

All files have been updated from `192.168.8.124` to `192.168.56.83`:

### Frontend Files Updated:
- ✅ `api.js` - BASE_URL
- ✅ `app/customer/customerDashboard.js` (2 locations)
- ✅ `app/customer/favorites.js`
- ✅ `app/customer/orders.js`
- ✅ `app/customer/ProductDetail.js`
- ✅ `app/customer/ProductDetailSimple.js`
- ✅ `app/customer/orderDetails.js` (2 locations)
- ✅ `app/sellerCenter.js`
- ✅ `app/manageOrder.js`
- ✅ `app/orders.js`
- ✅ `app/out-of-stock.js` (2 locations)
- ✅ `app/low-stock-management.js` (3 locations)

### Backend Files Updated:
- ✅ `digiMart-backend/controllers/productController.js` (2 locations)

---

## 🔍 Steps to Get Images Working

### Step 1: Verify Backend is Running
```powershell
# In a PowerShell terminal:
cd E:\copy\EntraDigimart-test\digiMart-backend
node server.js
```

**Expected Output:**
```
Server is running on port 5000
Connected to MySQL database
```

### Step 2: Test Backend Image Access
Open a browser and try to access an image directly:
```
http://192.168.56.83:5000/uploads/image-1759905777200-609378619.jpeg
```

**If image loads:** ✅ Backend is serving images correctly
**If image fails:** ❌ Check backend static file configuration

### Step 3: Reload Expo App
In your Metro bundler terminal (where `npx expo start` is running):
1. Press `r` to reload the app
2. Or restart completely: Stop (Ctrl+C) then run `npx expo start` again

### Step 4: Check Console Logs
Look for these logs in your Metro terminal:
```
🖼️ Processing image for [Product Name]:
   imageUrl: /uploads/image-xxxxx.jpeg
   ✅ Constructed URL from imageUrl: http://192.168.56.83:5000/uploads/image-xxxxx.jpeg
```

**If you see ❌ errors:**
- Check what the actual error message says
- Verify the image path in the database

---

## 🐛 Debugging Steps if Images Still Don't Show

### Check 1: Verify Network Connection
```powershell
# Test if you can reach the backend
curl http://192.168.56.83:5000/api
```

### Check 2: Verify Your Current IP
```powershell
ipconfig
```
Look for your Wi-Fi adapter and verify the IP is still `192.168.56.83`

**If IP changed:** Update all files again with the new IP

### Check 3: Check Database Image Paths
The image paths in your database should be in one of these formats:
- `/uploads/image-xxxxx.jpeg` ✅
- `uploads/image-xxxxx.jpeg` ✅
- Full URL: `http://192.168.56.83:5000/uploads/image-xxxxx.jpeg` ✅

### Check 4: Verify Backend Static File Serving
In `digiMart-backend/server.js`, you should have:
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

### Check 5: Check Image Files Exist
```powershell
cd E:\copy\EntraDigimart-test\digiMart-backend\uploads
ls
```

You should see your image files listed.

---

## 🚀 Quick Fix Commands

### If Backend Not Running:
```powershell
cd E:\copy\EntraDigimart-test\digiMart-backend
node server.js
```

### If Frontend Not Updated:
```powershell
cd E:\copy\EntraDigimart-test\frontend
# Press 'r' in the Metro terminal
# Or restart:
# Ctrl+C to stop
npx expo start
```

### If You Need to Clear Cache:
```powershell
cd E:\copy\EntraDigimart-test\frontend
npx expo start -c
```

---

## 📱 What to Test After Reload

1. **Customer Dashboard** - Product cards should show images
2. **Favorites Page** - Favorite products should show images
3. **Orders Page** - Order items should show images
4. **Product Details** - Full product images should display
5. **Seller Center** - Business profile image should show
6. **Inventory** - Product images in inventory list
7. **Low Stock Management** - Product images should display
8. **Out of Stock** - Product images should display

---

## 🆘 Still Not Working?

If images still don't display after following all steps:

1. **Check Metro terminal for specific error messages**
2. **Check backend terminal for any errors**
3. **Try accessing an image URL directly in your browser**
4. **Verify your phone/emulator is on the same network (192.168.56.x)**
5. **Check firewall settings - port 5000 must be accessible**

### Test Image URL Format:
Your image URLs should look like:
```
http://192.168.56.83:5000/uploads/image-1759905777200-609378619.jpeg
```

Copy this URL and test it in your browser to verify the backend is serving images correctly.
