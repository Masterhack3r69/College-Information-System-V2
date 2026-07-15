package com.school.sis.fee.controller;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.response.ApiResponse;
import com.school.sis.fee.dto.FinanceRequests;
import com.school.sis.fee.service.FinanceOperationsService;
import com.school.sis.report.service.ReportService;
import com.school.sis.report.service.PdfReport;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class FinanceController {
    private final FinanceOperationsService finance;
    private final ReportService reports;

    public FinanceController(FinanceOperationsService finance, ReportService reports) {
        this.finance = finance;
        this.reports = reports;
    }

    @GetMapping("/finance/dashboard")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.success("Finance dashboard retrieved", finance.dashboard());
    }

    @GetMapping("/finance/receipt-series")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_RECEIPT_MANAGE')")
    public ApiResponse<List<Map<String, Object>>> receiptSeries() {
        return ApiResponse.success("Receipt series retrieved", finance.receiptSeries());
    }

    @PostMapping("/finance/receipt-series")
    @PreAuthorize("hasAuthority('FINANCE_RECEIPT_MANAGE')")
    public ApiResponse<Map<String, Object>> createReceiptSeries(@Valid @RequestBody FinanceRequests.ReceiptSeries request,
                                                                @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Receipt series created", finance.createReceiptSeries(request, user));
    }

    @PatchMapping("/finance/receipt-series/{id}/status")
    @PreAuthorize("hasAuthority('FINANCE_RECEIPT_MANAGE')")
    public ApiResponse<Map<String, Object>> receiptStatus(@PathVariable UUID id, @RequestBody Map<String, String> body,
                                                          @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Receipt series updated", finance.setReceiptSeriesStatus(id, body.get("status"), user));
    }

    @GetMapping("/finance/cashier-sessions")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_SESSION_OPERATE','FINANCE_SESSION_APPROVE')")
    public ApiResponse<List<Map<String, Object>>> sessions(@RequestParam(required = false) UUID cashierId,
                                                           @RequestParam(required = false) String status,
                                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.success("Cashier sessions retrieved", finance.sessions(cashierId, status, date));
    }

    @GetMapping("/finance/cashier-sessions/current")
    @PreAuthorize("hasAuthority('FINANCE_SESSION_OPERATE')")
    public ApiResponse<Map<String, Object>> currentSession(@AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Current cashier session retrieved", finance.currentSession(user));
    }

    @PostMapping("/finance/cashier-sessions")
    @PreAuthorize("hasAuthority('FINANCE_SESSION_OPERATE')")
    public ApiResponse<Map<String, Object>> openSession(@Valid @RequestBody FinanceRequests.SessionOpen request,
                                                        @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Cashier session opened", finance.openSession(request, user));
    }

    @PostMapping("/finance/cashier-sessions/{id}/submit")
    @PreAuthorize("hasAuthority('FINANCE_SESSION_OPERATE')")
    public ApiResponse<Map<String, Object>> submitSession(@PathVariable UUID id,
                                                          @Valid @RequestBody FinanceRequests.SessionSubmit request,
                                                          @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Cashier session submitted", finance.submitSession(id, request, user));
    }

    @PostMapping("/finance/cashier-sessions/{id}/decision")
    @PreAuthorize("hasAuthority('FINANCE_SESSION_APPROVE')")
    public ApiResponse<Map<String, Object>> decideSession(@PathVariable UUID id,
                                                          @Valid @RequestBody FinanceRequests.Decision request,
                                                          @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Cashier session decision recorded", finance.decideSession(id, request.approve(), request.reason(), user));
    }

    @PostMapping("/finance/cashier-sessions/{id}/reopen")
    @PreAuthorize("hasAuthority('FINANCE_SESSION_APPROVE')")
    public ApiResponse<Map<String, Object>> reopenSession(@PathVariable UUID id,
                                                          @Valid @RequestBody FinanceRequests.Reason request,
                                                          @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Cashier session reopened", finance.reopenSession(id, request.reason(), user));
    }

    @PostMapping("/assessment-payments/{id}/void")
    @PreAuthorize("hasAuthority('FINANCE_VOID_REQUEST')")
    public ApiResponse<Map<String, Object>> requestVoid(@PathVariable UUID id,
                                                        @Valid @RequestBody FinanceRequests.IdempotentReason request,
                                                        @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Payment void requested", finance.requestVoid(id, request, user));
    }

    @GetMapping("/finance/payment-void-requests")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_VOID_APPROVE')")
    public ApiResponse<List<Map<String, Object>>> voidRequests(@RequestParam(required = false) String status) {
        return ApiResponse.success("Payment void requests retrieved", finance.voidRequests(status));
    }

    @PostMapping("/finance/payment-void-requests/{id}/decision")
    @PreAuthorize("hasAuthority('FINANCE_VOID_APPROVE')")
    public ApiResponse<Map<String, Object>> decideVoid(@PathVariable UUID id,
                                                       @Valid @RequestBody FinanceRequests.Decision request,
                                                       @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Payment void decision recorded", finance.decideVoid(id, request, user));
    }

    @PostMapping("/finance/payment-void-requests/{id}/execute")
    @PreAuthorize("hasAuthority('FINANCE_SESSION_OPERATE')")
    public ApiResponse<Map<String, Object>> executeVoid(@PathVariable UUID id,
                                                        @Valid @RequestBody FinanceRequests.IdempotentReason request,
                                                        @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Payment void executed", finance.executeVoid(id, request, user));
    }

    @GetMapping("/assessments/{id}/adjustments")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<List<Map<String, Object>>> adjustments(@PathVariable UUID id, @RequestParam(required = false) String status) {
        return ApiResponse.success("Adjustments retrieved", finance.adjustments(id, status));
    }

    @GetMapping("/finance/adjustments")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_ADJUSTMENT_APPROVE')")
    public ApiResponse<List<Map<String, Object>>> adjustments(@RequestParam(required = false) String status) {
        return ApiResponse.success("Adjustments retrieved", finance.adjustments(status));
    }

    @PostMapping("/assessments/{id}/adjustments")
    @PreAuthorize("hasAuthority('FINANCE_ADJUSTMENT_REQUEST')")
    public ApiResponse<Map<String, Object>> requestAdjustment(@PathVariable UUID id,
                                                              @Valid @RequestBody FinanceRequests.Adjustment request,
                                                              @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Adjustment requested", finance.requestAdjustment(id, request, user));
    }

    @PostMapping("/finance/adjustments/{id}/decision")
    @PreAuthorize("hasAuthority('FINANCE_ADJUSTMENT_APPROVE')")
    public ApiResponse<Map<String, Object>> decideAdjustment(@PathVariable UUID id,
                                                             @Valid @RequestBody FinanceRequests.Decision request,
                                                             @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Adjustment decision recorded", finance.decideAdjustment(id, request, user));
    }

    @PostMapping("/finance/adjustments/{id}/reversal")
    @PreAuthorize("hasAuthority('FINANCE_ADJUSTMENT_REQUEST')")
    public ApiResponse<Map<String, Object>> reverseAdjustment(@PathVariable UUID id,
                                                              @Valid @RequestBody FinanceRequests.IdempotentReason request,
                                                              @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Adjustment reversal requested", finance.requestAdjustmentReversal(id, request, user));
    }

    @PostMapping("/assessments/{id}/cancellation-requests")
    @PreAuthorize("hasAuthority('FINANCE_ADJUSTMENT_REQUEST')")
    public ApiResponse<Map<String, Object>> requestCancellation(@PathVariable UUID id,
                                                                @Valid @RequestBody FinanceRequests.IdempotentReason request,
                                                                @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Assessment cancellation requested", finance.requestCancellation(id, request, user));
    }

    @GetMapping("/finance/cancellation-requests")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_ADJUSTMENT_APPROVE')")
    public ApiResponse<List<Map<String, Object>>> cancellations(@RequestParam(required = false) String status) {
        return ApiResponse.success("Assessment cancellation requests retrieved", finance.cancellations(status));
    }

    @PostMapping("/finance/cancellation-requests/{id}/decision")
    @PreAuthorize("hasAuthority('FINANCE_ADJUSTMENT_APPROVE')")
    public ApiResponse<Map<String, Object>> decideCancellation(@PathVariable UUID id,
                                                               @Valid @RequestBody FinanceRequests.Decision request,
                                                               @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Assessment cancellation decision recorded", finance.decideCancellation(id, request, user));
    }

    @GetMapping("/finance/refunds")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_REFUND_APPROVE')")
    public ApiResponse<List<Map<String, Object>>> refunds(@RequestParam(required = false) UUID assessmentId,
                                                          @RequestParam(required = false) String status) {
        return ApiResponse.success("Refunds retrieved", finance.refunds(assessmentId, status));
    }

    @PostMapping("/assessments/{id}/refunds")
    @PreAuthorize("hasAuthority('FINANCE_REFUND_REQUEST')")
    public ApiResponse<Map<String, Object>> requestRefund(@PathVariable UUID id,
                                                          @Valid @RequestBody FinanceRequests.Refund request,
                                                          @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Refund requested", finance.requestRefund(id, request, user));
    }

    @PostMapping("/finance/refunds/{id}/decision")
    @PreAuthorize("hasAuthority('FINANCE_REFUND_APPROVE')")
    public ApiResponse<Map<String, Object>> decideRefund(@PathVariable UUID id,
                                                         @Valid @RequestBody FinanceRequests.Decision request,
                                                         @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Refund decision recorded", finance.decideRefund(id, request, user));
    }

    @PostMapping("/finance/refunds/{id}/disburse")
    @PreAuthorize("hasAuthority('FINANCE_REFUND_DISBURSE')")
    public ApiResponse<Map<String, Object>> disburseRefund(@PathVariable UUID id,
                                                           @Valid @RequestBody FinanceRequests.RefundDisbursement request,
                                                           @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Refund disbursed", finance.disburseRefund(id, request, user));
    }

    @PostMapping("/finance/refunds/{id}/reversal")
    @PreAuthorize("hasAuthority('FINANCE_REFUND_REQUEST')")
    public ApiResponse<Map<String, Object>> reverseRefund(@PathVariable UUID id,
                                                          @Valid @RequestBody FinanceRequests.IdempotentReason request,
                                                          @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Refund reversal requested", finance.requestRefundReversal(id, request, user));
    }

    @GetMapping("/finance/installment-templates")
    @PreAuthorize("hasAnyAuthority('FINANCE_VIEW','FINANCE_INSTALLMENT_MANAGE')")
    public ApiResponse<List<Map<String, Object>>> templates(@RequestParam(required = false) UUID schoolYearId,
                                                            @RequestParam(required = false) UUID semesterId) {
        return ApiResponse.success("Installment templates retrieved", finance.templates(schoolYearId, semesterId));
    }

    @PostMapping("/finance/installment-templates")
    @PreAuthorize("hasAuthority('FINANCE_INSTALLMENT_MANAGE')")
    public ApiResponse<Map<String, Object>> createTemplate(@Valid @RequestBody FinanceRequests.Template request,
                                                           @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Installment template created", finance.saveTemplate(null, request, user));
    }

    @PutMapping("/finance/installment-templates/{id}")
    @PreAuthorize("hasAuthority('FINANCE_INSTALLMENT_MANAGE')")
    public ApiResponse<Map<String, Object>> updateTemplate(@PathVariable UUID id,
                                                           @Valid @RequestBody FinanceRequests.Template request,
                                                           @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Installment template updated", finance.saveTemplate(id, request, user));
    }

    @GetMapping("/assessments/{id}/installment-plan")
    @PreAuthorize("hasAuthority('FINANCE_VIEW')")
    public ApiResponse<Map<String, Object>> plan(@PathVariable UUID id) {
        return ApiResponse.success("Installment plan retrieved", finance.plan(id));
    }

    @PostMapping("/assessments/{id}/installment-plan")
    @PreAuthorize("hasAuthority('FINANCE_INSTALLMENT_MANAGE')")
    public ApiResponse<Map<String, Object>> assignPlan(@PathVariable UUID id,
                                                       @Valid @RequestBody FinanceRequests.PlanAssignment request,
                                                       @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Installment plan assigned", finance.assignPlan(id, request, user));
    }

    @PutMapping("/assessments/{id}/installment-plan")
    @PreAuthorize("hasAuthority('FINANCE_INSTALLMENT_MANAGE')")
    public ApiResponse<Map<String, Object>> overridePlan(@PathVariable UUID id,
                                                         @Valid @RequestBody FinanceRequests.PlanOverride request,
                                                         @AuthenticationPrincipal SisUserDetails user) {
        return ApiResponse.success("Installment plan overridden", finance.overridePlan(id, request, user));
    }

    @GetMapping("/finance/reports/collections")
    @PreAuthorize("hasAuthority('FINANCE_REPORT')")
    public ApiResponse<List<Map<String, Object>>> collections(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID cashierId) {
        return ApiResponse.success("Collections retrieved", finance.collections(from, to, cashierId));
    }

    @GetMapping(value = "/finance/reports/collections.csv", produces = "text/csv")
    @PreAuthorize("hasAuthority('FINANCE_REPORT')")
    public ResponseEntity<byte[]> collectionsCsv(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID cashierId,
            @AuthenticationPrincipal SisUserDetails user) {
        List<Map<String, Object>> rows = finance.collections(from, to, cashierId);
        finance.auditExport("CSV", from, to, user);
        StringBuilder csv = new StringBuilder("businessDate,cashier,paymentMethod,payments,voids,refunds,netCollections\n");
        for (Map<String, Object> row : rows) {
            csv.append(value(row, "businessDate")).append(',')
                    .append(csvValue(value(row, "cashierName"))).append(',')
                    .append(value(row, "paymentMethod")).append(',')
                    .append(value(row, "grossPayments")).append(',')
                    .append(value(row, "voidedPayments")).append(',')
                    .append(value(row, "refunds")).append(',')
                    .append(value(row, "netCollections")).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=finance-collections-" + from + "-" + to + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping(value = "/finance/reports/collections.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAuthority('FINANCE_REPORT')")
    public ResponseEntity<byte[]> collectionsPdf(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID cashierId,
            @AuthenticationPrincipal SisUserDetails user) {
        PdfReport report = reports.financeCollections(from, to, cashierId, user);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + report.filename())
                .contentType(MediaType.APPLICATION_PDF).body(report.bytes());
    }

    private Object value(Map<String, Object> row, String key) {
        return row.containsKey(key) ? row.get(key) : row.get(key.toLowerCase());
    }

    private String csvValue(Object value) {
        String text = value == null ? "" : value.toString();
        return '"' + text.replace("\"", "\"\"") + '"';
    }
}
