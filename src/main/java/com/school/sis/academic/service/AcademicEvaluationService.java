package com.school.sis.academic.service;

import com.school.sis.academic.dto.AcademicExceptionRequests;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AcademicEvaluationService {
    private static final Set<String> TYPES = Set.of("TRANSFER", "SHIFT", "SECOND_DEGREE", "CURRICULUM_MIGRATION", "OTHER");
    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public AcademicEvaluationService(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UUID studentId, String status, SisUserDetails principal) {
        StringBuilder sql = new StringBuilder("""
                select c.id,c.student_id as "studentId",s.student_number as "studentNumber",
                       concat(s.last_name,', ',s.first_name) as "studentName",c.evaluation_type as "evaluationType",
                       c.status,c.source_institution as "sourceInstitution",c.target_curriculum_id as "targetCurriculumId",
                       tc.curriculum_code as "targetCurriculumCode",p.program_code as "programCode",c.created_at as "createdAt"
                from academic_evaluation_cases c join students s on s.id=c.student_id
                join curricula tc on tc.id=c.target_curriculum_id join programs p on p.id=tc.program_id
                where 1=1
                """);
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        if (studentId != null) { sql.append(" and c.student_id=?"); args.add(studentId); }
        if (status != null && !status.isBlank()) { sql.append(" and c.status=?"); args.add(status); }
        if (reviewOnly(principal)) {
            ensureLinkedFaculty(principal);
            sql.append(" and p.department_id=(select department_id from faculty where id=?)");
            args.add(principal.facultyId());
        }
        sql.append(" order by c.created_at desc");
        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get(UUID id, SisUserDetails principal) {
        ensureViewScope(id, principal);
        Map<String, Object> response = new LinkedHashMap<>(caseRow(id, false));
        response.put("sourceCourses", jdbc.queryForList("""
                select id,source_type as "sourceType",source_reference_id as "sourceReferenceId",course_code as "courseCode",
                       course_title as "courseTitle",credit_units as "creditUnits",source_grade as "sourceGrade",
                       source_remarks as "sourceRemarks",term_label as "termLabel",school_year_label as "schoolYearLabel"
                from academic_evaluation_source_courses where case_id=? order by course_code
                """, id));
        List<Map<String, Object>> matches = jdbc.queryForList("""
                select m.id,m.target_course_id as "targetCourseId",co.course_code as "targetCourseCode",
                       co.course_title as "targetCourseTitle",m.status,m.recommended_units as "recommendedUnits",
                       m.rationale,m.evaluated_at as "evaluatedAt"
                from academic_evaluation_matches m join courses co on co.id=m.target_course_id
                where m.case_id=? order by co.course_code
                """, id);
        matches.forEach(match -> match.put("sourceCourseIds", jdbc.queryForList(
                "select source_course_id from academic_evaluation_match_sources where match_id=? order by source_course_id",
                match.get("id")).stream().map(row -> row.get("source_course_id")).toList()));
        response.put("matches", matches);
        response.put("documents", jdbc.queryForList("""
                select d.id,d.document_type as "documentType",d.file_name as "fileName",d.verification_status as "verificationStatus"
                from academic_evaluation_document_links l join student_documents d on d.id=l.document_id
                where l.case_id=? order by d.created_at
                """, id));
        response.put("history", jdbc.queryForList("""
                select h.id,h.from_status as "fromStatus",h.to_status as "toStatus",h.remarks,
                       u.full_name as "changedBy",h.changed_at as "changedAt"
                from academic_evaluation_history h join users u on u.id=h.changed_by
                where h.case_id=? order by h.changed_at
                """, id));
        if ("CURRICULUM_MIGRATION".equals(response.get("evaluationType"))) {
            response.put("migrationImpact", migrationImpact(id, (UUID) response.get("studentId"),
                    (UUID) response.get("targetCurriculumId")));
        }
        return response;
    }

    @Transactional
    public Map<String, Object> create(AcademicExceptionRequests.CaseRequest request, SisUserDetails principal) {
        String type = request.evaluationType().trim().toUpperCase();
        if (!TYPES.contains(type)) throw rule("INVALID_EVALUATION_TYPE", "Unsupported academic evaluation type");
        requireExists("students", request.studentId(), "Student not found");
        requireExists("curricula", request.targetCurriculumId(), "Target curriculum not found");
        if (type.equals("CURRICULUM_MIGRATION") && request.fromCurriculumId() == null)
            throw rule("SOURCE_CURRICULUM_REQUIRED", "Curriculum migration requires a source curriculum");
        validateMigrationAssignment(type, request.studentId(), request.fromCurriculumId(), request.targetCurriculumId());
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into academic_evaluation_cases(id,student_id,evaluation_type,source_institution,from_curriculum_id,
                target_curriculum_id,status,reason,created_by) values(?,?,?,?,?,?,'DRAFT',?,?)
                """, id, request.studentId(), type, clean(request.sourceInstitution()), request.fromCurriculumId(),
                request.targetCurriculumId(), clean(request.reason()), principal.id());
        history(id, null, "DRAFT", "Academic evaluation created", principal.id());
        if (type.equals("CURRICULUM_MIGRATION")) importMigrationSources(id, request.studentId());
        audit.log(principal, "ACADEMIC_EVALUATION_CREATED", "ACADEMIC", "AcademicEvaluationCase", id, null,
                Map.of("studentId", request.studentId(), "type", type));
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> update(UUID id, AcademicExceptionRequests.CaseRequest request, SisUserDetails principal) {
        Map<String, Object> current = caseRow(id, true);
        requireMutable((String) current.get("status"));
        String type = request.evaluationType().trim().toUpperCase();
        if (!TYPES.contains(type)) throw rule("INVALID_EVALUATION_TYPE", "Unsupported academic evaluation type");
        if (!request.studentId().equals(current.get("studentId")))
            throw rule("EVALUATION_STUDENT_IMMUTABLE", "The student cannot be changed after an evaluation case is created");
        if (!type.equals(current.get("evaluationType")))
            throw rule("EVALUATION_TYPE_IMMUTABLE", "The evaluation type cannot be changed after creation");
        requireExists("curricula", request.targetCurriculumId(), "Target curriculum not found");
        if (type.equals("CURRICULUM_MIGRATION") && request.fromCurriculumId() == null)
            throw rule("SOURCE_CURRICULUM_REQUIRED", "Curriculum migration requires a source curriculum");
        validateMigrationAssignment(type, request.studentId(), request.fromCurriculumId(), request.targetCurriculumId());
        if (!request.targetCurriculumId().equals(current.get("targetCurriculumId"))) {
            jdbc.update("delete from academic_evaluation_matches where case_id=?", id);
        }
        jdbc.update("""
                update academic_evaluation_cases set student_id=?,evaluation_type=?,source_institution=?,from_curriculum_id=?,
                target_curriculum_id=?,reason=?,updated_at=now() where id=?
                """, request.studentId(), type, clean(request.sourceInstitution()), request.fromCurriculumId(),
                request.targetCurriculumId(), clean(request.reason()), id);
        audit.log(principal, "ACADEMIC_EVALUATION_UPDATED", "ACADEMIC", "AcademicEvaluationCase", id, current,
                Map.of("studentId", request.studentId(), "type", type));
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> addSource(UUID caseId, AcademicExceptionRequests.SourceCourse request, SisUserDetails principal) {
        requireMutable((String) caseRow(caseId, true).get("status"));
        String sourceType = validateSourceType(request.sourceType());
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into academic_evaluation_source_courses(id,case_id,source_type,source_reference_id,course_code,
                course_title,credit_units,source_grade,source_remarks,term_label,school_year_label)
                values(?,?,?,?,?,?,?,?,?,?,?)
                """, id, caseId, sourceType, request.sourceReferenceId(), request.courseCode().trim(),
                request.courseTitle().trim(), request.creditUnits(), clean(request.sourceGrade()),
                clean(request.sourceRemarks()), clean(request.termLabel()), clean(request.schoolYearLabel()));
        audit.log(principal, "ACADEMIC_SOURCE_COURSE_ADDED", "ACADEMIC", "AcademicEvaluationSourceCourse", id, null,
                Map.of("caseId", caseId, "courseCode", request.courseCode()));
        return get(caseId, principal);
    }

    @Transactional
    public Map<String, Object> updateSource(UUID caseId, UUID sourceId, AcademicExceptionRequests.SourceCourse request,
                                            SisUserDetails principal) {
        requireMutable((String) caseRow(caseId, true).get("status"));
        String sourceType = validateSourceType(request.sourceType());
        invalidateMatchesUsingSource(caseId, sourceId);
        int changed = jdbc.update("""
                update academic_evaluation_source_courses set source_type=?,source_reference_id=?,course_code=?,
                course_title=?,credit_units=?,source_grade=?,source_remarks=?,term_label=?,school_year_label=?
                where id=? and case_id=?
                """, sourceType, request.sourceReferenceId(), request.courseCode().trim(), request.courseTitle().trim(),
                request.creditUnits(), clean(request.sourceGrade()), clean(request.sourceRemarks()),
                clean(request.termLabel()), clean(request.schoolYearLabel()), sourceId, caseId);
        if (changed == 0) throw new NotFoundException("Source course not found");
        audit.log(principal, "ACADEMIC_SOURCE_COURSE_UPDATED", "ACADEMIC", "AcademicEvaluationSourceCourse",
                sourceId, null, Map.of("caseId", caseId, "courseCode", request.courseCode()));
        return get(caseId, principal);
    }

    @Transactional
    public Map<String, Object> removeSource(UUID caseId, UUID sourceId, SisUserDetails principal) {
        requireMutable((String) caseRow(caseId, true).get("status"));
        invalidateMatchesUsingSource(caseId, sourceId);
        int changed = jdbc.update("delete from academic_evaluation_source_courses where id=? and case_id=?", sourceId, caseId);
        if (changed == 0) throw new NotFoundException("Source course not found");
        return get(caseId, principal);
    }

    @Transactional
    public Map<String, Object> linkDocument(UUID caseId, UUID documentId, SisUserDetails principal) {
        Map<String, Object> current = caseRow(caseId, true);
        requireMutable((String) current.get("status"));
        Integer owned = jdbc.queryForObject("""
                select count(*) from student_documents d where d.id=? and d.student_id=?
                """, Integer.class, documentId, current.get("studentId"));
        if (owned == null || owned == 0) throw rule("DOCUMENT_OWNER_MISMATCH", "Document does not belong to this student");
        jdbc.update("insert into academic_evaluation_document_links(case_id,document_id) values(?,?) on conflict do nothing",
                caseId, documentId);
        return get(caseId, principal);
    }

    @Transactional
    public Map<String, Object> submit(UUID id, SisUserDetails principal) {
        Map<String, Object> current = caseRow(id, true);
        requireMutable((String) current.get("status"));
        Integer sourceCount = jdbc.queryForObject("select count(*) from academic_evaluation_source_courses where case_id=?",
                Integer.class, id);
        if (sourceCount == null || sourceCount == 0) throw rule("SOURCE_COURSES_REQUIRED", "Add at least one source course before submission");
        transition(id, (String) current.get("status"), "PENDING_ACADEMIC_REVIEW", "Submitted for academic review", principal);
        jdbc.update("update academic_evaluation_cases set submitted_by=?,submitted_at=now() where id=?", principal.id(), id);
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> saveMatch(UUID caseId, AcademicExceptionRequests.Match request, SisUserDetails principal) {
        ensureReviewScope(caseId, principal);
        Map<String, Object> current = caseRow(caseId, true);
        if (!"PENDING_ACADEMIC_REVIEW".equals(current.get("status")))
            throw rule("INVALID_EVALUATION_STATE", "Matches can only be reviewed during academic review");
        String decision = request.status().trim().toUpperCase();
        if (!Set.of("RECOMMENDED", "REJECTED").contains(decision))
            throw rule("INVALID_MATCH_DECISION", "Match decision must be RECOMMENDED or REJECTED");
        requireTargetCourse(caseId, request.targetCourseId());
        validateSources(caseId, request.sourceCourseIds());
        validateRecommendedSourceReuse(caseId, request.targetCourseId(), request.sourceCourseIds(), decision);
        UUID matchId = jdbc.query("select id from academic_evaluation_matches where case_id=? and target_course_id=?",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null, caseId, request.targetCourseId());
        if (matchId == null) matchId = UUID.randomUUID();
        jdbc.update("delete from academic_evaluation_match_sources where match_id=?", matchId);
        jdbc.update("""
                insert into academic_evaluation_matches(id,case_id,target_course_id,status,recommended_units,rationale,evaluated_by,evaluated_at)
                values(?,?,?,?,?,?,?,now())
                on conflict(case_id,target_course_id) do update set status=excluded.status,recommended_units=excluded.recommended_units,
                rationale=excluded.rationale,evaluated_by=excluded.evaluated_by,evaluated_at=now(),updated_at=now()
                """, matchId, caseId, request.targetCourseId(), decision, request.recommendedUnits(),
                request.rationale().trim(), principal.id());
        try {
            for (UUID sourceId : request.sourceCourseIds())
                jdbc.update("insert into academic_evaluation_match_sources(match_id,source_course_id) values(?,?)", matchId, sourceId);
        } catch (DataIntegrityViolationException exception) {
            throw rule("SOURCE_COURSE_ALREADY_MATCHED", "A source course cannot be reused by another equivalency match");
        }
        audit.log(principal, "ACADEMIC_EQUIVALENCY_REVIEWED", "ACADEMIC", "AcademicEvaluationMatch", matchId, null,
                Map.of("caseId", caseId, "decision", decision));
        return get(caseId, principal);
    }

    @Transactional
    public Map<String, Object> forward(UUID id, AcademicExceptionRequests.Reason request, SisUserDetails principal) {
        ensureReviewScope(id, principal);
        Map<String, Object> current = caseRow(id, true);
        if (!"PENDING_ACADEMIC_REVIEW".equals(current.get("status")))
            throw rule("INVALID_EVALUATION_STATE", "Case is not pending academic review");
        Integer decisions = jdbc.queryForObject("select count(*) from academic_evaluation_matches where case_id=? and status in ('RECOMMENDED','REJECTED')",
                Integer.class, id);
        if (decisions == null || decisions == 0) throw rule("MATCH_REVIEW_REQUIRED", "Review at least one equivalency before forwarding");
        transition(id, "PENDING_ACADEMIC_REVIEW", "PENDING_REGISTRAR_APPROVAL", request.reason(), principal);
        jdbc.update("update academic_evaluation_cases set academic_reviewed_by=?,academic_reviewed_at=now() where id=?",
                principal.id(), id);
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> approve(UUID id, AcademicExceptionRequests.Reason request, SisUserDetails principal) {
        Map<String, Object> current = caseRow(id, true);
        if (!"PENDING_REGISTRAR_APPROVAL".equals(current.get("status")))
            throw rule("INVALID_EVALUATION_STATE", "Case is not pending Registrar approval");
        List<Map<String, Object>> recommended = jdbc.queryForList("""
                select m.id,m.target_course_id,co.course_code,co.course_title,
                       coalesce(m.recommended_units,co.credit_units) credited_units
                from academic_evaluation_matches m join courses co on co.id=m.target_course_id
                where m.case_id=? and m.status='RECOMMENDED' order by m.id for update
                """, id);
        if (recommended.isEmpty()) throw rule("APPROVED_MATCH_REQUIRED", "At least one recommended equivalency is required");
        for (Map<String, Object> match : recommended) {
            UUID targetCourseId = (UUID) match.get("target_course_id");
            Integer duplicate = jdbc.queryForObject("select count(*) from student_course_credits where student_id=? and target_course_id=? and active=true",
                    Integer.class, current.get("studentId"), targetCourseId);
            if (duplicate != null && duplicate > 0)
                throw rule("COURSE_CREDIT_ALREADY_EXISTS", "An active credit already exists for " + match.get("course_code"));
            Integer completed = jdbc.queryForObject("""
                    select count(*) from academic_records where student_id=? and course_id=?
                    and grade_status='LOCKED' and remarks='PASSED'
                    """, Integer.class, current.get("studentId"), targetCourseId);
            if (completed != null && completed > 0)
                throw rule("COURSE_ALREADY_COMPLETED", "An institutional passed record already satisfies " + match.get("course_code"));
            String label = sourceLabel((UUID) match.get("id"));
            jdbc.update("""
                    insert into student_course_credits(id,student_id,target_course_id,evaluation_case_id,evaluation_match_id,
                    credited_units,source_label,active,posted_by) values(?,?,?,?,?,?,?,true,?)
                    """, UUID.randomUUID(), current.get("studentId"), targetCourseId, id, match.get("id"),
                    match.get("credited_units"), label, principal.id());
        }
        if (Set.of("SHIFT", "CURRICULUM_MIGRATION").contains(current.get("evaluationType"))) {
            jdbc.update("""
                    update students set curriculum_id=?,program_id=(select program_id from curricula where id=?),updated_at=now()
                    where id=?
                    """, current.get("targetCurriculumId"), current.get("targetCurriculumId"), current.get("studentId"));
        }
        transition(id, "PENDING_REGISTRAR_APPROVAL", "APPROVED", request.reason(), principal);
        jdbc.update("update academic_evaluation_cases set registrar_decided_by=?,registrar_decided_at=now(),decision_reason=? where id=?",
                principal.id(), request.reason().trim(), id);
        audit.log(principal, "ACADEMIC_EVALUATION_APPROVED", "ACADEMIC", "AcademicEvaluationCase", id, current,
                Map.of("creditsPosted", recommended.size()));
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> returnCase(UUID id, AcademicExceptionRequests.Reason request, SisUserDetails principal) {
        Map<String, Object> current = caseRow(id, true);
        String status = (String) current.get("status");
        if ("PENDING_ACADEMIC_REVIEW".equals(status)) ensureReviewScope(id, principal);
        else if (!"PENDING_REGISTRAR_APPROVAL".equals(status) || !has(principal, "ACADEMIC_EVALUATION_APPROVE"))
            throw rule("INVALID_EVALUATION_STATE", "Case cannot be returned from its current state");
        jdbc.update("""
                update academic_evaluation_matches set status='PENDING',recommended_units=null,rationale=null,
                evaluated_by=null,evaluated_at=null,updated_at=now() where case_id=?
                """, id);
        transition(id, status, "RETURNED", request.reason(), principal);
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> reject(UUID id, AcademicExceptionRequests.Reason request, SisUserDetails principal) {
        Map<String, Object> current = caseRow(id, true);
        String status = (String) current.get("status");
        if ("PENDING_ACADEMIC_REVIEW".equals(status)) ensureReviewScope(id, principal);
        else if (!"PENDING_REGISTRAR_APPROVAL".equals(status) || !has(principal, "ACADEMIC_EVALUATION_APPROVE"))
            throw rule("INVALID_EVALUATION_STATE", "Case cannot be rejected from its current state");
        transition(id, status, "REJECTED", request.reason(), principal);
        return get(id, principal);
    }

    @Transactional
    public Map<String, Object> reverseCredit(UUID creditId, AcademicExceptionRequests.Reason request, SisUserDetails principal) {
        Map<String, Object> credit = jdbc.query("select id,student_id,target_course_id,active from student_course_credits where id=? for update",
                rs -> rs.next() ? Map.of("id", rs.getObject("id", UUID.class), "studentId", rs.getObject("student_id", UUID.class),
                        "courseId", rs.getObject("target_course_id", UUID.class), "active", rs.getBoolean("active")) : null, creditId);
        if (credit == null) throw new NotFoundException("Course credit not found");
        if (!Boolean.TRUE.equals(credit.get("active"))) throw rule("CREDIT_ALREADY_REVERSED", "Course credit is already inactive");
        Integer used = jdbc.queryForObject("""
                select count(*) from enrollment_subjects es join enrollments e on e.id=es.enrollment_id
                join class_schedules cs on cs.id=es.class_schedule_id
                where e.student_id=? and cs.course_id=? and e.status='CONFIRMED' and es.status='ENROLLED'
                """, Integer.class, credit.get("studentId"), credit.get("courseId"));
        if (used != null && used > 0) throw rule("CREDIT_IN_USE", "Credit cannot be reversed while the course is part of a confirmed enrollment");
        Integer dependencyUse = jdbc.queryForObject("""
                select count(*) from enrollment_subjects es join enrollments e on e.id=es.enrollment_id
                join students st on st.id=e.student_id join class_schedules cs on cs.id=es.class_schedule_id
                join curriculum_courses cc on cc.curriculum_id=st.curriculum_id and cc.course_id=cs.course_id
                left join curriculum_course_prerequisites pre on pre.curriculum_course_id=cc.id
                left join curriculum_course_corequisites core on core.curriculum_course_id=cc.id
                where e.student_id=? and e.status='CONFIRMED' and es.status='ENROLLED'
                  and (pre.prerequisite_course_id=? or core.corequisite_course_id=?)
                """, Integer.class, credit.get("studentId"), credit.get("courseId"), credit.get("courseId"));
        if (dependencyUse != null && dependencyUse > 0)
            throw rule("CREDIT_DEPENDENCY_IN_USE", "Credit cannot be reversed after it satisfied a confirmed prerequisite or corequisite");
        jdbc.update("update student_course_credits set active=false,updated_at=now() where id=?", creditId);
        jdbc.update("insert into student_course_credit_reversals(id,credit_id,reason,reversed_by) values(?,?,?,?)",
                UUID.randomUUID(), creditId, request.reason().trim(), principal.id());
        audit.log(principal, "STUDENT_COURSE_CREDIT_REVERSED", "ACADEMIC", "StudentCourseCredit", creditId, credit, Map.of("active", false));
        return credit;
    }

    private void transition(UUID id, String from, String to, String remarks, SisUserDetails principal) {
        int changed = jdbc.update("update academic_evaluation_cases set status=?,updated_at=now() where id=? and status=?", to, id, from);
        if (changed == 0) throw rule("CONCURRENT_EVALUATION_UPDATE", "Evaluation changed while this request was processed; refresh and retry");
        history(id, from, to, remarks, principal.id());
    }

    private void history(UUID id, String from, String to, String remarks, UUID actor) {
        jdbc.update("insert into academic_evaluation_history(id,case_id,from_status,to_status,remarks,changed_by) values(?,?,?,?,?,?)",
                UUID.randomUUID(), id, from, to, clean(remarks), actor);
    }

    private String validateSourceType(String value) {
        String sourceType = value.trim().toUpperCase();
        if (!Set.of("EXTERNAL", "INTERNAL_RECORD", "EXISTING_CREDIT").contains(sourceType))
            throw rule("INVALID_SOURCE_TYPE", "Unsupported source-course type");
        return sourceType;
    }

    private void invalidateMatchesUsingSource(UUID caseId, UUID sourceId) {
        jdbc.update("""
                delete from academic_evaluation_matches where case_id=? and id in (
                    select match_id from academic_evaluation_match_sources where source_course_id=?
                )
                """, caseId, sourceId);
    }

    private Map<String, Object> caseRow(UUID id, boolean lock) {
        String suffix = lock ? " for update" : "";
        Map<String, Object> row = jdbc.query("""
                select c.id,c.student_id as "studentId",s.student_number as "studentNumber",
                       concat(s.last_name,', ',s.first_name) as "studentName",c.evaluation_type as "evaluationType",
                       c.source_institution as "sourceInstitution",c.from_curriculum_id as "fromCurriculumId",
                       c.target_curriculum_id as "targetCurriculumId",tc.curriculum_code as "targetCurriculumCode",
                       p.program_code as "programCode",c.status,c.reason,c.decision_reason as "decisionReason",
                       c.submitted_at as "submittedAt",c.academic_reviewed_at as "academicReviewedAt",
                       c.registrar_decided_at as "registrarDecidedAt",c.created_at as "createdAt"
                from academic_evaluation_cases c join students s on s.id=c.student_id
                join curricula tc on tc.id=c.target_curriculum_id join programs p on p.id=tc.program_id
                where c.id=?
                """ + suffix, rs -> rs.next() ? new LinkedHashMap<>(Map.ofEntries(
                Map.entry("id", rs.getObject("id", UUID.class)),
                Map.entry("studentId", rs.getObject("studentId", UUID.class)),
                Map.entry("studentNumber", rs.getString("studentNumber")),
                Map.entry("studentName", rs.getString("studentName")),
                Map.entry("evaluationType", rs.getString("evaluationType")),
                Map.entry("targetCurriculumId", rs.getObject("targetCurriculumId", UUID.class)),
                Map.entry("targetCurriculumCode", rs.getString("targetCurriculumCode")),
                Map.entry("programCode", rs.getString("programCode")),
                Map.entry("status", rs.getString("status")),
                Map.entry("createdAt", rs.getObject("createdAt"))
        )) : null, id);
        if (row == null) throw new NotFoundException("Academic evaluation case not found");
        Map<String, Object> raw = jdbc.queryForMap("select source_institution,from_curriculum_id,reason,decision_reason,submitted_at,academic_reviewed_at,registrar_decided_at from academic_evaluation_cases where id=?", id);
        row.put("sourceInstitution", raw.get("source_institution"));
        row.put("fromCurriculumId", raw.get("from_curriculum_id"));
        row.put("reason", raw.get("reason"));
        row.put("decisionReason", raw.get("decision_reason"));
        row.put("submittedAt", raw.get("submitted_at"));
        row.put("academicReviewedAt", raw.get("academic_reviewed_at"));
        row.put("registrarDecidedAt", raw.get("registrar_decided_at"));
        return row;
    }

    private void ensureViewScope(UUID id, SisUserDetails principal) {
        if (reviewOnly(principal)) ensureReviewScope(id, principal);
    }

    private void ensureReviewScope(UUID id, SisUserDetails principal) {
        if (has(principal, "ACADEMIC_EVALUATION_APPROVE") || has(principal, "ROLE_SUPER_ADMIN")) return;
        ensureLinkedFaculty(principal);
        Integer scoped = jdbc.queryForObject("""
                select count(*) from academic_evaluation_cases c join curricula cu on cu.id=c.target_curriculum_id
                join programs p on p.id=cu.program_id join faculty f on f.department_id=p.department_id
                where c.id=? and f.id=?
                """, Integer.class, id, principal.facultyId());
        if (scoped == null || scoped == 0) throw rule("ACADEMIC_SCOPE_REQUIRED", "Evaluation is outside your academic department");
    }

    private boolean reviewOnly(SisUserDetails principal) {
        return has(principal, "ACADEMIC_EVALUATION_REVIEW") && !has(principal, "ACADEMIC_EVALUATION_APPROVE") && !has(principal, "ROLE_SUPER_ADMIN");
    }

    private boolean has(SisUserDetails principal, String authority) {
        return principal != null && principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(authority::equals);
    }

    private void ensureLinkedFaculty(SisUserDetails principal) {
        if (principal == null || principal.facultyId() == null)
            throw rule("LINKED_FACULTY_REQUIRED", "Academic reviewers require a linked faculty record");
    }

    private void requireTargetCourse(UUID caseId, UUID courseId) {
        Integer found = jdbc.queryForObject("""
                select count(*) from academic_evaluation_cases c join curriculum_courses cc on cc.curriculum_id=c.target_curriculum_id
                where c.id=? and cc.course_id=?
                """, Integer.class, caseId, courseId);
        if (found == null || found == 0) throw rule("TARGET_NOT_IN_CURRICULUM", "Target course is not part of the case curriculum");
    }

    private Map<String, Object> migrationImpact(UUID caseId, UUID studentId, UUID targetCurriculumId) {
        List<Map<String, Object>> mapped = jdbc.queryForList("""
                select co.id as "courseId",co.course_code as "courseCode",co.course_title as "courseTitle",
                       m.recommended_units as "recommendedUnits",
                       string_agg(sc.course_code || ' - ' || sc.course_title,'; ' order by sc.course_code) as "sourceCourses"
                from academic_evaluation_matches m join courses co on co.id=m.target_course_id
                join academic_evaluation_match_sources ms on ms.match_id=m.id
                join academic_evaluation_source_courses sc on sc.id=ms.source_course_id
                where m.case_id=? and m.status='RECOMMENDED'
                group by co.id,co.course_code,co.course_title,m.recommended_units order by co.course_code
                """, caseId);
        List<Map<String, Object>> unmapped = jdbc.queryForList("""
                select sc.id,sc.course_code as "courseCode",sc.course_title as "courseTitle",sc.credit_units as "creditUnits",
                       sc.source_type as "sourceType"
                from academic_evaluation_source_courses sc
                where sc.case_id=? and not exists(
                  select 1 from academic_evaluation_match_sources ms join academic_evaluation_matches m on m.id=ms.match_id
                  where ms.source_course_id=sc.id and m.status='RECOMMENDED')
                order by sc.course_code
                """, caseId);
        List<Map<String, Object>> deficiencies = jdbc.queryForList("""
                select co.id as "courseId",co.course_code as "courseCode",co.course_title as "courseTitle",
                       co.credit_units as "creditUnits",cc.year_level as "yearLevel",cc.semester
                from curriculum_courses cc join courses co on co.id=cc.course_id
                where cc.curriculum_id=? and cc.required_status='REQUIRED'
                  and not exists(select 1 from academic_records ar where ar.student_id=? and ar.course_id=co.id
                    and ar.grade_status='LOCKED' and ar.remarks='PASSED')
                  and not exists(select 1 from student_course_credits cr where cr.student_id=? and cr.target_course_id=co.id and cr.active=true)
                  and not exists(select 1 from academic_evaluation_matches m where m.case_id=? and m.target_course_id=co.id and m.status='RECOMMENDED')
                order by cc.year_level,cc.sort_order
                """, targetCurriculumId, studentId, studentId, caseId);
        List<Map<String, Object>> electiveImpact = jdbc.queryForList("""
                select g.id,g.group_code as "groupCode",g.group_name as "groupName",g.requirement_type as "requirementType",
                       g.required_course_count as "requiredCourseCount",g.required_units as "requiredUnits",count(gc.curriculum_course_id) as "eligibleCourseCount"
                from curriculum_requirement_groups g left join curriculum_requirement_group_courses gc on gc.group_id=g.id
                where g.curriculum_id=? and g.active=true group by g.id order by g.group_code
                """, targetCurriculumId);
        return Map.of("mappedCourses", mapped, "unmappedSourceCourses", unmapped,
                "newDeficiencies", deficiencies, "electiveGroups", electiveImpact);
    }

    private void validateMigrationAssignment(String type, UUID studentId, UUID fromCurriculumId, UUID targetCurriculumId) {
        if (!"CURRICULUM_MIGRATION".equals(type)) return;
        if (fromCurriculumId.equals(targetCurriculumId))
            throw rule("MIGRATION_TARGET_UNCHANGED", "Source and target curricula must be different");
        Integer assigned = jdbc.queryForObject("select count(*) from students where id=? and curriculum_id=?",
                Integer.class, studentId, fromCurriculumId);
        if (assigned == null || assigned == 0)
            throw rule("SOURCE_CURRICULUM_MISMATCH", "Source curriculum must match the student's current assignment");
    }

    private void validateSources(UUID caseId, List<UUID> sourceIds) {
        long unique = sourceIds.stream().distinct().count();
        if (unique != sourceIds.size()) throw rule("DUPLICATE_SOURCE", "Source-course list contains duplicates");
        String placeholders = String.join(",", java.util.Collections.nCopies(sourceIds.size(), "?"));
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        args.add(caseId);
        args.addAll(sourceIds);
        Integer found = jdbc.queryForObject(
                "select count(*) from academic_evaluation_source_courses where case_id=? and id in (" + placeholders + ")",
                Integer.class, args.toArray());
        if (found == null || found != sourceIds.size()) throw rule("SOURCE_CASE_MISMATCH", "One or more source courses do not belong to this case");
    }

    private void validateRecommendedSourceReuse(UUID caseId, UUID targetCourseId, List<UUID> sourceIds, String decision) {
        if (!"RECOMMENDED".equals(decision)) return;
        String placeholders = String.join(",", java.util.Collections.nCopies(sourceIds.size(), "?"));
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        args.add(caseId);
        args.add(targetCourseId);
        args.addAll(sourceIds);
        Integer reused = jdbc.queryForObject("""
                select count(*) from academic_evaluation_match_sources ms
                join academic_evaluation_matches m on m.id=ms.match_id
                where m.case_id=? and m.target_course_id<>? and m.status='RECOMMENDED'
                  and ms.source_course_id in (""" + placeholders + ")", Integer.class, args.toArray());
        if (reused != null && reused > 0)
            throw rule("SOURCE_COURSE_ALREADY_MATCHED", "A source course cannot be reused by another recommended equivalency");
    }

    private String sourceLabel(UUID matchId) {
        return jdbc.queryForObject("""
                select string_agg(sc.course_code || ' - ' || sc.course_title, '; ' order by sc.course_code)
                from academic_evaluation_match_sources ms join academic_evaluation_source_courses sc on sc.id=ms.source_course_id
                where ms.match_id=?
                """, String.class, matchId);
    }

    private void importMigrationSources(UUID caseId, UUID studentId) {
        jdbc.update("""
                insert into academic_evaluation_source_courses(id,case_id,source_type,source_reference_id,course_code,course_title,
                credit_units,source_grade,source_remarks,term_label,school_year_label)
                select gen_random_uuid(),?,'INTERNAL_RECORD',ar.id,ar.course_code,ar.course_title,ar.credit_units,
                ar.final_grade::text,ar.remarks,sm.name,sy.school_year
                from academic_records ar join semesters sm on sm.id=ar.semester_id join school_years sy on sy.id=ar.school_year_id
                where ar.student_id=? and ar.grade_status='LOCKED' and ar.remarks='PASSED'
                """, caseId, studentId);
        jdbc.update("""
                insert into academic_evaluation_source_courses(id,case_id,source_type,source_reference_id,course_code,course_title,
                credit_units,source_remarks)
                select gen_random_uuid(),?,'EXISTING_CREDIT',cr.id,co.course_code,co.course_title,cr.credited_units,cr.source_label
                from student_course_credits cr join courses co on co.id=cr.target_course_id
                where cr.student_id=? and cr.active=true
                """, caseId, studentId);
    }

    private void requireExists(String table, UUID id, String message) {
        if (!Set.of("students", "curricula").contains(table)) throw new IllegalArgumentException("Unsupported lookup table");
        Integer count = jdbc.queryForObject("select count(*) from " + table + " where id=?", Integer.class, id);
        if (count == null || count == 0) throw new NotFoundException(message);
    }

    private void requireMutable(String status) {
        if (!Set.of("DRAFT", "RETURNED").contains(status))
            throw rule("INVALID_EVALUATION_STATE", "Only draft or returned evaluations can be edited");
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private BusinessRuleException rule(String code, String message) { return new BusinessRuleException(code, message); }
}
