-- ============================================================================
-- V7__seed_institutions_stores_users_catalog.sql
-- Complete demo seed for End-to-End operations:
-- Users, Wallets, Copies, Listings, Notifications
-- ============================================================================

-- 1. Ensure Institutions exist
INSERT INTO institutions (institution_id, code, name, email_domain, city, state, address, status)
VALUES
('a0000000-0000-0000-0000-000000000001', 'MNNIT', 'Motilal Nehru National Institute of Technology Allahabad', 'mnnit.ac.in', 'Prayagraj', 'Uttar Pradesh', 'Teliarganj, Prayagraj, UP 211004', 'ACTIVE'),
('a0000000-0000-0000-0000-000000000002', 'IIITA', 'Indian Institute of Information Technology Allahabad', 'iiita.ac.in', 'Prayagraj', 'Uttar Pradesh', 'Devghat, Jhalwa, Prayagraj, UP 211015', 'ACTIVE'),
('a0000000-0000-0000-0000-000000000003', 'UOA', 'University of Allahabad', 'allduniv.ac.in', 'Prayagraj', 'Uttar Pradesh', 'Senate House Campus, Prayagraj, UP 211002', 'ACTIVE')
ON CONFLICT (institution_id) DO NOTHING;

-- 2. Ensure Primary Stores exist
INSERT INTO stores (store_id, institution_id, store_code, name, location_details, contact_email, contact_phone, operating_hours, status)
VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'MNNIT-MAIN', 'Unikart Central Store · MNNIT', 'Student Activity Centre (SAC) Ground Floor, Near Central Library', 'mnnit-store@unikart.in', '+91 98765 43210', 'Mon-Sat, 9:00 AM - 6:00 PM', 'ACTIVE'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'IIITA-MAIN', 'Unikart Hub Store · IIITA', 'CC-3 Commercial Complex, Room 102', 'iiita-store@unikart.in', '+91 98765 43211', 'Mon-Sat, 9:00 AM - 6:00 PM', 'ACTIVE')
ON CONFLICT (store_id) DO NOTHING;

-- 3. Whitelist
INSERT INTO authorised_user_entries (entry_id, institution_id, institutional_id, email, full_name, designation, department, status, is_registered)
VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '20224031', 'aryan.20224031@mnnit.ac.in', 'Aryan Mehta', 'STUDENT', 'Computer Science & Engineering', 'ACTIVE', TRUE),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '20224050', 'devanshi.20224050@mnnit.ac.in', 'Devanshi Asati', 'STUDENT', 'Information Technology', 'ACTIVE', FALSE),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '20224075', 'himanshu.20224075@mnnit.ac.in', 'Himanshu S', 'STUDENT', 'Electrical Engineering', 'ACTIVE', FALSE)
ON CONFLICT (entry_id) DO NOTHING;

