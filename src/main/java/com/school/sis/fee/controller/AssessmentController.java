package com.school.sis.fee.controller;

import com.school.sis.common.response.ApiResponse;
import com.school.sis.common.response.PageResponse;
import com.school.sis.fee.dto.AssessmentResponse;
import com.school.sis.fee.dto.AssessmentSearchCriteria;
import com.school.sis.fee.dto.AssessmentStatusRequest;
import com.school.sis.fee.dto.AssessmentSummaryResponse;
import com.school.sis.fee.entity.AssessmentStatus;
import com.school.sis.fee.service.AssessmentService;
import com.school.sis.fee.service.PaymentService;
import com.school.sis.fee.dto.*;
import com.school.sis.auth.security.SisUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final PaymentService paymentService;

    public AssessmentController(AssessmentService assessmentService, PaymentService paymentService) {
        this.assessmentService = assessmentService;
        this.paymentService = paymentService;
    }

    @GetMapping("/assessments")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<PageResponse<AssessmentSummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID schoolYearId,
            @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) AssessmentStatus status,
            Pageable pageable
    ) {
        AssessmentSearchCriteria criteria = new AssessmentSearchCriteria(search, studentId, schoolYearId, semesterId, status);
        return ApiResponse.success("Assessments retrieved", assessmentService.list(criteria, pageable));
    }

    @GetMapping("/assessments/{id}")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<AssessmentResponse> get(@PathVariable UUID id) {
        return ApiResponse.success("Assessment retrieved", assessmentService.get(id));
    }

    @GetMapping("/enrollments/{enrollmentId}/assessment")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW', 'ENROLLMENT_VIEW')")
    public ApiResponse<AssessmentResponse> getByEnrollment(@PathVariable UUID enrollmentId) {
        return ApiResponse.success("Assessment retrieved", assessmentService.getByEnrollment(enrollmentId));
    }

    @PostMapping("/enrollments/{enrollmentId}/generate-assessment")
    @PreAuthorize("hasAuthority('FINANCE_PAYMENT')")
    public ApiResponse<AssessmentResponse> generate(@PathVariable UUID enrollmentId) {
        return ApiResponse.success("Assessment generated", assessmentService.generate(enrollmentId));
    }

    @PostMapping("/assessments/{id}/recalculate")
    @PreAuthorize("hasAuthority('FINANCE_PAYMENT')")
    public ApiResponse<AssessmentResponse> recalculate(@PathVariable UUID id) {
        return ApiResponse.success("Assessment recalculated", assessmentService.recalculate(id));
    }

    @GetMapping("/assessments/pending-enrollments")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<PageResponse<PendingAssessmentEnrollmentResponse>> pending(
            @RequestParam(required = false) String search, @RequestParam(required = false) UUID schoolYearId,
            @RequestParam(required = false) UUID semesterId, @RequestParam(required = false) UUID programId, Pageable pageable) {
        return ApiResponse.success("Pending assessments retrieved", assessmentService.pending(search, schoolYearId, semesterId, programId, pageable));
    }

    @GetMapping("/assessments/{id}/payments")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<java.util.List<PaymentResponse>> payments(@PathVariable UUID id) {
        return ApiResponse.success("Payments retrieved", paymentService.list(id));
    }

    @PostMapping("/assessments/{id}/payments")
    @PreAuthorize("hasAuthority('FINANCE_PAYMENT')")
    public ApiResponse<PaymentResponse> payment(@PathVariable UUID id, @Valid @RequestBody PaymentRequest request,
                                                @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Payment posted", paymentService.post(id, request, user));
    }

    @PostMapping("/assessment-payments/{id}/void")
    @PreAuthorize("hasAuthority('FINANCE_PAYMENT')")
    public ApiResponse<PaymentResponse> voidPayment(@PathVariable UUID id, @Valid @RequestBody PaymentVoidRequest request,
                                                    @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Payment voided", paymentService.voidPayment(id, request.reason(), user));
    }
}
