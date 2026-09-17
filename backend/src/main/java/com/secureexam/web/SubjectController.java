package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.AuditService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.SubjectRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {
    private final FirestoreService firestore;
    private final AuditService audit;

    public SubjectController(FirestoreService firestore, AuditService audit) {
        this.firestore = firestore;
        this.audit = audit;
    }

    @GetMapping
    Object list() throws Exception {
        return firestore.all("subjects");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    Object create(@AuthenticationPrincipal AppUser user, @Valid @RequestBody SubjectRequest body, HttpServletRequest request)
            throws Exception {
        String id = java.util.UUID.randomUUID().toString();
        Map<String, Object> subject = new LinkedHashMap<>();
        subject.put("subjectId", id);
        subject.put("name", body.name());
        subject.put("code", body.code() == null ? "" : body.code());
        subject.put("active", true);
        subject.put("createdAt", Instant.now().toString());
        subject.put("updatedAt", Instant.now().toString());
        firestore.set("subjects", id, subject);
        audit.record(user, "SUBJECT_CREATED", "", true, Map.of("subjectId", id), request);
        return subject;
    }
}

