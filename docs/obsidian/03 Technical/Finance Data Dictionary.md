# Finance Data Dictionary

Flyway `V16__finance_modernization.sql` defines the finance controls. `V17__reset_and_seed_college_fees.sql` is the current development-data source for fee items and rules.

## Assessment additions

| Field | Type | Required | Description |
|---|---|---:|---|
| `base_assessment_amount` | numeric(12,2) | Yes | Base item snapshot total |
| `adjustment_amount` | numeric(12,2) | Yes | Approved signed ledger sum |
| `refunded_amount` | numeric(12,2) | Yes | Net disbursed refund ledger |
| `net_paid_amount` | numeric(12,2) | Yes | Gross paid less refunded |
| `credit_balance` | numeric(12,2) | Yes | Net paid above charges |
| `version` | bigint | Yes | Optimistic version |
| `requires_finance_review` | boolean | Yes | Blocks new mutations on flagged legacy records |

Payment additions: nullable legacy-compatible `request_id`, `cashier_session_id`, `receipt_series_id`, `receipt_sequence`, point-in-time `balance_after`, and `legacy_receipt`.

## Finance entities

| Entity | Purpose | Important fields and constraints |
|---|---|---|
| `assessment_adjustments` | Immutable charge/credit and reversal ledger | signed effect, reason, request/decision actors/timestamps, unique request ID, reversal link |
| `assessment_cancellation_requests` | Finance cancellation resolution | assessment, reason, requester/decision, cancellation adjustment, resolved time; one active per assessment |
| `assessment_refunds` | Refund and reversal ledger | student/assessment, amount, status, request/approval/disbursement actors, method/reference/session, reversal link |
| `installment_plan_templates` | Reusable term template | name, school year, semester, status, creator; unique name per term |
| `installment_plan_template_lines` | Template schedule | sequence, label, exact due date, percentage; unique sequence |
| `assessment_installment_plans` | Assessment snapshot header | unique assessment, source template, status, assigner, override reason, version |
| `assessment_installments` | Snapshot schedule | sequence, label, date, amount; positive amount and unique sequence |
| `payment_installment_allocations` | Oldest-first payment application | payment, installment, positive amount; unique pair |
| `receipt_series` | Managed OR number range | prefix/range/next/width, assigned cashier, status, creator; locked on allocation |
| `cashier_sessions` | Business-date cashier accountability | cashier, series, timestamps, status, close/reopen actors and reasons; one open/submitted session per cashier |
| `cashier_session_method_totals` | Tender closeout | expected, declared, variance per session/method |
| `payment_void_requests` | Void request/approval/execution | payment, reason, request/decision, execution session/request ID; one active per payment |

## Relationships

- Every mutation ledger belongs to one assessment.
- Payments and refunds link to the cashier session where cash movement occurred.
- Installment allocations remain immutable; a voided payment is excluded from derived allocation totals.
- Receipt series belong to one assigned cashier and are consumed under row lock.

## Backfill

Existing assessments set base equal to current total, zero adjustments/refunds/credit, and net paid equal to existing paid. Existing payments are legacy receipts. Terminal or amount-inconsistent records are flagged for Finance review.

## V17 Development Reset

- Truncates the complete Finance dependency graph while preserving academic, enrollment, student, user, and audit tables.
- Leaves assessments, payments, adjustments, refunds, receipt series, cashier sessions, and installment setup empty.
- Seeds 15 active fee items and 17 scoped rules for each active school year when BSIT and `SECOND SEMESTER` setup records are present.
- Uses broad default rules plus more-specific BSIT, first-year, and fourth-year rules; duplicate scopes remain prohibited.

## Related Notes

- [[Database Overview]]
- [[Billing]]
