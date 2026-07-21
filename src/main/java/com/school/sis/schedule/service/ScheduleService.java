package com.school.sis.schedule.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.school.sis.audit.AuditModule;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.ConflictException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.common.response.PageResponse;
import com.school.sis.curriculum.repository.CurriculumCourseRepository;
import com.school.sis.enrollment.entity.EnrollmentStatus;
import com.school.sis.enrollment.entity.EnrollmentSubjectStatus;
import com.school.sis.enrollment.repository.EnrollmentSubjectRepository;
import com.school.sis.grade.entity.ClassGradebook;
import com.school.sis.grade.entity.GradeStatus;
import com.school.sis.grade.repository.ClassGradebookRepository;
import com.school.sis.schedule.dto.FacultyLoadResponse;
import com.school.sis.schedule.dto.RoomAvailabilityResponse;
import com.school.sis.schedule.dto.ScheduleChangeHistoryResponse;
import com.school.sis.schedule.dto.ScheduleConflictDetail;
import com.school.sis.schedule.dto.ScheduleConflictRequest;
import com.school.sis.schedule.dto.ScheduleConflictResponse;
import com.school.sis.schedule.dto.ScheduleCopyPreviewResponse;
import com.school.sis.schedule.dto.ScheduleCopyResultResponse;
import com.school.sis.schedule.dto.ScheduleCopyTermRequest;
import com.school.sis.schedule.dto.ScheduleLatestChangeResponse;
import com.school.sis.schedule.dto.ScheduleLifecycleRequest;
import com.school.sis.schedule.dto.ScheduleMeetingRequest;
import com.school.sis.schedule.dto.ScheduleMeetingResponse;
import com.school.sis.schedule.dto.ScheduleRequest;
import com.school.sis.schedule.dto.ScheduleResponse;
import com.school.sis.schedule.dto.ScheduleRevisionRequest;
import com.school.sis.schedule.dto.ScheduleSearchCriteria;
import com.school.sis.schedule.dto.ScheduleWarningResponse;
import com.school.sis.schedule.entity.ClassSchedule;
import com.school.sis.schedule.entity.ScheduleChangeAction;
import com.school.sis.schedule.entity.ScheduleChangeHistory;
import com.school.sis.schedule.entity.ScheduleComponentType;
import com.school.sis.schedule.entity.ScheduleDeliveryMode;
import com.school.sis.schedule.entity.ScheduleLoadPolicy;
import com.school.sis.schedule.entity.ScheduleMeeting;
import com.school.sis.schedule.entity.ScheduleResourceReservation;
import com.school.sis.schedule.entity.ScheduleResourceType;
import com.school.sis.schedule.entity.ScheduleStatus;
import com.school.sis.schedule.repository.ClassScheduleRepository;
import com.school.sis.schedule.repository.ScheduleChangeHistoryRepository;
import com.school.sis.schedule.repository.ScheduleLoadPolicyRepository;
import com.school.sis.schedule.repository.ScheduleMeetingRepository;
import com.school.sis.schedule.repository.ScheduleResourceReservationRepository;
import com.school.sis.setup.entity.ActiveStatus;
import com.school.sis.setup.entity.Course;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.setup.entity.Room;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.setup.entity.Section;
import com.school.sis.setup.entity.Semester;
import com.school.sis.setup.repository.CourseRepository;
import com.school.sis.setup.repository.FacultyRepository;
import com.school.sis.setup.repository.RoomRepository;
import com.school.sis.setup.repository.SchoolYearRepository;
import com.school.sis.setup.repository.SectionRepository;
import com.school.sis.setup.repository.SemesterRepository;
import jakarta.persistence.criteria.JoinType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ScheduleService {

    private static final String ROOM_CONFLICT = "ROOM";
    private static final String FACULTY_CONFLICT = "FACULTY";
    private static final String SECTION_CONFLICT = "SECTION";

    private final ClassScheduleRepository schedules;
    private final ScheduleMeetingRepository meetings;
    private final ScheduleResourceReservationRepository reservations;
    private final ScheduleChangeHistoryRepository history;
    private final ScheduleLoadPolicyRepository loadPolicies;
    private final SectionRepository sections;
    private final CourseRepository courses;
    private final FacultyRepository facultyRepository;
    private final RoomRepository rooms;
    private final SchoolYearRepository schoolYears;
    private final SemesterRepository semesters;
    private final CurriculumCourseRepository curriculumCourses;
    private final EnrollmentSubjectRepository enrollmentSubjects;
    private final ClassGradebookRepository gradebooks;
    private final UserRepository users;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbc;

    public ScheduleService(
            ClassScheduleRepository schedules,
            ScheduleMeetingRepository meetings,
            ScheduleResourceReservationRepository reservations,
            ScheduleChangeHistoryRepository history,
            ScheduleLoadPolicyRepository loadPolicies,
            SectionRepository sections,
            CourseRepository courses,
            FacultyRepository facultyRepository,
            RoomRepository rooms,
            SchoolYearRepository schoolYears,
            SemesterRepository semesters,
            CurriculumCourseRepository curriculumCourses,
            EnrollmentSubjectRepository enrollmentSubjects,
            ClassGradebookRepository gradebooks,
            UserRepository users,
            AuditService auditService,
            ObjectMapper objectMapper,
            JdbcTemplate jdbc
    ) {
        this.schedules = schedules;
        this.meetings = meetings;
        this.reservations = reservations;
        this.history = history;
        this.loadPolicies = loadPolicies;
        this.sections = sections;
        this.courses = courses;
        this.facultyRepository = facultyRepository;
        this.rooms = rooms;
        this.schoolYears = schoolYears;
        this.semesters = semesters;
        this.curriculumCourses = curriculumCourses;
        this.enrollmentSubjects = enrollmentSubjects;
        this.gradebooks = gradebooks;
        this.users = users;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public PageResponse<ScheduleResponse> list(ScheduleSearchCriteria criteria, Pageable pageable) {
        return list(criteria, pageable, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<ScheduleResponse> list(ScheduleSearchCriteria criteria, Pageable pageable, SisUserDetails principal) {
        Specification<ClassSchedule> specification = specification(criteria).and(scope(principal));
        return PageResponse.from(schedules.findAll(specification, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public ScheduleResponse get(UUID id) {
        return get(id, null);
    }

    @Transactional(readOnly = true)
    public ScheduleResponse get(UUID id, SisUserDetails principal) {
        ClassSchedule schedule = findSchedule(id);
        assertVisible(schedule, principal);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse create(ScheduleRequest request) {
        requireDraftRequest(request);
        validateMeetings(request.meetings());
        ClassSchedule schedule = new ClassSchedule();
        applyDraft(schedule, request, null);
        if (schedules.existsOpenOffering(schedule.getSection().getId(), schedule.getCourse().getId(), null)) {
            throw new ConflictException("DUPLICATE_SCHEDULE", "A draft or active offering already exists for this section and course");
        }
        schedules.saveAndFlush(schedule);
        ScheduleResponse after = toResponse(schedule);
        recordChange(schedule, ScheduleChangeAction.CREATED, null, null, after, List.of());
        auditService.log("SCHEDULE_CREATED", AuditModule.SCHEDULE, "ClassSchedule", schedule.getId(), null, after);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse update(UUID id, ScheduleRequest request) {
        requireDraftRequest(request);
        validateMeetings(request.meetings());
        ClassSchedule schedule = schedules.lockById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        requireStatus(schedule, ScheduleStatus.DRAFT, "Only draft schedules can be edited with PUT");
        verifyVersion(schedule, request.expectedVersion());
        ScheduleResponse before = toResponse(schedule);
        applyDraft(schedule, request, id);
        if (schedules.existsOpenOffering(schedule.getSection().getId(), schedule.getCourse().getId(), id)) {
            throw new ConflictException("DUPLICATE_SCHEDULE", "A draft or active offering already exists for this section and course");
        }
        schedule.touch();
        schedules.saveAndFlush(schedule);
        ScheduleResponse after = toResponse(schedule);
        recordChange(schedule, ScheduleChangeAction.UPDATED, null, before, after, List.of());
        auditService.log("SCHEDULE_UPDATED", AuditModule.SCHEDULE, "ClassSchedule", id, before, after);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse activate(UUID id, ScheduleLifecycleRequest request, SisUserDetails principal) {
        ClassSchedule schedule = schedules.lockById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        requireStatus(schedule, ScheduleStatus.DRAFT, "Only draft schedules can be activated");
        verifyVersion(schedule, request.expectedVersion());
        ScheduleResponse before = toResponse(schedule);
        List<ScheduleWarningResponse> warnings = validateActivation(schedule, id);
        validateLoadOverride(warnings, request.acknowledgeLoadWarning(), request.reason(), principal);
        schedule.setStatus(ScheduleStatus.ACTIVE);
        schedules.saveAndFlush(schedule);
        replaceReservations(schedule);
        ScheduleResponse after = toResponse(schedule);
        List<String> acknowledged = acknowledgedWarnings(request.acknowledgedWarnings(), warnings, request.acknowledgeLoadWarning());
        recordChange(schedule, ScheduleChangeAction.ACTIVATED, request.reason(), before, after, acknowledged);
        auditService.log("SCHEDULE_ACTIVATED", AuditModule.SCHEDULE, "ClassSchedule", id, before, after);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse revise(UUID id, ScheduleRevisionRequest request, SisUserDetails principal) {
        validateMeetings(request.meetings());
        ClassSchedule schedule = schedules.lockById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        requireStatus(schedule, ScheduleStatus.ACTIVE, "Only active schedules can be revised");
        verifyVersion(schedule, request.expectedVersion());
        ClassGradebook gradebook = gradebooks.findByScheduleId(id).orElse(null);
        if (isGradebookLocked(gradebook)) {
            throw new BusinessRuleException("SCHEDULE_GRADE_LOCKED", "A schedule cannot be revised after grade locking");
        }
        if (gradebook != null && gradebook.getSubmittedAt() != null
                && !schedule.getFaculty().getId().equals(request.facultyId())) {
            throw new BusinessRuleException("SCHEDULE_FACULTY_LOCKED", "Faculty cannot be changed after gradebook submission");
        }

        ScheduleResponse before = toResponse(schedule);
        Faculty faculty = findFaculty(request.facultyId());
        schedule.setFaculty(faculty);
        schedule.setCapacity(request.capacity());
        int revision = schedule.getMeetings().stream().mapToInt(ScheduleMeeting::getRevisionNumber).max().orElse(0) + 1;
        Instant changedAt = Instant.now();
        schedule.getMeetings().stream().filter(ScheduleMeeting::isActive).forEach(meeting -> {
            meeting.setActive(false);
            meeting.setEffectiveTo(changedAt);
        });
        request.meetings().stream().map(meeting -> toMeeting(meeting, schedule.getCourse(), null, revision))
                .forEach(schedule::addMeeting);
        schedule.setRoom(commonActiveRoom(schedule));
        schedule.touch();

        List<ScheduleWarningResponse> warnings = validateActivation(schedule, id);
        validateLoadOverride(warnings, request.acknowledgeLoadWarning(), request.reason(), principal);
        reservations.deleteByScheduleId(id);
        schedules.saveAndFlush(schedule);
        replaceReservations(schedule);
        ScheduleResponse after = toResponse(schedule);
        List<String> acknowledged = acknowledgedWarnings(request.acknowledgedWarnings(), warnings, request.acknowledgeLoadWarning());
        recordChange(schedule, ScheduleChangeAction.REVISED, request.reason(), before, after, acknowledged);
        auditService.log("SCHEDULE_REVISED", AuditModule.SCHEDULE, "ClassSchedule", id, before, after);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse cancel(UUID id, ScheduleLifecycleRequest request) {
        requireReason(request.reason(), "A cancellation reason is required");
        ClassSchedule schedule = schedules.lockById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (schedule.getStatus() != ScheduleStatus.DRAFT && schedule.getStatus() != ScheduleStatus.ACTIVE) {
            throw new BusinessRuleException("SCHEDULE_LIFECYCLE_INVALID", "Only draft or active schedules can be cancelled");
        }
        verifyVersion(schedule, request.expectedVersion());
        if (hasConsumingActivity(schedule.getId())) {
            throw new BusinessRuleException("SCHEDULE_HAS_ACTIVITY", "Schedules with enrollment or class activity cannot be cancelled");
        }
        ScheduleResponse before = toResponse(schedule);
        reservations.deleteByScheduleId(id);
        schedule.setStatus(ScheduleStatus.CANCELLED);
        schedules.saveAndFlush(schedule);
        ScheduleResponse after = toResponse(schedule);
        recordChange(schedule, ScheduleChangeAction.CANCELLED, request.reason(), before, after, List.of());
        auditService.log("SCHEDULE_CANCELLED", AuditModule.SCHEDULE, "ClassSchedule", id, before, after);
        return toResponse(schedule);
    }

    @Transactional
    public ScheduleResponse archive(UUID id, ScheduleLifecycleRequest request) {
        requireReason(request.reason(), "An archive reason is required");
        ClassSchedule schedule = schedules.lockById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (schedule.getStatus() == ScheduleStatus.ARCHIVED) {
            throw new BusinessRuleException("SCHEDULE_LIFECYCLE_INVALID", "The schedule is already archived");
        }
        verifyVersion(schedule, request.expectedVersion());
        if (schedule.getStatus() == ScheduleStatus.ACTIVE && hasConsumingActivity(id)
                && schedule.getSchoolYear().isActive() && schedule.getSemester().isActive()) {
            throw new BusinessRuleException("SCHEDULE_TERM_ACTIVE", "An active consumed schedule can be archived only after the term is inactive");
        }
        ScheduleResponse before = toResponse(schedule);
        reservations.deleteByScheduleId(id);
        schedule.setStatus(ScheduleStatus.ARCHIVED);
        schedules.saveAndFlush(schedule);
        ScheduleResponse after = toResponse(schedule);
        recordChange(schedule, ScheduleChangeAction.ARCHIVED, request.reason(), before, after, List.of());
        auditService.log("SCHEDULE_ARCHIVED", AuditModule.SCHEDULE, "ClassSchedule", id, before, after);
        return toResponse(schedule);
    }

    /** Compatibility entry point retained for one release. */
    @Transactional
    public void delete(UUID id) {
        ClassSchedule schedule = findSchedule(id);
        archive(id, new ScheduleLifecycleRequest(schedule.getVersion(), "Archived through deprecated DELETE endpoint", false, List.of()));
    }

    @Transactional(readOnly = true)
    public ScheduleConflictResponse checkConflict(ScheduleConflictRequest request) {
        validateMeetings(request.meetings());
        List<ScheduleConflictDetail> conflicts = findConflicts(
                request.ignoreScheduleId(), request.sectionId(), request.facultyId(), request.roomId(),
                request.schoolYearId(), request.semesterId(), request.meetings());
        return new ScheduleConflictResponse(!conflicts.isEmpty(), conflicts);
    }

    @Transactional(readOnly = true)
    public List<ScheduleChangeHistoryResponse> history(UUID scheduleId, SisUserDetails principal) {
        ClassSchedule schedule = findSchedule(scheduleId);
        assertVisible(schedule, principal);
        return history.findByScheduleIdOrderByCreatedAtDesc(scheduleId).stream().map(this::toHistoryResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> sectionTimetable(UUID sectionId, UUID schoolYearId, UUID semesterId, SisUserDetails principal) {
        ScheduleSearchCriteria criteria = new ScheduleSearchCriteria(null, schoolYearId, semesterId, null, sectionId,
                null, null, null, null, ScheduleStatus.ACTIVE, null, null);
        return schedules.findAll(specification(criteria).and(scope(principal))).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public FacultyLoadResponse facultyLoad(UUID facultyId, UUID schoolYearId, UUID semesterId, SisUserDetails principal) {
        Faculty faculty = findFaculty(facultyId);
        assertFacultyVisible(faculty, principal);
        return calculateLoad(faculty, schoolYearId, semesterId, null, null);
    }

    @Transactional(readOnly = true)
    public List<RoomAvailabilityResponse> roomAvailability(UUID schoolYearId, UUID semesterId,
                                                            java.time.DayOfWeek dayOfWeek, SisUserDetails principal) {
        ScheduleSearchCriteria criteria = new ScheduleSearchCriteria(null, schoolYearId, semesterId, null, null,
                null, null, null, null, ScheduleStatus.ACTIVE, null, null);
        List<ClassSchedule> visibleSchedules = schedules.findAll(specification(criteria).and(scope(principal)));
        return rooms.findAll().stream().filter(room -> room.getStatus() == ActiveStatus.ACTIVE).map(room -> {
            List<RoomAvailabilityResponse.OccupiedPeriod> occupied = visibleSchedules.stream()
                    .flatMap(schedule -> schedule.getMeetings().stream()
                            .filter(ScheduleMeeting::isActive)
                            .filter(meeting -> meeting.getRoom() != null && meeting.getRoom().getId().equals(room.getId()))
                            .filter(meeting -> dayOfWeek == null || meeting.getDayOfWeek() == dayOfWeek)
                            .map(meeting -> new RoomAvailabilityResponse.OccupiedPeriod(schedule.getId(), meeting.getStartTime(),
                                    meeting.getEndTime(), schedule.getCourse().getCourseCode(), schedule.getSection().getSectionCode())))
                    .sorted(Comparator.comparing(RoomAvailabilityResponse.OccupiedPeriod::startTime))
                    .toList();
            return new RoomAvailabilityResponse(room.getId(), room.getRoomCode(), room.getRoomName(), room.getCapacity(),
                    room.getBuilding(), room.getRoomType(), dayOfWeek, occupied);
        }).toList();
    }

    @Transactional(readOnly = true)
    public ScheduleCopyPreviewResponse previewCopy(ScheduleCopyTermRequest request) {
        validateCopyTerms(request);
        List<ScheduleCopyPreviewResponse.Item> items = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        for (UUID sourceId : request.scheduleIds()) {
            List<String> issues = new ArrayList<>();
            if (!seen.add(sourceId)) issues.add("Schedule was selected more than once");
            ClassSchedule source = schedules.findById(sourceId).orElse(null);
            if (source == null) {
                items.add(new ScheduleCopyPreviewResponse.Item(sourceId, null, null, null, null, false,
                        List.of("Source schedule was not found")));
                continue;
            }
            if (!source.getSchoolYear().getId().equals(request.sourceSchoolYearId())
                    || !source.getSemester().getId().equals(request.sourceSemesterId())) {
                issues.add("Source schedule does not belong to the selected source term");
            }
            if (source.getStatus() != ScheduleStatus.ACTIVE && source.getStatus() != ScheduleStatus.ARCHIVED) {
                issues.add("Only active or archived source schedules can be copied");
            }
            Optional<Section> targetOptional = sections.findByProgramIdAndSectionCodeIgnoreCaseAndYearLevelAndSchoolYearIdAndSemesterId(
                    source.getSection().getProgram().getId(), source.getSection().getSectionCode(), source.getSection().getYearLevel(),
                    request.targetSchoolYearId(), request.targetSemesterId());
            Section target = targetOptional.orElse(null);
            if (target == null) {
                issues.add("Matching target section is missing");
            } else {
                if (target.getCurriculum() == null || !courseBelongsToSectionTerm(target, source.getCourse())) {
                    issues.add("Target section curriculum does not contain this course in the target term");
                }
                if (target.getStatus() != ActiveStatus.ACTIVE) issues.add("Target section is inactive");
                if (target.getMaximumCapacity() == null) issues.add("Target section capacity is not configured");
                if (schedules.existsOpenOffering(target.getId(), source.getCourse().getId(), null)) {
                    issues.add("A draft or active target offering already exists");
                }
            }
            if (source.getCourse().getStatus() != ActiveStatus.ACTIVE) issues.add("Course is inactive");
            if (source.getFaculty().getStatus() != ActiveStatus.ACTIVE) issues.add("Faculty is inactive");
            for (ScheduleMeeting meeting : source.getMeetings().stream().filter(ScheduleMeeting::isActive).toList()) {
                if (meeting.getDeliveryMode() != ScheduleDeliveryMode.ONLINE
                        && (meeting.getRoom() == null || meeting.getRoom().getStatus() != ActiveStatus.ACTIVE
                        || meeting.getRoom().getCapacity() == null || meeting.getRoom().getRoomType() == null)) {
                    issues.add("One or more meeting rooms are inactive or incomplete");
                    break;
                }
            }
            items.add(new ScheduleCopyPreviewResponse.Item(sourceId, target == null ? null : target.getId(),
                    source.getCourse().getCourseCode(), source.getSection().getSectionCode(),
                    target == null ? null : target.getSectionCode(), issues.isEmpty(), List.copyOf(new LinkedHashSet<>(issues))));
        }
        return new ScheduleCopyPreviewResponse(items.stream().allMatch(ScheduleCopyPreviewResponse.Item::copyable), items, List.of());
    }

    @Transactional
    public ScheduleCopyResultResponse copyTerm(ScheduleCopyTermRequest request) {
        ScheduleCopyPreviewResponse preview = previewCopy(request);
        if (!preview.executable()) {
            throw new BusinessRuleException("TERM_COPY_BLOCKED", "Term copy preview contains blocking issues");
        }
        List<UUID> created = new ArrayList<>();
        for (ScheduleCopyPreviewResponse.Item item : preview.items()) {
            ClassSchedule source = findSchedule(item.sourceScheduleId());
            Section target = findSection(item.targetSectionId());
            ClassSchedule copy = new ClassSchedule();
            copy.setSection(target);
            copy.setCourse(source.getCourse());
            copy.setFaculty(source.getFaculty());
            copy.setSchoolYear(target.getSchoolYear());
            copy.setSemester(target.getSemester());
            copy.setCapacity(source.getCapacity());
            copy.setStatus(ScheduleStatus.DRAFT);
            source.getMeetings().stream().filter(ScheduleMeeting::isActive).map(this::copyMeeting).forEach(copy::addMeeting);
            copy.setRoom(commonActiveRoom(copy));
            schedules.saveAndFlush(copy);
            ScheduleResponse after = toResponse(copy);
            recordChange(copy, ScheduleChangeAction.COPIED,
                    "Copied from schedule " + source.getId(), null, after, List.of());
            auditService.log("SCHEDULE_COPIED", AuditModule.SCHEDULE, "ClassSchedule", copy.getId(), null, after);
            created.add(copy.getId());
        }
        return new ScheduleCopyResultResponse(created.size(), created);
    }

    private void applyDraft(ClassSchedule schedule, ScheduleRequest request, UUID currentScheduleId) {
        Section section = findSection(request.sectionId());
        Course course = findCourse(request.courseId());
        Faculty faculty = findFaculty(request.facultyId());
        if (section.getCurriculum() == null) {
            throw new BusinessRuleException("SECTION_CURRICULUM_REQUIRED", "Section must have a curriculum");
        }
        if (!courseBelongsToSectionTerm(section, course)) {
            throw new BusinessRuleException("COURSE_NOT_IN_CURRICULUM", "Course is not part of the section curriculum term");
        }
        schedule.setSection(section);
        schedule.setCourse(course);
        schedule.setFaculty(faculty);
        schedule.setSchoolYear(section.getSchoolYear());
        schedule.setSemester(section.getSemester());
        schedule.setCapacity(request.capacity());
        schedule.setStatus(ScheduleStatus.DRAFT);
        schedule.setMeetings(request.meetings().stream().map(meeting -> toMeeting(meeting, course, request.roomId(), 1)).toList());
        schedule.setRoom(commonActiveRoom(schedule));
    }

    private List<ScheduleWarningResponse> validateActivation(ClassSchedule schedule, UUID ignoreScheduleId) {
        List<ScheduleMeeting> activeMeetings = schedule.getMeetings().stream().filter(ScheduleMeeting::isActive).toList();
        validateMeetingEntities(activeMeetings);
        if (schedule.getCourse().getStatus() != ActiveStatus.ACTIVE) {
            throw new BusinessRuleException("COURSE_INACTIVE", "Inactive courses cannot be activated");
        }
        if (schedule.getFaculty().getStatus() != ActiveStatus.ACTIVE) {
            throw new BusinessRuleException("FACULTY_INACTIVE", "Inactive faculty cannot be assigned to an active schedule");
        }
        if (schedule.getSection().getStatus() != ActiveStatus.ACTIVE) {
            throw new BusinessRuleException("SECTION_INACTIVE", "Inactive sections cannot be assigned to an active schedule");
        }
        if (schedule.getSection().getMaximumCapacity() == null) {
            throw new BusinessRuleException("SECTION_CAPACITY_NOT_CONFIGURED", "Configure the section maximum capacity before activation");
        }
        long enrolled = confirmedEnrollmentCount(schedule.getId());
        if (schedule.getCapacity() < enrolled) {
            throw new BusinessRuleException("CAPACITY_BELOW_ENROLLED", "Schedule capacity cannot be below confirmed occupancy");
        }
        if (schedule.getCapacity() > schedule.getSection().getMaximumCapacity()) {
            throw new BusinessRuleException("SECTION_CAPACITY_EXCEEDED", "Schedule capacity exceeds the section maximum capacity");
        }
        for (ScheduleMeeting meeting : activeMeetings) {
            if (meeting.getDeliveryMode() != ScheduleDeliveryMode.ONLINE) {
                Room room = meeting.getRoom();
                if (room.getStatus() != ActiveStatus.ACTIVE) {
                    throw new BusinessRuleException("ROOM_INACTIVE", "Inactive rooms cannot be assigned to active meetings");
                }
                if (room.getRoomType() == null || room.getRoomType().isBlank() || room.getCapacity() == null) {
                    throw new BusinessRuleException("ROOM_PROFILE_INCOMPLETE", "Every onsite or hybrid room requires a type and capacity");
                }
                if (schedule.getCapacity() > room.getCapacity()) {
                    throw new BusinessRuleException("ROOM_CAPACITY_EXCEEDED", "Schedule capacity exceeds room " + room.getRoomCode() + " capacity");
                }
            }
        }
        List<ScheduleConflictDetail> conflicts = findConflicts(ignoreScheduleId, schedule.getSection().getId(),
                schedule.getFaculty().getId(), null, schedule.getSchoolYear().getId(), schedule.getSemester().getId(),
                activeMeetings.stream().map(this::toMeetingRequest).toList());
        if (!conflicts.isEmpty()) {
            throw new ConflictException("SCHEDULE_CONFLICT", summarizeConflicts(conflicts));
        }
        return loadWarnings(schedule.getFaculty(), schedule.getSchoolYear().getId(), schedule.getSemester().getId(),
                schedule.getId(), activeMeetings);
    }

    private void validateMeetingEntities(List<ScheduleMeeting> meetingList) {
        if (meetingList.isEmpty()) throw new BusinessRuleException("SCHEDULE_MEETING_REQUIRED", "At least one active meeting is required");
        validateNoInternalOverlap(meetingList.stream().map(this::toMeetingRequest).toList());
        for (ScheduleMeeting meeting : meetingList) {
            if (meeting.getDeliveryMode() == ScheduleDeliveryMode.ONLINE && meeting.getRoom() != null) {
                throw new BusinessRuleException("ONLINE_ROOM_NOT_ALLOWED", "Online meetings cannot have a room");
            }
            if (meeting.getDeliveryMode() != ScheduleDeliveryMode.ONLINE && meeting.getRoom() == null) {
                throw new BusinessRuleException("MEETING_ROOM_REQUIRED", "Onsite and hybrid meetings require a room");
            }
        }
    }

    private void validateMeetings(List<ScheduleMeetingRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new BusinessRuleException("SCHEDULE_MEETING_REQUIRED", "At least one schedule meeting is required");
        }
        for (ScheduleMeetingRequest meeting : requests) {
            if (meeting.startTime() == null || meeting.endTime() == null || meeting.dayOfWeek() == null) {
                throw new BusinessRuleException("SCHEDULE_MEETING_INVALID", "Meeting day, start time, and end time are required");
            }
            if (!meeting.endTime().isAfter(meeting.startTime())) {
                throw new BusinessRuleException("SCHEDULE_MEETING_INVALID", "Meeting end time must be after start time");
            }
            ScheduleDeliveryMode mode = meeting.deliveryMode() == null ? ScheduleDeliveryMode.ONSITE : meeting.deliveryMode();
            if (mode == ScheduleDeliveryMode.ONLINE && meeting.roomId() != null) {
                throw new BusinessRuleException("ONLINE_ROOM_NOT_ALLOWED", "Online meetings cannot have a room");
            }
        }
        validateNoInternalOverlap(requests);
    }

    private void validateNoInternalOverlap(List<ScheduleMeetingRequest> requests) {
        for (int i = 0; i < requests.size(); i++) {
            ScheduleMeetingRequest left = requests.get(i);
            for (int j = i + 1; j < requests.size(); j++) {
                ScheduleMeetingRequest right = requests.get(j);
                if (left.dayOfWeek() == right.dayOfWeek()
                        && left.startTime().isBefore(right.endTime())
                        && left.endTime().isAfter(right.startTime())) {
                    throw new BusinessRuleException("SCHEDULE_MEETING_OVERLAP", "Meetings in one schedule cannot overlap or duplicate each other");
                }
            }
        }
    }

    private List<ScheduleConflictDetail> findConflicts(
            UUID ignoreScheduleId, UUID sectionId, UUID facultyId, UUID fallbackRoomId,
            UUID schoolYearId, UUID semesterId, List<ScheduleMeetingRequest> requestedMeetings
    ) {
        List<ScheduleConflictDetail> conflicts = new ArrayList<>();
        Set<String> dedupe = new HashSet<>();
        for (ScheduleMeetingRequest requested : requestedMeetings) {
            ScheduleDeliveryMode mode = requested.deliveryMode() == null ? ScheduleDeliveryMode.ONSITE : requested.deliveryMode();
            UUID roomId = mode == ScheduleDeliveryMode.ONLINE ? null
                    : (requested.roomId() == null ? fallbackRoomId : requested.roomId());
            List<ScheduleMeeting> overlaps = meetings.findOverlappingActiveMeetings(
                    schoolYearId, semesterId, sectionId, facultyId, roomId, requested.dayOfWeek(),
                    requested.startTime(), requested.endTime(), ignoreScheduleId, ScheduleStatus.ACTIVE);
            for (ScheduleMeeting overlap : overlaps) {
                ClassSchedule schedule = overlap.getClassSchedule();
                if (roomId != null && overlap.getRoom() != null && overlap.getRoom().getId().equals(roomId)) {
                    addConflict(conflicts, dedupe, toConflictDetail(ROOM_CONFLICT, schedule, overlap, requested));
                }
                if (schedule.getFaculty().getId().equals(facultyId)) {
                    addConflict(conflicts, dedupe, toConflictDetail(FACULTY_CONFLICT, schedule, overlap, requested));
                }
                if (schedule.getSection().getId().equals(sectionId)) {
                    addConflict(conflicts, dedupe, toConflictDetail(SECTION_CONFLICT, schedule, overlap, requested));
                }
            }
        }
        return conflicts;
    }

    private void addConflict(List<ScheduleConflictDetail> target, Set<String> dedupe, ScheduleConflictDetail detail) {
        String key = detail.conflictType() + detail.scheduleId() + detail.dayOfWeek() + detail.existingStartTime();
        if (dedupe.add(key)) target.add(detail);
    }

    private void replaceReservations(ClassSchedule schedule) {
        reservations.deleteByScheduleId(schedule.getId());
        List<ScheduleResourceReservation> entries = new ArrayList<>();
        for (ScheduleMeeting meeting : schedule.getMeetings().stream().filter(ScheduleMeeting::isActive).toList()) {
            entries.add(reservation(schedule, meeting, ScheduleResourceType.SECTION, schedule.getSection().getId()));
            entries.add(reservation(schedule, meeting, ScheduleResourceType.FACULTY, schedule.getFaculty().getId()));
            if (meeting.getRoom() != null) {
                entries.add(reservation(schedule, meeting, ScheduleResourceType.ROOM, meeting.getRoom().getId()));
            }
        }
        try {
            reservations.saveAllAndFlush(entries);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("SCHEDULE_CONFLICT", "Another activation reserved one of the requested resources. Refresh and review conflicts.");
        }
    }

    private ScheduleResourceReservation reservation(ClassSchedule schedule, ScheduleMeeting meeting,
                                                     ScheduleResourceType type, UUID resourceId) {
        ScheduleResourceReservation reservation = new ScheduleResourceReservation();
        reservation.setSchedule(schedule);
        reservation.setMeeting(meeting);
        reservation.setSchoolYear(schedule.getSchoolYear());
        reservation.setSemester(schedule.getSemester());
        reservation.setDayOfWeek(meeting.getDayOfWeek());
        reservation.setResourceType(type);
        reservation.setResourceId(resourceId);
        reservation.setStartTime(meeting.getStartTime());
        reservation.setEndTime(meeting.getEndTime());
        return reservation;
    }

    private List<ScheduleWarningResponse> loadWarnings(Faculty faculty, UUID schoolYearId, UUID semesterId,
                                                       UUID ignoreScheduleId, List<ScheduleMeeting> proposedMeetings) {
        FacultyLoadResponse load = calculateLoad(faculty, schoolYearId, semesterId, ignoreScheduleId, proposedMeetings);
        if (!load.policyConfigured()) {
            return List.of(new ScheduleWarningResponse("FACULTY_LOAD_POLICY_MISSING",
                    "No teaching-load policy is configured for this faculty type or term", false));
        }
        if (load.overloaded()) {
            return List.of(new ScheduleWarningResponse("FACULTY_LOAD_WARNING",
                    "Activation would exceed the faculty teaching-load policy", true));
        }
        return List.of();
    }

    private FacultyLoadResponse calculateLoad(Faculty faculty, UUID schoolYearId, UUID semesterId,
                                              UUID ignoreScheduleId, List<ScheduleMeeting> proposedMeetings) {
        List<ClassSchedule> active = schedules.findByFacultyIdAndSchoolYearIdAndSemesterIdAndStatus(
                faculty.getId(), schoolYearId, semesterId, ScheduleStatus.ACTIVE).stream()
                .filter(schedule -> ignoreScheduleId == null || !schedule.getId().equals(ignoreScheduleId)).toList();
        BigDecimal hours = active.stream().flatMap(schedule -> schedule.getMeetings().stream())
                .filter(ScheduleMeeting::isActive).map(this::meetingHours).reduce(BigDecimal.ZERO, BigDecimal::add);
        long classCount = active.size();
        long students = active.stream().mapToLong(schedule -> confirmedEnrollmentCount(schedule.getId())).sum();
        if (proposedMeetings != null) {
            hours = hours.add(proposedMeetings.stream().map(this::meetingHours).reduce(BigDecimal.ZERO, BigDecimal::add));
            classCount++;
        }
        Optional<ScheduleLoadPolicy> policy = loadPolicies
                .findFirstBySchoolYearIdAndSemesterIdAndFacultyTypeAndActiveTrue(schoolYearId, semesterId, faculty.getFacultyType())
                .or(() -> loadPolicies.findFirstBySchoolYearIdAndSemesterIdAndFacultyTypeIsNullAndActiveTrue(schoolYearId, semesterId));
        BigDecimal maximum = policy.map(ScheduleLoadPolicy::getMaximumWeeklyContactHours).orElse(null);
        Integer maximumClasses = policy.map(ScheduleLoadPolicy::getMaximumActiveClasses).orElse(null);
        boolean overloaded = maximum != null && hours.compareTo(maximum) > 0
                || maximumClasses != null && classCount > maximumClasses;
        BigDecimal remaining = maximum == null ? null : maximum.subtract(hours);
        return new FacultyLoadResponse(faculty.getId(), facultyName(faculty), faculty.getFacultyType().name(),
                classCount, students, hours, maximum, maximumClasses, remaining, overloaded, policy.isPresent());
    }

    private void validateLoadOverride(List<ScheduleWarningResponse> warnings, boolean acknowledged,
                                      String reason, SisUserDetails principal) {
        if (warnings.stream().noneMatch(ScheduleWarningResponse::requiresOverride)) return;
        if (!acknowledged) {
            throw new BusinessRuleException("FACULTY_LOAD_WARNING", "Teaching-load warning must be acknowledged before activation");
        }
        if (principal != null && !hasAuthority(principal, "SCHEDULE_OVERRIDE")) {
            throw new BusinessRuleException("SCHEDULE_OVERRIDE_REQUIRED", "SCHEDULE_OVERRIDE permission is required to acknowledge overload");
        }
        requireReason(reason, "A reason is required when overriding a teaching-load warning");
    }

    private BigDecimal meetingHours(ScheduleMeeting meeting) {
        return BigDecimal.valueOf(Duration.between(meeting.getStartTime(), meeting.getEndTime()).toMinutes())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private ScheduleMeeting toMeeting(ScheduleMeetingRequest request, Course course, UUID fallbackRoomId, int revision) {
        ScheduleDeliveryMode deliveryMode = request.deliveryMode() == null ? ScheduleDeliveryMode.ONSITE : request.deliveryMode();
        UUID roomId = deliveryMode == ScheduleDeliveryMode.ONLINE ? null
                : (request.roomId() == null ? fallbackRoomId : request.roomId());
        if (deliveryMode != ScheduleDeliveryMode.ONLINE && roomId == null) {
            throw new BusinessRuleException("MEETING_ROOM_REQUIRED", "Onsite and hybrid meetings require a room");
        }
        ScheduleMeeting meeting = new ScheduleMeeting();
        meeting.setDayOfWeek(request.dayOfWeek());
        meeting.setStartTime(request.startTime());
        meeting.setEndTime(request.endTime());
        meeting.setComponentType(request.componentType() == null ? inferComponent(course) : request.componentType());
        meeting.setDeliveryMode(deliveryMode);
        meeting.setRoom(roomId == null ? null : findRoom(roomId));
        meeting.setLocationDetails(request.locationDetails());
        meeting.setRevisionNumber(revision);
        meeting.setActive(true);
        meeting.setEffectiveFrom(Instant.now());
        return meeting;
    }

    private ScheduleMeeting copyMeeting(ScheduleMeeting source) {
        ScheduleMeeting copy = new ScheduleMeeting();
        copy.setDayOfWeek(source.getDayOfWeek());
        copy.setStartTime(source.getStartTime());
        copy.setEndTime(source.getEndTime());
        copy.setComponentType(source.getComponentType());
        copy.setDeliveryMode(source.getDeliveryMode());
        copy.setRoom(source.getRoom());
        copy.setLocationDetails(source.getLocationDetails());
        copy.setRevisionNumber(1);
        copy.setActive(true);
        copy.setEffectiveFrom(Instant.now());
        return copy;
    }

    private ScheduleComponentType inferComponent(Course course) {
        boolean lecture = course.getLectureHoursPerWeek().compareTo(BigDecimal.ZERO) > 0;
        boolean laboratory = course.getLaboratoryHoursPerWeek().compareTo(BigDecimal.ZERO) > 0;
        if (lecture && laboratory) return ScheduleComponentType.COMBINED;
        if (laboratory) return ScheduleComponentType.LABORATORY;
        return ScheduleComponentType.LECTURE;
    }

    private ScheduleMeetingRequest toMeetingRequest(ScheduleMeeting meeting) {
        return new ScheduleMeetingRequest(meeting.getDayOfWeek(), meeting.getStartTime(), meeting.getEndTime(),
                meeting.getComponentType(), meeting.getDeliveryMode(),
                meeting.getRoom() == null ? null : meeting.getRoom().getId(), meeting.getLocationDetails());
    }

    private Room commonActiveRoom(ClassSchedule schedule) {
        List<ScheduleMeeting> active = schedule.getMeetings().stream().filter(ScheduleMeeting::isActive).toList();
        if (active.isEmpty() || active.stream().anyMatch(meeting -> meeting.getRoom() == null)) return null;
        Room first = active.getFirst().getRoom();
        return active.stream().allMatch(meeting -> meeting.getRoom().getId().equals(first.getId())) ? first : null;
    }

    private void recordChange(ClassSchedule schedule, ScheduleChangeAction action, String reason,
                              Object before, Object after, List<String> warnings) {
        ScheduleChangeHistory change = new ScheduleChangeHistory();
        change.setSchedule(schedule);
        change.setAction(action);
        change.setReason(reason);
        change.setBeforeSnapshot(before == null ? null : objectMapper.valueToTree(before));
        change.setAfterSnapshot(after == null ? null : objectMapper.valueToTree(after));
        change.setAcknowledgedWarnings(objectMapper.valueToTree(warnings == null ? List.of() : warnings));
        change.setActor(currentUser());
        history.save(change);
    }

    private ScheduleResponse toResponse(ClassSchedule schedule) {
        long enrolledCount = confirmedEnrollmentCount(schedule.getId());
        ClassGradebook gradebook = gradebooks.findByScheduleId(schedule.getId()).orElse(null);
        List<ScheduleMeetingResponse> activeMeetings = schedule.getMeetings().stream().filter(ScheduleMeeting::isActive)
                .sorted(Comparator.comparing(ScheduleMeeting::getDayOfWeek).thenComparing(ScheduleMeeting::getStartTime))
                .map(this::toMeetingResponse).toList();
        List<ScheduleWarningResponse> warnings = schedule.getStatus() == ScheduleStatus.DRAFT
                ? loadWarnings(schedule.getFaculty(), schedule.getSchoolYear().getId(), schedule.getSemester().getId(),
                    schedule.getId(), schedule.getMeetings().stream().filter(ScheduleMeeting::isActive).toList())
                : List.of();
        ScheduleLatestChangeResponse latest = history.findByScheduleIdOrderByCreatedAtDesc(schedule.getId(), PageRequest.of(0, 1))
                .stream().findFirst().map(this::toLatestChange).orElse(null);
        Room legacyRoom = commonActiveRoom(schedule);
        return new ScheduleResponse(
                schedule.getId(), schedule.getSection().getId(), schedule.getSection().getSectionCode(),
                schedule.getSection().getProgram().getId(), schedule.getSection().getProgram().getProgramCode(),
                schedule.getSection().getCurriculum() == null ? null : schedule.getSection().getCurriculum().getId(),
                schedule.getSection().getCurriculum() == null ? null : schedule.getSection().getCurriculum().getCurriculumCode(),
                schedule.getSection().getYearLevel(), schedule.getCourse().getId(), schedule.getCourse().getCourseCode(),
                schedule.getCourse().getCourseTitle(), schedule.getCourse().getCreditUnits(), schedule.getFaculty().getId(),
                facultyName(schedule.getFaculty()), legacyRoom == null ? null : legacyRoom.getId(),
                legacyRoom == null ? null : legacyRoom.getRoomCode(), schedule.getSchoolYear().getId(),
                schedule.getSchoolYear().getSchoolYear(), schedule.getSemester().getId(), schedule.getSemester().getName(),
                schedule.getCapacity(), enrolledCount, Math.max(0, schedule.getCapacity() - enrolledCount), schedule.getStatus(),
                schedule.getVersion(), hasAnyActivity(schedule.getId()), gradebook != null && gradebook.getSubmittedAt() != null,
                isGradebookLocked(gradebook), schedule.getStatus() != ScheduleStatus.DRAFT,
                roomSummary(activeMeetings), warnings, latest, activeMeetings);
    }

    private ScheduleMeetingResponse toMeetingResponse(ScheduleMeeting meeting) {
        Room room = meeting.getRoom();
        return new ScheduleMeetingResponse(meeting.getId(), meeting.getDayOfWeek(), meeting.getStartTime(), meeting.getEndTime(),
                meeting.getComponentType(), meeting.getDeliveryMode(), room == null ? null : room.getId(),
                room == null ? null : room.getRoomCode(), room == null ? null : room.getRoomName(), meeting.getLocationDetails(),
                meeting.getRevisionNumber(), meeting.isActive(), meeting.getEffectiveFrom(), meeting.getEffectiveTo());
    }

    private ScheduleConflictDetail toConflictDetail(String type, ClassSchedule schedule,
                                                    ScheduleMeeting existing, ScheduleMeetingRequest requested) {
        return new ScheduleConflictDetail(type, schedule.getId(), schedule.getCourse().getCourseCode(),
                schedule.getCourse().getCourseTitle(), schedule.getSection().getSectionCode(), facultyName(schedule.getFaculty()),
                existing.getRoom() == null ? null : existing.getRoom().getRoomCode(), existing.getDayOfWeek(),
                existing.getStartTime(), existing.getEndTime(), requested.startTime(), requested.endTime());
    }

    private ScheduleLatestChangeResponse toLatestChange(ScheduleChangeHistory change) {
        return new ScheduleLatestChangeResponse(change.getId(), change.getAction(), change.getReason(),
                change.getActor() == null ? null : change.getActor().getFullName(), change.getCreatedAt());
    }

    private ScheduleChangeHistoryResponse toHistoryResponse(ScheduleChangeHistory change) {
        List<String> acknowledged = new ArrayList<>();
        JsonNode node = change.getAcknowledgedWarnings();
        if (node != null && node.isArray()) node.forEach(value -> acknowledged.add(value.asText()));
        return new ScheduleChangeHistoryResponse(change.getId(), change.getSchedule().getId(), change.getAction(),
                change.getReason(), change.getBeforeSnapshot(), change.getAfterSnapshot(), acknowledged,
                change.getActor() == null ? null : change.getActor().getId(),
                change.getActor() == null ? null : change.getActor().getFullName(), change.getCreatedAt());
    }

    private Specification<ClassSchedule> specification(ScheduleSearchCriteria criteria) {
        return (root, query, cb) -> {
            query.distinct(true);
            if (criteria == null) return cb.conjunction();
            var predicate = cb.conjunction();
            var meeting = root.join("meetings", JoinType.LEFT);
            if (criteria.search() != null && !criteria.search().isBlank()) {
                String term = "%" + criteria.search().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("section").get("sectionCode")), term),
                        cb.like(cb.lower(root.get("course").get("courseCode")), term),
                        cb.like(cb.lower(root.get("course").get("courseTitle")), term),
                        cb.like(cb.lower(root.get("faculty").get("firstName")), term),
                        cb.like(cb.lower(root.get("faculty").get("lastName")), term),
                        cb.like(cb.lower(meeting.get("room").get("roomCode")), term)));
            }
            if (criteria.schoolYearId() != null) predicate = cb.and(predicate, cb.equal(root.get("schoolYear").get("id"), criteria.schoolYearId()));
            if (criteria.semesterId() != null) predicate = cb.and(predicate, cb.equal(root.get("semester").get("id"), criteria.semesterId()));
            if (criteria.programId() != null) predicate = cb.and(predicate, cb.equal(root.get("section").get("program").get("id"), criteria.programId()));
            if (criteria.sectionId() != null) predicate = cb.and(predicate, cb.equal(root.get("section").get("id"), criteria.sectionId()));
            if (criteria.facultyId() != null) predicate = cb.and(predicate, cb.equal(root.get("faculty").get("id"), criteria.facultyId()));
            if (criteria.roomId() != null) predicate = cb.and(predicate, cb.equal(meeting.get("room").get("id"), criteria.roomId()));
            if (criteria.courseId() != null) predicate = cb.and(predicate, cb.equal(root.get("course").get("id"), criteria.courseId()));
            if (criteria.status() != null) predicate = cb.and(predicate, cb.equal(root.get("status"), criteria.status()));
            if (criteria.curriculumId() != null) predicate = cb.and(predicate, cb.equal(root.get("section").get("curriculum").get("id"), criteria.curriculumId()));
            if (criteria.yearLevel() != null) predicate = cb.and(predicate, cb.equal(root.get("section").get("yearLevel"), criteria.yearLevel()));
            if (criteria.dayOfWeek() != null) predicate = cb.and(predicate, cb.equal(meeting.get("dayOfWeek"), criteria.dayOfWeek()));
            if (criteria.roomId() != null || criteria.dayOfWeek() != null) predicate = cb.and(predicate, cb.isTrue(meeting.get("active")));
            return predicate;
        };
    }

    private Specification<ClassSchedule> scope(SisUserDetails principal) {
        return (root, query, cb) -> {
            if (principal == null || hasRole(principal, "SUPER_ADMIN") || hasRole(principal, "REGISTRAR")) {
                return cb.conjunction();
            }
            if (hasRole(principal, "FACULTY")) {
                return principal.facultyId() == null ? cb.disjunction()
                        : cb.equal(root.get("faculty").get("id"), principal.facultyId());
            }
            if (hasRole(principal, "DEAN") || hasRole(principal, "PROGRAM_HEAD")) {
                if (principal.facultyId() == null) return cb.disjunction();
                Faculty faculty = facultyRepository.findById(principal.facultyId()).orElse(null);
                if (faculty == null) return cb.disjunction();
                return cb.equal(root.get("section").get("program").get("department").get("id"), faculty.getDepartment().getId());
            }
            return cb.disjunction();
        };
    }

    private void assertVisible(ClassSchedule schedule, SisUserDetails principal) {
        if (principal == null || hasRole(principal, "SUPER_ADMIN") || hasRole(principal, "REGISTRAR")) return;
        if (hasRole(principal, "FACULTY") && Objects.equals(principal.facultyId(), schedule.getFaculty().getId())) return;
        if ((hasRole(principal, "DEAN") || hasRole(principal, "PROGRAM_HEAD")) && principal.facultyId() != null) {
            Faculty viewer = facultyRepository.findById(principal.facultyId()).orElse(null);
            if (viewer != null && viewer.getDepartment().getId().equals(schedule.getSection().getProgram().getDepartment().getId())) return;
        }
        throw new org.springframework.security.access.AccessDeniedException("Schedule is outside the permitted scope");
    }

    private void assertFacultyVisible(Faculty target, SisUserDetails principal) {
        if (principal == null || hasRole(principal, "SUPER_ADMIN") || hasRole(principal, "REGISTRAR")) return;
        if (hasRole(principal, "FACULTY") && Objects.equals(principal.facultyId(), target.getId())) return;
        if ((hasRole(principal, "DEAN") || hasRole(principal, "PROGRAM_HEAD")) && principal.facultyId() != null) {
            Faculty viewer = facultyRepository.findById(principal.facultyId()).orElse(null);
            if (viewer != null && viewer.getDepartment().getId().equals(target.getDepartment().getId())) return;
        }
        throw new org.springframework.security.access.AccessDeniedException("Faculty load is outside the permitted scope");
    }

    private boolean hasRole(SisUserDetails principal, String role) {
        return hasAuthority(principal, "ROLE_" + role);
    }

    private boolean hasAuthority(SisUserDetails principal, String authority) {
        return principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(authority::equals);
    }

    private void validateCopyTerms(ScheduleCopyTermRequest request) {
        schoolYears.findById(request.sourceSchoolYearId()).orElseThrow(() -> new NotFoundException("Source school year not found"));
        semesters.findById(request.sourceSemesterId()).orElseThrow(() -> new NotFoundException("Source semester not found"));
        schoolYears.findById(request.targetSchoolYearId()).orElseThrow(() -> new NotFoundException("Target school year not found"));
        semesters.findById(request.targetSemesterId()).orElseThrow(() -> new NotFoundException("Target semester not found"));
        if (request.sourceSchoolYearId().equals(request.targetSchoolYearId())
                && request.sourceSemesterId().equals(request.targetSemesterId())) {
            throw new BusinessRuleException("TERM_COPY_SAME_TERM", "Source and target terms must be different");
        }
    }

    private boolean courseBelongsToSectionTerm(Section section, Course course) {
        String semesterCode = normalizeSemester(section.getSemester().getName());
        return curriculumCourses.existsByCurriculumIdAndYearLevelAndSemesterIgnoreCaseAndCourseId(
                section.getCurriculum().getId(), section.getYearLevel(), semesterCode, course.getId());
    }

    private String normalizeSemester(String value) {
        return value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
    }

    private boolean hasAnyActivity(UUID scheduleId) {
        return enrollmentSubjects.countByClassScheduleId(scheduleId) > 0 || classActivityCount(scheduleId) > 0;
    }

    private boolean hasConsumingActivity(UUID scheduleId) {
        return enrollmentSubjects.existsConsumingEnrollmentActivity(scheduleId) || classActivityCount(scheduleId) > 0;
    }

    private long classActivityCount(UUID scheduleId) {
        try {
            Long count = jdbc.queryForObject("""
                    select (select count(*) from attendance_sessions where schedule_id = ?)
                         + (select count(*) from class_materials where schedule_id = ?)
                         + (select count(*) from class_announcements where schedule_id = ?)
                    """, Long.class, scheduleId, scheduleId, scheduleId);
            return count == null ? 0 : count;
        } catch (org.springframework.jdbc.BadSqlGrammarException unavailableInJpaOnlyTestSchema) {
            return 0;
        }
    }

    private boolean isGradebookLocked(ClassGradebook gradebook) {
        return gradebook != null && (gradebook.getStatus() == GradeStatus.LOCKED || gradebook.getLockedAt() != null);
    }

    private long confirmedEnrollmentCount(UUID scheduleId) {
        if (scheduleId == null) return 0;
        return enrollmentSubjects.countByClassScheduleIdAndStatusAndEnrollmentStatus(
                scheduleId, EnrollmentSubjectStatus.ENROLLED, EnrollmentStatus.CONFIRMED);
    }

    private void requireDraftRequest(ScheduleRequest request) {
        if (request.status() != ScheduleStatus.DRAFT) {
            throw new BusinessRuleException("SCHEDULE_LIFECYCLE_REQUIRED", "Create and PUT accept DRAFT schedules only; use the lifecycle endpoints");
        }
    }

    private void verifyVersion(ClassSchedule schedule, Long expectedVersion) {
        if (expectedVersion != null && schedule.getVersion() != expectedVersion) {
            throw new ConflictException("SCHEDULE_VERSION_CONFLICT", "The schedule changed. Refresh before retrying this operation.");
        }
    }

    private void requireStatus(ClassSchedule schedule, ScheduleStatus status, String message) {
        if (schedule.getStatus() != status) throw new BusinessRuleException("SCHEDULE_LIFECYCLE_INVALID", message);
    }

    private void requireReason(String reason, String message) {
        if (reason == null || reason.isBlank()) throw new BusinessRuleException("SCHEDULE_REASON_REQUIRED", message);
    }

    private List<String> acknowledgedWarnings(List<String> requested, List<ScheduleWarningResponse> warnings, boolean loadAcknowledged) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        if (requested != null) result.addAll(requested);
        if (loadAcknowledged) warnings.stream().filter(ScheduleWarningResponse::requiresOverride)
                .map(ScheduleWarningResponse::code).forEach(result::add);
        return List.copyOf(result);
    }

    private String summarizeConflicts(List<ScheduleConflictDetail> conflicts) {
        return conflicts.stream().limit(3).map(conflict -> conflict.conflictType() + " conflict with "
                + conflict.courseCode() + " / " + conflict.sectionCode() + " on " + conflict.dayOfWeek()
                + " " + conflict.existingStartTime() + "-" + conflict.existingEndTime())
                .reduce((left, right) -> left + "; " + right).orElse("Schedule has conflicts");
    }

    private String roomSummary(List<ScheduleMeetingResponse> meetingList) {
        LinkedHashSet<String> labels = new LinkedHashSet<>();
        for (ScheduleMeetingResponse meeting : meetingList) {
            if (meeting.deliveryMode() == ScheduleDeliveryMode.ONLINE) labels.add("Online");
            else if (meeting.roomCode() != null) labels.add(meeting.roomCode());
        }
        return String.join(", ", labels);
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SisUserDetails details)) return null;
        return users.findById(details.id()).orElse(null);
    }

    private Section findSection(UUID id) {
        return sections.findById(id).orElseThrow(() -> new NotFoundException("Section not found"));
    }

    private Course findCourse(UUID id) {
        return courses.findById(id).orElseThrow(() -> new NotFoundException("Course not found"));
    }

    private Faculty findFaculty(UUID id) {
        return facultyRepository.findById(id).orElseThrow(() -> new NotFoundException("Faculty not found"));
    }

    private Room findRoom(UUID id) {
        return rooms.findById(id).orElseThrow(() -> new NotFoundException("Room not found"));
    }

    private ClassSchedule findSchedule(UUID id) {
        return schedules.findById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
    }

    private String facultyName(Faculty faculty) {
        if (faculty == null) return null;
        String middleInitial = faculty.getMiddleName() != null && !faculty.getMiddleName().isBlank()
                ? faculty.getMiddleName().substring(0, 1).toUpperCase() + "." : "";
        return String.join(" ", List.of(faculty.getFirstName(), middleInitial, faculty.getLastName(),
                        faculty.getSuffix() == null ? "" : faculty.getSuffix()))
                .replaceAll("\\s+", " ").trim();
    }
}
