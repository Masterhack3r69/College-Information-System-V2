# Student Enrollment Migration Forensic Handoff

## 1. Observation
- Checked the database tables using `docker compose exec -T postgres psql -U sis_user -d sis_db -c "\dt"`. Table `students` was found along with academic and enrollment history tables.
- Count of migrated student records using the SQL query:
  `SELECT COUNT(*) FROM students WHERE student_number LIKE '2026-MIG-%';`
  Result:
  ```
   count 
  -------
      19
  (1 row)
  ```
- Year level distribution check using the SQL query:
  `SELECT year_level, COUNT(*) FROM students WHERE student_number LIKE '2026-MIG-%' GROUP BY year_level ORDER BY year_level;`
  Result:
  ```
   year_level | count 
  ------------+-------
            1 |     4
            2 |     5
            3 |     5
            4 |     5
  (4 rows)
  ```
- Checked individual migrated student profile statuses:
  `SELECT student_number, status, year_level FROM students WHERE student_number LIKE '2026-MIG-%' ORDER BY student_number;`
  Result: All 19 students show a status of `ENROLLED`.
- Verified student background completeness (contacts, educational backgrounds, and family backgrounds):
  `SELECT COUNT(sc.student_id) as contact_count, COUNT(se.student_id) as edu_count, COUNT(sf.student_id) as family_count FROM students s LEFT JOIN student_contacts sc ON s.id = sc.student_id LEFT JOIN student_educational_backgrounds se ON s.id = se.student_id LEFT JOIN student_family_backgrounds sf ON s.id = sf.student_id WHERE s.student_number LIKE '2026-MIG-%';`
  Result:
  ```
   contact_count | edu_count | family_count 
  ---------------+-----------+--------------
              19 |        19 |           19
  (1 row)
  ```
- Checked first semester enrollment confirmation status:
  `SELECT e.status, COUNT(*) FROM enrollments e JOIN students s ON e.student_id = s.id WHERE s.student_number LIKE '2026-MIG-%' AND e.school_year_id = '4ea67fb8-384d-41b4-9e0a-06eab3c90896' AND e.semester_id = '00000000-0000-0000-0000-000000000401' GROUP BY e.status;`
  Result:
  ```
    status   | count 
  -----------+-------
   CONFIRMED |    19
  (1 row)
  ```
- Checked enrollment subjects count per student:
  `SELECT s.student_number, COUNT(es.id) as subjects_count FROM students s JOIN enrollments e ON s.id = e.student_id JOIN enrollment_subjects es ON e.id = es.enrollment_id WHERE s.student_number LIKE '2026-MIG-%' AND e.school_year_id = '4ea67fb8-384d-41b4-9e0a-06eab3c90896' AND e.semester_id = '00000000-0000-0000-0000-000000000401' GROUP BY s.student_number ORDER BY s.student_number;`
  Result:
  - 4 Year 1 students: 8 subjects each.
  - 5 Year 2 students: 8 subjects each.
  - 5 Year 3 students: 7 subjects each.
  - 5 Year 4 students: 6 subjects each.
- Verified generated fee assessments:
  `SELECT s.student_number, a.id as assessment_id, a.total_assessment, a.balance FROM students s JOIN assessments a ON s.id = a.student_id WHERE s.student_number LIKE '2026-MIG-%' AND a.school_year_id = '4ea67fb8-384d-41b4-9e0a-06eab3c90896' AND a.semester_id = '00000000-0000-0000-0000-000000000401' ORDER BY s.student_number;`
  Result: All 19 students have non-null assessments matching tuition units + lab fees + registration fees + miscellaneous water fee (tuition units are: Year 1: 23, Year 2: 22, Year 3: 20, Year 4: 18).
- Reviewed migration script `c:\Users\PC\Projects\cis\enroll_students.py` and found standard REST API endpoint integrations (login, sections, schedules, student profiles, draft enrollment, add subjects, confirm enrollment, and generate fee assessment) and SQL seeds for historical upperclassmen grades. No hardcoding or dummy implementations are present.
- Executed `mvn test` on the project host: All 51 tests ran, resulting in 50 successes and 1 skipped test (0 failures/errors).

## 2. Logic Chain
- Exact record counting (19 records) confirms that no records were missing or duplicated during the migration process.
- The year level count query groupings confirm the distribution is exactly `4, 5, 5, 5` matching the target configuration.
- The join query with contact and background tables confirms that the migration script didn't just create basic user records but populated the complete profile (personal, emergency contacts, parents' information, and high school academic history).
- The join query with enrollments and assessments tables confirms that all 19 students have progressed through the complete registration and billing process (status `CONFIRMED` on active term, enrolled in appropriate subjects, with a generated fee assessment matching their unit/lab counts).
- Analyzing the python script code confirms it calls the actual backend REST endpoints to insert students, sections, and class schedules, and to confirm active term registrations. Seeding prior history via psql is necessary as there are no retroactive REST endpoints for grade encoding in closed semesters. This validates that the implementation is genuine and has no bypass integrity issues.

## 3. Caveats
- Seeding of prior grade history for upperclassmen was done directly via PostgreSQL CLI since REST endpoints are closed for previous semesters. This direct DB insertion bypasses service-level validators but was necessary for historical context and has been verified as structurally consistent with JPA constraints.

## 4. Conclusion
- The Student Enrollment Migration work product is clean of any integrity violations, facade implementations, or hardcoded test results. The 19 migrated records are fully verified in the PostgreSQL database and correctly associated with active semester schedules and billing records.

## 5. Verification Method
- Execute the following query on the postgres container to check migrated student records count:
  `docker compose exec -T postgres psql -U sis_user -d sis_db -c "SELECT COUNT(*) FROM students WHERE student_number LIKE '2026-MIG-%';"`
- Execute the following query to check year level distribution:
  `docker compose exec -T postgres psql -U sis_user -d sis_db -c "SELECT year_level, COUNT(*) FROM students WHERE student_number LIKE '2026-MIG-%' GROUP BY year_level ORDER BY year_level;"`
- Run the maven backend test suite:
  `mvn test`
