const { getDB } = require('../config/database');

class Seller {
  // Create seller profile
  static async create(sellerData) {
    const db = getDB();
    const { userId, businessName, businessAddress, idNumber, bankAccount, businessImage, idImage, bankProofImage } = sellerData;
    
    const [result] = await db.execute(
      `INSERT INTO sellers (user_id, business_name, business_address, id_number, bank_account, business_image, id_image, bank_proof_image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, businessName, businessAddress, idNumber, bankAccount, businessImage, idImage, bankProofImage]
    );
    
    return result.insertId;
  }

  // Find seller by user ID
  static async findByUserId(userId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM sellers WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  // Update seller profile
  static async update(userId, sellerData) {
    const db = getDB();
    const { businessName, businessAddress, idNumber, bankAccount, businessImage, idImage, bankProofImage } = sellerData;
    
    const [result] = await db.execute(
      `UPDATE sellers SET business_name = ?, business_address = ?, id_number = ?, bank_account = ?, 
       business_image = COALESCE(?, business_image), id_image = COALESCE(?, id_image), 
       bank_proof_image = COALESCE(?, bank_proof_image) WHERE user_id = ?`,
      [businessName, businessAddress, idNumber, bankAccount, businessImage, idImage, bankProofImage, userId]
    );
    
    return result.affectedRows;
  }
}

module.exports = Seller;