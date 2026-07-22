package com.school.sis.auth.service;

import com.school.sis.auth.repository.RoleRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.common.exception.ConflictException;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.student.entity.Student;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class LinkedIdentitySyncService {
    private final UserRepository users;
    private final RoleRepository roles;

    public LinkedIdentitySyncService(UserRepository users, RoleRepository roles) {
        this.users = users; this.roles = roles;
    }

    @Transactional
    public void synchronizeFaculty(Faculty faculty) {
        users.findByFacultyId(faculty.getId()).ifPresent(user -> {
            String email = normalize(faculty.getEmail());
            ensureEmailAvailable(email, user.getId());
            user.setEmail(email);
            user.setFullName(name(faculty.getFirstName(), faculty.getMiddleName(), faculty.getLastName(), faculty.getSuffix()));
        });
    }

    @Transactional
    public void synchronizeStudent(Student student) {
        users.findByStudentId(student.getId()).ifPresent(user -> {
            String email = student.getContact() == null ? null : normalize(student.getContact().getEmailAddress());
            if (email == null || email.isBlank()) {
                throw new ConflictException("DOMAIN_EMAIL_REQUIRED", "Student contact email is required for account synchronization");
            }
            ensureEmailAvailable(email, user.getId());
            String username = normalize(student.getStudentNumber());
            if (users.existsByUsernameIgnoreCaseAndIdNot(username, user.getId())) {
                throw new ConflictException("IDENTITY_USERNAME_CONFLICT", "Student number belongs to another account");
            }
            user.setUsername(username);
            user.setEmail(email);
            user.setFullName(name(student.getFirstName(), student.getMiddleName(), student.getLastName(), student.getSuffix()));
            var studentRole = roles.findByName("STUDENT")
                    .orElseThrow(() -> new IllegalStateException("STUDENT role is not configured"));
            user.getRoles().add(studentRole);
        });
    }

    private void ensureEmailAvailable(String email, java.util.UUID currentId) {
        users.findByEmailIgnoreCase(email).filter(other -> !other.getId().equals(currentId)).ifPresent(other -> {
            throw new ConflictException("IDENTITY_EMAIL_CONFLICT",
                    "The domain email belongs to another account and must be resolved first");
        });
    }

    private String name(String... values) {
        return Arrays.stream(values).filter(value -> value != null && !value.isBlank()).collect(Collectors.joining(" "));
    }
    private String normalize(String value) { return value == null ? null : value.trim().toLowerCase(Locale.ROOT); }
}
