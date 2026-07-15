# Billing

## Purpose

Control fee assessment, collections, adjustments, installments, refunds, official receipts, cashier accountability, and student finance self-service.

## Status

Implemented through Flyway `V17` and the `/admin/finance` and `/student/finance` workspaces. `V17` resets the development finance dataset and installs the representative fee catalog below.

## Main Users

- `CASHIER`: opens a session, posts payments, requests voids/adjustments/refunds, executes approved voids, and disburses independently approved refunds.
- `FINANCE_MANAGER`: manages fees, templates, and receipt series; approves sensitive requests and closeout; views reports.
- `SUPER_ADMIN`: receives all permissions.
- `REGISTRAR`: may cancel an assessed enrollment only after Finance resolution.
- `STUDENT`: views owned assessments/payments and downloads owned receipts.

## Derived Financial Model

| Value | Meaning |
|---|---|
| `baseAssessmentAmount` | Sum of the immutable assessment-item snapshot |
| `adjustmentAmount` | Sum of approved signed adjustment ledger entries |
| `totalAssessment` | Base plus approved adjustments, floored at zero |
| `amountPaid` | Gross posted, non-voided payments |
| `refundedAmount` | Disbursed refunds less disbursed reversal entries |
| `netPaidAmount` | Gross payments less refunds |
| `balance` | Positive charges still due |
| `creditBalance` | Net paid above charges |

Clients never supply these totals. `FinanceLedgerService` recomputes them from immutable ledgers inside the mutation transaction.

## Main Workflows

### Payment and official receipt

Open cashier session → lock assessment → validate balance → lock assigned receipt series → consume next OR → write payment and installment allocations → recompute totals → capture `balanceAfter`.

- Every write has a UUID `requestId` for retry safety.
- Assessment pessimistic locking and JPA optimistic versioning serialize mutations.
- Payments are blocked for `CANCEL_PENDING`, `CANCELLED`, `REFUNDED`, and `CREDIT_BALANCE` assessments.
- Legacy receipts retain their original number and have nullable session/series linkage.

### Sensitive actions

Request → independent decision → execution/disbursement when applicable.

- A requester cannot approve the same adjustment, void, cancellation, or refund.
- A refund approver cannot disburse that refund.
- Approved adjustments create immutable signed ledger entries; reversal creates a counter-entry.
- Approved voids are executed by a cashier in an open session; the payment is retained as `VOIDED`.

### Assessment cancellation

Request cancellation → different Finance Manager approves → `CANCELLATION_CREDIT` reduces charges to zero → no collection becomes `CANCELLED`; collected money remains `CANCEL_PENDING` until refund disbursement makes net paid zero and status becomes `REFUNDED` → Registrar cancels enrollment.

### Installments

- Active template lines total exactly 100% and use exact due dates.
- Assignment snapshots lines into an assessment plan.
- Payments allocate oldest-first and allow partial allocation.
- Derived line states are `UPCOMING`, `PARTIAL`, `PAID`, and `OVERDUE`.
- Authorized overrides require a reason and must still total the assessment.
- Unstarted plans regenerate after allowed assessment recalculation.

### Cashier closeout

Open → submit declared tender totals and variance reason → Finance Manager closes or returns to `OPEN`. Same-day reopening requires manager authority and no later cashier session.

Expected totals: posted payments add; executed voids subtract in the original tender; disbursed refunds subtract in the disbursement tender.

## Fee Rule Selection

- Match against the enrollment's stored school year, semester, program, and year level.
- Group rules per fee item and use the highest specificity score based on non-null semester/program/year dimensions.
- Reject equal-highest ambiguity as `AMBIGUOUS_FEE_RULE`.
- Identical scopes are blocked by a PostgreSQL `UNIQUE NULLS NOT DISTINCT` constraint.

## Development Fee Seed

`V17__reset_and_seed_college_fees.sql` intentionally removes all assessments, finance ledgers, fee rules/items, installment templates, receipt series, and cashier sessions before seeding the active school year.

| Fee | Basis | PHP amount | Scope |
|---|---|---:|---|
| Tuition | Per unit | 650.00 | All programs/year levels |
| Laboratory | Per laboratory subject | 900.00 | General rate |
| Laboratory | Per laboratory subject | 1,200.00 | BSIT override |
| Registration | Per semester | 750.00 | All students |
| Library | Per semester | 450.00 | All students |
| Technology and LMS | Per semester | 500.00 | General rate |
| Technology and LMS | Per semester | 750.00 | BSIT override |
| Medical and dental | Per semester | 300.00 | All students |
| Guidance and counseling | Per semester | 200.00 | All students |
| Athletics | Per semester | 300.00 | All students |
| Cultural | Per semester | 200.00 | All students |
| Student activity | Per semester | 250.00 | All students |
| Development | Per semester | 600.00 | All students |
| Student accident insurance | Per semester | 150.00 | All students |
| Student ID card | Fixed by year level | 200.00 | First year |
| NSTP support | Fixed by year level | 350.00 | First year |
| Graduation | Fixed by year level | 2,500.00 | Fourth year, second semester |

These are representative demonstration values, not an approved institutional tariff. Finance must approve rates before production use. Receipt series and installment templates remain unseeded because they require accountable cashiers and institution-approved due dates.

## Frontend

`/admin/finance` provides Dashboard, Assessments, Approval Queue, Cashier Sessions, Fee Setup and Installment Templates, Receipt Series, and Reports. `/student/finance` displays all terms, itemization, installments, adjustments, gross/refunded/net totals, credits, and receipt downloads.

## API and Database

- [[Finance Endpoints]]
- [[Finance Data Dictionary]]
- [[Finance Modernization]]

## Exclusions

No payment gateway, tax engine, general-ledger synchronization, accounting export mapping, or cross-term credit transfer.

## Related Notes

- [[Enrollment]]
- [[Student Portal]]
- [[User Roles]]
- [[ADR-002 Finance Ledger and Approval Controls]]
