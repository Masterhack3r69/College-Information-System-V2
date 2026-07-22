package com.school.sis.auth.controller;

import com.school.sis.auth.dto.PermissionResponse;
import com.school.sis.auth.dto.RolePermissionsRequest;
import com.school.sis.auth.dto.RoleResponse;
import com.school.sis.auth.service.UserAdministrationService;
import com.school.sis.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasAuthority('RBAC_MANAGE')")
public class RoleAdministrationController {
    private final UserAdministrationService service;
    public RoleAdministrationController(UserAdministrationService service) { this.service = service; }

    @GetMapping("/roles")
    public ApiResponse<List<RoleResponse>> roles() {
        return ApiResponse.success("Roles retrieved", service.listRoles());
    }

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionResponse>> permissions() {
        return ApiResponse.success("Permissions retrieved", service.listPermissions());
    }

    @PutMapping("/roles/{id}/permissions")
    public ApiResponse<RoleResponse> permissions(@PathVariable UUID id,
                                                  @Valid @RequestBody RolePermissionsRequest request) {
        return ApiResponse.success("Role permissions updated", service.setRolePermissions(id, request));
    }
}
