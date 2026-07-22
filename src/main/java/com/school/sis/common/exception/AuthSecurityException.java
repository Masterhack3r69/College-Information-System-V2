package com.school.sis.common.exception;

public class AuthSecurityException extends RuntimeException {
    private final String code;

    public AuthSecurityException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}
