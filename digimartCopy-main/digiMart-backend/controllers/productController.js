const Product = require('../models/Product');
const { getDB } = require('../config/database');

// Add new product
exports.addProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { productName, description, category, price, stockQty } = req.body;

    // Validate required fields
    if (!productName || !description || !category || !price || !stockQty) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate price and stock quantity
    const priceValue = parseFloat(price);
    const stockValue = parseInt(stockQty);

    if (isNaN(priceValue) || priceValue < 0) {
      return res.status(400).json({ error: 'Price must be a valid number greater than or equal to 0' });
    }

    if (isNaN(stockValue) || stockValue < 5) {
      return res.status(400).json({ error: 'Stock quantity must be at least 5' });
    }

    // Handle single image upload
    let images = [];
    if (req.file) {
      images = [{
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`
      }];
    }

    const productData = {
      sellerId,
      productName,
      description,
      category,
      price: parseFloat(price),
      stockQty: parseInt(stockQty),
      // Store as JSON array, not string
      images: images.length > 0 ? images : null
    };

    const productId = await Product.create(productData);
    const newProduct = await Product.findById(productId);

    res.status(201).json({
      message: 'Product added successfully',
      product: newProduct
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all products for marketplace
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;

    let products;
    if (search) {
      products = await Product.search(search);
    } else if (category && category !== 'All') {
      products = await Product.findByCategory(category);
    } else {
      products = await Product.findAll();
    }

    // Format products for frontend
    const formattedProducts = products.map(product => {
      let imageUrl = null;
      if (product.images) {
        let imgs = product.images;
        if (typeof imgs === "string") {
          try {
            imgs = JSON.parse(imgs);
          } catch (err) {
            console.error("Invalid JSON in product.images:", product.id, err);
            imgs = [];
          }
        }
        if (Array.isArray(imgs) && imgs.length > 0) {
          imageUrl = `http://192.168.56.83:5000${imgs[0].path}`;
        }
      }

      return {
        id: product.id,
        productName: product.product_name,
        description: product.description,
        category: product.category,
        price: product.price,
        stockQty: product.stock_qty,
        imageUrl,
        sellerName: product.seller_name,
        rating: 4.5,
        status: product.status
      };
    });

    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get seller's products for inventory
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 BACKEND: Fetching inventory for seller');
    console.log('👤 Seller ID:', sellerId);
    console.log('👤 Seller Name:', req.user.name);
    console.log('👤 Seller Email:', req.user.email);
    console.log('🔒 SECURITY: Query will filter by seller_id =', sellerId);
    console.log('═══════════════════════════════════════════════════════');
    
    const products = await Product.findBySellerId(sellerId);
    
    console.log('📊 Database returned', products.length, 'products for seller', sellerId);
    if (products.length > 0) {
      console.log('   Sample product:', {
        id: products[0].id,
        name: products[0].product_name,
        seller_id: products[0].seller_id
      });
      
      // SECURITY CHECK: Verify all products belong to this seller
      const invalidProducts = products.filter(p => p.seller_id !== sellerId);
      if (invalidProducts.length > 0) {
        console.error('🚨 SECURITY BREACH: Found products NOT belonging to seller', sellerId);
        console.error('   Invalid products:', invalidProducts.map(p => ({ id: p.id, seller_id: p.seller_id })));
      } else {
        console.log('✅ VERIFIED: All products belong to seller', sellerId);
      }
    }

    // Categorize products by status
    const categorizedProducts = {
      Active: products.filter(p => p.status === 'active' && p.stock_qty > 0),
      'Out of Stock': products.filter(p => p.status === 'active' && p.stock_qty === 0),
      Violation: products.filter(p => p.status === 'violation')
    };
    
    console.log('📊 Categorized results:');
    console.log('   Active:', categorizedProducts.Active.length);
    console.log('   Out of Stock:', categorizedProducts['Out of Stock'].length);
    console.log('   Violations:', categorizedProducts.Violation.length);
    console.log('═══════════════════════════════════════════════════════');

    const formatProduct = (product) => {
      let image = 'https://via.placeholder.com/150';
      if (product.images) {
        let imgs = product.images;
        if (typeof imgs === 'string') {
          try {
            imgs = JSON.parse(imgs);
          } catch (err) {
            console.error("Invalid JSON in product.images:", product.id, err);
            imgs = [];
          }
        }
        if (Array.isArray(imgs) && imgs.length > 0) {
          image = `http://192.168.56.83:5000${imgs[0].path}`;
        }
      }

      return {
        id: product.id,
        name: product.product_name,
        price: product.price,
        stock: product.stock_qty,
        image,
        violation: product.status === 'violation' ? 'Product under review' : null
      };
    };

    const formattedResponse = {
      Active: categorizedProducts.Active.map(formatProduct),
      'Out of Stock': categorizedProducts['Out of Stock'].map(formatProduct),
      Violation: categorizedProducts.Violation.map(formatProduct)
    };

    res.json(formattedResponse);
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single product details
exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    
    console.log('🔍 getProductById called with productId:', productId);
    
    // If someone is trying to access /products/inventory incorrectly
    if (productId === 'inventory') {
      console.error('❌ ERROR: /products/inventory should use getSellerProducts, not getProductById');
      return res.status(400).json({ 
        error: 'Invalid endpoint. Use GET /products/inventory with authentication for seller inventory.' 
      });
    }
    
    const product = await Product.findById(productId);

    if (!product) {
      console.log('❌ Product not found with ID:', productId);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('✅ Product found:', product.product_name);

    let images = [];
    if (product.images) {
      if (typeof product.images === 'string') {
        try {
          images = JSON.parse(product.images);
        } catch (err) {
          console.error("Invalid JSON in product.images:", product.id, err);
        }
      } else if (Array.isArray(product.images)) {
        images = product.images;
      }
    }

    // Get review statistics
    const db = getDB();
    const [reviewStats] = await db.execute(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as review_count
      FROM reviews 
      WHERE product_id = ?
    `, [productId]);

    const formattedProduct = {
      id: product.id,
      productName: product.product_name,
      description: product.description,
      category: product.category,
      price: product.price,
      stockQty: product.stock_qty,
      images,
      sellerName: product.seller_name,
      sellerEmail: product.seller_email,
      average_rating: reviewStats[0]?.average_rating ? parseFloat(reviewStats[0].average_rating) : 0,
      review_count: reviewStats[0]?.review_count || 0
    };

    res.json({ product: formattedProduct });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { productId } = req.params;
    const { productName, description, category, price, stockQty } = req.body;

    console.log('📝 UPDATE PRODUCT REQUEST:');
    console.log('   Product ID:', productId);
    console.log('   Seller ID:', sellerId);
    console.log('   Update data:', { productName, description, category, price, stockQty });

    const product = await Product.findById(productId);
    if (!product) {
      console.log('❌ Product not found:', productId);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.seller_id !== sellerId) {
      console.log('❌ Access denied: Product belongs to seller', product.seller_id, 'not', sellerId);
      return res.status(403).json({ error: 'Access denied. This product belongs to another seller.' });
    }

    // Build update data with only provided fields (allows partial updates)
    const updateData = {};
    
    if (productName !== undefined) updateData.productName = productName;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stockQty !== undefined) updateData.stockQty = parseInt(stockQty);

    if (req.file) {
      const images = [{
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`
      }];
      updateData.images = images;
    }

    console.log('✏️  Updating product with data:', updateData);
    await Product.update(productId, updateData);
    const updatedProduct = await Product.findById(productId);

    console.log('✅ Product updated successfully');
    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update product stock
