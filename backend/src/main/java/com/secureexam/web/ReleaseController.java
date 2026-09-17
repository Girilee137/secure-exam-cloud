package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.ExamService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/releases")
@PreAuthorize("hasAnyRole('ADMIN','TEACHER','EXAM_CONTROLLER')")
public class ReleaseController {
    private final ExamService exams;

    public ReleaseController(ExamService exams) {
        this.exams = exams;
    }

    @PostMapping("/{examId}/approve")
    Object approve(@AuthenticationPrincipal AppUser user, @PathVariable String examId, HttpServletRequest request) throws Exception {
        return exams.approveRelease(user, examId, request);
    }

    @PostMapping("/{examId}/release")
    Object release(@AuthenticationPrincipal AppUser user, @PathVariable String examId, HttpServletRequest request) throws Exception {
        return exams.releasePaper(user, examId, request);
    }
}

