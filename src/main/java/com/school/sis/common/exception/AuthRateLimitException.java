package com.school.sis.common.exception;

public class AuthRateLimitException extends RuntimeException {
    private final long retryAfterSeconds;

    public AuthRateLimitException(long retryAfterSeconds) {
        super("Too many login attempts. Try again later.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
