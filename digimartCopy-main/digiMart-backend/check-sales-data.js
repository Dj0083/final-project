// Quick script to check sales data for sellers
const { initializeDatabase, getDB } = require('./config/database');

async function checkSalesData() {
  // Initialize database connection first
  console.log('🔌 Initializing database connection...\n');
  await initializeDatabase();
  
  const db = getDB();
  
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 CHECKING SALES DATA IN DATABASE');
    console.log('═══════════════════════════════════════════════════════\n');

    // Get all sellers
    const [sellers] = await db.execute(
      'SELECT id, name, email FROM users WHERE role = "seller"'
    );

    console.log(`📊 Found ${sellers.length} seller(s) in database:\n`);

    for (const seller of sellers) {
      console.log('─────────────────────────────────────────────────────');
      console.log(`👤 Seller: ${seller.name} (ID: ${seller.id})`);
      console.log(`   Email: ${seller.email}`);
      console.log('─────────────────────────────────────────────────────\n');

      // Check products for this seller
      const [products] = await db.execute(
        'SELECT id, product_name, price, stock_qty FROM products WHERE seller_id = ? AND status != "deleted"',
        [seller.id]
      );

      console.log(`📦 Products: ${products.length}`);
      if (products.length > 0) {
        products.slice(0, 5).forEach(p => {
          console.log(`   - ${p.product_name} (ID: ${p.id}) - LKR ${p.price} - Stock: ${p.stock_qty}`);
        });
        if (products.length > 5) {
          console.log(`   ... and ${products.length - 5} more products`);
        }
      }
      console.log('');

      // Check orders with this seller's products
      const [orders] = await db.execute(`
        SELECT DISTINCT o.id, o.order_number, o.status, o.created_at, o.total_amount
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
        ORDER BY o.created_at DESC
        LIMIT 10
      `, [seller.id]);

      console.log(`📋 Orders containing seller's products: ${orders.length}`);
      if (orders.length > 0) {
        orders.forEach(o => {
          console.log(`   - ${o.order_number} | ${o.status} | ${new Date(o.created_at).toLocaleDateString()} | LKR ${o.total_amount}`);
        });
      } else {
        console.log('   ⚠️  No orders found!');
      }
      console.log('');

      // Get sales analytics for this seller
      const [totalStats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(oi.subtotal), 0) as total_revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
      `, [seller.id]);

      const [thisMonth] = await db.execute(`
        SELECT 
          COUNT(DISTINCT o.id) as month_orders,
          COALESCE(SUM(oi.subtotal), 0) as month_revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
          AND YEAR(o.created_at) = YEAR(CURRENT_DATE)
          AND MONTH(o.created_at) = MONTH(CURRENT_DATE)
      `, [seller.id]);

      console.log('💰 SALES ANALYTICS:');
      console.log(`   Total Revenue (All Time): LKR ${parseFloat(totalStats[0].total_revenue).toFixed(2)}`);
      console.log(`   Total Orders: ${totalStats[0].total_orders}`);
      console.log(`   This Month Revenue: LKR ${parseFloat(thisMonth[0].month_revenue).toFixed(2)}`);
      console.log(`   This Month Orders: ${thisMonth[0].month_orders}`);
      console.log('');

      // Get monthly breakdown
      const [monthly] = await db.execute(`
        SELECT 
          DATE_FORMAT(o.created_at, '%b %Y') as month,
          DATE_FORMAT(o.created_at, '%Y-%m') as month_key,
          COUNT(DISTINCT o.id) as orders,
          COALESCE(SUM(oi.subtotal), 0) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
          AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        GROUP BY month_key, month
        ORDER BY month_key DESC
      `, [seller.id]);

      if (monthly.length > 0) {
        console.log('📊 MONTHLY SALES (Last 6 Months):');
        monthly.forEach(m => {
          console.log(`   ${m.month}: ${m.orders} orders, LKR ${parseFloat(m.revenue).toFixed(2)}`);
        });
      } else {
        console.log('📊 No monthly sales data available');
      }

      console.log('\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ DATABASE CHECK COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('💡 NEXT STEPS:');
    console.log('1. If you see "0 orders" above, you need to create test orders');
    console.log('2. Login as a CUSTOMER (not seller) on your app');
    console.log('3. Browse products and add items to cart');
    console.log('4. Complete checkout to create orders');
    console.log('5. Then login back as SELLER and check Sales Report\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSalesData();
