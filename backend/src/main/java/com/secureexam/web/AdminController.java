package com.secureexam.web;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.secureexam.security.AppUser;
import com.secureexam.service.AuditService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.AssignmentRequest;
import com.secureexam.web.Requests.CreateUserRequest;
import com.secureexam.web.Requests.UserRoleRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/users")
    Object createUser(@AuthenticationPrincipal AppUser actor, @Valid @RequestBody CreateUserRequest body,
                      HttpServletRequest request) throws Exception {
        FirebaseAuth auth = FirebaseAuth.getInstance();
        UserRecord userRecord;
        try {
            UserRecord.CreateRequest req = new UserRecord.CreateRequest()
                    .setEmail(body.email().trim())
                    .setPassword(body.password())
                    .setDisplayName(body.displayName().trim())
                    .setEmailVerified(true);
            userRecord = auth.createUser(req);
        } catch (FirebaseAuthException e) {
            if ("EMAIL_ALREADY_EXISTS".equals(e.getAuthErrorCode().name()) || e.getMessage().contains("email-already-exists")) {
                userRecord = auth.getUserByEmail(body.email().trim());
                auth.updateUser(new UserRecord.UpdateRequest(userRecord.getUid())
                        .setPassword(body.password())
                        .setDisplayName(body.displayName().trim()));
            } else {
                throw new IllegalArgumentException("Failed to create Firebase user: " + e.getMessage());
            }
        }

        Instant now = Instant.now();
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("uid", userRecord.getUid());
        user.put("email", body.email().trim());
        user.put("displayName", body.displayName().trim());
        user.put("phoneNumber", body.phoneNumber() == null ? "" : body.phoneNumber().trim());
        user.put("role", body.role());
        user.put("status", "ACTIVE");
        user.put("studentGroup", body.studentGroup() == null ? "" : body.studentGroup().trim());
        user.put("createdAt", now.toString());
        user.put("updatedAt", now.toString());
        firestore.set("users", userRecord.getUid(), user);

        audit.record(actor, "USER_CREATED", userRecord.getUid(), true,
                Map.of("role", body.role(), "email", body.email().trim(), "displayName", body.displayName().trim()), request);
        return user;
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
        user.put("studentGroup", body.studentGroup() == null ? "" : body.studentGroup().trim());
        user.put("updatedAt", Instant.now().toString());
        Map<String, Object> existing = firestore.get("users", uid);
        user.put("createdAt", existing == null ? Instant.now().toString() : existing.get("createdAt"));
        firestore.set("users", uid, user);
        audit.record(actor, "USER_UPSERTED", "", true, Map.of("targetUid", uid, "role", body.role()), request);
        return user;
    }

    @DeleteMapping("/users/{uid}")
    ResponseEntity<Void> deleteUser(@AuthenticationPrincipal AppUser actor, @PathVariable String uid,
                                    HttpServletRequest request) throws Exception {
        if (actor.uid().equals(uid)) {
            throw new IllegalArgumentException("Cannot delete your own admin account");
        }
        Map<String, Object> target = firestore.get("users", uid);
        if (target != null && "admin@gmail.com".equalsIgnoreCase(String.valueOf(target.get("email")))) {
            throw new IllegalArgumentException("Cannot delete the default admin account");
        }

        try {
            FirebaseAuth.getInstance().deleteUser(uid);
        } catch (Exception ex) {
            // If already deleted in Firebase Auth, proceed with Firestore cleanup
        }

        firestore.delete("users", uid);

        // Delete assignments for this student if any
        List<Map<String, Object>> assignments = firestore.where("examAssignments", "studentUid", uid);
        for (Map<String, Object> a : assignments) {
            firestore.delete("examAssignments", (String) a.get("assignmentId"));
        }

        audit.record(actor, "USER_DELETED", uid, true,
                Map.of("deletedUid", uid, "email", target == null ? "" : target.getOrDefault("email", "")), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments")
    Object assignments() throws Exception {
        return firestore.all("examAssignments");
    }

    @PostMapping("/assignments")
    Object assign(@AuthenticationPrincipal AppUser actor, @Valid @RequestBody AssignmentRequest body, HttpServletRequest request)
            throws Exception {
        String examId = body.examId();
        Map<String, Object> exam = firestore.get("exams", examId);
        String examTitle = exam == null ? examId : String.valueOf(exam.getOrDefault("title", examId));
        Instant now = Instant.now();

        // 1. Group Assignment
        if (body.studentGroup() != null && !body.studentGroup().isBlank()) {
            String targetGroup = body.studentGroup().trim();
            List<Map<String, Object>> allUsers = firestore.all("users");
            List<Map<String, Object>> targetStudents = allUsers.stream()
                    .filter(u -> "STUDENT".equals(u.get("role")))
                    .filter(u -> "ALL".equalsIgnoreCase(targetGroup) || targetGroup.equalsIgnoreCase(String.valueOf(u.get("studentGroup"))))
                    .toList();

            List<Map<String, Object>> created = new ArrayList<>();
            for (Map<String, Object> student : targetStudents) {
                String studentUid = (String) student.get("uid");
                String id = examId + "-" + studentUid;
                Map<String, Object> doc = new LinkedHashMap<>();
                doc.put("assignmentId", id);
                doc.put("examId", examId);
                doc.put("examTitle", examTitle);
                doc.put("studentUid", studentUid);
                doc.put("studentName", student.getOrDefault("displayName", ""));
                doc.put("studentGroup", student.getOrDefault("studentGroup", targetGroup));
                doc.put("assignedAt", now.toString());
                firestore.set("examAssignments", id, doc);
                created.add(doc);
            }

            // Also save the group assignment anchor doc
            String groupDocId = examId + "-group-" + targetGroup.replaceAll("\\s+", "_");
            Map<String, Object> groupDoc = new LinkedHashMap<>();
            groupDoc.put("assignmentId", groupDocId);
            groupDoc.put("examId", examId);
            groupDoc.put("examTitle", examTitle);
            groupDoc.put("studentUid", "");
            groupDoc.put("studentName", "Group: " + targetGroup);
            groupDoc.put("studentGroup", targetGroup);
            groupDoc.put("assignedAt", now.toString());
            firestore.set("examAssignments", groupDocId, groupDoc);

            audit.record(actor, "GROUP_ASSIGNED", examId, true,
                    Map.of("targetGroup", targetGroup, "studentCount", targetStudents.size()), request);
            return Map.of("group", targetGroup, "assignedStudents", targetStudents.size(), "assignments", created);
        }

        // 2. Individual Student Assignment
        if (body.studentUid() != null && !body.studentUid().isBlank()) {
            String studentUid = body.studentUid().trim();
            Map<String, Object> student = firestore.get("users", studentUid);
            String id = examId + "-" + studentUid;
            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("assignmentId", id);
            doc.put("examId", examId);
            doc.put("examTitle", examTitle);
            doc.put("studentUid", studentUid);
            doc.put("studentName", student == null ? "" : String.valueOf(student.getOrDefault("displayName", "")));
            doc.put("studentGroup", student == null ? "" : String.valueOf(student.getOrDefault("studentGroup", "")));
            doc.put("assignedAt", now.toString());
            firestore.set("examAssignments", id, doc);
            audit.record(actor, "STUDENT_ASSIGNED", examId, true, Map.of("studentUid", studentUid), request);
            return doc;
        }

        throw new IllegalArgumentException("Either studentGroup or studentUid must be provided");
    }

    @DeleteMapping("/assignments/{assignmentId}")
    ResponseEntity<Void> deleteAssignment(@AuthenticationPrincipal AppUser actor, @PathVariable String assignmentId,
                                          HttpServletRequest request) throws Exception {
        firestore.delete("examAssignments", assignmentId);
        audit.record(actor, "ASSIGNMENT_DELETED", assignmentId, true, Map.of("assignmentId", assignmentId), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audit-logs")
    Object auditLogs() throws Exception {
        return firestore.latest("auditLogs", 100);
    }
}

