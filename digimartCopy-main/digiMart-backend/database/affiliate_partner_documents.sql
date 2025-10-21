-- Affiliate partner documents table
CREATE TABLE IF NOT EXISTS affiliate_partner_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  user_id INT NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apd_request FOREIGN KEY (request_id) REFERENCES affiliate_partner_requests(id),
  CONSTRAINT fk_apd_user FOREIGN KEY (user_id) REFERENCES users(id)
);
