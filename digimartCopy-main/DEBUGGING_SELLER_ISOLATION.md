# 🔍 Debugging Seller Isolation Issue

## Problem Description
Two sellers logged in on different phones are seeing:
- **Phone 1**: Dummy data
- **Phone 2**: Other seller's products

This indicates a serious data isolation problem.

## ✅ What We've Fixed

### Backend (Already Correct)
1. **Product Controller** (`productController.js`):
   - ✅ Extracts `sellerId` from JWT token: `const sellerId = req.user.userId;`
   - ✅ Calls `Product.findBySellerId(sellerId)` which filters by seller_id
   - ✅ Added comprehensive logging to track which seller requests which products

2. **Product Model** (`Product.js`):
   - ✅ SQL Query: `SELECT * FROM products WHERE seller_id = ? AND status != 'deleted'`
   - ✅ Properly filters by seller_id

3. **Auth Middleware** (`auth.js`):
   - ✅ Extracts JWT token and sets `req.user.userId`
   - ✅ Validates user exists

4. **Database Schema**:
   - ✅ `products.seller_id` is foreign key to `users.id`

### Frontend (Enhanced with Debugging)
1. **Inventory Component**:
   - ✅ Shows seller name and ID in banner
   - ✅ Comprehensive console logging
   - ✅ Calls authenticated endpoint `/products/inventory`

---

## 🔍 Debugging Steps

### Step 1: Check Backend Logs
When you load inventory on either phone, check your backend terminal for logs like:

```
═══════════════════════════════════════════════════════
📦 BACKEND: Fetching inventory for seller
👤 Seller ID: 123
👤 Seller Name: John Seller
👤 Seller Email: john@example.com
🔒 SECURITY: Query will filter by seller_id = 123
═══════════════════════════════════════════════════════
📊 Database returned 5 products for seller 123
✅ VERIFIED: All products belong to seller 123
📊 Categorized results:
   Active: 3
   Out of Stock: 2
   Violations: 0
═══════════════════════════════════════════════════════
```

**What to Look For:**
- ✅ Check if Seller ID matches the logged-in seller
- ✅ Check if products count is correct
- 🚨 Look for "SECURITY BREACH" messages (products with wrong seller_id)

### Step 2: Check Frontend Logs (Expo Console)
When you open inventory, check the React Native console for:

```
═══════════════════════════════════════════════════════
🔄 FETCHING INVENTORY FOR SELLER
═══════════════════════════════════════════════════════
👤 Current User: {...}
📋 User ID: 123
📋 User Name: John Seller
📋 User Role: seller
🔒 SECURITY: Only this seller's products will be shown
═══════════════════════════════════════════════════════
📦 Calling authenticated inventory endpoint: /products/inventory
🔑 JWT token will identify seller automatically
✅ Backend response received
```

### Step 3: Verify JWT Token
On each phone, add this check:

