package com.school.sis.student.portal;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class StudentPortalAccess {
    private final JdbcTemplate jdbc;
    public StudentPortalAccess(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public UUID studentId(SisUserDetails principal){
        if(principal==null||principal.studentId()==null) throw new BusinessRuleException("A linked student profile is required");
        if(principal.mustChangePassword()) throw new BusinessRuleException("Password change is required before using the student portal");
        Integer active=jdbc.queryForObject("select count(*) from students where id=? and status<>'ARCHIVED'",Integer.class,principal.studentId());
        if(active==null||active==0) throw new BusinessRuleException("This student portal account is archived");
        return principal.studentId();
    }
    public void enrollment(UUID enrollmentId,SisUserDetails principal){
        Integer count=jdbc.queryForObject("select count(*) from enrollments where id=? and student_id=?",Integer.class,enrollmentId,studentId(principal));
        if(count==null||count==0) throw new BusinessRuleException("Students can only access their own enrollment");
    }
    public void request(UUID requestId,SisUserDetails principal){
        Integer count=jdbc.queryForObject("select count(*) from student_service_requests where id=? and student_id=?",Integer.class,requestId,studentId(principal));
        if(count==null||count==0) throw new BusinessRuleException("Students can only access their own requests");
    }
}
