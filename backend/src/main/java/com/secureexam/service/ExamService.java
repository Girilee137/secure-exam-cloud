package com.secureexam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.secureexam.security.AppUser;
import com.secureexam.web.Requests.ExamRequest;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ExamService {
    private final FirestoreService firestore;
    private final CryptoService crypto;
    private final AuditService audit;
    private final ObjectMapper canonicalMapper;
    private final SecureRandom random = new SecureRandom();

    public ExamService(FirestoreService firestore, CryptoService crypto, AuditService audit) {
        this.firestore = firestore;
        this.crypto = crypto;
        this.audit = audit;
        this.canonicalMapper = new ObjectMapper().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    public Map<String, Object> createExam(AppUser user, ExamRequest request) throws Exception {
        validateTimes(request.scheduledStart(), request.scheduledEnd());
        String id = java.util.UUID.randomUUID().toString();
        Instant now = Instant.now();
        Map<String, Object> exam = new LinkedHashMap<>();
        exam.put("examId", id);
        exam.put("title", request.title());
        exam.put("subjectId", request.subjectId());
        exam.put("description", request.description() == null ? "" : request.description());
        exam.put("scheduledStart", request.scheduledStart().toString());
        exam.put("scheduledEnd", request.scheduledEnd().toString());
        exam.put("durationMinutes", request.durationMinutes());
        exam.put("questionCount", request.questionCount());
        exam.put("status", "DRAFT");
        exam.put("createdBy", user.uid());
        exam.put("createdAt", now.toString());
        exam.put("updatedAt", now.toString());
        firestore.set("exams", id, exam);
        return exam;
    }

    public Map<String, Object> lockPaper(AppUser user, String examId, HttpServletRequest request) throws Exception {
        Map<String, Object> exam = require("exams", examId);
        if (!Set.of("DRAFT", "GENERATING").contains(exam.get("status"))) {
            throw new IllegalStateException("Exam cannot be locked from state " + exam.get("status"));
        }
        if (!user.uid().equals(exam.get("createdBy")) && !"ADMIN".equals(user.role())) {
            throw new IllegalArgumentException("Only the owning teacher or admin can lock this exam");
        }
        firestore.update("exams", examId, Map.of("status", "GENERATING", "updatedAt", Instant.now().toString()));
        List<Map<String, Object>> candidates = firestore.where("questions", "subjectId", exam.get("subjectId"));
        candidates = candidates.stream().filter(q -> Boolean.TRUE.equals(q.get("active"))).toList();
        int questionCount = ((Number) exam.get("questionCount")).intValue();
        if (candidates.size() < questionCount) {
            firestore.update("exams", examId, Map.of("status", "DRAFT", "updatedAt", Instant.now().toString()));
            throw new IllegalStateException("Not enough active questions for the configured count");
        }
        List<Map<String, Object>> selected = secureSample(candidates, questionCount).stream().map(this::studentSafeQuestion).toList();
        Map<String, Object> paper = new LinkedHashMap<>();
        paper.put("examId", examId);
        paper.put("title", exam.get("title"));
        paper.put("subjectId", exam.get("subjectId"));
        paper.put("durationMinutes", exam.get("durationMinutes"));
        paper.put("scheduledStart", exam.get("scheduledStart"));
        paper.put("scheduledEnd", exam.get("scheduledEnd"));
        paper.put("questions", selected);
        byte[] plaintext = canonicalMapper.writeValueAsBytes(paper);
        byte[] key = crypto.randomKey();
        CryptoService.Encrypted encrypted = crypto.encryptPaper(key, plaintext, examId);
        Instant now = Instant.now();
        Map<String, Object> paperDoc = new LinkedHashMap<>();
        paperDoc.put("examId", examId);
        paperDoc.put("encryptedPayload", encrypted.encryptedPayload());
        paperDoc.put("iv", encrypted.iv());
        paperDoc.put("algorithm", encrypted.algorithm());
        paperDoc.put("status", "LOCKED");
        paperDoc.put("scheduledReleaseTime", exam.get("scheduledStart"));
        paperDoc.put("createdAt", now.toString());
        paperDoc.put("lockedAt", now.toString());
        firestore.set("examPapers", examId, paperDoc);
        List<CryptoService.Share> shares = crypto.split(key);
        List<String> holders = List.of("TEACHER", "EXAM_CONTROLLER", "ADMIN");
        for (int i = 0; i < shares.size(); i++) {
            CryptoService.Share share = shares.get(i);
            String shareId = examId + "-" + share.index();
            CryptoService.Encrypted wrapped = crypto.wrapShare(share.payload(), examId + ":" + share.index());
            Map<String, Object> shareDoc = new LinkedHashMap<>();
            shareDoc.put("shareId", shareId);
            shareDoc.put("examId", examId);
            shareDoc.put("shareIndex", share.index());
            shareDoc.put("encryptedShare", wrapped.encryptedPayload());
            shareDoc.put("iv", wrapped.iv());
            shareDoc.put("algorithm", "AES-256-GCM wrapped Shamir-2-of-3");
            shareDoc.put("holderRole", holders.get(i));
            shareDoc.put("holderUid", i == 0 ? user.uid() : "");
            shareDoc.put("status", "UNUSED");
            shareDoc.put("createdAt", now.toString());
            firestore.set("keyShares", shareId, shareDoc);
        }
        firestore.update("exams", examId, Map.of("status", "WAITING_FOR_RELEASE", "updatedAt", now.toString()));
        audit.record(user, "PAPER_LOCKED", examId, true, Map.of("questionCount", questionCount), request);
        return firestore.get("examPapers", examId);
    }

    public Map<String, Object> approveRelease(AppUser user, String examId, HttpServletRequest request) throws Exception {
        Map<String, Object> exam = require("exams", examId);
        if (!Set.of("WAITING_FOR_RELEASE", "RELEASE_AUTHORIZED").contains(exam.get("status"))) {
            throw new IllegalStateException("Exam is not waiting for release authorization");
        }
        List<Map<String, Object>> shares = firestore.where("keyShares", "examId", examId);
        Map<String, Object> matching = shares.stream()
                .filter(s -> user.role().equals(s.get("holderRole")) || user.uid().equals(s.get("holderUid")))
                .filter(s -> !"APPROVED".equals(s.get("status"))) // don't approve again
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No share assigned to this user or role, or already approved"));
        firestore.update("keyShares", (String) matching.get("shareId"), Map.of(
                "status", "APPROVED",
                "holderUid", user.uid(),
                "approvedBy", user.uid(),
                "approvedAt", Instant.now().toString()));
        // Re-fetch from Firestore to get the true state after the update
        List<Map<String, Object>> approved = firestore.where("keyShares", "examId", examId).stream()
                .filter(s -> "APPROVED".equals(s.get("status")))
                .toList();
        long approverCount = distinctApprovers(approved);
        if (approverCount >= 2) {
            firestore.update("exams", examId, Map.of("status", "RELEASE_AUTHORIZED", "updatedAt", Instant.now().toString()));
            firestore.update("examPapers", examId, Map.of("status", "RELEASE_AUTHORIZED"));
        }
        audit.record(user, "SHARE_APPROVED", examId, true, Map.of("role", user.role()), request);
        return Map.of("approvedShares", approverCount, "requiredShares", 2);
    }

    public Map<String, Object> releasePaper(AppUser user, String examId, HttpServletRequest request) throws Exception {
        Map<String, Object> exam = require("exams", examId);
        if (!"RELEASE_AUTHORIZED".equals(exam.get("status"))) {
            throw new IllegalStateException("Two-party release authorization is required");
        }
        Instant scheduledStart = Instant.parse((String) exam.get("scheduledStart"));
        if (Instant.now().isBefore(scheduledStart)) {
            throw new IllegalStateException("Paper cannot be released before scheduled start time");
        }
        List<Map<String, Object>> approved = firestore.where("keyShares", "examId", examId).stream()
                .filter(s -> "APPROVED".equals(s.get("status")))
                .toList();
        if (distinctApprovers(approved) < 2) {
            throw new IllegalStateException("At least two distinct approvers are required");
        }
        List<String> unwrapped = new ArrayList<>();
        for (Map<String, Object> share : approved.subList(0, Math.min(approved.size(), 2))) {
            unwrapped.add(crypto.unwrapShare(share));
            firestore.update("keyShares", (String) share.get("shareId"), Map.of(
                    "status", "USED",
                    "usedAt", Instant.now().toString(),
                    "usedEncryptedShare", share.get("encryptedShare"),
                    "usedIv", share.get("iv")));
        }
        byte[] key = crypto.combine(unwrapped);
        Map<String, Object> paperDoc = require("examPapers", examId);
        byte[] plaintext = crypto.decryptPaper(key, (String) paperDoc.get("encryptedPayload"), (String) paperDoc.get("iv"), examId);
        Map<String, Object> released = canonicalMapper.readValue(plaintext, Map.class);
        firestore.update("examPapers", examId, Map.of("status", "RELEASED", "releasedAt", Instant.now().toString()));
        firestore.update("exams", examId, Map.of("status", "EXAM_ACTIVE", "updatedAt", Instant.now().toString()));
        audit.record(user, "PAPER_RELEASED", examId, true, Map.of(), request);
        return released;
    }

    public Map<String, Object> studentPaper(AppUser user, String examId) throws Exception {
        Map<String, Object> exam = require("exams", examId);
        if (!"EXAM_ACTIVE".equals(exam.get("status"))) {
            throw new IllegalStateException("Exam is not active");
        }
        if (Instant.now().isAfter(Instant.parse((String) exam.get("scheduledEnd")))) {
            throw new IllegalStateException("Exam window has ended");
        }
        boolean assigned = firestore.where("examAssignments", "examId", examId).stream()
                .anyMatch(a -> user.uid().equals(a.get("studentUid")));
        if (!assigned && !"ADMIN".equals(user.role())) {
            throw new IllegalArgumentException("Student is not assigned to this exam");
        }
        List<Map<String, Object>> used = firestore.where("keyShares", "examId", examId).stream()
                .filter(s -> "USED".equals(s.get("status"))).toList();
        List<String> unwrapped = new ArrayList<>();
        for (Map<String, Object> share : used.subList(0, Math.min(used.size(), 2))) {
            Map<String, Object> unwrapSource = new LinkedHashMap<>(share);
            unwrapSource.put("encryptedShare", share.getOrDefault("usedEncryptedShare", share.get("encryptedShare")));
            unwrapSource.put("iv", share.getOrDefault("usedIv", share.get("iv")));
            unwrapped.add(crypto.unwrapShare(unwrapSource));
        }
        if (unwrapped.size() < 2) throw new IllegalStateException("Released key material is not available");
        byte[] key = crypto.combine(unwrapped);
        Map<String, Object> paperDoc = require("examPapers", examId);
        byte[] plaintext = crypto.decryptPaper(key, (String) paperDoc.get("encryptedPayload"), (String) paperDoc.get("iv"), examId);
        return canonicalMapper.readValue(plaintext, Map.class);
    }

    public void purgeExpired() throws Exception {
        for (Map<String, Object> exam : firestore.all("exams")) {
            if ("EXAM_ACTIVE".equals(exam.get("status")) && Instant.now().isAfter(Instant.parse((String) exam.get("scheduledEnd")))) {
                String examId = (String) exam.get("examId");
                firestore.update("exams", examId, Map.of("status", "PURGED", "updatedAt", Instant.now().toString()));
                firestore.update("examPapers", examId, Map.of("status", "PURGED", "encryptedPayload", "", "iv", "", "deletedAt", Instant.now().toString()));
                for (Map<String, Object> share : firestore.where("keyShares", "examId", examId)) {
                    firestore.update("keyShares", (String) share.get("shareId"), Map.of(
                            "encryptedShare", "",
                            "iv", "",
                            "usedEncryptedShare", "",
                            "usedIv", "",
                            "status", "PURGED"));
                }
            }
        }
    }

    private Map<String, Object> require(String collection, String id) throws Exception {
        Map<String, Object> doc = firestore.get(collection, id);
        if (doc == null) throw new IllegalArgumentException(collection + " document not found");
        return doc;
    }

    private void validateTimes(Instant start, Instant end) {
        if (!end.isAfter(start)) throw new IllegalArgumentException("scheduledEnd must be after scheduledStart");
    }

    private List<Map<String, Object>> secureSample(List<Map<String, Object>> source, int count) {
        List<Map<String, Object>> copy = new ArrayList<>(source);
        for (int i = copy.size() - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            Map<String, Object> tmp = copy.get(i);
            copy.set(i, copy.get(j));
            copy.set(j, tmp);
        }
        return copy.subList(0, count);
    }

    private Map<String, Object> studentSafeQuestion(Map<String, Object> q) {
        Map<String, Object> safe = new LinkedHashMap<>();
        safe.put("questionId", q.get("questionId"));
        safe.put("questionText", q.get("questionText"));
        safe.put("options", q.get("options"));
        safe.put("marks", q.get("marks"));
        safe.put("difficulty", q.get("difficulty"));
        safe.put("topic", q.get("topic"));
        return safe;
    }

    private long distinctApprovers(List<Map<String, Object>> shares) {
        Set<String> ids = new HashSet<>();
        for (Map<String, Object> share : shares) {
            Object approvedBy = share.get("approvedBy");
            if (approvedBy != null && !String.valueOf(approvedBy).isBlank()) ids.add(String.valueOf(approvedBy));
        }
        return ids.size();
    }
}
