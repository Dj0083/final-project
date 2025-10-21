const { getDB } = require('../config/database');

class Affiliate {
  // Create affiliate profile
  static async create(affiliateData) {
    const db = getDB();
    const { userId, websiteUrl, affiliateType, agreedToTerms } = affiliateData;
    
    const [result] = await db.execute(
      'INSERT INTO affiliates (user_id, website_url, affiliate_type, agreed_to_terms) VALUES (?, ?, ?, ?)',
      [userId, websiteUrl, affiliateType, agreedToTerms]
    );
    
    return result.insertId;
  }

  // Find affiliate by user ID
  static async findByUserId(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM affiliates WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  // Update affiliate profile
  static async update(userId, affiliateData) {
    const db = getDB();
    const { websiteUrl, affiliateType, agreedToTerms } = affiliateData;
    
    const [result] = await db.execute(
      'UPDATE affiliates SET website_url = ?, affiliate_type = ?, agreed_to_terms = ? WHERE user_id = ?',
      [websiteUrl, affiliateType, agreedToTerms, userId]
    );
    
    return result.affectedRows;
  }
}

module.exports = Affiliate;