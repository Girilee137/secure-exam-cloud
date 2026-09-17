package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.AuditService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.QuestionRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/questions")
@PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
public class QuestionController {
    private final FirestoreService firestore;
    private final AuditService audit;

    public QuestionController(FirestoreService firestore, AuditService audit) {
        this.firestore = firestore;
        this.audit = audit;
    }

    @GetMapping
    Object list(@RequestParam(required = false) String subjectId,
                @RequestParam(required = false) String topic,
                @RequestParam(required = false) String difficulty,
                @RequestParam(required = false) Integer marks,
                @RequestParam(required = false) String search) throws Exception {
        List<Map<String, Object>> questions = subjectId == null || subjectId.isBlank()
                ? firestore.all("questions")
                : firestore.where("questions", "subjectId", subjectId);
        return questions.stream()
                .filter(q -> Boolean.TRUE.equals(q.get("active")))
                .filter(q -> topic == null || topic.isBlank() || topic.equalsIgnoreCase(String.valueOf(q.get("topic"))))
                .filter(q -> difficulty == null || difficulty.isBlank() || difficulty.equalsIgnoreCase(String.valueOf(q.get("difficulty"))))
                .filter(q -> marks == null || q.get("marks") == null || marks.equals(((Number) q.get("marks")).intValue()))
                .filter(q -> search == null || search.isBlank() || String.valueOf(q.get("questionText")).toLowerCase().contains(search.toLowerCase()))
                .toList();
    }

    @PostMapping
    Object create(@AuthenticationPrincipal AppUser user, @Valid @RequestBody QuestionRequest body, HttpServletRequest request)
            throws Exception {
        validate(body);
        String id = java.util.UUID.randomUUID().toString();
        Map<String, Object> q = baseQuestion(id, user.uid(), body);
        q.put("createdAt", Instant.now().toString());
        firestore.set("questions", id, q);
        audit.record(user, "QUESTION_CREATED", "", true, Map.of("questionId", id), request);
        return q;
    }

    @PutMapping("/{id}")
    Object update(@AuthenticationPrincipal AppUser user, @PathVariable String id, @Valid @RequestBody QuestionRequest body,
                  HttpServletRequest request) throws Exception {
        validate(body);
        Map<String, Object> existing = firestore.get("questions", id);
        if (existing == null) throw new IllegalArgumentException("Question not found");
        if (!"ADMIN".equals(user.role()) && !user.uid().equals(existing.get("createdBy"))) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized to edit this question");
        }
        Map<String, Object> q = baseQuestion(id, (String) existing.get("createdBy"), body);
        q.put("createdAt", existing.get("createdAt"));
        firestore.set("questions", id, q);
        audit.record(user, "QUESTION_UPDATED", "", true, Map.of("questionId", id), request);
        return q;
    }

    @DeleteMapping("/{id}")
    Object deactivate(@AuthenticationPrincipal AppUser user, @PathVariable String id, HttpServletRequest request) throws Exception {
        Map<String, Object> existing = firestore.get("questions", id);
        if (existing == null) throw new IllegalArgumentException("Question not found");
        if (!"ADMIN".equals(user.role()) && !user.uid().equals(existing.get("createdBy"))) {
            throw new org.springframework.security.access.AccessDeniedException("Not authorized to delete this question");
        }
        firestore.update("questions", id, Map.of("active", false, "updatedAt", Instant.now().toString()));
        audit.record(user, "QUESTION_DEACTIVATED", "", true, Map.of("questionId", id), request);
        return Map.of("questionId", id, "active", false);
    }

    private Map<String, Object> baseQuestion(String id, String createdBy, QuestionRequest body) {
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("questionId", id);
        q.put("subjectId", body.subjectId());
        q.put("questionText", body.questionText());
        q.put("options", body.options());
        q.put("correctAnswer", body.correctAnswer());
        q.put("marks", body.marks());
        q.put("difficulty", body.difficulty());
        q.put("topic", body.topic());
        q.put("createdBy", createdBy);
        q.put("updatedAt", Instant.now().toString());
        q.put("active", true);
        return q;
    }

    private void validate(QuestionRequest body) {
        if (body.options().stream().map(String::trim).distinct().count() != 4) {
            throw new IllegalArgumentException("Options must be four distinct values");
        }
    }
}

