-- Unikart Multi-College Stores & Inventory Setup
-- Seeds UOA Store, Store Staff for all colleges, and listings/copies across all college stores

-- 1. Ensure UOA Store exists
INSERT INTO stores (store_id, institution_id, store_code, name, location_details, contact_phone, contact_email, operating_hours, status)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'UOA-MAIN',
    'Unikart Campus Store - UOA',
    'Senate House Annexe, University of Allahabad, Prayagraj',
    '+91-9876500003',
    'store.uoa@unikart.in',
    'Mon-Sat, 9:00 AM - 6:00 PM',
    'ACTIVE'
)
ON CONFLICT (store_id) DO NOTHING;

-- 2. Store Staff users for IIITA and UOA
INSERT INTO users (user_id, institution_id, assigned_store_id, institutional_id, full_name, email, phone, password_hash, role, designation, status, two_factor_enabled)
VALUES (
    '00000000-0000-0000-0010-000000000004',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'STAFF-IIITA-01',
    'IIITA Store Staff',
    'store.iiita@unikart.in',
    '+91-9876500002',
    (SELECT password_hash FROM users WHERE email='store.staff@unikart.in' LIMIT 1),
    'STORE_MANAGER',
    'STAFF',
    'ACTIVE',
    false
)
ON CONFLICT (email) DO UPDATE SET assigned_store_id='b0000000-0000-0000-0000-000000000002', institution_id='a0000000-0000-0000-0000-000000000002';

INSERT INTO users (user_id, institution_id, assigned_store_id, institutional_id, full_name, email, phone, password_hash, role, designation, status, two_factor_enabled)
VALUES (
    '00000000-0000-0000-0010-000000000005',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'STAFF-UOA-01',
    'UOA Store Staff',
    'store.uoa@unikart.in',
    '+91-9876500003',
    (SELECT password_hash FROM users WHERE email='store.staff@unikart.in' LIMIT 1),
    'STORE_MANAGER',
    'STAFF',
    'ACTIVE',
    false
)
ON CONFLICT (email) DO UPDATE SET assigned_store_id='b0000000-0000-0000-0000-000000000003', institution_id='a0000000-0000-0000-0000-000000000003';

INSERT INTO users (user_id, institution_id, assigned_store_id, institutional_id, full_name, email, phone, password_hash, role, designation, status, two_factor_enabled)
VALUES (
    '00000000-0000-0000-0010-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'STAFF-MNNIT-01',
    'MNNIT Store Staff',
    'store.mnnit@unikart.in',
    '+91-9876500001',
    (SELECT password_hash FROM users WHERE email='store.staff@unikart.in' LIMIT 1),
    'STORE_MANAGER',
    'STAFF',
    'ACTIVE',
    false
)
ON CONFLICT (email) DO NOTHING;

-- Create wallets for new staff
INSERT INTO wallets (wallet_id, user_id, available_balance, reserved_balance, currency)
SELECT gen_random_uuid(), u.user_id, 0.00, 0.00, 'INR'
FROM users u
WHERE u.email IN ('store.iiita@unikart.in', 'store.uoa@unikart.in', 'store.mnnit@unikart.in')
AND NOT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = u.user_id);

-- 3. Listings for IIITA Store
-- Computer Networks (Item 4)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000021',
    '00000000-0000-0000-0040-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'BUY_AND_BORROW',
    510.00,
    750.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- Database System Concepts (Item 3)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000022',
    '00000000-0000-0000-0040-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'BUY_AND_BORROW',
    540.00,
    720.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- Introduction to Algorithms (Item 1)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000023',
    '00000000-0000-0000-0040-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'BUY_AND_BORROW',
    690.00,
    850.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- Discrete Mathematics (Item 8)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000024',
    '00000000-0000-0000-0040-000000000008',
    'b0000000-0000-0000-0000-000000000002',
    'BUY_AND_BORROW',
    530.00,
    750.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- 4. Listings for UOA Store
