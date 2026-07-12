# Forensic Audit Report

**Work Product**: Student Enrollment Migration database records and migration script `enroll_students.py`.
**Profile**: General Project
**Verdict**: CLEAN

### Phase Results
- **Check 1: Migrated Student Count (19 Records)**: PASS — Queried the database and confirmed exactly 19 new student records exist with student numbers matching `2026-MIG-%`.
- **Check 2: Year Level Distribution (4, 5, 5, 5)**: PASS — Verified that the distribution is exactly 4 first-year (Year 1), 5 second-year (Year 2), 5 third-year (Year 3), and 5 fourth-year (Year 4) students.
- **Check 3: Migration Script Genuineness**: PASS — Reviewed `enroll_students.py`. The script is genuine, makes standard REST API calls to set up the enrollment lifecycle (login, check/create sections, schedules, student profiles, draft enrollment, add subjects, confirm enrollment, and generate fee assessment), and executes SQL queries directly to seed previous grade history for upperclassmen. It contains no hardcoded test outputs, facades, or mocked bypasses.
- **Check 4: Enrollment Completeness**: PASS — Verified that each of the 19 migrated students has:
  - An active student profile (status is `ENROLLED`).
  - A confirmed enrollment record for the current active semester (`2026-2027` 1st Semester, status is `CONFIRMED`).
  - Associated class schedules and subjects (Year 1: 8 subjects, Year 2: 8 subjects, Year 3: 7 subjects, Year 4: 6 subjects).
  - A generated fee assessment record detailing tuition, laboratory, registration, and miscellaneous fees (totals: Year 1: 12,300.00 PHP, Year 2: 15,300.00 PHP, Year 3: 15,500.00 PHP, Year 4: 10,300.00 PHP).

---

### Evidence

#### 1. Student Count Verification Query
```
postgres=# SELECT COUNT(*) FROM students WHERE student_number LIKE '2026-MIG-%';
 count 
-------
    19
(1 row)
```

#### 2. Year Level Distribution Query
```
postgres=# SELECT year_level, COUNT(*) FROM students WHERE student_number LIKE '2026-MIG-%' GROUP BY year_level ORDER BY year_level;
 year_level | count 
------------+-------
          1 |     4
          2 |     5
          3 |     5
          4 |     5
(4 rows)
```

#### 3. Active Profile Status and Student Directory Query
```
postgres=# SELECT student_number, status, year_level FROM students WHERE student_number LIKE '2026-MIG-%' ORDER BY student_number;
 student_number |  status  | year_level 
----------------+----------+------------
 2026-MIG-0001  | ENROLLED |          1
 2026-MIG-0002  | ENROLLED |          1
 2026-MIG-0003  | ENROLLED |          1
 2026-MIG-0004  | ENROLLED |          1
 2026-MIG-0005  | ENROLLED |          2
 2026-MIG-0006  | ENROLLED |          2
 2026-MIG-0007  | ENROLLED |          2
 2026-MIG-0008  | ENROLLED |          2
 2026-MIG-0009  | ENROLLED |          2
 2026-MIG-0010  | ENROLLED |          3
 2026-MIG-0011  | ENROLLED |          3
 2026-MIG-0012  | ENROLLED |          3
 2026-MIG-0013  | ENROLLED |          3
 2026-MIG-0014  | ENROLLED |          3
 2026-MIG-0015  | ENROLLED |          4
 2026-MIG-0016  | ENROLLED |          4
 2026-MIG-0017  | ENROLLED |          4
 2026-MIG-0018  | ENROLLED |          4
 2026-MIG-0019  | ENROLLED |          4
(19 rows)
```

#### 4. Active Confirmed Enrollment Verification Query
Current Semester Info:
- School Year: `2026-2027` (id: `4ea67fb8-384d-41b4-9e0a-06eab3c90896`)
- Semester: `FIRST SEMESTER` (id: `00000000-0000-0000-0000-000000000401`)
```
postgres=# SELECT e.status, COUNT(*) FROM enrollments e JOIN students s ON e.student_id = s.id WHERE s.student_number LIKE '2026-MIG-%' AND e.school_year_id = '4ea67fb8-384d-41b4-9e0a-06eab3c90896' AND e.semester_id = '00000000-0000-0000-0000-000000000401' GROUP BY e.status;
  status   | count 
-----------+-------
 CONFIRMED |    19
(1 row)
```

#### 5. Populated Background Records Verification Query
```
postgres=# SELECT COUNT(sc.student_id) as contact_count, COUNT(se.student_id) as edu_count, COUNT(sf.student_id) as family_count FROM students s LEFT JOIN student_contacts sc ON s.id = sc.student_id LEFT JOIN student_educational_backgrounds se ON s.id = se.student_id LEFT JOIN student_family_backgrounds sf ON s.id = sf.student_id WHERE s.student_number LIKE '2026-MIG-%';
 contact_count | edu_count | family_count 
---------------+-----------+--------------
            19 |        19 |           19
(1 row)
```

