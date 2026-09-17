package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.AuditService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.AssignmentRequest;
import com.secureexam.web.Requests.UserRoleRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final FirestoreService firestore;
    private final AuditService audit;

    public AdminController(FirestoreService firestore, AuditService audit) {
        this.firestore = firestore;
        this.audit = audit;
    }

    @GetMapping("/users")
    Object users() throws Exception {
        return firestore.all("users");
    }

    @PutMapping("/users/{uid}")
    Object upsertUser(@AuthenticationPrincipal AppUser actor, @PathVariable String uid, @Valid @RequestBody UserRoleRequest body,
                      HttpServletRequest request) throws Exception {
        if (!uid.equals(body.uid())) throw new IllegalArgumentException("Path uid and body uid must match");
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("uid", uid);
        user.put("phoneNumber", body.phoneNumber() == null ? "" : body.phoneNumber());
        user.put("displayName", body.displayName() == null ? "" : body.displayName());
        user.put("email", body.email() == null ? "" : body.email());
        user.put("role", body.role());
        user.put("status", body.status());
        user.put("updatedAt", Instant.now().toString());
        Map<String, Object> existing = firestore.get("users", uid);
        user.put("createdAt", existing == null ? Instant.now().toString() : existing.get("createdAt"));
        firestore.set("users", uid, user);
        audit.record(actor, "USER_UPSERTED", "", true, Map.of("targetUid", uid, "role", body.role()), request);
        return user;
    }

    @PostMapping("/assignments")
    Object assign(@AuthenticationPrincipal AppUser actor, @Valid @RequestBody AssignmentRequest body, HttpServletRequest request)
            throws Exception {
        String id = body.examId() + "-" + body.studentUid();
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("assignmentId", id);
        doc.put("examId", body.examId());
        doc.put("studentUid", body.studentUid());
        doc.put("createdAt", Instant.now().toString());
        firestore.set("examAssignments", id, doc);
        audit.record(actor, "STUDENT_ASSIGNED", body.examId(), true, Map.of("studentUid", body.studentUid()), request);
        return doc;
    }

    @GetMapping("/audit-logs")
    Object auditLogs() throws Exception {
        return firestore.latest("auditLogs", 100);
    }
}

