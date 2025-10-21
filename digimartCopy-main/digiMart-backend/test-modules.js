// Test script to check if all modules load correctly
console.log('Testing modules...');

try {
  console.log('1. Loading Review model...');
  const Review = require('./models/Review');
  console.log('✅ Review model loaded');

  console.log('2. Loading review controller...');
  const reviewController = require('./controllers/reviewController');
  console.log('✅ Review controller loaded');

  console.log('3. Loading auth middleware...');
  const auth = require('./middleware/auth');
  console.log('✅ Auth middleware loaded');

  console.log('4. Loading review routes...');
  const reviewRoutes = require('./routes/reviews');
  console.log('✅ Review routes loaded');

  console.log('✅ All modules loaded successfully!');
  console.log('The server should start without errors now.');

} catch (error) {
  console.error('❌ Error loading modules:', error);
  console.error('Stack trace:', error.stack);
}