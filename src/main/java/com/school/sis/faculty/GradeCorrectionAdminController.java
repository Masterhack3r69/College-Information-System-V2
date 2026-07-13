package com.school.sis.faculty;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/grade-corrections")
public class GradeCorrectionAdminController {
    private final GradeCorrectionAdminService service;
    public GradeCorrectionAdminController(GradeCorrectionAdminService service){this.service=service;}
    @GetMapping @PreAuthorize("hasAnyAuthority('GRADE_REVIEW','GRADE_LOCK')") public ApiResponse<List<Map<String,Object>>> queue(@RequestParam(required=false) String status,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Correction queue retrieved",service.queue(status,p));}
    @PostMapping("/{id}/review") @PreAuthorize("hasAuthority('GRADE_REVIEW')") public ApiResponse<Map<String,Object>> review(@PathVariable UUID id,@Valid @RequestBody ReviewRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Correction request reviewed",service.review(id,r.version(),r.approve(),r.comment(),p));}
    @PostMapping("/{id}/post") @PreAuthorize("hasAuthority('GRADE_LOCK')") public ApiResponse<Map<String,Object>> post(@PathVariable UUID id,@Valid @RequestBody PostRequest r,@AuthenticationPrincipal SisUserDetails p){return ApiResponse.success("Grade correction posted",service.post(id,r.version(),r.comment(),p));}
    public record ReviewRequest(@Min(0) int version,boolean approve,String comment){}
    public record PostRequest(@Min(0) int version,String comment){}
}
