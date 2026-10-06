package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.AuditService;
import com.secureexam.service.ExamService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.ExamRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exams")
public class ExamController {
    private final FirestoreService firestore;
    private final ExamService exams;
    private final AuditService audit;

    public ExamController(FirestoreService firestore, ExamService exams, AuditService audit) {
        this.firestore = firestore;
        this.exams = exams;
        this.audit = audit;
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

    @DeleteMapping("/{examId}")
    @PreAuthorize("hasRole('ADMIN')")
    ResponseEntity<Void> delete(@AuthenticationPrincipal AppUser user, @PathVariable String examId,
                                HttpServletRequest request) throws Exception {
        Map<String, Object> exam = firestore.get("exams", examId);
        if (exam == null) throw new IllegalArgumentException("Exam not found");
        // Delete related key shares
        List<Map<String, Object>> shares = firestore.where("keyShares", "examId", examId);
        for (Map<String, Object> share : shares) {
            firestore.delete("keyShares", (String) share.get("shareId"));
        }
        // Delete exam paper if it exists
        if (firestore.get("examPapers", examId) != null) {
            firestore.delete("examPapers", examId);
        }
        // Delete exam assignments
        List<Map<String, Object>> assignments = firestore.where("examAssignments", "examId", examId);
        for (Map<String, Object> assignment : assignments) {
            firestore.delete("examAssignments", (String) assignment.get("assignmentId"));
        }
        firestore.delete("exams", examId);
        audit.record(user, "EXAM_DELETED", examId, true, Map.of("title", exam.getOrDefault("title", "")), request);
        return ResponseEntity.noContent().build();
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

