# Active/Inactive User Status Feature

## 📋 Overview

This feature automatically sets users as **Active** or **Inactive** based on their approval status:
- ✅ **Active** = Approved users (status: 'approved')
- ⚠️ **Inactive** = Pending or Rejected users (status: 'pending' or 'rejected')

## 🔄 How It Works

### User Journey:

1. **User Registers** 
   - Sellers/Investors/Affiliates → Status: `pending` → **Inactive** ⚪
   - Customers → Status: `approved` → **Active** 🟢

2. **Admin Reviews in "Manage Users"**
   - Sees pending users with Approve/Reject buttons

3. **Admin Approves User**
   - Status changes to `approved`
   - User becomes **Active** 🟢
   - User can now login

4. **Admin Rejects User**
   - Status changes to `rejected`
   - User stays **Inactive** ⚪
   - User cannot login

5. **View in "All Users"**
   - Active users show: 🟢 **Active** (green indicator)
   - Inactive users show: ⚪ **Inactive** (gray indicator)

## 🔧 Backend Changes

### File: `digiMart-backend/controllers/userController.js`

#### Enhanced `getAllUsers` Function:
```javascript
res.json({
  success: true,
  users: users.map(user => ({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,                    // 'approved', 'pending', 'rejected'
    is_active: user.status === 'approved',  // ✨ NEW FIELD
    // ... other fields
  }))
});
```

#### Logic:
- `is_active = true` when `status === 'approved'`
- `is_active = false` when `status === 'pending'` or `status === 'rejected'`

## 📱 Frontend Changes

### 1. File: `frontend/app/admin/UsersTab.js`

#### New Features:
✅ Fetches real data from backend API
✅ Shows active/inactive status with visual indicators
✅ Displays active/inactive counts in header
✅ Color-coded status badges

#### Visual Indicators:

**User Card Display:**
```
┌─────────────────────────────────────┐
│  👤 John Smith                      │
│  📧 john@example.com                │
│  [Seller] [Approved] 🟢 Active     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  👤 Sarah Johnson                   │
│  📧 sarah@example.com               │
│  [Investor] [Pending] ⚪ Inactive   │
└─────────────────────────────────────┘
```

#### Header Stats:
```
All Users
25 registered users  [🟢 20 Active]  [⚪ 5 Inactive]
```

#### Status Badge Colors:
- **Approved** → 🟢 Green background
- **Pending** → 🟡 Yellow background
- **Rejected** → 🔴 Red background

#### Active/Inactive Indicators:
- **Active** → 🟢 Green dot + "Active" text
- **Inactive** → ⚪ Gray dot + "Inactive" text

### 2. File: `frontend/app/admin/ManageUsers.js`

This screen continues to:
- ✅ Show all users with filtering
- ✅ Display pending users with Approve/Reject buttons
- ✅ Update user status on approval/rejection
- ✅ Automatically refresh list after actions

## 🎨 UI/UX Improvements

### User Card Layout:
```
┌────────────────────────────────────────────┐
│  [Avatar]  John Smith                      │
│            john@example.com                │
│            [Role Badge] [Status Badge]     │
│            [🟢 Active/⚪ Inactive]          │
│            [View] [Edit]                   │
└────────────────────────────────────────────┘
```

### Color Scheme:
| Status    | Badge Color | Dot Color | Text Color |
|-----------|-------------|-----------|------------|
| Approved  | Green       | Green     | Green-700  |
| Pending   | Yellow      | N/A       | Yellow-700 |
| Rejected  | Red         | N/A       | Red-700    |
| Active    | N/A         | Green     | Green-700  |
| Inactive  | N/A         | Gray      | Gray-600   |

## 📊 Statistics Tracking

### Added Stats:
```javascript
stats: {
  totalUsers: 25,
  customers: 10,
  sellers: 8,
  investors: 5,
  affiliates: 2,
  activeUsers: 20,    // ✨ NEW
  inactiveUsers: 5     // ✨ NEW
}
```

## 🔐 Authentication

Both screens now use proper authentication:
- ✅ Uses `AuthContext` for user data
- ✅ Falls back to `SecureStore` for token
- ✅ Sends JWT token in API requests
- ✅ Handles session expiry gracefully

## 🧪 Testing Workflow

### Test Case 1: New User Registration (Seller)
1. Register as seller
2. Check "Manage Users" → Should show as Pending
3. Check "All Users" → Should show as Inactive ⚪
4. Status badge should be Yellow "Pending"

### Test Case 2: Approve User
1. Go to "Manage Users"
2. Find pending user
3. Click "Approve"
4. Confirm approval
5. Go to "All Users"
6. User should now show as Active 🟢
7. Status badge should be Green "Approved"

### Test Case 3: Reject User
1. Go to "Manage Users"
2. Find pending user
3. Click "Reject"
4. Confirm rejection
5. Go to "All Users"
6. User should show as Inactive ⚪
7. Status badge should be Red "Rejected"

### Test Case 4: Customer Registration
1. Register as customer
2. Should be auto-approved
3. Check "All Users" → Should show as Active 🟢 immediately
4. Status badge should be Green "Approved"

## 🎯 Benefits

1. **Clear Visual Feedback** - Easy to see who can use the system
2. **Automatic Status** - No manual active/inactive toggle needed
3. **Consistent Logic** - Active = Approved, always
4. **Better UX** - Color-coded indicators are intuitive
5. **Real-time Updates** - Changes reflect immediately
6. **Audit Trail** - Can see status history (approved, pending, rejected)

## 🚀 API Endpoints Used

### GET `/api/users/all`
**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "full_name": "John Smith",
      "email": "john@example.com",
      "role": "seller",
      "status": "approved",
      "is_active": true,  // ✨ Computed field
      "created_at": "2025-10-15T10:30:00Z"
    }
  ]
}
```

### POST `/api/users/:id/approve`
- Changes status to `approved`
- User becomes active (`is_active = true`)

### POST `/api/users/:id/reject`
- Changes status to `rejected`
- User stays inactive (`is_active = false`)

## 📝 Summary

This feature provides a complete active/inactive user management system:

- ✅ Backend automatically calculates `is_active` based on approval status
- ✅ Frontend displays clear visual indicators (green dot = active, gray dot = inactive)
- ✅ Works seamlessly with existing approval workflow
- ✅ No additional database columns needed (computed from existing status)
- ✅ Updates in real-time when users are approved/rejected
- ✅ Clear statistics showing active vs inactive users

The system now provides administrators with instant visibility into which users are active and can use the platform! 🎉
