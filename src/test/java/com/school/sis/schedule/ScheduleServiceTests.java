package com.school.sis.schedule;

import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.schedule.dto.ScheduleConflictRequest;
import com.school.sis.schedule.dto.ScheduleConflictResponse;
import com.school.sis.schedule.dto.ScheduleMeetingRequest;
import com.school.sis.schedule.dto.ScheduleRequest;
import com.school.sis.schedule.dto.ScheduleResponse;
import com.school.sis.schedule.dto.ScheduleLifecycleRequest;
import com.school.sis.schedule.dto.ScheduleRevisionRequest;
import com.school.sis.schedule.dto.ScheduleCopyTermRequest;
import com.school.sis.schedule.entity.ScheduleComponentType;
import com.school.sis.schedule.entity.ScheduleDeliveryMode;
import com.school.sis.schedule.entity.ScheduleLoadPolicy;
import com.school.sis.schedule.entity.ScheduleMeeting;
import com.school.sis.schedule.repository.ScheduleLoadPolicyRepository;
import com.school.sis.schedule.repository.ScheduleMeetingRepository;
import com.school.sis.setup.service.RoomService;
import com.school.sis.schedule.entity.ScheduleStatus;
import com.school.sis.schedule.service.ScheduleService;
import com.school.sis.setup.entity.ActiveStatus;
import com.school.sis.setup.entity.Course;
import com.school.sis.setup.entity.CourseType;
import com.school.sis.setup.entity.DegreeType;
import com.school.sis.setup.entity.Department;
import com.school.sis.setup.entity.EmploymentStatus;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.setup.entity.FacultyType;
import com.school.sis.setup.entity.Program;
import com.school.sis.setup.entity.Room;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.setup.entity.Section;
import com.school.sis.setup.entity.Semester;
import com.school.sis.setup.repository.CourseRepository;
import com.school.sis.setup.repository.DepartmentRepository;
import com.school.sis.setup.repository.FacultyRepository;
import com.school.sis.setup.repository.ProgramRepository;
import com.school.sis.setup.repository.RoomRepository;
import com.school.sis.setup.repository.SchoolYearRepository;
import com.school.sis.setup.repository.SectionRepository;
import com.school.sis.setup.repository.SemesterRepository;
import com.school.sis.curriculum.entity.Curriculum;
import com.school.sis.curriculum.entity.CurriculumStatus;
import com.school.sis.curriculum.entity.CurriculumCourse;
import com.school.sis.curriculum.entity.RequiredStatus;
import com.school.sis.curriculum.repository.CurriculumRepository;
import com.school.sis.curriculum.repository.CurriculumCourseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doReturn;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class ScheduleServiceTests {

    private final ScheduleService scheduleService;
    private final DepartmentRepository departmentRepository;
    private final ProgramRepository programRepository;
    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final RoomRepository roomRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final SemesterRepository semesterRepository;
    private final SectionRepository sectionRepository;
    private final CurriculumRepository curriculumRepository;
    private final CurriculumCourseRepository curriculumCourseRepository;
    private final ScheduleLoadPolicyRepository loadPolicyRepository;
    private final ScheduleMeetingRepository scheduleMeetingRepository;
    private final RoomService roomService;

    private Section section;
    private Section otherSection;
    private Curriculum curriculum;
    private Course course;
    private Faculty faculty;
    private Faculty otherFaculty;
    private Room room;
    private Room otherRoom;
    private SchoolYear schoolYear;
    private Semester semester;

    @Autowired
    ScheduleServiceTests(
            ScheduleService scheduleService,
            DepartmentRepository departmentRepository,
            ProgramRepository programRepository,
            CourseRepository courseRepository,
            FacultyRepository facultyRepository,
            RoomRepository roomRepository,
            SchoolYearRepository schoolYearRepository,
            SemesterRepository semesterRepository,
            SectionRepository sectionRepository,
            CurriculumRepository curriculumRepository,
            CurriculumCourseRepository curriculumCourseRepository,
            ScheduleLoadPolicyRepository loadPolicyRepository,
            ScheduleMeetingRepository scheduleMeetingRepository,
            RoomService roomService
    ) {
        this.scheduleService = scheduleService;
        this.departmentRepository = departmentRepository;
        this.programRepository = programRepository;
        this.courseRepository = courseRepository;
        this.facultyRepository = facultyRepository;
        this.roomRepository = roomRepository;
        this.schoolYearRepository = schoolYearRepository;
        this.semesterRepository = semesterRepository;
        this.sectionRepository = sectionRepository;
        this.curriculumRepository = curriculumRepository;
        this.curriculumCourseRepository = curriculumCourseRepository;
        this.loadPolicyRepository = loadPolicyRepository;
        this.scheduleMeetingRepository = scheduleMeetingRepository;
        this.roomService = roomService;
    }

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Department department = new Department();
        department.setDepartmentCode("CCS-" + suffix);
        department.setDepartmentName("College of Computer Studies " + suffix);
        department.setStatus(ActiveStatus.ACTIVE);
        department = departmentRepository.save(department);

        Program program = new Program();
        program.setProgramCode("BSIT-" + suffix);
        program.setProgramName("Bachelor of Science in Information Technology");
        program.setDepartment(department);
        program.setDegreeType(DegreeType.BACHELOR);
        program.setProgramDuration(4);
        program.setStatus(ActiveStatus.ACTIVE);
        program = programRepository.save(program);

        course = new Course();
        course.setCourseCode("CCS-" + suffix);
        course.setCourseTitle("Fundamentals of Programming");
        course.setCourseType(CourseType.MAJOR);
        course.setDepartment(department);
        course.setLectureHoursPerWeek(BigDecimal.valueOf(2));
        course.setLaboratoryHoursPerWeek(BigDecimal.valueOf(3));
        course.setCreditUnits(BigDecimal.valueOf(3));
        course.setStatus(ActiveStatus.ACTIVE);
        course = courseRepository.save(course);

        faculty = faculty("EMP-A-" + suffix, "Ada", "Lovelace", department);
        otherFaculty = faculty("EMP-B-" + suffix, "Grace", "Hopper", department);
        room = room("LAB-A-" + suffix);
        otherRoom = room("LAB-B-" + suffix);

        schoolYear = new SchoolYear();
        schoolYear.setSchoolYear("2026-" + suffix);
        schoolYear.setActive(true);
        schoolYear = schoolYearRepository.save(schoolYear);

        semester = new Semester();
        semester.setName("TERM" + suffix);
        semester.setSortOrder(1);
        semester.setActive(true);
        semester = semesterRepository.save(semester);

        curriculum = new Curriculum();
        curriculum.setProgram(program);
        curriculum.setCurriculumCode("CUR-" + suffix);
        curriculum.setCurriculumName("Schedule Curriculum");
        curriculum.setEffectiveSchoolYear("2026-2027");
        curriculum.setVersion("1");
        curriculum.setStatus(CurriculumStatus.ACTIVE);
        curriculum = curriculumRepository.save(curriculum);

        CurriculumCourse curriculumCourse = new CurriculumCourse();
        curriculumCourse.setCurriculum(curriculum);
        curriculumCourse.setYearLevel(1);
        curriculumCourse.setSemester(semester.getName());
        curriculumCourse.setCourse(course);
        curriculumCourse.setSortOrder(1);
        curriculumCourse.setRequiredStatus(RequiredStatus.REQUIRED);
        curriculumCourseRepository.save(curriculumCourse);

        section = section("BSIT-1A-" + suffix, program);
        otherSection = section("BSIT-1B-" + suffix, program);
    }

    @Test
    void checkConflictReportsRoomFacultyAndSectionOverlaps() {
        ScheduleResponse existing = activate(request(
                section.getId(),
                faculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.MONDAY, "09:00", "10:30")
        ));

        ScheduleConflictResponse response = scheduleService.checkConflict(new ScheduleConflictRequest(
                null,
                section.getId(),
                faculty.getId(),
                room.getId(),
                schoolYear.getId(),
                semester.getId(),
                List.of(meeting(DayOfWeek.MONDAY, "10:00", "11:00"))
        ));

        assertThat(response.hasConflicts()).isTrue();
        assertThat(response.conflicts())
                .extracting("conflictType")
                .containsExactlyInAnyOrder("ROOM", "FACULTY", "SECTION");
        assertThat(response.conflicts())
                .allSatisfy(conflict -> assertThat(conflict.scheduleId()).isEqualTo(existing.id()));
    }

    @Test
    void activeScheduleRejectsOverlappingRoomConflict() {
        activate(request(
                section.getId(),
                faculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.TUESDAY, "09:00", "10:00")
        ));

        ScheduleResponse conflictingDraft = scheduleService.create(request(
                otherSection.getId(),
                otherFaculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.TUESDAY, "09:30", "10:30")
        ));
        assertThatThrownBy(() -> scheduleService.activate(conflictingDraft.id(),
                new ScheduleLifecycleRequest(conflictingDraft.version(), null, false, List.of()), null))
                .hasMessageContaining("ROOM conflict");
    }

    @Test
    void backToBackMeetingsAreAllowed() {
        activate(request(
                section.getId(),
                faculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.WEDNESDAY, "09:00", "10:00")
        ));

        ScheduleResponse response = activate(request(
                otherSection.getId(),
                otherFaculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.WEDNESDAY, "10:00", "11:00")
        ));

        assertThat(response.id()).isNotNull();
    }

    @Test
    void draftUpdatePreservesScheduleIdentity() {
        ScheduleResponse existing = scheduleService.create(request(
                section.getId(),
                faculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.THURSDAY, "13:00", "14:30")
        ));

        ScheduleResponse updated = scheduleService.update(existing.id(), request(
                section.getId(),
                faculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.THURSDAY, "13:00", "14:30")
        ));

        assertThat(updated.id()).isEqualTo(existing.id());
        assertThat(updated.status()).isEqualTo(ScheduleStatus.DRAFT);
    }

    @Test
    void invalidTimeRangeIsRejected() {
        assertThatThrownBy(() -> scheduleService.create(request(
                section.getId(),
                faculty.getId(),
                room.getId(),
                ScheduleStatus.DRAFT,
                meeting(DayOfWeek.FRIDAY, "15:00", "15:00")
        )))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Meeting end time must be after start time");
    }

    @Test
    void createRejectsNonDraftStatus() {
        assertThatThrownBy(() -> scheduleService.create(request(section.getId(), faculty.getId(), room.getId(),
                ScheduleStatus.ACTIVE, meeting(DayOfWeek.MONDAY, "08:00", "09:00"))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("lifecycle endpoints");
    }

    @Test
    void activationRejectsStaleVersionAndSectionCapacityOverflow() {
        ScheduleResponse draft = scheduleService.create(request(section.getId(), faculty.getId(), room.getId(),
                ScheduleStatus.DRAFT, meeting(DayOfWeek.SUNDAY, "08:00", "09:00")));
        assertThatThrownBy(() -> scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version() + 1, null, false, List.of()), null))
                .hasMessageContaining("changed");

        section.setMaximumCapacity(20);
        sectionRepository.save(section);
        assertThatThrownBy(() -> scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version(), null, false, List.of()), null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("section maximum capacity");
    }

    @Test
    void onlineSundayMeetingNeedsNoRoomAndClearsLegacyRoom() {
        ScheduleMeetingRequest online = new ScheduleMeetingRequest(DayOfWeek.SUNDAY, LocalTime.parse("18:00"),
                LocalTime.parse("19:00"), ScheduleComponentType.LECTURE, ScheduleDeliveryMode.ONLINE, null, "LMS Room 1");
        ScheduleResponse draft = scheduleService.create(new ScheduleRequest(section.getId(), course.getId(), faculty.getId(),
                null, 40, ScheduleStatus.DRAFT, List.of(online)));
        ScheduleResponse active = scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version(), null, false, List.of()), null);

        assertThat(active.roomId()).isNull();
        assertThat(active.meetings().getFirst().dayOfWeek()).isEqualTo(DayOfWeek.SUNDAY);
        assertThat(active.meetings().getFirst().deliveryMode()).isEqualTo(ScheduleDeliveryMode.ONLINE);
    }

    @Test
    void intraRequestOverlapAndDuplicateOfferingAreRejected() {
        ScheduleMeetingRequest first = meeting(DayOfWeek.MONDAY, "08:00", "10:00");
        ScheduleMeetingRequest second = meeting(DayOfWeek.MONDAY, "09:00", "11:00");
        assertThatThrownBy(() -> scheduleService.create(new ScheduleRequest(section.getId(), course.getId(), faculty.getId(),
                room.getId(), 40, ScheduleStatus.DRAFT, List.of(first, second))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cannot overlap");

        scheduleService.create(request(section.getId(), faculty.getId(), room.getId(), ScheduleStatus.DRAFT,
                meeting(DayOfWeek.MONDAY, "08:00", "09:00")));
        assertThatThrownBy(() -> scheduleService.create(request(section.getId(), faculty.getId(), otherRoom.getId(),
                ScheduleStatus.DRAFT, meeting(DayOfWeek.TUESDAY, "08:00", "09:00"))))
                .hasMessageContaining("offering already exists");
    }

    @Test
    void activeRevisionRetiresOldMeetingsAndRecordsReason() {
        ScheduleResponse active = activate(request(section.getId(), faculty.getId(), room.getId(), ScheduleStatus.DRAFT,
                meeting(DayOfWeek.WEDNESDAY, "08:00", "09:00")));
        ScheduleRevisionRequest revision = new ScheduleRevisionRequest(active.version(), "Move to laboratory",
                faculty.getId(), 40, List.of(new ScheduleMeetingRequest(DayOfWeek.THURSDAY, LocalTime.parse("10:00"),
                LocalTime.parse("12:00"), ScheduleComponentType.LABORATORY, ScheduleDeliveryMode.ONSITE,
                otherRoom.getId(), null)), false, List.of());

        ScheduleResponse revised = scheduleService.revise(active.id(), revision, null);
        List<ScheduleMeeting> stored = scheduleMeetingRepository.findAll().stream()
                .filter(item -> item.getClassSchedule().getId().equals(active.id())).toList();

        assertThat(revised.id()).isEqualTo(active.id());
        assertThat(revised.version()).isGreaterThan(active.version());
        assertThat(revised.meetings()).hasSize(1);
        assertThat(revised.meetings().getFirst().revisionNumber()).isEqualTo(2);
        assertThat(stored).hasSize(2);
        assertThat(stored).filteredOn(item -> !item.isActive()).hasSize(1);
        assertThat(scheduleService.history(active.id(), null)).extracting("reason").contains("Move to laboratory");
        assertThatThrownBy(() -> scheduleService.revise(active.id(), revision, null))
                .hasMessageContaining("changed");
    }

    @Test
    void overloadWarningRequiresAcknowledgementAndReason() {
        ScheduleLoadPolicy policy = new ScheduleLoadPolicy();
        policy.setSchoolYear(schoolYear);
        policy.setSemester(semester);
        policy.setMaximumWeeklyContactHours(new BigDecimal("0.50"));
        policy.setActive(true);
        loadPolicyRepository.save(policy);
        ScheduleResponse draft = scheduleService.create(request(section.getId(), faculty.getId(), room.getId(),
                ScheduleStatus.DRAFT, meeting(DayOfWeek.FRIDAY, "08:00", "09:00")));

        assertThat(draft.warnings()).extracting("code").contains("FACULTY_LOAD_WARNING");
        assertThatThrownBy(() -> scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version(), null, false, List.of()), null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("must be acknowledged");

        ScheduleResponse active = scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version(), "Registrar-approved overload", true,
                        List.of("FACULTY_LOAD_WARNING")), null);
        assertThat(active.status()).isEqualTo(ScheduleStatus.ACTIVE);
        assertThat(scheduleService.history(active.id(), null).getFirst().acknowledgedWarnings())
                .contains("FACULTY_LOAD_WARNING");
    }

    @Test
    void facultyReadScopeReturnsOnlyAssignedSchedules() {
        activate(request(section.getId(), faculty.getId(), room.getId(), ScheduleStatus.DRAFT,
                meeting(DayOfWeek.MONDAY, "08:00", "09:00")));
        activate(request(otherSection.getId(), otherFaculty.getId(), otherRoom.getId(), ScheduleStatus.DRAFT,
                meeting(DayOfWeek.TUESDAY, "08:00", "09:00")));
        com.school.sis.auth.security.SisUserDetails principal = mock(com.school.sis.auth.security.SisUserDetails.class);
        when(principal.facultyId()).thenReturn(faculty.getId());
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_FACULTY"))).when(principal).getAuthorities();

        var result = scheduleService.list(null, PageRequest.of(0, 20), principal);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().facultyId()).isEqualTo(faculty.getId());
    }

    @Test
    void activeRoomCannotBeDeactivated() {
        activate(request(section.getId(), faculty.getId(), room.getId(), ScheduleStatus.DRAFT,
                meeting(DayOfWeek.MONDAY, "08:00", "09:00")));

        assertThatThrownBy(() -> roomService.updateStatus(room.getId(), ActiveStatus.INACTIVE))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("active schedule");
    }

    @Test
    void termCopyPreviewsAndCreatesAllSelectedDrafts() {
        ScheduleResponse source = activate(request(section.getId(), faculty.getId(), room.getId(), ScheduleStatus.DRAFT,
                meeting(DayOfWeek.SATURDAY, "08:00", "10:00")));
        SchoolYear targetYear = new SchoolYear();
        targetYear.setSchoolYear("2027-" + UUID.randomUUID().toString().substring(0, 6));
        targetYear.setActive(false);
        targetYear = schoolYearRepository.save(targetYear);
        Section target = new Section();
        target.setSectionCode(section.getSectionCode());
        target.setProgram(section.getProgram());
        target.setCurriculum(curriculum);
        target.setSchoolYear(targetYear);
        target.setSemester(semester);
        target.setYearLevel(1);
        target.setMaximumCapacity(40);
        target.setStatus(ActiveStatus.ACTIVE);
        sectionRepository.save(target);
        ScheduleCopyTermRequest copyRequest = new ScheduleCopyTermRequest(schoolYear.getId(), semester.getId(),
                targetYear.getId(), semester.getId(), List.of(source.id()));

        assertThat(scheduleService.previewCopy(copyRequest).executable()).isTrue();
        var result = scheduleService.copyTerm(copyRequest);

        assertThat(result.createdCount()).isEqualTo(1);
        assertThat(scheduleService.get(result.createdScheduleIds().getFirst()).status()).isEqualTo(ScheduleStatus.DRAFT);
        assertThat(scheduleService.previewCopy(copyRequest).executable()).isFalse();
    }

    private ScheduleRequest request(UUID sectionId, UUID facultyId, UUID roomId, ScheduleStatus status, ScheduleMeetingRequest meeting) {
        return new ScheduleRequest(
                sectionId,
                course.getId(),
                facultyId,
                roomId,
                40,
                status,
                List.of(meeting)
        );
    }

    private ScheduleMeetingRequest meeting(DayOfWeek dayOfWeek, String startTime, String endTime) {
        return new ScheduleMeetingRequest(dayOfWeek, LocalTime.parse(startTime), LocalTime.parse(endTime));
    }

    private ScheduleResponse activate(ScheduleRequest request) {
        ScheduleResponse draft = scheduleService.create(request);
        return scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version(), null, false, List.of()), null);
    }

    private Faculty faculty(String employeeNumber, String firstName, String lastName, Department department) {
        Faculty faculty = new Faculty();
        faculty.setEmployeeNumber(employeeNumber);
        faculty.setFirstName(firstName);
        faculty.setLastName(lastName);
        faculty.setEmail(employeeNumber.toLowerCase() + "@sis.local");
        faculty.setDepartment(department);
        faculty.setEmploymentStatus(EmploymentStatus.FULL_TIME);
        faculty.setFacultyType(FacultyType.INSTRUCTOR);
        faculty.setStatus(ActiveStatus.ACTIVE);
        return facultyRepository.save(faculty);
    }

    private Room room(String roomCode) {
        Room room = new Room();
        room.setRoomCode(roomCode);
        room.setRoomName(roomCode + " Room");
        room.setCapacity(40);
        room.setRoomType("GENERAL");
        room.setStatus(ActiveStatus.ACTIVE);
        return roomRepository.save(room);
    }

    private Section section(String sectionCode, Program program) {
        Section section = new Section();
        section.setSectionCode(sectionCode);
        section.setProgram(program);
        section.setCurriculum(curriculum);
        section.setSchoolYear(schoolYear);
        section.setSemester(semester);
        section.setYearLevel(1);
        section.setMaximumCapacity(40);
        section.setStatus(ActiveStatus.ACTIVE);
        return sectionRepository.save(section);
    }
}
