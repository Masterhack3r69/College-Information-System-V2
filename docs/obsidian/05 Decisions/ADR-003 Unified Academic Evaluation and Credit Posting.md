# ADR-003: Unified Academic Evaluation and Credit Posting

## Status

Accepted

## Date

2026-07-16

## Context

Transfer, shifting, second-degree, and curriculum-migration cases all need source evidence, grouped equivalency decisions, department review, Registrar approval, posted credits, and audit history. Encoding these concepts as student statuses or direct internal grades would mix admission origin, enrollment load, academic standing, and curriculum completion.

## Decision

Use one stateful academic-evaluation aggregate for all prior-study and migration cases. Preserve internal academic records unchanged and post approved outcomes to a separate immutable `student_course_credits` ledger. Credit corrections use audited reversals. Curriculum migration is an explicit evaluation type and changes the assigned program/curriculum only during final approval.

## Alternatives Considered

- Add all student types and conditions to one enum: rejected because the dimensions are independent and combinations are valid.
- Convert external grades into internal grades: rejected because source grading systems are not institutionally equivalent and would contaminate GPA.
- Directly reassign curriculum and compute mappings later: rejected because impact, authorization, and audit evidence would be lost.
- Build separate transfer, shifting, second-degree, and migration tables: rejected because the review and credit-posting rules are the same.

## Consequences

### Positive

- One permissioned workflow, history model, and UI serves four case types.
- Credits can satisfy prerequisites and completion without changing institutional GPA.
- Migration approval is atomic, explicit, previewable, and auditable.
- Academic plan and graduation audit consume one consistent completion model.

### Negative

- Evaluation and audit screens depend on properly configured curricula and elective groups.
- Institutional equivalency thresholds remain policy decisions outside the software.
- Review queues require Dean/Program Head accounts to be linked to faculty departments.

## Related Notes

- [[Academic Exceptions]]
- [[Enrollment]]
- [[Database Overview]]
- [[User Roles]]
