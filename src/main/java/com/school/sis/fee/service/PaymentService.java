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
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {
    private final AssessmentRepository assessments;
    private final AssessmentPaymentRepository payments;
    private final UserRepository users;
    private final AuditService audit;

    public PaymentService(AssessmentRepository assessments, AssessmentPaymentRepository payments, UserRepository users, AuditService audit) {
        this.assessments = assessments; this.payments = payments; this.users = users; this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> list(UUID assessmentId) {
        if (!assessments.existsById(assessmentId)) throw new NotFoundException("Assessment not found");
        return payments.findByAssessmentIdOrderByPaidAtDesc(assessmentId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public PaymentResponse post(UUID assessmentId, PaymentRequest request, SisUserDetails principal) {
        Assessment assessment = assessments.findById(assessmentId).orElseThrow(() -> new NotFoundException("Assessment not found"));
        if (assessment.getStatus() == AssessmentStatus.CANCELLED || assessment.getStatus() == AssessmentStatus.REFUNDED) {
            throw new BusinessRuleException("Payments cannot be posted to this assessment");
        }
        String orNumber = request.officialReceiptNumber().trim();
        if (payments.existsByOfficialReceiptNumberIgnoreCase(orNumber)) throw new BusinessRuleException("Official receipt number already exists");
        if (request.amount().compareTo(assessment.getBalance()) > 0) throw new BusinessRuleException("Payment cannot exceed the remaining balance");
        User cashier = currentUser(principal);
        AssessmentPayment payment = new AssessmentPayment();
        payment.setAssessment(assessment); payment.setStudent(assessment.getStudent()); payment.setOfficialReceiptNumber(orNumber);
        payment.setAmount(request.amount()); payment.setPaymentMethod(request.paymentMethod());
        payment.setExternalReference(clean(request.externalReference())); payment.setRemarks(clean(request.remarks())); payment.setCashier(cashier);
        AssessmentPayment saved = payments.save(payment);
        refreshTotals(assessment);
        audit.log(cashier, "PAYMENT_POSTED", "FEE", "AssessmentPayment", saved.getId(), null,
                Map.of("assessmentId", assessmentId, "officialReceiptNumber", orNumber, "amount", saved.getAmount()));
        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse voidPayment(UUID paymentId, String reason, SisUserDetails principal) {
        AssessmentPayment payment = payments.findById(paymentId).orElseThrow(() -> new NotFoundException("Payment not found"));
        if (payment.getStatus() == PaymentStatus.VOIDED) throw new BusinessRuleException("Payment is already voided");
        User user = currentUser(principal);
        payment.setStatus(PaymentStatus.VOIDED); payment.setVoidReason(reason.trim()); payment.setVoidedAt(Instant.now()); payment.setVoidedBy(user);
        refreshTotals(payment.getAssessment());
        audit.log(user, "PAYMENT_VOIDED", "FEE", "AssessmentPayment", paymentId,
                Map.of("status", "POSTED"), Map.of("status", "VOIDED", "reason", reason.trim()));
        return toResponse(payment);
    }

    private void refreshTotals(Assessment assessment) {
        BigDecimal paid = payments.findByAssessmentIdAndStatus(assessment.getId(), PaymentStatus.POSTED).stream()
                .map(AssessmentPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assessment.setAmountPaid(paid);
        assessment.setBalance(assessment.getTotalAssessment().subtract(paid).max(BigDecimal.ZERO));
        assessment.setStatus(paid.signum() == 0 ? AssessmentStatus.UNPAID
                : paid.compareTo(assessment.getTotalAssessment()) >= 0 ? AssessmentStatus.PAID : AssessmentStatus.PARTIAL);
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
                payment.getVoidedBy() == null ? null : payment.getVoidedBy().getFullName());
    }
}
