# Detailed Investigation Report: Academic Functions in College Information System (CIS) V2

This report maps the Controller, Service, Repository, and Database layers associated with the academic functions (primarily grading and gradebook management) in the Spring Boot Java codebase.

---

## 1. Summary of Findings
- **Academic Core**: The primary academic functions implemented are **Grading** and **Gradebook Management** (categories, items, scores, override remarks, and workflows).
- **Attendance**: No attendance function (e.g., student attendance tracking per class session) exists in the current Java codebase. It is only referenced as a roadmap feature in `PROJECT_CONTEXT.md` ("Biometric attendance integration"). However, student attendance statuses for specific assessments can be recorded as `ABSENT` under the grading items score status.
- **Access Control Context**: The codebase employs method-level Spring Security (`@PreAuthorize`) and programmatic data-level validation checks (e.g., matching the logged-in user's `facultyId` against the class schedule's assigned faculty) to ensure faculty/teachers only access their assigned classes.

---

## 2. Grading & Gradebook Life Cycle
Grades and gradebooks transition through a series of workflow statuses:
1. **DRAFT**: Gradebook/Grades are initialized or returned for correction. Editable by the assigned faculty.
2. **ENCODED**: Individual scores/grades are saved or imported. Editable.
3. **SUBMITTED**: Assigned faculty submits grades for review. Read-only for faculty.
4. **RETURNED_FOR_CORRECTION**: Dean/Reviewer returns the submitted grades for correction with a reason. Status goes back to editable.
5. **APPROVED**: Dean/Reviewer approves the gradebook/grades.
6. **LOCKED**: Registrar locks the grades, making them final. At this stage, records are written into the `academic_records` table for student academic transcripts.

---

## 3. Layered Architecture Mapping

### A. Controller Layer (`com.school.sis.grade.controller`)

