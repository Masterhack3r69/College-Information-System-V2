package com.school.sis.auth.repository;

import com.school.sis.auth.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select role from Role role where role.id = :id")
    Optional<Role> findByIdForUpdate(UUID id);
}
