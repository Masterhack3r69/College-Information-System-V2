package com.school.sis.fee.repository;

import com.school.sis.fee.entity.AssessmentPayment;
import com.school.sis.fee.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface AssessmentPaymentRepository extends JpaRepository<AssessmentPayment, UUID> {
    boolean existsByOfficialReceiptNumberIgnoreCase(String officialReceiptNumber);
    List<AssessmentPayment> findByAssessmentIdOrderByPaidAtDesc(UUID assessmentId);
    List<AssessmentPayment> findByAssessmentIdAndStatus(UUID assessmentId, PaymentStatus status);
}
