package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.ExamService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.ExamRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exams")
public class ExamController {
    private final FirestoreService firestore;
    private final ExamService exams;

    public ExamController(FirestoreService firestore, ExamService exams) {
        this.firestore = firestore;
        this.exams = exams;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','EXAM_CONTROLLER')")
    Object list() throws Exception {
        return firestore.all("exams");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    Object create(@AuthenticationPrincipal AppUser user, @Valid @RequestBody ExamRequest body) throws Exception {
        return exams.createExam(user, body);
    }

    @PostMapping("/{examId}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    Object lock(@AuthenticationPrincipal AppUser user, @PathVariable String examId, HttpServletRequest request) throws Exception {
        return exams.lockPaper(user, examId, request);
    }

    @GetMapping("/{examId}/paper-status")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','EXAM_CONTROLLER')")
    Object paperStatus(@PathVariable String examId) throws Exception {
        Map<String, Object> paper = firestore.get("examPapers", examId);
        if (paper == null) throw new IllegalArgumentException("Paper not found");
        Map<String, Object> result = new java.util.LinkedHashMap<>(paper);
        result.remove("encryptedPayload");
        result.remove("iv");
        return result;
    }
}

