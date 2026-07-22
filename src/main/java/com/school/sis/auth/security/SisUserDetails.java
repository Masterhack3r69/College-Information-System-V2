package com.school.sis.auth.security;

import com.school.sis.auth.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.UUID;
import java.util.stream.Stream;

public class SisUserDetails implements UserDetails {

    private final User user;
    private final UUID sessionId;

    public SisUserDetails(User user) {
        this(user, null);
    }

    public SisUserDetails(User user, UUID sessionId) {
        this.user = user;
        this.sessionId = sessionId;
    }

    public UUID id() {
        return user.getId();
    }

    public String email() {
        return user.getEmail();
    }

    public String fullName() {
        return user.getFullName();
    }

    public UUID facultyId() {
        return user.getFaculty() == null ? null : user.getFaculty().getId();
    }

    public UUID studentId() { return user.getStudent() == null ? null : user.getStudent().getId(); }
    public boolean mustChangePassword() { return user.isMustChangePassword(); }
    public long securityVersion() { return user.getSecurityVersion(); }
    public UUID sessionId() { return sessionId; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
                .flatMap(role -> Stream.concat(
                        Stream.of(new SimpleGrantedAuthority("ROLE_" + role.getName())),
                        role.getPermissions().stream()
                                .map(permission -> new SimpleGrantedAuthority(permission.getName()))
                ))
                .distinct()
                .toList();
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isEnabled() {
        return user.isActive();
    }
}
