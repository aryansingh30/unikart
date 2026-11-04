-- ============================================================================
-- V4__borrow_renewals_fines_disputes.sql
-- Covers: BOR-01..11, PEN-01..09, Section 4.2, C-10, C-11
-- ============================================================================

-- 1. BorrowRecord (BOR-04, BOR-05, C-10, C-11)
CREATE TABLE borrow_records (
    borrow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrow_number VARCHAR(40) NOT NULL UNIQUE,
    order_line_id UUID NOT NULL UNIQUE REFERENCES order_lines(order_line_id) ON DELETE RESTRICT,
    store_order_id UUID NOT NULL REFERENCES store_orders(store_order_id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    copy_id UUID NOT NULL REFERENCES copies(copy_id) ON DELETE RESTRICT,
    duration VARCHAR(15) NOT NULL CHECK (duration IN ('DAYS_14', 'DAYS_30', 'DAYS_45')),
    duration_days INT NOT NULL CHECK (duration_days IN (14, 30, 45)),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (
        status IN (
            'PAYMENT_PENDING',
            'CONFIRMED',
            'READY_FOR_PICKUP',
            'DISPATCHED',
            'ACTIVE',
            'RENEWED',
            'OVERDUE',
            'RETURN_INITIATED',
            'INSPECTION',
            'CLOSED',
            'CLOSED_WITH_FINE',
            'CANCELLED'
        )
    ),
    borrow_fee_paid NUMERIC(12, 2) NOT NULL CHECK (borrow_fee_paid >= 0),
    deposit_held NUMERIC(12, 2) NOT NULL CHECK (deposit_held >= 0),
    deposit_deducted NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_deducted >= 0),
    deposit_refunded NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_refunded >= 0),
    handover_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    renewed_count INT NOT NULL DEFAULT 0 CHECK (renewed_count IN (0, 1)),
    return_route VARCHAR(25) CHECK (return_route IN ('STORE_COUNTER', 'PARTNER_PICKUP')),
    return_initiated_at TIMESTAMPTZ,
    received_at_store_at TIMESTAMPTZ,
    inspected_at TIMESTAMPTZ,
    inspected_by UUID REFERENCES users(user_id),
    return_condition VARCHAR(20) CHECK (return_condition IN ('NEW', 'GOOD', 'FAIR', 'DAMAGED', 'LOST')),
    inspection_notes TEXT,
    closed_at TIMESTAMPTZ,
    config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce C-11: Copy can have at most 1 active borrow record at a time
CREATE UNIQUE INDEX uq_active_borrow_per_copy
    ON borrow_records(copy_id)
    WHERE status IN ('CONFIRMED', 'READY_FOR_PICKUP', 'DISPATCHED', 'ACTIVE', 'RENEWED', 'OVERDUE', 'RETURN_INITIATED', 'INSPECTION');

CREATE INDEX idx_borrow_records_user ON borrow_records(user_id, status);
CREATE INDEX idx_borrow_records_store_status ON borrow_records(store_id, status, due_at);

-- 2. Renewal (BOR-06: Max 1 renewal per borrow)
CREATE TABLE renewals (
    renewal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrow_id UUID NOT NULL UNIQUE REFERENCES borrow_records(borrow_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(payment_id) ON DELETE RESTRICT,
    extension_days INT NOT NULL CHECK (extension_days IN (14, 30, 45)),
    renewal_fee NUMERIC(12, 2) NOT NULL CHECK (renewal_fee >= 0),
    previous_due_at TIMESTAMPTZ NOT NULL,
    new_due_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Fines (PEN-01..07)
CREATE TABLE fines (
    fine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_number VARCHAR(40) NOT NULL UNIQUE,
    borrow_id UUID NOT NULL REFERENCES borrow_records(borrow_id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    fine_type VARCHAR(20) NOT NULL CHECK (fine_type IN ('LATE_RETURN', 'DAMAGE', 'LOSS')),
    overdue_days INT NOT NULL DEFAULT 0 CHECK (overdue_days >= 0),
    daily_rate NUMERIC(12, 2),
    assessed_amount NUMERIC(12, 2) NOT NULL CHECK (assessed_amount >= 0),
    adjusted_amount NUMERIC(12, 2) NOT NULL CHECK (adjusted_amount >= 0),
    deposit_deducted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_deducted_amount >= 0),
    shortfall_due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (shortfall_due_amount >= 0),
    reason TEXT NOT NULL,
    evidence_notes TEXT,
    assessed_by UUID REFERENCES users(user_id),
    status VARCHAR(25) NOT NULL DEFAULT 'ASSESSED' CHECK (
        status IN (
            'ASSESSED',
            'SETTLED_FROM_DEPOSIT',
            'DUE_PENDING',
            'DISPUTED',
            'PAID',
            'WAIVED'
        )
    ),
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fines_user_status ON fines(user_id, status);
CREATE INDEX idx_fines_store_status ON fines(store_id, status);

-- 4. Dues: Shortfall beyond deposit (PEN-04, PEN-06, BOR-11)
CREATE TABLE dues (
    due_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_id UUID NOT NULL UNIQUE REFERENCES fines(fine_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    original_shortfall NUMERIC(12, 2) NOT NULL CHECK (original_shortfall >= 0),
    outstanding_amount NUMERIC(12, 2) NOT NULL CHECK (outstanding_amount >= 0),
    is_disputed BOOLEAN NOT NULL DEFAULT FALSE,
    blocks_borrowing BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'WAIVED')),
    paid_payment_id UUID REFERENCES payments(payment_id),
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dues_user_blocking ON dues(user_id, status, blocks_borrowing);

-- 5. FineDispute: 7-day customer dispute workflow (PEN-08, PEN-09, BOR-11)
CREATE TABLE fine_disputes (
    dispute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fine_id UUID NOT NULL UNIQUE REFERENCES fines(fine_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    customer_reason TEXT NOT NULL,
    disputed_amount NUMERIC(12, 2) NOT NULL CHECK (disputed_amount >= 0),
    status VARCHAR(25) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN ('SUBMITTED', 'UNDER_REVIEW', 'UPHELD', 'ADJUSTED', 'WAIVED')
    ),
    manager_response TEXT,
    manager_reviewed_by UUID REFERENCES users(user_id),
    manager_reviewed_at TIMESTAMPTZ,
    manager_target_due_at TIMESTAMPTZ NOT NULL,
    escalated_to_admin BOOLEAN NOT NULL DEFAULT FALSE,
    admin_resolution_notes TEXT,
    admin_resolved_by UUID REFERENCES users(user_id),
    admin_resolved_at TIMESTAMPTZ,
    admin_target_due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
