package com.school.sis.auth.dto;

import com.school.sis.setup.entity.ActiveStatus;
import com.school.sis.setup.entity.Faculty;

import java.util.UUID;

public record FacultyAccountOptionResponse(
        UUID id,
        String employeeNumber,
        String fullName,
        String email,
        ActiveStatus status
) {
    public static FacultyAccountOptionResponse from(Faculty faculty) {
        String fullName = (faculty.getFirstName() + " " + faculty.getLastName()).trim();
        return new FacultyAccountOptionResponse(
                faculty.getId(),
                faculty.getEmployeeNumber(),
                fullName,
                faculty.getEmail(),
                faculty.getStatus()
        );
    }
}
