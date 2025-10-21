-- Investment Preferences Table
CREATE TABLE IF NOT EXISTS investment_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  min_investment DECIMAL(15, 2),
  max_investment DECIMAL(15, 2),
  categories TEXT,
  regions TEXT,
  risk_level ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_preference (user_id)
);

-- Investor Seller Connections Table
CREATE TABLE IF NOT EXISTS investor_seller_connections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  investor_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seller_investor (seller_id, investor_id),
  INDEX idx_seller (seller_id),
  INDEX idx_investor (investor_id),
  INDEX idx_status (status)
);
