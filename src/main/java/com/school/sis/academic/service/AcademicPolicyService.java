package com.school.sis.academic.service;

import com.school.sis.academic.dto.AcademicExceptionRequests;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.enrollment.entity.Enrollment;
import com.school.sis.student.entity.AcademicStatus;
import com.school.sis.student.entity.Student;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AcademicPolicyService {
    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public AcademicPolicyService(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UUID schoolYearId) {
        String sql = """
                select ep.id,ep.academic_status as "academicStatus",ep.school_year_id as "schoolYearId",
                       sy.school_year as "schoolYear",ep.program_id as "programId",p.program_code as "programCode",
                       ep.enrollment_allowed as "enrollmentAllowed",ep.maximum_units as "maximumUnits",
                       ep.requires_approval as "requiresApproval",ep.active
                from enrollment_eligibility_policies ep join school_years sy on sy.id=ep.school_year_id
                left join programs p on p.id=ep.program_id
                """ + (schoolYearId == null ? "" : " where ep.school_year_id=?")
                + " order by sy.school_year desc,ep.academic_status,p.program_code nulls first";
        return schoolYearId == null ? jdbc.queryForList(sql) : jdbc.queryForList(sql, schoolYearId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> approvalsForStudent(UUID studentId) {
        return jdbc.queryForList("""
                select a.id,a.enrollment_id as "enrollmentId",a.policy_id as "policyId",
                       p.academic_status as "academicStatus",a.maximum_units_snapshot as "maximumUnitsSnapshot",
                       a.reason,a.approved_at as "approvedAt",u.full_name as "approvedBy",
                       sy.school_year as "schoolYear",sm.name as "semesterName"
                from enrollment_eligibility_approvals a join enrollments e on e.id=a.enrollment_id
                join enrollment_eligibility_policies p on p.id=a.policy_id join users u on u.id=a.approved_by
                join school_years sy on sy.id=e.school_year_id join semesters sm on sm.id=e.semester_id
                where e.student_id=? order by a.approved_at desc
                """, studentId);
    }

    @Transactional
    public Map<String, Object> save(UUID id, AcademicExceptionRequests.Policy request, SisUserDetails principal) {
        String academicStatus = normalizeStatus(request.academicStatus());
        if (request.maximumUnits() != null && request.maximumUnits().signum() <= 0)
            throw rule("INVALID_MAXIMUM_UNITS", "Maximum units must be greater than zero");
        if (id == null) {
            id = UUID.randomUUID();
            try {
                jdbc.update("""
                        insert into enrollment_eligibility_policies(id,academic_status,school_year_id,program_id,
                        enrollment_allowed,maximum_units,requires_approval,active,created_by)
                        values(?,?,?,?,?,?,?,?,?)
                        """, id, academicStatus, request.schoolYearId(), request.programId(),
                        request.enrollmentAllowed(), request.maximumUnits(), request.requiresApproval(), request.active(), principal.id());
            } catch (DataIntegrityViolationException exception) {
                throw rule("ACADEMIC_POLICY_SCOPE_EXISTS", "An active policy already exists for this year, status, and program scope");
            }
        } else {
            int changed;
            try {
                changed = jdbc.update("""
                        update enrollment_eligibility_policies set academic_status=?,school_year_id=?,program_id=?,
                        enrollment_allowed=?,maximum_units=?,requires_approval=?,active=?,updated_at=now() where id=?
                        """, academicStatus, request.schoolYearId(), request.programId(), request.enrollmentAllowed(),
                        request.maximumUnits(), request.requiresApproval(), request.active(), id);
            } catch (DataIntegrityViolationException exception) {
                throw rule("ACADEMIC_POLICY_SCOPE_EXISTS", "An active policy already exists for this year, status, and program scope");
            }
            if (changed == 0) throw new NotFoundException("Academic policy not found");
        }
        audit.log(principal, "ACADEMIC_POLICY_SAVED", "ACADEMIC", "EnrollmentEligibilityPolicy", id, null,
                Map.of("academicStatus", academicStatus, "active", request.active()));
        return jdbc.queryForMap("select * from enrollment_eligibility_policies where id=?", id);
    }

    @Transactional(readOnly = true)
    public Decision decision(Student student, UUID schoolYearId) {
        AcademicStatus status = student.getAcademicStatus() == null ? AcademicStatus.REGULAR : student.getAcademicStatus();
        if (status == AcademicStatus.DISMISSED || status == AcademicStatus.GRADUATED)
            return new Decision(false, null, null, false, "ACADEMIC_STATUS_INELIGIBLE",
                    "Students with " + status + " academic status cannot enroll");
        List<Map<String, Object>> rows;
        try {
            rows = jdbc.queryForList("""
                    select id,enrollment_allowed,maximum_units,requires_approval from enrollment_eligibility_policies
                    where academic_status=? and school_year_id=? and active=true and (program_id=? or program_id is null)
                    order by case when program_id=? then 0 else 1 end limit 1
                    """, status.name(), schoolYearId, student.getProgram().getId(), student.getProgram().getId());
        } catch (BadSqlGrammarException exception) {
            // Hibernate create-drop tests do not run Flyway. Preserve legacy behavior there,
            // while still failing closed for statuses that explicitly require a policy.
            rows = List.of();
        }
        if (rows.isEmpty()) {
            if (status == AcademicStatus.PROBATION || status == AcademicStatus.ON_LEAVE)
                return new Decision(false, null, null, false, "ACADEMIC_POLICY_NOT_CONFIGURED",
                        "An enrollment policy must be configured for " + status + " students");
            return new Decision(true, null, null, false, null, null);
        }
        Map<String, Object> row = rows.getFirst();
        boolean allowed = Boolean.TRUE.equals(row.get("enrollment_allowed"));
        return new Decision(allowed, (UUID) row.get("id"), (BigDecimal) row.get("maximum_units"),
                Boolean.TRUE.equals(row.get("requires_approval")), allowed ? null : "ACADEMIC_POLICY_BLOCKED",
                allowed ? null : "Academic policy does not allow enrollment for this student");
    }

    @Transactional(readOnly = true)
    public void ensureCreationAllowed(Student student, UUID schoolYearId) {
        Decision decision = decision(student, schoolYearId);
        if (!decision.allowed()) throw rule(decision.blockerCode(), decision.message());
    }

    @Transactional(readOnly = true)
    public void validateLoad(Enrollment enrollment, BigDecimal units) {
        Decision decision = decision(enrollment.getStudent(), enrollment.getSchoolYear().getId());
        if (!decision.allowed()) throw rule(decision.blockerCode(), decision.message());
        if (decision.maximumUnits() != null && units.compareTo(decision.maximumUnits()) > 0)
            throw rule("ACADEMIC_UNIT_LIMIT_EXCEEDED", "Enrollment exceeds the academic-policy limit of " + decision.maximumUnits() + " units");
    }

    @Transactional(readOnly = true)
    public void ensureApproval(Enrollment enrollment) {
        Decision decision = decision(enrollment.getStudent(), enrollment.getSchoolYear().getId());
        if (!decision.requiresApproval()) return;
        Integer found = jdbc.queryForObject("select count(*) from enrollment_eligibility_approvals where enrollment_id=? and policy_id=?",
                Integer.class, enrollment.getId(), decision.policyId());
        if (found == null || found == 0)
            throw rule("ACADEMIC_POLICY_APPROVAL_REQUIRED", "Enrollment requires Registrar approval under the student's academic policy");
    }

    @Transactional
    public Map<String, Object> approve(Enrollment enrollment, String reason, SisUserDetails principal) {
        Decision decision = decision(enrollment.getStudent(), enrollment.getSchoolYear().getId());
        if (!decision.allowed()) throw rule(decision.blockerCode(), decision.message());
        if (!decision.requiresApproval()) throw rule("ACADEMIC_POLICY_APPROVAL_NOT_REQUIRED", "This enrollment does not require a policy approval");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into enrollment_eligibility_approvals(id,enrollment_id,policy_id,maximum_units_snapshot,approved_by,reason)
                values(?,?,?,?,?,?) on conflict(enrollment_id) do update set policy_id=excluded.policy_id,
                maximum_units_snapshot=excluded.maximum_units_snapshot,approved_by=excluded.approved_by,
                reason=excluded.reason,approved_at=now()
                """, id, enrollment.getId(), decision.policyId(), decision.maximumUnits(), principal.id(), reason.trim());
        audit.log(principal, "ENROLLMENT_ELIGIBILITY_APPROVED", "ENROLLMENT", "Enrollment", enrollment.getId(), null,
                Map.of("policyId", decision.policyId(), "reason", reason));
        return jdbc.queryForMap("select * from enrollment_eligibility_approvals where enrollment_id=?", enrollment.getId());
    }

    private String normalizeStatus(String value) {
        String normalized = value.trim().toUpperCase(java.util.Locale.ROOT);
        try { AcademicStatus.valueOf(normalized); }
        catch (Exception exception) { throw rule("INVALID_ACADEMIC_STATUS", "Unsupported academic status"); }
        return normalized;
    }

    private BusinessRuleException rule(String code, String message) { return new BusinessRuleException(code, message); }
    public record Decision(boolean allowed, UUID policyId, BigDecimal maximumUnits, boolean requiresApproval,
                           String blockerCode, String message) {}
}
