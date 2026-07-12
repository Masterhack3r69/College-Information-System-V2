# College Information System - Student Enrollment Schema & API Mapping Analysis

This report analyzes the database schema, Java backend endpoints, and React frontend code of the College Information System (CIS) to determine the exact fields, relationships, and validation rules required to successfully enroll a student into their first semester (Year 1, Semester 1).

---

## 1. Required Database Tables, Fields, and Relationships

The following tables form the core structure for student profiles, academic configuration, enrollment registration, and financial assessments. 

### A. Student Profile Tables

#### i. `students` (Core student profile)
* Tracks the identity, status, program, and curriculum of a student.
* **Note:** The `section_id` and `semester` columns were dropped in migration `V10` to avoid redundant layout; students are now sectioned and registered through enrollments.

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NOT NULL** (PK) | Generated automatically (UUIDv4) if not provided. |
| `student_number` | `VARCHAR(60)` | **NOT NULL** (Unique) | Must be unique across all students (case-insensitive check). |
| `first_name` | `TEXT` | **NOT NULL** | Student's given name. |
| `middle_name` | `TEXT` | Optional | Student's middle name. |
| `last_name` | `TEXT` | **NOT NULL** | Student's family name. |
| `suffix` | `TEXT` | Optional | E.g., Jr., III, etc. |
| `gender` | `VARCHAR(20)` | Optional | Mapped to `Gender` enum (`MALE`, `FEMALE`, `OTHER`). |
| `birthdate` | `DATE` | **NOT NULL** | Student's date of birth. |
| `birthplace` | `TEXT` | Optional | Birth town/city. |
| `civil_status` | `VARCHAR(40)` | Optional | E.g., `SINGLE`, `MARRIED`. |
| `nationality` | `VARCHAR(80)` | Optional | E.g., `Filipino`. |
| `religion` | `VARCHAR(80)` | Optional | E.g., `Roman Catholic`. |
| `profile_photo_path`| `TEXT` | Optional | Location path of uploaded photo. |
| `status` | `VARCHAR(40)` | **NOT NULL** | Mapped to `StudentStatus` enum. Initial is `APPLICANT`. |
| `program_id` | `UUID` | **NOT NULL** (FK) | References `programs(id)`. |
| `curriculum_id` | `UUID` | **NOT NULL** (FK) | References `curricula(id)`. |
| `year_level` | `INTEGER` | **NOT NULL** | Must be `> 0` (starts at `1` for new students). |
| `date_admitted` | `DATE` | **NOT NULL** | Date when student was admitted. |
| `school_year_admitted`| `VARCHAR(20)` | **NOT NULL** | E.g., `"2026-2027"`. |
| `classification` | `VARCHAR(40)` | Optional | Mapped to `StudentClassification` enum. |
| `academic_status` | `VARCHAR(40)` | Optional | Mapped to `AcademicStatus` enum. |

