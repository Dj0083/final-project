const { getDB } = require('../config/database');

class Investor {
  // Create investor profile
  static async create(investorData) {
    const db = getDB();
    const { userId, bankProofImage, agreedToTerms } = investorData;

    // Convert boolean to 0 or 1
    const agreed = agreedToTerms ? 1 : 0;

    const [result] = await db.execute(
      'INSERT INTO investors (user_id, bank_proof_image, agreed_to_terms) VALUES (?, ?, ?)',
      [userId, bankProofImage, agreed]
    );

    return result.insertId;
  }

  // Find investor by user ID
  static async findByUserId(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM investors WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  // Update investor profile
  static async update(userId, investorData) {
    const db = getDB();
    const { bankProofImage, agreedToTerms } = investorData;

    const agreed = agreedToTerms !== undefined ? (agreedToTerms ? 1 : 0) : null;

    const [result] = await db.execute(
      'UPDATE investors SET bank_proof_image = COALESCE(?, bank_proof_image), agreed_to_terms = COALESCE(?, agreed_to_terms) WHERE user_id = ?',
      [bankProofImage, agreed, userId]
    );

    return result.affectedRows;
  }
}

module.exports = Investor;
