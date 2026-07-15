# Finance Test Cases

## Automated now

- Assessment calculations and recalculation restrictions.
- Payment partial/full/void lifecycle, idempotent retry, managed receipt allocation, and overpayment rejection.
- Independent adjustment approval; credit creation; refund approval/disbursement; derived totals.
- Installment snapshot and oldest-line partial allocation.
- Enrollment cancellation blocked until Finance resolution.
- Clean PostgreSQL 16 Flyway V1–V17 application and Hibernate schema initialization.
- Live V16-to-V17 Finance reset with 15 fee items, 17 active-year rules, zero assessments/transactions, and no duplicate rule scopes.
- Frontend TypeScript production build.

## Required regression expansion

- [ ] Multi-thread PostgreSQL tests for simultaneous payment, adjustment/payment, OR retry, and refund reservation.
- [ ] MockMvc permission matrix for every new Finance authority and separation-of-duties error.
- [ ] Migration fixture from representative V15 unpaid/partial/paid/voided records.
- [ ] PDF assertions for point-in-time balance and `VOIDED` watermark.
- [ ] Browser flows for session closeout, OR exhaustion, approvals/refund, cancellation gate, and student cross-account denial.

## Acceptance commands

- `mvn test`
- `npm run build` in `frontend`
- Flyway Maven migrate against PostgreSQL 16

## Related Notes

- [[Finance Modernization]]
- [[Known Issues]]
