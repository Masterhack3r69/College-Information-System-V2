package com.school.sis.student.portal;

import com.school.sis.academic.dto.AcademicPlanResponse;
import com.school.sis.academic.service.AcademicProgressService;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.enrollment.dto.*;
import com.school.sis.enrollment.entity.EnrollmentStatus;
import com.school.sis.enrollment.service.EnrollmentService;
import com.school.sis.storage.FileStorageService;
import com.school.sis.student.entity.StudentContact;
import com.school.sis.student.repository.StudentContactRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
public class StudentPortalService {
    private final JdbcTemplate jdbc; private final StudentPortalAccess access; private final UserRepository users;
    private final StudentContactRepository contacts; private final PasswordEncoder passwords; private final EnrollmentService enrollments;
    private final AuditService audit; private final FileStorageService storage;
    private final AcademicProgressService academicProgress;
    public StudentPortalService(JdbcTemplate jdbc,StudentPortalAccess access,UserRepository users,StudentContactRepository contacts,
                                PasswordEncoder passwords,EnrollmentService enrollments,AuditService audit,FileStorageService storage,
                                AcademicProgressService academicProgress){
        this.jdbc=jdbc;this.access=access;this.users=users;this.contacts=contacts;this.passwords=passwords;this.enrollments=enrollments;this.audit=audit;this.storage=storage;this.academicProgress=academicProgress;
    }

