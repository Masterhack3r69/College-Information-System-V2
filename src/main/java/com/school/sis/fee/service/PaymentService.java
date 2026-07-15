package com.school.sis.fee.service;

import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.audit.service.AuditService;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.fee.dto.PaymentRequest;
import com.school.sis.fee.dto.PaymentResponse;
import com.school.sis.fee.entity.*;
import com.school.sis.fee.repository.AssessmentPaymentRepository;
import com.school.sis.fee.repository.AssessmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {
    private final AssessmentRepository assessments;
    private final AssessmentPaymentRepository payments;
    private final UserRepository users;
    private final AuditService audit;
    private final FinanceLedgerService ledger;
    private final FinanceOperationsService operations;

    public PaymentService(AssessmentRepository assessments, AssessmentPaymentRepository payments, UserRepository users, AuditService audit,
                          FinanceLedgerService ledger, FinanceOperationsService operations) {
        this.assessments = assessments; this.payments = payments; this.users = users; this.audit = audit;
        this.ledger = ledger; this.operations = operations;
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> list(UUID assessmentId) {
        if (!assessments.existsById(assessmentId)) throw new NotFoundException("Assessment not found");
        return payments.findByAssessmentIdOrderByPaidAtDesc(assessmentId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public PaymentResponse post(UUID assessmentId, PaymentRequest request, SisUserDetails principal) {
        var existing = payments.findByRequestId(request.requestId());
        if (existing.isPresent()) return toResponse(existing.get());
        Assessment assessment = ledger.lock(assessmentId);
        existing = payments.findByRequestId(request.requestId());
        if (existing.isPresent()) return toResponse(existing.get());
        if (assessment.getStatus() == AssessmentStatus.CANCELLED || assessment.getStatus() == AssessmentStatus.REFUNDED
                || assessment.getStatus() == AssessmentStatus.CANCEL_PENDING || assessment.getStatus() == AssessmentStatus.CREDIT_BALANCE) {
            throw new BusinessRuleException("Payments cannot be posted to this assessment");
        }
        if (request.amount().compareTo(assessment.getBalance()) > 0) throw new BusinessRuleException("Payment cannot exceed the remaining balance");
        User cashier = currentUser(principal);
        FinanceOperationsService.ReceiptCheckout checkout = operations.checkout(principal);
        AssessmentPayment payment = new AssessmentPayment();
        payment.setAssessment(assessment); payment.setStudent(assessment.getStudent()); payment.setOfficialReceiptNumber(checkout.officialReceiptNumber());
        payment.setAmount(request.amount()); payment.setPaymentMethod(request.paymentMethod());
        payment.setExternalReference(clean(request.externalReference())); payment.setRemarks(clean(request.remarks())); payment.setCashier(cashier);
        payment.setRequestId(request.requestId()); payment.setCashierSessionId(checkout.sessionId()); payment.setReceiptSeriesId(checkout.seriesId());
        payment.setReceiptSequence(checkout.sequence()); payment.setLegacyReceipt(false);
        AssessmentPayment saved = payments.saveAndFlush(payment);
        operations.allocatePayment(saved.getId(), assessmentId, saved.getAmount());
        ledger.recompute(assessment);
        saved.setBalanceAfter(assessment.getBalance());
        payments.saveAndFlush(saved);
        audit.log(cashier, "PAYMENT_POSTED", "FEE", "AssessmentPayment", saved.getId(), null,
                Map.of("assessmentId", assessmentId, "officialReceiptNumber", saved.getOfficialReceiptNumber(), "amount", saved.getAmount(),
                        "cashierSessionId", checkout.sessionId()));
        return toResponse(saved);
    }

    private User currentUser(SisUserDetails principal) {
        if (principal == null) throw new BusinessRuleException("Authenticated cashier is required");
        return users.findById(principal.id()).orElseThrow(() -> new NotFoundException("Cashier user not found"));
    }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    public PaymentResponse toResponse(AssessmentPayment payment) {
        return new PaymentResponse(payment.getId(), payment.getAssessment().getId(), payment.getStudent().getId(),
                payment.getOfficialReceiptNumber(), payment.getAmount(), payment.getPaymentMethod(), payment.getExternalReference(), payment.getRemarks(),
                payment.getPaidAt(), payment.getCashier().getId(), payment.getCashier().getFullName(), payment.getStatus(), payment.getVoidReason(),
                payment.getVoidedAt(), payment.getVoidedBy() == null ? null : payment.getVoidedBy().getId(),
                payment.getVoidedBy() == null ? null : payment.getVoidedBy().getFullName(), payment.getRequestId(),
                payment.getCashierSessionId(), payment.getBalanceAfter(), payment.isLegacyReceipt());
    }
}
