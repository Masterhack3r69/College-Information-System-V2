# Forensic Audit Report

**Work Product**: Hardened Role-Based Access Control (RBAC) implementation (specifically GradeController, StudentController, GradeService, and related tests)
**Profile**: General Project
**Verdict**: CLEAN

---

### Phase Results

1. **Controller-level `@PreAuthorize` Analysis**: PASS
   - Verbatim verification that method-level `@PreAuthorize` annotations are correctly applied on all REST endpoints in `GradeController` and `StudentController`.
   - Verified that the security context correctly maps permissions using the standard Spring `@PreAuthorize` model.

2. **Facade and Hardcoded Values Check**: PASS
   - No dummy/facade implementations or return of static/pre-coded mock objects in `GradeService` or the controllers.
   - All calculations (such as final grades, earned units, increments, and GPA) are performed using real entity values and database state.
   - Checked that no pre-populated log files, verification artifacts, or test result files existed before running the tests.

3. **Behavioral Test Suite Execution**: PASS
   - Ran `mvn clean test -Dtest=GradeServiceTests` on the system.
   - Verified that all 16 tests executed and passed successfully.
   - Verified test authenticity: tests dynamically setup database entities using H2 in-memory DB and assert on real service logic.

---

### Evidence

#### 1. `@PreAuthorize` Annotations in GradeController
- **`list` (GET `/api/v1/grades`)**:
  ```java
  @GetMapping
  @PreAuthorize("hasAuthority('GRADE_APPROVE')")
  public ApiResponse<PageResponse<GradeResponse>> list(...)
  ```
- **`classGrades` (GET `/api/v1/grades/class/{scheduleId}`)**:
  ```java
  @GetMapping("/class/{scheduleId}")
  @PreAuthorize("hasAnyAuthority('GRADE_ENCODE', 'GRADE_APPROVE')")
  public ApiResponse<GradeClassResponse> classGrades(...)
  ```
- **`encode` (POST `/api/v1/grades/class/{scheduleId}/encode`)**:
  ```java
  @PostMapping("/class/{scheduleId}/encode")
  @PreAuthorize("hasAuthority('GRADE_ENCODE')")
  public ApiResponse<GradeClassResponse> encode(...)
  ```
- **`submit` (POST `/api/v1/grades/class/{scheduleId}/submit`)**:
  ```java
  @PostMapping("/class/{scheduleId}/submit")
  @PreAuthorize("hasAuthority('GRADE_ENCODE')")
  public ApiResponse<GradeClassResponse> submit(...)
  ```
- **`approve` (POST `/api/v1/grades/class/{scheduleId}/approve`)**:
  ```java
  @PostMapping("/class/{scheduleId}/approve")
  @PreAuthorize("hasAuthority('GRADE_APPROVE')")
  public ApiResponse<GradeClassResponse> approve(...)
  ```
- **`lock` (POST `/api/v1/grades/class/{scheduleId}/lock`)**:
  ```java
  @PostMapping("/class/{scheduleId}/lock")
  @PreAuthorize("hasAuthority('GRADE_APPROVE')")
  public ApiResponse<GradeClassResponse> lock(...)
  ```
- **`studentGrades` (GET `/api/v1/grades/student/{studentId}`)**:
  ```java
  @GetMapping("/student/{studentId}")
  @PreAuthorize("hasAnyAuthority('STUDENT_VIEW', 'GRADE_ENCODE')")
  public ApiResponse<List<GradeResponse>> studentGrades(...)
  ```

#### 2. `@PreAuthorize` Annotations in StudentController
- **`list` (GET `/api/v1/students`)**:
  ```java
  @GetMapping
  @PreAuthorize("hasAuthority('STUDENT_VIEW')")
  public ApiResponse<PageResponse<StudentSummaryResponse>> list(...)
  ```
- **`create` (POST `/api/v1/students`)**:
  ```java
  @PostMapping
  @PreAuthorize("hasAuthority('STUDENT_CREATE')")
  public ApiResponse<StudentResponse> create(...)
  ```
- **`get` (GET `/api/v1/students/{id}`)**:
  ```java
  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('STUDENT_VIEW')")
  public ApiResponse<StudentResponse> get(...)
  ```
- **`update` (PUT `/api/v1/students/{id}`)**:
  ```java
  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
  public ApiResponse<StudentResponse> update(...)
  ```
- **`updateStatus` (PATCH `/api/v1/students/{id}/status`)**:
  ```java
  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
  public ApiResponse<StudentResponse> updateStatus(...)
  ```
- **`uploadDocument` (POST `/api/v1/students/{id}/documents`)**:
  ```java
  @PostMapping("/{id}/documents")
  @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
  public ApiResponse<StudentDocumentResponse> uploadDocument(...)
  ```
- **`listDocuments` (GET `/api/v1/students/{id}/documents`)**:
  ```java
  @GetMapping("/{id}/documents")
  @PreAuthorize("hasAuthority('STUDENT_VIEW')")
  public ApiResponse<List<StudentDocumentResponse>> listDocuments(...)
  ```
- **`verifyDocument` (PATCH `/api/v1/students/{id}/documents/{documentId}/verify`)**:
  ```java
  @PatchMapping("/{id}/documents/{documentId}/verify")
  @PreAuthorize("hasAuthority('STUDENT_UPDATE')")
  public ApiResponse<StudentDocumentResponse> verifyDocument(...)
  ```
- **`academicRecords` (GET `/api/v1/students/{id}/academic-records`)**:
  ```java
  @GetMapping("/{id}/academic-records")
  @PreAuthorize("hasAnyAuthority('STUDENT_VIEW', 'GRADE_ENCODE')")
  public ApiResponse<StudentAcademicRecordsResponse> academicRecords(...)
  ```

#### 3. Test Suite Run Command & Results
Command: `mvn clean test -Dtest=GradeServiceTests`
Results Output Snippet:
```
[INFO] Scanning for projects...
[INFO] 
[INFO] ---------------------------< com.school:sis >---------------------------
[INFO] Building sis 0.0.1-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
...
[INFO] Running com.school.sis.grade.GradeServiceTests
...
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 18.84 s -- in com.school.sis.grade.GradeServiceTests
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  31.138 s
[INFO] Finished at: 2026-07-13T16:59:59+08:00
```
All 16 test cases successfully instantiated, configured contextual users/principals, and validated proper handling under normal and unauthorized conditions.
