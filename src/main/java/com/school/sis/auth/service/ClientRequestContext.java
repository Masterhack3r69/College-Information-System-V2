package com.school.sis.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class ClientRequestContext {
    public String ipAddress() {
        HttpServletRequest request = request();
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    public String userAgent() {
        HttpServletRequest request = request();
        return request == null ? null : request.getHeader("User-Agent");
    }

    private HttpServletRequest request() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? attributes.getRequest() : null;
    }
}
