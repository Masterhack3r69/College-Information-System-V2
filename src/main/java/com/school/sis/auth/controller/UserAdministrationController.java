package com.school.sis.auth.controller;

import com.school.sis.audit.dto.AuditLogResponse;
import com.school.sis.auth.dto.*;
import com.school.sis.auth.service.UserAdministrationService;
import com.school.sis.common.response.ApiResponse;
import com.school.sis.common.response.PageResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasAuthority('ACCOUNT_MANAGE')")
public class UserAdministrationController {
    private final UserAdministrationService service;
    public UserAdministrationController(UserAdministrationService service) { this.service = service; }

    @GetMapping
    public ApiResponse<PageResponse<UserResponse>> users(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID roleId,
            @RequestParam(required = false) UUID facultyId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String accountType,
            @RequestParam(required = false) Boolean locked,
            @RequestParam(required = false) Boolean forcedChange,
            Pageable pageable) {
        return ApiResponse.success("Accounts retrieved", service.list(
                new UserSearchCriteria(search, roleId, facultyId, active, accountType, locked, forcedChange), pageable));
    }

    @GetMapping("/summary")
    public ApiResponse<AccountDirectorySummary> summary() {
        return ApiResponse.success("Account directory summary retrieved", service.summary());
    }

    @GetMapping("/assignable-roles")
    public ApiResponse<List<RoleResponse>> assignableRoles() {
        return ApiResponse.success("Assignable roles retrieved", service.assignableRoles());
    }

    @GetMapping("/faculty-options")
    public ApiResponse<PageResponse<FacultyAccountOptionResponse>> facultyOptions(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID includeFacultyId,
            Pageable pageable) {
        return ApiResponse.success("Faculty account options retrieved", service.facultyOptions(search, includeFacultyId, pageable));
    }

    @PostMapping
    public ApiResponse<ProvisionedUserResponse> create(@Valid @RequestBody UserRequest request) {
        return ApiResponse.success("Account created; copy the temporary credential now", service.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> get(@PathVariable UUID id) {
        return ApiResponse.success("Account retrieved", service.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable UUID id, @Valid @RequestBody UserRequest request) {
        return ApiResponse.success("Account updated", service.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<UserResponse> status(@PathVariable UUID id, @Valid @RequestBody UserStatusRequest request) {
        return ApiResponse.success("Account status updated", service.setStatus(id, request));
    }

    @PostMapping("/{id}/reset-password")
    public ApiResponse<ProvisionedUserResponse> reset(@PathVariable UUID id,
                                                       @Valid @RequestBody PasswordResetRequest request) {
        return ApiResponse.success("Password reset; copy the temporary credential now", service.resetPassword(id, request));
    }

    @PostMapping("/{id}/unlock")
    public ApiResponse<UserResponse> unlock(@PathVariable UUID id, @Valid @RequestBody AuditReasonRequest request) {
        return ApiResponse.success("Account unlocked", service.unlock(id, request));
    }

    @GetMapping("/{id}/sessions")
    public ApiResponse<List<SessionResponse>> sessions(@PathVariable UUID id) {
        return ApiResponse.success("Account sessions retrieved", service.accountSessions(id));
    }

    @DeleteMapping("/{id}/sessions/{sessionId}")
    public ApiResponse<Void> revokeSession(@PathVariable UUID id, @PathVariable UUID sessionId,
                                           @Valid @RequestBody ReasonRequest request) {
        service.revokeAccountSession(id, sessionId, request.auditReason());
        return ApiResponse.success("Session revoked");
    }

    @PostMapping("/{id}/sessions/revoke-all")
    public ApiResponse<Integer> revokeAllSessions(@PathVariable UUID id,
                                                   @Valid @RequestBody AuditReasonRequest request) {
        return ApiResponse.success("All account sessions revoked", service.revokeAllAccountSessions(id, request));
    }

    @GetMapping("/{id}/security-activity")
    public ApiResponse<List<AuditLogResponse>> activity(@PathVariable UUID id) {
        return ApiResponse.success("Security activity retrieved", service.securityActivity(id));
    }

    @GetMapping("/identity-conflicts")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<List<IdentityConflictResponse>> conflicts() {
        return ApiResponse.success("Identity conflicts retrieved", service.identityConflicts());
    }

    @PostMapping("/{id}/reconcile-identity")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<UserResponse> reconcile(@PathVariable UUID id,
                                                @Valid @RequestBody AuditReasonRequest request) {
        return ApiResponse.success("Account identity reconciled", service.reconcileIdentity(id, request));
    }
}