#### ii. `student_contacts` (Contact & address details)
* One-to-one relationship with `students(id)`.
* **Important:** Regional/provincial address fields were normalized with explicit `current_` and `permanent_` prefixes in migration `V10` to support granular location selectors.

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `student_id` | `UUID` | **NOT NULL** (PK/FK) | References `students(id)` ON DELETE CASCADE. |
| `mobile_number` | `VARCHAR(40)` | Optional | Mobile phone number. |
| `telephone_number` | `VARCHAR(40)` | Optional | Landline phone number. |
| `email_address` | `VARCHAR(120)` | Optional (Unique) | Unique constraint applied; validated with email format regex. |
| `current_address` | `TEXT` | Optional | Street details of current address. |
| `permanent_address` | `TEXT` | Optional | Street details of permanent address. |
| `current_region_code` / `_name` | `VARCHAR(20)` / `TEXT` | Optional | PSGC Region Code / Name. |
| `current_province_code` / `_name`| `VARCHAR(20)` / `TEXT` | Optional | PSGC Province Code / Name. |
| `current_city_municipality_code` / `_name` | `VARCHAR(20)` / `TEXT` | Optional | PSGC City/Municipality Code / Name. |
| `current_barangay_code` / `_name`| `VARCHAR(20)` / `TEXT` | Optional | PSGC Barangay Code / Name. |
| `current_zip_code` | `VARCHAR(20)` | Optional | Current address postal code. |
| `permanent_region_code` / `_name`| `VARCHAR(20)` / `TEXT` | Optional | Permanent Region Code / Name. |
| `permanent_province_code` / `_name`| `VARCHAR(20)` / `TEXT` | Optional | Permanent Province Code / Name. |
| `permanent_city_municipality_code` / `_name` | `VARCHAR(20)` / `TEXT` | Optional | Permanent City/Municipality Code / Name. |
| `permanent_barangay_code` / `_name`| `VARCHAR(20)` / `TEXT` | Optional | Permanent Barangay Code / Name. |
| `permanent_zip_code` | `VARCHAR(20)` | Optional | Permanent address postal code. |
| `emergency_contact_name` | `TEXT` | Optional | Emergency contact full name. |
| `emergency_contact_number` | `VARCHAR(40)` | Optional | Phone number for emergency contact. |
| `emergency_contact_relationship` | `TEXT` | Optional | Relationship to student. |
| `emergency_contact_address` | `TEXT` | Optional | Address of emergency contact. |

#### iii. `student_family_backgrounds` (Family details)
* One-to-one relationship with `students(id)`. All fields are optional.

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `student_id` | `UUID` | **NOT NULL** (PK/FK) | References `students(id)` ON DELETE CASCADE. |
| `father_name` / `_occupation` / `_contact_number` | `TEXT`/`TEXT`/`VARCHAR(40)` | Optional | Father details. |
| `mother_name` / `_occupation` / `_contact_number` | `TEXT`/`TEXT`/`VARCHAR(40)` | Optional | Mother details. |
| `guardian_name` / `_relationship` / `_contact_number` / `_address` | `TEXT`/`TEXT`/`VARCHAR(40)`/`TEXT` | Optional | Guardian details. |
| `household_income_range` | `TEXT` | Optional | Household income range category. |

#### iv. `student_educational_backgrounds` (Academic history)
* One-to-one relationship with `students(id)`.

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `student_id` | `UUID` | **NOT NULL** (PK/FK) | References `students(id)` ON DELETE CASCADE. |
| `elementary_school_name` / `_address` / `_year_graduated` | `TEXT`/`TEXT`/`INTEGER` | Optional | Elementary school records. |
| `junior_high_school_name` / `_address` / `_year_graduated` | `TEXT`/`TEXT`/`INTEGER` | Optional | Junior high school records. |
| `senior_high_school_name` / `_address` / `_strand` / `_year_graduated` | `TEXT`/`TEXT`/`TEXT`/`INTEGER` | Optional | Senior high school records. |
| `previous_college` / `_program` / `_school_year_attended` | `TEXT`/`TEXT`/`TEXT` | Optional | Transferee background records. |
| `admission_type` | `VARCHAR(40)` | Optional | Mapped to `AdmissionType` enum (`NEW_STUDENT`, `TRANSFEREE`, `RETURNEE`, etc.). |

---

### B. Academic Configuration Tables

To enroll a student, these tables must already contain configuration records for the given term:
1. **`programs`**: The active curriculum degree program (e.g., BSCS) to which the student is assigned.
2. **`curricula`**: The curriculum checklist defining which courses are required for each semester.
3. **`school_years` & `semesters`**: Represents the current enrollment term (must have `active = true` status).
4. **`sections`**: Assigned class section for the enrollment term. Has a FK to `curricula(id)` (added in `V10`).
5. **`class_schedules` & `schedule_meetings`**: Represents scheduled subjects (courses) tied to sections, rooms, faculties, days, and times.

