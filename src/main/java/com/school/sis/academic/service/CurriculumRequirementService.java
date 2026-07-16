package com.school.sis.academic.service;

import com.school.sis.academic.dto.AcademicExceptionRequests;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class CurriculumRequirementService {
    private final JdbcTemplate jdbc;
    private final AuditService audit;
    public CurriculumRequirementService(JdbcTemplate jdbc, AuditService audit) { this.jdbc = jdbc; this.audit = audit; }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UUID curriculumId) {
        List<Map<String, Object>> groups = jdbc.queryForList("""
                select id,curriculum_id as "curriculumId",group_code as "groupCode",group_name as "groupName",
                requirement_type as "requirementType",required_course_count as "requiredCourseCount",
                required_units as "requiredUnits",active from curriculum_requirement_groups
                where curriculum_id=? order by group_code
                """, curriculumId);
        groups.forEach(group -> group.put("curriculumCourseIds", jdbc.queryForList(
                "select curriculum_course_id from curriculum_requirement_group_courses where group_id=? order by curriculum_course_id",
                group.get("id")).stream().map(row -> row.get("curriculum_course_id")).toList()));
        return groups;
    }

    @Transactional
    public Map<String, Object> save(UUID id, AcademicExceptionRequests.RequirementGroup request, SisUserDetails principal) {
        String type = request.requirementType().trim().toUpperCase();
        if (!Set.of("COURSE_COUNT", "UNIT_TOTAL").contains(type))
            throw new BusinessRuleException("INVALID_REQUIREMENT_TYPE", "Requirement type must be COURSE_COUNT or UNIT_TOTAL");
        if (type.equals("COURSE_COUNT") && (request.requiredCourseCount() == null || request.requiredCourseCount() <= 0))
            throw new BusinessRuleException("INVALID_REQUIREMENT_VALUE", "Required course count must be greater than zero");
        if (type.equals("UNIT_TOTAL") && (request.requiredUnits() == null || request.requiredUnits().signum() <= 0))
            throw new BusinessRuleException("INVALID_REQUIREMENT_VALUE", "Required units must be greater than zero");
        validateCourses(request.curriculumId(), request.curriculumCourseIds());
        if (id == null) {
            id = UUID.randomUUID();
            jdbc.update("""
                    insert into curriculum_requirement_groups(id,curriculum_id,group_code,group_name,requirement_type,
                    required_course_count,required_units,active) values(?,?,?,?,?,?,?,?)
                    """, id, request.curriculumId(), request.groupCode().trim(), request.groupName().trim(), type,
                    type.equals("COURSE_COUNT") ? request.requiredCourseCount() : null,
                    type.equals("UNIT_TOTAL") ? request.requiredUnits() : null, request.active());
        } else {
            int changed = jdbc.update("""
                    update curriculum_requirement_groups set group_code=?,group_name=?,requirement_type=?,
                    required_course_count=?,required_units=?,active=?,updated_at=now() where id=? and curriculum_id=?
                    """, request.groupCode().trim(), request.groupName().trim(), type,
                    type.equals("COURSE_COUNT") ? request.requiredCourseCount() : null,
                    type.equals("UNIT_TOTAL") ? request.requiredUnits() : null, request.active(), id, request.curriculumId());
            if (changed == 0) throw new NotFoundException("Curriculum requirement group not found");
            jdbc.update("delete from curriculum_requirement_group_courses where group_id=?", id);
        }
        for (UUID courseId : request.curriculumCourseIds())
            jdbc.update("insert into curriculum_requirement_group_courses(group_id,curriculum_course_id) values(?,?)", id, courseId);
        audit.log(principal, "CURRICULUM_REQUIREMENT_GROUP_SAVED", "CURRICULUM", "CurriculumRequirementGroup", id, null,
                Map.of("curriculumId", request.curriculumId(), "type", type));
        UUID savedId = id;
        return list(request.curriculumId()).stream().filter(group -> savedId.equals(group.get("id"))).findFirst().orElseThrow();
    }

    @Transactional
    public void delete(UUID curriculumId, UUID id, SisUserDetails principal) {
        int changed = jdbc.update("delete from curriculum_requirement_groups where id=? and curriculum_id=?", id, curriculumId);
        if (changed == 0) throw new NotFoundException("Curriculum requirement group not found");
        audit.log(principal, "CURRICULUM_REQUIREMENT_GROUP_REMOVED", "CURRICULUM", "CurriculumRequirementGroup", id,
                Map.of("curriculumId", curriculumId), null);
    }

    private void validateCourses(UUID curriculumId, List<UUID> ids) {
        long unique = ids.stream().distinct().count();
        if (unique != ids.size()) throw new BusinessRuleException("DUPLICATE_REQUIREMENT_COURSE", "Requirement group contains duplicate courses");
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        java.util.ArrayList<Object> args = new java.util.ArrayList<>(); args.add(curriculumId); args.addAll(ids);
        Integer found = jdbc.queryForObject("select count(*) from curriculum_courses where curriculum_id=? and required_status='ELECTIVE' and id in (" + placeholders + ")",
                Integer.class, args.toArray());
        if (found == null || found != ids.size())
            throw new BusinessRuleException("ELECTIVE_COURSE_REQUIRED", "Every requirement-group course must be an ELECTIVE in this curriculum");
    }
}
