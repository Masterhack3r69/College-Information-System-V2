# Faculty Linkage Analysis Report

This analysis examines how Faculty (Teacher) accounts are linked to specific classes, sections, and students in the College Information System (CIS) V2 codebase.

---

## 1. Executive Summary
* **Account Association**: Faculty accounts are represented by the `Faculty` entity and are linked unidirectionally to authentication user accounts (`User`) via a unique `@OneToOne` association (`users.faculty_id`).
* **Class & Section Mapping**: Faculty members are assigned to classes/sections through the `ClassSchedule` entity (`class_schedules` table), which links a `Course` (class subject), a `Section` (student cohort), and a `Faculty` member for a given `SchoolYear` and `Semester`.
* **Student Association**: Students (`Student`) are linked to a `Faculty` member dynamically through their active `Enrollment` and `EnrollmentSubject` records. A student is associated with a faculty member if they are actively enrolled in an `EnrollmentSubject` tied to a `ClassSchedule` taught by that faculty member.
* **Direct Record Tracking**: Faculty members are also directly stored in historical record tables: `Grade` and `AcademicRecord` entities capture the teaching/grading `faculty_id` at the time of grade encoding.

---

## 2. Entity & Database Mapping Reference

### A. Faculty & User Account Linkage
A security principal is authenticated as a `User`. The user is linked to a faculty member via `faculty_id`.

#### Java Entity Definition (Snippet from `User.java`)
```java
@Entity
@Table(name = "users")
public class User extends AuditableEntity {
    // ...
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "faculty_id", unique = true)
    private Faculty faculty;
    // ...
}
```

#### SQL Schema (From `V7__grade_recording_and_academic_records.sql` and `V13__user_account_relationship_constraints.sql`)
```sql
ALTER TABLE users ADD COLUMN faculty_id UUID REFERENCES faculty(id);
CREATE INDEX idx_users_faculty_id ON users(faculty_id);

CREATE UNIQUE INDEX uq_users_faculty_id
    ON users(faculty_id)
    WHERE faculty_id IS NOT NULL;
```
*Note: The unique filtered index enforces that a faculty member can only be linked to a single user account.*

#### Security Context Verification (`SisUserDetails.java`)
```java
public class SisUserDetails implements UserDetails {
    private final User user;
    // ...
    public UUID facultyId() {
        return user.getFaculty() == null ? null : user.getFaculty().getId();
    }
}
```

---

### B. Class & Section Linkage
A class offering is defined by a `ClassSchedule`. It associates a section of students with a specific course and a faculty member.

#### Java Entity Definition (`ClassSchedule.java`)
```java
@Entity
@Table(name = "class_schedules")
public class ClassSchedule extends AuditableEntity {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faculty_id", nullable = false)
    private Faculty faculty;

    // ...
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleStatus status = ScheduleStatus.DRAFT;
}
```

#### SQL Schema (`V4__schedule_management.sql`)
```sql
CREATE TABLE class_schedules (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    faculty_id UUID NOT NULL REFERENCES faculty(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    school_year_id UUID NOT NULL REFERENCES school_years(id),
    semester_id UUID NOT NULL REFERENCES semesters(id),
    capacity INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    ...
);
CREATE INDEX idx_class_schedules_faculty_id ON class_schedules(faculty_id);
```

---

### C. Student Linkage
Students are linked to Faculty via their course enrollments. In V2, the direct `section_id` field has been dropped from the `students` table (see `V10` migration). Section association is now managed entirely through the student's active `Enrollment` record.

#### Relationship Pathway Diagram
```
[Student]
   ▲ (student_id)
   │
[Enrollment] (status = 'CONFIRMED')
   ▲ (enrollment_id)
   │
[EnrollmentSubject] (status = 'ENROLLED')
   │
   ▼ (class_schedule_id)
[ClassSchedule] (status = 'ACTIVE')
   │
   ▼ (faculty_id)
[Faculty]
```

#### Java Entity Definitions (`Enrollment.java` & `EnrollmentSubject.java`)
```java
// Enrollment.java
@Entity
@Table(name = "enrollments")
public class Enrollment extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    private Section section;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentStatus status = EnrollmentStatus.DRAFT;
}

// EnrollmentSubject.java
@Entity
@Table(name = "enrollment_subjects")
public class EnrollmentSubject extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_schedule_id", nullable = false)
    private ClassSchedule classSchedule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentSubjectStatus status = EnrollmentSubjectStatus.ENROLLED;
}
```

---

## 3. How to Check Assignments (Actionable Queries & Code)

### Check 1: Is a Faculty Member Assigned to a Specific Class Offering (ClassSchedule)?

#### Java (Logical Level Check)
```java
public boolean isFacultyAssignedToSchedule(ClassSchedule schedule, SisUserDetails userDetails) {
    if (userDetails == null || userDetails.facultyId() == null) {
        return false;
    }
    return userDetails.facultyId().equals(schedule.getFaculty().getId());
}
```

#### Spring Data JPA Repository Signature (`ClassScheduleRepository`)
```java
boolean existsByIdAndFacultyId(UUID scheduleId, UUID facultyId);
```

#### SQL Query
```sql
SELECT EXISTS (
    SELECT 1 FROM class_schedules
    WHERE id = :scheduleId 
      AND faculty_id = :facultyId
);
```

---

### Check 2: Is a Faculty Member Assigned to a Specific Class (Course + Section)?

#### Spring Data JPA Repository Signature (`ClassScheduleRepository`)
```java
boolean existsByCourseIdAndSectionIdAndFacultyIdAndStatus(
    UUID courseId, 
    UUID sectionId, 
    UUID facultyId, 
    ScheduleStatus status
);
```

#### SQL Query
```sql
SELECT EXISTS (
    SELECT 1 FROM class_schedules
    WHERE faculty_id = :facultyId 
      AND course_id = :courseId 
      AND section_id = :sectionId
      AND status = 'ACTIVE'
);
```

---

### Check 3: Is a Faculty Member Assigned to a Specific Student?

#### JPQL / Spring Data Query (`EnrollmentSubjectRepository`)
```java
@Query("""
    SELECT CASE WHEN COUNT(es) > 0 THEN true ELSE false END
    FROM EnrollmentSubject es
    JOIN es.enrollment e
    JOIN es.classSchedule cs
    WHERE e.student.id = :studentId
      AND cs.faculty.id = :facultyId
      AND es.status = com.school.sis.enrollment.entity.EnrollmentSubjectStatus.ENROLLED
      AND e.status = com.school.sis.enrollment.entity.EnrollmentStatus.CONFIRMED
      AND cs.status = com.school.sis.schedule.entity.ScheduleStatus.ACTIVE
""")
boolean isFacultyAssignedToStudent(@Param("facultyId") UUID facultyId, @Param("studentId") UUID studentId);
```

#### SQL Query
```sql
SELECT EXISTS (
    SELECT 1 
    FROM enrollment_subjects es
    JOIN enrollments e ON es.enrollment_id = e.id
    JOIN class_schedules cs ON es.class_schedule_id = cs.id
    WHERE e.student_id = :studentId
      **AND cs.faculty_id = :facultyId**
      AND es.status = 'ENROLLED'
      AND e.status = 'CONFIRMED'
      AND cs.status = 'ACTIVE'
);
```

#### Historical Grade Record Verification Query
Alternatively, a faculty member is historically linked to a student if they encoded grades or recorded academic results for them:
```sql
SELECT EXISTS (
    SELECT 1 FROM grades
    WHERE student_id = :studentId 
      AND faculty_id = :facultyId
);
```
