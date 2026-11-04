-- ============================================================================
-- V2__catalog_items_copies_listings.sql
-- Covers: CAT-01..06, INV-01..06, BR-03, BR-04, C-03, C-04, C-05, NFR-15
-- ============================================================================

-- 1. Item: Product / Title Definition (BR-03, NFR-15 extensible format)
CREATE TABLE items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn_or_code VARCHAR(64) NOT NULL UNIQUE,
    category VARCHAR(40) NOT NULL CHECK (category IN ('BOOK', 'NOTES', 'STUDY_MATERIAL')),
    format_type VARCHAR(30) NOT NULL DEFAULT 'PHYSICAL' CHECK (format_type IN ('PHYSICAL', 'DIGITAL_FUTURE')),
    subject VARCHAR(150) NOT NULL,
    course_code VARCHAR(64) NOT NULL,
    semester VARCHAR(32),
    publisher VARCHAR(180),
    edition VARCHAR(64),
    publication_year INT,
    description TEXT,
    cover_image_url VARCHAR(500),
    base_value NUMERIC(12, 2) NOT NULL CHECK (base_value >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_search ON items(category, subject, course_code);
CREATE INDEX idx_items_title_author ON items(title, author);

-- 2. Copy: Individual Physical Unit held by a Store (INV-01, BR-03)
CREATE TABLE copies (
    copy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_code VARCHAR(64) NOT NULL UNIQUE,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('NEW', 'GOOD', 'FAIR', 'DAMAGED')),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (
        status IN (
            'AVAILABLE',
            'ALLOCATED',
            'READY_FOR_PICKUP',
            'DISPATCHED',
            'BORROWED',
            'SOLD',
            'UNDER_INSPECTION',
            'LOST',
            'WITHDRAWN'
        )
    ),
    allowed_for_sale BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_for_borrow BOOLEAN NOT NULL DEFAULT TRUE,
    acquisition_source VARCHAR(30) NOT NULL DEFAULT 'STORE_PROCUREMENT' CHECK (
        acquisition_source IN ('STORE_PROCUREMENT', 'CUSTOMER_SELL', 'INSTITUTION_SUPPLY')
    ),
    source_sell_line_id UUID,
    condition_notes TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_copies_item_store_status ON copies(item_id, store_id, status);
CREATE INDEX idx_copies_store_status ON copies(store_id, status);

-- 3. Listing: Store-level Offer for an Item (INV-03, CAT-06, C-05)
CREATE TABLE listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('BUY_ONLY', 'BORROW_ONLY', 'BUY_AND_BORROW')),
    sale_price NUMERIC(12, 2) NOT NULL CHECK (sale_price >= 0),
    base_item_value NUMERIC(12, 2) NOT NULL CHECK (base_item_value >= 0),
    borrow_fee_pct_14d NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (borrow_fee_pct_14d >= 0 AND borrow_fee_pct_14d <= 100),
    borrow_fee_pct_30d NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (borrow_fee_pct_30d >= 0 AND borrow_fee_pct_30d <= 100),
    borrow_fee_pct_45d NUMERIC(5, 2) NOT NULL DEFAULT 25.00 CHECK (borrow_fee_pct_45d >= 0 AND borrow_fee_pct_45d <= 100),
    deposit_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (deposit_pct >= 0 AND deposit_pct <= 100),
    low_stock_threshold INT NOT NULL DEFAULT 2 CHECK (low_stock_threshold >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C-05: No duplicate ACTIVE listing for the same Item and Store
CREATE UNIQUE INDEX uq_active_listing_per_item_store
    ON listings(item_id, store_id)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_listings_store_status ON listings(store_id, status);

-- 4. WaitlistEntry: Customer waitlist for unavailable borrowable items (CAT-05, BOR-06)
CREATE TABLE waitlist_entries (
    waitlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'NOTIFIED', 'FULFILLED', 'CANCELLED')),
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_waitlist_active_user_item_store
    ON waitlist_entries(user_id, item_id, store_id)
    WHERE status IN ('WAITING', 'NOTIFIED');

CREATE INDEX idx_waitlist_item_store_status ON waitlist_entries(item_id, store_id, status, created_at);
