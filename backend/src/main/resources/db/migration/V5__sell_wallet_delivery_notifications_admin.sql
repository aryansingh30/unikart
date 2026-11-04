-- ============================================================================
-- V5__sell_wallet_delivery_notifications_admin.sql
-- Covers: WAL-01..12, SELL-01..08, FUL-03..10, NOT-01..03, ADM-03..09, C-06, C-13, C-14
-- ============================================================================

-- 1. Wallets (WAL-01, WAL-02, WAL-08, C-06)
CREATE TABLE wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    reserved_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_balance >= 0),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Validated Bank Accounts (Encrypted at rest per WAL-06)
CREATE TABLE bank_accounts (
    bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_holder_name VARCHAR(180) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    masked_account_number VARCHAR(32) NOT NULL,
    encrypted_account_number TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);

-- 3. WalletTransactions: Append-only Ledger (WAL-05, WAL-10, WAL-11, BR-20, C-13)
CREATE TABLE wallet_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    tx_type VARCHAR(35) NOT NULL CHECK (
        tx_type IN (
            'SELLER_PAYOUT_CREDIT',
            'REFUND_CREDIT',
            'PURCHASE_DEBIT',
            'BORROW_PAYMENT_DEBIT',
            'RENEWAL_DEBIT',
            'FINE_DUE_DEBIT',
            'BANK_REDEMPTION_DEBIT',
            'REVERSAL_CREDIT',
            'REVERSAL_DEBIT'
        )
    ),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        state IN ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED')
    ),
    balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0),
    reserved_after NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_after >= 0),
    reference_type VARCHAR(40) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    reversal_of_tx_id UUID REFERENCES wallet_transactions(tx_id),
    bank_account_id UUID REFERENCES bank_accounts(bank_account_id),
    provider_payout_ref VARCHAR(120),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

-- Prevent UPDATE or DELETE of settled ledger financial fields (BR-20 append-only enforcement)
CREATE OR REPLACE FUNCTION enforce_append_only_wallet_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'WalletTransaction ledger is append-only; deletions are prohibited (BR-20)';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF OLD.amount <> NEW.amount OR OLD.tx_type <> NEW.tx_type OR OLD.wallet_id <> NEW.wallet_id THEN
            RAISE EXCEPTION 'WalletTransaction immutable fields cannot be modified (BR-20)';
        END IF;
        IF OLD.state = 'SUCCESS' AND NEW.state <> 'REVERSED' THEN
            RAISE EXCEPTION 'Settled SUCCESS WalletTransaction can only transition to REVERSED via reversal entry (WAL-10)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wallet_ledger_append_only
BEFORE UPDATE OR DELETE ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION enforce_append_only_wallet_ledger();

-- 4. SellSubmission & SellLine: In-store Sell-to-Unikart workflow (SELL-01..08)
CREATE TABLE sell_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_number VARCHAR(40) NOT NULL UNIQUE,
    seller_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    verified_by_manager_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'INSPECTING' CHECK (
        status IN ('INSPECTING', 'QUOTED', 'SELLER_ACCEPTED_APPROVED', 'SELLER_DECLINED', 'REJECTED')
    ),
    total_quoted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_quoted_amount >= 0),
    total_approved_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_approved_payout >= 0),
    wallet_tx_id UUID REFERENCES wallet_transactions(tx_id),
    visit_notes TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sell_submissions_store ON sell_submissions(store_id, created_at DESC);
CREATE INDEX idx_sell_submissions_seller ON sell_submissions(seller_user_id, created_at DESC);

