INSERT INTO permissions (id, name, description) VALUES
('00000000-0000-0000-0000-000000000120', 'FINANCE_VIEW', 'Can view assessments and payment records'),
('00000000-0000-0000-0000-000000000121', 'FINANCE_PAYMENT', 'Can generate assessments and record or void payments')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000201', id
FROM permissions WHERE name IN ('FINANCE_VIEW', 'FINANCE_PAYMENT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000206', id
FROM permissions WHERE name IN ('FINANCE_VIEW', 'FINANCE_PAYMENT')
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions
WHERE role_id = '00000000-0000-0000-0000-000000000206'
  AND permission_id = '00000000-0000-0000-0000-000000000111';

CREATE TABLE assessment_payments (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(id),
    student_id UUID NOT NULL REFERENCES students(id),
    official_receipt_number VARCHAR(80) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    external_reference VARCHAR(120),
    remarks TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cashier_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'POSTED',
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    voided_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assessment_payments_amount_positive CHECK (amount > 0),
    CONSTRAINT assessment_payments_void_consistency CHECK (
        (status = 'POSTED' AND void_reason IS NULL AND voided_at IS NULL AND voided_by_user_id IS NULL)
        OR
        (status = 'VOIDED' AND void_reason IS NOT NULL AND voided_at IS NOT NULL AND voided_by_user_id IS NOT NULL)
    )
);

CREATE INDEX idx_assessment_payments_assessment ON assessment_payments(assessment_id, paid_at DESC);
CREATE INDEX idx_assessment_payments_student ON assessment_payments(student_id);
CREATE INDEX idx_assessment_payments_status ON assessment_payments(status);
