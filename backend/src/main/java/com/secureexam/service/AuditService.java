package com.secureexam.service;

import com.secureexam.security.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final FirestoreService firestore;

    public AuditService(FirestoreService firestore) {
        this.firestore = firestore;
    }

    public void record(AppUser user, String action, String examId, boolean success, Map<String, Object> metadata, HttpServletRequest request) {
        try {
            String id = UUID.randomUUID().toString();
            Map<String, Object> log = new LinkedHashMap<>();
            log.put("logId", id);
            log.put("actorUid", user.uid());
            log.put("actorRole", user.role());
            log.put("action", action);
            log.put("examId", examId);
            log.put("timestamp", Instant.now().toString());
            log.put("ipAddress", request == null ? "" : request.getRemoteAddr());
            log.put("userAgent", request == null ? "" : request.getHeader("User-Agent"));
            log.put("success", success);
            log.put("metadata", metadata == null ? Map.of() : metadata);
            firestore.set("auditLogs", id, log);
        } catch (Exception ignored) {
        }
    }
}

