## 2026-07-12T11:17:35Z

You are the migration worker. Your working directory is `c:\Users\PC\Projects\cis\.agents\worker_migration`.
Your mission is to develop and execute an automated script or process to enroll 19 applicant students (4 first-year, 5 second-year, 5 third-year, 5 fourth-year) for the first semester into the College Information System.

Specifically, perform these tasks:
1. Check if the database and backend services are active. If not, start them using Docker Compose.
2. Query the database to find:
   - The active `school_year` and `semester` (representing the First Semester).
   - Available `programs` (e.g. BSCS, BSIT) and their corresponding `curricula`.
   - Existing `sections` and `class_schedules` for Year Levels 1, 2, 3, and 4 under the first semester. If sections or schedules do not exist for years 2, 3, or 4, determine how to create them (or check if they are already present).
3. Generate realistic mock data for 19 applicant students:
   - 4 first-year (Year 1)
   - 5 second-year (Year 2)
   - 5 third-year (Year 3)
   - 5 fourth-year (Year 4)
4. Design and implement an automated script/process (e.g. using Python, curl/Bash against the REST API, or a Spring Boot Java test runner/migration utility) to enroll these students.
   The process must complete the full enrollment lifecycle:
   - Create student profiles (personal, academic, contact, family, educational background).
   - Create draft enrollments under the active school year, semester, and correct sections for their year level.
   - Assign/verify their schedule load.
   - Confirm the enrollments (so their status changes to CONFIRMED / ENROLLED).
   - Generate fee assessments for each.
5. Execute the script/process to enroll the 19 students.
6. Verify the results by running a verification script or SQL query that output-proves:
   - Exactly 19 new student records exist for the first semester.
   - The distribution is exactly: 4 first-year, 5 second-year, 5 third-year, 5 fourth-year students.
7. Write a detailed summary of the automation process, any created scripts, and database queries in `c:\Users\PC\Projects\cis\.agents\worker_migration\automation_report.md`.
8. Write a handoff report in `c:\Users\PC\Projects\cis\.agents\worker_migration\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