#### 6. Enrollment Subjects Count Query
```
postgres=# SELECT s.student_number, COUNT(es.id) as subjects_count FROM students s JOIN enrollments e ON s.id = e.student_id JOIN enrollment_subjects es ON e.id = es.enrollment_id WHERE s.student_number LIKE '2026-MIG-%' AND e.school_year_id = '4ea67fb8-384d-41b4-9e0a-06eab3c90896' AND e.semester_id = '00000000-0000-0000-0000-000000000401' GROUP BY s.student_number ORDER BY s.student_number;
 student_number | subjects_count 
----------------+----------------
 2026-MIG-0001  |              8
 2026-MIG-0002  |              8
 2026-MIG-0003  |              8
 2026-MIG-0004  |              8
 2026-MIG-0005  |              8
 2026-MIG-0006  |              8
 2026-MIG-0007  |              8
 2026-MIG-0008  |              8
 2026-MIG-0009  |              8
 2026-MIG-0010  |              7
 2026-MIG-0011  |              7
 2026-MIG-0012  |              7
 2026-MIG-0013  |              7
 2026-MIG-0014  |              7
 2026-MIG-0015  |              6
 2026-MIG-0016  |              6
 2026-MIG-0017  |              6
 2026-MIG-0018  |              6
 2026-MIG-0019  |              6
(19 rows)
```

#### 7. Generated Fee Assessments Query
```
postgres=# SELECT s.student_number, a.id as assessment_id, a.total_assessment, a.balance FROM students s JOIN assessments a ON s.id = a.student_id WHERE s.student_number LIKE '2026-MIG-%' AND a.school_year_id = '4ea67fb8-384d-41b4-9e0a-06eab3c90896' AND a.semester_id = '00000000-0000-0000-0000-000000000401' ORDER BY s.student_number;
 student_number |            assessment_id             | total_assessment | balance  
----------------+--------------------------------------+------------------+----------
 2026-MIG-0001  | 6d7600d2-b4d8-48d4-825e-381d65d58c95 |         12300.00 | 12300.00
 2026-MIG-0002  | 9a4eba07-4bc4-44c7-bd94-b4ec4d473cf3 |         12300.00 | 12300.00
 2026-MIG-0003  | 3da2f7f5-83fd-4fad-86c0-bb146ed4767d |         12300.00 | 12300.00
 2026-MIG-0004  | 91364694-6ff2-45dc-8bbd-8a9b4485a56f |         12300.00 | 12300.00
 2026-MIG-0005  | a9b0f140-9ca9-4aa1-9624-e4bb2544021f |         15300.00 | 15300.00
 2026-MIG-0006  | f9cbd4b8-3987-41b5-baac-5b01ba4da262 |         15300.00 | 15300.00
 2026-MIG-0007  | ca65a81d-eb1a-4873-8d5c-1ffc93c0f71c |         15300.00 | 15300.00
 2026-MIG-0008  | ace58614-b60f-4fb3-b961-c70644d03a82 |         15300.00 | 15300.00
 2026-MIG-0009  | e7090238-38d9-4671-aeb6-0887a140b995 |         15300.00 | 15300.00
 2026-MIG-0010  | 81eb7191-32b2-4b27-9bc4-ed0c999cceca |         15500.00 | 15500.00
 2026-MIG-0011  | 1555d392-a7a1-4ea4-b3ea-5d620d7ea5a0 |         15500.00 | 15500.00
 2026-MIG-0012  | c3ae5ea7-17fd-4155-9053-f23248384853 |         15500.00 | 15500.00
 2026-MIG-0013  | e9e36e43-2cf2-4e60-9970-28fe2feeaf8d |         15500.00 | 15500.00
 2026-MIG-0014  | e81408f9-cda2-4233-bc1e-30f16fdb2606 |         15500.00 | 15500.00
 2026-MIG-0015  | 32ba48ab-9508-41f3-b6bf-cf833112a78c |         10300.00 | 10300.00
 2026-MIG-0016  | 3cef49f4-ff82-4afc-bd48-9e630e4009c6 |         10300.00 | 10300.00
 2026-MIG-0017  | d070fe2d-4dcd-48d4-aadd-7030fae26c75 |         10300.00 | 10300.00
 2026-MIG-0018  | cfe6e5c7-9270-4a0c-b53c-fc50eefdfc18 |         10300.00 | 10300.00
 2026-MIG-0019  | bbcc72cc-7f8d-42fc-a88d-824e6776c3f7 |         10300.00 | 10300.00
(19 rows)
```

#### 8. Detailed Fee Assessment Breakdown (Samples)
**Year 1 (Student `2026-MIG-0001`):**
```
postgres=# SELECT category, description, quantity, unit_amount, total_amount FROM assessment_items WHERE assessment_id = '6d7600d2-b4d8-48d4-825e-381d65d58c95';
   category    |       description       | quantity | unit_amount | total_amount 
---------------+-------------------------+----------+-------------+--------------
 LABORATORY    | Computer Laboratory Fee |     2.00 |     1000.00 |      2000.00
 OTHER         | Registration Fee        |     1.00 |     1000.00 |      1000.00
 TUITION       | Tuition Fee             |    23.00 |      400.00 |      9200.00
 MISCELLANEOUS | WATER                   |     1.00 |      100.00 |       100.00
(4 rows)
```
**Year 4 (Student `2026-MIG-0015`):**
```
postgres=# SELECT category, description, quantity, unit_amount, total_amount FROM assessment_items WHERE assessment_id = '32ba48ab-9508-41f3-b6bf-cf833112a78c';
   category    |       description       | quantity | unit_amount | total_amount 
---------------+-------------------------+----------+-------------+--------------
 LABORATORY    | Computer Laboratory Fee |     2.00 |     1000.00 |      2000.00
 OTHER         | Registration Fee        |     1.00 |     1000.00 |      1000.00
 TUITION       | Tuition Fee             |    18.00 |      400.00 |      7200.00
 MISCELLANEOUS | WATER                   |     1.00 |      100.00 |       100.00
(4 rows)
```
