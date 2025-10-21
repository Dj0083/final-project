// controllers/authController.js
const User = require('../models/User');
const Seller = require('../models/Seller');
const Affiliate = require('../models/Affiliate');
const Investor = require('../models/Investor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const nodemailer = require('nodemailer');

// JWT token generation
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Register user
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const userId = await User.create({ name, email, password, phone, address, role });

    if (role === 'seller') {
      const { businessName, businessAddress, idNumber, bankAccount } = req.body;
      const businessImage = req.files?.businessImage ? req.files.businessImage[0].filename : null;
      const idImage = req.files?.idImage ? req.files.idImage[0].filename : null;
      const bankProofImage = req.files?.bankProofImage ? req.files.bankProofImage[0].filename : null;

      await Seller.create({
        userId,
        businessName,
        businessAddress,
        idNumber,
        bankAccount,
        businessImage,
        idImage,
        bankProofImage
      });
    } else if (role === 'affiliate') {
      const { websiteUrl, affiliateType, agreedToTerms } = req.body;
      await Affiliate.create({ userId, websiteUrl, affiliateType, agreedToTerms });
    } else if (role === 'investor') {
      const { agreedToTerms } = req.body;
      const bankProofImage = req.files?.bankProofImage ? req.files.bankProofImage[0].filename : null;
      await Investor.create({ userId, bankProofImage, agreedToTerms });
    }

    const token = generateToken(userId);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, name, email, role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Suspend user (admin)
exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const adminId = req.user?.userId || null;
    const db = getDB();
    const [rows] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Insert blacklist record (active)
    await db.execute(
      `INSERT INTO user_blacklist (user_id, reason, created_by, active) VALUES (?, ?, ?, 1)`,
      [id, reason || null, adminId]
    );
    // Flag user as suspended
    await db.execute('UPDATE users SET suspended = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'User suspended and blacklisted' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ success: false, error: 'Failed to suspend user' });
  }
};

// Activate user (admin)
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const [rows] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Deactivate any active blacklist entries
    await db.execute(
      `UPDATE user_blacklist SET active = 0, revoked_at = NOW() WHERE user_id = ? AND active = 1`,
      [id]
    );
    // Unset suspended flag
    await db.execute('UPDATE users SET suspended = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'User activated and removed from blacklist' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate user' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    let profileData = {};
    if (user.role === 'seller') {
      profileData = await Seller.findByUserId(user.id);
    } else if (user.role === 'affiliate') {
      profileData = await Affiliate.findByUserId(user.id);
    } else if (user.role === 'investor') {
      profileData = await Investor.findByUserId(user.id);
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot password - UPDATED TO 6-DIGIT CODE
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log('Generated verification code:', verificationCode);

    const db = getDB();
    
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [user.id]
    );

    await db.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, verificationCode, expiresAt]
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code - DigiMarket',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You have requested to reset your password. Use the verification code below:</p>
          <div style="background-color: #fff3e0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #f97316; font-size: 32px; letter-spacing: 5px; margin: 0;">
              ${verificationCode}
            </h1>
          </div>
          <p>This code will expire in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true,
      message: 'Verification code sent to your email' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};

