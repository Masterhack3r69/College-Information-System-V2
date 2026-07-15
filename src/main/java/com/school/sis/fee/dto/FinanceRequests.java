package com.school.sis.fee.dto;

import com.school.sis.fee.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class FinanceRequests {
    private FinanceRequests() {}

    public record ReceiptSeries(@NotBlank String prefix, @Min(1) long rangeStart,
                                @Min(1) long rangeEnd, @Min(1) @Max(18) int numberWidth,
                                @NotNull UUID assignedCashierId) {}

    public record SessionOpen(@NotNull UUID receiptSeriesId, LocalDate businessDate) {}
    public record SessionSubmit(@NotNull Map<PaymentMethod, @DecimalMin("0.00") BigDecimal> declaredTotals,
                                String varianceReason) {}
    public record Reason(@NotBlank String reason) {}
    public record Decision(boolean approve, @NotBlank String reason) {}
    public record IdempotentReason(@NotNull UUID requestId, @NotBlank String reason) {}

    public record Adjustment(@NotNull UUID requestId, @NotNull AdjustmentType type,
                             @NotNull @DecimalMin("0.01") BigDecimal amount, @NotBlank String reason) {}
    public enum AdjustmentType { DISCOUNT, PENALTY, CHARGE_CORRECTION, CREDIT_CORRECTION }

    public record Refund(@NotNull UUID requestId, @NotNull @DecimalMin("0.01") BigDecimal amount,
                         @NotBlank String reason) {}
    public record RefundDisbursement(@NotNull UUID requestId, @NotNull PaymentMethod paymentMethod,
                                     String externalReference) {}

    public record Template(@NotBlank String name, @NotNull UUID schoolYearId, @NotNull UUID semesterId,
                           @NotBlank String status, @NotEmpty @Valid List<TemplateLine> lines) {}
    public record TemplateLine(@Min(1) int sequenceNumber, @NotBlank String label,
                               @NotNull LocalDate dueDate,
                               @NotNull @DecimalMin("0.01") BigDecimal percentage) {}
    public record PlanAssignment(@NotNull UUID templateId, String reason) {}
    public record PlanOverride(@NotBlank String reason, @NotEmpty @Valid List<InstallmentLine> lines) {}
    public record InstallmentLine(@NotNull UUID installmentId, @NotNull LocalDate dueDate,
                                  @NotNull @DecimalMin("0.01") BigDecimal amount) {}
}
