package com.school.sis.auth;

import com.school.sis.auth.dto.UserRequest;
import com.school.sis.auth.dto.UserSearchCriteria;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.RefreshTokenRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.JwtService;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.auth.service.UserAdministrationService;
import com.school.sis.common.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserAdministrationServiceTests {
    @Autowired UserAdministrationService service;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mockMvc;

    private UUID adminRoleId;
    private UUID registrarRoleId;
    private UUID permissionId;
    private UUID departmentId;
    private UUID availableFacultyId;
    private UUID linkedFacultyId;
    private UUID linkedUserId;

    @BeforeEach
    void seed() {
        SecurityContextHolder.clearContext();
        adminRoleId = UUID.randomUUID();
        registrarRoleId = UUID.randomUUID();
        permissionId = UUID.randomUUID();
        departmentId = UUID.randomUUID();
        availableFacultyId = UUID.randomUUID();
        linkedFacultyId = UUID.randomUUID();
        linkedUserId = UUID.randomUUID();

        jdbc.update("insert into permissions(id,name,description,created_at,updated_at) values (?,?,?,?,?)",
                permissionId, "USER_MANAGE", "Manage users", Instant.now(), Instant.now());
        jdbc.update("insert into roles(id,name,description,created_at,updated_at) values (?,?,?,?,?)",
                adminRoleId, "SUPER_ADMIN", "Full access", Instant.now(), Instant.now());
        jdbc.update("insert into roles(id,name,description,created_at,updated_at) values (?,?,?,?,?)",
                registrarRoleId, "REGISTRAR", "Registrar", Instant.now(), Instant.now());
        jdbc.update("insert into role_permissions(role_id,permission_id) values (?,?)", adminRoleId, permissionId);
        jdbc.update("insert into departments(id,department_code,department_name,status,created_at,updated_at) values (?,?,?,?,?,?)",
                departmentId, "TEST-" + departmentId.toString().substring(0, 6), "Test Department " + departmentId, "ACTIVE", Instant.now(), Instant.now());
        insertFaculty(availableFacultyId, "EMP-A", "Available", "Faculty", "available@example.edu");
        insertFaculty(linkedFacultyId, "EMP-L", "Linked", "Faculty", "linked@example.edu");
        insertUser(linkedUserId, "linked", "linked-user@example.edu", true, linkedFacultyId);
        jdbc.update("insert into user_roles(user_id,role_id) values (?,?)", linkedUserId, registrarRoleId);
    }

    @Test
    void createsNormalizesSearchesAndProtectsUniqueRelationships() {
        var response = service.create(new UserRequest(
                " New.User ", " NEW.USER@EXAMPLE.EDU ", "New User", "password123",
                Set.of(registrarRoleId), availableFacultyId));

        User saved = users.findById(response.id()).orElseThrow();
        assertThat(saved.getUsername()).isEqualTo("new.user");
        assertThat(saved.getEmail()).isEqualTo("new.user@example.edu");
        assertThat(passwordEncoder.matches("password123", saved.getPasswordHash())).isTrue();
        assertThat(service.list(new UserSearchCriteria("new.user", registrarRoleId, availableFacultyId, true), PageRequest.of(0, 10)).items())
                .extracting(item -> item.id()).containsExactly(response.id());

        assertThatThrownBy(() -> service.create(new UserRequest(
                "another", "another@example.edu", "Another User", "password123",
                Set.of(registrarRoleId), availableFacultyId)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Faculty is already linked to another user");
    }

    @Test
    void facultyOptionsExcludeLinkedFacultyButCanIncludeCurrentLink() {
        var normal = service.facultyOptions("Faculty", null, PageRequest.of(0, 20));
        assertThat(normal.items()).extracting(item -> item.id()).contains(availableFacultyId).doesNotContain(linkedFacultyId);

        var editing = service.facultyOptions("Faculty", linkedFacultyId, PageRequest.of(0, 20));
        assertThat(editing.items()).extracting(item -> item.id()).contains(availableFacultyId, linkedFacultyId);
    }

    @Test
    void locksSuperAdminPermissionsAndAllowsOtherRolesToBeConfigured() {
        assertThatThrownBy(() -> service.setRolePermissions(adminRoleId, Set.of()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("SUPER_ADMIN permissions are system-managed");

        var updated = service.setRolePermissions(registrarRoleId, Set.of(permissionId));
        assertThat(updated.permissions()).extracting(permission -> permission.id()).containsExactly(permissionId);
    }

    @Test
    void deactivationRevokesRefreshTokensAndInactiveBearerAndRefreshAreRejected() throws Exception {
        UUID tokenId = UUID.randomUUID();
        String refreshToken = "refresh-" + UUID.randomUUID();
        jdbc.update("insert into refresh_tokens(id,token,user_id,expires_at,created_at,updated_at) values (?,?,?,?,?,?)",
                tokenId, refreshToken, linkedUserId, Instant.now().plusSeconds(3600), Instant.now(), Instant.now());
        User linkedUser = users.findById(linkedUserId).orElseThrow();
        String accessToken = jwtService.createAccessToken(new SisUserDetails(linkedUser));

        service.setStatus(linkedUserId, false);
        assertThat(refreshTokens.findById(tokenId)).isEmpty();

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());

        String inactiveRefresh = "inactive-" + UUID.randomUUID();
        jdbc.update("insert into refresh_tokens(id,token,user_id,expires_at,created_at,updated_at) values (?,?,?,?,?,?)",
                UUID.randomUUID(), inactiveRefresh, linkedUserId, Instant.now().plusSeconds(3600), Instant.now(), Instant.now());
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + inactiveRefresh + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Account is inactive"));
    }

    @Test
    void preventsSelfDeactivationAndRemovingOwnSuperAdminRole() {
        UUID adminUserId = UUID.randomUUID();
        insertUser(adminUserId, "self-admin", "self-admin@example.edu", true, null);
        jdbc.update("insert into user_roles(user_id,role_id) values (?,?)", adminUserId, adminRoleId);
        User admin = users.findById(adminUserId).orElseThrow();
        var principal = new SisUserDetails(admin);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        assertThatThrownBy(() -> service.setStatus(adminUserId, false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("You cannot deactivate your own account");
        assertThatThrownBy(() -> service.update(adminUserId, new UserRequest(
                "self-admin", "self-admin@example.edu", "Self Admin", null, Set.of(registrarRoleId), null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("You cannot remove your own SUPER_ADMIN role");
    }

    private void insertFaculty(UUID id, String employeeNumber, String firstName, String lastName, String email) {
        jdbc.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status,created_at,updated_at)
                values (?,?,?,?,?,?,?,?,?,?,?)
                """, id, employeeNumber + id.toString().substring(0, 4), firstName, lastName, email.replace("@", "+" + id.toString().substring(0, 4) + "@"),
                departmentId, "FULL_TIME", "INSTRUCTOR", "ACTIVE", Instant.now(), Instant.now());
    }

    private void insertUser(UUID id, String username, String email, boolean active, UUID facultyId) {
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active,faculty_id,created_at,updated_at) values (?,?,?,?,?,?,?,?,?)",
                id, email, username, passwordEncoder.encode("password123"), "Linked User", active, facultyId, Instant.now(), Instant.now());
    }
}
