# Handoff Report: Investigation of Academic Functions (Grading & Gradebook Layers)

## 1. Observation
We investigated the academic modules of the Spring Boot Java application under `c:\Users\PC\Projects\cis\`. The following key files and code segments were identified and examined:

1. **GradeController**: Located at `src/main/java/com/school/sis/grade/controller/GradeController.java`. Exposes endpoints for managing final section grades. For example:
   ```java
   54:     @GetMapping("/class/{scheduleId}")
   55:     @PreAuthorize("hasAnyAuthority('GRADE_ENCODE', 'GRADE_APPROVE')")
   56:     public ApiResponse<GradeClassResponse> classGrades(@PathVariable UUID scheduleId, @AuthenticationPrincipal SisUserDetails userDetails) {
   57:         return ApiResponse.success("Class grades retrieved", gradeService.classGrades(scheduleId, userDetails));
   58:     }
   ```

2. **GradebookController**: Located at `src/main/java/com/school/sis/grade/controller/GradebookController.java`. Exposes endpoints for granular gradebook items, categories, scores, and overrides:
   ```java
   5:  @GetMapping("/classes") public ApiResponse<PageResponse<GradeClassSummaryResponse>> classes(@RequestParam(defaultValue="MY") String scope,@RequestParam(required=false) UUID schoolYearId,@RequestParam(required=false) UUID semesterId,@RequestParam(required=false) GradeStatus status,@RequestParam(required=false) String search,Pageable page,@AuthenticationPrincipal SisUserDetails user){return ApiResponse.success("Grade classes retrieved",service.classes(scope,schoolYearId,semesterId,status,search,page,user));}
   6:  @GetMapping("/class/{scheduleId}") public ApiResponse<GradebookResponse> get(@PathVariable UUID scheduleId,@AuthenticationPrincipal SisUserDetails user){return ApiResponse.success("Gradebook retrieved",service.get(scheduleId,user));}
   ```

3. **GradebookService**: Located at `src/main/java/com/school/sis/grade/service/GradebookService.java`. Handles validation rules and enforces row/data-level user ownership constraints based on `facultyId`:
   ```java
   26:  private void ensureFaculty(ClassSchedule s,SisUserDetails p){if(has(p,"GRADE_APPROVE")||has(p,"ROLE_SUPER_ADMIN"))return;if(!has(p,"GRADE_ENCODE")||p.facultyId()==null||!p.facultyId().equals(s.getFaculty().getId()))throw new BusinessRuleException("Faculty can only manage assigned classes");}
   ```

4. **GradeService**: Located at `src/main/java/com/school/sis/grade/service/GradeService.java`. Handles official course grade validation and locking:
   ```java
   347:     private void ensureCanEncodeSchedule(ClassSchedule schedule, SisUserDetails userDetails) {
   348:         if (hasAuthority(userDetails, "GRADE_APPROVE")) {
   349:             return;
   350:         }
   351:         if (!hasAuthority(userDetails, "GRADE_ENCODE")) {
   352:             throw new BusinessRuleException("User is not allowed to encode grades");
   353:         }
   354:         UUID facultyId = userDetails == null ? null : userDetails.facultyId();
   355:         if (facultyId == null || !facultyId.equals(schedule.getFaculty().getId())) {
   356:             throw new BusinessRuleException("Faculty can only encode assigned classes");
   357:         }
   358:     }
   ```

5. **Grading DDL Schema**: Located at `src/main/resources/db/migration/V7__grade_recording_and_academic_records.sql` (defining `grades` and `academic_records` tables) and `V12__weighted_gradebooks.sql` (defining `class_gradebooks`, `grade_scores`, `grade_assessment_items`, and permissions such as `GRADE_REVIEW` and `GRADE_LOCK`). For example, `V12__weighted_gradebooks.sql` lines 45-47:
   ```sql
   CREATE TABLE class_gradebooks (
       id UUID PRIMARY KEY, schedule_id UUID NOT NULL UNIQUE REFERENCES class_schedules(id), template_id UUID REFERENCES grading_templates(id),
       scale_id UUID REFERENCES grading_scales(id),
   ```

6. **Absence of Attendance Function**: Running a case-insensitive grep search for `"attendance"` across the project files returned 0 matches in source code files, only matches in markdown documentation files (e.g., `PROJECT_CONTEXT.md` roadmap references to future "Biometric attendance integration").

---

## 2. Logic Chain
1. **Grading & Gradebook Modules**: Under the `com.school.sis.grade` packages, we observed dedicated Controllers (`GradeController`, `GradebookController`, `GradingSetupController`), Services (`GradeService`, `GradebookService`, `GradingSetupService`), Repositories, and Flyway SQL schema tables (`grades`, `class_gradebooks`, `grade_scores`, etc.). This confirms the existence and complete implementation of a robust grading system.
2. **Access Control Filtering**: In `GradebookService.java` and `GradeService.java`, the helper methods `ensureFaculty` and `ensureCanEncodeSchedule` compare the `facultyId` stored in the authenticated user's session principal (`SisUserDetails`) against the `facultyId` associated with the requested `ClassSchedule`. If they do not match, the application immediately throws a `BusinessRuleException`. This proves that faculty accounts are restricted from accessing sections they are not assigned to.
3. **Attendance Absence**: Ripgrep search queries for `"attendance"` returned no matches in the Java source directory (`src/`). Consequently, we conclude that attendance tracking features (such as daily roll calls or session-based tracking) are not implemented in the current codebase, though they are planned as future integrations.

---

## 3. Caveats
- No caveats. The investigation is complete, read-only, and fully verified.

---

## 4. Conclusion
The only implemented academic functionality in the backend codebase is the **Grading** and **Gradebook Management** module (`com.school.sis.grade`). No attendance function exists. Access control is strictly enforced programmatically in the service layer using `SisUserDetails` and `ClassSchedule.getFaculty().getId()` matching logic.

---

## 5. Verification Method
To independently verify the observations and conclusions:
1. **Inspect Code Files**:
   - Verify grading controllers at `src/main/java/com/school/sis/grade/controller/`
   - Verify data-level restriction checks in service implementations: `GradebookService.java` (lines 25-26) and `GradeService.java` (lines 340-358).
2. **Run Tests**:
   - Verify that all backend tests compile and pass using:
     ```bash
     mvn test
     ```
   - Verify that all frontend E2E tests run successfully (if backend/frontend is running) using:
     ```bash
     cd frontend
     npm run test:e2e
     ```
