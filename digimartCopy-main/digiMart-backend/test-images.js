// Quick test to check product images in database
const { getDB } = require('./config/database');

async function checkProductImages() {
  try {
    const db = getDB();
    
    console.log('=== CHECKING PRODUCT IMAGES ===');
    
    // Get all products with their images
    const [products] = await db.execute(`
      SELECT id, product_name, images 
      FROM products 
      LIMIT 5
    `);
    
    console.log('Found', products.length, 'products:');
    
    products.forEach(product => {
      console.log('\n--- Product ID:', product.id, '---');
      console.log('Name:', product.product_name);
      console.log('Raw images field:', product.images);
      console.log('Images type:', typeof product.images);
      
      if (product.images) {
        try {
          const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
          console.log('Parsed images:', parsed);
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('First image:', parsed[0]);
            console.log('Image path:', parsed[0].path || parsed[0]);
          }
        } catch (e) {
          console.log('Error parsing:', e.message);
        }
      }
    });
    
    console.log('\n=== END CHECK ===');
    
  } catch (error) {
    console.error('Error checking products:', error);
  }
}

module.exports = { checkProductImages };