| Controller | Endpoint Path | HTTP Method | Authority/Permission Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GradeController` | `/api/v1/grades` | GET | `GRADE_APPROVE` | Retrieve list of grades based on search criteria |
| | `/api/v1/grades/class/{scheduleId}` | GET | `GRADE_ENCODE` OR `GRADE_APPROVE` | Retrieve grades for a specific class schedule |
| | `/api/v1/grades/class/{scheduleId}/encode` | POST | `GRADE_ENCODE` | Encode/save final grades for a class schedule |
| | `/api/v1/grades/class/{scheduleId}/submit` | POST | `GRADE_ENCODE` | Submit encoded grades for review |
| | `/api/v1/grades/class/{scheduleId}/approve` | POST | `GRADE_APPROVE` | Approve submitted grades |
| | `/api/v1/grades/class/{scheduleId}/lock` | POST | `GRADE_APPROVE` | Lock approved grades and generate academic records |
| | `/api/v1/grades/student/{studentId}` | GET | `STUDENT_VIEW` | Retrieve all grades for a specific student |
| `GradebookController` | `/api/v1/gradebooks/classes` | GET | `GRADE_ENCODE`/`REVIEW`/`LOCK`/`APPROVE` | List summary of class gradebooks (can filter by `MY` scope) |
| | `/api/v1/gradebooks/class/{scheduleId}` | GET | Same as above | Retrieve gradebook details and calculated student totals |
| | `/api/v1/gradebooks/class/{scheduleId}/initialize` | POST | `GRADE_ENCODE` | Initialize gradebook using a grading template |
| | `/api/v1/gradebooks/class/{scheduleId}/items` | POST | `GRADE_ENCODE` | Create a new assessment item (e.g., exam, quiz) |
| | `/api/v1/gradebooks/class/{scheduleId}/items/{id}` | PUT | `GRADE_ENCODE` | Update an existing assessment item |
| | `/api/v1/gradebooks/class/{scheduleId}/items/{id}` | DELETE | `GRADE_ENCODE` | Archive/delete an assessment item |
| | `/api/v1/gradebooks/class/{scheduleId}/scores` | PUT | `GRADE_ENCODE` | Save individual student scores for assessment items |
| | `/api/v1/gradebooks/class/{scheduleId}/overrides` | PUT | `GRADE_ENCODE` | Record a non-numeric override (e.g., `INCOMPLETE`, `DROPPED`) |
| | `/api/v1/gradebooks/class/{scheduleId}/overrides/{subjectId}` | DELETE | `GRADE_ENCODE` | Remove a non-numeric grade override |
| | `/api/v1/gradebooks/class/{scheduleId}/submit` | POST | `GRADE_ENCODE` | Submit the gradebook calculations to official grades |
| | `/api/v1/gradebooks/class/{scheduleId}/return` | POST | `GRADE_REVIEW` | Return a submitted gradebook for correction |
| | `/api/v1/gradebooks/class/{scheduleId}/approve` | POST | `GRADE_REVIEW` | Approve a submitted gradebook |
| | `/api/v1/gradebooks/class/{scheduleId}/lock` | POST | `GRADE_LOCK` | Lock an approved gradebook |
| `GradingSetupController` | `/api/v1/grading-setup/scales` | GET | `ACADEMIC_SETUP_VIEW` | List all grading scales |
| | `/api/v1/grading-setup/scales/{id}` | GET | `ACADEMIC_SETUP_VIEW` | Get a specific grading scale |
| | `/api/v1/grading-setup/scales` | POST | `ACADEMIC_SETUP_MANAGE` | Create a new grading scale |
| | `/api/v1/grading-setup/scales/{id}` | PUT | `ACADEMIC_SETUP_MANAGE` | Update a grading scale |
| | `/api/v1/grading-setup/templates` | GET | `ACADEMIC_SETUP_VIEW` | List all grading templates (can filter by program/course) |
| | `/api/v1/grading-setup/templates/{id}` | GET | `ACADEMIC_SETUP_VIEW` | Get a specific grading template |
| | `/api/v1/grading-setup/templates` | POST | `ACADEMIC_SETUP_MANAGE` | Create a grading template |
| | `/api/v1/grading-setup/templates/{id}` | PUT | `ACADEMIC_SETUP_MANAGE` | Update a grading template |

---

### B. Service Layer (`com.school.sis.grade.service`)

#### 1. `GradebookService`
Manages granular gradebook operations (calculates student totals based on weighted categories and scores, archives items, validates completion, and routes status changes).
- **Core Access Checks**:
  - `allowedScope(scope, schedule, principal)`: If `scope` is `"MY"`, it ensures the logged-in user has `principal.facultyId()` equal to the schedule's assigned faculty ID. For review/approve, checks department alignment.
  - `ensureFaculty(schedule, principal)`: Checks if user has `GRADE_APPROVE` or `ROLE_SUPER_ADMIN`; otherwise, validates user has `GRADE_ENCODE` and their `facultyId` matches `schedule.faculty.id`.
  - `ensureReviewer(schedule, principal)`: Enforces that the reviewer can only approve/return gradebooks belonging to their department.
- **Main Actions**:
  - `initialize(scheduleId, templateId, principal)`: Instantiates a `ClassGradebook` and inserts categories based on the `GradingTemplate`.
  - `saveScores(scheduleId, scoresRequest, principal)`: Saves score entries. Statuses include `SCORED`, `ABSENT` (translates to 0), and `PENDING`.
  - `calculate(...)`: Computes midterm and final weights, calculates total percentages, and maps them to a grade point scale or remark from the associated `GradingScale`.

#### 2. `GradeService`
Handles final course grades submission, encoding, approval, and locking.
- **Main Actions**:
  - `encode(...)`: Directly encodes final grades (numeric `1.00` to `5.00` in `0.25` increments) or non-numeric remarks.
  - `lock(...)`: Locks approved grades and calls `upsertAcademicRecord(...)` to push locked grades to permanent student records.
  - `upsertAcademicRecord(grade)`: Creates/updates an `AcademicRecord` capturing final grades, earned credit units, and locking metadata.

#### 3. `GradingSetupService`
Manages templates and scale setups. Prevents modification of scales/templates that are already in use by any `ClassGradebook` (throws `BusinessRuleException` for immutability).

---

### C. Repository Layer (`com.school.sis.grade.repository`)

The entities and matching repositories manage database persistence:
- `AcademicRecordRepository` (interface mapping `AcademicRecord` entity):
  - Used to find transcripts: `findByStudentIdOrderBySchoolYearSchoolYearAscSemesterSortOrderAscCourseCodeAsc(...)`
  - Checks course passing status: `existsByStudentIdAndCourseIdAndGradeStatusAndRemarksIn(...)`
- `ClassGradebookRepository` (interface mapping `ClassGradebook` entity):
  - Fetches by schedule: `findByScheduleId(UUID scheduleId)`
  - Check template usage: `existsByTemplateId(UUID id)`
  - Check scale usage: `existsByScaleId(UUID id)`
- `ClassGradebookCategoryRepository` (interface mapping `ClassGradebookCategory` entity):
  - `findByGradebookIdOrderByPeriodAscSortOrderAsc(UUID gradebookId)`
- `GradeAssessmentItemRepository` (interface mapping `GradeAssessmentItem` entity):
  - `findByGradebookIdAndArchivedFalseOrderBySortOrderAsc(UUID gradebookId)`
- `GradeRepository` (interface mapping `Grade` entity):
  - `findByEnrollmentSubjectIdIn(...)`
  - `findByEnrollmentSubjectClassScheduleIdOrderByStudentLastNameAscStudentFirstNameAsc(...)`
  - `findByStudentIdOrderBySchoolYearSchoolYearAscSemesterSortOrderAscCourseCourseCodeAsc(...)`
- `GradeResultOverrideRepository` (interface mapping `GradeResultOverride` entity):
  - `findByGradebookIdAndEnrollmentSubjectId(UUID gradebookId, UUID enrollmentSubjectId)`
- `GradeScoreRepository` (interface mapping `GradeScore` entity):
  - `findByItemIdAndEnrollmentSubjectId(...)`
  - `findByItemGradebookId(...)`
- `GradeStatusHistoryRepository` (interface mapping `GradeStatusHistory` entity)
- `GradebookStatusHistoryRepository` (interface mapping `GradebookStatusHistory` entity)
- `GradingScaleRepository` (interface mapping `GradingScale` entity)
- `GradingTemplateRepository` (interface mapping `GradingTemplate` entity)

---

## 4. Associated Database Tables (Flyway Migration Mappings)

### A. V7 Migration Table Schema
- **`grades`**: Holds class-level final grades per student.
  - Foreign keys: `enrollment_subject_id`, `student_id`, `course_id`, `section_id`, `faculty_id`, `school_year_id`, `semester_id`.
  - Check constraints: `final_grade` range between `1.00` and `5.00`.
- **`grade_status_history`**: History log of grade statuses (`DRAFT`, `ENCODED`, `SUBMITTED`, etc.).
- **`academic_records`**: Student transcript records. Created/updated only when grades are `LOCKED`.

### B. V12 Migration Table Schema
- **`grading_scales`**: Mapped to scales (e.g., default university scale).
- **`grading_scale_bands`**: Specific percentage ranges corresponding to grade points (e.g., 95.00% to 100.00% = `1.00`).
- **`grading_templates`**: Templates defining midterm/final period weights.
- **`grading_template_categories`**: Defines category weights within a template (e.g., Quizzes = 30%, Exams = 40%).
- **`class_gradebooks`**: Instantiated gradebook for a specific class schedule.
- **`class_gradebook_categories`**: Instantiated categories for a class gradebook.
- **`grade_assessment_items`**: Actual assessments (quizzes, assignments, exams) created under a category.
- **`grade_scores`**: Holds scores for each student for each assessment item. Statuses: `PENDING`, `SCORED`, `EXCUSED`, `ABSENT`.
- **`grade_result_overrides`**: Allows non-numeric overrides (like `INCOMPLETE`, `DROPPED`) on calculated grades.
- **`gradebook_status_history`**: Audits gradebook workflow states.

---

## 5. Security & Authorization Matrix

| User Role | Assigned Authorities | Grade-Related Capabilities |
| :--- | :--- | :--- |
| **FACULTY** | `GRADE_ENCODE`, `ACADEMIC_SETUP_VIEW` | - Initialize gradebooks<br>- Manage assessment items<br>- Record/submit scores & overrides<br>- Encode and submit final class grades |
| **DEAN** | `GRADE_REVIEW`, `ACADEMIC_SETUP_VIEW` | - View class gradebooks in their department<br>- Approve gradebooks & final grades<br>- Return gradebooks & final grades for correction |
| **REGISTRAR** | `GRADE_LOCK`, `ACADEMIC_SETUP_VIEW`, `ACADEMIC_SETUP_MANAGE` | - Lock approved gradebooks & final grades<br>- Creates permanent `academic_records` |
| **SUPER_ADMIN** | All Authorities | - Can view, encode, approve, return, and lock any grade or gradebook |
