package com.school.sis.grade.controller;
import com.school.sis.common.response.ApiResponse; import com.school.sis.grade.dto.*; import com.school.sis.grade.service.GradingSetupService; import jakarta.validation.Valid; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/v1/grading-setup") @PreAuthorize("hasAuthority('ACADEMIC_SETUP_VIEW')") public class GradingSetupController {
 private final GradingSetupService service; public GradingSetupController(GradingSetupService s){service=s;}
 @GetMapping("/scales") public ApiResponse<List<GradingScaleResponse>> scales(){return ApiResponse.success("Grading scales retrieved",service.scales());}
 @GetMapping("/scales/{id}") public ApiResponse<GradingScaleResponse> scale(@PathVariable UUID id){return ApiResponse.success("Grading scale retrieved",service.scale(id));}
 @PostMapping("/scales") @PreAuthorize("hasAuthority('ACADEMIC_SETUP_MANAGE')") public ApiResponse<GradingScaleResponse> createScale(@Valid @RequestBody GradingScaleRequest r){return ApiResponse.success("Grading scale created",service.saveScale(null,r));}
 @PutMapping("/scales/{id}") @PreAuthorize("hasAuthority('ACADEMIC_SETUP_MANAGE')") public ApiResponse<GradingScaleResponse> updateScale(@PathVariable UUID id,@Valid @RequestBody GradingScaleRequest r){return ApiResponse.success("Grading scale updated",service.saveScale(id,r));}
 @GetMapping("/templates") public ApiResponse<List<GradingTemplateResponse>> templates(@RequestParam(required=false) UUID programId,@RequestParam(required=false) UUID courseId){return ApiResponse.success("Grading templates retrieved",service.templates(programId,courseId));}
 @GetMapping("/templates/{id}") public ApiResponse<GradingTemplateResponse> template(@PathVariable UUID id){return ApiResponse.success("Grading template retrieved",service.template(id));}
 @PostMapping("/templates") @PreAuthorize("hasAuthority('ACADEMIC_SETUP_MANAGE')") public ApiResponse<GradingTemplateResponse> createTemplate(@Valid @RequestBody GradingTemplateRequest r){return ApiResponse.success("Grading template created",service.saveTemplate(null,r));}
 @PutMapping("/templates/{id}") @PreAuthorize("hasAuthority('ACADEMIC_SETUP_MANAGE')") public ApiResponse<GradingTemplateResponse> updateTemplate(@PathVariable UUID id,@Valid @RequestBody GradingTemplateRequest r){return ApiResponse.success("Grading template updated",service.saveTemplate(id,r));}
}
