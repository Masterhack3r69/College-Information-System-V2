package com.school.sis.auth.repository;

import com.school.sis.auth.entity.LoginRateLimit;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface LoginRateLimitRepository extends JpaRepository<LoginRateLimit, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select rate from LoginRateLimit rate where rate.ipHash = :ipHash")
    Optional<LoginRateLimit> findByIpHashForUpdate(String ipHash);
}
