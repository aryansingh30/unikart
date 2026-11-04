# Unikart v2.0 — Phase 1: Architecture, Package Layout & ER Diagram

## 1. Repository Folder Structure

```text
unikart/
├── docs/
│   ├── ARCHITECTURE.md               # Folder structure, package layout & architecture decisions
│   └── ER_DIAGRAM.mmd                # Mermaid Entity-Relationship diagram (SRS Section 8)
├── backend/                          # Spring Boot 3 (Java 17+, Maven, PostgreSQL, Flyway)
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/unikart/
│       │   │   ├── UnikartApplication.java
│       │   │   ├── common/           # Global exception handler, ApiResponse, Audit aspect, Encryption util
│       │   │   ├── config/           # SecurityConfig, CorsConfig, OpenApiConfig, RateLimitConfig
│       │   │   ├── auth/             # AUTH-01..08: JWT, Staff 2FA OTP, Register, Login, Password Reset
│       │   │   ├── institution/      # ADM-01..02: Institution, Store, AuthorisedUserEntry whitelist
│       │   │   ├── catalog/          # CAT-01..06, INV-01..06: Item, Copy, Listing, WaitlistEntry
│       │   │   ├── cart/             # CART-01..02: Cart, CartLine (no stock reservation)
│       │   │   ├── order/            # CART-03..11, FUL-01..10, CAN-01..07: Checkout, StoreOrder, OrderLine, DeliveryJob, Refund
│       │   │   ├── borrow/           # BOR-01..11, PEN-01..09: BorrowRecord, Renewal, Fine, Due, FineDispute
│       │   │   ├── wallet/           # WAL-01..12: Wallet, WalletTransaction, BankAccount, Payment, PaymentAllocation
│       │   │   ├── store/            # SELL-01..08, INV-07..08: SellSubmission, SellLine, Store Manager operations
│       │   │   ├── notification/     # NOT-01..03: Notification, UserNotificationPreference, Email/SMS simulator
│       │   │   └── admin/            # ADM-03..09: ConfigParameter versioning, AuditLog, OperationalAlert, Reports
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/
│       │           ├── V1__core_institutions_users_auth.sql
│       │           ├── V2__catalog_items_copies_listings.sql
│       │           ├── V3__cart_checkout_orders_payments.sql
│       │           ├── V4__borrow_renewals_fines_disputes.sql
│       │           ├── V5__sell_wallet_delivery_notifications_admin.sql
│       │           └── V6__seed_default_config_and_demo_data.sql
│       └── test/
│           └── java/com/unikart/     # Module-by-module integration & unit tests
└── frontend/                         # Next.js (React 19, Tailwind v4) exported from Vercel v0
```

## 2. Locked Decisions From Phase 0 Review
1. **In-Store Sell Decision (SELL-04):** Store Manager records the seller's in-person decision (accept/decline quote) directly in `/manager/sell-requests` and approves the payout immediately.
2. **Staff 2FA (AUTH-07):** `STORE_MANAGER` and `PLATFORM_ADMIN` logins trigger an immediate 6-digit email/in-app OTP verification step before issuing the active access JWT.
3. **Built-in Provider Simulators:** Spring Boot includes built-in mock/simulator endpoints for Payment Gateway webhooks, Bank Payout callbacks, Delivery Partner status transitions, and Email/SMS dispatch with HMAC signature verification.
4. **Seeded Config Defaults (ADM-04, ADM-08):** Version 1 parameters are seeded in `V6__seed_default_config_and_demo_data.sql` with effective timestamps and snapshotted onto `checkouts`, `store_orders`, and `borrow_records`.
