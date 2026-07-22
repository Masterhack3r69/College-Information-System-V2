package com.school.sis.student.portal;

import com.school.sis.academic.dto.AcademicPlanResponse;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.auth.dto.AuthResponse;
import com.school.sis.auth.dto.PasswordChangeRequest;
import com.school.sis.auth.service.AuthService;
import com.school.sis.common.response.ApiResponse;
import com.school.sis.enrollment.dto.EnrollmentResponse;
import com.school.sis.report.service.ReportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController @RequestMapping("/api/v1/student/me") @PreAuthorize("hasAuthority('STUDENT_PORTAL_ACCESS')")
public class StudentPortalController {
    private final StudentPortalService service; private final ReportService reports; private final AuthService auth;
    public StudentPortalController(StudentPortalService service,ReportService reports,AuthService auth){this.service=service;this.reports=reports;this.auth=auth;}
    @GetMapping("/dashboard") public ApiResponse<Map<String,Object>> dashboard(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Student dashboard retrieved",service.dashboard(p));}
    @GetMapping("/term") public ApiResponse<Map<String,Object>> term(){return ApiResponse.success("Student portal term retrieved",service.term());}
    @GetMapping("/profile") @PreAuthorize("hasAuthority('STUDENT_PROFILE_SELF')") public ApiResponse<Map<String,Object>> profile(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Student profile retrieved",service.profile(p));}
    @PutMapping("/profile") @PreAuthorize("hasAuthority('STUDENT_PROFILE_SELF')") public ApiResponse<Map<String,Object>> profile(@Valid @RequestBody ProfileRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Student profile updated",service.updateProfile(new StudentPortalService.ProfileUpdate(r.email(),r.mobileNumber(),r.telephoneNumber(),r.currentAddress(),r.emergencyContactName(),r.emergencyContactNumber(),r.emergencyContactRelationship(),r.emergencyContactAddress()),p));}
    @PutMapping("/password") public ApiResponse<AuthResponse> password(@Valid @RequestBody PasswordRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Password changed",auth.changePassword(p,new PasswordChangeRequest(r.currentPassword(),r.newPassword())));}
    @GetMapping("/enrollment") @PreAuthorize("hasAuthority('STUDENT_ENROLLMENT_SELF')") public ApiResponse<Map<String,Object>> enrollment(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Enrollment retrieved",service.currentEnrollment(p));}
    @GetMapping("/available-classes") @PreAuthorize("hasAuthority('STUDENT_ENROLLMENT_SELF')") public ApiResponse<List<Map<String,Object>>> available(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Available classes retrieved",service.availableClasses(p));}
    @PostMapping("/enrollment") @PreAuthorize("hasAuthority('STUDENT_ENROLLMENT_SELF')") public ApiResponse<EnrollmentResponse> draft(@Valid @RequestBody DraftRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Enrollment draft created",service.createDraft(new StudentPortalService.DraftRequest(r.yearLevel(),r.sectionId(),r.remarks()),p));}
    @PostMapping("/enrollment/{id}/subjects") @PreAuthorize("hasAuthority('STUDENT_ENROLLMENT_SELF')") public ApiResponse<EnrollmentResponse> add(@PathVariable UUID id,@Valid @RequestBody SubjectRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Subject added",service.addSubject(id,r.scheduleId(),p));}
    @DeleteMapping("/enrollment/{id}/subjects/{subjectId}") @PreAuthorize("hasAuthority('STUDENT_ENROLLMENT_SELF')") public ApiResponse<EnrollmentResponse> drop(@PathVariable UUID id,@PathVariable UUID subjectId,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Subject removed",service.dropSubject(id,subjectId,p));}
    @PostMapping("/enrollment/{id}/submit") @PreAuthorize("hasAuthority('STUDENT_ENROLLMENT_SELF')") public ApiResponse<EnrollmentResponse> submit(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Enrollment submitted",service.submit(id,p));}
    @GetMapping("/schedule") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> schedule(@RequestParam(required=false) UUID schoolYearId,@RequestParam(required=false) UUID semesterId,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Schedule retrieved",schoolYearId==null||semesterId==null?service.schedule(p):service.schedule(schoolYearId,semesterId,p));}
    @GetMapping("/schedule/terms") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> scheduleTerms(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Enrolled schedule terms retrieved",service.scheduleTerms(p));}
    @GetMapping("/schedule/changes") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> scheduleChanges(@RequestParam UUID schoolYearId,@RequestParam UUID semesterId,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Schedule changes retrieved",service.scheduleChanges(schoolYearId,semesterId,p));}
    @GetMapping("/grades") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> grades(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Posted grades retrieved",service.grades(p));}
    @GetMapping("/curriculum-progress") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<Map<String,Object>> progress(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Curriculum progress retrieved",service.progress(p));}
    @GetMapping("/academic-plan") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<AcademicPlanResponse> academicPlan(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Academic plan retrieved",service.academicPlan(p));}
    @GetMapping("/course-credits") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> credits(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Posted course credits retrieved",service.credits(p));}
    @GetMapping("/academic-evaluations") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> evaluations(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Academic evaluations retrieved",service.evaluations(p));}
    @GetMapping("/graduation-audits") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ApiResponse<List<Map<String,Object>>> graduationAudits(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Graduation audits retrieved",service.graduationAudits(p));}
    @GetMapping("/attendance") @PreAuthorize("hasAuthority('STUDENT_ATTENDANCE_SELF')") public ApiResponse<List<Map<String,Object>>> attendance(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance summary retrieved",service.attendance(p));}
    @GetMapping("/grade-report") @PreAuthorize("hasAuthority('STUDENT_ACADEMIC_SELF')") public ResponseEntity<byte[]> report(@AuthenticationPrincipal SisUserDetails p){var pdf=reports.unofficialGradeReport(p.studentId(),p);return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.inline().filename(pdf.filename()).build().toString()).body(pdf.bytes());}
    @GetMapping("/assessments") @PreAuthorize("hasAuthority('STUDENT_FINANCE_SELF')") public ApiResponse<List<Map<String,Object>>> finance(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Assessments retrieved",service.finance(p));}
    @GetMapping("/payments") @PreAuthorize("hasAuthority('STUDENT_FINANCE_SELF')") public ApiResponse<List<Map<String,Object>>> payments(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Payment history retrieved",service.payments(p));}
    @GetMapping("/payments/{id}/receipt") @PreAuthorize("hasAuthority('STUDENT_FINANCE_SELF')") public ResponseEntity<byte[]> receipt(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){var pdf=reports.studentPaymentReceipt(id,p);return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.inline().filename(pdf.filename()).build().toString()).body(pdf.bytes());}
    @GetMapping("/announcements") @PreAuthorize("hasAuthority('STUDENT_CONTENT_SELF')") public ApiResponse<List<Map<String,Object>>> announcements(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Announcements retrieved",service.announcements(p));}
    @GetMapping("/materials") @PreAuthorize("hasAuthority('STUDENT_CONTENT_SELF')") public ApiResponse<List<Map<String,Object>>> materials(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Materials retrieved",service.materials(p));}
    @GetMapping("/materials/{id}/download") @PreAuthorize("hasAuthority('STUDENT_CONTENT_SELF')") public ResponseEntity<byte[]> material(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return download(service.material(id,p));}
    @GetMapping("/forms") @PreAuthorize("hasAuthority('STUDENT_REQUEST_SELF')") public ApiResponse<List<Map<String,Object>>> forms(){return ApiResponse.success("Student forms retrieved",service.forms());}
    @GetMapping("/forms/{id}/download") @PreAuthorize("hasAuthority('STUDENT_REQUEST_SELF')") public ResponseEntity<byte[]> form(@PathVariable UUID id){return download(service.form(id));}
    @GetMapping("/requests") @PreAuthorize("hasAuthority('STUDENT_REQUEST_SELF')") public ApiResponse<List<Map<String,Object>>> requests(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Requests retrieved",service.requests(p));}
    @PostMapping("/requests") @PreAuthorize("hasAuthority('STUDENT_REQUEST_SELF')") public ApiResponse<Map<String,Object>> request(@Valid @RequestBody ServiceRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Request submitted",service.createRequest(new StudentPortalService.RequestCreate(r.requestType(),r.documentName(),r.purpose(),r.comment()),p));}
    @PostMapping("/requests/{id}/cancel") @PreAuthorize("hasAuthority('STUDENT_REQUEST_SELF')") public ApiResponse<Void> cancel(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){service.cancelRequest(id,p);return ApiResponse.success("Request cancelled");}
    @GetMapping("/requests/{id}/download") @PreAuthorize("hasAuthority('STUDENT_REQUEST_SELF')") public ResponseEntity<byte[]> requestDownload(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return download(service.requestDownload(id,p));}
    private ResponseEntity<byte[]> download(StudentPortalService.Download d){return ResponseEntity.ok().contentType(MediaType.parseMediaType(d.mimeType())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(d.filename()).build().toString()).body(d.bytes());}
    public record ProfileRequest(@NotBlank @Email String email,String mobileNumber,String telephoneNumber,String currentAddress,String emergencyContactName,String emergencyContactNumber,String emergencyContactRelationship,String emergencyContactAddress){}
    public record PasswordRequest(@NotBlank String currentPassword,@NotBlank String newPassword,String refreshToken){}
    public record DraftRequest(@Min(1) int yearLevel,UUID sectionId,String remarks){}
    public record SubjectRequest(@NotNull UUID scheduleId){}
    public record ServiceRequest(@NotBlank String requestType,String documentName,@NotBlank String purpose,String comment){}
}
