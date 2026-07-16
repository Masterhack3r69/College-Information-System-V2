package com.school.sis.academic.controller;

import com.school.sis.academic.dto.AcademicExceptionRequests;
import com.school.sis.academic.service.AcademicPolicyService;
import com.school.sis.academic.service.CurriculumRequirementService;
import com.school.sis.academic.service.GraduationAuditService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
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
public class AcademicPolicyController {
    private final AcademicPolicyService policies;
    private final CurriculumRequirementService requirements;
    private final GraduationAuditService audits;
    public AcademicPolicyController(AcademicPolicyService policies, CurriculumRequirementService requirements,
                                    GraduationAuditService audits) {
        this.policies = policies; this.requirements = requirements; this.audits = audits;
    }

    @GetMapping("/academic-policies") @PreAuthorize("hasAuthority('ACADEMIC_POLICY_MANAGE')")
    public ApiResponse<List<Map<String, Object>>> policies(@RequestParam(required = false) UUID schoolYearId) {
        return ApiResponse.success("Academic policies retrieved", policies.list(schoolYearId));
    }
    @PostMapping("/academic-policies") @PreAuthorize("hasAuthority('ACADEMIC_POLICY_MANAGE')")
    public ApiResponse<Map<String, Object>> createPolicy(@Valid @RequestBody AcademicExceptionRequests.Policy request,
                                                         @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Academic policy created", policies.save(null, request, principal));
    }
    @PutMapping("/academic-policies/{id}") @PreAuthorize("hasAuthority('ACADEMIC_POLICY_MANAGE')")
    public ApiResponse<Map<String, Object>> updatePolicy(@PathVariable UUID id,
                                                         @Valid @RequestBody AcademicExceptionRequests.Policy request,
                                                         @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Academic policy updated", policies.save(id, request, principal));
    }
    @GetMapping("/students/{id}/eligibility-approvals") @PreAuthorize("hasAuthority('ENROLLMENT_VIEW')")
    public ApiResponse<List<Map<String, Object>>> approvals(@PathVariable UUID id) {
        return ApiResponse.success("Enrollment eligibility approvals retrieved", policies.approvalsForStudent(id));
    }

    @GetMapping("/curricula/{id}/requirement-groups") @PreAuthorize("hasAuthority('CURRICULUM_VIEW')")
    public ApiResponse<List<Map<String, Object>>> groups(@PathVariable UUID id) {
        return ApiResponse.success("Curriculum requirement groups retrieved", requirements.list(id));
    }
    @PostMapping("/curricula/{id}/requirement-groups") @PreAuthorize("hasAuthority('CURRICULUM_MANAGE')")
    public ApiResponse<Map<String, Object>> createGroup(@PathVariable UUID id,
                                                        @Valid @RequestBody AcademicExceptionRequests.RequirementGroup request,
                                                        @AuthenticationPrincipal SisUserDetails principal) {
        if (!id.equals(request.curriculumId())) {
            throw new BusinessRuleException("CURRICULUM_PATH_MISMATCH", "Curriculum path and request do not match");
        }
        return ApiResponse.success("Curriculum requirement group created", requirements.save(null, request, principal));
    }
    @PutMapping("/curricula/{id}/requirement-groups/{groupId}") @PreAuthorize("hasAuthority('CURRICULUM_MANAGE')")
    public ApiResponse<Map<String, Object>> updateGroup(@PathVariable UUID id, @PathVariable UUID groupId,
                                                        @Valid @RequestBody AcademicExceptionRequests.RequirementGroup request,
                                                        @AuthenticationPrincipal SisUserDetails principal) {
        if (!id.equals(request.curriculumId())) {
            throw new BusinessRuleException("CURRICULUM_PATH_MISMATCH", "Curriculum path and request do not match");
        }
        return ApiResponse.success("Curriculum requirement group updated", requirements.save(groupId, request, principal));
    }
    @DeleteMapping("/curricula/{id}/requirement-groups/{groupId}") @PreAuthorize("hasAuthority('CURRICULUM_MANAGE')")
    public ApiResponse<Void> deleteGroup(@PathVariable UUID id, @PathVariable UUID groupId,
                                         @AuthenticationPrincipal SisUserDetails principal) {
        requirements.delete(id, groupId, principal); return ApiResponse.success("Curriculum requirement group removed");
    }

    @PostMapping("/students/{id}/graduation-audits") @PreAuthorize("hasAuthority('GRADUATION_AUDIT_VIEW')")
    public ApiResponse<Map<String, Object>> runAudit(@PathVariable UUID id, @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Graduation audit completed", audits.run(id, principal));
    }
    @GetMapping("/students/{id}/graduation-audits") @PreAuthorize("hasAuthority('GRADUATION_AUDIT_VIEW')")
    public ApiResponse<List<Map<String, Object>>> audits(@PathVariable UUID id, @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Graduation audits retrieved", audits.list(id, principal));
    }
    @GetMapping("/graduation-audits/{id}") @PreAuthorize("hasAuthority('GRADUATION_AUDIT_VIEW')")
    public ApiResponse<Map<String, Object>> audit(@PathVariable UUID id, @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Graduation audit retrieved", audits.get(id, principal));
    }
}
