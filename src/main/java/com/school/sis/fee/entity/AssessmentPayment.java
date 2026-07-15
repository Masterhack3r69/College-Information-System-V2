package com.school.sis.fee.entity;

import com.school.sis.auth.entity.User;
import com.school.sis.common.audit.AuditableEntity;
import com.school.sis.student.entity.Student;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_payments")
public class AssessmentPayment extends AuditableEntity {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "assessment_id") private Assessment assessment;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "student_id") private Student student;
    @Column(name = "official_receipt_number", nullable = false, unique = true, length = 80) private String officialReceiptNumber;
    @Column(nullable = false) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(name = "payment_method", nullable = false) private PaymentMethod paymentMethod;
    @Column(name = "external_reference", length = 120) private String externalReference;
    private String remarks;
    @Column(name = "paid_at", nullable = false) private Instant paidAt;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cashier_user_id") private User cashier;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PaymentStatus status = PaymentStatus.POSTED;
    @Column(name = "void_reason") private String voidReason;
    @Column(name = "voided_at") private Instant voidedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "voided_by_user_id") private User voidedBy;
    @Column(name = "request_id") private UUID requestId;
    @Column(name = "cashier_session_id") private UUID cashierSessionId;
    @Column(name = "receipt_series_id") private UUID receiptSeriesId;
    @Column(name = "receipt_sequence") private Long receiptSequence;
    @Column(name = "balance_after") private BigDecimal balanceAfter;
    @Column(name = "legacy_receipt", nullable = false) private boolean legacyReceipt = true;

    @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID(); if (paidAt == null) paidAt = Instant.now(); }
    public UUID getId() { return id; }
    public Assessment getAssessment() { return assessment; }
    public void setAssessment(Assessment assessment) { this.assessment = assessment; }
    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }
    public String getOfficialReceiptNumber() { return officialReceiptNumber; }
    public void setOfficialReceiptNumber(String value) { officialReceiptNumber = value; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod value) { paymentMethod = value; }
    public String getExternalReference() { return externalReference; }
    public void setExternalReference(String value) { externalReference = value; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public Instant getPaidAt() { return paidAt; }
    public User getCashier() { return cashier; }
    public void setCashier(User cashier) { this.cashier = cashier; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public String getVoidReason() { return voidReason; }
    public void setVoidReason(String value) { voidReason = value; }
    public Instant getVoidedAt() { return voidedAt; }
    public void setVoidedAt(Instant value) { voidedAt = value; }
    public User getVoidedBy() { return voidedBy; }
    public void setVoidedBy(User value) { voidedBy = value; }
    public UUID getRequestId() { return requestId; }
    public void setRequestId(UUID value) { requestId = value; }
    public UUID getCashierSessionId() { return cashierSessionId; }
    public void setCashierSessionId(UUID value) { cashierSessionId = value; }
    public UUID getReceiptSeriesId() { return receiptSeriesId; }
    public void setReceiptSeriesId(UUID value) { receiptSeriesId = value; }
    public Long getReceiptSequence() { return receiptSequence; }
    public void setReceiptSequence(Long value) { receiptSequence = value; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal value) { balanceAfter = value; }
    public boolean isLegacyReceipt() { return legacyReceipt; }
    public void setLegacyReceipt(boolean value) { legacyReceipt = value; }
}
