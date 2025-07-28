-- Clear all orders and related data for testing
-- Delete related data first (foreign key dependencies)
DELETE FROM order_ratings;
DELETE FROM tips;
DELETE FROM wallet_transactions WHERE order_id IS NOT NULL;

-- Clear all orders
DELETE FROM orders;