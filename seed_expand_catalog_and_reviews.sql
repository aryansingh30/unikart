-- 1. Create book_reviews table
CREATE TABLE IF NOT EXISTS book_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    reviewer_name VARCHAR(150),
    institution_code VARCHAR(32),
    verified_buyer BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_item_id ON book_reviews(item_id);

-- 2. Add New Academic Items
INSERT INTO items (
    item_id, title, author, isbn_or_code, category, format_type, subject,
    course_code, base_value, cover_image_url, status, created_at, updated_at
) VALUES
(
    '00000000-0000-0000-0040-000000000012',
    'Artificial Intelligence: A Modern Approach',
    'Stuart Russell, Peter Norvig',
    '9780136042594',
    'BOOK',
    'PHYSICAL',
    'Artificial Intelligence',
    'CS401',
    950.00,
    '/covers/algorithms.png',
    'ACTIVE',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0040-000000000013',
    'Clean Code: A Handbook of Agile Craftsmanship',
    'Robert C. Martin',
    '9780132350884',
    'BOOK',
    'PHYSICAL',
    'Software Engineering',
    'CS302',
    650.00,
    '/covers/networks.png',
    'ACTIVE',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0040-000000000014',
    'Digital Design and Computer Architecture',
    'David Harris, Sarah Harris',
    '9780123944245',
    'BOOK',
    'PHYSICAL',
    'Computer Architecture',
    'CS203',
    720.00,
    '/covers/signals.png',
    'ACTIVE',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0040-000000000015',
    'Thermodynamics: An Engineering Approach',
    'Yunus A. Cengel, Michael A. Boles',
    '9780073398174',
    'BOOK',
    'PHYSICAL',
    'Mechanical Engineering',
    'ME201',
    820.00,
    '/covers/thermodynamics.png',
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (isbn_or_code) DO NOTHING;

-- 3. Add Store Listings for IIITA, MNNIT, and UOA
-- IIITA Listings:
INSERT INTO listings (
    listing_id, item_id, store_id, listing_type, sale_price, base_item_value,
    borrow_fee_pct_14d, borrow_fee_pct_30d, borrow_fee_pct_45d, deposit_pct,
    low_stock_threshold, status, created_at, updated_at
) VALUES
(
    '00000000-0000-0000-0050-000000000041',
    '00000000-0000-0000-0040-000000000012',
    'b0000000-0000-0000-0000-000000000002',
    'BUY_AND_BORROW',
    780.00,
    950.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE',
    NOW(),
    NOW()
),
(
    '00000000-0000-0000-0050-000000000042',
    '00000000-0000-0000-0040-000000000013',
    'b0000000-0000-0000-0000-000000000002',
    'BUY_AND_BORROW',
    520.00,
    650.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE',
    NOW(),
    NOW()
),
-- MNNIT Listings:
(
    '00000000-0000-0000-0050-000000000043',
    '00000000-0000-0000-0040-000000000014',
    'b0000000-0000-0000-0000-000000000001',
    'BUY_AND_BORROW',
    580.00,
    720.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE',
    NOW(),
    NOW()
),
-- UOA Listings:
(
    '00000000-0000-0000-0050-000000000044',
    '00000000-0000-0000-0040-000000000015',
    'b0000000-0000-0000-0000-000000000003',
    'BUY_AND_BORROW',
    640.00,
    820.00,
    10.00,
    18.00,
    25.00,
    50.00,
    2,
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (listing_id) DO NOTHING;

-- 4. Add Physical Stock Copies across all stores to exceed 30+ total available books
INSERT INTO copies (
    copy_id, item_id, store_id, copy_code, condition, status,
    allowed_for_sale, allowed_for_borrow, acquisition_source, created_at, updated_at
) VALUES
-- IIITA Stock
('00000000-0000-0000-0060-000000000041', '00000000-0000-0000-0040-000000000012', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-AI-01', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000042', '00000000-0000-0000-0040-000000000012', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-AI-02', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000043', '00000000-0000-0000-0040-000000000012', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-AI-03', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000044', '00000000-0000-0000-0040-000000000013', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-CC-01', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000045', '00000000-0000-0000-0040-000000000013', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-CC-02', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000046', '00000000-0000-0000-0040-000000000004', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-NET-03', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000047', '00000000-0000-0000-0040-000000000003', 'b0000000-0000-0000-0000-000000000002', 'CP-IIITA-DB-02', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),

-- MNNIT Stock
('00000000-0000-0000-0060-000000000048', '00000000-0000-0000-0040-000000000014', 'b0000000-0000-0000-0000-000000000001', 'CP-MNNIT-DD-01', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000049', '00000000-0000-0000-0040-000000000014', 'b0000000-0000-0000-0000-000000000001', 'CP-MNNIT-DD-02', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000050', '00000000-0000-0000-0040-000000000006', 'b0000000-0000-0000-0000-000000000001', 'CP-MNNIT-MATH-02', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000051', '00000000-0000-0000-0040-000000000006', 'b0000000-0000-0000-0000-000000000001', 'CP-MNNIT-MATH-03', 'FAIR', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000052', '00000000-0000-0000-0040-000000000002', 'b0000000-0000-0000-0000-000000000001', 'CP-MNNIT-OS-04', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),

-- UOA Stock
('00000000-0000-0000-0060-000000000053', '00000000-0000-0000-0040-000000000015', 'b0000000-0000-0000-0000-000000000003', 'CP-UOA-TH-01', 'NEW', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000054', '00000000-0000-0000-0040-000000000015', 'b0000000-0000-0000-0000-000000000003', 'CP-UOA-TH-02', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000055', '00000000-0000-0000-0040-000000000011', 'b0000000-0000-0000-0000-000000000003', 'CP-UOA-PHY-04', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000056', '00000000-0000-0000-0040-000000000007', 'b0000000-0000-0000-0000-000000000003', 'CP-UOA-ECON-02', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW()),
('00000000-0000-0000-0060-000000000057', '00000000-0000-0000-0040-000000000009', 'b0000000-0000-0000-0000-000000000003', 'CP-UOA-GATE-03', 'GOOD', 'AVAILABLE', true, true, 'STORE_PROCUREMENT', NOW(), NOW())
ON CONFLICT (copy_id) DO NOTHING;

-- 5. Seed Real Initial Student Reviews
INSERT INTO book_reviews (
    review_id, item_id, user_id, rating, review_text, reviewer_name, institution_code, verified_buyer, created_at, updated_at
) VALUES
(
    '00000000-0000-0000-0070-000000000001',
    '00000000-0000-0000-0040-000000000001',
    '00000000-0000-0000-0010-000000000001',
    5,
    'The ultimate standard textbook for algorithms. Must-have reference for CS201 and semester exams. Crisp explanations of dynamic programming and graph algorithms.',
    'Aryan Mehta',
    'MNNIT',
    true,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
),
(
    '00000000-0000-0000-0070-000000000002',
    '00000000-0000-0000-0040-000000000001',
    '00000000-0000-0000-0010-000000000002',
    4,
    'Great condition copy received at IIITA desk. Perfect for lab preparation and competitive programming foundation.',
    'Himanshu Sharma',
    'IIITA',
    true,
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
),
(
    '00000000-0000-0000-0070-000000000003',
    '00000000-0000-0000-0040-000000000002',
    '00000000-0000-0000-0010-000000000001',
    5,
    'Silberschatz Dinosaur book is the gold standard for process synchronization and virtual memory concepts. The diagrams are very clear.',
    'Aryan Mehta',
    'MNNIT',
    true,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    '00000000-0000-0000-0070-000000000004',
    '00000000-0000-0000-0040-000000000011',
    '00000000-0000-0000-0010-000000000002',
    5,
    'Concepts of Physics by H.C. Verma is legendary. Concise theory and insightful conceptual problems.',
    'Himanshu Sharma',
    'IIITA',
    true,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    '00000000-0000-0000-0070-000000000005',
    '00000000-0000-0000-0040-000000000009',
    '00000000-0000-0000-0010-000000000001',
    5,
    '25 years of GATE CSE solved papers with topic-wise distribution. Indispensable for pre-final year preparation.',
    'Priya Verma',
    'UOA',
    true,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (review_id) DO NOTHING;