exports.updateStock = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { productId } = req.params;
    const { stockQty } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.seller_id !== sellerId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const affectedRows = await Product.updateStock(productId, parseInt(stockQty));
    
    if (affectedRows > 0) {
      console.log(`Stock updated for product ${productId}: ${stockQty}`);
      res.json({ 
        message: 'Stock updated successfully', 
        productId: productId,
        newStock: parseInt(stockQty)
      });
    } else {
      res.status(500).json({ error: 'Failed to update stock' });
    }
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Restock product
exports.restockProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { productId } = req.params;
    const { newStock } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.seller_id !== sellerId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await Product.update(productId, { stockQty: parseInt(newStock) });
    res.json({ message: 'Product restocked successfully' });
  } catch (error) {
    console.error('Restock product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product || product.seller_id !== sellerId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await Product.delete(productId);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add product to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const db = getDB();
    
    // First, ensure the favorites table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id)
      )
    `);
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in favorites
    const [existing] = await db.execute(
      'SELECT * FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Product already in favorites' });
    }

    // Add to favorites
    await db.execute(
      'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );

    res.json({ message: 'Product added to favorites' });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove product from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const db = getDB();
    
    const [result] = await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found in favorites' });
    }

    res.json({ message: 'Product removed from favorites' });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's favorite products
exports.getFavoriteProducts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = getDB();

    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name, f.created_at as favorited_at
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE f.user_id = ? AND p.status = 'active'
      ORDER BY f.created_at DESC
    `, [userId]);

    const formattedProducts = rows.map(product => {
      let imageUrl = null;
      if (product.images) {
        let imgs = product.images;
        if (typeof imgs === "string") {
          try {
            imgs = JSON.parse(imgs);
          } catch (err) {
            console.error("Invalid JSON in product.images:", product.id, err);
            imgs = [];
          }
        }
        if (Array.isArray(imgs) && imgs.length > 0) {
          imageUrl = imgs[0].path || null;
        }
      }

      return {
        id: product.id,
        productName: product.product_name,
        description: product.description,
        category: product.category,
        price: product.price,
        stockQty: product.stock_qty,
        imageUrl,
        sellerName: product.seller_name,
        rating: 4.5,
        favoritedAt: product.favorited_at
      };
    });

    res.json({ favorites: formattedProducts });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if product is in favorites
exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const db = getDB();

    console.log('Checking favorite for user:', userId, 'product:', productId);

    // First, ensure the favorites table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id)
      )
    `);

    const [rows] = await db.execute(
      'SELECT * FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    console.log('Favorite check result:', rows);

    res.json({ isFavorite: rows.length > 0 });
  } catch (error) {
    console.error('Check favorite error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Favorites table does not exist');
      res.status(500).json({ error: 'Favorites feature not properly configured' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Test endpoint to check favorites table
exports.testFavorites = async (req, res) => {
  try {
    const db = getDB();
    
    // Check if favorites table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "favorites"');
    console.log('Favorites table check:', tables);
    
    if (tables.length === 0) {
      return res.json({ 
        error: 'Favorites table does not exist',
        tables: tables 
      });
    }
    
    // Get count of favorites
    const [count] = await db.execute('SELECT COUNT(*) as count FROM favorites');
    console.log('Favorites count:', count);
    
    res.json({ 
      message: 'Favorites table exists',
      count: count[0].count,
      tableExists: true
    });
  } catch (error) {
    console.error('Test favorites error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
