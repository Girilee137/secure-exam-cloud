package com.secureexam.service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query.Direction;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FirestoreService {
    private final Firestore db;

    public FirestoreService(Firestore db) {
        this.db = db;
    }

    public Map<String, Object> get(String collection, String id) throws Exception {
        var snap = db.collection(collection).document(id).get().get();
        return snap.exists() ? snap.getData() : null;
    }

    public String create(String collection, Map<String, Object> data) throws Exception {
        String id = UUID.randomUUID().toString();
        db.collection(collection).document(id).set(data).get();
        return id;
    }

    public void set(String collection, String id, Map<String, Object> data) throws Exception {
        db.collection(collection).document(id).set(data).get();
    }

    public void update(String collection, String id, Map<String, Object> data) throws Exception {
        db.collection(collection).document(id).update(data).get();
    }

    public List<Map<String, Object>> all(String collection) throws Exception {
        return db.collection(collection).get().get().getDocuments().stream().map(s -> s.getData()).toList();
    }

    public List<Map<String, Object>> where(String collection, String field, Object value) throws Exception {
        return db.collection(collection).whereEqualTo(field, value).get().get().getDocuments().stream().map(s -> s.getData()).toList();
    }

    public List<Map<String, Object>> latest(String collection, int limit) throws Exception {
        return db.collection(collection).orderBy("timestamp", Direction.DESCENDING).limit(limit).get().get().getDocuments().stream()
                .map(s -> s.getData()).toList();
    }
}

