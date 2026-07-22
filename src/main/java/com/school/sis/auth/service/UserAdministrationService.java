package com.school.sis.auth.service;

import com.school.sis.audit.AuditModule;
import com.school.sis.audit.dto.AuditLogResponse;
import com.school.sis.audit.repository.AuditLogRepository;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.dto.*;
import com.school.sis.auth.entity.Permission;
import com.school.sis.auth.entity.RefreshToken;
import com.school.sis.auth.entity.Role;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.PermissionRepository;
import com.school.sis.auth.repository.RefreshTokenRepository;
import com.school.sis.auth.repository.RoleRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.ConflictException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.common.response.PageResponse;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.setup.repository.FacultyRepository;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserAdministrationService {
    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String ACCOUNT_ADMIN = "ACCOUNT_ADMIN";
    private static final Set<String> PROTECTED_ROLES = Set.of(SUPER_ADMIN, ACCOUNT_ADMIN);
    private static final Set<String> PROTECTED_PERMISSIONS = Set.of("ACCOUNT_MANAGE", "RBAC_MANAGE");

    private final UserRepository users;
    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final FacultyRepository faculty;
    private final RefreshTokenRepository sessions;
    private final PasswordEncoder passwordEncoder;
    private final PasswordSecurityService passwordSecurity;
    private final AuditService audit;
    private final AuditLogRepository auditLogs;

    public UserAdministrationService(UserRepository users, RoleRepository roles, PermissionRepository permissions,
            FacultyRepository faculty, RefreshTokenRepository sessions, PasswordEncoder passwordEncoder,
            PasswordSecurityService passwordSecurity, AuditService audit, AuditLogRepository auditLogs) {
        this.users = users; this.roles = roles; this.permissions = permissions; this.faculty = faculty;
        this.sessions = sessions; this.passwordEncoder = passwordEncoder; this.passwordSecurity = passwordSecurity;
        this.audit = audit; this.auditLogs = auditLogs;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(UserSearchCriteria criteria, Pageable pageable) {
        return PageResponse.from(users.findAll(specification(criteria), pageable).map(this::response));
    }

    @Transactional(readOnly = true)
    public UserResponse get(UUID id) { return response(findUser(id)); }

    @Transactional(readOnly = true)
    public AccountDirectorySummary summary() {
        List<User> all = users.findAllForAccountDirectory();
        long nowLocked = all.stream().filter(User::isLocked).count();
        return new AccountDirectorySummary(all.size(), all.stream().filter(User::isActive).count(),
                all.stream().filter(user -> !user.isActive()).count(), nowLocked,
                all.stream().filter(User::isMustChangePassword).count(),
                all.stream().filter(user -> type(user).equals("SYSTEM")).count(),
                all.stream().filter(user -> type(user).equals("FACULTY")).count(),
                all.stream().filter(user -> type(user).equals("STUDENT")).count());
    }

    @Transactional
    public ProvisionedUserResponse create(UserRequest request) {
        requireReason(request.auditReason());
        User user = new User();
        applyEditableFields(user, request, true);
        String temporaryPassword = passwordSecurity.temporaryPassword();
        Instant expiresAt = Instant.now().plus(Duration.ofHours(24));
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setActive(true);
        user.setMustChangePassword(true);
        user.setTemporaryPasswordExpiresAt(expiresAt);
        User saved = users.saveAndFlush(user);
        UserResponse account = response(saved);
        audit.log("ACCOUNT_CREATED", AuditModule.USER, "User", saved.getId(), null,
                auditSnapshot(account, request.auditReason()));
        return new ProvisionedUserResponse(account, temporaryPassword, expiresAt);
    }

    @Transactional
    public UserResponse update(UUID id, UserRequest request) {
        requireReason(request.auditReason());
        User user = lockedUser(id);
        requireVersion(user, request.version());
        ensureCanMutate(user);
        if (user.getStudent() != null) {
            throw rule("SYSTEM_MANAGED_STUDENT_ACCOUNT", "Student-linked account identity and roles are system-managed");
        }
        UserResponse before = response(user);
        Set<String> beforeRoles = roleNames(user);
        applyEditableFields(user, request, false);
        ensureSelfAndSuperInvariants(user, beforeRoles);
        users.flush();
        UserResponse after = response(user);
        audit.log("ACCOUNT_UPDATED", AuditModule.USER, "User", id,
                auditSnapshot(before, request.auditReason()), auditSnapshot(after, request.auditReason()));
        return after;
    }

    @Transactional
    public UserResponse setStatus(UUID id, UserStatusRequest request) {
        requireReason(request.auditReason());
        User user = lockedUser(id);
        requireVersion(user, request.version());
        ensureCanMutate(user);
        if (!request.active() && id.equals(currentUserId()))
            throw rule("SELF_DEACTIVATION_NOT_ALLOWED", "You cannot deactivate your own account");
        if (!request.active() && user.isActive() && hasRole(user, SUPER_ADMIN)) ensureAnotherActiveSuperAdmin(user);
        boolean before = user.isActive();
        user.setActive(request.active());
        if (!request.active()) {
            user.incrementSecurityVersion();
            sessions.revokeAllByUserId(id, Instant.now(), "ACCOUNT_DEACTIVATED");
        }
        users.flush();
        audit.log("ACCOUNT_STATUS_CHANGED", AuditModule.USER, "User", id,
                Map.of("active", before), Map.of("active", request.active(), "reason", request.auditReason()));
        return response(user);
    }

    @Transactional
    public ProvisionedUserResponse resetPassword(UUID id, PasswordResetRequest request) {
        requireReason(request.auditReason());
        User user = lockedUser(id);
        requireVersion(user, request.version());
        ensureCanMutate(user);
        String temporaryPassword = passwordSecurity.temporaryPassword();
        Instant expiresAt = Instant.now().plus(Duration.ofHours(24));
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        user.setTemporaryPasswordExpiresAt(expiresAt);
        user.setPasswordChangedAt(Instant.now());
        user.incrementSecurityVersion();
        int revoked = sessions.revokeAllByUserId(id, Instant.now(), "ADMIN_PASSWORD_RESET");
        users.flush();
        UserResponse account = response(user);
        audit.log("ADMIN_PASSWORD_RESET", AuditModule.USER, "User", id, null,
                Map.of("reason", request.auditReason(), "sessionsRevoked", revoked));
        return new ProvisionedUserResponse(account, temporaryPassword, expiresAt);
    }

    @Transactional
    public UserResponse unlock(UUID id, AuditReasonRequest request) {
        requireReason(request.auditReason());
        User user = lockedUser(id);
        requireVersion(user, request.version());
        ensureCanMutate(user);
        Instant before = user.getLockedUntil();
        user.setLockedUntil(null);
        user.setFailedLoginAttempts(0);
        user.setFailedLoginWindowStartedAt(null);
        users.flush();
        audit.log("ACCOUNT_UNLOCKED", AuditModule.USER, "User", id,
                before == null ? null : Map.of("lockedUntil", before), Map.of("reason", request.auditReason()));
        return response(user);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> accountSessions(UUID id) {
        findUser(id);
        UUID currentSessionId = currentUserId() != null && currentUserId().equals(id) && currentPrincipal() != null
                ? currentPrincipal().sessionId() : null;
        return sessions.findAllByUserId(id).stream().map(session -> SessionResponse.from(session, currentSessionId)).toList();
    }

    @Transactional
    public void revokeAccountSession(UUID userId, UUID sessionId, String reason) {
        requireReason(reason);
        User user = lockedUser(userId);
        ensureCanMutate(user);
        RefreshToken session = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new NotFoundException("Session not found"));
        if (session.getRevokedAt() == null) session.revoke("ADMIN_REVOKED");
        audit.log("ADMIN_SESSION_REVOKED", AuditModule.USER, "RefreshToken", sessionId, null,
                Map.of("accountId", userId, "reason", reason));
    }

    @Transactional
    public int revokeAllAccountSessions(UUID userId, AuditReasonRequest request) {
        requireReason(request.auditReason());
        User user = lockedUser(userId);
        requireVersion(user, request.version());
        ensureCanMutate(user);
        user.incrementSecurityVersion();
        int count = sessions.revokeAllByUserId(userId, Instant.now(), "ADMIN_REVOKE_ALL");
        audit.log("ADMIN_ALL_SESSIONS_REVOKED", AuditModule.USER, "User", userId, null,
                Map.of("reason", request.auditReason(), "sessionCount", count));
        return count;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> securityActivity(UUID id) {
        findUser(id);
        return auditLogs.findTop50ByEntityTypeAndEntityIdOrderByCreatedAtDesc("User", id).stream()
                .map(AuditLogResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> assignableRoles() {
        boolean superAdmin = currentIsSuperAdmin();
        return roles.findAll().stream()
                .filter(role -> !role.getName().equals("STUDENT"))
                .filter(role -> superAdmin || !PROTECTED_ROLES.contains(role.getName()))
                .sorted(Comparator.comparing(Role::getName)).map(RoleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles() {
        return roles.findAll().stream().sorted(Comparator.comparing(Role::getName)).map(RoleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> listPermissions() {
        return permissions.findAll().stream().sorted(Comparator.comparing(Permission::getName))
                .map(PermissionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<FacultyAccountOptionResponse> facultyOptions(String search, UUID includeFacultyId, Pageable pageable) {
        String term = search == null ? "" : search.trim();
        return PageResponse.from(faculty.findAccountOptions(term, includeFacultyId, pageable)
                .map(FacultyAccountOptionResponse::from));
    }

    @Transactional
    public RoleResponse setRolePermissions(UUID id, RolePermissionsRequest request) {
        requireReason(request.auditReason());
        Role role = roles.findByIdForUpdate(id).orElseThrow(() -> new NotFoundException("Role not found"));
        if (role.getVersion() != request.version()) throw new ConflictException("STALE_ROLE", "Role changed; refresh and try again");
        if (PROTECTED_ROLES.contains(role.getName()))
            throw rule("PROTECTED_ROLE", role.getName() + " permissions are system-managed");
        Set<String> before = role.getPermissions().stream().map(Permission::getName).collect(Collectors.toSet());
        List<Permission> found = permissions.findAllById(request.permissionIds());
        if (found.size() != request.permissionIds().size()) throw new NotFoundException("One or more permissions were not found");
        Set<String> after = found.stream().map(Permission::getName).collect(Collectors.toSet());
        if (!intersection(before, PROTECTED_PERMISSIONS).equals(intersection(after, PROTECTED_PERMISSIONS))) {
            throw rule("PROTECTED_PERMISSION", "ACCOUNT_MANAGE and RBAC_MANAGE are system-managed");
        }
        role.setPermissions(new HashSet<>(found));
        roles.flush();
        audit.log("ROLE_PERMISSIONS_CHANGED", AuditModule.USER, "Role", id,
                Map.of("permissions", new TreeSet<>(before)),
                Map.of("permissions", new TreeSet<>(after), "reason", request.auditReason()));
        return RoleResponse.from(role);
    }

    @Transactional(readOnly = true)
    public List<IdentityConflictResponse> identityConflicts() {
        ensureSuperAdmin();
        return users.findAllForAccountDirectory().stream().filter(user -> !identityStatus(user).equals("SYNCED"))
                .map(this::identityConflict).toList();
    }

    @Transactional
    public UserResponse reconcileIdentity(UUID id, AuditReasonRequest request) {
        ensureSuperAdmin();
        requireReason(request.auditReason());
        User user = lockedUser(id);
        requireVersion(user, request.version());
        if (user.getFaculty() == null && user.getStudent() == null)
            throw rule("DOMAIN_IDENTITY_REQUIRED", "Only linked faculty or student accounts can be reconciled");
        String canonicalEmail = canonicalEmail(user);
        String canonicalName = canonicalName(user);
        if (canonicalEmail == null || canonicalEmail.isBlank())
            throw rule("DOMAIN_EMAIL_REQUIRED", "The linked domain record does not have an email address");
        assertEmailAvailable(canonicalEmail, user.getId());
        Map<String, Object> before = Map.of("email", user.getEmail(), "fullName", user.getFullName());
        user.setEmail(normalize(canonicalEmail));
        user.setFullName(canonicalName);
        users.flush();
        audit.log("IDENTITY_RECONCILED", AuditModule.USER, "User", id, before,
                Map.of("email", user.getEmail(), "fullName", user.getFullName(), "reason", request.auditReason()));
        return response(user);
    }

    private void applyEditableFields(User user, UserRequest request, boolean creating) {
        UUID currentId = user.getId() == null ? new UUID(0, 0) : user.getId();
        Set<Role> resolvedRoles = resolveRoles(request.roleIds());
        ensureAssignableRoles(resolvedRoles);
        String username = normalize(request.username());
        if (users.existsByUsernameIgnoreCaseAndIdNot(username, currentId))
            throw rule("USERNAME_CONFLICT", "Username already exists");
        Faculty linked = request.facultyId() == null ? null : faculty.findById(request.facultyId())
                .orElseThrow(() -> new NotFoundException("Faculty not found"));
        if (linked != null && users.existsByFacultyIdAndIdNot(linked.getId(), currentId))
            throw rule("FACULTY_LINK_CONFLICT", "Faculty is already linked to another account");
        String email = linked == null ? normalize(request.email()) : normalize(linked.getEmail());
        String fullName = linked == null ? request.fullName().trim() : fullName(linked);
        assertEmailAvailable(email, currentId);
        user.setUsername(username); user.setEmail(email); user.setFullName(fullName);
        user.getRoles().clear(); user.getRoles().addAll(resolvedRoles);
        user.setFaculty(linked);
        if (creating) user.setStudent(null);
    }

    private void ensureAssignableRoles(Set<Role> requested) {
        if (requested.stream().anyMatch(role -> role.getName().equals("STUDENT")))
            throw rule("SYSTEM_MANAGED_STUDENT_ROLE", "The STUDENT role is assigned only by student provisioning");
        if (!currentIsSuperAdmin() && requested.stream().anyMatch(role -> PROTECTED_ROLES.contains(role.getName())))
            throw rule("PROTECTED_ROLE", "Only a Super Admin may assign protected roles");
    }

    private void ensureCanMutate(User target) {
        if (isProtected(target) && !currentIsSuperAdmin())
            throw rule("PROTECTED_ACCOUNT", "Only a Super Admin may change this protected account");
    }

    private void ensureSelfAndSuperInvariants(User user, Set<String> beforeRoles) {
        Set<String> afterRoles = roleNames(user);
        if (user.getId().equals(currentUserId()) && beforeRoles.stream().anyMatch(PROTECTED_ROLES::contains)
                && !afterRoles.containsAll(intersection(beforeRoles, PROTECTED_ROLES)))
            throw rule("SELF_DEMOTION_NOT_ALLOWED", "You cannot remove your own protected administrator role");
        if (beforeRoles.contains(SUPER_ADMIN) && !afterRoles.contains(SUPER_ADMIN)) ensureAnotherActiveSuperAdmin(user);
    }

    private void ensureAnotherActiveSuperAdmin(User changed) {
        long active = users.countByActiveTrueAndRolesName(SUPER_ADMIN);
        if (changed.isActive() && hasRole(changed, SUPER_ADMIN)) active--;
        if (active < 1) throw rule("LAST_SUPER_ADMIN_REQUIRED", "At least one active Super Admin must remain");
    }

    private void assertEmailAvailable(String email, UUID id) {
        users.findByEmailIgnoreCase(email).filter(other -> !other.getId().equals(id)).ifPresent(other -> {
            throw new ConflictException("IDENTITY_EMAIL_CONFLICT",
                    "The authoritative email belongs to another account and must be resolved first");
        });
    }

    private UserResponse response(User user) {
        Faculty linkedFaculty = user.getFaculty();
        var student = user.getStudent();
        String facultyName = linkedFaculty == null ? null : fullName(linkedFaculty);
        String studentName = student == null ? null : fullName(student);
        String studentEmail = student == null || student.getContact() == null ? null : student.getContact().getEmailAddress();
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getFullName(), user.isActive(),
                type(user), linkedFaculty == null ? null : linkedFaculty.getId(),
                linkedFaculty == null ? null : linkedFaculty.getEmployeeNumber(), facultyName,
                linkedFaculty == null ? null : linkedFaculty.getEmail(),
                student == null ? null : student.getId(), student == null ? null : student.getStudentNumber(),
                studentName, studentEmail, identityStatus(user), user.isMustChangePassword(),
                user.getTemporaryPasswordExpiresAt(), user.isLocked(), user.getLockedUntil(), user.getLastLoginAt(),
                sessions.countUsableByUserId(user.getId(), Instant.now()), isProtected(user), user.getVersion(),
                user.getRoles().stream().sorted(Comparator.comparing(Role::getName)).map(RoleResponse::from).toList(),
                user.getCreatedAt(), user.getUpdatedAt());
    }

    private IdentityConflictResponse identityConflict(User user) {
        String email = canonicalEmail(user);
        UUID conflicting = email == null ? null : users.findByEmailIgnoreCase(email)
                .filter(other -> !other.getId().equals(user.getId())).map(User::getId).orElse(null);
        return new IdentityConflictResponse(user.getId(), user.getUsername(), type(user), user.getFullName(),
                canonicalName(user), user.getEmail(), email, conflicting, identityStatus(user), user.getVersion());
    }

    private String identityStatus(User user) {
        if (type(user).equals("SYSTEM")) return "SYNCED";
        String canonicalEmail = canonicalEmail(user);
        String canonicalName = canonicalName(user);
        if (canonicalEmail == null || canonicalEmail.isBlank()) return "DOMAIN_EMAIL_MISSING";
        Optional<User> conflicting = users.findByEmailIgnoreCase(canonicalEmail)
                .filter(other -> !other.getId().equals(user.getId()));
        if (conflicting.isPresent()) return "EMAIL_CONFLICT";
        return normalize(canonicalEmail).equals(normalize(user.getEmail())) && canonicalName.equals(user.getFullName())
                ? "SYNCED" : "MISMATCH";
    }

    private String canonicalEmail(User user) {
        if (user.getFaculty() != null) return user.getFaculty().getEmail();
        return user.getStudent() == null || user.getStudent().getContact() == null
                ? null : user.getStudent().getContact().getEmailAddress();
    }

    private String canonicalName(User user) {
        if (user.getFaculty() != null) return fullName(user.getFaculty());
        return user.getStudent() == null ? user.getFullName() : fullName(user.getStudent());
    }

    private String type(User user) {
        if (user.getStudent() != null) return "STUDENT";
        if (user.getFaculty() != null) return "FACULTY";
        return "SYSTEM";
    }

    private String fullName(Faculty value) { return join(value.getFirstName(), value.getMiddleName(), value.getLastName(), value.getSuffix()); }
    private String fullName(com.school.sis.student.entity.Student value) { return join(value.getFirstName(), value.getMiddleName(), value.getLastName(), value.getSuffix()); }
    private String join(String... values) { return Arrays.stream(values).filter(value -> value != null && !value.isBlank()).collect(Collectors.joining(" ")); }
    private String normalize(String value) { return value == null ? "" : value.trim().toLowerCase(Locale.ROOT); }
    private Set<Role> resolveRoles(Set<UUID> ids) {
        List<Role> found = roles.findAllById(ids);
        if (found.size() != ids.size()) throw new NotFoundException("One or more roles were not found");
        return new HashSet<>(found);
    }
    private User findUser(UUID id) { return users.findById(id).orElseThrow(() -> new NotFoundException("User not found")); }
    private User lockedUser(UUID id) { return users.findByIdForUpdate(id).orElseThrow(() -> new NotFoundException("User not found")); }
    private boolean hasRole(User user, String name) { return user.getRoles().stream().anyMatch(role -> role.getName().equals(name)); }
    private boolean isProtected(User user) { return user.getRoles().stream().anyMatch(role -> PROTECTED_ROLES.contains(role.getName())); }
    private Set<String> roleNames(User user) { return user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()); }
    private UUID currentUserId() {
        SisUserDetails principal = currentPrincipal();
        return principal == null ? null : principal.id();
    }
    private SisUserDetails currentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof SisUserDetails details ? details : null;
    }
    private boolean currentIsSuperAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + SUPER_ADMIN));
    }
    private void ensureSuperAdmin() { if (!currentIsSuperAdmin()) throw rule("SUPER_ADMIN_REQUIRED", "Super Admin access is required"); }
    private void requireVersion(User user, Long version) {
        if (version == null || user.getVersion() != version)
            throw new ConflictException("STALE_ACCOUNT", "Account changed; refresh and try again");
    }
    private void requireReason(String reason) {
        if (reason == null || reason.isBlank()) throw rule("AUDIT_REASON_REQUIRED", "An audit reason is required");
    }
    private Map<String, Object> auditSnapshot(UserResponse user, String reason) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("username", user.username()); snapshot.put("email", user.email());
        snapshot.put("fullName", user.fullName()); snapshot.put("active", user.active());
        snapshot.put("roles", user.roles().stream().map(RoleResponse::name).toList());
        snapshot.put("facultyId", user.facultyId()); snapshot.put("studentId", user.studentId());
        snapshot.put("reason", reason); return snapshot;
    }
    private static <T> Set<T> intersection(Set<T> first, Set<T> second) {
        Set<T> result = new HashSet<>(first); result.retainAll(second); return result;
    }
    private BusinessRuleException rule(String code, String message) { return new BusinessRuleException(code, message); }

    private Specification<User> specification(UserSearchCriteria criteria) {
        return (root, query, cb) -> {
            query.distinct(true); var predicate = cb.conjunction();
            if (criteria == null) return predicate;
            if (criteria.search() != null && !criteria.search().isBlank()) {
                String term = "%" + criteria.search().trim().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(cb.like(cb.lower(root.get("username")), term),
                        cb.like(cb.lower(root.get("email")), term), cb.like(cb.lower(root.get("fullName")), term)));
            }
            if (criteria.roleId() != null) predicate = cb.and(predicate, cb.equal(root.join("roles", JoinType.INNER).get("id"), criteria.roleId()));
            if (criteria.facultyId() != null) predicate = cb.and(predicate, cb.equal(root.get("faculty").get("id"), criteria.facultyId()));
            if (criteria.active() != null) predicate = cb.and(predicate, cb.equal(root.get("active"), criteria.active()));
            if (criteria.forcedChange() != null) predicate = cb.and(predicate, cb.equal(root.get("mustChangePassword"), criteria.forcedChange()));
            if (criteria.locked() != null) predicate = criteria.locked()
                    ? cb.and(predicate, cb.greaterThan(root.get("lockedUntil"), Instant.now()))
                    : cb.and(predicate, cb.or(cb.isNull(root.get("lockedUntil")), cb.lessThanOrEqualTo(root.get("lockedUntil"), Instant.now())));
            if (criteria.accountType() != null && !criteria.accountType().isBlank()) {
                predicate = switch (criteria.accountType().toUpperCase(Locale.ROOT)) {
                    case "FACULTY" -> cb.and(predicate, cb.isNotNull(root.get("faculty")));
                    case "STUDENT" -> cb.and(predicate, cb.isNotNull(root.get("student")));
                    case "SYSTEM" -> cb.and(predicate, cb.isNull(root.get("faculty")), cb.isNull(root.get("student")));
                    default -> predicate;
                };
            }
            return predicate;
        };
    }
}
