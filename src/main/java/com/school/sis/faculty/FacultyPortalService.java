package com.school.sis.faculty;

import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.RefreshTokenRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.setup.repository.FacultyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
public class FacultyPortalService {
    private static final Set<String> ATTENDANCE = Set.of("PRESENT", "LATE", "ABSENT", "EXCUSED");
    private static final Set<String> CONTENT_STATES = Set.of("DRAFT", "PUBLISHED", "ARCHIVED");
    private static final Set<String> SAFE_MIME = Set.of("application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "image/png", "image/jpeg");
    private final JdbcTemplate jdbc;
    private final FacultyPortalAccess access;
    private final UserRepository users;
    private final FacultyRepository faculty;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final Path materialRoot;

    public FacultyPortalService(JdbcTemplate jdbc, FacultyPortalAccess access, UserRepository users, FacultyRepository faculty,
                                RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder,
                                @Value("${sis.storage.material-root:uploads/materials}") String materialRoot) {
        this.jdbc = jdbc; this.access = access; this.users = users; this.faculty = faculty;
        this.refreshTokens = refreshTokens; this.passwordEncoder = passwordEncoder;
        this.materialRoot = Path.of(materialRoot).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public Map<String,Object> dashboard(SisUserDetails p) {
        UUID facultyId = access.facultyId(p);
        var classes = classes(p);
        String day = DayOfWeek.from(LocalDate.now()).name();
        var today = jdbc.queryForList("""
            select cs.id as "scheduleId", c.course_code as "courseCode", c.course_title as "courseTitle",
                   s.section_code as "sectionCode", r.room_code as "roomCode", sm.delivery_mode as "deliveryMode",
                   sm.start_time as "startTime", sm.end_time as "endTime"
            from class_schedules cs join courses c on c.id=cs.course_id join sections s on s.id=cs.section_id
            join schedule_meetings sm on sm.class_schedule_id=cs.id and sm.active=true left join rooms r on r.id=sm.room_id
            where cs.faculty_id=? and cs.status='ACTIVE' and sm.day_of_week=? order by sm.start_time
            """, facultyId, day);
        long returned = classes.stream().filter(x -> "RETURNED_FOR_CORRECTION".equals(x.get("gradeStatus"))).count();
        return Map.of("today", today, "classes", classes, "returnedGradebooks", returned,
                "activeTerm", activeTerm(), "hasAdvising", hasAdvising(p));
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> classes(SisUserDetails p) {
        return jdbc.queryForList("""
            select cs.id as "scheduleId", c.course_code as "courseCode", c.course_title as "courseTitle", s.section_code as "sectionCode",
                   coalesce(r.room_code,'Multiple / Online') as "roomCode", sy.school_year as "schoolYear", sem.name as "semesterName",
                   count(distinct case when e.status='CONFIRMED' then es.id end) as "studentCount", coalesce(cg.status,'DRAFT') as "gradeStatus",
                   coalesce((select count(*) from attendance_sessions a where a.schedule_id=cs.id and a.status='FINALIZED'),0) as "attendanceCount"
            from class_schedules cs join courses c on c.id=cs.course_id join sections s on s.id=cs.section_id
            left join rooms r on r.id=cs.room_id join school_years sy on sy.id=cs.school_year_id join semesters sem on sem.id=cs.semester_id
            left join enrollment_subjects es on es.class_schedule_id=cs.id and es.status='ENROLLED'
            left join enrollments e on e.id=es.enrollment_id and e.status='CONFIRMED'
            left join class_gradebooks cg on cg.schedule_id=cs.id
            where cs.faculty_id=? and cs.status='ACTIVE'
            group by cs.id,c.course_code,c.course_title,s.section_code,r.room_code,sy.school_year,sem.name,cg.status
            order by c.course_code,s.section_code
            """, access.facultyId(p));
    }

    @Transactional(readOnly = true)
    public Map<String,Object> classDetail(UUID scheduleId, SisUserDetails p) {
        access.assigned(scheduleId,p);
        var rows = jdbc.queryForList("""
            select cs.id as "scheduleId", c.course_code as "courseCode", c.course_title as "courseTitle", s.section_code as "sectionCode",
                   r.room_code as "roomCode", sy.school_year as "schoolYear", sem.name as "semesterName"
            from class_schedules cs join courses c on c.id=cs.course_id join sections s on s.id=cs.section_id
            left join rooms r on r.id=cs.room_id join school_years sy on sy.id=cs.school_year_id join semesters sem on sem.id=cs.semester_id
            where cs.id=?
            """, scheduleId);
        if(rows.isEmpty()) throw new NotFoundException("Class not found");
        var result = new LinkedHashMap<String,Object>(rows.getFirst());
        result.put("meetings", jdbc.queryForList("""
                select sm.id,sm.day_of_week as "dayOfWeek",sm.start_time as "startTime",sm.end_time as "endTime",
                       sm.component_type as "componentType",sm.delivery_mode as "deliveryMode",r.room_code as "roomCode",
                       sm.location_details as "locationDetails"
                from schedule_meetings sm left join rooms r on r.id=sm.room_id
                where sm.class_schedule_id=? and sm.active=true order by sm.day_of_week,sm.start_time
                """, scheduleId));
        result.put("roster", roster(scheduleId,p));
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> roster(UUID scheduleId, SisUserDetails p) {
        access.assigned(scheduleId,p);
        return jdbc.queryForList("""
            select es.id as "enrollmentSubjectId", st.id as "studentId", st.student_number as "studentNumber",
                   concat(st.last_name, ', ', st.first_name) as "studentName", pr.program_code as "programCode", sec.section_code as "sectionCode", es.status
            from enrollment_subjects es join enrollments e on e.id=es.enrollment_id join students st on st.id=e.student_id
            join programs pr on pr.id=e.program_id left join sections sec on sec.id=e.section_id
            where es.class_schedule_id=? and es.status='ENROLLED' and e.status='CONFIRMED' order by st.last_name,st.first_name
            """, scheduleId);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> schedule(SisUserDetails p) {
        Map<String,Object> term = activeTerm();
        if (term.isEmpty()) return List.of();
        return schedule((UUID) term.get("schoolYearId"), (UUID) term.get("semesterId"), p);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> schedule(UUID schoolYearId, UUID semesterId, SisUserDetails p) {
        return jdbc.queryForList("""
            select cs.id as "scheduleId", c.course_code as "courseCode", c.course_title as "courseTitle", s.section_code as "sectionCode",
                   r.room_code as "roomCode", sm.delivery_mode as "deliveryMode",sm.component_type as "componentType",
                   sm.location_details as "locationDetails",sm.day_of_week as "dayOfWeek", sm.start_time as "startTime", sm.end_time as "endTime"
            from class_schedules cs join courses c on c.id=cs.course_id join sections s on s.id=cs.section_id
            join schedule_meetings sm on sm.class_schedule_id=cs.id and sm.active=true left join rooms r on r.id=sm.room_id
            where cs.faculty_id=? and cs.status='ACTIVE' and cs.school_year_id=? and cs.semester_id=?
            order by sm.day_of_week,sm.start_time
            """, access.facultyId(p), schoolYearId, semesterId);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> scheduleTerms(SisUserDetails p) {
        return jdbc.queryForList("""
                select distinct sy.id as "schoolYearId",sy.school_year as "schoolYear",sem.id as "semesterId",
                       sem.name as "semesterName",sy.active and sem.active as active
                from class_schedules cs join school_years sy on sy.id=cs.school_year_id join semesters sem on sem.id=cs.semester_id
                where cs.faculty_id=? and cs.status in ('ACTIVE','ARCHIVED')
                order by sy.school_year desc,sem.sort_order desc
                """, access.facultyId(p));
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> scheduleChanges(UUID schoolYearId, UUID semesterId, SisUserDetails p) {
        return jdbc.queryForList("""
                select h.id,h.action,h.reason,h.created_at as "changedAt",u.full_name as "actorName",
                       c.course_code as "courseCode",s.section_code as "sectionCode"
                from schedule_change_history h join class_schedules cs on cs.id=h.schedule_id
                join courses c on c.id=cs.course_id join sections s on s.id=cs.section_id left join users u on u.id=h.actor_id
                where cs.faculty_id=? and cs.school_year_id=? and cs.semester_id=?
                order by h.created_at desc limit 5
                """, access.facultyId(p), schoolYearId, semesterId);
    }

    @Transactional(readOnly = true)
    public Map<String,Object> profile(SisUserDetails p) {
        var rows=jdbc.queryForList("""
            select f.employee_number as "employeeNumber", concat(f.first_name,' ',f.last_name) as "fullName", f.email,
                   f.contact_number as "contactNumber", d.department_name as department, f.employment_status as "employmentStatus", f.faculty_type as "facultyType"
            from faculty f join departments d on d.id=f.department_id where f.id=?
            """,access.facultyId(p));
        if(rows.isEmpty()) throw new NotFoundException("Faculty profile not found");
        return rows.getFirst();
    }

    @Transactional
    public Map<String,Object> updateProfile(String email,String contactNumber,SisUserDetails p) {
        String normalized=email.trim().toLowerCase(Locale.ROOT); UUID facultyId=access.facultyId(p);
        Integer duplicate=jdbc.queryForObject("select count(*) from users where lower(email)=? and id<>?",Integer.class,normalized,p.id());
        if(duplicate!=null&&duplicate>0) throw new BusinessRuleException("Email is already in use");
        User user=users.findById(p.id()).orElseThrow(()->new NotFoundException("User not found"));
        Faculty f=faculty.findById(facultyId).orElseThrow(()->new NotFoundException("Faculty profile not found"));
        user.setEmail(normalized); f.setEmail(normalized); f.setContactNumber(contactNumber==null?null:contactNumber.trim());
        users.save(user); faculty.save(f); return profile(p);
    }

    @Transactional
    public void changePassword(String current,String next,String currentRefreshToken,SisUserDetails p) {
        if(next==null||next.length()<8||!next.matches(".*[A-Za-z].*")||!next.matches(".*\\d.*"))
            throw new BusinessRuleException("New password must be at least 8 characters and include a letter and number");
        User user=users.findById(p.id()).orElseThrow(()->new NotFoundException("User not found"));
        if(!passwordEncoder.matches(current,user.getPasswordHash())) throw new BusinessRuleException("Current password is incorrect");
        user.setPasswordHash(passwordEncoder.encode(next)); users.save(user);
        jdbc.update("update refresh_tokens set revoked_at=now() where user_id=? and token<>? and revoked_at is null",p.id(),currentRefreshToken==null?"":currentRefreshToken);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> attendance(UUID scheduleId,SisUserDetails p){ access.assigned(scheduleId,p); return jdbc.queryForList("select id,meeting_date as \"meetingDate\",start_time as \"startTime\",end_time as \"endTime\",room_code as \"roomCode\",status,finalized_at as \"finalizedAt\",version from attendance_sessions where schedule_id=? order by meeting_date desc",scheduleId); }

    @Transactional
    public Map<String,Object> createAttendance(UUID scheduleId,UUID meetingId,LocalDate date,SisUserDetails p){
        access.assigned(scheduleId,p); UUID id=UUID.randomUUID();
        var meeting=jdbc.queryForList("select sm.start_time,sm.end_time,r.room_code from schedule_meetings sm join class_schedules cs on cs.id=sm.class_schedule_id join rooms r on r.id=cs.room_id where sm.id=? and cs.id=?",meetingId,scheduleId);
        if(meeting.isEmpty()) throw new BusinessRuleException("Meeting does not belong to this class");
        try { jdbc.update("insert into attendance_sessions(id,schedule_id,meeting_id,meeting_date,start_time,end_time,room_code,created_by) values(?,?,?,?,?,?,?,?)",
                id,scheduleId,meetingId,date,meeting.getFirst().get("start_time"),meeting.getFirst().get("end_time"),meeting.getFirst().get("room_code"),p.id()); }
        catch(Exception e){ throw new BusinessRuleException("Attendance already exists for this meeting and date"); }
        jdbc.update("""
            insert into attendance_entries(id,session_id,enrollment_subject_id,attendance_status,recorded_by)
            select gen_random_uuid(), ?, es.id, 'PRESENT', ? from enrollment_subjects es join enrollments e on e.id=es.enrollment_id
            where es.class_schedule_id=? and es.status='ENROLLED' and e.status='CONFIRMED'
            """,id,p.id(),scheduleId);
        history(id,"CREATED",null,p.id()); return attendanceSession(id,p);
    }

    @Transactional(readOnly=true)
    public Map<String,Object> attendanceSession(UUID id,SisUserDetails p){
        var rows=jdbc.queryForList("select a.*,a.meeting_date as \"meetingDate\" from attendance_sessions a join class_schedules cs on cs.id=a.schedule_id where a.id=? and cs.faculty_id=?",id,access.facultyId(p));
        if(rows.isEmpty()) throw new NotFoundException("Attendance session not found"); var out=new LinkedHashMap<String,Object>(rows.getFirst());
        out.put("entries",jdbc.queryForList("select ae.enrollment_subject_id as \"enrollmentSubjectId\",st.student_number as \"studentNumber\",concat(st.last_name,', ',st.first_name) as \"studentName\",ae.attendance_status as status,ae.notes from attendance_entries ae join enrollment_subjects es on es.id=ae.enrollment_subject_id join enrollments e on e.id=es.enrollment_id join students st on st.id=e.student_id where ae.session_id=? order by st.last_name,st.first_name",id)); return out;
    }

    @Transactional
    public Map<String,Object> saveAttendance(UUID id,List<Map<String,String>> entries,SisUserDetails p){
        Map<String,Object> session=attendanceSession(id,p); if("FINALIZED".equals(session.get("status"))) throw new BusinessRuleException("Finalized attendance must be reopened before editing");
        for(var entry:entries){String status=entry.get("status");if(!ATTENDANCE.contains(status))throw new BusinessRuleException("Invalid attendance status");
            jdbc.update("update attendance_entries set attendance_status=?,notes=?,recorded_by=?,updated_at=now() where session_id=? and enrollment_subject_id=?",status,entry.get("notes"),p.id(),id,UUID.fromString(entry.get("enrollmentSubjectId")));}
        history(id,"ENTRIES_UPDATED",null,p.id());return attendanceSession(id,p);
    }

    @Transactional public Map<String,Object> finalizeAttendance(UUID id,SisUserDetails p){attendanceSession(id,p);jdbc.update("update attendance_sessions set status='FINALIZED',finalized_by=?,finalized_at=now(),version=version+1,updated_at=now() where id=?",p.id(),id);history(id,"FINALIZED",null,p.id());return attendanceSession(id,p);}
    @Transactional public Map<String,Object> reopenAttendance(UUID id,String reason,SisUserDetails p){attendanceSession(id,p);if(reason==null||reason.isBlank())throw new BusinessRuleException("A reopening reason is required");jdbc.update("update attendance_sessions set status='DRAFT',reopened_reason=?,version=version+1,updated_at=now() where id=?",reason,id);history(id,"REOPENED",reason,p.id());return attendanceSession(id,p);}

    @Transactional(readOnly=true) public List<Map<String,Object>> announcements(UUID scheduleId,SisUserDetails p){access.assigned(scheduleId,p);return jdbc.queryForList("select id,title,body,status,published_at as \"publishedAt\",created_at as \"createdAt\" from class_announcements where schedule_id=? order by created_at desc",scheduleId);}
    @Transactional public Map<String,Object> saveAnnouncement(UUID scheduleId,UUID id,String title,String body,String status,SisUserDetails p){access.assigned(scheduleId,p);if(!CONTENT_STATES.contains(status))throw new BusinessRuleException("Invalid content status");UUID value=id==null?UUID.randomUUID():id;if(id==null)jdbc.update("insert into class_announcements(id,schedule_id,title,body,status,published_at,author_id) values(?,?,?,?,?,case when ?='PUBLISHED' then now() end,?)",value,scheduleId,title.trim(),body.trim(),status,status,p.id());else jdbc.update("update class_announcements set title=?,body=?,status=?,published_at=case when ?='PUBLISHED' then coalesce(published_at,now()) else published_at end,updated_at=now() where id=? and schedule_id=?",title.trim(),body.trim(),status,status,value,scheduleId);return jdbc.queryForMap("select id,title,body,status,published_at as \"publishedAt\" from class_announcements where id=?",value);}

    @Transactional public Map<String,Object> uploadMaterial(UUID scheduleId,String title,String description,String status,MultipartFile file,SisUserDetails p){access.assigned(scheduleId,p);if(file==null||file.isEmpty())throw new BusinessRuleException("A file is required");if(file.getSize()>25*1024*1024)throw new BusinessRuleException("File exceeds the 25 MB limit");if(!SAFE_MIME.contains(file.getContentType()))throw new BusinessRuleException("File type is not allowed");if(!CONTENT_STATES.contains(status))throw new BusinessRuleException("Invalid content status");try{Files.createDirectories(materialRoot);String stored=UUID.randomUUID()+extension(file.getOriginalFilename());Path target=materialRoot.resolve(stored).normalize();if(!target.startsWith(materialRoot))throw new BusinessRuleException("Invalid file name");Files.copy(file.getInputStream(),target,StandardCopyOption.REPLACE_EXISTING);UUID id=UUID.randomUUID();jdbc.update("insert into class_materials(id,schedule_id,title,description,original_filename,stored_filename,mime_type,file_size,status,published_at,uploaded_by) values(?,?,?,?,?,?,?,?,?,case when ?='PUBLISHED' then now() end,?)",id,scheduleId,title.trim(),description,file.getOriginalFilename(),stored,file.getContentType(),file.getSize(),status,status,p.id());return jdbc.queryForMap("select id,title,description,original_filename as \"filename\",mime_type as \"mimeType\",file_size as \"fileSize\",status from class_materials where id=?",id);}catch(IOException e){throw new BusinessRuleException("Unable to store material");}}
    @Transactional(readOnly=true) public List<Map<String,Object>> materials(UUID scheduleId,SisUserDetails p){access.assigned(scheduleId,p);return jdbc.queryForList("select id,title,description,original_filename as \"filename\",mime_type as \"mimeType\",file_size as \"fileSize\",status,published_at as \"publishedAt\" from class_materials where schedule_id=? and status<>'ARCHIVED' order by created_at desc",scheduleId);}

    @Transactional(readOnly=true) public boolean hasAdvising(SisUserDetails p){Integer n=jdbc.queryForObject("select count(*) from adviser_assignments where faculty_id=? and active=true",Integer.class,access.facultyId(p));return n!=null&&n>0;}
    @Transactional(readOnly=true) public List<Map<String,Object>> advisees(SisUserDetails p){return jdbc.queryForList("select aa.id as \"assignmentId\",s.id as \"studentId\",s.student_number as \"studentNumber\",concat(s.last_name,', ',s.first_name) as \"studentName\",pr.program_code as \"programCode\",s.year_level as \"yearLevel\",s.academic_status as \"academicStatus\",sc.section_code as \"sectionCode\",coalesce(c.email_address,'') as email,coalesce(c.mobile_number,'') as \"mobileNumber\" from adviser_assignments aa join enrollments e on e.section_id=aa.section_id and e.school_year_id=aa.school_year_id and e.semester_id=aa.semester_id and e.status='CONFIRMED' join students s on s.id=e.student_id join programs pr on pr.id=e.program_id join sections sc on sc.id=aa.section_id left join student_contacts c on c.student_id=s.id where aa.faculty_id=? and aa.active=true order by s.last_name,s.first_name",access.facultyId(p));}
    @Transactional public Map<String,Object> addAdvisingNote(UUID assignmentId,UUID studentId,String category,String narrative,LocalDate followUp,SisUserDetails p){access.adviser(assignmentId,p);Integer n=jdbc.queryForObject("select count(*) from adviser_assignments aa join enrollments e on e.section_id=aa.section_id and e.school_year_id=aa.school_year_id and e.semester_id=aa.semester_id where aa.id=? and e.student_id=? and e.status='CONFIRMED'",Integer.class,assignmentId,studentId);if(n==null||n==0)throw new BusinessRuleException("Student is not assigned to this adviser");UUID id=UUID.randomUUID();jdbc.update("insert into advising_notes(id,assignment_id,student_id,category,narrative,follow_up_date,author_id) values(?,?,?,?,?,?,?)",id,assignmentId,studentId,category,narrative.trim(),followUp,p.id());return jdbc.queryForMap("select id,category,narrative,follow_up_date as \"followUpDate\",created_at as \"createdAt\" from advising_notes where id=?",id);}

    @Transactional(readOnly=true) public List<Map<String,Object>> corrections(SisUserDetails p){return jdbc.queryForList("select r.id,r.schedule_id as \"scheduleId\",st.student_number as \"studentNumber\",concat(st.last_name,', ',st.first_name) as \"studentName\",c.course_code as \"courseCode\",r.current_grade as \"currentGrade\",r.proposed_grade as \"proposedGrade\",r.proposed_remark as \"proposedRemark\",r.reason,r.status,r.review_comment as \"reviewComment\",r.created_at as \"createdAt\" from grade_correction_requests r join grades g on g.id=r.grade_id join students st on st.id=g.student_id join courses c on c.id=g.course_id where r.requested_by=? order by r.created_at desc",p.id());}
    @Transactional(readOnly=true) public List<Map<String,Object>> lockedGrades(SisUserDetails p){return jdbc.queryForList("select g.id as \"gradeId\",g.final_grade as \"finalGrade\",g.remarks,g.status,st.student_number as \"studentNumber\",concat(st.last_name,', ',st.first_name) as \"studentName\",c.course_code as \"courseCode\",sec.section_code as \"sectionCode\" from grades g join students st on st.id=g.student_id join courses c on c.id=g.course_id join sections sec on sec.id=g.section_id where g.faculty_id=? and g.status='LOCKED' order by c.course_code,st.last_name",access.facultyId(p));}
    @Transactional public Map<String,Object> requestCorrection(UUID gradeId,BigDecimal proposedGrade,String proposedRemark,String reason,SisUserDetails p){var rows=jdbc.queryForList("select g.final_grade,g.status,cs.id schedule_id from grades g join class_schedules cs on cs.id=? where g.id=? and cs.faculty_id=?",jdbc.queryForObject("select class_schedule_id from enrollment_subjects where id=(select enrollment_subject_id from grades where id=?)",UUID.class,gradeId),gradeId,access.facultyId(p));if(rows.isEmpty())throw new BusinessRuleException("Grade does not belong to an assigned class");if(!"LOCKED".equals(rows.getFirst().get("status")))throw new BusinessRuleException("Only locked grades use the correction-request workflow");UUID id=UUID.randomUUID();UUID scheduleId=(UUID)rows.getFirst().get("schedule_id");jdbc.update("insert into grade_correction_requests(id,grade_id,schedule_id,requested_by,current_grade,proposed_grade,proposed_remark,reason) values(?,?,?,?,?,?,?,?)",id,gradeId,scheduleId,p.id(),rows.getFirst().get("final_grade"),proposedGrade,proposedRemark,reason.trim());jdbc.update("insert into grade_correction_history(request_id,to_status,comment,changed_by) values(?,'SUBMITTED',?,?)",id,reason,p.id());return jdbc.queryForMap("select id,status,created_at as \"createdAt\" from grade_correction_requests where id=?",id);}
    @Transactional public void cancelCorrection(UUID id,SisUserDetails p){int n=jdbc.update("update grade_correction_requests set status='CANCELLED',version=version+1,updated_at=now() where id=? and requested_by=? and status='SUBMITTED'",id,p.id());if(n==0)throw new BusinessRuleException("Only a submitted request can be cancelled");jdbc.update("insert into grade_correction_history(request_id,from_status,to_status,changed_by) values(?,'SUBMITTED','CANCELLED',?)",id,p.id());}

    private Map<String,Object> activeTerm(){var rows=jdbc.queryForList("select sy.id as \"schoolYearId\",sy.school_year as \"schoolYear\",sem.id as \"semesterId\",sem.name as \"semesterName\" from school_years sy cross join semesters sem where sy.active=true and sem.active=true order by sem.sort_order limit 1");return rows.isEmpty()?Map.of():rows.getFirst();}
    private void history(UUID session,String action,String reason,UUID user){jdbc.update("insert into attendance_history(session_id,action,reason,changed_by) values(?,?,?,?)",session,action,reason,user);}
    private String extension(String name){if(name==null)return "";int i=name.lastIndexOf('.');return i<0?"":name.substring(i).replaceAll("[^A-Za-z0-9.]","").toLowerCase(Locale.ROOT);}
}
