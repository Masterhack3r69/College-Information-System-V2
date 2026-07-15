INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000147', 'FINANCE_VOID_REQUEST', 'Can request payment voids'),
('00000000-0000-0000-0000-000000000148', 'FINANCE_VOID_APPROVE', 'Can approve payment voids'),
('00000000-0000-0000-0000-000000000149', 'FINANCE_ADJUSTMENT_REQUEST', 'Can request assessment adjustments and cancellations'),
('00000000-0000-0000-0000-000000000150', 'FINANCE_ADJUSTMENT_APPROVE', 'Can approve assessment adjustments and cancellations'),
('00000000-0000-0000-0000-000000000151', 'FINANCE_REFUND_REQUEST', 'Can request refunds'),
('00000000-0000-0000-0000-000000000152', 'FINANCE_REFUND_APPROVE', 'Can approve refunds'),
('00000000-0000-0000-0000-000000000153', 'FINANCE_REFUND_DISBURSE', 'Can disburse approved refunds'),
('00000000-0000-0000-0000-000000000154', 'FINANCE_INSTALLMENT_MANAGE', 'Can manage installment templates and assessment plans'),
('00000000-0000-0000-0000-000000000155', 'FINANCE_RECEIPT_MANAGE', 'Can manage official receipt series'),
('00000000-0000-0000-0000-000000000156', 'FINANCE_SESSION_OPERATE', 'Can operate cashier sessions'),
('00000000-0000-0000-0000-000000000157', 'FINANCE_SESSION_APPROVE', 'Can approve cashier closeout and reopening'),
('00000000-0000-0000-0000-000000000158', 'FINANCE_REPORT', 'Can view and export finance reports')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, description) VALUES
('00000000-0000-0000-0000-000000000209', 'FINANCE_MANAGER', 'Finance manager with approval and configuration authority')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000201', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000209', id FROM permissions
WHERE name IN (
    'ACADEMIC_SETUP_VIEW', 'FEE_MANAGE', 'FINANCE_VIEW', 'FINANCE_PAYMENT',
    'FINANCE_VOID_REQUEST', 'FINANCE_VOID_APPROVE', 'FINANCE_ADJUSTMENT_REQUEST',
    'FINANCE_ADJUSTMENT_APPROVE', 'FINANCE_REFUND_REQUEST', 'FINANCE_REFUND_APPROVE',
    'FINANCE_REFUND_DISBURSE', 'FINANCE_INSTALLMENT_MANAGE', 'FINANCE_RECEIPT_MANAGE',
    'FINANCE_SESSION_OPERATE', 'FINANCE_SESSION_APPROVE', 'FINANCE_REPORT'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000206', id FROM permissions
WHERE name IN (
    'FINANCE_VOID_REQUEST', 'FINANCE_ADJUSTMENT_REQUEST', 'FINANCE_REFUND_REQUEST',
    'FINANCE_REFUND_DISBURSE', 'FINANCE_SESSION_OPERATE'
)
ON CONFLICT DO NOTHING;

CREATE TABLE receipt_series (
    id UUID PRIMARY KEY,
    prefix VARCHAR(30) NOT NULL,
    range_start BIGINT NOT NULL,
    range_end BIGINT NOT NULL,
    next_number BIGINT NOT NULL,
    number_width INTEGER NOT NULL DEFAULT 8,
    assigned_cashier_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT receipt_series_range CHECK (range_start > 0 AND range_end >= range_start),
    CONSTRAINT receipt_series_next CHECK (next_number >= range_start AND next_number <= range_end + 1),
    CONSTRAINT receipt_series_width CHECK (number_width BETWEEN 1 AND 18),
    CONSTRAINT receipt_series_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXHAUSTED')),
    CONSTRAINT ux_receipt_series_prefix_range UNIQUE (prefix, range_start, range_end)
);

CREATE UNIQUE INDEX ux_receipt_series_active_cashier
    ON receipt_series(assigned_cashier_id) WHERE status = 'ACTIVE';

CREATE TABLE cashier_sessions (
    id UUID PRIMARY KEY,
    cashier_user_id UUID NOT NULL REFERENCES users(id),
    receipt_series_id UUID NOT NULL REFERENCES receipt_series(id),
    business_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by_user_id UUID REFERENCES users(id),
    variance_reason TEXT,
    reopen_reason TEXT,
    reopened_by_user_id UUID REFERENCES users(id),
    reopened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cashier_sessions_status CHECK (status IN ('OPEN', 'SUBMITTED', 'CLOSED')),
    CONSTRAINT cashier_sessions_close_consistency CHECK (
        status <> 'CLOSED' OR (closed_at IS NOT NULL AND closed_by_user_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX ux_cashier_sessions_open
    ON cashier_sessions(cashier_user_id) WHERE status IN ('OPEN', 'SUBMITTED');
CREATE INDEX idx_cashier_sessions_date ON cashier_sessions(business_date, cashier_user_id);

CREATE TABLE cashier_session_method_totals (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES cashier_sessions(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    declared_amount NUMERIC(12,2),
    variance_amount NUMERIC(12,2),
    CONSTRAINT ux_cashier_session_method UNIQUE(session_id, payment_method),
    CONSTRAINT cashier_session_declared_non_negative CHECK (declared_amount IS NULL OR declared_amount >= 0)
);

ALTER TABLE assessments ADD COLUMN base_assessment_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN net_paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE assessments ADD COLUMN requires_finance_review BOOLEAN NOT NULL DEFAULT false;

UPDATE assessments
SET base_assessment_amount = total_assessment,
    net_paid_amount = amount_paid,
    requires_finance_review = status IN ('CANCELLED', 'REFUNDED');

UPDATE assessments
SET requires_finance_review = true
WHERE balance <> greatest(total_assessment - amount_paid, 0)
   OR amount_paid < 0 OR total_assessment < 0 OR balance < 0;

ALTER TABLE assessments ADD CONSTRAINT assessments_modern_amounts_non_negative CHECK (
    base_assessment_amount >= 0 AND refunded_amount >= 0 AND net_paid_amount >= 0 AND credit_balance >= 0
);

ALTER TABLE assessment_payments ADD COLUMN request_id UUID;
ALTER TABLE assessment_payments ADD COLUMN cashier_session_id UUID REFERENCES cashier_sessions(id);
ALTER TABLE assessment_payments ADD COLUMN receipt_series_id UUID REFERENCES receipt_series(id);
ALTER TABLE assessment_payments ADD COLUMN receipt_sequence BIGINT;
ALTER TABLE assessment_payments ADD COLUMN balance_after NUMERIC(12,2);
ALTER TABLE assessment_payments ADD COLUMN legacy_receipt BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX ux_assessment_payments_request_id ON assessment_payments(request_id) WHERE request_id IS NOT NULL;

CREATE TABLE payment_void_requests (
    id UUID PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES assessment_payments(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    request_id UUID NOT NULL UNIQUE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_by_user_id UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    execution_session_id UUID REFERENCES cashier_sessions(id),
    execution_request_id UUID UNIQUE,
    CONSTRAINT payment_void_request_status CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'EXECUTED'))
);
CREATE UNIQUE INDEX ux_payment_void_request_active ON payment_void_requests(payment_id) WHERE status IN ('REQUESTED', 'APPROVED');

CREATE TABLE assessment_adjustments (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(id),
    adjustment_type VARCHAR(40) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    signed_amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    request_id UUID NOT NULL UNIQUE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_by_user_id UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    reverses_adjustment_id UUID REFERENCES assessment_adjustments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assessment_adjustment_amount_positive CHECK (amount > 0),
    CONSTRAINT assessment_adjustment_type CHECK (adjustment_type IN (
        'DISCOUNT', 'PENALTY', 'CHARGE_CORRECTION', 'CREDIT_CORRECTION', 'CANCELLATION_CREDIT', 'REVERSAL'
    )),
    CONSTRAINT assessment_adjustment_status CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REVERSED')),
    CONSTRAINT assessment_adjustment_sign CHECK (
        (adjustment_type IN ('PENALTY', 'CHARGE_CORRECTION') AND signed_amount > 0)
        OR (adjustment_type IN ('DISCOUNT', 'CREDIT_CORRECTION', 'CANCELLATION_CREDIT') AND signed_amount < 0)
        OR adjustment_type = 'REVERSAL'
    )
);
CREATE INDEX idx_assessment_adjustments_assessment ON assessment_adjustments(assessment_id, requested_at DESC);

CREATE TABLE assessment_cancellation_requests (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(id),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    request_id UUID NOT NULL UNIQUE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_by_user_id UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    decision_reason TEXT,
    cancellation_adjustment_id UUID REFERENCES assessment_adjustments(id),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT assessment_cancellation_status CHECK (status IN ('REQUESTED', 'REJECTED', 'REFUND_REQUIRED', 'RESOLVED'))
);
CREATE UNIQUE INDEX ux_assessment_cancellation_active ON assessment_cancellation_requests(assessment_id)
    WHERE status IN ('REQUESTED', 'REFUND_REQUIRED');

CREATE TABLE assessment_refunds (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(id),
    student_id UUID NOT NULL REFERENCES students(id),
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    request_id UUID NOT NULL UNIQUE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    decision_reason TEXT,
    payment_method VARCHAR(30),
    external_reference VARCHAR(120),
    disbursement_request_id UUID UNIQUE,
    disbursed_by_user_id UUID REFERENCES users(id),
    disbursed_at TIMESTAMPTZ,
    cashier_session_id UUID REFERENCES cashier_sessions(id),
    reversed_refund_id UUID REFERENCES assessment_refunds(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assessment_refund_amount_positive CHECK (amount > 0),
    CONSTRAINT assessment_refund_status CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'DISBURSED', 'CANCELLED', 'REVERSED')),
    CONSTRAINT assessment_refund_disbursement CHECK (
        status NOT IN ('DISBURSED', 'REVERSED') OR
        (payment_method IS NOT NULL AND disbursed_by_user_id IS NOT NULL AND disbursed_at IS NOT NULL AND cashier_session_id IS NOT NULL)
    )
);
CREATE INDEX idx_assessment_refunds_assessment ON assessment_refunds(assessment_id, requested_at DESC);

CREATE TABLE installment_plan_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    school_year_id UUID NOT NULL REFERENCES school_years(id),
    semester_id UUID NOT NULL REFERENCES semesters(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT installment_template_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ux_installment_template_name_term UNIQUE(name, school_year_id, semester_id)
);

CREATE TABLE installment_plan_template_lines (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES installment_plan_templates(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    CONSTRAINT installment_template_percentage CHECK (percentage > 0 AND percentage <= 100),
    CONSTRAINT installment_template_sequence CHECK (sequence_number > 0),
    CONSTRAINT ux_installment_template_sequence UNIQUE(template_id, sequence_number)
);

CREATE TABLE assessment_installment_plans (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL UNIQUE REFERENCES assessments(id),
    template_id UUID REFERENCES installment_plan_templates(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_by_user_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    override_reason TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT assessment_installment_plan_status CHECK (status IN ('ACTIVE', 'CANCELLED'))
);

CREATE TABLE assessment_installments (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES assessment_installment_plans(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    CONSTRAINT assessment_installment_amount_positive CHECK (amount > 0),
    CONSTRAINT assessment_installment_sequence CHECK (sequence_number > 0),
    CONSTRAINT ux_assessment_installment_sequence UNIQUE(plan_id, sequence_number)
);

CREATE TABLE payment_installment_allocations (
    id UUID PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES assessment_payments(id),
    installment_id UUID NOT NULL REFERENCES assessment_installments(id),
    amount NUMERIC(12,2) NOT NULL,
    CONSTRAINT payment_allocation_amount_positive CHECK (amount > 0),
    CONSTRAINT ux_payment_installment_allocation UNIQUE(payment_id, installment_id)
);

ALTER TABLE fee_rules ADD CONSTRAINT ux_fee_rule_scope
    UNIQUE NULLS NOT DISTINCT (fee_item_id, school_year_id, semester_id, program_id, year_level);

CREATE INDEX idx_assessment_payments_session ON assessment_payments(cashier_session_id, paid_at);
CREATE INDEX idx_payment_void_requests_status ON payment_void_requests(status, requested_at);
CREATE INDEX idx_assessment_refunds_status ON assessment_refunds(status, requested_at);
CREATE INDEX idx_assessment_installments_due ON assessment_installments(due_date);
