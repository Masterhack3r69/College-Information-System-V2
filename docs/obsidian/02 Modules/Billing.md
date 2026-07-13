# Billing

## Purpose

Configure fees, generate itemized assessments from confirmed enrollments, record payments, calculate balances, and produce receipts.

## Status

Implemented

## Main Users

Cashier and Super Admin; registrars can see enrollment-linked assessment information; students see their own finance data.

## Current Features

- Fee item and fee rule management.
- Pending-enrollment queue, assessment generation and recalculation.
- Payment recording with official receipt number, method, reference, and remarks.
- Payment voiding with reason and audit context.
- Assessment/payment display, receipt report, and student self-service history.

## Main Workflow

Configure fees/rules → confirm enrollment → generate assessment → record payment(s) → update paid amount/balance/status → issue receipt. Void creates an explicit void state rather than deleting the payment.

## Business Rules

- Only confirmed enrollments can be assessed.
- Payment amount must be positive; official receipt number is unique.
- Posted and voided payment fields are constrained for consistency.
- `FINANCE_PAYMENT` is required for assessment generation, recalculation, payment, and void actions.

## Frontend Implementation

Administrative route `/admin/finance`; student route `/student/finance`.

## Backend Implementation

`FeeController`, `AssessmentController`, fee/assessment/payment services, report receipt endpoint, JPA repositories and entities.

## Database Entities

`fee_items`, `fee_rules`, `assessments`, `assessment_items`, `assessment_payments`.

## API Endpoints

- `/api/v1/fees`
- `/api/v1/assessments`
- `POST /api/v1/enrollments/{id}/generate-assessment`
- `POST /api/v1/assessments/{id}/recalculate`
- `GET|POST /api/v1/assessments/{id}/payments`
- `POST /api/v1/assessment-payments/{id}/void`
- `GET /api/v1/reports/assessment-payments/{id}/receipt`

## Known Gaps

- No external payment gateway or accounting integration is part of the MVP.

## Related Notes

- [[Enrollment]]
- [[Student Portal]]
- [[MVP Scope]]

