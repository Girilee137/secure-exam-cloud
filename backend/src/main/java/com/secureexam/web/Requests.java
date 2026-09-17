package com.secureexam.web;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class Requests {
    private Requests() {}

    public record SubjectRequest(@NotBlank String name, String code) {}

    public record QuestionRequest(
            @NotBlank String subjectId,
            @NotBlank String questionText,
            @Size(min = 4, max = 4) List<@NotBlank String> options,
            @Min(0) @Max(3) int correctAnswer,
            @Min(1) int marks,
            @NotBlank String difficulty,
            @NotBlank String topic) {}

    public record ExamRequest(
            @NotBlank String title,
            @NotBlank String subjectId,
            String description,
            @NotNull Instant scheduledStart,
            @NotNull Instant scheduledEnd,
            @Min(1) int durationMinutes,
            @Min(1) int questionCount) {}

    public record UserRoleRequest(
            @NotBlank String uid,
            @NotBlank @Pattern(regexp = "ADMIN|TEACHER|EXAM_CONTROLLER|STUDENT", message = "Invalid role") String role,
            @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE", message = "Invalid status") String status,
            String displayName,
            String phoneNumber,
            String email) {}

    public record AssignmentRequest(@NotBlank String examId, @NotBlank String studentUid) {}

    public record SubmissionRequest(@NotBlank String examId, @NotNull Map<String, Integer> answers) {}
 
    public record RegisterRequest(
            String displayName,
            @NotBlank @Pattern(regexp = "ADMIN|TEACHER|EXAM_CONTROLLER|STUDENT", message = "Invalid role") String role) {}
}

