-- Intentional finance reset requested for the development dataset.
-- Keep academic, enrollment, student, user, and audit records intact while
-- removing every finance transaction and configuration record in one atomic
-- Flyway migration.
TRUNCATE TABLE
    payment_installment_allocations,
    assessment_installments,
    assessment_installment_plans,
    installment_plan_template_lines,
    installment_plan_templates,
    assessment_refunds,
    assessment_cancellation_requests,
    assessment_adjustments,
    payment_void_requests,
    assessment_payments,
    cashier_session_method_totals,
    cashier_sessions,
    receipt_series,
    assessment_items,
    assessments,
    fee_rules,
    fee_items;

-- Representative Philippine college fee catalog for development and
-- demonstration. Amounts are PHP and are not an institution-approved tariff.
INSERT INTO fee_items (id, fee_code, fee_name, category, description, status) VALUES
('17000000-0000-0000-0000-000000000001', 'TUITION', 'Tuition Fee', 'TUITION',
 'Instructional fee charged for each enrolled academic unit.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000002', 'LABORATORY', 'Laboratory Fee', 'LABORATORY',
 'Consumables, equipment, maintenance, and laboratory support charged per laboratory subject.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000003', 'REGISTRATION', 'Registration Fee', 'OTHER',
 'Enrollment processing, registration, and records administration per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000004', 'LIBRARY', 'Library Fee', 'MISCELLANEOUS',
 'Library collections, circulation services, and digital research resources per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000005', 'TECH_LMS', 'Technology and LMS Fee', 'MISCELLANEOUS',
 'Campus systems, learning-management platform, internet access, and student technology services.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000006', 'MEDICAL_DENTAL', 'Medical and Dental Fee', 'MISCELLANEOUS',
 'Basic campus clinic, first-aid, and preventive health services per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000007', 'GUIDANCE', 'Guidance and Counseling Fee', 'MISCELLANEOUS',
 'Student guidance, counseling, testing, and career-development services per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000008', 'ATHLETICS', 'Athletics Fee', 'MISCELLANEOUS',
 'Intramural programs, sports facilities, and student athletics activities per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000009', 'CULTURAL', 'Cultural Fee', 'MISCELLANEOUS',
 'Student cultural, arts, and campus community programs per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000010', 'STUDENT_ACTIVITY', 'Student Activity Fee', 'MISCELLANEOUS',
 'Recognized student organizations and institution-wide student activities per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000011', 'DEVELOPMENT', 'Development Fee', 'OTHER',
 'Shared campus facilities, classroom improvements, and instructional infrastructure per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000012', 'STUDENT_INSURANCE', 'Student Accident Insurance', 'OTHER',
 'Group accident-insurance coverage for enrolled students per semester.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000013', 'ID_CARD', 'Student Identification Card', 'OTHER',
 'Initial student identification card issued to first-year students.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000014', 'NSTP', 'NSTP Support Fee', 'OTHER',
 'Training materials and operational support for first-year NSTP participation.', 'ACTIVE'),
('17000000-0000-0000-0000-000000000015', 'GRADUATION', 'Graduation Fee', 'OTHER',
 'Graduation processing, diploma preparation, and commencement support for final-year students.', 'ACTIVE');

-- Seed pricing rules for every active school year. Rules with no semester,
-- program, or year level apply broadly; the more-specific BSIT and year-level
-- rules win through the V16 specificity algorithm.
WITH seed_rule (
    fee_code, semester_name, program_code, year_level, computation_type, amount
) AS (VALUES
    ('TUITION',          NULL,              NULL,   NULL, 'PER_UNIT',                650.00::numeric),
    ('LABORATORY',       NULL,              NULL,   NULL, 'PER_LABORATORY_SUBJECT',  900.00::numeric),
    ('LABORATORY',       NULL,              'BSIT', NULL, 'PER_LABORATORY_SUBJECT', 1200.00::numeric),
    ('REGISTRATION',     NULL,              NULL,   NULL, 'PER_SEMESTER',            750.00::numeric),
    ('LIBRARY',          NULL,              NULL,   NULL, 'PER_SEMESTER',            450.00::numeric),
    ('TECH_LMS',         NULL,              NULL,   NULL, 'PER_SEMESTER',            500.00::numeric),
    ('TECH_LMS',         NULL,              'BSIT', NULL, 'PER_SEMESTER',            750.00::numeric),
    ('MEDICAL_DENTAL',   NULL,              NULL,   NULL, 'PER_SEMESTER',            300.00::numeric),
    ('GUIDANCE',         NULL,              NULL,   NULL, 'PER_SEMESTER',            200.00::numeric),
    ('ATHLETICS',        NULL,              NULL,   NULL, 'PER_SEMESTER',            300.00::numeric),
    ('CULTURAL',         NULL,              NULL,   NULL, 'PER_SEMESTER',            200.00::numeric),
    ('STUDENT_ACTIVITY', NULL,              NULL,   NULL, 'PER_SEMESTER',            250.00::numeric),
    ('DEVELOPMENT',      NULL,              NULL,   NULL, 'PER_SEMESTER',            600.00::numeric),
    ('STUDENT_INSURANCE',NULL,              NULL,   NULL, 'PER_SEMESTER',            150.00::numeric),
    ('ID_CARD',          NULL,              NULL,      1, 'PER_YEAR_LEVEL',          200.00::numeric),
    ('NSTP',             NULL,              NULL,      1, 'PER_YEAR_LEVEL',          350.00::numeric),
    ('GRADUATION',       'SECOND SEMESTER', NULL,      4, 'PER_YEAR_LEVEL',         2500.00::numeric)
)
INSERT INTO fee_rules (
    id, fee_item_id, school_year_id, semester_id, program_id, year_level,
    computation_type, amount, status
)
SELECT
    gen_random_uuid(),
    fee.id,
    school_year.id,
    semester.id,
    program.id,
    seed_rule.year_level,
    seed_rule.computation_type,
    seed_rule.amount,
    'ACTIVE'
FROM seed_rule
JOIN fee_items fee ON fee.fee_code = seed_rule.fee_code
JOIN school_years school_year ON school_year.active
LEFT JOIN semesters semester ON semester.name = seed_rule.semester_name
LEFT JOIN programs program ON program.program_code = seed_rule.program_code
WHERE (seed_rule.semester_name IS NULL OR semester.id IS NOT NULL)
  AND (seed_rule.program_code IS NULL OR program.id IS NOT NULL);
