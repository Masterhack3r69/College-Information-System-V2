package com.school.sis.fee.dto;

import com.school.sis.fee.entity.PaymentMethod;
import com.school.sis.fee.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id, UUID assessmentId, UUID studentId, String officialReceiptNumber,
        BigDecimal amount, PaymentMethod paymentMethod, String externalReference, String remarks,
        Instant paidAt, UUID cashierUserId, String cashierName, PaymentStatus status,
        String voidReason, Instant voidedAt, UUID voidedByUserId, String voidedByName,
        UUID requestId, UUID cashierSessionId, BigDecimal balanceAfter, boolean legacyReceipt
) {}
