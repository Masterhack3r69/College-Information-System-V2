package com.school.sis.auth;

import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.Role;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.RoleRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.service.StudentAccountProvisioningService;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.student.entity.Student;
import com.school.sis.student.entity.StudentContact;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentAccountProvisioningServiceTests {
    private final UserRepository users = mock(UserRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final AuditService audit = mock(AuditService.class);
    private final StudentAccountProvisioningService service =
            new StudentAccountProvisioningService(users, roles, passwords, audit, true);

    @Test
    void createsAForcedChangeStudentAccountUsingTheStudentNumber() {
        Student student = student("2026-0100", "student@example.edu");
        Role role = mock(Role.class);
        when(roles.findByName("STUDENT")).thenReturn(Optional.of(role));
        when(passwords.encode("2026-0100")).thenReturn("encoded");

        var result = service.provision(student);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertTrue(result.created());
        assertEquals("2026-0100", result.username());
        assertEquals("2026-0100", result.initialPassword());
        assertEquals(student, saved.getValue().getStudent());
        assertTrue(saved.getValue().isMustChangePassword());
        assertTrue(saved.getValue().getRoles().contains(role));
    }

    @Test
    void isIdempotentForAnExistingLinkedAccount() {
        Student student = student("2026-0101", "student2@example.edu");
        User existing = new User();
        existing.setUsername("2026-0101");
        when(users.findByStudentId(student.getId())).thenReturn(Optional.of(existing));

        var result = service.provision(student);

        assertFalse(result.created());
        assertNull(result.initialPassword());
        verify(users, never()).save(any());
    }

    @Test
    void rejectsMissingOrDuplicateLoginIdentitiesBeforeSaving() {
        Student missingEmail = student("2026-0102", null);
        assertThrows(BusinessRuleException.class, () -> service.provision(missingEmail));

        Student duplicateEmail = student("2026-0103", "used@example.edu");
        when(users.findByEmailIgnoreCaseOrUsernameIgnoreCase("used@example.edu", "used@example.edu"))
                .thenReturn(Optional.of(new User()));
        assertThrows(BusinessRuleException.class, () -> service.provision(duplicateEmail));
        verify(users, never()).save(any());
    }

    private Student student(String number, String email) {
        Student student = new Student();
        student.setStudentNumber(number);
        student.setFirstName("Ana");
        student.setLastName("Reyes");
        StudentContact contact = new StudentContact();
        contact.setStudent(student);
        contact.setEmailAddress(email);
        student.setContact(contact);
        return student;
    }
}
