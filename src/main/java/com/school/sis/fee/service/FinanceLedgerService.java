package com.school.sis.fee.service;

import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.fee.entity.Assessment;
import com.school.sis.fee.entity.AssessmentPayment;
import com.school.sis.fee.entity.AssessmentStatus;
import com.school.sis.fee.entity.PaymentStatus;
import com.school.sis.fee.repository.AssessmentPaymentRepository;
import com.school.sis.fee.repository.AssessmentRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@Service
public class FinanceLedgerService {
    private final AssessmentRepository assessments;
    private final AssessmentPaymentRepository payments;
    private final JdbcTemplate jdbc;

    public FinanceLedgerService(AssessmentRepository assessments, AssessmentPaymentRepository payments, JdbcTemplate jdbc) {
        this.assessments = assessments;
        this.payments = payments;
        this.jdbc = jdbc;
    }

    @Transactional
    public Assessment lock(UUID assessmentId) {
        Assessment assessment = assessments.findByIdForUpdate(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found"));
        if (assessment.isRequiresFinanceReview()) {
            throw new BusinessRuleException("FINANCE_REVIEW_REQUIRED", "This legacy finance record requires manager review before new transactions can be posted");
        }
        return assessment;
    }

    @Transactional
    public Assessment recompute(Assessment assessment) {
        BigDecimal grossPaid = payments.findByAssessmentIdAndStatus(assessment.getId(), PaymentStatus.POSTED).stream()
                .map(AssessmentPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal adjustment = decimal("""
                select coalesce(sum(signed_amount), 0) from assessment_adjustments
                where assessment_id = ? and status = 'APPROVED'
                """, assessment.getId());
        BigDecimal refunded = decimal("""
                select coalesce(sum(case when reversed_refund_id is null then amount else -amount end), 0)
                from assessment_refunds where assessment_id = ? and status = 'DISBURSED'
                """, assessment.getId()).max(BigDecimal.ZERO);
        BigDecimal discounts = decimal("""
                select coalesce(sum(abs(signed_amount)), 0) from assessment_adjustments
                where assessment_id = ? and status = 'APPROVED'
                  and adjustment_type in ('DISCOUNT','CREDIT_CORRECTION')
                """, assessment.getId());
        BigDecimal penalties = decimal("""
                select coalesce(sum(signed_amount), 0) from assessment_adjustments
                where assessment_id = ? and status = 'APPROVED'
                  and adjustment_type in ('PENALTY','CHARGE_CORRECTION')
                """, assessment.getId()).max(BigDecimal.ZERO);

        BigDecimal total = assessment.getBaseAssessmentAmount().add(adjustment).max(BigDecimal.ZERO);
        BigDecimal netPaid = grossPaid.subtract(refunded).max(BigDecimal.ZERO);
        BigDecimal balance = total.subtract(netPaid).max(BigDecimal.ZERO);
        BigDecimal credit = netPaid.subtract(total).max(BigDecimal.ZERO);

        assessment.setAdjustmentAmount(adjustment);
        assessment.setDiscountAmount(discounts);
        assessment.setPenaltyAmount(penalties);
        assessment.setTotalAssessment(total);
        assessment.setAmountPaid(grossPaid);
        assessment.setRefundedAmount(refunded);
        assessment.setNetPaidAmount(netPaid);
        assessment.setBalance(balance);
        assessment.setCreditBalance(credit);
        assessment.setStatus(deriveStatus(assessment, total, grossPaid, netPaid, credit));
        return assessment;
    }

    public boolean hasFinancialActivity(UUID assessmentId) {
        Integer count = jdbc.queryForObject("""
                select (select count(*) from assessment_payments where assessment_id = ?)
                     + (select count(*) from assessment_adjustments where assessment_id = ?)
                     + (select count(*) from assessment_cancellation_requests where assessment_id = ?)
                """, Integer.class, assessmentId, assessmentId, assessmentId);
        return count != null && count > 0;
    }

    public boolean hasStartedInstallmentPlan(UUID assessmentId) {
        Integer count = jdbc.queryForObject("""
                select count(*) from payment_installment_allocations pia
                join assessment_installments ai on ai.id = pia.installment_id
                join assessment_installment_plans aip on aip.id = ai.plan_id
                join assessment_payments ap on ap.id = pia.payment_id and ap.status = 'POSTED'
                where aip.assessment_id = ?
                """, Integer.class, assessmentId);
        return count != null && count > 0;
    }

    public void regenerateUnstartedInstallmentPlan(Assessment assessment) {
        Map<String, Object> plan = jdbc.query("""
                select id,template_id from assessment_installment_plans
                where assessment_id=? and status='ACTIVE'
                """, rs -> rs.next() ? Map.of("id", rs.getObject(1), "templateId", rs.getObject(2)) : Map.of(), assessment.getId());
        if (plan.isEmpty() || hasStartedInstallmentPlan(assessment.getId())) return;
        UUID planId = UUID.fromString(plan.get("id").toString());
        UUID templateId = UUID.fromString(plan.get("templateId").toString());
        List<Map<String, Object>> lines = jdbc.queryForList("select * from installment_plan_template_lines where template_id=? order by sequence_number", templateId);
        jdbc.update("delete from assessment_installments where plan_id=?", planId);
        BigDecimal allocated = BigDecimal.ZERO;
        for (int index = 0; index < lines.size(); index++) {
            Map<String, Object> line = lines.get(index);
            BigDecimal amount = index == lines.size() - 1 ? assessment.getTotalAssessment().subtract(allocated)
                    : assessment.getTotalAssessment().multiply((BigDecimal) line.get("percentage"))
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            allocated = allocated.add(amount);
            jdbc.update("insert into assessment_installments(id,plan_id,sequence_number,label,due_date,amount) values (?,?,?,?,?,?)",
                    UUID.randomUUID(), planId, line.get("sequence_number"), line.get("label"), line.get("due_date"), amount);
        }
    }

    public boolean financeResolvedForEnrollment(UUID enrollmentId) {
        Optional<Assessment> assessment = assessments.findByEnrollmentId(enrollmentId);
        if (assessment.isEmpty()) return true;
        if (assessment.get().getStatus() != AssessmentStatus.CANCELLED
                && assessment.get().getStatus() != AssessmentStatus.REFUNDED) return false;
        return Boolean.TRUE.equals(jdbc.query("""
                select exists (select 1 from assessment_cancellation_requests
                where assessment_id = ? and status = 'RESOLVED')
                """, rs -> rs.next() && rs.getBoolean(1), assessment.get().getId()));
    }

    private AssessmentStatus deriveStatus(Assessment assessment, BigDecimal total, BigDecimal grossPaid,
                                          BigDecimal netPaid, BigDecimal credit) {
        String cancellation = jdbc.query("""
                select status from assessment_cancellation_requests
                where assessment_id = ? and status in ('REQUESTED','REFUND_REQUIRED','RESOLVED')
                order by requested_at desc limit 1
                """, rs -> rs.next() ? rs.getString(1) : null, assessment.getId());
        if (cancellation != null) {
            if (total.signum() == 0 && netPaid.signum() == 0) {
                AssessmentStatus terminal = grossPaid.signum() == 0 ? AssessmentStatus.CANCELLED : AssessmentStatus.REFUNDED;
                jdbc.update("update assessment_cancellation_requests set status='RESOLVED', resolved_at=now() where assessment_id=? and status in ('REQUESTED','REFUND_REQUIRED')", assessment.getId());
                return terminal;
            }
            if (!"RESOLVED".equals(cancellation)) return AssessmentStatus.CANCEL_PENDING;
        }
        if (assessment.getStatus() == AssessmentStatus.CANCELLED || assessment.getStatus() == AssessmentStatus.REFUNDED) {
            return assessment.getStatus();
        }
        if (credit.signum() > 0) return AssessmentStatus.CREDIT_BALANCE;
        if (total.signum() == 0) return AssessmentStatus.PAID;
        if (netPaid.signum() == 0) return AssessmentStatus.UNPAID;
        if (netPaid.compareTo(total) >= 0) return AssessmentStatus.PAID;
        return AssessmentStatus.PARTIAL;
    }

    private BigDecimal decimal(String sql, UUID assessmentId) {
        BigDecimal value = jdbc.queryForObject(sql, BigDecimal.class, assessmentId);
        return value == null ? BigDecimal.ZERO : value;
    }
}
