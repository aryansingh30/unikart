-- ============================================================================
-- V3__cart_checkout_orders_payments.sql
-- Covers: CART-01..11, FUL-01..02, CAN-01..07, WAL-03, WAL-09, C-07..09, C-12
-- ============================================================================

-- 1. Cart (C-07: One active cart per Customer; items not reserved)
CREATE TABLE carts (
    cart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONVERTED', 'ABANDONED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_carts_active_per_user
    ON carts(user_id)
    WHERE status = 'ACTIVE';

-- 2. CartLine (CART-01: mixed BUY and BORROW lines in same cart)
CREATE TABLE cart_lines (
    cart_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
    line_type VARCHAR(15) NOT NULL CHECK (line_type IN ('PURCHASE', 'BORROW')),
    borrow_duration VARCHAR(15) CHECK (borrow_duration IN ('DAYS_14', 'DAYS_30', 'DAYS_45')),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cart_line_duration CHECK (
        (line_type = 'PURCHASE' AND borrow_duration IS NULL) OR
        (line_type = 'BORROW' AND borrow_duration IS NOT NULL)
    )
);

CREATE INDEX idx_cart_lines_cart ON cart_lines(cart_id);

-- 3. Checkout: Parent multi-store checkout transaction (CART-06, C-08, ADM-08)
CREATE TABLE checkouts (
    checkout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_number VARCHAR(40) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(35) NOT NULL DEFAULT 'PAYMENT_PENDING' CHECK (
        status IN (
            'PAYMENT_PENDING',
            'AWAITING_REVISED_CONFIRMATION',
            'CONFIRMED',
            'PARTIALLY_CANCELLED',
            'COMPLETED',
            'PAYMENT_FAILED',
            'CANCELLED'
        )
    ),
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    total_deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposit_amount >= 0),
    total_delivery_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_delivery_amount >= 0),
    grand_total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total_amount >= 0),
    wallet_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_paid_amount >= 0),
    gateway_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gateway_paid_amount >= 0),
    revised_total_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkouts_user ON checkouts(user_id, created_at DESC);

-- 4. StoreOrder: Per-store fulfilment unit (CART-06, CART-07, FUL-01..04, Section 4.1)
CREATE TABLE store_orders (
    store_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(40) NOT NULL UNIQUE,
    checkout_id UUID NOT NULL REFERENCES checkouts(checkout_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    is_cross_institution BOOLEAN NOT NULL DEFAULT FALSE,
    fulfilment_type VARCHAR(20) NOT NULL CHECK (fulfilment_type IN ('SELF_PICKUP', 'DELIVERY')),
    status VARCHAR(30) NOT NULL DEFAULT 'PAYMENT_PENDING' CHECK (
        status IN (
            'PAYMENT_PENDING',
            'CONFIRMED',
            'PREPARING',
            'READY_FOR_PICKUP',
            'DISPATCHED',
            'HANDED_OVER',
            'COMPLETED',
            'DELIVERY_FAILED',
            'CANCELLED'
        )
    ),
    delivery_address TEXT,
    pickup_otp_code VARCHAR(10),
    delivery_otp_code VARCHAR(10),
    pickup_ready_at TIMESTAMPTZ,
    pickup_deadline_at TIMESTAMPTZ,
    handed_over_at TIMESTAMPTZ,
    handed_over_by UUID REFERENCES users(user_id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_amount >= 0),
    delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_charge >= 0),
    incurred_delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (incurred_delivery_charge >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cross_inst_delivery_only CHECK (
        (is_cross_institution = FALSE) OR (fulfilment_type = 'DELIVERY')
    )
);

CREATE INDEX idx_store_orders_checkout ON store_orders(checkout_id);
CREATE INDEX idx_store_orders_store_status ON store_orders(store_id, status);
CREATE INDEX idx_store_orders_user ON store_orders(user_id, created_at DESC);

-- 5. OrderLine: Individual line inside a StoreOrder (CART-07, C-09)
CREATE TABLE order_lines (
    order_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_order_id UUID NOT NULL REFERENCES store_orders(store_order_id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(listing_id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    allocated_copy_id UUID REFERENCES copies(copy_id) ON DELETE RESTRICT,
    line_type VARCHAR(15) NOT NULL CHECK (line_type IN ('PURCHASE', 'BORROW')),
    borrow_duration VARCHAR(15) CHECK (borrow_duration IN ('DAYS_14', 'DAYS_30', 'DAYS_45')),
    unit_item_value NUMERIC(12, 2) NOT NULL CHECK (unit_item_value >= 0),
    line_amount NUMERIC(12, 2) NOT NULL CHECK (line_amount >= 0),
    deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_amount >= 0),
    total_line_amount NUMERIC(12, 2) NOT NULL CHECK (total_line_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ALLOCATION' CHECK (
        status IN (
            'PENDING_ALLOCATION',
            'ALLOCATED',
            'UNAVAILABLE_REFUNDED',
            'HANDED_OVER',
            'COMPLETED',
            'CANCELLED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_lines_store_order ON order_lines(store_order_id);
CREATE INDEX idx_order_lines_copy ON order_lines(allocated_copy_id);

-- 6. Payments & PaymentAllocations (CART-05, CART-10, WAL-03, WAL-09, C-12)
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_id UUID REFERENCES checkouts(checkout_id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    payment_purpose VARCHAR(30) NOT NULL DEFAULT 'CHECKOUT' CHECK (
        payment_purpose IN ('CHECKOUT', 'BORROW_RENEWAL', 'DUE_SETTLEMENT', 'RETURN_PICKUP_FEE')
    ),
    reference_entity_id UUID,
    method VARCHAR(20) NOT NULL CHECK (method IN ('WALLET', 'GATEWAY')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')
    ),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    provider_reference VARCHAR(120),
    provider_event_id VARCHAR(120) UNIQUE,
    provider_signature VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_checkout ON payments(checkout_id);

CREATE TABLE payment_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    store_order_id UUID NOT NULL REFERENCES store_orders(store_order_id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL CHECK (method IN ('WALLET', 'GATEWAY')),
    allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount >= 0),
    refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (refunded_amount >= 0 AND refunded_amount <= allocated_amount),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_store_order_alloc UNIQUE (payment_id, store_order_id)
);

-- 7. Refunds (CAN-02..04, WAL-09)
CREATE TABLE refunds (
    refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_order_id UUID NOT NULL REFERENCES store_orders(store_order_id) ON DELETE RESTRICT,
    borrow_id UUID,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    refund_type VARCHAR(35) NOT NULL CHECK (
        refund_type IN (
            'ORDER_CANCELLATION',
            'UNAVAILABLE_LINE_REFUND',
            'PICKUP_NO_SHOW_SETTLEMENT',
            'DELIVERY_FAILURE_SETTLEMENT',
            'BORROW_DEPOSIT_SETTLEMENT'
        )
    ),
    gross_refundable_amount NUMERIC(12, 2) NOT NULL CHECK (gross_refundable_amount >= 0),
    deducted_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (deducted_charges >= 0),
    net_refund_amount NUMERIC(12, 2) NOT NULL CHECK (net_refund_amount >= 0),
    wallet_refund_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_refund_share >= 0),
    gateway_refund_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gateway_refund_share >= 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    provider_refund_ref VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_refunds_store_order ON refunds(store_order_id);
