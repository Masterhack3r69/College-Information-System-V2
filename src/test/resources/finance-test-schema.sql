create table if not exists receipt_series (
  id uuid primary key, prefix varchar(30) not null, range_start bigint not null, range_end bigint not null,
  next_number bigint not null, number_width integer not null, assigned_cashier_id uuid not null,
  status varchar(20) not null, created_by uuid not null, created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create unique index if not exists ux_test_receipt_cashier on receipt_series(assigned_cashier_id, status);

create table if not exists cashier_sessions (
  id uuid primary key, cashier_user_id uuid not null, receipt_series_id uuid not null, business_date date not null,
  status varchar(20) not null, opened_at timestamp default current_timestamp, submitted_at timestamp,
  closed_at timestamp, closed_by_user_id uuid, variance_reason clob, reopen_reason clob,
  reopened_by_user_id uuid, reopened_at timestamp, created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create table if not exists cashier_session_method_totals (
  id uuid primary key, session_id uuid not null, payment_method varchar(30) not null,
  expected_amount numeric(12,2) default 0 not null, declared_amount numeric(12,2), variance_amount numeric(12,2),
  unique(session_id, payment_method)
);
create table if not exists payment_void_requests (
  id uuid primary key, payment_id uuid not null, reason clob not null, status varchar(20) default 'REQUESTED' not null,
  request_id uuid not null unique, requested_by_user_id uuid not null, requested_at timestamp default current_timestamp,
  decided_by_user_id uuid, decided_at timestamp, decision_reason clob, execution_session_id uuid,
  execution_request_id uuid unique
);
create table if not exists assessment_adjustments (
  id uuid primary key, assessment_id uuid not null, adjustment_type varchar(40) not null,
  amount numeric(12,2) not null, signed_amount numeric(12,2) not null, reason clob not null,
  status varchar(20) default 'REQUESTED' not null, request_id uuid not null unique, requested_by_user_id uuid not null,
  requested_at timestamp default current_timestamp, decided_by_user_id uuid, decided_at timestamp,
  decision_reason clob, reverses_adjustment_id uuid, created_at timestamp default current_timestamp
);
create table if not exists assessment_cancellation_requests (
  id uuid primary key, assessment_id uuid not null, reason clob not null, status varchar(30) default 'REQUESTED' not null,
  request_id uuid not null unique, requested_by_user_id uuid not null, requested_at timestamp default current_timestamp,
  decided_by_user_id uuid, decided_at timestamp, decision_reason clob, cancellation_adjustment_id uuid,
  resolved_at timestamp
);
create table if not exists assessment_refunds (
  id uuid primary key, assessment_id uuid not null, student_id uuid not null, amount numeric(12,2) not null,
  reason clob not null, status varchar(20) default 'REQUESTED' not null, request_id uuid not null unique,
  requested_by_user_id uuid not null, requested_at timestamp default current_timestamp,
  approved_by_user_id uuid, approved_at timestamp, decision_reason clob, payment_method varchar(30),
  external_reference varchar(120), disbursement_request_id uuid unique, disbursed_by_user_id uuid,
  disbursed_at timestamp, cashier_session_id uuid, reversed_refund_id uuid,
  created_at timestamp default current_timestamp, updated_at timestamp default current_timestamp
);
create table if not exists installment_plan_templates (
  id uuid primary key, name varchar(120) not null, school_year_id uuid not null, semester_id uuid not null,
  status varchar(20) not null, created_by_user_id uuid not null, created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp, unique(name, school_year_id, semester_id)
);
create table if not exists installment_plan_template_lines (
  id uuid primary key, template_id uuid not null, sequence_number integer not null, label varchar(100) not null,
  due_date date not null, percentage numeric(5,2) not null, unique(template_id, sequence_number)
);
create table if not exists assessment_installment_plans (
  id uuid primary key, assessment_id uuid not null unique, template_id uuid, status varchar(20) default 'ACTIVE' not null,
  assigned_by_user_id uuid not null, assigned_at timestamp default current_timestamp,
  override_reason clob, version bigint default 0 not null
);
create table if not exists assessment_installments (
  id uuid primary key, plan_id uuid not null, sequence_number integer not null, label varchar(100) not null,
  due_date date not null, amount numeric(12,2) not null, unique(plan_id, sequence_number)
);
create table if not exists payment_installment_allocations (
  id uuid primary key, payment_id uuid not null, installment_id uuid not null,
  amount numeric(12,2) not null, unique(payment_id, installment_id)
);