---

### C. Enrollment & Course Registration Tables

#### i. `enrollments` (Enrollment header)
* Tracks the student's enrollment status for a particular term (school year and semester).
* Unique constraint: `student_id` + `school_year_id` + `semester_id` must be unique for all non-cancelled enrollments.

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NOT NULL** (PK) | Generated automatically (UUIDv4). |
| `student_id` | `UUID` | **NOT NULL** (FK) | References `students(id)`. |
| `program_id` | `UUID` | **NOT NULL** (FK) | References `programs(id)` (copied from student's program). |
| `section_id` | `UUID` | Optional (FK) | References `sections(id)`. Required for Regular students; optional for Irregulars/Cross-enrollees (where a `MIXED` section is resolved). |
| `school_year_id` | `UUID` | **NOT NULL** (FK) | References `school_years(id)`. |
| `semester_id` | `UUID` | **NOT NULL** (FK) | References `semesters(id)`. |
| `year_level` | `INTEGER` | **NOT NULL** | Copied from student's current year level. Must be `> 0` (starts at `1`). |
| `status` | `VARCHAR(20)` | **NOT NULL** | Defaults to `'DRAFT'`. Changes to `'CONFIRMED'` or `'CANCELLED'`. |
| `remarks` | `TEXT` | Optional | Registrar notes or cancellation reasons. |

#### ii. `enrollment_subjects` (Registered courses)
* Maps individual class schedules to the student's enrollment record.
* Unique constraint: Only one active registration per `enrollment_id` + `class_schedule_id` combination.

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NOT NULL** (PK) | Generated automatically (UUIDv4). |
| `enrollment_id` | `UUID` | **NOT NULL** (FK) | References `enrollments(id)` ON DELETE CASCADE. |
| `class_schedule_id`| `UUID` | **NOT NULL** (FK) | References `class_schedules(id)`. |
| `status` | `VARCHAR(20)` | **NOT NULL** | Defaults to `'ENROLLED'`. Changes to `'DROPPED'` if dropped. |
| `dropped_at` | `TIMESTAMPTZ` | Optional | Timestamp when subject was dropped. |

---

### D. Billing / Assessment Tables

Once confirmed, an enrollment goes through billing to generate fees.

#### i. `assessments`
* Stores the breakdown of tuition, lab, miscellaneous, and discount amounts for the enrollment.
* Unique constraint: `enrollment_id` is unique (1-to-1 mapping with enrollment).

| Field Name | Data Type | Nullability | Description / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NOT NULL** (PK) | Generated automatically (UUIDv4). |
| `student_id` | `UUID` | **NOT NULL** (FK) | References `students(id)`. |
| `enrollment_id` | `UUID` | **NOT NULL** (FK) | References `enrollments(id)`. |
| `school_year_id` | `UUID` | **NOT NULL** (FK) | References `school_years(id)`. |
| `semester_id` | `UUID` | **NOT NULL** (FK) | References `semesters(id)`. |
| `total_units` | `NUMERIC(8,2)` | **NOT NULL** | Total credits enrolled. |
| `total_assessment` | `NUMERIC(12,2)`| **NOT NULL** | Calculated sum of fees minus discounts plus penalties. |
| `amount_paid` | `NUMERIC(12,2)`| **NOT NULL** | Amount paid by cashier (starts at `0.00`). |
| `balance` | `NUMERIC(12,2)`| **NOT NULL** | Remaining balance (`total_assessment - amount_paid`). |
| `status` | `VARCHAR(20)` | **NOT NULL** | Defaults to `'UNPAID'`. Changes to `'PARTIALLY_PAID'`, `'PAID'`, etc. |

---

## 2. API Endpoints, Payloads, and Validation Rules

Successfully enrolling a student into the first semester involves a sequence of endpoints. Below are the precise routes, request bodies, and validation checks.

### Step 1: Create Student Profile
* **HTTP Route:** `POST /api/v1/students`
* **Controller:** `StudentController.java` (`create`)
* **Payload Format:** JSON (`StudentRequest`)

#### Request Body Structure
```json
{
  "personal": {
    "studentNumber": "2026-0001",
    "firstName": "John",
    "middleName": "Robert",
    "lastName": "Doe",
    "suffix": "",
    "gender": "MALE",
    "birthdate": "2007-06-15",
    "birthplace": "Manila",
    "civilStatus": "SINGLE",
    "nationality": "Filipino",
    "religion": "Roman Catholic",
    "status": "APPLICANT"
  },
  "academic": {
    "programId": "b8b809be-91c6-49cf-8cb8-724bc24987f1",
    "curriculumId": "a758d4a3-764f-4d2c-80a5-f8be140c83a5",
    "yearLevel": 1,
    "dateAdmitted": "2026-07-10",
    "schoolYearAdmitted": "2026-2027",
    "classification": "REGULAR",
    "academicStatus": "REGULAR"
  },
  "contact": {
    "mobileNumber": "09171234567",
    "telephoneNumber": "",
    "emailAddress": "john.doe@example.com",
    "currentAddress": "123 Mabini St",
    "currentRegionCode": "03",
    "currentRegionName": "Region III",
    "currentProvinceCode": "0314",
    "currentProvinceName": "Bulacan",
    "currentCityMunicipalityCode": "031410",
    "currentCityMunicipalityName": "Malolos",
    "currentBarangayCode": "031410001",
    "currentBarangayName": "San Vicente",
    "currentZipCode": "3000",
    "permanentAddress": "123 Mabini St",
    "permanentRegionCode": "03",
    "permanentRegionName": "Region III",
    "permanentProvinceCode": "0314",
    "permanentProvinceName": "Bulacan",
    "permanentCityMunicipalityCode": "031410",
    "permanentCityMunicipalityName": "Malolos",
    "permanentBarangayCode": "031410001",
    "permanentBarangayName": "San Vicente",
    "permanentZipCode": "3000",
    "emergencyContactName": "Mary Doe",
    "emergencyContactNumber": "09187654321",
    "emergencyContactRelationship": "Mother",
    "emergencyContactAddress": "123 Mabini St, Malolos, Bulacan"
  },
  "family": {
    "fatherName": "Richard Doe",
    "fatherOccupation": "Engineer",
    "fatherContactNumber": "09191112222",
    "motherName": "Mary Doe",
    "motherOccupation": "Teacher",
    "motherContactNumber": "09193334444",
    "guardianName": "",
    "guardianRelationship": "",
    "guardianContactNumber": "",
    "guardianAddress": "",
    "householdIncomeRange": "Php 50k - 100k"
  },
  "educational": {
    "elementarySchoolName": "Malolos Elementary School",
    "elementarySchoolAddress": "Malolos, Bulacan",
    "elementaryYearGraduated": 2019,
    "juniorHighSchoolName": "Malolos High School",
    "juniorHighSchoolAddress": "Malolos, Bulacan",
    "juniorHighSchoolYearGraduated": 2023,
    "seniorHighSchoolName": "Bulacan Science High School",
    "seniorHighSchoolAddress": "Malolos, Bulacan",
    "seniorHighSchoolStrand": "STEM",
    "seniorHighSchoolYearGraduated": 2025,
    "admissionType": "NEW_STUDENT"
  }
}
```

#### Key Validation Rules (Java & Zod)
1. **Uniqueness:**
   * `studentNumber` must be unique (case-insensitive database constraint check).
   * `contact.emailAddress` (if provided) must be unique.
2. **Nullable Fields Cleansed:**
   * React frontend handles sanitizing empty fields (converting empty string `""` values to `undefined` or `null`) using a `cleanData()` function before requesting.
3. **Program & Curriculum Constraints:**
   * Both `programId` and `curriculumId` must reference valid DB entries.
   * **Crucial Logic:** The backend checks `!curriculum.getProgram().getId().equals(program.getId())`. If the curriculum does not belong to the selected program, it throws `BusinessRuleException: Curriculum does not belong to the selected program`.

---

### Step 2: Create Draft Enrollment
* **HTTP Route:** `POST /api/v1/enrollments`
* **Controller:** `EnrollmentController.java` (`create`)
* **Payload Format:** JSON (`EnrollmentRequest`)

#### Request Body Structure
```json
{
  "studentId": "73c683b5-3162-4217-bc7e-fde4bb91e9bf",
  "schoolYearId": "d8e8f85c-15a0-4ff6-8c4d-2a819b168670",
  "semesterId": "c9284cf7-fb1d-40ba-85f0-67c4bb91c981",
  "yearLevel": 1,
  "sectionId": "f048dca2-b91c-43f1-b8b8-724bc24987a0",
  "remarks": ""
}
```

#### Key Validation Rules
1. **Term Matching:**
   * The `schoolYearId` and `semesterId` must match active administrative terms in the system.
2. **Duplicate Term Enrollment Prevention:**
   * Validates `existsByStudentIdAndSchoolYearIdAndSemesterIdAndStatusIn(studentId, schoolYearId, semesterId, [DRAFT, CONFIRMED])`. Students cannot have duplicate active enrollments in the same term.
3. **Section Restrictions based on Student Classification:**
   * **Regular Student:** `sectionId` is **REQUIRED**. Leaving it null throws `BusinessRuleException: Section is required for this student classification`.
   * **Irregular/Cross-Enrollee:** `sectionId` is optional. If null, the backend automatically generates/resolves a section with code: `MIXED-{programCode}-{yearLevel}` (e.g., `MIXED-BSCS-1`).
4. **Section Constraints (`validateSection`):**
   * Section status must be `ACTIVE`.
   * Section program must match the student's program.
   * Section term (school year and semester) must match the enrollment term.
   * **Curriculum Match:** The section's `curriculum_id` must match the student's `curriculum_id`.
   * Section year level must match the student's enrollment year level (`1` for the first semester).

---

### Step 3: Add Subjects / Schedules (Mainly for Irregular Students)
* Regular students get registered into their section's active schedules automatically on enrollment creation (see Section 3).
* Irregular students require adding schedules individually.
* **HTTP Route:** `POST /api/v1/enrollments/{enrollmentId}/subjects`
* **Payload Format:** JSON (`EnrollmentSubjectRequest`)

#### Request Body Structure
```json
{
  "scheduleId": "fa75b8a3-2c4f-4d2c-9ab5-25e4c2498901"
}
```

#### Key Validation Rules (`validateScheduleForEnrollment`)
1. **Schedule Status:** Must be `ACTIVE`.
2. **Term Agreement:** The schedule's school year and semester must match the enrollment's.
3. **Section Agreement:** If it's a regular section (non-mixed), the class schedule's section must match the enrollment's section.
4. **Program Agreement:** The section of the class schedule must belong to the student's program.
5. **Curriculum Verification:** The schedule's course must exist in the student's curriculum checklist for their current year level and semester.
6. **Class Capacity Check:** Enrolled headcount must be less than the schedule's `capacity`. Otherwise: `BusinessRuleException: Schedule has no available seats`.
7. **Schedule Time Overlap:** Checks for day/time collision against already selected subjects.

---

### Step 4: Validate and Confirm Enrollment
* **HTTP Route:** `POST /api/v1/enrollments/{enrollmentId}/confirm`

#### Key Validation Rules (`validateEnrollment` - executed prior to confirmation)
1. **Subjects Check:** Enrollment must contain at least one subject.
2. **Conflict Check:** Double-checks time overlaps and available seats for all courses in the checklist.
3. **Prerequisite Check:** (For first-semester students, this passes automatically since there are no prior semesters).
4. **Regular Course Compliance Check:**
   * For **REGULAR** students, the system aggregates all required courses for Year 1, Semester 1 from their curriculum checklist:
     ```java
     List<CurriculumCourse> required = curriculumCourseRepository.findByCurriculumId(...)
         .stream()
         .filter(cc -> cc.getYearLevel() == 1)
         .filter(cc -> normalize(cc.getSemester()).equals("FIRST_SEMESTER"))
     ```
   * It verifies that the student is registered in **ALL** of these courses. If any required course is missing from the subject list, it throws a validation issue block (`REQUIRED_COURSE_MISSING`).
5. **Confirmation Effects:**
   * Sets enrollment status to `CONFIRMED`.
   * Sets student's `yearLevel` to `1`.
   * Sets student's `status` to `ENROLLED` (transitioning them from `APPLICANT` or `ACTIVE`).

---

### Step 5: Billing / Fee Assessment
* **HTTP Route:** `POST /api/v1/enrollments/{enrollmentId}/generate-assessment`
* **Controller:** `AssessmentController.java` (`generate`)

#### Validation & Computation Rules
* Pulls active rules from `fee_rules` that match:
  * Current `school_year_id` and `semester_id`.
  * Student's `program_id`.
  * Student's `year_level` (`1`).
* Calculates total amounts based on:
  * **Flat rate fees** (e.g., Miscellaneous, Lab, Medical fees).
  * **Unit-based fees** (Tuition per credit unit multiplied by `total_units`).
* Saves `assessments` record as `UNPAID` (with computed balance) to let cashier register payments.

---

## 3. Curriculum, Sections, and Schedules Relationship

First-semester enrollment revolves around how **Curricula**, **Sections**, and **Schedules** interact. The entity relationships are mapped below:

```
[Program] <--- (1:N) --- [Curriculum]
   ^                         ^
   |                         |
 (1:N)                     (1:N)
   |                         |
[Section] <---- (1:1) --------+ (Assigned Curriculum)
   ^
   | (1:N)
[Class Schedule] <--- (1:N) --- [Schedule Meeting] (Day/Time details)
   | (1:1)
[Course] (Checklist subject)
```

### Regular Student Enrollment Relationship
For a regular first-semester student, the assignment of a Section dictates their entire first-semester load:

1. **Section Selection:** The administrator selects a section (e.g. `BSCS-1A`) that matches the student's program (BSCS), current year level (`1`), curriculum, and current term (active school year & semester).
2. **Automatic Course Registration:**
   Upon saving the enrollment, the backend searches for all class schedules linked to that section:
   ```sql
   SELECT * FROM class_schedules 
   WHERE section_id = :sectionId 
     AND school_year_id = :schoolYearId 
     AND semester_id = :semesterId 
     AND status = 'ACTIVE';
   ```
   For each schedule, it verifies if the course code is registered in the student's curriculum checklist for Year 1, Semester 1. If it matches, the student is registered automatically (`enrollment_subjects` entry created).
3. **Validation Enforcement:** Regular students cannot drop individual subjects or skip subjects assigned to their block section. Validation will block confirmation if any required curriculum course for Year 1, Semester 1 is missing.

### Irregular Student Enrollment Relationship
For irregular or transferees enrolling in the first semester:

1. **Flexible Sectioning:** If the section is left empty, the system allocates a placeholder section (e.g., `MIXED-BSCS-1`).
2. **Manual Course Selection:** The registrar selects individual active class schedules across different sections.
3. **Loose Validation:** The system does not enforce block section uniformity. It allows partial loads (warning messages only for non-registered required courses) but still enforces:
   * Class schedule capacity constraints.
   * Course-curriculum membership (schedules added must exist somewhere in the student's curriculum).
   * Day/time meeting conflicts.
