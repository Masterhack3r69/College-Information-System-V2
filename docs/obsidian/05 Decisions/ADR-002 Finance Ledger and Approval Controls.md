# ADR-002: Finance Ledger and Approval Controls

## Status

Accepted

## Date

2026-07-15

## Context

Basic mutable assessment totals and direct payment voiding could not safely support concurrent collections, refunds, cancellation, official receipt accountability, or audit-grade history.

## Decision

- Keep financial transactions immutable and derive assessment totals from ledgers.
- Serialize mutations with an assessment pessimistic lock and retain JPA optimistic versioning.
- Require unique request IDs for retry-safe writes.
- Separate request, approval, and execution/disbursement permissions and enforce actor separation in services.
- Allocate official receipts and installment payments server-side inside the same transaction.
- Require Finance cancellation resolution before Registrar cancellation when an assessment exists.

## Alternatives Considered

- Directly editing assessment totals: rejected because history and reconciliation become unreliable.
- Soft-delete/rewrite correction: rejected because it obscures audit evidence.
- External accounting/payment platform as source of truth: excluded from current scope.

## Consequences

### Positive

- Deterministic totals, retry safety, controlled authorization, point-in-time receipts, and auditable closeout.

### Negative

- More workflow states/tables, two-person operations, and operational setup for sessions and receipt series.

## Related Notes

- [[Finance Modernization]]
- [[Billing]]
- [[Authentication and Roles]]
