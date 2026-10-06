package com.secureexam.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;

@Service
public class AdminBootstrapService implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapService.class);
    private static final String DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "password";

    private final FirestoreService firestore;

    public AdminBootstrapService(FirestoreService firestore) {
        this.firestore = firestore;
    }

    @Override
    public void run(ApplicationArguments args) {
        bootstrapAdmin();
    }

    public synchronized void bootstrapAdmin() {
        try {
            FirebaseAuth auth = FirebaseAuth.getInstance();
            UserRecord adminUser = null;
            try {
                adminUser = auth.getUserByEmail(DEFAULT_ADMIN_EMAIL);
            } catch (FirebaseAuthException e) {
                log.info("Default admin user not yet in Firebase Auth: {}", e.getMessage());
            }

            if (adminUser == null) {
                try {
                    UserRecord.CreateRequest createReq = new UserRecord.CreateRequest()
                            .setEmail(DEFAULT_ADMIN_EMAIL)
                            .setPassword(DEFAULT_ADMIN_PASSWORD)
                            .setDisplayName("System Admin")
                            .setEmailVerified(true);
                    adminUser = auth.createUser(createReq);
                    log.info("Successfully created default admin user in Firebase Auth with UID: {}", adminUser.getUid());
                } catch (Exception ex) {
                    log.error("Could not create default admin in Firebase Auth: {}", ex.getMessage());
                }
            } else {
                try {
                    auth.updateUser(new UserRecord.UpdateRequest(adminUser.getUid())
                            .setPassword(DEFAULT_ADMIN_PASSWORD)
                            .setDisplayName("System Admin"));
                    log.info("Ensured default admin password is set for UID: {}", adminUser.getUid());
                } catch (Exception ex) {
                    log.warn("Could not update admin user password: {}", ex.getMessage());
                }
            }

            if (adminUser != null) {
                Map<String, Object> existing = firestore.get("users", adminUser.getUid());
                Map<String, Object> adminData = new LinkedHashMap<>();
                adminData.put("uid", adminUser.getUid());
                adminData.put("email", DEFAULT_ADMIN_EMAIL);
                adminData.put("displayName", "System Admin");
                adminData.put("phoneNumber", "");
                adminData.put("role", "ADMIN");
                adminData.put("status", "ACTIVE");
                adminData.put("studentGroup", "");
                adminData.put("updatedAt", Instant.now().toString());
                if (existing == null) {
                    adminData.put("createdAt", Instant.now().toString());
                    firestore.set("users", adminUser.getUid(), adminData);
                    log.info("Created Firestore document for default admin: {}", adminUser.getUid());
                } else {
                    adminData.put("createdAt", existing.getOrDefault("createdAt", Instant.now().toString()));
                    firestore.set("users", adminUser.getUid(), adminData);
                    log.info("Updated Firestore document for default admin with ADMIN role");
                }
            }
        } catch (Exception e) {
            log.error("Failed during admin bootstrap: {}", e.getMessage(), e);
        }
    }
}