-- 4. Seed Users (password123 hash)
INSERT INTO users (user_id, institution_id, assigned_store_id, institutional_id, full_name, email, phone, password_hash, role, designation, status, two_factor_enabled)
VALUES
('00000000-0000-0000-0010-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, '20224031', 'Aryan Mehta', 'aryan.20224031@mnnit.ac.in', '+91 91234 56789', '$2a$12$bXD2QOA/Y4XIMS/SyPtlUO8QCMTBXBGC.co3nEp71lEyYfbXr6MNG', 'CUSTOMER', 'STUDENT', 'ACTIVE', FALSE),
('00000000-0000-0000-0010-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', NULL, 'Store Staff', 'store.staff@unikart.in', '+91 92345 67890', '$2a$12$bXD2QOA/Y4XIMS/SyPtlUO8QCMTBXBGC.co3nEp71lEyYfbXr6MNG', 'STORE_MANAGER', 'STAFF', 'ACTIVE', TRUE),
('00000000-0000-0000-0010-000000000003', NULL, NULL, NULL, 'Platform Admin', 'platform.admin@unikart.in', '+91 93456 78901', '$2a$12$bXD2QOA/Y4XIMS/SyPtlUO8QCMTBXBGC.co3nEp71lEyYfbXr6MNG', 'PLATFORM_ADMIN', 'STAFF', 'ACTIVE', TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Customer Wallet (WAL-01, WAL-02)
INSERT INTO wallets (wallet_id, user_id, currency, available_balance, reserved_balance, version)
VALUES
('00000000-0000-0000-0020-000000000001', '00000000-0000-0000-0010-000000000001', 'INR', 3000.00, 425.00, 0)
ON CONFLICT (wallet_id) DO NOTHING;

-- 6. Initial Wallet Transactions (Ledger Entries)
INSERT INTO wallet_transactions (tx_id, wallet_id, user_id, idempotency_key, tx_type, direction, amount, state, balance_after, reserved_after, reference_type, reference_id, description)
VALUES
('00000000-0000-0000-0030-000000000001', '00000000-0000-0000-0020-000000000001', '00000000-0000-0000-0010-000000000001', 'IDEMP-TOPUP-001', 'REFUND_CREDIT', 'CREDIT', 3500.00, 'SUCCESS', 3500.00, 0.00, 'PAYMENT', 'PAY-TOPUP-01', 'UPI Top-up via HDFC ••4417'),
('00000000-0000-0000-0030-000000000002', '00000000-0000-0000-0020-000000000001', '00000000-0000-0000-0010-000000000001', 'IDEMP-BORROW-001', 'BORROW_PAYMENT_DEBIT', 'DEBIT', 500.00, 'SUCCESS', 3000.00, 425.00, 'BORROW', 'BR-24902', 'Operating Systems Concepts borrow fee + security deposit')
ON CONFLICT (tx_id) DO NOTHING;

-- 7. Store Listings (BUY_AND_BORROW)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status, created_by)
VALUES
('00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0040-000000000001', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 680.00, 850.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000002', '00000000-0000-0000-0040-000000000002', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 599.00, 780.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000003', '00000000-0000-0000-0040-000000000003', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 550.00, 720.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000004', '00000000-0000-0000-0040-000000000004', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 520.00, 690.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000005', '00000000-0000-0000-0040-000000000005', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 480.00, 640.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000006', '00000000-0000-0000-0040-000000000006', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 450.00, 599.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000007', '00000000-0000-0000-0040-000000000007', 'b0000000-0000-0000-0000-000000000001', 'BUY_ONLY', 320.00, 420.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000008', '00000000-0000-0000-0040-000000000008', 'b0000000-0000-0000-0000-000000000001', 'BUY_AND_BORROW', 540.00, 750.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000009', '00000000-0000-0000-0040-000000000009', 'b0000000-0000-0000-0000-000000000001', 'BUY_ONLY', 380.00, 550.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002'),
('00000000-0000-0000-0050-000000000010', '00000000-0000-0000-0040-000000000010', 'b0000000-0000-0000-0000-000000000001', 'BUY_ONLY', 120.00, 180.00, 10.00, 18.00, 25.00, 50.00, 2, 'ACTIVE', '00000000-0000-0000-0010-000000000002')
ON CONFLICT (listing_id) DO NOTHING;

-- 8. Physical Copies (INV-01)
INSERT INTO copies (copy_id, copy_code, item_id, store_id, condition, status, allowed_for_sale, allowed_for_borrow, condition_notes)
VALUES
('00000000-0000-0000-0060-000000000001', 'CP-MNNIT-ALGO-01', '00000000-0000-0000-0040-000000000001', 'b0000000-0000-0000-0000-000000000001', 'NEW', 'AVAILABLE', TRUE, TRUE, 'Brand new stock from publisher'),
('00000000-0000-0000-0060-000000000002', 'CP-MNNIT-ALGO-02', '00000000-0000-0000-0040-000000000001', 'b0000000-0000-0000-0000-000000000001', 'GOOD', 'AVAILABLE', TRUE, TRUE, 'Minor corner wear on soft cover'),
('00000000-0000-0000-0060-000000000003', 'CP-MNNIT-OS-01', '00000000-0000-0000-0040-000000000002', 'b0000000-0000-0000-0000-000000000001', 'GOOD', 'AVAILABLE', FALSE, TRUE, 'Standard copy'),
('00000000-0000-0000-0060-000000000004', 'CP-MNNIT-OS-02', '00000000-0000-0000-0040-000000000002', 'b0000000-0000-0000-0000-000000000001', 'NEW', 'AVAILABLE', TRUE, TRUE, 'Pristine condition'),
('00000000-0000-0000-0060-000000000005', 'CP-MNNIT-DBMS-01', '00000000-0000-0000-0040-000000000003', 'b0000000-0000-0000-0000-000000000001', 'GOOD', 'AVAILABLE', TRUE, TRUE, 'Clean pages, no markings'),
('00000000-0000-0000-0060-000000000006', 'CP-MNNIT-NET-01', '00000000-0000-0000-0040-000000000004', 'b0000000-0000-0000-0000-000000000001', 'NEW', 'AVAILABLE', TRUE, TRUE, 'Latest reprint'),
('00000000-0000-0000-0060-000000000007', 'CP-MNNIT-SIG-01', '00000000-0000-0000-0040-000000000005', 'b0000000-0000-0000-0000-000000000001', 'FAIR', 'AVAILABLE', FALSE, TRUE, 'Available for loan'),
('00000000-0000-0000-0060-000000000008', 'CP-MNNIT-MATH-01', '00000000-0000-0000-0040-000000000006', 'b0000000-0000-0000-0000-000000000001', 'GOOD', 'AVAILABLE', TRUE, TRUE, 'Standard textbook edition')
ON CONFLICT (copy_id) DO NOTHING;

-- 9. Notifications
INSERT INTO notifications (notification_id, user_id, channel, event_type, is_mandatory, title, message, action_link, delivery_state, is_read)
VALUES
('00000000-0000-0000-0070-000000000001', '00000000-0000-0000-0010-000000000001', 'IN_APP', 'WALLET_CREDIT', TRUE, 'Wallet Top-up Successful', '₹3,500.00 credited to your Unikart wallet via UPI (HDFC ••4417).', '/customer/wallet', 'SENT', TRUE),
('00000000-0000-0000-0070-000000000002', '00000000-0000-0000-0010-000000000001', 'IN_APP', 'BORROW_HANDOVER', TRUE, 'Operating System Concepts Handed Over', 'Handover confirmed at MNNIT Store. Your 30-day borrow period is active.', '/customer/borrowings', 'SENT', TRUE),
('00000000-0000-0000-0070-000000000003', '00000000-0000-0000-0010-000000000001', 'IN_APP', 'ORDER_READY', TRUE, 'Order ready for pickup', 'Your order SO-61204-A (2 items) is ready at MNNIT Store. Pickup OTP: 4821.', '/customer/orders', 'SENT', FALSE)
ON CONFLICT (notification_id) DO NOTHING;
