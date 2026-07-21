package com.school.sis;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true"})
class PostgresMigrationTests {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;

    @Test void allMigrationsApplyAndHibernateValidates() {
        Integer count = jdbc.queryForObject("select count(*) from flyway_schema_history where success", Integer.class);
        String latest = jdbc.queryForObject("select version from flyway_schema_history order by installed_rank desc limit 1", String.class);
        assertThat(count).isEqualTo(22);
        assertThat(latest).isEqualTo("22");

        Integer evaluationTables = jdbc.queryForObject("""
                select count(*) from information_schema.tables
                where table_schema='public' and table_name in (
                  'academic_evaluation_cases','academic_evaluation_source_courses','academic_evaluation_matches',
                  'student_course_credits','enrollment_eligibility_policies','graduation_audits')
                """, Integer.class);
        assertThat(evaluationTables).isEqualTo(6);

        Integer schedulingTables = jdbc.queryForObject("""
                select count(*) from information_schema.tables
                where table_schema='public' and table_name in (
                  'schedule_change_history','schedule_resource_reservations','schedule_load_policies')
                """, Integer.class);
        assertThat(schedulingTables).isEqualTo(3);

        Integer schedulingPermissions = jdbc.queryForObject("""
                select count(*) from permissions
                where name in ('SCHEDULE_REVISE','SCHEDULE_POLICY_MANAGE','SCHEDULE_OVERRIDE')
                """, Integer.class);
        assertThat(schedulingPermissions).isEqualTo(3);

        Integer unauthorizedScheduleMutationGrants = jdbc.queryForObject("""
                select count(*) from role_permissions rp join roles r on r.id=rp.role_id
                join permissions p on p.id=rp.permission_id
                where r.name not in ('SUPER_ADMIN','REGISTRAR')
                  and p.name in ('SCHEDULE_MANAGE','SCHEDULE_REVISE','SCHEDULE_POLICY_MANAGE','SCHEDULE_OVERRIDE')
                """, Integer.class);
        assertThat(unauthorizedScheduleMutationGrants).isZero();

        Integer removedAcademicEnrollmentGrants = jdbc.queryForObject("""
                select count(*) from role_permissions rp join roles r on r.id=rp.role_id
                join permissions p on p.id=rp.permission_id
                where r.name in ('DEAN','PROGRAM_HEAD','FACULTY') and p.name='ENROLLMENT_VIEW'
                """, Integer.class);
        assertThat(removedAcademicEnrollmentGrants).isZero();

        Integer financeManager = jdbc.queryForObject("select count(*) from roles where name='FINANCE_MANAGER'", Integer.class);
        Integer financePermissions = jdbc.queryForObject("select count(*) from permissions where name like 'FINANCE_%'", Integer.class);
        assertThat(financeManager).isEqualTo(1);
        assertThat(financePermissions).isGreaterThanOrEqualTo(14);

        Integer seededFees = jdbc.queryForObject("select count(*) from fee_items", Integer.class);
        Integer financeTransactions = jdbc.queryForObject("select count(*) from assessments", Integer.class);
        assertThat(seededFees).isEqualTo(15);
        assertThat(financeTransactions).isZero();

        jdbc.update("insert into departments(id,department_code,department_name,status) values (?::uuid,?,?,?)",
                "10000000-0000-0000-0000-000000000001", "ACCOUNT-TEST", "Account Test", "ACTIVE");
        jdbc.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status)
                values (?::uuid,?,?,?,?,?::uuid,?,?,?)
                """, "10000000-0000-0000-0000-000000000002", "ACCOUNT-1", "Account", "Faculty", "account-faculty@example.edu",
                "10000000-0000-0000-0000-000000000001", "FULL_TIME", "INSTRUCTOR", "ACTIVE");
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active,faculty_id) values (?::uuid,?,?,?,?,?,?::uuid)",
                "10000000-0000-0000-0000-000000000003", "account-one@example.edu", "account-one", "hash", "Account One", true,
                "10000000-0000-0000-0000-000000000002");
        assertThatThrownBy(() -> jdbc.update("insert into users(id,email,username,password_hash,full_name,active,faculty_id) values (?::uuid,?,?,?,?,?,?::uuid)",
                "10000000-0000-0000-0000-000000000004", "account-two@example.edu", "account-two", "hash", "Account Two", true,
                "10000000-0000-0000-0000-000000000002"))
                .hasMessageContaining("uq_users_faculty_id");
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active) values (?::uuid,?,?,?,?,?)",
                "10000000-0000-0000-0000-000000000005", "unlinked-one@example.edu", "unlinked-one", "hash", "Unlinked One", true);
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active) values (?::uuid,?,?,?,?,?)",
                "10000000-0000-0000-0000-000000000006", "unlinked-two@example.edu", "unlinked-two", "hash", "Unlinked Two", true);
    }

    @Test void upgradesRepresentativeV20SchedulingDataWithoutChangingScheduleIdentity() {
        String schema = "scheduling_upgrade_v20";
        String schemaUrl = postgres.getJdbcUrl() + (postgres.getJdbcUrl().contains("?") ? "&" : "?")
                + "currentSchema=" + schema + ",public";
        DriverManagerDataSource upgradeDataSource = new DriverManagerDataSource(
                schemaUrl, postgres.getUsername(), postgres.getPassword());

        Flyway.configure()
                .dataSource(upgradeDataSource)
                .schemas(schema)
                .defaultSchema(schema)
                .target(MigrationVersion.fromVersion("20"))
                .load()
                .migrate();

        JdbcTemplate upgrade = new JdbcTemplate(upgradeDataSource);
        seedRepresentativeV20Schedule(upgrade);

        Flyway.configure()
                .dataSource(upgradeDataSource)
                .schemas(schema)
                .defaultSchema(schema)
                .target(MigrationVersion.LATEST)
                .load()
                .migrate();

        assertThat(upgrade.queryForObject("select version from class_schedules where id=?::uuid", Long.class,
                "20000000-0000-0000-0000-000000000009")).isZero();
        assertThat(upgrade.queryForObject("select room_id::text from class_schedules where id=?::uuid", String.class,
                "20000000-0000-0000-0000-000000000009"))
                .isEqualTo("20000000-0000-0000-0000-000000000006");
        assertThat(upgrade.queryForObject("select maximum_capacity from sections where id=?::uuid", Integer.class,
                "20000000-0000-0000-0000-000000000008")).isEqualTo(40);
        assertThat(upgrade.queryForObject("select maximum_capacity from sections where id=?::uuid", Integer.class,
                "20000000-0000-0000-0000-000000000011")).isNull();
        assertThat(upgrade.queryForMap("""
                select room_id::text as room_id, component_type, delivery_mode, revision_number, active
                from schedule_meetings where id=?::uuid
                """, "20000000-0000-0000-0000-000000000010"))
                .containsEntry("room_id", "20000000-0000-0000-0000-000000000006")
                .containsEntry("component_type", "COMBINED")
                .containsEntry("delivery_mode", "ONSITE")
                .containsEntry("revision_number", 1)
                .containsEntry("active", true);

        assertThatThrownBy(() -> upgrade.update("""
                insert into class_schedules(id,section_id,course_id,faculty_id,room_id,school_year_id,semester_id,capacity,status)
                values (?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?,?)
                """, "20000000-0000-0000-0000-000000000012", "20000000-0000-0000-0000-000000000008",
                "20000000-0000-0000-0000-000000000003", "20000000-0000-0000-0000-000000000007",
                "20000000-0000-0000-0000-000000000006", "20000000-0000-0000-0000-000000000004",
                "20000000-0000-0000-0000-000000000005", 40, "DRAFT"))
                .hasMessageContaining("ux_schedule_offering_open");
    }

    @Test void competingResourceReservationsProduceExactlyOneSuccess() throws Exception {
        ReservationRaceFixture fixture = seedReservationRaceFixture();
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = executor.submit(() -> insertCompetingReservation(
                    fixture.firstScheduleId(), fixture.firstMeetingId(), fixture, ready, start, successes, conflicts));
            Future<?> second = executor.submit(() -> insertCompetingReservation(
                    fixture.secondScheduleId(), fixture.secondMeetingId(), fixture, ready, start, successes, conflicts));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(successes).hasValue(1);
        assertThat(conflicts).hasValue(1);
        assertThat(jdbc.queryForObject("""
                select count(*) from schedule_resource_reservations
                where resource_type='ROOM' and resource_id=?::uuid and day_of_week='MONDAY'
                """, Integer.class, fixture.roomId())).isEqualTo(1);
    }

    private void seedRepresentativeV20Schedule(JdbcTemplate target) {
        target.update("insert into departments(id,department_code,department_name,status) values (?::uuid,?,?,?)",
                "20000000-0000-0000-0000-000000000001", "UPGRADE", "Upgrade Department", "ACTIVE");
        target.update("""
                insert into programs(id,program_code,program_name,department_id,degree_type,status)
                values (?::uuid,?,?,?::uuid,?,?)
                """, "20000000-0000-0000-0000-000000000002", "UPGRADE-P", "Upgrade Program",
                "20000000-0000-0000-0000-000000000001", "BACHELOR", "ACTIVE");
        target.update("""
                insert into courses(id,course_code,course_title,lecture_hours_per_week,laboratory_hours_per_week,
                  credit_units,course_type,department_id,status)
                values (?::uuid,?,?,?,?,?,?,?::uuid,?)
                """, "20000000-0000-0000-0000-000000000003", "UPGRADE-101", "Upgrade Course",
                2, 1, 3, "MAJOR", "20000000-0000-0000-0000-000000000001", "ACTIVE");
        target.update("insert into school_years(id,school_year,active) values (?::uuid,?,?)",
                "20000000-0000-0000-0000-000000000004", "2098-2099", true);
        target.update("insert into semesters(id,name,sort_order,active) values (?::uuid,?,?,?)",
                "20000000-0000-0000-0000-000000000005", "Upgrade Semester", 99, true);
        target.update("insert into rooms(id,room_code,room_name,capacity,status) values (?::uuid,?,?,?,?)",
                "20000000-0000-0000-0000-000000000006", "UPGRADE-R", "Upgrade Room", 40, "ACTIVE");
        target.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status)
                values (?::uuid,?,?,?,?,?::uuid,?,?,?)
                """, "20000000-0000-0000-0000-000000000007", "UPGRADE-F", "Upgrade", "Faculty",
                "upgrade-faculty@example.edu", "20000000-0000-0000-0000-000000000001", "FULL_TIME", "INSTRUCTOR", "ACTIVE");
        target.update("""
                insert into sections(id,section_code,program_id,school_year_id,semester_id,year_level,status)
                values (?::uuid,?,?::uuid,?::uuid,?::uuid,?,?)
                """, "20000000-0000-0000-0000-000000000008", "UPGRADE-A",
                "20000000-0000-0000-0000-000000000002", "20000000-0000-0000-0000-000000000004",
                "20000000-0000-0000-0000-000000000005", 1, "ACTIVE");
        target.update("""
                insert into sections(id,section_code,program_id,school_year_id,semester_id,year_level,status)
                values (?::uuid,?,?::uuid,?::uuid,?::uuid,?,?)
                """, "20000000-0000-0000-0000-000000000011", "UPGRADE-UNUSED",
                "20000000-0000-0000-0000-000000000002", "20000000-0000-0000-0000-000000000004",
                "20000000-0000-0000-0000-000000000005", 1, "ACTIVE");
        target.update("""
                insert into class_schedules(id,section_id,course_id,faculty_id,room_id,school_year_id,semester_id,capacity,status)
                values (?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?::uuid,?,?)
                """, "20000000-0000-0000-0000-000000000009", "20000000-0000-0000-0000-000000000008",
                "20000000-0000-0000-0000-000000000003", "20000000-0000-0000-0000-000000000007",
                "20000000-0000-0000-0000-000000000006", "20000000-0000-0000-0000-000000000004",
                "20000000-0000-0000-0000-000000000005", 40, "ACTIVE");
        target.update("""
                insert into schedule_meetings(id,class_schedule_id,day_of_week,start_time,end_time)
                values (?::uuid,?::uuid,?,?::time,?::time)
                """, "20000000-0000-0000-0000-000000000010", "20000000-0000-0000-0000-000000000009",
                "SUNDAY", "09:00:00", "11:00:00");
    }

    private ReservationRaceFixture seedReservationRaceFixture() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID department = UUID.randomUUID();
        UUID program = UUID.randomUUID();
        UUID course = UUID.randomUUID();
        UUID schoolYear = UUID.randomUUID();
        UUID semester = UUID.randomUUID();
        UUID room = UUID.randomUUID();
        UUID firstFaculty = UUID.randomUUID();
        UUID secondFaculty = UUID.randomUUID();
        UUID firstSection = UUID.randomUUID();
        UUID secondSection = UUID.randomUUID();
        UUID firstSchedule = UUID.randomUUID();
        UUID secondSchedule = UUID.randomUUID();
        UUID firstMeeting = UUID.randomUUID();
        UUID secondMeeting = UUID.randomUUID();

        jdbc.update("insert into departments(id,department_code,department_name,status) values (?,?,?,?)",
                department, "RACE-" + suffix, "Race " + suffix, "ACTIVE");
        jdbc.update("insert into programs(id,program_code,program_name,department_id,degree_type,status) values (?,?,?,?,?,?)",
                program, "RP-" + suffix, "Race Program", department, "BACHELOR", "ACTIVE");
        jdbc.update("""
                insert into courses(id,course_code,course_title,lecture_hours_per_week,laboratory_hours_per_week,
                  credit_units,course_type,department_id,status) values (?,?,?,?,?,?,?,?,?)
                """, course, "RC-" + suffix, "Race Course", 3, 0, 3, "MAJOR", department, "ACTIVE");
        jdbc.update("insert into school_years(id,school_year,active) values (?,?,?)", schoolYear, "20" + suffix, true);
        jdbc.update("insert into semesters(id,name,sort_order,active) values (?,?,?,?)",
                semester, "Race " + suffix, 100, true);
        jdbc.update("insert into rooms(id,room_code,room_name,capacity,status,room_type) values (?,?,?,?,?,?)",
                room, "RR-" + suffix, "Race Room", 50, "ACTIVE", "LECTURE");
        jdbc.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status)
                values (?,?,?,?,?,?,?,?,?)
                """, firstFaculty, "RF1-" + suffix, "First", "Faculty", "rf1-" + suffix + "@example.edu",
                department, "FULL_TIME", "INSTRUCTOR", "ACTIVE");
        jdbc.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status)
                values (?,?,?,?,?,?,?,?,?)
                """, secondFaculty, "RF2-" + suffix, "Second", "Faculty", "rf2-" + suffix + "@example.edu",
                department, "FULL_TIME", "INSTRUCTOR", "ACTIVE");
        jdbc.update("""
                insert into sections(id,section_code,program_id,school_year_id,semester_id,year_level,status,maximum_capacity)
                values (?,?,?,?,?,?,?,?)
                """, firstSection, "RS1-" + suffix, program, schoolYear, semester, 1, "ACTIVE", 50);
        jdbc.update("""
                insert into sections(id,section_code,program_id,school_year_id,semester_id,year_level,status,maximum_capacity)
                values (?,?,?,?,?,?,?,?)
                """, secondSection, "RS2-" + suffix, program, schoolYear, semester, 1, "ACTIVE", 50);
        jdbc.update("""
                insert into class_schedules(id,section_id,course_id,faculty_id,school_year_id,semester_id,capacity,status)
                values (?,?,?,?,?,?,?,?)
                """, firstSchedule, firstSection, course, firstFaculty, schoolYear, semester, 50, "ACTIVE");
        jdbc.update("""
                insert into class_schedules(id,section_id,course_id,faculty_id,school_year_id,semester_id,capacity,status)
                values (?,?,?,?,?,?,?,?)
                """, secondSchedule, secondSection, course, secondFaculty, schoolYear, semester, 50, "ACTIVE");
        jdbc.update("""
                insert into schedule_meetings(id,class_schedule_id,day_of_week,start_time,end_time,room_id,component_type,delivery_mode)
                values (?,?,?,?::time,?::time,?,?,?)
                """, firstMeeting, firstSchedule, "MONDAY", "08:00:00", "10:00:00", room, "LECTURE", "ONSITE");
        jdbc.update("""
                insert into schedule_meetings(id,class_schedule_id,day_of_week,start_time,end_time,room_id,component_type,delivery_mode)
                values (?,?,?,?::time,?::time,?,?,?)
                """, secondMeeting, secondSchedule, "MONDAY", "08:30:00", "09:30:00", room, "LECTURE", "ONSITE");
        return new ReservationRaceFixture(firstSchedule, secondSchedule, firstMeeting, secondMeeting, schoolYear, semester, room);
    }

    private void insertCompetingReservation(UUID scheduleId, UUID meetingId, ReservationRaceFixture fixture,
                                             CountDownLatch ready, CountDownLatch start,
                                             AtomicInteger successes, AtomicInteger conflicts) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            ready.countDown();
            start.await(5, TimeUnit.SECONDS);
            try (PreparedStatement statement = connection.prepareStatement("""
                    insert into schedule_resource_reservations(
                      schedule_id,meeting_id,school_year_id,semester_id,day_of_week,resource_type,resource_id,start_time,end_time)
                    values (?,?,?,?,?,'ROOM',?,?,?)
                    """)) {
                statement.setObject(1, scheduleId);
                statement.setObject(2, meetingId);
                statement.setObject(3, fixture.schoolYearId());
                statement.setObject(4, fixture.semesterId());
                statement.setString(5, "MONDAY");
                statement.setObject(6, fixture.roomId());
                statement.setObject(7, java.sql.Time.valueOf("08:15:00"));
                statement.setObject(8, java.sql.Time.valueOf("09:45:00"));
                statement.executeUpdate();
                connection.commit();
                successes.incrementAndGet();
            } catch (SQLException expectedConflict) {
                connection.rollback();
                conflicts.incrementAndGet();
            }
        } catch (Exception unexpected) {
            throw new RuntimeException(unexpected);
        }
    }

    private record ReservationRaceFixture(UUID firstScheduleId, UUID secondScheduleId,
                                          UUID firstMeetingId, UUID secondMeetingId,
                                          UUID schoolYearId, UUID semesterId, UUID roomId) {}
}
