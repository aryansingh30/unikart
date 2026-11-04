-- ============================================================================
-- V6__seed_default_config_and_demo_data.sql
-- Seeds versioned configuration parameters (ADM-04) and baseline institutions/stores
-- ============================================================================

INSERT INTO config_parameters (param_key, param_value, value_type, category, description, version, change_reason) VALUES
('BORROW_FEE_PCT_14D', '10.00', 'DECIMAL', 'BORROW', 'Non-refundable borrow fee % of item value for 14-day duration', 1, 'Initial v2.0 baseline'),
('BORROW_FEE_PCT_30D', '18.00', 'DECIMAL', 'BORROW', 'Non-refundable borrow fee % of item value for 1-month (30-day) duration', 1, 'Initial v2.0 baseline'),
('BORROW_FEE_PCT_45D', '25.00', 'DECIMAL', 'BORROW', 'Non-refundable borrow fee % of item value for 45-day duration', 1, 'Initial v2.0 baseline'),
('BORROW_DEPOSIT_PCT', '50.00', 'DECIMAL', 'BORROW', 'Refundable security deposit % of item value', 1, 'Initial v2.0 baseline'),
('BORROW_RENEWAL_FEE_PCT', '10.00', 'DECIMAL', 'BORROW', 'Renewal fee % of item value for one-time extension', 1, 'Initial v2.0 baseline'),
('PICKUP_WINDOW_DAYS', '7', 'INTEGER', 'BORROW', 'Self-pickup collection window in calendar days (FUL-01)', 1, 'Initial v2.0 baseline'),
('PICKUP_NO_SHOW_DEDUCTION_PCT', '10.00', 'DECIMAL', 'FINES', 'No-show deduction % from refundable deposit after 7-day expiry (FUL-02)', 1, 'Initial v2.0 baseline'),
('LATE_FINE_PER_DAY_INR', '15.00', 'DECIMAL', 'FINES', 'Flat late return fine in INR per overdue day (PEN-01)', 1, 'Initial v2.0 baseline'),
('FINE_DISPUTE_WINDOW_DAYS', '7', 'INTEGER', 'FINES', 'Calendar days within which customer may dispute a fine (PEN-08)', 1, 'Initial v2.0 baseline'),
('DELIVERY_FEE_INTRA_INST_INR', '40.00', 'DECIMAL', 'DELIVERY', 'Partner delivery fee (INR) for same-institution / local delivery', 1, 'Initial v2.0 baseline'),
('DELIVERY_FEE_CROSS_INST_INR', '80.00', 'DECIMAL', 'DELIVERY', 'Partner delivery fee (INR) for cross-institution delivery', 1, 'Initial v2.0 baseline'),
('RETURN_PICKUP_FEE_LOCAL_INR', '40.00', 'DECIMAL', 'DELIVERY', 'Partner return pickup fee (INR) for same-institution borrow return', 1, 'Initial v2.0 baseline'),
('RETURN_PICKUP_FEE_CROSS_INR', '80.00', 'DECIMAL', 'DELIVERY', 'Partner return pickup fee (INR) for cross-institution borrow return', 1, 'Initial v2.0 baseline'),
('DELIVERY_MAX_RETRIES', '2', 'INTEGER', 'DELIVERY', 'Maximum customer-unavailable/refusal delivery retries within 72h (FUL-07)', 1, 'Initial v2.0 baseline'),
('DELIVERY_RETRY_WINDOW_HOURS', '72', 'INTEGER', 'DELIVERY', 'Retry window in hours before returning item to owning store (FUL-07)', 1, 'Initial v2.0 baseline'),
('RETURN_REMINDER_DAYS_BEFORE', '[3, 1]', 'JSON', 'REMINDERS', 'Days before due date to dispatch automated return reminders (BOR-07)', 1, 'Initial v2.0 baseline');
