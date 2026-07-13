package com.school.sis.student.portal;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StudentPortalAccessTests {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final StudentPortalAccess access = new StudentPortalAccess(jdbc);
    private final SisUserDetails principal = mock(SisUserDetails.class);

    @Test
    void requiresLinkedStudentAndCompletedInitialPasswordChange() {
        assertThrows(BusinessRuleException.class, () -> access.studentId(principal));

        when(principal.studentId()).thenReturn(UUID.randomUUID());
        when(principal.mustChangePassword()).thenReturn(true);
        assertThrows(BusinessRuleException.class, () -> access.studentId(principal));
    }

    @Test
    void rejectsArchivedStudentAccounts() {
        UUID studentId = UUID.randomUUID();
        when(principal.studentId()).thenReturn(studentId);
        when(jdbc.queryForObject(
                "select count(*) from students where id=? and status<>'ARCHIVED'",
                Integer.class, studentId)).thenReturn(0);

        assertThrows(BusinessRuleException.class, () -> access.studentId(principal));
    }

    @Test
    void rejectsAnotherStudentsEnrollmentAndRequest() {
        UUID studentId = UUID.randomUUID(), enrollmentId = UUID.randomUUID(), requestId = UUID.randomUUID();
        when(principal.studentId()).thenReturn(studentId);
        when(jdbc.queryForObject(
                "select count(*) from students where id=? and status<>'ARCHIVED'",
                Integer.class, studentId)).thenReturn(1);
        when(jdbc.queryForObject(
                "select count(*) from enrollments where id=? and student_id=?",
                Integer.class, enrollmentId, studentId)).thenReturn(0);
        when(jdbc.queryForObject(
                "select count(*) from student_service_requests where id=? and student_id=?",
                Integer.class, requestId, studentId)).thenReturn(0);

        assertThrows(BusinessRuleException.class, () -> access.enrollment(enrollmentId, principal));
        assertThrows(BusinessRuleException.class, () -> access.request(requestId, principal));
    }

    @Test
    void permitsTheLinkedStudentsOwnRecords() {
        UUID studentId = UUID.randomUUID(), enrollmentId = UUID.randomUUID(), requestId = UUID.randomUUID();
        when(principal.studentId()).thenReturn(studentId);
        when(jdbc.queryForObject(
                "select count(*) from students where id=? and status<>'ARCHIVED'",
                Integer.class, studentId)).thenReturn(1);
        when(jdbc.queryForObject(
                "select count(*) from enrollments where id=? and student_id=?",
                Integer.class, enrollmentId, studentId)).thenReturn(1);
        when(jdbc.queryForObject(
                "select count(*) from student_service_requests where id=? and student_id=?",
                Integer.class, requestId, studentId)).thenReturn(1);

        assertDoesNotThrow(() -> access.enrollment(enrollmentId, principal));
        assertDoesNotThrow(() -> access.request(requestId, principal));
    }
}
