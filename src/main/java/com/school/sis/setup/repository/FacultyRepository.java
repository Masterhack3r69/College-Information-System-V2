package com.school.sis.setup.repository;

import com.school.sis.setup.entity.Faculty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface FacultyRepository extends JpaRepository<Faculty, UUID> {
    Page<Faculty> findByEmployeeNumberContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String employeeNumber,
            String firstName,
            String lastName,
            Pageable pageable
    );

    @Query("""
            select faculty from Faculty faculty
            where (:search = ''
                or lower(faculty.employeeNumber) like lower(concat('%', :search, '%'))
                or lower(faculty.firstName) like lower(concat('%', :search, '%'))
                or lower(faculty.lastName) like lower(concat('%', :search, '%'))
                or lower(faculty.email) like lower(concat('%', :search, '%')))
              and ((:includeFacultyId is not null and faculty.id = :includeFacultyId)
                or not exists (select user.id from User user where user.faculty = faculty))
            """)
    Page<Faculty> findAccountOptions(
            @Param("search") String search,
            @Param("includeFacultyId") UUID includeFacultyId,
            Pageable pageable
    );
}
