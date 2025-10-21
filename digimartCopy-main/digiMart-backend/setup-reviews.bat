@echo off
echo Setting up review system for testing...
echo.

cd /d E:\copy\EntraDigimart-test\digiMart-backend

echo Adding environment variable to allow reviews without purchases...
echo ALLOW_REVIEWS_WITHOUT_PURCHASE=true >> .env

echo.
echo Setup complete! Now you can:
echo 1. Start the backend server: node server.js
echo 2. Test the 5-star rating system in ProductDetailSimple.js
echo 3. Users can now submit reviews without needing to purchase first
echo.
pause