CREATE TABLE sell_lines (
    sell_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES sell_submissions(submission_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(item_id) ON DELETE RESTRICT,
    authenticity_verified BOOLEAN NOT NULL DEFAULT TRUE,
    assessed_condition VARCHAR(20) NOT NULL CHECK (assessed_condition IN ('NEW', 'GOOD', 'FAIR', 'DAMAGED')),
    base_item_value NUMERIC(12, 2) NOT NULL CHECK (base_item_value >= 0),
    quoted_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quoted_amount >= 0),
    decision VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
        decision IN ('PENDING', 'QUOTED', 'ACCEPTED_AND_APPROVED', 'SELLER_DECLINED', 'REJECTED_BY_STORE')
    ),
    intended_listing_type VARCHAR(20) DEFAULT 'BUY_AND_BORROW' CHECK (
        intended_listing_type IN ('BUY_ONLY', 'BORROW_ONLY', 'BUY_AND_BORROW')
    ),
    rejection_or_decline_reason TEXT,
    created_copy_id UUID REFERENCES copies(copy_id),
    created_listing_id UUID REFERENCES listings(listing_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. DeliveryJob: Outbound & Return Partner Logistics (FUL-03..10)
CREATE TABLE delivery_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(40) NOT NULL UNIQUE,
    store_order_id UUID REFERENCES store_orders(store_order_id) ON DELETE RESTRICT,
    borrow_id UUID REFERENCES borrow_records(borrow_id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('OUTBOUND', 'RETURN_PICKUP')),
    is_cross_institution BOOLEAN NOT NULL DEFAULT FALSE,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    provider_name VARCHAR(80) NOT NULL DEFAULT 'Unikart Express Logistics',
    provider_tracking_ref VARCHAR(80) NOT NULL UNIQUE,
    pickup_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    delivery_charge NUMERIC(12, 2) NOT NULL CHECK (delivery_charge >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED' CHECK (
        status IN (
            'ASSIGNED',
            'PICKED_UP',
            'IN_TRANSIT',
            'DELIVERED',
            'FAILED_RETRY_SCHEDULED',
            'FAILED_RETURNING_TO_STORE',
            'RETURNED_TO_STORE',
            'EXCEPTION'
        )
    ),
    attempt_count INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 3),
    max_retries INT NOT NULL DEFAULT 2,
    first_failed_at TIMESTAMPTZ,
    retry_window_expires_at TIMESTAMPTZ,
    last_failure_reason TEXT,
    handover_otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_jobs_store_status ON delivery_jobs(store_id, status);
CREATE INDEX idx_delivery_jobs_order ON delivery_jobs(store_order_id);

-- 6. Notifications & Preferences (NOT-01..03)
CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    Optional_sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    channel VARCHAR(15) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS')),
    event_type VARCHAR(50) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_link VARCHAR(255),
    delivery_state VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (
        delivery_state IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')
    ),
    failure_or_skip_reason TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- 7. Versioned Configuration Parameters (ADM-04, ADM-07, ADM-08, C-14, NFR-16)
CREATE TABLE config_parameters (
    parameter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    param_key VARCHAR(80) NOT NULL,
    param_value VARCHAR(255) NOT NULL,
    value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('DECIMAL', 'INTEGER', 'STRING', 'BOOLEAN', 'JSON')),
    category VARCHAR(40) NOT NULL CHECK (category IN ('BORROW', 'FINES', 'DELIVERY', 'REMINDERS', 'WALLET')),
    description TEXT NOT NULL,
    version INT NOT NULL CHECK (version >= 1),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    changed_by UUID REFERENCES users(user_id),
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_config_key_version UNIQUE (param_key, version)
);

-- Enforce C-14: Only one active (effective_to IS NULL) version per key
CREATE UNIQUE INDEX uq_config_active_key
    ON config_parameters(param_key)
    WHERE effective_to IS NULL;

-- 8. Tamper-Evident Audit Log (ADM-06, NFR-09)
CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    store_id UUID REFERENCES stores(store_id) ON DELETE SET NULL,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    ip_address VARCHAR(64),
    correlation_id VARCHAR(100),
    previous_hash VARCHAR(128) NOT NULL,
    entry_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

-- Prevent any UPDATE or DELETE on audit_logs (NFR-09 tamper-evident requirement)
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AuditLog is tamper-evident and append-only; UPDATE and DELETE are forbidden (NFR-09)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- 9. Operational Alerts (ADM-09, WAL-12, NFR-12)
CREATE TABLE operational_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (
        alert_type IN (
            'PAYMENT_GATEWAY_FAILURE',
            'DELIVERY_EXCEPTION',
            'WALLET_RECONCILIATION_MISMATCH',
            'BACKUP_RESTORE_ALERT',
            'INTEGRATION_TIMEOUT'
        )
    ),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    title VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    resolved_by UUID REFERENCES users(user_id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
