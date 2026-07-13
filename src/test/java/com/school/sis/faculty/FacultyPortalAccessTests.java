package com.school.sis.faculty;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FacultyPortalAccessTests {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final FacultyPortalAccess access = new FacultyPortalAccess(jdbc);
    private final SisUserDetails principal = mock(SisUserDetails.class);

    @Test
    void rejectsAccountWithoutLinkedFacultyProfile() {
        assertThrows(BusinessRuleException.class, () -> access.facultyId(principal));
    }

    @Test
    void rejectsClassOwnedByAnotherFacultyMember() {
        UUID facultyId = UUID.randomUUID();
        UUID scheduleId = UUID.randomUUID();
        when(principal.facultyId()).thenReturn(facultyId);
        when(jdbc.queryForObject(
                "select count(*) from class_schedules where id=? and faculty_id=?",
                Integer.class, scheduleId, facultyId)).thenReturn(0);

        assertThrows(BusinessRuleException.class, () -> access.assigned(scheduleId, principal));
    }

    @Test
    void permitsOnlyTheLinkedFacultysAssignedClass() {
        UUID facultyId = UUID.randomUUID();
        UUID scheduleId = UUID.randomUUID();
        when(principal.facultyId()).thenReturn(facultyId);
        when(jdbc.queryForObject(
                "select count(*) from class_schedules where id=? and faculty_id=?",
                Integer.class, scheduleId, facultyId)).thenReturn(1);

        assertDoesNotThrow(() -> access.assigned(scheduleId, principal));
    }
}
