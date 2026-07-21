package com.school.sis.setup.dto;

import com.school.sis.setup.entity.ActiveStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RoomRequest(
        @NotBlank String roomCode,
        @NotBlank String roomName,
        @Min(0) Integer capacity,
        String building,
        @NotBlank String roomType,
        ActiveStatus status
) {
    public RoomRequest(String roomCode, String roomName, Integer capacity, ActiveStatus status) {
        this(roomCode, roomName, capacity, null, "GENERAL", status);
    }
}
