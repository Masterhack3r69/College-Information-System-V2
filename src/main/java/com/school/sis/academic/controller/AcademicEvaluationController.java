package com.school.sis.academic.controller;

import com.school.sis.academic.dto.AcademicExceptionRequests;
import com.school.sis.academic.dto.AcademicPlanResponse;
import com.school.sis.academic.service.AcademicEvaluationService;
import com.school.sis.academic.service.AcademicProgressService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class AcademicEvaluationController {
    private final AcademicEvaluationService evaluations;
    private final AcademicProgressService progress;

    public AcademicEvaluationController(AcademicEvaluationService evaluations, AcademicProgressService progress) {
        this.evaluations = evaluations;
        this.progress = progress;
    }

    @GetMapping("/academic-evaluations")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_VIEW')")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) UUID studentId,
                                                       @RequestParam(required = false) String status,
                                                       @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Academic evaluations retrieved", evaluations.list(studentId, status, principal));
    }

    @PostMapping("/academic-evaluations")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> create(@Valid @RequestBody AcademicExceptionRequests.CaseRequest request,
                                                   @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Academic evaluation created", evaluations.create(request, principal));
    }

    @GetMapping("/academic-evaluations/{id}")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_VIEW')")
    public ApiResponse<Map<String, Object>> get(@PathVariable UUID id, @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Academic evaluation retrieved", evaluations.get(id, principal));
    }

    @PutMapping("/academic-evaluations/{id}")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> update(@PathVariable UUID id,
                                                   @Valid @RequestBody AcademicExceptionRequests.CaseRequest request,
                                                   @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Academic evaluation updated", evaluations.update(id, request, principal));
    }

    @PostMapping("/academic-evaluations/{id}/source-courses")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> source(@PathVariable UUID id,
                                                   @Valid @RequestBody AcademicExceptionRequests.SourceCourse request,
                                                   @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Source course added", evaluations.addSource(id, request, principal));
    }

    @PutMapping("/academic-evaluations/{id}/source-courses/{sourceId}")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> updateSource(@PathVariable UUID id, @PathVariable UUID sourceId,
                                                         @Valid @RequestBody AcademicExceptionRequests.SourceCourse request,
                                                         @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Source course updated", evaluations.updateSource(id, sourceId, request, principal));
    }

    @DeleteMapping("/academic-evaluations/{id}/source-courses/{sourceId}")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> removeSource(@PathVariable UUID id, @PathVariable UUID sourceId,
                                                         @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Source course removed", evaluations.removeSource(id, sourceId, principal));
    }

    @PostMapping("/academic-evaluations/{id}/documents")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> document(@PathVariable UUID id,
                                                     @Valid @RequestBody AcademicExceptionRequests.DocumentLink request,
                                                     @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Evaluation document linked", evaluations.linkDocument(id, request.documentId(), principal));
    }

    @PostMapping("/academic-evaluations/{id}/submit")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> submit(@PathVariable UUID id, @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Evaluation submitted", evaluations.submit(id, principal));
    }

    @PostMapping("/academic-evaluations/{id}/matches")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_REVIEW')")
    public ApiResponse<Map<String, Object>> match(@PathVariable UUID id,
                                                  @Valid @RequestBody AcademicExceptionRequests.Match request,
                                                  @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Equivalency reviewed", evaluations.saveMatch(id, request, principal));
    }

    @PostMapping("/academic-evaluations/{id}/forward")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_REVIEW')")
    public ApiResponse<Map<String, Object>> forward(@PathVariable UUID id,
                                                    @Valid @RequestBody AcademicExceptionRequests.Reason request,
                                                    @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Evaluation forwarded to Registrar", evaluations.forward(id, request, principal));
    }

    @PostMapping("/academic-evaluations/{id}/approve")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> approve(@PathVariable UUID id,
                                                    @Valid @RequestBody AcademicExceptionRequests.Reason request,
                                                    @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Evaluation approved and credits posted", evaluations.approve(id, request, principal));
    }

    @PostMapping("/academic-evaluations/{id}/return")
    @PreAuthorize("hasAnyAuthority('ACADEMIC_EVALUATION_REVIEW','ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> returnCase(@PathVariable UUID id,
                                                       @Valid @RequestBody AcademicExceptionRequests.Reason request,
                                                       @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Evaluation returned", evaluations.returnCase(id, request, principal));
    }

    @PostMapping("/academic-evaluations/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ACADEMIC_EVALUATION_REVIEW','ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> reject(@PathVariable UUID id,
                                                   @Valid @RequestBody AcademicExceptionRequests.Reason request,
                                                   @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Evaluation rejected", evaluations.reject(id, request, principal));
    }

    @PostMapping("/student-course-credits/{id}/reverse")
    @PreAuthorize("hasAuthority('ACADEMIC_EVALUATION_APPROVE')")
    public ApiResponse<Map<String, Object>> reverse(@PathVariable UUID id,
                                                    @Valid @RequestBody AcademicExceptionRequests.Reason request,
                                                    @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Course credit reversed", evaluations.reverseCredit(id, request, principal));
    }

    @GetMapping("/students/{id}/academic-plan")
    @PreAuthorize("hasAnyAuthority('STUDENT_VIEW','ACADEMIC_EVALUATION_VIEW','GRADUATION_AUDIT_VIEW')")
    public ApiResponse<AcademicPlanResponse> plan(@PathVariable UUID id) {
        return ApiResponse.success("Academic plan retrieved", progress.plan(id));
    }
}
