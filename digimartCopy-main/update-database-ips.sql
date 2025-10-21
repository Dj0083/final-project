-- SQL Script to Update Old IP Addresses in Database
-- Run this in MySQL Workbench or command line

USE digimart;

-- Check current image URLs in products table
SELECT id, product_name, images 
FROM products 
WHERE images LIKE '%192.168.8.124%'
LIMIT 10;

-- Update all old IP addresses in images field to new IP
UPDATE products 
SET images = REPLACE(images, '192.168.8.124', '192.168.56.83')
WHERE images LIKE '%192.168.8.124%';

-- Verify the update
SELECT id, product_name, images 
FROM products 
WHERE images LIKE '%192.168.56.83%'
LIMIT 10;

-- Check if there are any other tables with image URLs
-- Update user business images if needed
SELECT id, full_name, business_image 
FROM users 
WHERE business_image LIKE '%192.168.8.124%'
LIMIT 10;

UPDATE users 
SET business_image = REPLACE(business_image, '192.168.8.124', '192.168.56.83')
WHERE business_image LIKE '%192.168.8.124%';

-- Check order items
SELECT id, image 
FROM order_items 
WHERE image LIKE '%192.168.8.124%'
LIMIT 10;

UPDATE order_items 
SET image = REPLACE(image, '192.168.8.124', '192.168.56.83')
WHERE image LIKE '%192.168.8.124%';

-- Final verification
SELECT 'Products with old IP' as table_name, COUNT(*) as count 
FROM products WHERE images LIKE '%192.168.8.124%'
UNION ALL
SELECT 'Users with old IP', COUNT(*) 
FROM users WHERE business_image LIKE '%192.168.8.124%'
UNION ALL
SELECT 'Order items with old IP', COUNT(*) 
FROM order_items WHERE image LIKE '%192.168.8.124%';

SELECT '--- Update Complete ---' as status;
