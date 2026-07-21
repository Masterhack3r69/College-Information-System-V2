package com.school.sis.schedule.controller;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.response.ApiResponse;
import com.school.sis.schedule.dto.ScheduleLoadPolicyRequest;
import com.school.sis.schedule.dto.ScheduleLoadPolicyResponse;
import com.school.sis.schedule.service.ScheduleLoadPolicyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/schedule-load-policies")
@PreAuthorize("hasAuthority('SCHEDULE_POLICY_MANAGE')")
public class ScheduleLoadPolicyController {
    private final ScheduleLoadPolicyService service;

    public ScheduleLoadPolicyController(ScheduleLoadPolicyService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<ScheduleLoadPolicyResponse>> list(@RequestParam UUID schoolYearId,
                                                               @RequestParam UUID semesterId) {
        return ApiResponse.success("Schedule load policies retrieved", service.list(schoolYearId, semesterId));
    }

    @PostMapping
    public ApiResponse<ScheduleLoadPolicyResponse> create(@Valid @RequestBody ScheduleLoadPolicyRequest request,
                                                           @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Schedule load policy created", service.create(request, principal));
    }

    @PutMapping("/{id}")
    public ApiResponse<ScheduleLoadPolicyResponse> update(@PathVariable UUID id,
                                                           @Valid @RequestBody ScheduleLoadPolicyRequest request) {
        return ApiResponse.success("Schedule load policy updated", service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ApiResponse.success("Schedule load policy deactivated");
    }
}
