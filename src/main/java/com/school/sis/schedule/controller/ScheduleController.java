package com.school.sis.schedule.controller;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.response.ApiResponse;
import com.school.sis.common.response.PageResponse;
import com.school.sis.schedule.dto.FacultyLoadResponse;
import com.school.sis.schedule.dto.RoomAvailabilityResponse;
import com.school.sis.schedule.dto.ScheduleChangeHistoryResponse;
import com.school.sis.schedule.dto.ScheduleConflictRequest;
import com.school.sis.schedule.dto.ScheduleConflictResponse;
import com.school.sis.schedule.dto.ScheduleCopyPreviewResponse;
import com.school.sis.schedule.dto.ScheduleCopyResultResponse;
import com.school.sis.schedule.dto.ScheduleCopyTermRequest;
import com.school.sis.schedule.dto.ScheduleLifecycleRequest;
import com.school.sis.schedule.dto.ScheduleRequest;
import com.school.sis.schedule.dto.ScheduleResponse;
import com.school.sis.schedule.dto.ScheduleRevisionRequest;
import com.school.sis.schedule.dto.ScheduleSearchCriteria;
import com.school.sis.schedule.entity.ScheduleStatus;
import com.school.sis.schedule.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
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

import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCHEDULE_VIEW')")
    public ApiResponse<PageResponse<ScheduleResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID schoolYearId,
            @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) UUID programId,
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) UUID facultyId,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) DayOfWeek dayOfWeek,
            @RequestParam(required = false) ScheduleStatus status,
            @RequestParam(required = false) UUID curriculumId,
            @RequestParam(required = false) Integer yearLevel,
            Pageable pageable,
            @AuthenticationPrincipal SisUserDetails principal
    ) {
        ScheduleSearchCriteria criteria = new ScheduleSearchCriteria(search, schoolYearId, semesterId, programId,
                sectionId, facultyId, roomId, courseId, dayOfWeek, status, curriculumId, yearLevel);
        return ApiResponse.success("Schedules retrieved", scheduleService.list(criteria, pageable, principal));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleResponse> create(@Valid @RequestBody ScheduleRequest request) {
        return ApiResponse.success("Draft schedule created", scheduleService.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCHEDULE_VIEW')")
    public ApiResponse<ScheduleResponse> get(@PathVariable UUID id, @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Schedule retrieved", scheduleService.get(id, principal));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleResponse> update(@PathVariable UUID id, @Valid @RequestBody ScheduleRequest request) {
        return ApiResponse.success("Draft schedule updated", scheduleService.update(id, request));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleResponse> activate(@PathVariable UUID id,
                                                   @Valid @RequestBody ScheduleLifecycleRequest request,
                                                   @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Schedule activated", scheduleService.activate(id, request, principal));
    }

    @PostMapping("/{id}/revise")
    @PreAuthorize("hasAuthority('SCHEDULE_REVISE')")
    public ApiResponse<ScheduleResponse> revise(@PathVariable UUID id,
                                                 @Valid @RequestBody ScheduleRevisionRequest request,
                                                 @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Schedule revised", scheduleService.revise(id, request, principal));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleResponse> cancel(@PathVariable UUID id,
                                                 @Valid @RequestBody ScheduleLifecycleRequest request) {
        return ApiResponse.success("Schedule cancelled", scheduleService.cancel(id, request));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleResponse> archive(@PathVariable UUID id,
                                                  @Valid @RequestBody ScheduleLifecycleRequest request) {
        return ApiResponse.success("Schedule archived", scheduleService.archive(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        scheduleService.delete(id);
        return ApiResponse.success("Schedule archived");
    }

    @PostMapping("/check-conflict")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleConflictResponse> checkConflict(@Valid @RequestBody ScheduleConflictRequest request) {
        return ApiResponse.success("Schedule conflict check completed", scheduleService.checkConflict(request));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('SCHEDULE_VIEW')")
    public ApiResponse<List<ScheduleChangeHistoryResponse>> history(@PathVariable UUID id,
                                                                    @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Schedule history retrieved", scheduleService.history(id, principal));
    }

    @GetMapping("/timetables/sections/{sectionId}")
    @PreAuthorize("hasAuthority('SCHEDULE_VIEW')")
    public ApiResponse<List<ScheduleResponse>> sectionTimetable(
            @PathVariable UUID sectionId,
            @RequestParam UUID schoolYearId,
            @RequestParam UUID semesterId,
            @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Section timetable retrieved",
                scheduleService.sectionTimetable(sectionId, schoolYearId, semesterId, principal));
    }

    @GetMapping("/timetables/faculty/{facultyId}/load")
    @PreAuthorize("hasAuthority('SCHEDULE_VIEW')")
    public ApiResponse<FacultyLoadResponse> facultyLoad(
            @PathVariable UUID facultyId,
            @RequestParam UUID schoolYearId,
            @RequestParam UUID semesterId,
            @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Faculty teaching load retrieved",
                scheduleService.facultyLoad(facultyId, schoolYearId, semesterId, principal));
    }

    @GetMapping("/timetables/rooms")
    @PreAuthorize("hasAuthority('SCHEDULE_VIEW')")
    public ApiResponse<List<RoomAvailabilityResponse>> roomAvailability(
            @RequestParam UUID schoolYearId,
            @RequestParam UUID semesterId,
            @RequestParam(required = false) DayOfWeek dayOfWeek,
            @AuthenticationPrincipal SisUserDetails principal) {
        return ApiResponse.success("Room availability retrieved",
                scheduleService.roomAvailability(schoolYearId, semesterId, dayOfWeek, principal));
    }

    @PostMapping("/copy-term/preview")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleCopyPreviewResponse> previewCopy(@Valid @RequestBody ScheduleCopyTermRequest request) {
        return ApiResponse.success("Term copy preview completed", scheduleService.previewCopy(request));
    }

    @PostMapping("/copy-term")
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public ApiResponse<ScheduleCopyResultResponse> copyTerm(@Valid @RequestBody ScheduleCopyTermRequest request) {
        return ApiResponse.success("Term schedules copied as drafts", scheduleService.copyTerm(request));
    }
}