-- GATE CSE Solved Papers (Item 9)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000031',
    '00000000-0000-0000-0040-000000000009',
    'b0000000-0000-0000-0000-000000000003',
    'BUY_AND_BORROW',
    370.00,
    550.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- Engineering Economics (Item 7)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000032',
    '00000000-0000-0000-0040-000000000007',
    'b0000000-0000-0000-0000-000000000003',
    'BUY_AND_BORROW',
    310.00,
    420.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- Signals and Systems (Item 5)
INSERT INTO listings (listing_id, item_id, store_id, listing_type, sale_price, base_item_value, borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct, low_stock_threshold, status)
VALUES (
    '00000000-0000-0000-0050-000000000033',
    '00000000-0000-0000-0040-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    'BUY_AND_BORROW',
    470.00,
    650.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE'
) ON CONFLICT (item_id, store_id) WHERE status = 'ACTIVE' DO NOTHING;

-- 5. Physical shelf copies for IIITA Store
INSERT INTO copies (copy_id, copy_code, item_id, store_id, condition, status, allowed_for_sale, allowed_for_borrow, acquisition_source)
VALUES
    ('00000000-0000-0000-0060-000000000021', 'CP-IIITA-NET-01', '00000000-0000-0000-0040-000000000004', 'b0000000-0000-0000-0000-000000000002', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000022', 'CP-IIITA-NET-02', '00000000-0000-0000-0040-000000000004', 'b0000000-0000-0000-0000-000000000002', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000023', 'CP-IIITA-DBMS-01', '00000000-0000-0000-0040-000000000003', 'b0000000-0000-0000-0000-000000000002', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000024', 'CP-IIITA-ALGO-01', '00000000-0000-0000-0040-000000000001', 'b0000000-0000-0000-0000-000000000002', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000025', 'CP-IIITA-DISC-01', '00000000-0000-0000-0040-000000000008', 'b0000000-0000-0000-0000-000000000002', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT')
ON CONFLICT (copy_code) DO NOTHING;

-- 6. Physical shelf copies for UOA Store
INSERT INTO copies (copy_id, copy_code, item_id, store_id, condition, status, allowed_for_sale, allowed_for_borrow, acquisition_source)
VALUES
    ('00000000-0000-0000-0060-000000000031', 'CP-UOA-GATE-01', '00000000-0000-0000-0040-000000000009', 'b0000000-0000-0000-0000-000000000003', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000032', 'CP-UOA-GATE-02', '00000000-0000-0000-0040-000000000009', 'b0000000-0000-0000-0000-000000000003', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000033', 'CP-UOA-ECON-01', '00000000-0000-0000-0040-000000000007', 'b0000000-0000-0000-0000-000000000003', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000034', 'CP-UOA-SIG-01', '00000000-0000-0000-0040-000000000005', 'b0000000-0000-0000-0000-000000000003', 'FAIR', 'AVAILABLE', true, true, 'STORE_PROCUREMENT')
ON CONFLICT (copy_code) DO NOTHING;

-- 7. Additional copies for MNNIT Store so popular books have stock
INSERT INTO copies (copy_id, copy_code, item_id, store_id, condition, status, allowed_for_sale, allowed_for_borrow, acquisition_source)
VALUES
    ('00000000-0000-0000-0060-000000000011', 'CP-MNNIT-ALGO-03', '00000000-0000-0000-0040-000000000001', 'b0000000-0000-0000-0000-000000000001', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000012', 'CP-MNNIT-ALGO-04', '00000000-0000-0000-0040-000000000001', 'b0000000-0000-0000-0000-000000000001', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT'),
    ('00000000-0000-0000-0060-000000000013', 'CP-MNNIT-OS-03', '00000000-0000-0000-0040-000000000002', 'b0000000-0000-0000-0000-000000000001', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT')
ON CONFLICT (copy_code) DO NOTHING;
