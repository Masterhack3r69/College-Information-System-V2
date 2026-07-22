package com.school.sis.auth.repository;

import com.school.sis.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.List;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmailIgnoreCaseOrUsernameIgnoreCase(String email, String username);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    boolean existsByUsernameIgnoreCaseAndIdNot(String username, UUID id);
    boolean existsByFacultyIdAndIdNot(UUID facultyId, UUID id);
    boolean existsByStudentIdAndIdNot(UUID studentId, UUID id);
    Optional<User> findByStudentId(UUID studentId);
    Optional<User> findByFacultyId(UUID facultyId);
    Optional<User> findByEmailIgnoreCase(String email);
    long countByActiveTrueAndRolesName(String roleName);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from User user where user.id = :id")
    Optional<User> findByIdForUpdate(UUID id);

    @Query("select distinct user from User user left join fetch user.roles left join fetch user.faculty left join fetch user.student")
    List<User> findAllForAccountDirectory();
}
