# Finance Endpoints

Exact request/response records are defined by Spring DTOs and the `ApiResponse` envelope.

| Area | Methods and paths | Primary authority |
|---|---|---|
| Dashboard | `GET /api/v1/finance/dashboard` | `FINANCE_VIEW` |
| Assessment/payment | `GET /assessments*`; `POST /assessments/{id}/payments`; `POST /assessments/{id}/recalculate` | `FINANCE_VIEW`, `FINANCE_PAYMENT` |
| Void | `POST /assessment-payments/{id}/void`; `GET /finance/payment-void-requests`; `POST /finance/payment-void-requests/{id}/decision|execute` | void request/approve/session permissions |
| Adjustment | `GET|POST /assessments/{id}/adjustments`; `GET /finance/adjustments`; decision/reversal under `/finance/adjustments/{id}` | adjustment request/approve |
| Cancellation | `POST /assessments/{id}/cancellation-requests`; list/decision under `/finance/cancellation-requests` | adjustment request/approve |
| Refund | `POST /assessments/{id}/refunds`; list/decision/disburse/reversal under `/finance/refunds` | refund request/approve/disburse |
| Installment | CRUD `/finance/installment-templates`; `GET|POST|PUT /assessments/{id}/installment-plan` | installment manage/view |
| Receipt series | `GET|POST /finance/receipt-series`; `PATCH /finance/receipt-series/{id}/status` | receipt manage/view |
| Cashier session | list/current/open/submit/decision/reopen under `/finance/cashier-sessions` | session operate/approve |
| Reports | `GET /finance/reports/collections`; `.csv`; `.pdf` | `FINANCE_REPORT` |
| Student receipt | `GET /student/me/payments/{id}/receipt` | `STUDENT_FINANCE_SELF` plus ownership |

## Write Contract

- Payment body: `requestId`, positive `amount`, `paymentMethod`, optional external reference/remarks. OR number is server allocated.
- Void/cancellation/reversal body: `requestId`, required reason.
- Decision body: `approve`, required reason.
- Refund disbursement: `requestId`, method, optional external reference; requires an open cashier session.

## Error Conditions

Business-rule failures include a stable `code` in `ApiResponse`. Concurrency failures return HTTP 409 with `CONCURRENT_FINANCE_UPDATE`; permission failures remain HTTP 403.

## Audit

Every state-changing endpoint is audited by the service. Collection exports and student receipt access are also audited.

## Related Notes

- [[Billing]]
- [[Authentication and Roles]]
