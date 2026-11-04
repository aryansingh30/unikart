import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const accounts = pgTable(
  'accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    fullName: text('full_name').notNull(),
    phone: text().notNull(),
    institutionCode: text('institution_code').notNull(),
    institutionalId: text('institutional_id').notNull(),
    designation: text().notNull().default('STUDENT'),
    role: text().notNull().default('CUSTOMER'),
    status: text().notNull().default('ACTIVE'),
    passwordHash: text('password_hash').notNull(),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('accounts_email_idx').on(t.email),
    uniqueIndex('accounts_member_idx').on(t.institutionCode, t.institutionalId),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_account_idx').on(t.accountId)],
)
