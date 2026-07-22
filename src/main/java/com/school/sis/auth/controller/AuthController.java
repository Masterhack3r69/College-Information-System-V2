package com.school.sis.auth.controller;

import com.school.sis.auth.dto.AuthResponse;
import com.school.sis.auth.dto.LoginRequest;
import com.school.sis.auth.dto.RefreshRequest;
import com.school.sis.auth.dto.UserSummary;
import com.school.sis.auth.dto.SessionResponse;
import com.school.sis.auth.dto.PasswordChangeRequest;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.auth.service.AuthService;
import com.school.sis.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("Login successful", authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.success("Token refreshed", authService.refresh(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request);
        return ApiResponse.success("Logout successful");
    }

    @GetMapping("/me")
    public ApiResponse<UserSummary> me(@AuthenticationPrincipal SisUserDetails userDetails) {
        return ApiResponse.success("User retrieved", authService.summarize(userDetails));
    }

    @GetMapping("/sessions")
    public ApiResponse<List<SessionResponse>> sessions(@AuthenticationPrincipal SisUserDetails userDetails) {
        return ApiResponse.success("Sessions retrieved", authService.sessions(userDetails));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ApiResponse<Void> revokeSession(@PathVariable UUID sessionId,
                                           @AuthenticationPrincipal SisUserDetails userDetails) {
        authService.revokeSession(userDetails, sessionId);
        return ApiResponse.success("Session revoked");
    }

    @PostMapping("/sessions/revoke-others")
    public ApiResponse<Integer> revokeOthers(@AuthenticationPrincipal SisUserDetails userDetails) {
        return ApiResponse.success("Other sessions revoked", authService.revokeOtherSessions(userDetails));
    }

    @PutMapping("/password")
    public ApiResponse<AuthResponse> changePassword(@Valid @RequestBody PasswordChangeRequest request,
                                                     @AuthenticationPrincipal SisUserDetails userDetails) {
        return ApiResponse.success("Password changed", authService.changePassword(userDetails, request));
    }
}
