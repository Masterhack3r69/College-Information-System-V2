package com.school.sis.faculty;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GradeCorrectionAdminService {
    private final JdbcTemplate jdbc;
    public GradeCorrectionAdminService(JdbcTemplate jdbc){this.jdbc=jdbc;}

    @Transactional(readOnly=true)
    public List<Map<String,Object>> queue(String status,SisUserDetails p){
        String scope=has(p,"ROLE_SUPER_ADMIN")?"":" and d.id=(select f.department_id from users u join faculty f on f.id=u.faculty_id where u.id=?)";
        String sql="select r.id,r.version,r.status,r.current_grade as \"currentGrade\",r.proposed_grade as \"proposedGrade\",r.proposed_remark as \"proposedRemark\",r.reason,st.student_number as \"studentNumber\",concat(st.last_name,', ',st.first_name) as \"studentName\",c.course_code as \"courseCode\",d.department_code as \"departmentCode\" from grade_correction_requests r join grades g on g.id=r.grade_id join students st on st.id=g.student_id join courses c on c.id=g.course_id join departments d on d.id=c.department_id where (? is null or r.status=?)"+scope+" order by r.created_at";
        return scope.isEmpty()?jdbc.queryForList(sql,status,status):jdbc.queryForList(sql,status,status,p.id());
    }

    @Transactional
    public Map<String,Object> review(UUID id,int version,boolean approve,String comment,SisUserDetails p){
        var row=locked(id);if(!"SUBMITTED".equals(row.get("status")))throw new BusinessRuleException("Only submitted requests can be reviewed");
        if(((Number)row.get("version")).intValue()!=version)throw new BusinessRuleException("Request was updated by another user");
        if(!has(p,"ROLE_SUPER_ADMIN")){Integer allowed=jdbc.queryForObject("select count(*) from grade_correction_requests r join grades g on g.id=r.grade_id join courses c on c.id=g.course_id join users u on u.id=? join faculty f on f.id=u.faculty_id where r.id=? and f.department_id=c.department_id",Integer.class,p.id(),id);if(allowed==null||allowed==0)throw new BusinessRuleException("Department heads can only review their department requests");}
        String next=approve?"HEAD_APPROVED":"REJECTED";jdbc.update("update grade_correction_requests set status=?,reviewed_by=?,reviewed_at=now(),review_comment=?,version=version+1,updated_at=now() where id=? and version=?",next,p.id(),comment,id,version);
        history(id,"SUBMITTED",next,comment,p.id());return jdbc.queryForMap("select id,status,version,review_comment as \"reviewComment\" from grade_correction_requests where id=?",id);
    }

    @Transactional
    public Map<String,Object> post(UUID id,int version,String comment,SisUserDetails p){
        var row=locked(id);if(!"HEAD_APPROVED".equals(row.get("status")))throw new BusinessRuleException("Only head-approved requests can be posted");
        if(((Number)row.get("version")).intValue()!=version)throw new BusinessRuleException("Request was updated by another user");
        UUID gradeId=(UUID)row.get("grade_id");BigDecimal proposed=(BigDecimal)row.get("proposed_grade");String remark=(String)row.get("proposed_remark");
        jdbc.update("update grades set final_grade=?,remarks=?,updated_at=now() where id=? and status='LOCKED'",proposed,remark,gradeId);
        jdbc.update("update academic_records set final_grade=?,remarks=?,updated_at=now() where grade_id=?",proposed,remark,gradeId);
        jdbc.update("update grade_correction_requests set status='POSTED',posted_by=?,posted_at=now(),version=version+1,updated_at=now() where id=? and version=?",p.id(),id,version);
        history(id,"HEAD_APPROVED","POSTED",comment,p.id());
        jdbc.update("insert into audit_logs(user_id,action,module,entity_type,entity_id,old_value,new_value) values(?,'GRADE_CORRECTION_POSTED','GRADE','GradeCorrectionRequest',?,jsonb_build_object('grade',?),jsonb_build_object('grade',?,'remark',?))",p.id(),id,row.get("current_grade"),proposed,remark);
        return jdbc.queryForMap("select id,status,version,posted_at as \"postedAt\" from grade_correction_requests where id=?",id);
    }
    private Map<String,Object> locked(UUID id){var rows=jdbc.queryForList("select * from grade_correction_requests where id=? for update",id);if(rows.isEmpty())throw new NotFoundException("Correction request not found");return rows.getFirst();}
    private void history(UUID id,String from,String to,String comment,UUID user){jdbc.update("insert into grade_correction_history(request_id,from_status,to_status,comment,changed_by) values(?,?,?,?,?)",id,from,to,comment,user);}
    private boolean has(SisUserDetails p,String authority){return p.getAuthorities().stream().anyMatch(a->a.getAuthority().equals(authority));}
}
