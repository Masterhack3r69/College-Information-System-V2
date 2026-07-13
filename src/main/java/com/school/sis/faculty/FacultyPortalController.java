package com.school.sis.faculty;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.response.ApiResponse;
import com.school.sis.grade.dto.GradebookRequests;
import com.school.sis.grade.dto.GradebookResponse;
import com.school.sis.grade.service.GradebookService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/faculty/me")
@PreAuthorize("hasAuthority('FACULTY_PORTAL_ACCESS')")
public class FacultyPortalController {
    private final FacultyPortalService service;
    private final FacultyPortalAccess access;
    private final GradebookService gradebooks;
    public FacultyPortalController(FacultyPortalService service, FacultyPortalAccess access, GradebookService gradebooks){this.service=service;this.access=access;this.gradebooks=gradebooks;}

    @GetMapping("/dashboard") public ApiResponse<Map<String,Object>> dashboard(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Faculty dashboard retrieved",service.dashboard(p));}
    @GetMapping("/classes") public ApiResponse<List<Map<String,Object>>> classes(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Assigned classes retrieved",service.classes(p));}
    @GetMapping("/classes/{id}") public ApiResponse<Map<String,Object>> detail(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Class retrieved",service.classDetail(id,p));}
    @GetMapping("/classes/{id}/roster") public ApiResponse<List<Map<String,Object>>> roster(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Class roster retrieved",service.roster(id,p));}
    @GetMapping("/schedule") public ApiResponse<List<Map<String,Object>>> schedule(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Teaching schedule retrieved",service.schedule(p));}
    @GetMapping("/profile") @PreAuthorize("hasAuthority('PROFILE_SELF_MANAGE')") public ApiResponse<Map<String,Object>> profile(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Profile retrieved",service.profile(p));}
    @PutMapping("/profile") @PreAuthorize("hasAuthority('PROFILE_SELF_MANAGE')") public ApiResponse<Map<String,Object>> profile(@Valid @RequestBody ProfileRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Profile updated",service.updateProfile(r.email(),r.contactNumber(),p));}
    @PutMapping("/password") @PreAuthorize("hasAuthority('PROFILE_SELF_MANAGE')") public ApiResponse<Void> password(@Valid @RequestBody PasswordRequest r,@AuthenticationPrincipal SisUserDetails p){service.changePassword(r.currentPassword(),r.newPassword(),r.refreshToken(),p);return ApiResponse.success("Password changed");}

    @GetMapping("/classes/{id}/gradebook") public ApiResponse<GradebookResponse> gradebook(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){access.assigned(id,p);return ApiResponse.success("Gradebook retrieved",gradebooks.get(id,p));}
    @PostMapping("/classes/{id}/gradebook/initialize") @PreAuthorize("hasAuthority('GRADE_ENCODE')") public ApiResponse<GradebookResponse> initialize(@PathVariable UUID id,@Valid @RequestBody GradebookRequests.Initialize r,@AuthenticationPrincipal SisUserDetails p){access.assigned(id,p);return ApiResponse.success("Gradebook initialized",gradebooks.initialize(id,r.templateId(),p));}
    @PutMapping("/classes/{id}/gradebook/scores") @PreAuthorize("hasAuthority('GRADE_ENCODE')") public ApiResponse<GradebookResponse> scores(@PathVariable UUID id,@Valid @RequestBody GradebookRequests.Scores r,@AuthenticationPrincipal SisUserDetails p){access.assigned(id,p);return ApiResponse.success("Scores saved",gradebooks.saveScores(id,r,p));}
    @PostMapping("/classes/{id}/gradebook/submit") @PreAuthorize("hasAuthority('GRADE_ENCODE')") public ApiResponse<GradebookResponse> submit(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){access.assigned(id,p);return ApiResponse.success("Gradebook submitted",gradebooks.submit(id,p));}

    @GetMapping("/classes/{id}/attendance") @PreAuthorize("hasAuthority('ATTENDANCE_MANAGE')") public ApiResponse<List<Map<String,Object>>> attendance(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance retrieved",service.attendance(id,p));}
    @PostMapping("/classes/{id}/attendance") @PreAuthorize("hasAuthority('ATTENDANCE_MANAGE')") public ApiResponse<Map<String,Object>> attendance(@PathVariable UUID id,@Valid @RequestBody AttendanceCreate r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance created",service.createAttendance(id,r.meetingId(),r.meetingDate(),p));}
    @GetMapping("/attendance/{id}") @PreAuthorize("hasAuthority('ATTENDANCE_MANAGE')") public ApiResponse<Map<String,Object>> session(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance session retrieved",service.attendanceSession(id,p));}
    @PutMapping("/attendance/{id}/entries") @PreAuthorize("hasAuthority('ATTENDANCE_MANAGE')") public ApiResponse<Map<String,Object>> entries(@PathVariable UUID id,@RequestBody AttendanceEntries r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance saved",service.saveAttendance(id,r.entries(),p));}
    @PostMapping("/attendance/{id}/finalize") @PreAuthorize("hasAuthority('ATTENDANCE_MANAGE')") public ApiResponse<Map<String,Object>> finalize(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance finalized",service.finalizeAttendance(id,p));}
    @PostMapping("/attendance/{id}/reopen") @PreAuthorize("hasAuthority('ATTENDANCE_MANAGE')") public ApiResponse<Map<String,Object>> reopen(@PathVariable UUID id,@RequestBody ReasonRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Attendance reopened",service.reopenAttendance(id,r.reason(),p));}

    @GetMapping("/classes/{id}/announcements") @PreAuthorize("hasAuthority('CLASS_CONTENT_MANAGE')") public ApiResponse<List<Map<String,Object>>> announcements(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Announcements retrieved",service.announcements(id,p));}
    @PostMapping("/classes/{id}/announcements") @PreAuthorize("hasAuthority('CLASS_CONTENT_MANAGE')") public ApiResponse<Map<String,Object>> announcement(@PathVariable UUID id,@Valid @RequestBody AnnouncementRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Announcement saved",service.saveAnnouncement(id,null,r.title(),r.body(),r.status(),p));}
    @PutMapping("/classes/{id}/announcements/{announcementId}") @PreAuthorize("hasAuthority('CLASS_CONTENT_MANAGE')") public ApiResponse<Map<String,Object>> announcement(@PathVariable UUID id,@PathVariable UUID announcementId,@Valid @RequestBody AnnouncementRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Announcement saved",service.saveAnnouncement(id,announcementId,r.title(),r.body(),r.status(),p));}
    @GetMapping("/classes/{id}/materials") @PreAuthorize("hasAuthority('CLASS_CONTENT_MANAGE')") public ApiResponse<List<Map<String,Object>>> materials(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Materials retrieved",service.materials(id,p));}
    @PostMapping(value="/classes/{id}/materials",consumes="multipart/form-data") @PreAuthorize("hasAuthority('CLASS_CONTENT_MANAGE')") public ApiResponse<Map<String,Object>> material(@PathVariable UUID id,@RequestParam String title,@RequestParam(required=false) String description,@RequestParam(defaultValue="DRAFT") String status,@RequestPart MultipartFile file,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Material uploaded",service.uploadMaterial(id,title,description,status,file,p));}

    @GetMapping("/advising") @PreAuthorize("hasAuthority('ADVISING_VIEW')") public ApiResponse<List<Map<String,Object>>> advisees(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Advisees retrieved",service.advisees(p));}
    @PostMapping("/advising/{assignmentId}/students/{studentId}/notes") @PreAuthorize("hasAuthority('ADVISING_VIEW')") public ApiResponse<Map<String,Object>> note(@PathVariable UUID assignmentId,@PathVariable UUID studentId,@Valid @RequestBody AdvisingNoteRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Advising note added",service.addAdvisingNote(assignmentId,studentId,r.category(),r.narrative(),r.followUpDate(),p));}
    @GetMapping("/grade-corrections") @PreAuthorize("hasAuthority('GRADE_CORRECTION_REQUEST')") public ApiResponse<List<Map<String,Object>>> corrections(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Correction requests retrieved",service.corrections(p));}
    @GetMapping("/locked-grades") @PreAuthorize("hasAuthority('GRADE_CORRECTION_REQUEST')") public ApiResponse<List<Map<String,Object>>> lockedGrades(@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Locked assigned grades retrieved",service.lockedGrades(p));}
    @PostMapping("/grade-corrections") @PreAuthorize("hasAuthority('GRADE_CORRECTION_REQUEST')") public ApiResponse<Map<String,Object>> correction(@Valid @RequestBody CorrectionRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Correction requested",service.requestCorrection(r.gradeId(),r.proposedGrade(),r.proposedRemark(),r.reason(),p));}
    @PostMapping("/grade-corrections/{id}/cancel") @PreAuthorize("hasAuthority('GRADE_CORRECTION_REQUEST')") public ApiResponse<Void> cancel(@PathVariable UUID id,@AuthenticationPrincipal SisUserDetails p){service.cancelCorrection(id,p);return ApiResponse.success("Correction request cancelled");}

    public record ProfileRequest(@Email @NotBlank String email,String contactNumber){}
    public record PasswordRequest(@NotBlank String currentPassword,@NotBlank String newPassword,String refreshToken){}
    public record AttendanceCreate(@NotNull UUID meetingId,@NotNull LocalDate meetingDate){}
    public record AttendanceEntries(List<Map<String,String>> entries){}
    public record ReasonRequest(@NotBlank String reason){}
    public record AnnouncementRequest(@NotBlank String title,@NotBlank String body,@NotBlank String status){}
    public record AdvisingNoteRequest(@NotBlank String category,@NotBlank String narrative,LocalDate followUpDate){}
    public record CorrectionRequest(@NotNull UUID gradeId,BigDecimal proposedGrade,@NotBlank String proposedRemark,@NotBlank String reason){}
}
