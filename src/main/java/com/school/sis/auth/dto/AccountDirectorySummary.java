package com.school.sis.auth.dto;

public record AccountDirectorySummary(long total, long active, long inactive, long locked,
                                      long forcedChange, long system, long faculty, long student) {}