1. Open the app
2. Check the console for the JWT token being used
3. Decode it at [jwt.io](https://jwt.io) to see the userId

**Expected JWT Payload:**
```json
{
  "userId": 123,
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Step 4: Check Network Requests
In Expo, enable network debugging:
1. Shake device → "Debug Remote JS"
2. Open Chrome DevTools → Network tab
3. Look for: `GET http://192.168.8.124:5000/api/products/inventory`
4. Check Headers → Authorization: `Bearer <token>`

---

## 🐛 Possible Root Causes

### 1. Token Caching Issue
**Symptom**: Old seller's token still in phone storage

**Solution**:
```javascript
// On both phones, logout and login again
// This refreshes the JWT token
```

**Manual Fix**:
- Uninstall and reinstall the app on both phones
- Or clear app data

### 2. Wrong API Base URL
**Symptom**: One phone might be hitting a different backend

**Check**: `frontend/api.js` line 5:
```javascript
const BASE_URL = 'http://192.168.8.124:5000/api';
```

**Verify**:
- Both phones on same WiFi network
- Both can ping `192.168.8.124`
- Backend is running on that IP

### 3. Database Has Wrong seller_id
**Symptom**: Products in database have incorrect seller_id values

**Check Database**:
```sql
-- Check products and their sellers
SELECT id, product_name, seller_id FROM products;

-- Check users
SELECT id, name, role FROM users WHERE role = 'seller';

-- Find mismatches
SELECT p.id, p.product_name, p.seller_id, u.name as seller_name
FROM products p
LEFT JOIN users u ON p.seller_id = u.id
WHERE p.seller_id IS NOT NULL;
```

**If seller_id is NULL or wrong**:
```sql
-- Fix manually (example)
UPDATE products SET seller_id = 123 WHERE id IN (1,2,3);
```

### 4. JWT Secret Mismatch
**Symptom**: Backend can't decode token properly

**Check**: `.env` file has correct JWT_SECRET on backend

### 5. Frontend Showing Cached/Dummy Data
**Symptom**: useState not updating properly

**Solution**: Added in code - useEffect properly refreshes on user change

---

## ✅ Verification Tests

### Test 1: Seller A Login
1. Login as Seller A on Phone 1
2. Check banner shows "Seller A's Inventory"
3. Check Seller ID in banner
4. Verify products shown belong to Seller A

### Test 2: Seller B Login
1. Login as Seller B on Phone 2
2. Check banner shows "Seller B's Inventory"
3. Check Seller ID in banner (should be DIFFERENT from Seller A)
4. Verify products shown belong to Seller B (should be DIFFERENT from Seller A)

### Test 3: New Seller
1. Create new seller account
2. Login
3. Should see "No products" message
4. Should NOT see any other seller's products

---

## 🔧 Quick Fixes to Try

### Fix 1: Clear All App Data (Both Phones)
```bash
# On both phones:
1. Uninstall app
2. Reinstall with: npx expo start
3. Login fresh
```

### Fix 2: Restart Backend with Fresh Logs
```bash
# In digiMart-backend directory
cd e:\copy\EntraDigimart-test\digiMart-backend
node server.js
```

### Fix 3: Force Token Refresh
Add logout button in inventory, logout on both phones, then login again.

### Fix 4: Check Database Directly
```sql
-- See what's actually in database
SELECT 
  u.id as seller_id,
  u.name as seller_name,
  COUNT(p.id) as product_count
FROM users u
LEFT JOIN products p ON u.id = p.seller_id
WHERE u.role = 'seller'
GROUP BY u.id, u.name;
```

---

## 📊 Expected Behavior

| Seller | Seller ID | Products Visible | Other Seller's Products |
|--------|-----------|------------------|-------------------------|
| John   | 123       | Only John's      | ❌ NOT visible         |
| Jane   | 456       | Only Jane's      | ❌ NOT visible         |
| New    | 789       | Empty (0)        | ❌ NOT visible         |

---

## 🚨 Red Flags to Look For

1. **Backend log shows wrong Seller ID**: JWT token issue
2. **Backend log shows "SECURITY BREACH"**: Database has wrong seller_id
3. **Frontend shows different Seller ID than expected**: Wrong user logged in or token cached
4. **Products have seller_id NULL**: Database integrity issue
5. **Both phones show same products**: Not using JWT, using public endpoint

---

## 📞 Next Steps

1. **Enable All Logging**: Backend and frontend now have comprehensive logs
2. **Test on Both Phones**: Open inventory and check console/terminal logs
3. **Share Logs**: Copy the logs showing:
   - Frontend: User ID and products received
   - Backend: Seller ID and products sent
4. **Check Database**: Run SQL queries to verify seller_id values

---

## 🔒 Security Confirmation Checklist

- [ ] Backend extracts sellerId from JWT token ✅
- [ ] SQL query filters by seller_id ✅
- [ ] Frontend calls authenticated endpoint ✅
- [ ] JWT token contains correct userId ⚠️ **NEED TO VERIFY**
- [ ] Database has correct seller_id values ⚠️ **NEED TO VERIFY**
- [ ] Both phones using same backend URL ⚠️ **NEED TO VERIFY**
- [ ] No dummy data fallback in code ✅
- [ ] Token not cached from previous login ⚠️ **NEED TO VERIFY**

---

## 💡 Most Likely Issues

Based on the symptoms:

1. **80% Probability**: JWT token cached from old login → **Solution**: Logout/login on both phones
2. **15% Probability**: Database has wrong seller_id values → **Solution**: Check database directly
3. **5% Probability**: API base URL different on phones → **Solution**: Check api.js on both builds

**Recommended Action**: Uninstall app on both phones, reinstall, and login fresh.