    @Transactional(readOnly=true) public Map<String,Object> dashboard(SisUserDetails p){
        var out=new LinkedHashMap<String,Object>();out.put("profile",profile(p));out.put("term",term());out.put("enrollment",currentEnrollment(p));
        out.put("schedule",schedule(p).stream().filter(x->Objects.equals(x.get("dayOfWeek"),LocalDate.now().getDayOfWeek().name())).toList());
        out.put("finance",finance(p).stream().findFirst().orElse(Map.of()));out.put("progress",progress(p));out.put("grades",grades(p).stream().limit(5).toList());
        out.put("announcements",announcements(p).stream().limit(5).toList());return out;
    }
    @Transactional(readOnly=true) public Map<String,Object> term(){
        var rows=jdbc.queryForList("""
          select sy.id as "schoolYearId",sy.school_year as "schoolYear",s.id as "semesterId",s.name as "semesterName",
          coalesce(ps.enrollment_enabled,false) as "enrollmentEnabled",ps.enrollment_opens_at as "enrollmentOpensAt",
          ps.enrollment_closes_at as "enrollmentClosesAt",coalesce(ps.attendance_visible,false) as "attendanceVisible",ps.portal_notice as "portalNotice"
          from school_years sy cross join semesters s left join student_portal_term_settings ps on ps.school_year_id=sy.id and ps.semester_id=s.id
          where sy.active=true and s.active=true order by s.sort_order limit 1""");
        return rows.isEmpty()?Map.of():rows.getFirst();
    }
    @Transactional(readOnly=true) public Map<String,Object> profile(SisUserDetails p){
        var rows=jdbc.queryForList("""
          select s.id as "studentId",s.student_number as "studentNumber",concat_ws(' ',s.first_name,s.middle_name,s.last_name,s.suffix) as "fullName",
          pr.program_code as "programCode",pr.program_name as "programName",c.curriculum_code as "curriculumCode",s.year_level as "yearLevel",
          s.classification,s.academic_status as "academicStatus",s.status,
          sc.email_address as email,sc.mobile_number as "mobileNumber",sc.telephone_number as "telephoneNumber",sc.current_address as "currentAddress",
          sc.emergency_contact_name as "emergencyContactName",sc.emergency_contact_number as "emergencyContactNumber",
          sc.emergency_contact_relationship as "emergencyContactRelationship",sc.emergency_contact_address as "emergencyContactAddress"
          from students s join programs pr on pr.id=s.program_id join curricula c on c.id=s.curriculum_id left join student_contacts sc on sc.student_id=s.id where s.id=?""",access.studentId(p));
        if(rows.isEmpty())throw new NotFoundException("Student profile not found");return rows.getFirst();
    }
    @Transactional public Map<String,Object> updateProfile(ProfileUpdate r,SisUserDetails p){
        String email=r.email().trim().toLowerCase(Locale.ROOT);Integer duplicate=jdbc.queryForObject("select count(*) from users where lower(email)=? and id<>?",Integer.class,email,p.id());
        if(duplicate!=null&&duplicate>0)throw new BusinessRuleException("Email is already in use");
        User u=users.findById(p.id()).orElseThrow(()->new NotFoundException("User not found"));u.setEmail(email);users.save(u);
        StudentContact c=contacts.findById(access.studentId(p)).orElseThrow(()->new NotFoundException("Student contact record not found"));
        c.setEmailAddress(email);c.setMobileNumber(clean(r.mobileNumber()));c.setTelephoneNumber(clean(r.telephoneNumber()));c.setCurrentAddress(clean(r.currentAddress()));
        c.setEmergencyContactName(clean(r.emergencyContactName()));c.setEmergencyContactNumber(clean(r.emergencyContactNumber()));
        c.setEmergencyContactRelationship(clean(r.emergencyContactRelationship()));c.setEmergencyContactAddress(clean(r.emergencyContactAddress()));contacts.save(c);
        audit.log(u,"STUDENT_PROFILE_UPDATED","STUDENT","Student",access.studentId(p),null,Map.of("email",email));return profile(p);
    }
    @Transactional public void changePassword(String current,String next,String refresh,SisUserDetails p){
        if(next==null||next.length()<8||!next.matches(".*[A-Za-z].*")||!next.matches(".*\\d.*"))throw new BusinessRuleException("New password must be at least 8 characters and include a letter and number");
        User u=users.findById(p.id()).orElseThrow(()->new NotFoundException("User not found"));if(!passwords.matches(current,u.getPasswordHash()))throw new BusinessRuleException("Current password is incorrect");
        u.setPasswordHash(passwords.encode(next));u.setMustChangePassword(false);users.save(u);jdbc.update("update refresh_tokens set revoked_at=now() where user_id=? and token<>? and revoked_at is null",p.id(),refresh==null?"":refresh);
        audit.log(u,"STUDENT_PASSWORD_CHANGED","AUTH","User",u.getId(),null,Map.of("otherSessionsRevoked",true));
    }
    @Transactional(readOnly=true) public Map<String,Object> currentEnrollment(SisUserDetails p){
        var t=term();if(t.isEmpty())return Map.of();var rows=jdbc.queryForList("""
          select e.id,e.status,e.year_level as "yearLevel",sec.section_code as "sectionCode",sy.school_year as "schoolYear",sm.name as "semesterName",e.submitted_at as "submittedAt"
          from enrollments e join school_years sy on sy.id=e.school_year_id join semesters sm on sm.id=e.semester_id left join sections sec on sec.id=e.section_id
          where e.student_id=? and e.school_year_id=? and e.semester_id=? and e.status<>'CANCELLED' order by e.created_at desc limit 1""",access.studentId(p),t.get("schoolYearId"),t.get("semesterId"));
        if(rows.isEmpty())return Map.of();
        var out=new LinkedHashMap<String,Object>(rows.getFirst());
        EnrollmentResponse details=enrollments.get((UUID)out.get("id"));
        out.put("programCode",details.programCode());out.put("totalCreditUnits",details.totalCreditUnits());
        out.put("subjectCount",details.subjectCount());out.put("subjects",details.subjects());out.put("validation",details.validation());
        return out;
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> availableClasses(SisUserDetails p){var t=term();if(t.isEmpty())return List.of();return jdbc.queryForList("""
      select cs.id as "scheduleId",co.id as "courseId",co.course_code as "courseCode",co.course_title as "courseTitle",co.credit_units as units,
      cc.id as "curriculumCourseId",cc.year_level as "curriculumYearLevel",cc.required_status as "requiredStatus",
      (cc.year_level<st.year_level) as "backSubject",
      case when cc.year_level<st.year_level then 'BACK_SUBJECT' when cc.required_status='ELECTIVE' then 'ELECTIVE'
           when cc.required_status='OPTIONAL' then 'OPTIONAL' else 'NORMAL_TERM' end as "recommendationType",
      sec.id as "sectionId",sec.section_code as "sectionCode",r.room_code as "roomCode",concat_ws(' ',f.first_name,f.last_name) as faculty,
      cs.capacity-coalesce((select count(*) from enrollment_subjects occupied join enrollments oe on oe.id=occupied.enrollment_id
        where occupied.class_schedule_id=cs.id and occupied.status='ENROLLED' and oe.status='CONFIRMED'),0) as "availableSeats",
      exists(select 1 from enrollment_subjects selected join enrollments se on se.id=selected.enrollment_id
        where selected.class_schedule_id=cs.id and selected.status='ENROLLED' and se.student_id=st.id
          and se.school_year_id=? and se.semester_id=? and se.status in ('DRAFT','SUBMITTED','CONFIRMED')) as selected,
      coalesce((select json_agg(json_build_object('dayOfWeek',m.day_of_week,'startTime',m.start_time,'endTime',m.end_time,
        'componentType',m.component_type,'deliveryMode',m.delivery_mode,'roomCode',mr.room_code,'locationDetails',m.location_details) order by m.day_of_week,m.start_time)
        from schedule_meetings m left join rooms mr on mr.id=m.room_id where m.class_schedule_id=cs.id and m.active=true),'[]') as meetings
      from students st left join student_educational_backgrounds seb on seb.student_id=st.id
      join semesters sm on sm.id=?
      join curriculum_courses cc on cc.curriculum_id=st.curriculum_id and (
        ((st.classification in ('IRREGULAR','TRANSFEREE','RETURNEE','CROSS_ENROLLEE','GRADUATING')
          or seb.admission_type in ('TRANSFEREE','RETURNEE','SHIFTEE','CROSS_ENROLLEE','SECOND_DEGREE')) and cc.year_level<=st.year_level)
        or ((st.classification not in ('IRREGULAR','TRANSFEREE','RETURNEE','CROSS_ENROLLEE','GRADUATING') or st.classification is null)
          and (seb.admission_type not in ('TRANSFEREE','RETURNEE','SHIFTEE','CROSS_ENROLLEE','SECOND_DEGREE') or seb.admission_type is null)
          and cc.year_level=st.year_level
          and regexp_replace(upper(cc.semester),'[^A-Z0-9]+','_','g')=regexp_replace(upper(sm.name),'[^A-Z0-9]+','_','g')))
      join courses co on co.id=cc.course_id join class_schedules cs on cs.course_id=co.id and cs.school_year_id=? and cs.semester_id=? and cs.status='ACTIVE'
      join sections sec on sec.id=cs.section_id and sec.program_id=st.program_id left join rooms r on r.id=cs.room_id left join faculty f on f.id=cs.faculty_id
      where st.id=? and not exists(select 1 from academic_records ar where ar.student_id=st.id and ar.course_id=co.id and ar.grade_status='LOCKED' and ar.remarks='PASSED')
        and not exists(select 1 from student_course_credits cr where cr.student_id=st.id and cr.target_course_id=co.id and cr.active=true)
      order by "backSubject" desc,cc.year_level,cc.sort_order,co.course_code,sec.section_code
      """,t.get("schoolYearId"),t.get("semesterId"),t.get("semesterId"),t.get("schoolYearId"),t.get("semesterId"),access.studentId(p));}
    @Transactional public EnrollmentResponse createDraft(DraftRequest r,SisUserDetails p){ensureEnrollmentOpen();var t=term();return enrollments.create(new EnrollmentRequest(access.studentId(p),(UUID)t.get("schoolYearId"),(UUID)t.get("semesterId"),r.yearLevel(),r.sectionId(),r.remarks()));}
    @Transactional public EnrollmentResponse addSubject(UUID enrollmentId,UUID scheduleId,SisUserDetails p){ensureEnrollmentOpen();access.enrollment(enrollmentId,p);return enrollments.addSubject(enrollmentId,new EnrollmentSubjectRequest(scheduleId));}
    @Transactional public EnrollmentResponse dropSubject(UUID enrollmentId,UUID subjectId,SisUserDetails p){ensureEnrollmentOpen();access.enrollment(enrollmentId,p);return enrollments.dropSubject(enrollmentId,subjectId);}
    @Transactional public EnrollmentResponse submit(UUID id,SisUserDetails p){ensureEnrollmentOpen();access.enrollment(id,p);return enrollments.submitForReview(id);}
    private void ensureEnrollmentOpen(){var t=term();if(t.isEmpty()||!Boolean.TRUE.equals(t.get("enrollmentEnabled")))throw new BusinessRuleException("Online enrollment is not enabled");Instant now=Instant.now(),opens=asInstant(t.get("enrollmentOpensAt")),closes=asInstant(t.get("enrollmentClosesAt"));if(opens!=null&&now.isBefore(opens))throw new BusinessRuleException("Online enrollment has not opened");if(closes!=null&&now.isAfter(closes))throw new BusinessRuleException("Online enrollment is closed");}
    private Instant asInstant(Object value){if(value instanceof Instant x)return x;if(value instanceof java.time.OffsetDateTime x)return x.toInstant();if(value instanceof java.sql.Timestamp x)return x.toInstant();return null;}

    @Transactional(readOnly=true) public List<Map<String,Object>> schedule(SisUserDetails p){var t=term();if(t.isEmpty())return List.of();return schedule((UUID)t.get("schoolYearId"),(UUID)t.get("semesterId"),p);}
    @Transactional(readOnly=true) public List<Map<String,Object>> schedule(UUID schoolYearId,UUID semesterId,SisUserDetails p){return jdbc.queryForList("""
      select cs.id as "scheduleId",co.course_code as "courseCode",co.course_title as "courseTitle",sec.section_code as "sectionCode",r.room_code as "roomCode",
      sm.delivery_mode as "deliveryMode",sm.component_type as "componentType",sm.location_details as "locationDetails",
      sm.day_of_week as "dayOfWeek",sm.start_time as "startTime",sm.end_time as "endTime",concat(f.first_name,' ',f.last_name) as faculty
      from enrollment_subjects es join enrollments e on e.id=es.enrollment_id join class_schedules cs on cs.id=es.class_schedule_id join courses co on co.id=cs.course_id
      join sections sec on sec.id=cs.section_id join faculty f on f.id=cs.faculty_id join schedule_meetings sm on sm.class_schedule_id=cs.id and sm.active=true left join rooms r on r.id=sm.room_id
      where e.student_id=? and e.status='CONFIRMED' and es.status='ENROLLED' and cs.school_year_id=? and cs.semester_id=?
      order by sm.day_of_week,sm.start_time""",access.studentId(p),schoolYearId,semesterId);}
    @Transactional(readOnly=true) public List<Map<String,Object>> scheduleTerms(SisUserDetails p){return jdbc.queryForList("""
      select distinct sy.id as "schoolYearId",sy.school_year as "schoolYear",sm.id as "semesterId",sm.name as "semesterName",sy.active and sm.active as active
      from enrollments e join enrollment_subjects es on es.enrollment_id=e.id and es.status='ENROLLED'
      join class_schedules cs on cs.id=es.class_schedule_id join school_years sy on sy.id=cs.school_year_id join semesters sm on sm.id=cs.semester_id
      where e.student_id=? and e.status='CONFIRMED' order by sy.school_year desc,sm.sort_order desc""",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> scheduleChanges(UUID schoolYearId,UUID semesterId,SisUserDetails p){return jdbc.queryForList("""
      select distinct h.id,h.action,h.reason,h.created_at as "changedAt",u.full_name as "actorName",co.course_code as "courseCode",sec.section_code as "sectionCode"
      from schedule_change_history h join class_schedules cs on cs.id=h.schedule_id join courses co on co.id=cs.course_id join sections sec on sec.id=cs.section_id
      join enrollment_subjects es on es.class_schedule_id=cs.id and es.status='ENROLLED' join enrollments e on e.id=es.enrollment_id and e.status='CONFIRMED'
      left join users u on u.id=h.actor_id where e.student_id=? and cs.school_year_id=? and cs.semester_id=?
      order by h.created_at desc limit 5""",access.studentId(p),schoolYearId,semesterId);}
    @Transactional(readOnly=true) public List<Map<String,Object>> grades(SisUserDetails p){return jdbc.queryForList("""
      select ar.id,ar.course_code as "courseCode",ar.course_title as "courseTitle",ar.credit_units as units,ar.final_grade as grade,ar.remarks,
      ar.earned_units as "earnedUnits",sy.school_year as "schoolYear",sm.name as "semesterName",ar.locked_at as "postedAt"
      from academic_records ar join school_years sy on sy.id=ar.school_year_id join semesters sm on sm.id=ar.semester_id
      where ar.student_id=? and ar.grade_status='LOCKED' order by sy.school_year desc,sm.sort_order desc,ar.course_code""",access.studentId(p));}
    @Transactional(readOnly=true) public Map<String,Object> progress(SisUserDetails p){return jdbc.queryForMap("""
      select coalesce(sum(ccu.credit_units),0) as "requiredUnits",coalesce(sum(case when ar.id is not null then ar.earned_units else 0 end),0) as "completedUnits",
      count(ccu.id) as "requiredCourses",count(ar.id) as "completedCourses"
      from students st join curriculum_courses cc on cc.curriculum_id=st.curriculum_id join courses ccu on ccu.id=cc.course_id
      left join academic_records ar on ar.student_id=st.id and ar.course_id=ccu.id and ar.grade_status='LOCKED' and ar.earned_units>0 where st.id=?""",access.studentId(p));}
    @Transactional(readOnly=true) public AcademicPlanResponse academicPlan(SisUserDetails p){return academicProgress.plan(access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> credits(SisUserDetails p){return jdbc.queryForList("""
      select cr.id,cr.target_course_id as "courseId",co.course_code as "courseCode",co.course_title as "courseTitle",
      cr.credited_units as "creditedUnits",cr.source_label as "sourceLabel",cr.posted_at as "postedAt",cr.active,
      ec.id as "evaluationCaseId",ec.evaluation_type as "evaluationType"
      from student_course_credits cr join courses co on co.id=cr.target_course_id
      join academic_evaluation_cases ec on ec.id=cr.evaluation_case_id where cr.student_id=?
      order by cr.active desc,cr.posted_at desc""",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> evaluations(SisUserDetails p){return jdbc.queryForList("""
      select ec.id,ec.evaluation_type as "evaluationType",ec.status,ec.source_institution as "sourceInstitution",
      ec.reason,ec.submitted_at as "submittedAt",ec.registrar_decided_at as "decidedAt",cu.curriculum_code as "targetCurriculumCode",
      (select count(*) from academic_evaluation_source_courses sc where sc.case_id=ec.id) as "sourceCourseCount",
      (select count(*) from academic_evaluation_matches em where em.case_id=ec.id and em.status='RECOMMENDED') as "recommendedMatchCount"
      from academic_evaluation_cases ec join curricula cu on cu.id=ec.target_curriculum_id
      where ec.student_id=? order by ec.created_at desc""",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> graduationAudits(SisUserDetails p){return jdbc.queryForList("""
      select ga.id,ga.result,ga.required_units as "totalRequiredUnits",ga.earned_units as "earnedUnits",
      ga.missing_required_count as "missingRequiredCount",ga.unmet_elective_group_count as "unmetElectiveGroupCount",
      ga.pending_evaluation_count as "pendingEvaluationCount",ga.run_at as "auditedAt"
      from graduation_audits ga where ga.student_id=? order by ga.run_at desc""",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> attendance(SisUserDetails p){var t=term();if(!Boolean.TRUE.equals(t.get("attendanceVisible")))return List.of();return jdbc.queryForList("""
      select co.course_code as "courseCode",count(ae.id) as meetings,
      count(*) filter(where ae.attendance_status='PRESENT') as present,count(*) filter(where ae.attendance_status='LATE') as late,
      count(*) filter(where ae.attendance_status='ABSENT') as absent,count(*) filter(where ae.attendance_status='EXCUSED') as excused
      from attendance_entries ae join attendance_sessions ats on ats.id=ae.session_id and ats.status='FINALIZED'
      join enrollment_subjects es on es.id=ae.enrollment_subject_id join enrollments e on e.id=es.enrollment_id join class_schedules cs on cs.id=ats.schedule_id join courses co on co.id=cs.course_id
      where e.student_id=? group by co.course_code order by co.course_code""",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> finance(SisUserDetails p){return jdbc.queryForList("""
      select a.id,a.base_assessment_amount as "baseAssessmentAmount",a.adjustment_amount as "adjustmentAmount",
      a.total_assessment as "totalAssessment",a.amount_paid as "amountPaid",a.refunded_amount as "refundedAmount",
      a.net_paid_amount as "netPaidAmount",a.balance,a.credit_balance as "creditBalance",a.status,
      sy.school_year as "schoolYear",sm.name as "semesterName",
      coalesce((select json_agg(json_build_object('description',ai.description,'category',ai.category,'quantity',ai.quantity,'unitAmount',ai.unit_amount,'totalAmount',ai.total_amount) order by ai.description) from assessment_items ai where ai.assessment_id=a.id),'[]') as items,
      coalesce((select json_agg(json_build_object('id',ain.id,'sequence',ain.sequence_number,'label',ain.label,'dueDate',ain.due_date,'amount',ain.amount,'allocatedAmount',ain.allocated_amount,'status',case when ain.allocated_amount>=ain.amount then 'PAID' when ain.allocated_amount>0 then 'PARTIAL' when ain.due_date<current_date then 'OVERDUE' else 'UPCOMING' end) order by ain.sequence_number) from assessment_installments ain join assessment_installment_plans aip on aip.id=ain.plan_id where aip.assessment_id=a.id),'[]') as installments,
      coalesce((select json_agg(json_build_object('id',adj.id,'type',adj.adjustment_type,'amount',adj.amount,'signedEffect',adj.signed_amount,'reason',adj.reason,'decidedAt',adj.decided_at) order by adj.requested_at) from assessment_adjustments adj where adj.assessment_id=a.id and adj.status='APPROVED'),'[]') as adjustments
      from assessments a join school_years sy on sy.id=a.school_year_id join semesters sm on sm.id=a.semester_id where a.student_id=? order by sy.school_year desc,sm.sort_order desc""",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> payments(SisUserDetails p){return jdbc.queryForList("select ap.id,ap.official_receipt_number as \"receiptNumber\",ap.amount,ap.balance_after as \"balanceAfter\",ap.legacy_receipt as \"legacyReceipt\",ap.payment_method as \"paymentMethod\",ap.paid_at as \"paidAt\",ap.status,ap.void_reason as \"voidReason\" from assessment_payments ap where ap.student_id=? order by ap.paid_at desc",access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> announcements(SisUserDetails p){return jdbc.queryForList("""
      select pa.id,pa.title,pa.body,pa.published_at as "publishedAt",'ACADEMIC' as source from portal_announcements pa join students s on s.id=?
      where pa.status='PUBLISHED' and pa.published_at<=now() and (pa.audience='ALL' or (pa.audience='PROGRAM' and pa.program_id=s.program_id) or (pa.audience='YEAR_LEVEL' and pa.year_level=s.year_level))
      union all select ca.id,ca.title,ca.body,ca.published_at,'CLASS' from class_announcements ca join class_schedules cs on cs.id=ca.schedule_id
      join enrollment_subjects es on es.class_schedule_id=cs.id join enrollments e on e.id=es.enrollment_id where e.student_id=? and e.status='CONFIRMED' and es.status='ENROLLED' and ca.status='PUBLISHED'
      order by "publishedAt" desc""",access.studentId(p),access.studentId(p));}
    @Transactional(readOnly=true) public List<Map<String,Object>> materials(SisUserDetails p){return jdbc.queryForList("""
      select cm.id,cm.title,cm.description,cm.original_filename as filename,cm.mime_type as "mimeType",cm.file_size as "fileSize",co.course_code as "courseCode"
      from class_materials cm join class_schedules cs on cs.id=cm.schedule_id join courses co on co.id=cs.course_id join enrollment_subjects es on es.class_schedule_id=cs.id
      join enrollments e on e.id=es.enrollment_id where e.student_id=? and e.status='CONFIRMED' and es.status='ENROLLED' and cm.status='PUBLISHED' order by cm.published_at desc""",access.studentId(p));}
    @Transactional(readOnly=true) public Download material(UUID id,SisUserDetails p){var rows=jdbc.queryForList("""
      select cm.original_filename,cm.stored_filename,cm.mime_type from class_materials cm join enrollment_subjects es on es.class_schedule_id=cm.schedule_id
      join enrollments e on e.id=es.enrollment_id where cm.id=? and cm.status='PUBLISHED' and e.student_id=? and e.status='CONFIRMED' and es.status='ENROLLED'""",id,access.studentId(p));if(rows.isEmpty())throw new BusinessRuleException("Material is not available");var row=rows.getFirst();return new Download((String)row.get("original_filename"),(String)row.get("mime_type"),storage.readMaterial((String)row.get("stored_filename")));}
    @Transactional(readOnly=true) public List<Map<String,Object>> forms(){return jdbc.queryForList("select id,title,description,original_filename as filename,mime_type as \"mimeType\",file_size as \"fileSize\" from student_forms where status='PUBLISHED' order by title");}
    @Transactional(readOnly=true) public Download form(UUID id){var rows=jdbc.queryForList("select original_filename,stored_filename,mime_type from student_forms where id=? and status='PUBLISHED'",id);if(rows.isEmpty())throw new BusinessRuleException("Form is not available");var row=rows.getFirst();return new Download((String)row.get("original_filename"),(String)row.get("mime_type"),storage.readForm((String)row.get("stored_filename")));}
    @Transactional(readOnly=true) public List<Map<String,Object>> requests(SisUserDetails p){return jdbc.queryForList("select id,request_type as \"requestType\",document_name as \"documentName\",purpose,status,student_comment as \"studentComment\",staff_comment as \"staffComment\",fulfilled_filename as \"fulfilledFilename\",(fulfilled_stored_filename is not null) as \"downloadReady\",created_at as \"createdAt\",updated_at as \"updatedAt\" from student_service_requests where student_id=? order by created_at desc",access.studentId(p));}
    @Transactional(readOnly=true) public Download requestDownload(UUID id,SisUserDetails p){access.request(id,p);var rows=jdbc.queryForList("select fulfilled_filename,fulfilled_stored_filename,fulfilled_mime_type from student_service_requests where id=? and student_id=? and status in ('READY','COMPLETED') and fulfilled_stored_filename is not null",id,access.studentId(p));if(rows.isEmpty())throw new BusinessRuleException("The fulfilled document is not ready");var row=rows.getFirst();audit.log("STUDENT_REQUEST_FILE_DOWNLOADED","STUDENT","StudentServiceRequest",id,null,null);return new Download((String)row.get("fulfilled_filename"),(String)row.get("fulfilled_mime_type"),storage.readRequest((String)row.get("fulfilled_stored_filename")));}
    @Transactional public Map<String,Object> createRequest(RequestCreate r,SisUserDetails p){if(!Set.of("DOCUMENT","CLEARANCE").contains(r.requestType()))throw new BusinessRuleException("Invalid request type");UUID id=UUID.randomUUID();jdbc.update("insert into student_service_requests(id,student_id,request_type,document_name,purpose,student_comment) values(?,?,?,?,?,?)",id,access.studentId(p),r.requestType(),clean(r.documentName()),r.purpose().trim(),clean(r.comment()));jdbc.update("insert into student_service_request_history(request_id,to_status,comment,changed_by) values(?,'SUBMITTED',?,?)",id,clean(r.comment()),p.id());audit.log("STUDENT_SERVICE_REQUESTED","STUDENT","StudentServiceRequest",id,null,Map.of("type",r.requestType()));return jdbc.queryForMap("select id,status,created_at as \"createdAt\" from student_service_requests where id=?",id);}
    @Transactional public void cancelRequest(UUID id,SisUserDetails p){access.request(id,p);int changed=jdbc.update("update student_service_requests set status='CANCELLED',updated_at=now() where id=? and student_id=? and status='SUBMITTED'",id,access.studentId(p));if(changed==0)throw new BusinessRuleException("Only submitted requests can be cancelled");jdbc.update("insert into student_service_request_history(request_id,from_status,to_status,comment,changed_by) values(?,'SUBMITTED','CANCELLED','Cancelled by student',?)",id,p.id());}
    private String clean(String v){return v==null||v.isBlank()?null:v.trim();}
    public record ProfileUpdate(String email,String mobileNumber,String telephoneNumber,String currentAddress,String emergencyContactName,String emergencyContactNumber,String emergencyContactRelationship,String emergencyContactAddress){}
    public record DraftRequest(int yearLevel,UUID sectionId,String remarks){}
    public record RequestCreate(String requestType,String documentName,String purpose,String comment){}
    public record Download(String filename,String mimeType,byte[] bytes){}
}
