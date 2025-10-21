-- Test Reviews System
-- Run this script to check and set up review system

-- First, let's check if the reviews table exists and see its structure
DESCRIBE reviews;

-- Check how many reviews currently exist
SELECT COUNT(*) as total_reviews FROM reviews;

-- Let's see all existing reviews
SELECT 
    r.id,
    r.product_id,
    r.user_id,
    r.rating,
    r.comment,
    r.created_at,
    u.name as user_name,
    p.product_name
FROM reviews r
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN products p ON r.product_id = p.id
ORDER BY r.created_at DESC;

-- Check if we have any products to review
SELECT id, product_name, stock_qty FROM products LIMIT 5;

-- Check if we have any users who can review
SELECT id, name, email, role FROM users WHERE role = 'customer' LIMIT 5;

-- Let's add some sample reviews for testing (only if no reviews exist)
-- First, let's get the first product and first customer
SET @product_id = (SELECT id FROM products LIMIT 1);
SET @customer_id = (SELECT id FROM users WHERE role = 'customer' LIMIT 1);

-- Add sample reviews only if none exist
INSERT IGNORE INTO reviews (product_id, user_id, rating, comment)
SELECT @product_id, @customer_id, 5, 'Great product! Highly recommended.' 
WHERE NOT EXISTS (SELECT 1 FROM reviews);

INSERT IGNORE INTO reviews (product_id, user_id, rating, comment)
SELECT @product_id, 
       (SELECT id FROM users WHERE role = 'customer' AND id != @customer_id LIMIT 1), 
       4, 
       'Good quality, fast delivery.'
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'customer' AND id != @customer_id);

-- Check the results
SELECT COUNT(*) as total_reviews_after FROM reviews;

-- Show rating statistics for first product
SELECT 
    rating,
    COUNT(*) as count
FROM reviews 
WHERE product_id = @product_id
GROUP BY rating
ORDER BY rating DESC;

-- Show average rating
SELECT 
    AVG(rating) as average_rating,
    COUNT(*) as review_count
FROM reviews 
WHERE product_id = @product_id;