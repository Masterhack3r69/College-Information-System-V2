# Handoff Report — Explorer 1

This handoff outlines the schema analysis and Spring Boot Java entity mappings that determine how Faculty accounts are linked to classes, sections, and students.

---

## 1. Observation
I have directly observed the following configurations in the codebase:

### User & Faculty Linkage
* **User Entity File**: `src/main/java/com/school/sis/auth/entity/User.java` (lines 42-44):
  ```java
  @OneToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "faculty_id", unique = true)
  private Faculty faculty;
  ```
* **Security Details Helper File**: `src/main/java/com/school/sis/auth/security/SisUserDetails.java` (lines 32-34):
  ```java
  public UUID facultyId() {
      return user.getFaculty() == null ? null : user.getFaculty().getId();
  }
  ```
* **Unique Relationship Constraints Migration File**: `src/main/resources/db/migration/V13__user_account_relationship_constraints.sql` (lines 1-3):
  ```sql
  CREATE UNIQUE INDEX uq_users_faculty_id
      ON users(faculty_id)
      WHERE faculty_id IS NOT NULL;
  ```

### Class/Section Linkage via Schedules
* **Class Schedule Entity File**: `src/main/java/com/school/sis/schedule/entity/ClassSchedule.java` (lines 33-43):
  ```java
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "section_id", nullable = false)
  private Section section;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "faculty_id", nullable = false)
  private Faculty faculty;
  ```

### Student & Class Mappings
* **Enrollment Subject Entity File**: `src/main/java/com/school/sis/enrollment/entity/EnrollmentSubject.java` (lines 25-31):
  ```java
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "enrollment_id", nullable = false)
  private Enrollment enrollment;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "class_schedule_id", nullable = false)
  private ClassSchedule classSchedule;
  ```
* **Enrollment Entity File**: `src/main/java/com/school/sis/enrollment/entity/Enrollment.java` (lines 32-34):
  ```java
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;
  ```
* **Normalization Migration File**: `src/main/resources/db/migration/V10__normalize_sections_enrollment_and_scheduling.sql` (lines 54-57):
  ```sql
  ALTER TABLE students DROP CONSTRAINT IF EXISTS students_section_id_fkey;
  DROP INDEX IF EXISTS idx_students_section_id;
  ALTER TABLE students DROP COLUMN IF EXISTS section_id;
  ```

### Direct Historical Grade Linkage
* **Grade Entity File**: `src/main/java/com/school/sis/grade/entity/Grade.java` (lines 38-52):
  ```java
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "course_id", nullable = false)
  private Course course;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "section_id", nullable = false)
  private Section section;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "faculty_id", nullable = false)
  private Faculty faculty;
  ```

---

## 2. Logic Chain
Based on the observations:
1. **User Identity Resolution**: A logged-in user is authenticated via security context (`SisUserDetails`). It contains the `facultyId()` derived from `User.faculty` (using mapping in `User.java`). This establishes a mapping between the authenticated account and a `Faculty` database record.
2. **Scheduled Class Assignment**: Class assignments are recorded in `ClassSchedule` (`class_schedules` table). Each schedule has a foreign key to `Faculty` (`faculty_id`). Thus, checking class assignment translates to confirming whether there is an active `ClassSchedule` matching a specific `facultyId` (and optionally, the target `courseId`/`sectionId`).
3. **Dropped Section-Student Direct Foreign Key**: In migration `V10`, the `section_id` column was dropped from the `students` table.
4. **Student Enrollment Resolution**: Because students are no longer directly mapped to a section, their relation to classes and teachers is resolved transitively. They register for courses through `EnrollmentSubject` records. `EnrollmentSubject` references `Enrollment`, which references the `Student` (as seen in `EnrollmentSubject.java` and `Enrollment.java`).
5. **Dynamic Student-Faculty Relation**: Consequently, a student is currently linked to a faculty member if they have an active `EnrollmentSubject` (status = `ENROLLED`) inside a confirmed `Enrollment` (status = `CONFIRMED`) that points to a `ClassSchedule` taught by that faculty member (`faculty_id = :facultyId`).

---

## 3. Caveats
* **Co-advising**: The model assumes exactly one faculty member is assigned to a `ClassSchedule` (as the foreign key `faculty_id` is NOT NULL in `class_schedules`). There is no provision for multiple teachers or co-instructors per class schedule.
* **Archived / Historical Records**: A student might be historically linked to a teacher via the `grades` table, even if their active class schedules are not currently connected.
* **Section-level association**: A teacher is not directly assigned to an entire section, but rather to individual course schedules in that section. Section-wide advising (if it exists) is not represented in the DB schema.

---

## 4. Conclusion
* **Account-Faculty Link**: Unidirectional `@OneToOne` `User` -> `Faculty` mapping via `users.faculty_id`.
* **Faculty-Class Check**: Verified by looking up a matching `ClassSchedule` where `faculty_id = :facultyId`.
* **Faculty-Student Check**: Verified dynamically via the pathway: `Student` -> `Enrollment` -> `EnrollmentSubject` -> `ClassSchedule` -> `Faculty`.
* The logic checks are codified in `analysis.md` and are verified by checking existence queries on the database tables or using custom JPQL queries in Spring Data Repositories.

---

## 5. Verification Method
To verify the analysis findings:
1. Inspect the entity Java source files (`User.java`, `Faculty.java`, `ClassSchedule.java`, `EnrollmentSubject.java`, `Enrollment.java`, `Grade.java`, `AcademicRecord.java`).
2. Run database migration tests to ensure the tables compile with standard postgres schema:
   `mvn test -Dtest=PostgresMigrationTests` or standard Spring tests:
   `mvn test -Dtest=SisApplicationTests`
3. Run the GradeService unit test suite which verifies faculty scope validation (`Faculty can only manage assigned classes`):
   `mvn test -Dtest=GradeServiceTests`
