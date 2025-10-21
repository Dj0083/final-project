const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const { upload } = require('../utils/upload'); // Only import upload

// Public routes
router.get('/', productController.getAllProducts);

// Protected routes (seller only) - MUST come before /:productId
router.get('/inventory', auth, productController.getSellerProducts);
router.post('/add-product', auth, upload.single('image'), productController.addProduct);

// Public route with ID parameter - MUST come after specific routes
router.get('/:productId', productController.getProductById);
router.put('/:productId', auth, upload.single('image'), productController.updateProduct);
router.patch('/:productId/stock', auth, productController.updateStock);
router.patch('/:productId/restock', auth, productController.restockProduct);
router.delete('/:productId', auth, productController.deleteProduct);

// Favorites routes (authenticated users)
router.post('/:productId/favorite', auth, productController.addToFavorites);
router.delete('/:productId/favorite', auth, productController.removeFromFavorites);
router.get('/user/favorites', auth, productController.getFavoriteProducts);
router.get('/:productId/favorite/check', auth, productController.checkFavorite);

// Test route for debugging
router.get('/test/favorites', productController.testFavorites);

module.exports = router;