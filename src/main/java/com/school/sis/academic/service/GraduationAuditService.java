package com.school.sis.academic.service;

import com.school.sis.academic.dto.AcademicPlanResponse;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class GraduationAuditService {
    private final JdbcTemplate jdbc;
    private final AcademicProgressService progress;
    private final AuditService audit;
    public GraduationAuditService(JdbcTemplate jdbc, AcademicProgressService progress, AuditService audit) {
        this.jdbc = jdbc; this.progress = progress; this.audit = audit;
    }

    @Transactional
    public Map<String, Object> run(UUID studentId, SisUserDetails principal) {
        ensureScope(studentId, principal);
        AcademicPlanResponse plan = progress.plan(studentId);
        List<Issue> issues = new ArrayList<>();
        boolean configurationIncomplete = false;
        BigDecimal requiredUnits = BigDecimal.ZERO;
        for (AcademicPlanResponse.Item item : plan.items()) {
            if (item.requirement() == com.school.sis.curriculum.entity.RequiredStatus.REQUIRED) {
                requiredUnits = requiredUnits.add(item.creditUnits());
                if (!Set.of("COMPLETED", "CREDITED").contains(item.status()))
                    issues.add(issueFor(item));
            }
        }

        List<Map<String, Object>> groups = jdbc.queryForList("select * from curriculum_requirement_groups where curriculum_id=? and active=true order by group_code", plan.curriculumId());
        Set<UUID> groupedCourses = new HashSet<>();
        Map<UUID, AcademicPlanResponse.Item> byCurriculumCourse = new HashMap<>();
        plan.items().forEach(item -> byCurriculumCourse.put(item.curriculumCourseId(), item));
        for (Map<String, Object> group : groups) {
            UUID groupId = (UUID) group.get("id");
            List<UUID> courseIds = jdbc.query("select curriculum_course_id from curriculum_requirement_group_courses where group_id=?",
                    (rs, row) -> rs.getObject(1, UUID.class), groupId);
            groupedCourses.addAll(courseIds);
            List<AcademicPlanResponse.Item> satisfied = courseIds.stream().map(byCurriculumCourse::get)
                    .filter(java.util.Objects::nonNull).filter(item -> Set.of("COMPLETED", "CREDITED").contains(item.status())).toList();
            boolean met;
            if ("COURSE_COUNT".equals(group.get("requirement_type"))) {
                int count = ((Number) group.get("required_course_count")).intValue();
                met = satisfied.size() >= count;
                BigDecimal groupUnits = courseIds.stream().map(byCurriculumCourse::get).filter(java.util.Objects::nonNull)
                        .map(AcademicPlanResponse.Item::creditUnits).sorted().limit(count).reduce(BigDecimal.ZERO, BigDecimal::add);
                requiredUnits = requiredUnits.add(groupUnits);
            } else {
                BigDecimal units = (BigDecimal) group.get("required_units");
                met = satisfied.stream().map(AcademicPlanResponse.Item::creditUnits).reduce(BigDecimal.ZERO, BigDecimal::add).compareTo(units) >= 0;
                requiredUnits = requiredUnits.add(units);
            }
            if (!met) issues.add(new Issue("UNMET_ELECTIVE_GROUP", null, groupId,
                    "Elective requirement is not yet satisfied: " + group.get("group_name")));
        }
        for (AcademicPlanResponse.Item item : plan.items()) {
            if (item.requirement() == com.school.sis.curriculum.entity.RequiredStatus.ELECTIVE
                    && !groupedCourses.contains(item.curriculumCourseId())) {
                configurationIncomplete = true;
                issues.add(new Issue("ELECTIVE_CONFIGURATION", item.courseId(), null,
                        "Elective course is not assigned to a requirement group: " + item.courseCode()));
            }
        }
        String result = configurationIncomplete ? "CONFIGURATION_INCOMPLETE" : issues.isEmpty() ? "ELIGIBLE" : "NOT_ELIGIBLE";
        UUID auditId = UUID.randomUUID();
        int missing = (int) issues.stream().filter(issue -> issue.type().equals("MISSING_REQUIRED")).count();
        int pending = (int) issues.stream().filter(issue -> issue.type().equals("PENDING_EVALUATION")).count();
        int unmet = (int) issues.stream().filter(issue -> issue.type().equals("UNMET_ELECTIVE_GROUP")).count();
        jdbc.update("""
                insert into graduation_audits(id,student_id,curriculum_id,result,required_units,earned_units,
                missing_required_count,pending_evaluation_count,unmet_elective_group_count,run_by)
                values(?,?,?,?,?,?,?,?,?,?)
                """, auditId, studentId, plan.curriculumId(), result, requiredUnits, plan.earnedUnits(), missing, pending, unmet, principal.id());
        for (Issue issue : issues) jdbc.update("""
                insert into graduation_audit_issues(id,audit_id,issue_type,course_id,requirement_group_id,message)
                values(?,?,?,?,?,?)
                """, UUID.randomUUID(), auditId, issue.type(), issue.courseId(), issue.groupId(), issue.message());
        audit.log(principal, "GRADUATION_AUDIT_RUN", "ACADEMIC", "GraduationAudit", auditId, null,
                Map.of("studentId", studentId, "result", result));
        return get(auditId, principal);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UUID studentId, SisUserDetails principal) {
        ensureScope(studentId, principal);
        return jdbc.queryForList("""
                select id,student_id as "studentId",curriculum_id as "curriculumId",result,
                required_units as "requiredUnits",earned_units as "earnedUnits",missing_required_count as "missingRequiredCount",
                pending_evaluation_count as "pendingEvaluationCount",unmet_elective_group_count as "unmetElectiveGroupCount",
                run_at as "runAt" from graduation_audits where student_id=? order by run_at desc
                """, studentId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(UUID id, SisUserDetails principal) {
        Map<String, Object> row = jdbc.query("select student_id from graduation_audits where id=?",
                rs -> rs.next() ? Map.of("studentId", rs.getObject(1, UUID.class)) : null, id);
        if (row == null) throw new com.school.sis.common.exception.NotFoundException("Graduation audit not found");
        ensureScope((UUID) row.get("studentId"), principal);
        Map<String, Object> response = new LinkedHashMap<>(jdbc.queryForMap("""
                select id,student_id as "studentId",curriculum_id as "curriculumId",result,
                required_units as "requiredUnits",earned_units as "earnedUnits",missing_required_count as "missingRequiredCount",
                pending_evaluation_count as "pendingEvaluationCount",unmet_elective_group_count as "unmetElectiveGroupCount",
                run_at as "runAt" from graduation_audits where id=?
                """, id));
        response.put("issues", jdbc.queryForList("""
                select issue_type as "issueType",course_id as "courseId",requirement_group_id as "requirementGroupId",message
                from graduation_audit_issues where audit_id=? order by issue_type,message
                """, id));
        return response;
    }

    private Issue issueFor(AcademicPlanResponse.Item item) {
        String type = switch (item.status()) {
            case "FAILED" -> "FAILED";
            case "ENROLLED" -> "IN_PROGRESS";
            case "PENDING_EVALUATION" -> "PENDING_EVALUATION";
            default -> "MISSING_REQUIRED";
        };
        return new Issue(type, item.courseId(), null, item.courseCode() + " - " + item.courseTitle() + " is " + item.status().toLowerCase());
    }

    private void ensureScope(UUID studentId, SisUserDetails principal) {
        boolean registrar = principal.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .anyMatch(Set.of("ROLE_SUPER_ADMIN", "ENROLLMENT_APPROVE")::contains);
        if (registrar) return;
        if (principal.facultyId() == null) throw new BusinessRuleException("LINKED_FACULTY_REQUIRED", "Academic reviewer requires a linked faculty record");
        Integer scoped = jdbc.queryForObject("""
                select count(*) from students s join programs p on p.id=s.program_id join faculty f on f.department_id=p.department_id
                where s.id=? and f.id=?
                """, Integer.class, studentId, principal.facultyId());
        if (scoped == null || scoped == 0) throw new BusinessRuleException("ACADEMIC_SCOPE_REQUIRED", "Student is outside your academic department");
    }

    private record Issue(String type, UUID courseId, UUID groupId, String message) {}
}

