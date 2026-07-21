package com.school.sis.schedule.service;

import com.school.sis.audit.AuditModule;
import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.common.exception.NotFoundException;
import com.school.sis.schedule.dto.ScheduleLoadPolicyRequest;
import com.school.sis.schedule.dto.ScheduleLoadPolicyResponse;
import com.school.sis.schedule.entity.ScheduleLoadPolicy;
import com.school.sis.schedule.repository.ScheduleLoadPolicyRepository;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.setup.entity.Semester;
import com.school.sis.setup.repository.SchoolYearRepository;
import com.school.sis.setup.repository.SemesterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ScheduleLoadPolicyService {
    private final ScheduleLoadPolicyRepository policies;
    private final SchoolYearRepository schoolYears;
    private final SemesterRepository semesters;
    private final UserRepository users;
    private final AuditService auditService;

    public ScheduleLoadPolicyService(ScheduleLoadPolicyRepository policies, SchoolYearRepository schoolYears,
                                     SemesterRepository semesters, UserRepository users, AuditService auditService) {
        this.policies = policies;
        this.schoolYears = schoolYears;
        this.semesters = semesters;
        this.users = users;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ScheduleLoadPolicyResponse> list(UUID schoolYearId, UUID semesterId) {
        return policies.findBySchoolYearIdAndSemesterIdAndActiveTrueOrderByFacultyTypeAsc(schoolYearId, semesterId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ScheduleLoadPolicyResponse create(ScheduleLoadPolicyRequest request, SisUserDetails principal) {
        ScheduleLoadPolicy policy = new ScheduleLoadPolicy();
        apply(policy, request);
        policy.setCreatedBy(resolveUser(principal));
        ensureUnique(policy, UUID.randomUUID());
        policies.saveAndFlush(policy);
        ScheduleLoadPolicyResponse response = toResponse(policy);
        auditService.log("SCHEDULE_LOAD_POLICY_CREATED", AuditModule.SCHEDULE, "ScheduleLoadPolicy", policy.getId(), null, response);
        return response;
    }

    @Transactional
    public ScheduleLoadPolicyResponse update(UUID id, ScheduleLoadPolicyRequest request) {
        ScheduleLoadPolicy policy = find(id);
        ScheduleLoadPolicyResponse before = toResponse(policy);
        apply(policy, request);
        ensureUnique(policy, id);
        policies.saveAndFlush(policy);
        ScheduleLoadPolicyResponse after = toResponse(policy);
        auditService.log("SCHEDULE_LOAD_POLICY_UPDATED", AuditModule.SCHEDULE, "ScheduleLoadPolicy", id, before, after);
        return after;
    }

    @Transactional
    public void delete(UUID id) {
        ScheduleLoadPolicy policy = find(id);
        ScheduleLoadPolicyResponse before = toResponse(policy);
        policy.setActive(false);
        policies.saveAndFlush(policy);
        auditService.log("SCHEDULE_LOAD_POLICY_DEACTIVATED", AuditModule.SCHEDULE, "ScheduleLoadPolicy", id, before, toResponse(policy));
    }

    private void apply(ScheduleLoadPolicy policy, ScheduleLoadPolicyRequest request) {
        SchoolYear schoolYear = schoolYears.findById(request.schoolYearId())
                .orElseThrow(() -> new NotFoundException("School year not found"));
        Semester semester = semesters.findById(request.semesterId())
                .orElseThrow(() -> new NotFoundException("Semester not found"));
        policy.setSchoolYear(schoolYear);
        policy.setSemester(semester);
        policy.setFacultyType(request.facultyType());
        policy.setMaximumWeeklyContactHours(request.maximumWeeklyContactHours());
        policy.setMaximumActiveClasses(request.maximumActiveClasses());
        policy.setActive(request.active() == null || request.active());
    }

    private void ensureUnique(ScheduleLoadPolicy policy, UUID ignoreId) {
        if (!policy.isActive()) return;
        boolean duplicate = policy.getFacultyType() == null
                ? policies.existsBySchoolYearIdAndSemesterIdAndFacultyTypeIsNullAndActiveTrueAndIdNot(
                    policy.getSchoolYear().getId(), policy.getSemester().getId(), ignoreId)
                : policies.existsBySchoolYearIdAndSemesterIdAndFacultyTypeAndActiveTrueAndIdNot(
                    policy.getSchoolYear().getId(), policy.getSemester().getId(), policy.getFacultyType(), ignoreId);
        if (duplicate) throw new BusinessRuleException("LOAD_POLICY_DUPLICATE", "An active policy already exists for this term and faculty type");
    }

    private ScheduleLoadPolicy find(UUID id) {
        return policies.findById(id).orElseThrow(() -> new NotFoundException("Schedule load policy not found"));
    }

    private User resolveUser(SisUserDetails principal) {
        return principal == null ? null : users.findById(principal.id()).orElse(null);
    }

    private ScheduleLoadPolicyResponse toResponse(ScheduleLoadPolicy policy) {
        return new ScheduleLoadPolicyResponse(policy.getId(), policy.getSchoolYear().getId(),
                policy.getSchoolYear().getSchoolYear(), policy.getSemester().getId(), policy.getSemester().getName(),
                policy.getFacultyType(), policy.getMaximumWeeklyContactHours(), policy.getMaximumActiveClasses(), policy.isActive());
    }
}
