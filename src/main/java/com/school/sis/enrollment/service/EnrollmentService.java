package com.school.sis.enrollment.service;

import com.school.sis.academic.service.AcademicPolicyService;
import com.school.sis.academic.service.AcademicProgressService;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.service.StudentAccountProvisioningService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.common.response.PageResponse;
import com.school.sis.curriculum.entity.CurriculumCourse;
import com.school.sis.curriculum.entity.RequiredStatus;
import com.school.sis.curriculum.repository.CurriculumCourseRepository;
import com.school.sis.enrollment.dto.EnrollmentRequest;
import com.school.sis.enrollment.dto.EnrollmentResponse;
import com.school.sis.enrollment.dto.EnrollmentSearchCriteria;
import com.school.sis.enrollment.dto.EnrollmentSubjectRequest;
import com.school.sis.enrollment.dto.EnrollmentSubjectResponse;
import com.school.sis.enrollment.dto.EnrollmentSummaryResponse;
import com.school.sis.enrollment.dto.EnrollmentUpdateRequest;
import com.school.sis.enrollment.dto.EnrollmentValidationIssueResponse;
import com.school.sis.enrollment.dto.EnrollmentValidationResponse;
import com.school.sis.enrollment.dto.EnrollmentConfirmationResponse;
import com.school.sis.enrollment.dto.EnrollmentCancellationReadinessResponse;
import com.school.sis.enrollment.dto.EnrollmentStatusHistoryResponse;
import com.school.sis.enrollment.entity.Enrollment;
import com.school.sis.enrollment.entity.EnrollmentStatus;
import com.school.sis.enrollment.entity.EnrollmentStatusHistory;
import com.school.sis.enrollment.entity.EnrollmentSubject;
import com.school.sis.enrollment.entity.EnrollmentSubjectStatus;
import com.school.sis.enrollment.repository.EnrollmentRepository;
import com.school.sis.enrollment.repository.EnrollmentStatusHistoryRepository;
import com.school.sis.enrollment.repository.EnrollmentSubjectRepository;
import com.school.sis.fee.service.FinanceLedgerService;
import com.school.sis.schedule.dto.ScheduleMeetingResponse;
import com.school.sis.schedule.entity.ClassSchedule;
import com.school.sis.schedule.entity.ScheduleMeeting;
import com.school.sis.schedule.entity.ScheduleStatus;
import com.school.sis.schedule.repository.ClassScheduleRepository;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.setup.entity.Section;
import com.school.sis.setup.entity.Semester;
import com.school.sis.setup.repository.SchoolYearRepository;
import com.school.sis.setup.repository.SectionRepository;
import com.school.sis.setup.repository.SemesterRepository;
import com.school.sis.student.entity.Student;
import com.school.sis.student.entity.AdmissionType;
import com.school.sis.student.entity.StudentClassification;
import com.school.sis.student.repository.StudentRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EnrollmentService {

    private static final Set<EnrollmentStatus> ACTIVE_ENROLLMENT_STATUSES = Set.of(
            EnrollmentStatus.DRAFT, EnrollmentStatus.SUBMITTED, EnrollmentStatus.CONFIRMED);

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentSubjectRepository enrollmentSubjectRepository;
    private final EnrollmentStatusHistoryRepository statusHistoryRepository;
    private final StudentRepository studentRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final SemesterRepository semesterRepository;
    private final SectionRepository sectionRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final CurriculumCourseRepository curriculumCourseRepository;
    private final AuditService auditService;
    private final StudentAccountProvisioningService accountProvisioning;
    private final FinanceLedgerService financeLedger;
    private final AcademicProgressService academicProgress;
    private final AcademicPolicyService academicPolicy;
    private final JdbcTemplate jdbc;

    public EnrollmentService(
            EnrollmentRepository enrollmentRepository,
            EnrollmentSubjectRepository enrollmentSubjectRepository,
            EnrollmentStatusHistoryRepository statusHistoryRepository,
            StudentRepository studentRepository,
            SchoolYearRepository schoolYearRepository,
            SemesterRepository semesterRepository,
            SectionRepository sectionRepository,
            ClassScheduleRepository classScheduleRepository,
            CurriculumCourseRepository curriculumCourseRepository,
            AuditService auditService,
            StudentAccountProvisioningService accountProvisioning,
            FinanceLedgerService financeLedger,
            AcademicProgressService academicProgress,
            AcademicPolicyService academicPolicy,
            JdbcTemplate jdbc
    ) {
        this.enrollmentRepository = enrollmentRepository;
        this.enrollmentSubjectRepository = enrollmentSubjectRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.studentRepository = studentRepository;
        this.schoolYearRepository = schoolYearRepository;
        this.semesterRepository = semesterRepository;
        this.sectionRepository = sectionRepository;
        this.classScheduleRepository = classScheduleRepository;
        this.curriculumCourseRepository = curriculumCourseRepository;
        this.auditService = auditService;
        this.accountProvisioning = accountProvisioning;
        this.financeLedger = financeLedger;
        this.academicProgress = academicProgress;
        this.academicPolicy = academicPolicy;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public PageResponse<EnrollmentSummaryResponse> list(EnrollmentSearchCriteria criteria, Pageable pageable) {
        return PageResponse.from(enrollmentRepository.findAll(specification(criteria), pageable).map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public EnrollmentResponse get(UUID id) {
        return toResponse(findEnrollment(id));
    }

    @Transactional
    public EnrollmentResponse create(EnrollmentRequest request) {
        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("Student not found"));
        SchoolYear schoolYear = schoolYearRepository.findById(request.schoolYearId())
                .orElseThrow(() -> new NotFoundException("School year not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new NotFoundException("Semester not found"));
        academicPolicy.ensureCreationAllowed(student, schoolYear.getId());
        Section section = resolveSectionForStudent(student, schoolYear, semester, request.yearLevel(), request.sectionId());
        validateSection(student, schoolYear, semester, request.yearLevel(), section);
        validateNoDuplicateEnrollment(student.getId(), schoolYear.getId(), semester.getId());

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setProgram(student.getProgram());
        enrollment.setSchoolYear(schoolYear);
        enrollment.setSemester(semester);
        enrollment.setYearLevel(request.yearLevel());
        enrollment.setSection(section);
        enrollment.setRemarks(request.remarks());
        enrollment.setStatus(EnrollmentStatus.DRAFT);

        boolean flexible = isFlexibleLoad(student);
        if (!flexible && section != null) {
            List<ClassSchedule> activeSchedules = classScheduleRepository.findBySectionIdAndSchoolYearIdAndSemesterIdAndStatus(
                    section.getId(), schoolYear.getId(), semester.getId(), ScheduleStatus.ACTIVE);
            for (ClassSchedule schedule : activeSchedules) {
                CurriculumCourse requirement = curriculumCourseForSchedule(enrollment, schedule);
                if (requirement != null
                        && requirement.getRequiredStatus() == RequiredStatus.REQUIRED
                        && !academicProgress.hasSatisfiedCourse(student.getId(), schedule.getCourse().getId())) {
                    EnrollmentSubject subject = new EnrollmentSubject();
                    subject.setClassSchedule(schedule);
                    subject.setStatus(EnrollmentSubjectStatus.ENROLLED);
                    enrollment.addSubject(subject);
                }
            }
        }

        Enrollment saved = enrollmentRepository.save(enrollment);
        recordStatusHistory(saved, null, EnrollmentStatus.DRAFT, "Enrollment created");
        auditService.log("ENROLLMENT_CREATED", "ENROLLMENT", "Enrollment", saved.getId(), null,
                Map.of("studentId", student.getId(), "status", saved.getStatus().name()));

        for (EnrollmentSubject subject : saved.getSubjects()) {
            auditService.log("ENROLLMENT_SUBJECT_ADDED", "ENROLLMENT", "EnrollmentSubject", subject.getId(), null,
                    Map.of("enrollmentId", saved.getId(), "scheduleId", subject.getClassSchedule().getId(), "status", subject.getStatus().name()));
        }

        return toResponse(saved);
    }

    @Transactional
    public EnrollmentResponse update(UUID id, EnrollmentUpdateRequest request) {
        Enrollment enrollment = findEnrollment(id);
        ensureDraft(enrollment);
        int yearLevel = request.yearLevel() == null ? enrollment.getYearLevel() : request.yearLevel();
        Section section = resolveSectionForStudent(enrollment.getStudent(), enrollment.getSchoolYear(), enrollment.getSemester(), yearLevel, request.sectionId());
        validateSection(enrollment.getStudent(), enrollment.getSchoolYear(), enrollment.getSemester(), yearLevel, section);
        enrollment.setSection(section);
        enrollment.setYearLevel(yearLevel);
        enrollment.setRemarks(request.remarks());
        auditService.log("ENROLLMENT_UPDATED", "ENROLLMENT", "Enrollment", enrollment.getId(), null,
                Map.of("studentId", enrollment.getStudent().getId(), "status", enrollment.getStatus().name()));
        return toResponse(enrollment);
    }

    @Transactional
    public EnrollmentResponse addSubject(UUID enrollmentId, EnrollmentSubjectRequest request) {
        Enrollment enrollment = findEnrollment(enrollmentId);
        ensureDraft(enrollment);
        ClassSchedule schedule = classScheduleRepository.findById(request.scheduleId())
                .orElseThrow(() -> new NotFoundException("Schedule not found"));
        validateScheduleForEnrollment(enrollment, schedule);
        if (enrollmentSubjectRepository.existsByEnrollmentIdAndClassScheduleIdAndStatus(enrollmentId, schedule.getId(), EnrollmentSubjectStatus.ENROLLED)) {
            throw new BusinessRuleException("DUPLICATE_SCHEDULE", "Schedule is already selected for this enrollment");
        }
        if (activeSubjects(enrollment).stream().anyMatch(subject ->
                subject.getClassSchedule().getCourse().getId().equals(schedule.getCourse().getId()))) {
            throw new BusinessRuleException("DUPLICATE_COURSE", "The same course cannot be selected in multiple schedules");
        }
        if (academicProgress.hasSatisfiedCourse(enrollment.getStudent().getId(), schedule.getCourse().getId())) {
            throw new BusinessRuleException("COURSE_ALREADY_SATISFIED", "Completed or credited courses cannot be retaken");
        }
        validateNoSelectedScheduleConflict(enrollment, schedule, null);

        EnrollmentSubject subject = new EnrollmentSubject();
        subject.setClassSchedule(schedule);
        subject.setStatus(EnrollmentSubjectStatus.ENROLLED);
        enrollment.addSubject(subject);
        EnrollmentSubject savedSubject = enrollmentSubjectRepository.save(subject);
        auditService.log("ENROLLMENT_SUBJECT_ADDED", "ENROLLMENT", "EnrollmentSubject", savedSubject.getId(), null,
                Map.of("enrollmentId", enrollment.getId(), "scheduleId", schedule.getId(), "status", savedSubject.getStatus().name()));
        return toResponse(enrollment);
    }

    @Transactional
    public EnrollmentResponse dropSubject(UUID enrollmentId, UUID subjectId) {
        Enrollment enrollment = findEnrollment(enrollmentId);
        ensureDraft(enrollment);
        EnrollmentSubject subject = enrollmentSubjectRepository.findByIdAndEnrollmentId(subjectId, enrollmentId)
                .orElseThrow(() -> new NotFoundException("Enrollment subject not found"));
        EnrollmentSubjectStatus oldStatus = subject.getStatus();
        subject.setStatus(EnrollmentSubjectStatus.DROPPED);
        subject.setDroppedAt(Instant.now());
        auditService.log("ENROLLMENT_SUBJECT_DROPPED", "ENROLLMENT", "EnrollmentSubject", subject.getId(),
                Map.of("status", oldStatus.name()),
                Map.of("enrollmentId", enrollment.getId(), "scheduleId", subject.getClassSchedule().getId(), "status", subject.getStatus().name()));
        return toResponse(enrollment);
    }

    @Transactional(readOnly = true)
    public EnrollmentValidationResponse validate(UUID id) {
        return validateEnrollment(findEnrollment(id));
    }

    @Transactional
    public EnrollmentResponse submitForReview(UUID id) {
        Enrollment enrollment = findEnrollment(id);
        ensureDraft(enrollment);
        EnrollmentValidationResponse validation = validateEnrollment(enrollment);
        if (!validation.valid()) {
            throw new BusinessRuleException("ENROLLMENT_VALIDATION_FAILED", "Enrollment has validation issues");
        }
        EnrollmentStatus previous = enrollment.getStatus();
        enrollment.setStatus(EnrollmentStatus.SUBMITTED);
        enrollment.setSubmittedAt(Instant.now());
        recordStatusHistory(enrollment, previous, EnrollmentStatus.SUBMITTED, "Submitted for Registrar review");
        auditService.log("STUDENT_ENROLLMENT_SUBMITTED", "ENROLLMENT", "Enrollment", id,
                Map.of("status", previous.name()), Map.of("status", EnrollmentStatus.SUBMITTED.name()));
        return toResponse(enrollment);
    }

    @Transactional
    public EnrollmentResponse confirm(UUID id) {
        return confirmWithAccount(id).enrollment();
    }

    @Transactional
    public EnrollmentConfirmationResponse confirmWithAccount(UUID id) {
        Enrollment enrollment = findEnrollment(id);
        ensureConfirmable(enrollment);
        Set<UUID> scheduleIds = activeSubjects(enrollment).stream()
                .map(subject -> subject.getClassSchedule().getId())
                .collect(Collectors.toSet());
        if (!scheduleIds.isEmpty()) {
            classScheduleRepository.lockByIds(scheduleIds);
        }
        EnrollmentValidationResponse validation = validateEnrollment(enrollment);
        if (!validation.valid()) {
            throw new BusinessRuleException("ENROLLMENT_VALIDATION_FAILED", "Enrollment has validation issues");
        }
        academicPolicy.ensureApproval(enrollment);
        EnrollmentStatus previous = enrollment.getStatus();
        enrollment.setStatus(EnrollmentStatus.CONFIRMED);
        enrollment.getStudent().setYearLevel(enrollment.getYearLevel());
        enrollment.getStudent().setStatus(com.school.sis.student.entity.StudentStatus.ENROLLED);
        var provisioned=accountProvisioning.provision(enrollment.getStudent());
        recordStatusHistory(enrollment, previous, EnrollmentStatus.CONFIRMED, "Enrollment confirmed");
        auditService.log("ENROLLMENT_CONFIRMED", "ENROLLMENT", "Enrollment", enrollment.getId(),
                Map.of("status", previous.name()),
                Map.of("studentId", enrollment.getStudent().getId(), "status", enrollment.getStatus().name(), "subjectCount", activeSubjects(enrollment).size()));
        return new EnrollmentConfirmationResponse(toResponse(enrollment),
                new EnrollmentConfirmationResponse.Account(provisioned.created(),provisioned.username(),provisioned.initialPassword(),true));
    }

    @Transactional
    public EnrollmentResponse cancel(UUID id, String reason) {
        Enrollment enrollment = findEnrollment(id);
        if (enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
            throw new BusinessRuleException("ENROLLMENT_ALREADY_CANCELLED", "Enrollment is already cancelled");
        }
        EnrollmentCancellationReadinessResponse readiness = cancellationReadiness(id);
        if (!readiness.ready()) {
            EnrollmentValidationIssueResponse blocker = readiness.blockers().getFirst();
            throw new BusinessRuleException(blocker.code(), blocker.message());
        }
        EnrollmentStatus previous = enrollment.getStatus();
        enrollment.setStatus(EnrollmentStatus.CANCELLED);
        enrollment.setRemarks(reason);
        recordStatusHistory(enrollment, previous, EnrollmentStatus.CANCELLED, reason);
        auditService.log("ENROLLMENT_CANCELLED", "ENROLLMENT", "Enrollment", enrollment.getId(),
                Map.of("status", previous.name()),
                Map.of("studentId", enrollment.getStudent().getId(), "status", enrollment.getStatus().name(), "reason", reason));
        return toResponse(enrollment);
    }

    @Transactional(readOnly = true)
    public EnrollmentCancellationReadinessResponse cancellationReadiness(UUID id) {
        findEnrollment(id);
        boolean hasAttendance = activityExists("""
                select count(*) from attendance_entries ae
                join enrollment_subjects es on es.id=ae.enrollment_subject_id
                where es.enrollment_id=?
                """, id);
        boolean hasGrades = activityExists("""
                select count(*) from grades g
                join enrollment_subjects es on es.id=g.enrollment_subject_id
                where es.enrollment_id=?
                """, id);
        boolean hasLockedRecords = activityExists("""
                select count(*) from academic_records ar
                join grades g on g.id=ar.grade_id
                join enrollment_subjects es on es.id=g.enrollment_subject_id
                where es.enrollment_id=? and ar.grade_status='LOCKED'
                """, id);
        boolean financeResolved = financeLedger.financeResolvedForEnrollment(id);
        List<EnrollmentValidationIssueResponse> blockers = new ArrayList<>();
        if (hasAttendance) blockers.add(issue("ATTENDANCE_ACTIVITY_EXISTS",
                "Enrollment cannot be cancelled after attendance has been recorded", null, null));
        if (hasGrades) blockers.add(issue("GRADE_ACTIVITY_EXISTS",
                "Enrollment cannot be cancelled after grade activity has been created", null, null));
        if (hasLockedRecords) blockers.add(issue("LOCKED_ACADEMIC_ACTIVITY_EXISTS",
                "Enrollment cannot be cancelled after an academic record has been locked", null, null));
        if (!financeResolved) blockers.add(issue("FINANCE_RESOLUTION_REQUIRED",
                "Finance must resolve the linked assessment before enrollment cancellation", null, null));
        return new EnrollmentCancellationReadinessResponse(blockers.isEmpty(), financeResolved, hasAttendance,
                hasGrades, hasLockedRecords, blockers);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentStatusHistoryResponse> statusHistory(UUID id) {
        findEnrollment(id);
        return statusHistoryRepository.findByEnrollmentIdOrderByChangedAtAsc(id).stream()
                .map(history -> new EnrollmentStatusHistoryResponse(history.getId(), history.getFromStatus(),
                        history.getToStatus(), history.getRemarks(), history.getChangedAt()))
                .toList();
    }

    @Transactional
    public EnrollmentResponse returnToDraft(UUID id, String reason) {
        Enrollment enrollment = findEnrollment(id);
        if (enrollment.getStatus() != EnrollmentStatus.SUBMITTED) {
            throw new BusinessRuleException("INVALID_ENROLLMENT_STATE", "Only submitted enrollments can be returned to draft");
        }
        EnrollmentStatus previous = enrollment.getStatus();
        enrollment.setStatus(EnrollmentStatus.DRAFT);
        enrollment.setSubmittedAt(null);
        recordStatusHistory(enrollment, previous, EnrollmentStatus.DRAFT, reason.trim());
        auditService.log("ENROLLMENT_RETURNED_TO_DRAFT", "ENROLLMENT", "Enrollment", id,
                Map.of("status", previous.name()), Map.of("status", EnrollmentStatus.DRAFT.name(), "reason", reason));
        return toResponse(enrollment);
    }

    @Transactional
    public Map<String, Object> approveEligibility(UUID id, String reason, SisUserDetails principal) {
        Enrollment enrollment = findEnrollment(id);
        ensureConfirmable(enrollment);
        return academicPolicy.approve(enrollment, reason, principal);
    }

    private void validateScheduleForEnrollment(Enrollment enrollment, ClassSchedule schedule) {
        if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
            throw new BusinessRuleException("Only active schedules can be selected");
        }
        if (!schedule.getSchoolYear().getId().equals(enrollment.getSchoolYear().getId())
                || !schedule.getSemester().getId().equals(enrollment.getSemester().getId())) {
            throw new BusinessRuleException("Schedule term must match enrollment term");
        }
        if (enrollment.getSection() != null && !isMixedSection(enrollment.getSection()) && !schedule.getSection().getId().equals(enrollment.getSection().getId())) {
            throw new BusinessRuleException("Schedule section must match enrollment section");
        }
        if (!schedule.getSection().getProgram().getId().equals(enrollment.getProgram().getId())) {
            throw new BusinessRuleException("Schedule program must match student program");
        }
        if (!courseExistsInStudentCurriculum(enrollment, schedule)) {
            throw new BusinessRuleException("Schedule course is not part of the student's curriculum");
        }
        long enrolledCount = enrollmentSubjectRepository.countConfirmedOtherEnrollmentSubjects(
                schedule.getId(), enrollment.getId());
        if (enrolledCount >= schedule.getCapacity()) throw new BusinessRuleException("Schedule has no available seats");
    }

    private EnrollmentValidationResponse validateEnrollment(Enrollment enrollment) {
        List<EnrollmentSubject> subjects = activeSubjects(enrollment);
        List<EnrollmentValidationIssueResponse> blocking = new ArrayList<>();
        List<EnrollmentValidationIssueResponse> warnings = new ArrayList<>();

        if (subjects.isEmpty()) {
            blocking.add(issue("NO_SUBJECTS", "Enrollment must have at least one selected subject", null, null));
        }
        for (EnrollmentSubject subject : subjects) {
            ClassSchedule schedule = subject.getClassSchedule();
            if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
                blocking.add(issue("INACTIVE_SCHEDULE", "Selected schedule is not active", subject.getId(), schedule.getId()));
            }
            if (!schedule.getSchoolYear().getId().equals(enrollment.getSchoolYear().getId())
                    || !schedule.getSemester().getId().equals(enrollment.getSemester().getId())) {
                blocking.add(issue("TERM_MISMATCH", "Selected schedule term does not match enrollment term", subject.getId(), schedule.getId()));
            }
            if (enrollment.getSection() != null && !isMixedSection(enrollment.getSection()) && !schedule.getSection().getId().equals(enrollment.getSection().getId())) {
                blocking.add(issue("SECTION_MISMATCH", "Selected schedule section does not match enrollment section", subject.getId(), schedule.getId()));
            }
            if (!courseExistsInStudentCurriculum(enrollment, schedule)) {
                blocking.add(issue("NON_CURRICULUM_COURSE", "Selected schedule course is not part of the student's curriculum", subject.getId(), schedule.getId()));
            }
            long enrolledCount = enrollmentSubjectRepository.countConfirmedOtherEnrollmentSubjects(
                    schedule.getId(), enrollment.getId());
            if (enrolledCount >= schedule.getCapacity()) {
                blocking.add(issue("NO_AVAILABLE_SEATS", "Selected schedule has no available seats", subject.getId(), schedule.getId()));
            }
            CurriculumCourse curriculumCourse = curriculumCourseForSchedule(enrollment, schedule);
            if (curriculumCourse != null) {
                for (var prerequisite : curriculumCourse.getPrerequisites()) {
                    if (!academicProgress.hasSatisfiedCourse(enrollment.getStudent().getId(), prerequisite.getId())) {
                        blocking.add(issue("PREREQUISITE_NOT_SATISFIED",
                                "Selected schedule has unmet prerequisite: " + prerequisite.getCourseCode(),
                                subject.getId(), schedule.getId()));
                        break;
                    }
                }
                for (var corequisite : curriculumCourse.getCorequisites()) {
                    boolean selected = subjects.stream().anyMatch(selectedSubject ->
                            selectedSubject.getClassSchedule().getCourse().getId().equals(corequisite.getId()));
                    if (!selected && !academicProgress.hasSatisfiedCourse(enrollment.getStudent().getId(), corequisite.getId())) {
                        blocking.add(issue("COREQUISITE_NOT_SATISFIED",
                                "Selected schedule requires concurrent or prior completion of: " + corequisite.getCourseCode(),
                                subject.getId(), schedule.getId()));
                    }
                }
            }
        }
        for (int i = 0; i < subjects.size(); i++) {
            for (int j = i + 1; j < subjects.size(); j++) {
                if (hasMeetingConflict(subjects.get(i).getClassSchedule(), subjects.get(j).getClassSchedule())) {
                    blocking.add(issue("SCHEDULE_CONFLICT", "Selected schedules have overlapping meeting times", subjects.get(j).getId(), subjects.get(j).getClassSchedule().getId()));
                }
                if (subjects.get(i).getClassSchedule().getCourse().getId()
                        .equals(subjects.get(j).getClassSchedule().getCourse().getId())) {
                    blocking.add(issue("DUPLICATE_COURSE", "The same course is selected in multiple schedules",
                            subjects.get(j).getId(), subjects.get(j).getClassSchedule().getId()));
                }
            }
        }

        boolean flexible = isFlexibleLoad(enrollment.getStudent());
        if (!flexible) {
            List<CurriculumCourse> requiredCurriculumCourses = curriculumCourseRepository.findByCurriculumIdOrderByYearLevelAscSemesterAscSortOrderAsc(enrollment.getStudent().getCurriculum().getId())
                    .stream()
                    .filter(cc -> cc.getYearLevel() == enrollment.getYearLevel())
                    .filter(cc -> normalizeSemester(cc.getSemester()).equals(normalizeSemester(enrollment.getSemester().getName())))
                    .filter(cc -> cc.getRequiredStatus() == RequiredStatus.REQUIRED)
                    .toList();

            for (CurriculumCourse cc : requiredCurriculumCourses) {
                boolean hasSchedule = subjects.stream()
                        .anyMatch(sub -> sub.getClassSchedule().getCourse().getId().equals(cc.getCourse().getId()));
                boolean alreadySatisfied = academicProgress.hasSatisfiedCourse(
                        enrollment.getStudent().getId(), cc.getCourse().getId());
                if (!hasSchedule && !alreadySatisfied) {
                    blocking.add(issue("REQUIRED_COURSE_MISSING", "Enrollment is missing required course: " + cc.getCourse().getCourseCode(), null, null));
                }
            }
        }

        BigDecimal totalCreditUnits = totalCreditUnits(subjects);
        boolean policyLoadValid = true;
        try {
            academicPolicy.validateLoad(enrollment, totalCreditUnits);
        } catch (BusinessRuleException exception) {
            policyLoadValid = false;
            blocking.add(issue(exception.getCode(), exception.getMessage(), null, null));
        }
        if (policyLoadValid) {
            try {
                academicPolicy.ensureApproval(enrollment);
            } catch (BusinessRuleException exception) {
                if ("ACADEMIC_POLICY_APPROVAL_REQUIRED".equals(exception.getCode())) {
                    warnings.add(issue(exception.getCode(), exception.getMessage(), null, null));
                } else {
                    blocking.add(issue(exception.getCode(), exception.getMessage(), null, null));
                }
            }
        }
        return new EnrollmentValidationResponse(blocking.isEmpty(), blocking, warnings, totalCreditUnits, subjects.size());
    }

    private void validateNoSelectedScheduleConflict(Enrollment enrollment, ClassSchedule requested, UUID ignoredSubjectId) {
        for (EnrollmentSubject subject : activeSubjects(enrollment)) {
            if (ignoredSubjectId != null && ignoredSubjectId.equals(subject.getId())) {
                continue;
            }
            if (hasMeetingConflict(subject.getClassSchedule(), requested)) {
                throw new BusinessRuleException("Selected schedule conflicts with another enrolled subject");
            }
        }
    }

    private boolean hasMeetingConflict(ClassSchedule first, ClassSchedule second) {
        for (ScheduleMeeting firstMeeting : first.getMeetings()) {
            for (ScheduleMeeting secondMeeting : second.getMeetings()) {
                if (firstMeeting.getDayOfWeek() == secondMeeting.getDayOfWeek()
                        && firstMeeting.getStartTime().isBefore(secondMeeting.getEndTime())
                        && firstMeeting.getEndTime().isAfter(secondMeeting.getStartTime())) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean courseExistsInStudentCurriculum(Enrollment enrollment, ClassSchedule schedule) {
        return curriculumCourseForSchedule(enrollment, schedule) != null;
    }

    private CurriculumCourse curriculumCourseForSchedule(Enrollment enrollment, ClassSchedule schedule) {
        boolean flexible = isFlexibleLoad(enrollment.getStudent());
        return curriculumCourseRepository.findByCurriculumIdOrderByYearLevelAscSemesterAscSortOrderAsc(enrollment.getStudent().getCurriculum().getId())
                .stream()
                .filter(curriculumCourse -> curriculumCourse.getCourse().getId().equals(schedule.getCourse().getId()))
                .filter(curriculumCourse -> flexible
                        ? curriculumCourse.getYearLevel() <= enrollment.getYearLevel()
                        : curriculumCourse.getYearLevel() == enrollment.getYearLevel())
                .filter(curriculumCourse -> flexible || normalizeSemester(curriculumCourse.getSemester())
                        .equals(normalizeSemester(enrollment.getSemester().getName())))
                .findFirst()
                .orElse(null);
    }

    private String normalizeSemester(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
    }

    private void validateSection(Student student, SchoolYear schoolYear, Semester semester, int yearLevel, Section section) {
        boolean flexible = isFlexibleLoad(student);
        if (section == null && flexible) return;
        if (section == null) throw new BusinessRuleException("Section is required for this student classification");
        if (section.getStatus() != com.school.sis.setup.entity.ActiveStatus.ACTIVE) {
            throw new BusinessRuleException("Selected section is inactive");
        }
        if (!section.getProgram().getId().equals(student.getProgram().getId())) {
            throw new BusinessRuleException("Section program must match student program");
        }
        if (!section.getSchoolYear().getId().equals(schoolYear.getId()) || !section.getSemester().getId().equals(semester.getId())) {
            throw new BusinessRuleException("Section term must match enrollment term");
        }
        if (section.getCurriculum() == null || !section.getCurriculum().getId().equals(student.getCurriculum().getId())) {
            throw new BusinessRuleException("Section curriculum must match student curriculum");
        }
        if (section.getYearLevel() != yearLevel) throw new BusinessRuleException("Section year level must match enrollment year level");
    }

    private void validateNoDuplicateEnrollment(UUID studentId, UUID schoolYearId, UUID semesterId) {
        if (enrollmentRepository.existsByStudentIdAndSchoolYearIdAndSemesterIdAndStatusIn(studentId, schoolYearId, semesterId, ACTIVE_ENROLLMENT_STATUSES)) {
            throw new BusinessRuleException("Student already has an active enrollment for this term");
        }
    }

    private void ensureDraft(Enrollment enrollment) {
        if (enrollment.getStatus() != EnrollmentStatus.DRAFT) {
            throw new BusinessRuleException("Only draft enrollments can be modified");
        }
    }

    private void ensureConfirmable(Enrollment enrollment) {
        if (enrollment.getStatus() != EnrollmentStatus.DRAFT && enrollment.getStatus() != EnrollmentStatus.SUBMITTED)
            throw new BusinessRuleException("Only draft or submitted enrollments can be confirmed");
    }

    private Section resolveSectionForStudent(Student student, SchoolYear schoolYear, Semester semester, int yearLevel, UUID sectionId) {
        boolean flexible = isFlexibleLoad(student);

        if (sectionId == null) {
            if (!flexible) {
                throw new BusinessRuleException("Section is required for this student classification");
            }
            String mixedSectionCode = "MIXED-" + student.getProgram().getProgramCode() + "-" + yearLevel;
            java.util.Optional<Section> existing = sectionRepository.findBySectionCodeAndSchoolYearIdAndSemesterId(
                    mixedSectionCode, schoolYear.getId(), semester.getId());
            if (existing.isPresent()) {
                return existing.get();
            } else {
                Section newSection = new Section();
                newSection.setSectionCode(mixedSectionCode);
                newSection.setProgram(student.getProgram());
                newSection.setCurriculum(student.getCurriculum());
                newSection.setSchoolYear(schoolYear);
                newSection.setSemester(semester);
                newSection.setYearLevel(yearLevel);
                newSection.setStatus(com.school.sis.setup.entity.ActiveStatus.ACTIVE);
                return sectionRepository.save(newSection);
            }
        }

        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new NotFoundException("Section not found"));
        return section;
    }

    private boolean isMixedSection(Section section) {
        return section != null && section.getSectionCode() != null && section.getSectionCode().startsWith("MIXED");
    }

    private boolean isFlexibleLoad(Student student) {
        if (student.getClassification() != null && Set.of(StudentClassification.IRREGULAR, StudentClassification.TRANSFEREE,
                StudentClassification.RETURNEE, StudentClassification.CROSS_ENROLLEE,
                StudentClassification.GRADUATING).contains(student.getClassification())) {
            return true;
        }
        AdmissionType admissionType = student.getEducationalBackground() == null
                ? null : student.getEducationalBackground().getAdmissionType();
        return admissionType != null && Set.of(AdmissionType.TRANSFEREE, AdmissionType.RETURNEE, AdmissionType.SHIFTEE,
                AdmissionType.CROSS_ENROLLEE, AdmissionType.SECOND_DEGREE).contains(admissionType);
    }

    private Enrollment findEnrollment(UUID id) {
        return enrollmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Enrollment not found"));
    }

    private void recordStatusHistory(Enrollment enrollment, EnrollmentStatus fromStatus, EnrollmentStatus toStatus, String remarks) {
        EnrollmentStatusHistory history = new EnrollmentStatusHistory();
        history.setEnrollment(enrollment);
        history.setFromStatus(fromStatus);
        history.setToStatus(toStatus);
        history.setRemarks(remarks);
        statusHistoryRepository.save(history);
    }

    private EnrollmentResponse toResponse(Enrollment enrollment) {
        EnrollmentValidationResponse validation = validateEnrollment(enrollment);
        List<EnrollmentSubjectResponse> subjects = enrollment.getSubjects().stream()
                .sorted(Comparator.comparing(subject -> subject.getClassSchedule().getCourse().getCourseCode()))
                .map(this::toSubjectResponse)
                .toList();
        return new EnrollmentResponse(
                enrollment.getId(),
                enrollment.getStudent().getId(),
                enrollment.getStudent().getStudentNumber(),
                studentName(enrollment.getStudent()),
                enrollment.getProgram().getId(),
                enrollment.getProgram().getProgramCode(),
                enrollment.getYearLevel(),
                enrollment.getSection() == null ? null : enrollment.getSection().getId(),
                enrollment.getSection() == null ? null : enrollment.getSection().getSectionCode(),
                enrollment.getSchoolYear().getId(),
                enrollment.getSchoolYear().getSchoolYear(),
                enrollment.getSemester().getId(),
                enrollment.getSemester().getName(),
                enrollment.getStatus(),
                enrollment.getRemarks(),
                validation.totalCreditUnits(),
                validation.subjectCount(),
                subjects,
                validation
        );
    }

    private EnrollmentSummaryResponse toSummary(Enrollment enrollment) {
        List<EnrollmentSubject> subjects = activeSubjects(enrollment);
        return new EnrollmentSummaryResponse(
                enrollment.getId(),
                enrollment.getStudent().getId(),
                enrollment.getStudent().getStudentNumber(),
                studentName(enrollment.getStudent()),
                enrollment.getProgram().getId(),
                enrollment.getProgram().getProgramCode(),
                enrollment.getYearLevel(),
                enrollment.getSection() == null ? null : enrollment.getSection().getId(),
                enrollment.getSection() == null ? null : enrollment.getSection().getSectionCode(),
                enrollment.getSchoolYear().getId(),
                enrollment.getSchoolYear().getSchoolYear(),
                enrollment.getSemester().getId(),
                enrollment.getSemester().getName(),
                enrollment.getStatus(),
                totalCreditUnits(subjects),
                subjects.size()
        );
    }

    private EnrollmentSubjectResponse toSubjectResponse(EnrollmentSubject subject) {
        ClassSchedule schedule = subject.getClassSchedule();
        return new EnrollmentSubjectResponse(
                subject.getId(),
                schedule.getId(),
                schedule.getCourse().getId(),
                schedule.getCourse().getCourseCode(),
                schedule.getCourse().getCourseTitle(),
                schedule.getCourse().getCreditUnits(),
                schedule.getSection().getId(),
                schedule.getSection().getSectionCode(),
                schedule.getFaculty().getId(),
                facultyName(schedule.getFaculty()),
                schedule.getRoom().getId(),
                schedule.getRoom().getRoomCode(),
                subject.getStatus(),
                schedule.getMeetings().stream()
                        .sorted(Comparator.comparing(ScheduleMeeting::getDayOfWeek).thenComparing(ScheduleMeeting::getStartTime))
                        .map(meeting -> new ScheduleMeetingResponse(meeting.getId(), meeting.getDayOfWeek(), meeting.getStartTime(), meeting.getEndTime()))
                        .toList()
        );
    }

    private List<EnrollmentSubject> activeSubjects(Enrollment enrollment) {
        return enrollment.getSubjects().stream()
                .filter(subject -> subject.getStatus() == EnrollmentSubjectStatus.ENROLLED)
                .toList();
    }

    private BigDecimal totalCreditUnits(List<EnrollmentSubject> subjects) {
        return subjects.stream()
                .map(subject -> subject.getClassSchedule().getCourse().getCreditUnits())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean activityExists(String sql, UUID enrollmentId) {
        try {
            Integer count = jdbc.queryForObject(sql, Integer.class, enrollmentId);
            return count != null && count > 0;
        } catch (BadSqlGrammarException exception) {
            // Some isolated Hibernate tests do not create SQL-only faculty tables.
            return false;
        }
    }

    private EnrollmentValidationIssueResponse issue(String code, String message, UUID subjectId, UUID scheduleId) {
        return new EnrollmentValidationIssueResponse(code, message, subjectId, scheduleId);
    }

    private Specification<Enrollment> specification(EnrollmentSearchCriteria criteria) {
        return (root, query, cb) -> {
            query.distinct(true);
            if (criteria == null) {
                return cb.conjunction();
            }
            var predicate = cb.conjunction();
            if (criteria.search() != null && !criteria.search().isBlank()) {
                String term = "%" + criteria.search().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("student").get("studentNumber")), term),
                        cb.like(cb.lower(root.get("student").get("firstName")), term),
                        cb.like(cb.lower(root.get("student").get("lastName")), term),
                        cb.like(cb.lower(root.get("program").get("programCode")), term)
                ));
            }
            if (criteria.studentId() != null) predicate = cb.and(predicate, cb.equal(root.get("student").get("id"), criteria.studentId()));
            if (criteria.programId() != null) predicate = cb.and(predicate, cb.equal(root.get("program").get("id"), criteria.programId()));
            if (criteria.sectionId() != null) predicate = cb.and(predicate, cb.equal(root.get("section").get("id"), criteria.sectionId()));
            if (criteria.schoolYearId() != null) predicate = cb.and(predicate, cb.equal(root.get("schoolYear").get("id"), criteria.schoolYearId()));
            if (criteria.semesterId() != null) predicate = cb.and(predicate, cb.equal(root.get("semester").get("id"), criteria.semesterId()));
            if (criteria.status() != null) predicate = cb.and(predicate, cb.equal(root.get("status"), criteria.status()));
            return predicate;
        };
    }

    private String studentName(Student student) {
        return String.join(" ", List.of(student.getFirstName(), blankToEmpty(student.getMiddleName()), student.getLastName(), blankToEmpty(student.getSuffix())))
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String facultyName(Faculty faculty) {
        if (faculty == null) return null;
        String middleInitial = faculty.getMiddleName() != null && !faculty.getMiddleName().isBlank() ? faculty.getMiddleName().substring(0, 1).toUpperCase() + "." : "";
        return String.join(" ", List.of(faculty.getFirstName(), middleInitial, faculty.getLastName(), blankToEmpty(faculty.getSuffix())))
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String blankToEmpty(String value) {
        return value == null ? "" : value;
    }
}
