package com.school.sis.auth.service;

import com.school.sis.common.exception.BusinessRuleException;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class PasswordSecurityService {
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%&*+-?";
    private static final String ALL = UPPER + LOWER + DIGITS + SYMBOLS;
    private final SecureRandom random = new SecureRandom();

    public void validateChosenPassword(String password) {
        if (password == null || password.length() < 12 || password.length() > 128
                || password.chars().noneMatch(Character::isLetter)
                || password.chars().noneMatch(Character::isDigit)) {
            throw new BusinessRuleException("PASSWORD_POLICY_FAILED",
                    "Password must be 12 to 128 characters and contain at least one letter and one number");
        }
    }

    public String temporaryPassword() {
        char[] value = new char[20];
        value[0] = random(UPPER);
        value[1] = random(LOWER);
        value[2] = random(DIGITS);
        value[3] = random(SYMBOLS);
        for (int i = 4; i < value.length; i++) value[i] = random(ALL);
        for (int i = value.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char swap = value[i]; value[i] = value[j]; value[j] = swap;
        }
        return new String(value);
    }

    private char random(String alphabet) { return alphabet.charAt(random.nextInt(alphabet.length())); }
}
