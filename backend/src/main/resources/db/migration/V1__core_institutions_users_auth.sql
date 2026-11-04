-- ============================================================================
-- V1__core_institutions_users_auth.sql
-- Covers: AUTH-01..08, ADM-01..02, C-01, C-02, C-15
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Participating Institutions
CREATE TABLE institutions (
    institution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email_domain VARCHAR(120) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Unikart Physical Stores (C-01: 1:1 active primary store per institution in v2.0)
CREATE TABLE stores (
    store_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(institution_id) ON DELETE RESTRICT,
    store_code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    location_details TEXT NOT NULL,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(20),
    operating_hours VARCHAR(120) NOT NULL DEFAULT 'Mon-Sat, 9:00 AM - 6:00 PM',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce C-01: At most one ACTIVE store per institution
CREATE UNIQUE INDEX uq_stores_active_per_institution
    ON stores(institution_id)
    WHERE status = 'ACTIVE';

-- 3. Authorised User Whitelist per Institution (AUTH-01, ADM-02)
CREATE TABLE authorised_user_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(institution_id) ON DELETE CASCADE,
    institutional_id VARCHAR(64) NOT NULL,
    email VARCHAR(180) NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    designation VARCHAR(30) NOT NULL CHECK (designation IN ('STUDENT', 'PROFESSOR')),
    department VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    is_registered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_auth_entry_inst_id UNIQUE (institution_id, institutional_id),
    CONSTRAINT uq_auth_entry_inst_email UNIQUE (institution_id, email)
);

-- 4. Platform Users (Customer, Store Manager, Platform Admin)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(institution_id) ON DELETE RESTRICT,
    assigned_store_id UUID REFERENCES stores(store_id) ON DELETE SET NULL,
    institutional_id VARCHAR(64),
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER', 'STORE_MANAGER', 'PLATFORM_ADMIN')),
    designation VARCHAR(30) CHECK (designation IN ('STUDENT', 'PROFESSOR', 'STAFF')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'LOCKED')),
    blocked_flag BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason TEXT,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_institution_inst_id UNIQUE (institution_id, institutional_id),
    CONSTRAINT chk_manager_store_assigned CHECK (
        (role <> 'STORE_MANAGER') OR (assigned_store_id IS NOT NULL AND institution_id IS NOT NULL)
    ),
    CONSTRAINT chk_customer_institution CHECK (
        (role <> 'CUSTOMER') OR (institution_id IS NOT NULL AND institutional_id IS NOT NULL)
    )
);

CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_role_status ON users(role, status);

-- 5. OTP & Verification Tokens (Password Reset AUTH-05, Staff 2FA AUTH-07, Wallet Redemption WAL-07)
CREATE TABLE otp_tokens (
    otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    purpose VARCHAR(40) NOT NULL CHECK (purpose IN ('PASSWORD_RESET', 'STAFF_2FA', 'WALLET_REDEMPTION', 'EMAIL_VERIFY')),
    otp_code_hash VARCHAR(255) NOT NULL,
    reference_id VARCHAR(100),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_tokens_user_purpose ON otp_tokens(user_id, purpose, expires_at);
