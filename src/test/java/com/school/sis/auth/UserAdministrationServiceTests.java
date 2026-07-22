package com.school.sis.auth;

import com.school.sis.auth.dto.*;
import com.school.sis.auth.entity.RefreshToken;
import com.school.sis.auth.entity.Role;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.RefreshTokenRepository;
import com.school.sis.auth.repository.RoleRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.JwtService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.auth.service.TokenHashService;
import com.school.sis.auth.service.UserAdministrationService;
import com.school.sis.common.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserAdministrationServiceTests {
    @Autowired UserAdministrationService service;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired RefreshTokenRepository sessions;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired TokenHashService hashes;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mockMvc;

    private User currentAdmin;
    private Role registrarRole;
    private UUID departmentId;
    private UUID availableFacultyId;
    private UUID linkedFacultyId;
    private UUID linkedUserId;

    @BeforeEach
    void seed() {
        UUID accountPermission = UUID.randomUUID(), rbacPermission = UUID.randomUUID();
        UUID superRoleId = UUID.randomUUID(), accountAdminRoleId = UUID.randomUUID(), registrarRoleId = UUID.randomUUID();
        UUID readOnlyRoleId = UUID.randomUUID(), studentRoleId = UUID.randomUUID(), adminId = UUID.randomUUID();
        jdbc.update("insert into permissions(id,name,description,created_at,updated_at) values (?,?,?,?,?)", accountPermission, "ACCOUNT_MANAGE", "Manage accounts", Instant.now(), Instant.now());
        jdbc.update("insert into permissions(id,name,description,created_at,updated_at) values (?,?,?,?,?)", rbacPermission, "RBAC_MANAGE", "Manage RBAC", Instant.now(), Instant.now());
        insertRole(superRoleId, "SUPER_ADMIN", "Full access");
        insertRole(accountAdminRoleId, "ACCOUNT_ADMIN", "Delegated account administrator");
        insertRole(registrarRoleId, "REGISTRAR", "Registrar");
        insertRole(readOnlyRoleId, "READ_ONLY_STAFF", "Read only staff");
        insertRole(studentRoleId, "STUDENT", "Student");
        jdbc.update("insert into role_permissions(role_id,permission_id) values (?,?)", superRoleId, accountPermission);
        jdbc.update("insert into role_permissions(role_id,permission_id) values (?,?)", superRoleId, rbacPermission);
        jdbc.update("insert into role_permissions(role_id,permission_id) values (?,?)", accountAdminRoleId, accountPermission);
        insertUser(adminId, "admin", "admin@example.edu", true, null);
        jdbc.update("insert into user_roles(user_id,role_id) values (?,?)", adminId, superRoleId);
        currentAdmin = users.findById(adminId).orElseThrow();
        registrarRole = roles.findById(registrarRoleId).orElseThrow();
        var principal = new SisUserDetails(currentAdmin);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        departmentId = UUID.randomUUID(); availableFacultyId = UUID.randomUUID(); linkedFacultyId = UUID.randomUUID(); linkedUserId = UUID.randomUUID();
        jdbc.update("insert into departments(id,department_code,department_name,status,created_at,updated_at) values (?,?,?,?,?,?)",
                departmentId, "UA-" + suffix, "User Admin " + suffix, "ACTIVE", Instant.now(), Instant.now());
        insertFaculty(availableFacultyId, "EMP-A-" + suffix, "Available", "Faculty", "available-" + suffix + "@example.edu");
        insertFaculty(linkedFacultyId, "EMP-L-" + suffix, "Linked", "Faculty", "linked-" + suffix + "@example.edu");
        insertUser(linkedUserId, "linked-" + suffix, "linked-user-" + suffix + "@example.edu", true, linkedFacultyId);
        jdbc.update("insert into user_roles(user_id,role_id) values (?,?)", linkedUserId, registrarRole.getId());
    }

    @Test
    void createsCanonicalFacultyAccountWithOneTimeCredentialAndSearchesDirectory() {
        String canonicalEmail = jdbc.queryForObject("select email from faculty where id=?", String.class, availableFacultyId);
        var result = service.create(new UserRequest(" New.User ", "ignored@example.edu", "Ignored Name",
                Set.of(registrarRole.getId()), availableFacultyId, null, "New registrar account"));

        User saved = users.findById(result.account().id()).orElseThrow();
        assertThat(saved.getUsername()).isEqualTo("new.user");
        assertThat(saved.getEmail()).isEqualTo(canonicalEmail);
        assertThat(saved.getFullName()).isEqualTo("Available Faculty");
        assertThat(result.temporaryPassword()).hasSize(20);
        assertThat(passwordEncoder.matches(result.temporaryPassword(), saved.getPasswordHash())).isTrue();
        assertThat(saved.isMustChangePassword()).isTrue();
        assertThat(saved.getTemporaryPasswordExpiresAt()).isAfter(Instant.now().plus(Duration.ofHours(23)));
        assertThat(service.list(new UserSearchCriteria("new.user", registrarRole.getId(), availableFacultyId,
                true, "FACULTY", false, true), PageRequest.of(0, 10)).items())
                .extracting(UserResponse::id).containsExactly(result.account().id());

        assertThatThrownBy(() -> service.create(new UserRequest("another", "another@example.edu", "Another",
                Set.of(registrarRole.getId()), availableFacultyId, null, "Duplicate link test")))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("already linked");
    }

    @Test
    void exposesSafeAssignableRolesAndLocksProtectedRolePermissions() {
        assertThat(service.assignableRoles()).extracting(RoleResponse::name)
                .contains("ACCOUNT_ADMIN", "SUPER_ADMIN").doesNotContain("STUDENT");
        Role superRole = roles.findByName("SUPER_ADMIN").orElseThrow();
        assertThatThrownBy(() -> service.setRolePermissions(superRole.getId(),
                new RolePermissionsRequest(Set.of(), superRole.getVersion(), "Attempt protected edit")))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("system-managed");

        Role readOnly = roles.findByName("READ_ONLY_STAFF").orElseThrow();
        Set<UUID> existing = readOnly.getPermissions().stream().map(permission -> permission.getId()).collect(java.util.stream.Collectors.toSet());
        RoleResponse updated = service.setRolePermissions(readOnly.getId(),
                new RolePermissionsRequest(existing, readOnly.getVersion(), "Confirm read-only permissions"));
        assertThat(updated.permissions()).hasSize(existing.size());
    }

    @Test
    void deactivationPreservesButRevokesSessionAndInvalidatesAccessJwtImmediately() throws Exception {
        User target = users.findById(linkedUserId).orElseThrow();
        String rawRefresh = "refresh-" + UUID.randomUUID();
        Instant now = Instant.now();
        RefreshToken session = sessions.save(new RefreshToken(UUID.randomUUID(), hashes.sha256(rawRefresh), target,
                now.plus(Duration.ofDays(7)), now.plus(Duration.ofDays(30)), "127.0.0.1", "test"));
        String accessToken = jwtService.createAccessToken(new SisUserDetails(target, session.getId()));

        service.setStatus(linkedUserId, new UserStatusRequest(false, target.getVersion(), "Employment ended"));
        assertThat(jdbc.queryForObject("select revoked_at is not null from refresh_tokens where id=?", Boolean.class, session.getId())).isTrue();
        assertThat(jdbc.queryForObject("select revoked_reason from refresh_tokens where id=?", String.class, session.getId())).isEqualTo("ACCOUNT_DEACTIVATED");

        SecurityContextHolder.clearContext();
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_REVOKED"));
    }

    @Test
    void preventsSelfDeactivationSelfDemotionAndLastSuperAdminRemoval() {
        assertThatThrownBy(() -> service.setStatus(currentAdmin.getId(),
                new UserStatusRequest(false, currentAdmin.getVersion(), "Unsafe self change")))
                .isInstanceOf(BusinessRuleException.class).extracting("code").isEqualTo("SELF_DEACTIVATION_NOT_ALLOWED");

        assertThatThrownBy(() -> service.update(currentAdmin.getId(), new UserRequest(currentAdmin.getUsername(),
                currentAdmin.getEmail(), currentAdmin.getFullName(), Set.of(registrarRole.getId()), null,
                currentAdmin.getVersion(), "Unsafe self demotion")))
                .isInstanceOf(BusinessRuleException.class).extracting("code").isEqualTo("SELF_DEMOTION_NOT_ALLOWED");
    }

    private void insertFaculty(UUID id, String employeeNumber, String firstName, String lastName, String email) {
        jdbc.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status,created_at,updated_at)
                values (?,?,?,?,?,?,?,?,?,?,?)
                """, id, employeeNumber, firstName, lastName, email, departmentId, "FULL_TIME", "INSTRUCTOR", "ACTIVE", Instant.now(), Instant.now());
    }

    private void insertRole(UUID id, String name, String description) {
        jdbc.update("insert into roles(id,name,description,version,created_at,updated_at) values (?,?,?,?,?,?)",
                id, name, description, 0, Instant.now(), Instant.now());
    }

    private void insertUser(UUID id, String username, String email, boolean active, UUID facultyId) {
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active,faculty_id,version,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?)",
                id, email, username, passwordEncoder.encode("Password1234"), "Linked User", active, facultyId, 0, Instant.now(), Instant.now());
    }
}
