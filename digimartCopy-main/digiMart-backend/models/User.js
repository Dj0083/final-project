const { getDB } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    const db = getDB();
    const { name, email, password, phone, address, role } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, address, role || 'customer']
    );
    
    return result.insertId;
  }

  // Find user by email
  static async findByEmail(email) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update user profile
  static async update(id, userData) {
    const db = getDB();
    const { name, phone, address } = userData;
    const [result] = await db.execute(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name, phone, address, id]
    );
    return result.affectedRows;
  }

  // Check if email exists
  static async emailExists(email, excludeId = null) {
    const db = getDB();
    let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    let params = [email];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await db.execute(query, params);
    return rows[0].count > 0;
  }
}

module.exports = User;