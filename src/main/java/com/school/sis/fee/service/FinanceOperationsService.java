package com.school.sis.fee.service;

import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.fee.dto.FinanceRequests;
import com.school.sis.fee.entity.Assessment;
import com.school.sis.fee.entity.AssessmentPayment;
import com.school.sis.fee.entity.AssessmentStatus;
import com.school.sis.fee.entity.PaymentMethod;
import com.school.sis.fee.entity.PaymentStatus;
import com.school.sis.fee.repository.AssessmentPaymentRepository;
import com.school.sis.fee.repository.AssessmentRepository;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FinanceOperationsService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Manila");
    private static final List<PaymentMethod> METHODS = List.of(PaymentMethod.values());

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AssessmentRepository assessments;
    private final AssessmentPaymentRepository payments;
    private final FinanceLedgerService ledger;
    private final AuditService audit;

    public FinanceOperationsService(JdbcTemplate jdbc, UserRepository users, AssessmentRepository assessments,
                                    AssessmentPaymentRepository payments, FinanceLedgerService ledger, AuditService audit) {
        this.jdbc = jdbc;
        this.users = users;
        this.assessments = assessments;
        this.payments = payments;
        this.ledger = ledger;
        this.audit = audit;
    }

    @Transactional
    public Map<String, Object> createReceiptSeries(FinanceRequests.ReceiptSeries request, SisUserDetails principal) {
        User actor = currentUser(principal);
        if (request.rangeEnd() < request.rangeStart()) {
            throw rule("INVALID_RECEIPT_RANGE", "Receipt range end must be greater than or equal to the start");
        }
        Integer overlaps = jdbc.queryForObject("""
                select count(*) from receipt_series where prefix = ?
                and not (range_end < ? or range_start > ?)
                """, Integer.class, request.prefix().trim(), request.rangeStart(), request.rangeEnd());
        if (overlaps != null && overlaps > 0) throw rule("RECEIPT_RANGE_OVERLAP", "Receipt range overlaps an existing series");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into receipt_series(id,prefix,range_start,range_end,next_number,number_width,assigned_cashier_id,status,created_by)
                values (?,?,?,?,?,?,?,'ACTIVE',?)
                """, id, request.prefix().trim(), request.rangeStart(), request.rangeEnd(), request.rangeStart(),
                request.numberWidth(), request.assignedCashierId(), actor.getId());
        audit.log(actor, "RECEIPT_SERIES_CREATED", "FEE", "ReceiptSeries", id, null,
                Map.of("prefix", request.prefix().trim(), "rangeStart", request.rangeStart(), "rangeEnd", request.rangeEnd(),
                        "cashierId", request.assignedCashierId()));
        return receiptSeries(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> receiptSeries() {
        return jdbc.queryForList("""
                select rs.id,rs.prefix,rs.range_start as "rangeStart",rs.range_end as "rangeEnd",
                       rs.next_number as "nextNumber",rs.number_width as "numberWidth",rs.status,
                       rs.assigned_cashier_id as "assignedCashierId",u.full_name as "assignedCashierName"
                from receipt_series rs join users u on u.id=rs.assigned_cashier_id
                order by rs.created_at desc
                """);
    }

    @Transactional
    public Map<String, Object> setReceiptSeriesStatus(UUID id, String status, SisUserDetails principal) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!List.of("ACTIVE", "INACTIVE").contains(normalized)) throw rule("INVALID_RECEIPT_STATUS", "Receipt status must be ACTIVE or INACTIVE");
        currentUser(principal);
        int changed = jdbc.update("update receipt_series set status=?,updated_at=now() where id=? and status<>'EXHAUSTED'", normalized, id);
        if (changed == 0) throw new NotFoundException("Active receipt series not found");
        audit.log("RECEIPT_SERIES_STATUS_UPDATED", "FEE", "ReceiptSeries", id, null, Map.of("status", normalized));
        return receiptSeries(id);
    }

    @Transactional
    public Map<String, Object> openSession(FinanceRequests.SessionOpen request, SisUserDetails principal) {
        User cashier = currentUser(principal);
        LocalDate businessDate = request.businessDate() == null ? LocalDate.now(BUSINESS_ZONE) : request.businessDate();
        if (!businessDate.equals(LocalDate.now(BUSINESS_ZONE))) {
            throw rule("INVALID_BUSINESS_DATE", "Cashier sessions can only be opened for the current business date");
        }
        Map<String, Object> series = locked("""
                select id,assigned_cashier_id,status,next_number,range_end from receipt_series where id=? for update
                """, request.receiptSeriesId());
        if (!cashier.getId().equals(series.get("assigned_cashier_id"))) throw rule("RECEIPT_SERIES_NOT_ASSIGNED", "Receipt series is not assigned to this cashier");
        if (!"ACTIVE".equals(series.get("status"))) throw rule("RECEIPT_SERIES_INACTIVE", "Receipt series is not active");
        if (((Number) series.get("next_number")).longValue() > ((Number) series.get("range_end")).longValue()) {
            throw rule("RECEIPT_SERIES_EXHAUSTED", "Receipt series is exhausted");
        }
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("insert into cashier_sessions(id,cashier_user_id,receipt_series_id,business_date,status) values (?,?,?,?,'OPEN')",
                    id, cashier.getId(), request.receiptSeriesId(), Date.valueOf(businessDate));
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw rule("CASHIER_SESSION_ALREADY_OPEN", "This cashier already has an open or submitted session");
        }
        for (PaymentMethod method : METHODS) {
            jdbc.update("insert into cashier_session_method_totals(id,session_id,payment_method,expected_amount) values (?,?,?,0)",
                    UUID.randomUUID(), id, method.name());
        }
        audit.log(cashier, "CASHIER_SESSION_OPENED", "FEE", "CashierSession", id, null,
                Map.of("businessDate", businessDate, "receiptSeriesId", request.receiptSeriesId()));
        return session(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> sessions(UUID cashierId, String status, LocalDate date) {
        StringBuilder sql = new StringBuilder("""
                select cs.id,cs.business_date as "businessDate",cs.status,cs.opened_at as "openedAt",
                       cs.submitted_at as "submittedAt",cs.closed_at as "closedAt",cs.variance_reason as "varianceReason",
                       cs.cashier_user_id as "cashierUserId",u.full_name as "cashierName",rs.prefix as "receiptPrefix"
                from cashier_sessions cs join users u on u.id=cs.cashier_user_id join receipt_series rs on rs.id=cs.receipt_series_id where 1=1
                """);
        List<Object> args = new ArrayList<>();
        if (cashierId != null) { sql.append(" and cs.cashier_user_id=?"); args.add(cashierId); }
        if (status != null && !status.isBlank()) { sql.append(" and cs.status=?"); args.add(status.toUpperCase()); }
        if (date != null) { sql.append(" and cs.business_date=?"); args.add(Date.valueOf(date)); }
        sql.append(" order by cs.opened_at desc");
        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> currentSession(SisUserDetails principal) {
        User cashier = currentUser(principal);
        return jdbc.query("select id from cashier_sessions where cashier_user_id=? and status in ('OPEN','SUBMITTED') order by opened_at desc limit 1",
                rs -> rs.next() ? session(UUID.fromString(rs.getString(1))) : Map.of(), cashier.getId());
    }

    @Transactional
    public Map<String, Object> submitSession(UUID id, FinanceRequests.SessionSubmit request, SisUserDetails principal) {
        User cashier = currentUser(principal);
        Map<String, Object> row = locked("select id,cashier_user_id,status from cashier_sessions where id=? for update", id);
        if (!cashier.getId().equals(row.get("cashier_user_id"))) throw rule("CASHIER_SESSION_OWNER_REQUIRED", "Only the session cashier can submit closeout");
        if (!"OPEN".equals(row.get("status"))) throw rule("CASHIER_SESSION_NOT_OPEN", "Only an open session can be submitted");
        recomputeSessionTotals(id);
        BigDecimal totalVariance = BigDecimal.ZERO;
        for (PaymentMethod method : METHODS) {
            BigDecimal declared = request.declaredTotals().getOrDefault(method, BigDecimal.ZERO);
            BigDecimal expected = decimal("select expected_amount from cashier_session_method_totals where session_id=? and payment_method=?", id, method.name());
            BigDecimal variance = declared.subtract(expected);
            totalVariance = totalVariance.add(variance.abs());
            jdbc.update("update cashier_session_method_totals set declared_amount=?,variance_amount=? where session_id=? and payment_method=?",
                    declared, variance, id, method.name());
        }
        if (totalVariance.signum() > 0 && (request.varianceReason() == null || request.varianceReason().isBlank())) {
            throw rule("VARIANCE_REASON_REQUIRED", "A variance explanation is required before closeout submission");
        }
        jdbc.update("update cashier_sessions set status='SUBMITTED',submitted_at=now(),variance_reason=?,updated_at=now() where id=?",
                clean(request.varianceReason()), id);
        audit.log(cashier, "CASHIER_SESSION_SUBMITTED", "FEE", "CashierSession", id, null,
                Map.of("absoluteVariance", totalVariance));
        return session(id);
    }

    @Transactional
    public Map<String, Object> decideSession(UUID id, boolean approve, String reason, SisUserDetails principal) {
        User manager = currentUser(principal);
        Map<String, Object> row = locked("select id,cashier_user_id,status from cashier_sessions where id=? for update", id);
        if (!"SUBMITTED".equals(row.get("status"))) throw rule("CASHIER_SESSION_NOT_SUBMITTED", "Only a submitted session can be decided");
        if (manager.getId().equals(row.get("cashier_user_id"))) throw rule("INDEPENDENT_APPROVAL_REQUIRED", "The session cashier cannot approve their own closeout");
        if (approve) {
            jdbc.update("update cashier_sessions set status='CLOSED',closed_at=now(),closed_by_user_id=?,updated_at=now() where id=?", manager.getId(), id);
        } else {
            jdbc.update("update cashier_sessions set status='OPEN',submitted_at=null,variance_reason=?,updated_at=now() where id=?", reason.trim(), id);
        }
        audit.log(manager, approve ? "CASHIER_SESSION_CLOSED" : "CASHIER_SESSION_REJECTED", "FEE", "CashierSession", id,
                Map.of("status", "SUBMITTED"), Map.of("status", approve ? "CLOSED" : "OPEN", "reason", reason));
        return session(id);
    }

    @Transactional
    public Map<String, Object> reopenSession(UUID id, String reason, SisUserDetails principal) {
        User manager = currentUser(principal);
        Map<String, Object> row = locked("select id,cashier_user_id,business_date,status from cashier_sessions where id=? for update", id);
        if (!"CLOSED".equals(row.get("status"))) throw rule("CASHIER_SESSION_NOT_CLOSED", "Only a closed session can be reopened");
        LocalDate businessDate = ((Date) row.get("business_date")).toLocalDate();
        if (!businessDate.equals(LocalDate.now(BUSINESS_ZONE))) throw rule("CASHIER_SESSION_REOPEN_WINDOW", "Only a session from the current business date can be reopened");
        Integer later = jdbc.queryForObject("select count(*) from cashier_sessions where cashier_user_id=? and opened_at>(select opened_at from cashier_sessions where id=?)",
                Integer.class, row.get("cashier_user_id"), id);
        if (later != null && later > 0) throw rule("CASHIER_SESSION_REOPEN_WINDOW", "A later cashier session already exists");
        jdbc.update("""
                update cashier_sessions set status='OPEN',closed_at=null,closed_by_user_id=null,reopen_reason=?,
                reopened_by_user_id=?,reopened_at=now(),updated_at=now() where id=?
                """, reason.trim(), manager.getId(), id);
        audit.log(manager, "CASHIER_SESSION_REOPENED", "FEE", "CashierSession", id, null, Map.of("reason", reason.trim()));
        return session(id);
    }

    @Transactional
    public ReceiptCheckout checkout(SisUserDetails principal) {
        User cashier = currentUser(principal);
        Map<String, Object> session = locked("""
                select id,receipt_series_id,business_date,status from cashier_sessions
                where cashier_user_id=? and status='OPEN' order by opened_at desc limit 1 for update
                """, cashier.getId());
        LocalDate businessDate = ((Date) session.get("business_date")).toLocalDate();
        if (!businessDate.equals(LocalDate.now(BUSINESS_ZONE))) throw rule("CASHIER_SESSION_REQUIRED", "Open a cashier session for the current business date");
        UUID seriesId = uuid(session.get("receipt_series_id"));
        Map<String, Object> series = locked("select id,prefix,next_number,range_end,number_width,status,assigned_cashier_id from receipt_series where id=? for update", seriesId);
        if (!cashier.getId().equals(series.get("assigned_cashier_id")) || !"ACTIVE".equals(series.get("status"))) {
            throw rule("RECEIPT_SERIES_NOT_ASSIGNED", "The open session does not have an active receipt series assigned to this cashier");
        }
        long next = ((Number) series.get("next_number")).longValue();
        long end = ((Number) series.get("range_end")).longValue();
        if (next > end) throw rule("RECEIPT_SERIES_EXHAUSTED", "Receipt series is exhausted");
        int width = ((Number) series.get("number_width")).intValue();
        String receipt = series.get("prefix") + String.format("%0" + width + "d", next);
        String nextStatus = next == end ? "EXHAUSTED" : "ACTIVE";
        jdbc.update("update receipt_series set next_number=?,status=?,updated_at=now() where id=?", next + 1, nextStatus, seriesId);
        audit.log(cashier, "OFFICIAL_RECEIPT_ALLOCATED", "FEE", "ReceiptSeries", seriesId, null,
                Map.of("officialReceiptNumber", receipt, "sequence", next, "cashierSessionId", session.get("id")));
        return new ReceiptCheckout(uuid(session.get("id")), seriesId, next, receipt);
    }

    @Transactional
    public Map<String, Object> requestVoid(UUID paymentId, FinanceRequests.IdempotentReason request, SisUserDetails principal) {
        User actor = currentUser(principal);
        AssessmentPayment payment = payments.findById(paymentId).orElseThrow(() -> new NotFoundException("Payment not found"));
        if (payment.getStatus() == PaymentStatus.VOIDED) throw rule("PAYMENT_ALREADY_VOIDED", "Payment is already voided");
        Map<String, Object> existing = byRequest("payment_void_requests", request.requestId());
        if (!existing.isEmpty()) return existing;
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into payment_void_requests(id,payment_id,reason,request_id,requested_by_user_id)
                values (?,?,?,?,?)
                """, id, paymentId, request.reason().trim(), request.requestId(), actor.getId());
        audit.log(actor, "PAYMENT_VOID_REQUESTED", "FEE", "PaymentVoidRequest", id, null,
                Map.of("paymentId", paymentId, "reason", request.reason().trim()));
        return voidRequest(id);
    }

    @Transactional
    public Map<String, Object> decideVoid(UUID requestId, FinanceRequests.Decision decision, SisUserDetails principal) {
        User manager = currentUser(principal);
        Map<String, Object> request = locked("select * from payment_void_requests where id=? for update", requestId);
        if (!"REQUESTED".equals(request.get("status"))) return voidRequest(requestId);
        if (manager.getId().equals(request.get("requested_by_user_id"))) throw rule("INDEPENDENT_APPROVAL_REQUIRED", "The requester cannot approve this payment void");
        if (!decision.approve()) {
            jdbc.update("update payment_void_requests set status='REJECTED',decided_by_user_id=?,decided_at=now(),decision_reason=? where id=?",
                    manager.getId(), decision.reason().trim(), requestId);
            audit.log(manager, "PAYMENT_VOID_REJECTED", "FEE", "PaymentVoidRequest", requestId, null, Map.of("reason", decision.reason()));
            return voidRequest(requestId);
        }
        jdbc.update("""
                update payment_void_requests set status='APPROVED',decided_by_user_id=?,decided_at=now(),decision_reason=? where id=?
                """, manager.getId(), decision.reason().trim(), requestId);
        audit.log(manager, "PAYMENT_VOID_APPROVED", "FEE", "PaymentVoidRequest", requestId, null,
                Map.of("reason", decision.reason().trim()));
        return voidRequest(requestId);
    }

    @Transactional
    public Map<String, Object> executeVoid(UUID id, FinanceRequests.IdempotentReason executionRequest, SisUserDetails principal) {
        User cashier = currentUser(principal);
        Map<String, Object> prior = jdbc.query("select id from payment_void_requests where execution_request_id=?",
                rs -> rs.next() ? voidRequest(uuid(rs.getObject(1))) : Map.of(), executionRequest.requestId());
        if (!prior.isEmpty()) return prior;
        Map<String, Object> request = locked("select * from payment_void_requests where id=? for update", id);
        if (!"APPROVED".equals(request.get("status"))) throw rule("PAYMENT_VOID_NOT_APPROVED", "Payment void must be approved before execution");
        UUID paymentId = uuid(request.get("payment_id"));
        AssessmentPayment payment = payments.findById(paymentId).orElseThrow(() -> new NotFoundException("Payment not found"));
        Assessment assessment = ledger.lock(payment.getAssessment().getId());
        ReceiptCheckout execution = requireOpenSession(cashier.getId());
        if (payment.getStatus() == PaymentStatus.VOIDED) throw rule("PAYMENT_ALREADY_VOIDED", "Payment is already voided");
        payment.setStatus(PaymentStatus.VOIDED);
        payment.setVoidReason(String.valueOf(request.get("reason")));
        payment.setVoidedAt(java.time.Instant.now());
        payment.setVoidedBy(cashier);
        payments.saveAndFlush(payment);
        jdbc.update("""
                update payment_void_requests set status='EXECUTED',execution_session_id=?,execution_request_id=? where id=?
                """, execution.sessionId(), executionRequest.requestId(), id);
        ledger.recompute(assessment);
        audit.log(cashier, "PAYMENT_VOIDED", "FEE", "AssessmentPayment", paymentId, Map.of("status", "POSTED"),
                Map.of("status", "VOIDED", "reason", request.get("reason"), "sessionId", execution.sessionId()));
        return voidRequest(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> voidRequests(String status) {
        if (status == null || status.isBlank()) return jdbc.queryForList(voidRequestSelect() + " order by pvr.requested_at desc");
        return jdbc.queryForList(voidRequestSelect() + " where pvr.status=? order by pvr.requested_at desc", status.toUpperCase());
    }

    public record ReceiptCheckout(UUID sessionId, UUID seriesId, long sequence, String officialReceiptNumber) {}

    private ReceiptCheckout requireOpenSession(UUID cashierId) {
        Map<String, Object> row = locked("""
                select id,receipt_series_id from cashier_sessions where cashier_user_id=? and status='OPEN'
                and business_date=? order by opened_at desc limit 1 for update
                """, cashierId, Date.valueOf(LocalDate.now(BUSINESS_ZONE)));
        return new ReceiptCheckout(uuid(row.get("id")), uuid(row.get("receipt_series_id")), 0, null);
    }

    @Transactional
    public void allocatePayment(UUID paymentId, UUID assessmentId, BigDecimal amount) {
        List<Map<String, Object>> installments = jdbc.queryForList("""
                select ai.id,ai.amount,coalesce(sum(case when ap.status='POSTED' then pia.amount else 0 end),0) as paid
                from assessment_installments ai
                join assessment_installment_plans aip on aip.id=ai.plan_id and aip.status='ACTIVE'
                left join payment_installment_allocations pia on pia.installment_id=ai.id
                left join assessment_payments ap on ap.id=pia.payment_id
                where aip.assessment_id=? group by ai.id,ai.amount,ai.sequence_number order by ai.sequence_number
                """, assessmentId);
        BigDecimal remaining = amount;
        for (Map<String, Object> installment : installments) {
            if (remaining.signum() == 0) break;
            BigDecimal due = ((BigDecimal) installment.get("amount")).subtract((BigDecimal) installment.get("paid")).max(BigDecimal.ZERO);
            BigDecimal allocation = remaining.min(due);
            if (allocation.signum() > 0) {
                jdbc.update("insert into payment_installment_allocations(id,payment_id,installment_id,amount) values (?,?,?,?)",
                        UUID.randomUUID(), paymentId, installment.get("id"), allocation);
                remaining = remaining.subtract(allocation);
            }
        }
    }

    @Transactional
    public Map<String, Object> requestAdjustment(UUID assessmentId, FinanceRequests.Adjustment request, SisUserDetails principal) {
        User actor = currentUser(principal);
        ledger.lock(assessmentId);
        Map<String, Object> existing = byRequest("assessment_adjustments", request.requestId());
        if (!existing.isEmpty()) return adjustment(uuid(existing.get("id")));
        BigDecimal signed = switch (request.type()) {
            case PENALTY, CHARGE_CORRECTION -> request.amount();
            case DISCOUNT, CREDIT_CORRECTION -> request.amount().negate();
        };
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into assessment_adjustments(id,assessment_id,adjustment_type,amount,signed_amount,reason,request_id,requested_by_user_id)
                values (?,?,?,?,?,?,?,?)
                """, id, assessmentId, request.type().name(), request.amount(), signed, request.reason().trim(), request.requestId(), actor.getId());
        audit.log(actor, "ASSESSMENT_ADJUSTMENT_REQUESTED", "FEE", "AssessmentAdjustment", id, null,
                Map.of("assessmentId", assessmentId, "type", request.type(), "amount", request.amount()));
        return adjustment(id);
    }

    @Transactional
    public Map<String, Object> requestAdjustmentReversal(UUID adjustmentId, FinanceRequests.IdempotentReason request, SisUserDetails principal) {
        User actor = currentUser(principal);
        Map<String, Object> original = locked("select * from assessment_adjustments where id=? for update", adjustmentId);
        if (!"APPROVED".equals(original.get("status"))) throw rule("ADJUSTMENT_NOT_REVERSIBLE", "Only an approved adjustment can be reversed");
        Integer prior = jdbc.queryForObject("select count(*) from assessment_adjustments where reverses_adjustment_id=? and status in ('REQUESTED','APPROVED')",
                Integer.class, adjustmentId);
        if (prior != null && prior > 0) throw rule("ADJUSTMENT_ALREADY_REVERSED", "This adjustment already has a reversal");
        UUID id = UUID.randomUUID();
        BigDecimal signed = ((BigDecimal) original.get("signed_amount")).negate();
        jdbc.update("""
                insert into assessment_adjustments(id,assessment_id,adjustment_type,amount,signed_amount,reason,request_id,
                requested_by_user_id,reverses_adjustment_id) values (?,?,'REVERSAL',?,?,?,?,?,?)
                """, id, original.get("assessment_id"), ((BigDecimal) original.get("amount")), signed, request.reason().trim(),
                request.requestId(), actor.getId(), adjustmentId);
        audit.log(actor, "ASSESSMENT_ADJUSTMENT_REVERSAL_REQUESTED", "FEE", "AssessmentAdjustment", id, null,
                Map.of("reversesAdjustmentId", adjustmentId));
        return adjustment(id);
    }

    @Transactional
    public Map<String, Object> decideAdjustment(UUID id, FinanceRequests.Decision decision, SisUserDetails principal) {
        User manager = currentUser(principal);
        Map<String, Object> row = locked("select * from assessment_adjustments where id=? for update", id);
        if (!"REQUESTED".equals(row.get("status"))) return adjustment(id);
        if (manager.getId().equals(row.get("requested_by_user_id"))) throw rule("INDEPENDENT_APPROVAL_REQUIRED", "The requester cannot approve this adjustment");
        Assessment assessment = ledger.lock(uuid(row.get("assessment_id")));
        String status = decision.approve() ? "APPROVED" : "REJECTED";
        jdbc.update("update assessment_adjustments set status=?,decided_by_user_id=?,decided_at=now(),decision_reason=? where id=?",
                status, manager.getId(), decision.reason().trim(), id);
        if (decision.approve()) ledger.recompute(assessment);
        audit.log(manager, "ASSESSMENT_ADJUSTMENT_" + status, "FEE", "AssessmentAdjustment", id, null,
                Map.of("reason", decision.reason()));
        return adjustment(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adjustments(UUID assessmentId, String status) {
        String sql = adjustmentSelect() + " where aa.assessment_id=?" + (status == null || status.isBlank() ? "" : " and aa.status=?") + " order by aa.requested_at desc";
        return status == null || status.isBlank() ? jdbc.queryForList(sql, assessmentId) : jdbc.queryForList(sql, assessmentId, status.toUpperCase());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adjustments(String status) {
        String sql = adjustmentSelect() + (status == null || status.isBlank() ? "" : " where aa.status=?") + " order by aa.requested_at desc";
        return status == null || status.isBlank() ? jdbc.queryForList(sql) : jdbc.queryForList(sql, status.toUpperCase());
    }

    @Transactional
    public Map<String, Object> requestCancellation(UUID assessmentId, FinanceRequests.IdempotentReason request, SisUserDetails principal) {
        User actor = currentUser(principal);
        Assessment assessment = ledger.lock(assessmentId);
        if (assessment.getStatus() == AssessmentStatus.CANCELLED || assessment.getStatus() == AssessmentStatus.REFUNDED) {
            throw rule("ASSESSMENT_ALREADY_RESOLVED", "Assessment is already cancelled or refunded");
        }
        Map<String, Object> existing = byRequest("assessment_cancellation_requests", request.requestId());
        if (!existing.isEmpty()) return cancellation(uuid(existing.get("id")));
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into assessment_cancellation_requests(id,assessment_id,reason,request_id,requested_by_user_id)
                values (?,?,?,?,?)
                """, id, assessmentId, request.reason().trim(), request.requestId(), actor.getId());
        assessment.setStatus(AssessmentStatus.CANCEL_PENDING);
        audit.log(actor, "ASSESSMENT_CANCELLATION_REQUESTED", "FEE", "AssessmentCancellationRequest", id, null,
                Map.of("assessmentId", assessmentId, "reason", request.reason()));
        return cancellation(id);
    }

    @Transactional
    public Map<String, Object> decideCancellation(UUID id, FinanceRequests.Decision decision, SisUserDetails principal) {
        User manager = currentUser(principal);
        Map<String, Object> row = locked("select * from assessment_cancellation_requests where id=? for update", id);
        if (!"REQUESTED".equals(row.get("status"))) return cancellation(id);
        if (manager.getId().equals(row.get("requested_by_user_id"))) throw rule("INDEPENDENT_APPROVAL_REQUIRED", "The requester cannot approve this cancellation");
        Assessment assessment = ledger.lock(uuid(row.get("assessment_id")));
        if (!decision.approve()) {
            jdbc.update("update assessment_cancellation_requests set status='REJECTED',decided_by_user_id=?,decided_at=now(),decision_reason=? where id=?",
                    manager.getId(), decision.reason().trim(), id);
            assessment.setStatus(assessment.getNetPaidAmount().signum() == 0 ? AssessmentStatus.UNPAID : AssessmentStatus.PARTIAL);
            ledger.recompute(assessment);
            return cancellation(id);
        }
        UUID adjustmentId = UUID.randomUUID();
        BigDecimal amount = assessment.getTotalAssessment();
        if (amount.signum() > 0) {
            jdbc.update("""
                    insert into assessment_adjustments(id,assessment_id,adjustment_type,amount,signed_amount,reason,status,request_id,
                    requested_by_user_id,requested_at,decided_by_user_id,decided_at,decision_reason)
                    values (?,?,'CANCELLATION_CREDIT',?,?,'Approved assessment cancellation','APPROVED',?,?,now(),?,now(),?)
                    """, adjustmentId, assessment.getId(), amount, amount.negate(), UUID.randomUUID(), row.get("requested_by_user_id"),
                    manager.getId(), decision.reason().trim());
        } else adjustmentId = null;
        String next = assessment.getNetPaidAmount().signum() > 0 ? "REFUND_REQUIRED" : "RESOLVED";
        jdbc.update("""
                update assessment_cancellation_requests set status=?,decided_by_user_id=?,decided_at=now(),decision_reason=?,
                cancellation_adjustment_id=?,resolved_at=case when ?='RESOLVED' then now() else null end where id=?
                """, next, manager.getId(), decision.reason().trim(), adjustmentId, next, id);
        ledger.recompute(assessment);
        audit.log(manager, "ASSESSMENT_CANCELLATION_APPROVED", "FEE", "AssessmentCancellationRequest", id, null,
                Map.of("status", next));
        return cancellation(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> cancellations(String status) {
        String sql = cancellationSelect() + (status == null || status.isBlank() ? "" : " where acr.status=?") + " order by acr.requested_at desc";
        return status == null || status.isBlank() ? jdbc.queryForList(sql) : jdbc.queryForList(sql, status.toUpperCase());
    }

    @Transactional
    public Map<String, Object> requestRefund(UUID assessmentId, FinanceRequests.Refund request, SisUserDetails principal) {
        User actor = currentUser(principal);
        Assessment assessment = ledger.lock(assessmentId);
        Map<String, Object> existing = byRequest("assessment_refunds", request.requestId());
        if (!existing.isEmpty()) return refund(uuid(existing.get("id")));
        if (request.amount().compareTo(assessment.getCreditBalance()) > 0) throw rule("INSUFFICIENT_CREDIT", "Refund cannot exceed the current credit balance");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into assessment_refunds(id,assessment_id,student_id,amount,reason,request_id,requested_by_user_id)
                values (?,?,?,?,?,?,?)
                """, id, assessmentId, assessment.getStudent().getId(), request.amount(), request.reason().trim(), request.requestId(), actor.getId());
        audit.log(actor, "REFUND_REQUESTED", "FEE", "AssessmentRefund", id, null,
                Map.of("assessmentId", assessmentId, "amount", request.amount()));
        return refund(id);
    }

    @Transactional
    public Map<String, Object> requestRefundReversal(UUID refundId, FinanceRequests.IdempotentReason request, SisUserDetails principal) {
        User actor = currentUser(principal);
        Map<String, Object> original = locked("select * from assessment_refunds where id=? for update", refundId);
        if (!"DISBURSED".equals(original.get("status")) || original.get("reversed_refund_id") != null) {
            throw rule("REFUND_NOT_REVERSIBLE", "Only an original disbursed refund can be reversed");
        }
        BigDecimal reversed = decimal("select coalesce(sum(amount),0) from assessment_refunds where reversed_refund_id=? and status in ('APPROVED','DISBURSED')", refundId);
        BigDecimal available = ((BigDecimal) original.get("amount")).subtract(reversed);
        if (available.signum() <= 0) throw rule("REFUND_ALREADY_REVERSED", "Refund has already been fully reversed");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into assessment_refunds(id,assessment_id,student_id,amount,reason,request_id,requested_by_user_id,reversed_refund_id)
                values (?,?,?,?,?,?,?,?)
                """, id, original.get("assessment_id"), original.get("student_id"), available, request.reason().trim(),
                request.requestId(), actor.getId(), refundId);
        audit.log(actor, "REFUND_REVERSAL_REQUESTED", "FEE", "AssessmentRefund", id, null, Map.of("reversedRefundId", refundId));
        return refund(id);
    }

    @Transactional
    public Map<String, Object> decideRefund(UUID id, FinanceRequests.Decision decision, SisUserDetails principal) {
        User manager = currentUser(principal);
        Map<String, Object> row = locked("select * from assessment_refunds where id=? for update", id);
        if (!"REQUESTED".equals(row.get("status"))) return refund(id);
        if (manager.getId().equals(row.get("requested_by_user_id"))) throw rule("INDEPENDENT_APPROVAL_REQUIRED", "The requester cannot approve this refund");
        Assessment assessment = ledger.lock(uuid(row.get("assessment_id")));
        if (decision.approve()) {
            BigDecimal reserved = decimal("""
                    select coalesce(sum(amount),0) from assessment_refunds
                    where assessment_id=? and status='APPROVED' and id<>? and reversed_refund_id is null
                    """, assessment.getId(), id);
            if (row.get("reversed_refund_id") == null && reserved.add((BigDecimal) row.get("amount")).compareTo(assessment.getCreditBalance()) > 0) {
                throw rule("INSUFFICIENT_CREDIT", "Approved refunds would exceed the available credit balance");
            }
        }
        String status = decision.approve() ? "APPROVED" : "REJECTED";
        jdbc.update("update assessment_refunds set status=?,approved_by_user_id=?,approved_at=now(),decision_reason=?,updated_at=now() where id=?",
                status, manager.getId(), decision.reason().trim(), id);
        audit.log(manager, "REFUND_" + status, "FEE", "AssessmentRefund", id, null, Map.of("reason", decision.reason()));
        return refund(id);
    }

    @Transactional
    public Map<String, Object> disburseRefund(UUID id, FinanceRequests.RefundDisbursement request, SisUserDetails principal) {
        User cashier = currentUser(principal);
        Map<String, Object> prior = jdbc.query("select id from assessment_refunds where disbursement_request_id=?", rs -> rs.next() ? refund(uuid(rs.getObject(1))) : Map.of(), request.requestId());
        if (!prior.isEmpty()) return prior;
        Map<String, Object> row = locked("select * from assessment_refunds where id=? for update", id);
        if (!"APPROVED".equals(row.get("status"))) throw rule("REFUND_NOT_APPROVED", "Refund must be approved before disbursement");
        if (cashier.getId().equals(row.get("approved_by_user_id"))) throw rule("INDEPENDENT_DISBURSEMENT_REQUIRED", "The approving manager cannot disburse this refund");
        Assessment assessment = ledger.lock(uuid(row.get("assessment_id")));
        if (row.get("reversed_refund_id") == null && ((BigDecimal) row.get("amount")).compareTo(assessment.getCreditBalance()) > 0) {
            throw rule("INSUFFICIENT_CREDIT", "Approved refund now exceeds the available credit balance");
        }
        ReceiptCheckout session = requireOpenSession(cashier.getId());
        jdbc.update("""
                update assessment_refunds set status='DISBURSED',payment_method=?,external_reference=?,disbursed_by_user_id=?,
                disbursed_at=now(),cashier_session_id=?,disbursement_request_id=?,updated_at=now() where id=?
                """, request.paymentMethod().name(), clean(request.externalReference()), cashier.getId(), session.sessionId(), request.requestId(), id);
        ledger.recompute(assessment);
        audit.log(cashier, row.get("reversed_refund_id") == null ? "REFUND_DISBURSED" : "REFUND_REVERSAL_DISBURSED",
                "FEE", "AssessmentRefund", id, null, Map.of("amount", row.get("amount"), "method", request.paymentMethod()));
        return refund(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> refunds(UUID assessmentId, String status) {
        StringBuilder sql = new StringBuilder(refundSelect()).append(" where 1=1");
        List<Object> args = new ArrayList<>();
        if (assessmentId != null) { sql.append(" and ar.assessment_id=?"); args.add(assessmentId); }
        if (status != null && !status.isBlank()) { sql.append(" and ar.status=?"); args.add(status.toUpperCase()); }
        sql.append(" order by ar.requested_at desc");
        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    @Transactional
    public Map<String, Object> saveTemplate(UUID id, FinanceRequests.Template request, SisUserDetails principal) {
        User actor = currentUser(principal);
        BigDecimal percentage = request.lines().stream().map(FinanceRequests.TemplateLine::percentage).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (percentage.compareTo(new BigDecimal("100.00")) != 0) throw rule("INVALID_INSTALLMENT_PERCENTAGE", "Installment percentages must total exactly 100.00");
        UUID templateId = id == null ? UUID.randomUUID() : id;
        if (id == null) {
            jdbc.update("""
                    insert into installment_plan_templates(id,name,school_year_id,semester_id,status,created_by_user_id)
                    values (?,?,?,?,?,?)
                    """, templateId, request.name().trim(), request.schoolYearId(), request.semesterId(), request.status().toUpperCase(), actor.getId());
        } else {
            int changed = jdbc.update("update installment_plan_templates set name=?,school_year_id=?,semester_id=?,status=?,updated_at=now() where id=?",
                    request.name().trim(), request.schoolYearId(), request.semesterId(), request.status().toUpperCase(), id);
            if (changed == 0) throw new NotFoundException("Installment template not found");
            jdbc.update("delete from installment_plan_template_lines where template_id=?", id);
        }
        for (FinanceRequests.TemplateLine line : request.lines()) {
            jdbc.update("""
                    insert into installment_plan_template_lines(id,template_id,sequence_number,label,due_date,percentage)
                    values (?,?,?,?,?,?)
                    """, UUID.randomUUID(), templateId, line.sequenceNumber(), line.label().trim(), Date.valueOf(line.dueDate()), line.percentage());
        }
        audit.log(actor, id == null ? "INSTALLMENT_TEMPLATE_CREATED" : "INSTALLMENT_TEMPLATE_UPDATED", "FEE", "InstallmentPlanTemplate", templateId,
                null, Map.of("name", request.name(), "lineCount", request.lines().size()));
        return template(templateId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> templates(UUID schoolYearId, UUID semesterId) {
        StringBuilder sql = new StringBuilder("""
                select ipt.id,ipt.name,ipt.school_year_id as "schoolYearId",sy.school_year as "schoolYear",
                ipt.semester_id as "semesterId",s.name as "semesterName",ipt.status,
                (select count(*) from installment_plan_template_lines l where l.template_id=ipt.id) as "lineCount"
                from installment_plan_templates ipt join school_years sy on sy.id=ipt.school_year_id
                join semesters s on s.id=ipt.semester_id where 1=1
                """);
        List<Object> args = new ArrayList<>();
        if (schoolYearId != null) { sql.append(" and ipt.school_year_id=?"); args.add(schoolYearId); }
        if (semesterId != null) { sql.append(" and ipt.semester_id=?"); args.add(semesterId); }
        sql.append(" order by sy.school_year desc,s.sort_order,ipt.name");
        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    @Transactional
    public Map<String, Object> assignPlan(UUID assessmentId, FinanceRequests.PlanAssignment request, SisUserDetails principal) {
        User actor = currentUser(principal);
        Assessment assessment = ledger.lock(assessmentId);
        if (assessment.getAmountPaid().signum() > 0) throw rule("INSTALLMENT_PLAN_STARTED", "Cannot assign an installment plan after payment activity");
        Map<String, Object> template = locked("select * from installment_plan_templates where id=? and status='ACTIVE' for update", request.templateId());
        if (!assessment.getSchoolYear().getId().equals(template.get("school_year_id")) || !assessment.getSemester().getId().equals(template.get("semester_id"))) {
            throw rule("INSTALLMENT_TEMPLATE_TERM_MISMATCH", "Installment template does not match the assessment term");
        }
        Integer existing = jdbc.queryForObject("select count(*) from assessment_installment_plans where assessment_id=?", Integer.class, assessmentId);
        if (existing != null && existing > 0) throw rule("INSTALLMENT_PLAN_ALREADY_ASSIGNED", "Assessment already has an installment plan");
        List<Map<String, Object>> lines = jdbc.queryForList("select * from installment_plan_template_lines where template_id=? order by sequence_number", request.templateId());
        UUID planId = UUID.randomUUID();
        jdbc.update("""
                insert into assessment_installment_plans(id,assessment_id,template_id,assigned_by_user_id,override_reason)
                values (?,?,?,?,?)
                """, planId, assessmentId, request.templateId(), actor.getId(), clean(request.reason()));
        BigDecimal allocated = BigDecimal.ZERO;
        for (int index = 0; index < lines.size(); index++) {
            Map<String, Object> line = lines.get(index);
            BigDecimal amount = index == lines.size() - 1
                    ? assessment.getTotalAssessment().subtract(allocated)
                    : assessment.getTotalAssessment().multiply((BigDecimal) line.get("percentage")).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            allocated = allocated.add(amount);
            jdbc.update("""
                    insert into assessment_installments(id,plan_id,sequence_number,label,due_date,amount) values (?,?,?,?,?,?)
                    """, UUID.randomUUID(), planId, line.get("sequence_number"), line.get("label"), line.get("due_date"), amount);
        }
        audit.log(actor, "INSTALLMENT_PLAN_ASSIGNED", "FEE", "AssessmentInstallmentPlan", planId, null,
                Map.of("assessmentId", assessmentId, "templateId", request.templateId()));
        return plan(assessmentId);
    }

    @Transactional
    public Map<String, Object> overridePlan(UUID assessmentId, FinanceRequests.PlanOverride request, SisUserDetails principal) {
        User actor = currentUser(principal);
        Assessment assessment = ledger.lock(assessmentId);
        BigDecimal total = request.lines().stream().map(FinanceRequests.InstallmentLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(assessment.getTotalAssessment()) != 0) throw rule("INSTALLMENT_TOTAL_MISMATCH", "Installment amounts must equal the assessment total");
        UUID planId = uuid(locked("select id from assessment_installment_plans where assessment_id=? and status='ACTIVE' for update", assessmentId).get("id"));
        for (FinanceRequests.InstallmentLine line : request.lines()) {
            BigDecimal paid = decimal("""
                    select coalesce(sum(pia.amount),0) from payment_installment_allocations pia
                    join assessment_payments ap on ap.id=pia.payment_id and ap.status='POSTED'
                    where pia.installment_id=?
                    """, line.installmentId());
            if (line.amount().compareTo(paid) < 0) throw rule("INSTALLMENT_BELOW_PAID", "Installment amount cannot be lower than its posted allocation");
            int changed = jdbc.update("update assessment_installments set due_date=?,amount=? where id=? and plan_id=?",
                    Date.valueOf(line.dueDate()), line.amount(), line.installmentId(), planId);
            if (changed == 0) throw new NotFoundException("Installment not found in this plan");
        }
        jdbc.update("update assessment_installment_plans set override_reason=?,version=version+1 where id=?", request.reason().trim(), planId);
        audit.log(actor, "INSTALLMENT_PLAN_OVERRIDDEN", "FEE", "AssessmentInstallmentPlan", planId, null,
                Map.of("reason", request.reason()));
        return plan(assessmentId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> plan(UUID assessmentId) {
        Map<String, Object> header = jdbc.query("""
                select aip.id,aip.assessment_id as "assessmentId",aip.template_id as "templateId",aip.status,
                aip.assigned_at as "assignedAt",aip.override_reason as "overrideReason",ipt.name as "templateName"
                from assessment_installment_plans aip left join installment_plan_templates ipt on ipt.id=aip.template_id
                where aip.assessment_id=?
                """, rs -> rs.next() ? row(rs) : new LinkedHashMap<>(), assessmentId);
        if (header.isEmpty()) return header;
        List<Map<String, Object>> lines = jdbc.queryForList("""
                select ai.id,ai.sequence_number as "sequenceNumber",ai.label,ai.due_date as "dueDate",ai.amount,
                coalesce(sum(case when ap.status='POSTED' then pia.amount else 0 end),0) as "paidAmount"
                from assessment_installments ai
                join assessment_installment_plans aip on aip.id=ai.plan_id
                left join payment_installment_allocations pia on pia.installment_id=ai.id
                left join assessment_payments ap on ap.id=pia.payment_id
                where aip.assessment_id=? group by ai.id order by ai.sequence_number
                """, assessmentId);
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        lines.forEach(line -> {
            BigDecimal amount = (BigDecimal) line.get("amount");
            BigDecimal paid = (BigDecimal) line.get("paidAmount");
            LocalDate due = ((Date) line.get("dueDate")).toLocalDate();
            String status = paid.compareTo(amount) >= 0 ? "PAID" : paid.signum() > 0 ? "PARTIAL" : due.isBefore(today) ? "OVERDUE" : "UPCOMING";
            line.put("status", status);
            line.put("balance", amount.subtract(paid).max(BigDecimal.ZERO));
        });
        header.put("installments", lines);
        return header;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.putAll(jdbc.queryForMap("""
                select count(*) as "assessmentCount",coalesce(sum(total_assessment),0) as "totalAssessed",
                coalesce(sum(net_paid_amount),0) as "netCollected",coalesce(sum(balance),0) as "outstandingBalance",
                coalesce(sum(credit_balance),0) as "creditBalance",
                count(*) filter(where status='PARTIAL') as "partialCount",
                count(*) filter(where status='CREDIT_BALANCE') as "creditCount",
                count(*) filter(where status='CANCEL_PENDING') as "cancellationPendingCount"
                from assessments
                """));
        out.put("pendingApprovals", jdbc.queryForMap("""
                select (select count(*) from assessment_adjustments where status='REQUESTED') as adjustments,
                       (select count(*) from assessment_refunds where status='REQUESTED') as refunds,
                       (select count(*) from payment_void_requests where status='REQUESTED') as voids,
                       (select count(*) from assessment_cancellation_requests where status='REQUESTED') as cancellations,
                       (select count(*) from cashier_sessions where status='SUBMITTED') as closeouts
                """));
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> collections(LocalDate from, LocalDate to, UUID cashierId) {
        LocalDate start = from == null ? LocalDate.now(BUSINESS_ZONE) : from;
        LocalDate end = to == null ? start : to;
        String cashierClause = cashierId == null ? "" : " and x.cashier_id=?";
        String sql = """
                select x.business_date as "businessDate",x.cashier_id as "cashierId",u.full_name as "cashierName",x.payment_method as "paymentMethod",
                       sum(x.gross) as "grossPayments",sum(x.voided) as "voidedPayments",sum(x.refunded) as refunds,
                       sum(x.gross-x.voided-x.refunded) as "netCollections"
                from (
                  select cs.business_date,ap.cashier_user_id cashier_id,ap.payment_method,ap.amount gross,0::numeric voided,0::numeric refunded
                  from assessment_payments ap join cashier_sessions cs on cs.id=ap.cashier_session_id where ap.status='POSTED'
                  union all
                  select cs.business_date,cs.cashier_user_id,ap.payment_method,0,ap.amount,0
                  from payment_void_requests pvr join assessment_payments ap on ap.id=pvr.payment_id
                  join cashier_sessions cs on cs.id=pvr.execution_session_id where pvr.status='EXECUTED'
                  union all
                  select cs.business_date,ar.disbursed_by_user_id,ar.payment_method,0,0,
                         case when ar.reversed_refund_id is null then ar.amount else -ar.amount end
                  from assessment_refunds ar join cashier_sessions cs on cs.id=ar.cashier_session_id where ar.status='DISBURSED'
                ) x join users u on u.id=x.cashier_id
                where x.business_date between ? and ?
                """ + cashierClause + " group by x.business_date,x.cashier_id,u.full_name,x.payment_method order by x.business_date desc,u.full_name,x.payment_method";
        return cashierId == null ? jdbc.queryForList(sql, Date.valueOf(start), Date.valueOf(end))
                : jdbc.queryForList(sql, Date.valueOf(start), Date.valueOf(end), cashierId);
    }

    @Transactional
    public void auditExport(String format, LocalDate from, LocalDate to, SisUserDetails principal) {
        User actor = currentUser(principal);
        audit.log(actor, "FINANCE_REPORT_EXPORTED", "FEE", "FinanceCollections", null, null,
                Map.of("format", format, "from", from, "to", to));
    }

    @Transactional
    public void recomputeSessionTotals(UUID sessionId) {
        for (PaymentMethod method : METHODS) {
            BigDecimal gross = decimal("select coalesce(sum(amount),0) from assessment_payments where cashier_session_id=? and status='POSTED' and payment_method=?", sessionId, method.name());
            BigDecimal voided = decimal("""
                    select coalesce(sum(ap.amount),0) from payment_void_requests pvr join assessment_payments ap on ap.id=pvr.payment_id
                    where pvr.execution_session_id=? and pvr.status='EXECUTED' and ap.payment_method=?
                    """, sessionId, method.name());
            BigDecimal refunded = decimal("""
                    select coalesce(sum(case when reversed_refund_id is null then amount else -amount end),0)
                    from assessment_refunds where cashier_session_id=? and status='DISBURSED' and payment_method=?
                    """, sessionId, method.name());
            jdbc.update("update cashier_session_method_totals set expected_amount=? where session_id=? and payment_method=?",
                    gross.subtract(voided).subtract(refunded), sessionId, method.name());
        }
    }

    private Map<String, Object> receiptSeries(UUID id) {
        return one("""
                select rs.id,rs.prefix,rs.range_start as "rangeStart",rs.range_end as "rangeEnd",rs.next_number as "nextNumber",
                rs.number_width as "numberWidth",rs.status,rs.assigned_cashier_id as "assignedCashierId",u.full_name as "assignedCashierName"
                from receipt_series rs join users u on u.id=rs.assigned_cashier_id where rs.id=?
                """, id);
    }

    private Map<String, Object> session(UUID id) {
        Map<String, Object> result = one("""
                select cs.id,cs.business_date as "businessDate",cs.status,cs.opened_at as "openedAt",cs.submitted_at as "submittedAt",
                cs.closed_at as "closedAt",cs.variance_reason as "varianceReason",cs.reopen_reason as "reopenReason",
                cs.cashier_user_id as "cashierUserId",u.full_name as "cashierName",cs.receipt_series_id as "receiptSeriesId",
                rs.prefix as "receiptPrefix",rs.next_number as "nextReceiptNumber",rs.range_end as "receiptRangeEnd"
                from cashier_sessions cs join users u on u.id=cs.cashier_user_id join receipt_series rs on rs.id=cs.receipt_series_id where cs.id=?
                """, id);
        result.put("totals", jdbc.queryForList("""
                select payment_method as "paymentMethod",expected_amount as "expectedAmount",declared_amount as "declaredAmount",
                variance_amount as "varianceAmount" from cashier_session_method_totals where session_id=? order by payment_method
                """, id));
        return result;
    }

    private Map<String, Object> voidRequest(UUID id) { return one(voidRequestSelect() + " where pvr.id=?", id); }
    private String voidRequestSelect() { return """
            select pvr.id,pvr.payment_id as "paymentId",ap.official_receipt_number as "officialReceiptNumber",ap.amount,
            pvr.reason,pvr.status,pvr.requested_at as "requestedAt",pvr.requested_by_user_id as "requestedByUserId",
            requester.full_name as "requestedByName",pvr.decided_at as "decidedAt",manager.full_name as "decidedByName",
            pvr.decision_reason as "decisionReason" from payment_void_requests pvr
            join assessment_payments ap on ap.id=pvr.payment_id join users requester on requester.id=pvr.requested_by_user_id
            left join users manager on manager.id=pvr.decided_by_user_id
            """; }

    private Map<String, Object> adjustment(UUID id) { return one(adjustmentSelect() + " where aa.id=?", id); }
    private String adjustmentSelect() { return """
            select aa.id,aa.assessment_id as "assessmentId",aa.adjustment_type as "type",aa.amount,aa.signed_amount as "signedAmount",
            aa.reason,aa.status,aa.requested_at as "requestedAt",requester.full_name as "requestedByName",
            manager.full_name as "decidedByName",aa.decided_at as "decidedAt",aa.decision_reason as "decisionReason",
            aa.reverses_adjustment_id as "reversesAdjustmentId" from assessment_adjustments aa
            join users requester on requester.id=aa.requested_by_user_id left join users manager on manager.id=aa.decided_by_user_id
            """; }

    private Map<String, Object> cancellation(UUID id) { return one(cancellationSelect() + " where acr.id=?", id); }
    private String cancellationSelect() { return """
            select acr.id,acr.assessment_id as "assessmentId",a.enrollment_id as "enrollmentId",acr.reason,acr.status,
            acr.requested_at as "requestedAt",requester.full_name as "requestedByName",manager.full_name as "decidedByName",
            acr.decided_at as "decidedAt",acr.decision_reason as "decisionReason",acr.resolved_at as "resolvedAt"
            from assessment_cancellation_requests acr join assessments a on a.id=acr.assessment_id
            join users requester on requester.id=acr.requested_by_user_id left join users manager on manager.id=acr.decided_by_user_id
            """; }

    private Map<String, Object> refund(UUID id) { return one(refundSelect() + " where ar.id=?", id); }
    private String refundSelect() { return """
            select ar.id,ar.assessment_id as "assessmentId",ar.student_id as "studentId",ar.amount,ar.reason,ar.status,
            ar.requested_at as "requestedAt",requester.full_name as "requestedByName",approver.full_name as "approvedByName",
            ar.approved_at as "approvedAt",ar.decision_reason as "decisionReason",ar.payment_method as "paymentMethod",
            ar.external_reference as "externalReference",disburser.full_name as "disbursedByName",ar.disbursed_at as "disbursedAt",
            ar.reversed_refund_id as "reversedRefundId" from assessment_refunds ar
            join users requester on requester.id=ar.requested_by_user_id left join users approver on approver.id=ar.approved_by_user_id
            left join users disburser on disburser.id=ar.disbursed_by_user_id
            """; }

    private Map<String, Object> template(UUID id) {
        Map<String, Object> result = one("""
                select ipt.id,ipt.name,ipt.school_year_id as "schoolYearId",sy.school_year as "schoolYear",
                ipt.semester_id as "semesterId",s.name as "semesterName",ipt.status
                from installment_plan_templates ipt join school_years sy on sy.id=ipt.school_year_id
                join semesters s on s.id=ipt.semester_id where ipt.id=?
                """, id);
        result.put("lines", jdbc.queryForList("""
                select id,sequence_number as "sequenceNumber",label,due_date as "dueDate",percentage
                from installment_plan_template_lines where template_id=? order by sequence_number
                """, id));
        return result;
    }

    private Map<String, Object> byRequest(String table, UUID requestId) {
        return jdbc.query("select * from " + table + " where request_id=?", rs -> rs.next() ? row(rs) : new LinkedHashMap<>(), requestId);
    }

    private Map<String, Object> locked(String sql, Object... args) {
        try { return jdbc.queryForMap(sql, args); }
        catch (EmptyResultDataAccessException exception) { throw new NotFoundException("Finance record not found"); }
    }

    private Map<String, Object> one(String sql, Object... args) {
        try { return new LinkedHashMap<>(jdbc.queryForMap(sql, args)); }
        catch (EmptyResultDataAccessException exception) { throw new NotFoundException("Finance record not found"); }
    }

    private Map<String, Object> row(java.sql.ResultSet rs) throws java.sql.SQLException {
        var metadata = rs.getMetaData();
        Map<String, Object> out = new LinkedHashMap<>();
        for (int index = 1; index <= metadata.getColumnCount(); index++) out.put(metadata.getColumnLabel(index), rs.getObject(index));
        return out;
    }

    private BigDecimal decimal(String sql, Object... args) {
        BigDecimal value = jdbc.queryForObject(sql, BigDecimal.class, args);
        return value == null ? BigDecimal.ZERO : value;
    }

    private User currentUser(SisUserDetails principal) {
        if (principal == null) throw rule("AUTHENTICATED_FINANCE_USER_REQUIRED", "Authenticated finance user is required");
        return users.findById(principal.id()).orElseThrow(() -> new NotFoundException("Finance user not found"));
    }

    private UUID uuid(Object value) {
        return value instanceof UUID id ? id : UUID.fromString(String.valueOf(value));
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private BusinessRuleException rule(String code, String message) { return new BusinessRuleException(code, message); }
}
