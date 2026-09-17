package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.AuditService;
import com.secureexam.service.ExamService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.SubmissionRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasAnyRole('STUDENT','ADMIN')")
public class StudentController {
    private final FirestoreService firestore;
    private final ExamService exams;
    private final AuditService audit;

    public StudentController(FirestoreService firestore, ExamService exams, AuditService audit) {
        this.firestore = firestore;
        this.exams = exams;
        this.audit = audit;
    }

    @GetMapping("/exams")
    Object assigned(@AuthenticationPrincipal AppUser user) throws Exception {
        return firestore.where("examAssignments", "studentUid", user.uid()).stream()
                .map(a -> {
                    try {
                        return firestore.get("exams", (String) a.get("examId"));
                    } catch (Exception e) {
                        return Map.of();
                    }
                })
                .filter(e -> !e.isEmpty())
                .toList();
    }

    @GetMapping("/exams/{examId}/paper")
    Object paper(@AuthenticationPrincipal AppUser user, @PathVariable String examId) throws Exception {
        return exams.studentPaper(user, examId);
    }

    @PostMapping("/submissions")
    Object submit(@AuthenticationPrincipal AppUser user, @Valid @RequestBody SubmissionRequest body, HttpServletRequest request)
            throws Exception {
        String id = body.examId() + "-" + user.uid();
        if (firestore.get("submissions", id) != null) {
            throw new IllegalStateException("You have already submitted this exam");
        }

        Map<String, Object> paper = exams.studentPaper(user, body.examId());
        int score = 0;
        int total = 0;
        for (Object item : (java.util.List<?>) paper.get("questions")) {
            Map<?, ?> q = (Map<?, ?>) item;
            Map<String, Object> full = firestore.get("questions", (String) q.get("questionId"));
            if (full == null) continue;
            int marks = full.get("marks") != null ? ((Number) full.get("marks")).intValue() : 0;
            total += marks;
            Integer answer = body.answers().get(q.get("questionId"));
            Number correctAns = (Number) full.get("correctAnswer");
            if (answer != null && correctAns != null && answer.equals(correctAns.intValue())) {
                score += marks;
            }
        }

        Map<String, Object> submission = new LinkedHashMap<>();
        submission.put("submissionId", id);
        submission.put("examId", body.examId());
        submission.put("studentUid", user.uid());
        submission.put("answers", body.answers());
        submission.put("score", score);
        submission.put("totalMarks", total);
        submission.put("submittedAt", Instant.now().toString());
        firestore.set("submissions", id, submission);
        audit.record(user, "SUBMISSION_RECEIVED", body.examId(), true, Map.of("score", score, "totalMarks", total), request);
        return Map.of("submissionId", id, "score", score, "totalMarks", total, "submittedAt", submission.get("submittedAt"));
    }
}