// Reset password - UPDATED TO USE VERIFICATION CODE
exports.resetPassword = async (req, res) => {
  console.log('===== RESET PASSWORD DEBUG =====');
  console.log('Full request body:', JSON.stringify(req.body));
  console.log('================================');

  try {
    const { verificationCode, newPassword } = req.body;

    console.log('verificationCode:', verificationCode);
    console.log('newPassword length:', newPassword?.length);

    if (!verificationCode || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Verification code and new password are required' 
      });
    }

    const db = getDB();
    
    const [rows] = await db.execute(
      `SELECT prt.*, u.id as user_id 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.expires_at > NOW()`,
      [verificationCode]
    );

    console.log('Tokens found:', rows.length);

    if (rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired reset code' 
      });
    }

    const resetToken = rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('Updating password for user:', resetToken.user_id);

    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, resetToken.user_id]
    );

    await db.execute(
      'DELETE FROM password_reset_tokens WHERE id = ?',
      [resetToken.id]
    );

    console.log('Password reset successful');

    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profileData = {};
    if (user.role === 'seller') {
      profileData = await Seller.findByUserId(userId);
    } else if (user.role === 'affiliate') {
      profileData = await Affiliate.findByUserId(userId);
    } else if (user.role === 'investor') {
      profileData = await Investor.findByUserId(userId);
    }

    res.json({
      user: {
        ...user,
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, address } = req.body;

    await User.update(userId, { name, phone, address });

    const user = await User.findById(userId);

    if (user.role === 'seller') {
      const { businessName, businessAddress, idNumber, bankAccount } = req.body;
      const businessImage = req.files?.businessImage ? req.files.businessImage[0].filename : null;
      const idImage = req.files?.idImage ? req.files.idImage[0].filename : null;
      const bankProofImage = req.files?.bankProofImage ? req.files.bankProofImage[0].filename : null;

      await Seller.update(userId, {
        businessName,
        businessAddress,
        idNumber,
        bankAccount,
        businessImage,
        idImage,
        bankProofImage
      });
    } else if (user.role === 'affiliate') {
      const { websiteUrl, affiliateType, agreedToTerms } = req.body;
      await Affiliate.update(userId, { websiteUrl, affiliateType, agreedToTerms });
    } else if (user.role === 'investor') {
      const { agreedToTerms, company } = req.body;
      const bankProofImage = req.files?.bankProofImage ? req.files.bankProofImage[0].filename : null;
      await Investor.update(userId, { bankProofImage, agreedToTerms, company });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== ADMIN - USER MANAGEMENT ====================

// Get all users (with filtering by role and status)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    const db = getDB();

    let query = `
      SELECT 
        u.id,
        u.name as full_name,
        u.email,
        u.phone,
        u.address,
        u.role,
        COALESCE(s.status, i.status, a.status, 'approved') as status,
        u.suspended,
        u.created_at,
        s.business_name,
        s.business_address,
        s.id_number,
        s.bank_account,
        s.business_image,
        s.id_image,
        s.bank_proof_image as seller_bank_proof,
        i.bank_proof_image as investor_bank_proof,
        a.website_url,
        a.affiliate_type
      FROM users u
      LEFT JOIN sellers s ON u.id = s.user_id
      LEFT JOIN investors i ON u.id = i.user_id
      LEFT JOIN affiliates a ON u.id = a.user_id
      WHERE u.role != 'admin'
    `;

    const params = [];

    if (role && role !== 'all') {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (status && status !== 'all') {
      query += ' AND COALESCE(s.status, i.status, a.status, "approved") = ?';
      params.push(status);
    }

    query += ' ORDER BY u.created_at DESC';

    const [users] = await db.execute(query, params);

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        status: user.status,
        suspended: !!user.suspended,
        is_active: user.status === 'approved' && !user.suspended,
        created_at: user.created_at,
        business_name: user.business_name,
        business_address: user.business_address,
        id_number: user.id_number,
        bank_account: user.bank_account,
        bank_proof_image: user.seller_bank_proof || user.investor_bank_proof,
        business_image: user.business_image,
        id_image: user.id_image,
        website_url: user.website_url,
        affiliate_type: user.affiliate_type
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users' 
    });
  }
};

// Approve user
exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = users[0];

    if (user.role === 'seller') {
      await db.execute('UPDATE sellers SET status = ? WHERE user_id = ?', ['approved', id]);
    } else if (user.role === 'investor') {
      await db.execute('UPDATE investors SET status = ? WHERE user_id = ?', ['approved', id]);
    } else if (user.role === 'affiliate') {
      await db.execute('UPDATE affiliates SET status = ? WHERE user_id = ?', ['approved', id]);
    }

    res.json({ 
      success: true,
      message: 'User approved successfully' 
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to approve user' 
    });
  }
};

// Reject user
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = users[0];

    if (user.role === 'seller') {
      await db.execute('UPDATE sellers SET status = ? WHERE user_id = ?', ['rejected', id]);
    } else if (user.role === 'investor') {
      await db.execute('UPDATE investors SET status = ? WHERE user_id = ?', ['rejected', id]);
    } else if (user.role === 'affiliate') {
      await db.execute('UPDATE affiliates SET status = ? WHERE user_id = ?', ['rejected', id]);
    }

    res.json({ 
      success: true,
      message: 'User rejected successfully' 
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject user' 
    });
  }
};