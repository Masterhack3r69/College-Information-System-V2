package com.school.sis.auth.entity;

import com.school.sis.common.audit.AuditableEntity;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.student.entity.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Version;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false, unique = true, length = 80)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private boolean active;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "faculty_id", unique = true)
    private Faculty faculty;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", unique = true)
    private Student student;

    @Column(name = "must_change_password", nullable = false)
    @ColumnDefault("false")
    private boolean mustChangePassword;

    @Column(name = "security_version", nullable = false)
    @ColumnDefault("0")
    private long securityVersion;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "failed_login_attempts", nullable = false)
    @ColumnDefault("0")
    private int failedLoginAttempts;

    @Column(name = "failed_login_window_started_at")
    private Instant failedLoginWindowStartedAt;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    @Column(name = "temporary_password_expires_at")
    private Instant temporaryPasswordExpiresAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    public User() {
    }

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }
    public void setEmail(String email) { this.email = email; }
    public void setUsername(String username) { this.username = username; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setActive(boolean active) { this.active = active; }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public boolean isActive() {
        return active;
    }

    public Faculty getFaculty() {
        return faculty;
    }

    public void setFaculty(Faculty faculty) {
        this.faculty = faculty;
    }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }
    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean value) { this.mustChangePassword = value; }
    public long getSecurityVersion() { return securityVersion; }
    public void setSecurityVersion(long securityVersion) { this.securityVersion = securityVersion; }
    public void incrementSecurityVersion() { this.securityVersion++; }
    public long getVersion() { return version; }
    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }
    public Instant getFailedLoginWindowStartedAt() { return failedLoginWindowStartedAt; }
    public void setFailedLoginWindowStartedAt(Instant value) { this.failedLoginWindowStartedAt = value; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public boolean isLocked() { return lockedUntil != null && lockedUntil.isAfter(Instant.now()); }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public Instant getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(Instant passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }
    public Instant getTemporaryPasswordExpiresAt() { return temporaryPasswordExpiresAt; }
    public void setTemporaryPasswordExpiresAt(Instant value) { this.temporaryPasswordExpiresAt = value; }

    public Set<Role> getRoles() {
        return roles;
    }
}
