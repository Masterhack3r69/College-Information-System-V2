package com.school.sis.faculty;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class FacultyPortalAccess {
    private final JdbcTemplate jdbc;

    public FacultyPortalAccess(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public UUID facultyId(SisUserDetails principal) {
        if (principal == null || principal.facultyId() == null) throw new BusinessRuleException("A linked faculty profile is required");
        return principal.facultyId();
    }

    public void assigned(UUID scheduleId, SisUserDetails principal) {
        Integer count = jdbc.queryForObject("select count(*) from class_schedules where id=? and faculty_id=?", Integer.class,
                scheduleId, facultyId(principal));
        if (count == null || count == 0) throw new BusinessRuleException("Faculty can only access assigned classes");
    }

    public void adviser(UUID assignmentId, SisUserDetails principal) {
        Integer count = jdbc.queryForObject("select count(*) from adviser_assignments where id=? and faculty_id=? and active=true", Integer.class,
                assignmentId, facultyId(principal));
        if (count == null || count == 0) throw new BusinessRuleException("Faculty is not the assigned adviser");
    }
}
