package com.secureexam.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {
    @Bean
    Firestore firestore(
            @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}") String inlineJson,
            @Value("${GOOGLE_APPLICATION_CREDENTIALS:}") String credentialsPath) throws Exception {
        if (FirebaseApp.getApps().isEmpty()) {
            GoogleCredentials credentials;
            if (inlineJson != null && !inlineJson.isBlank()) {
                credentials = GoogleCredentials.fromStream(new ByteArrayInputStream(inlineJson.getBytes(StandardCharsets.UTF_8)));
            } else if (credentialsPath != null && !credentialsPath.isBlank()) {
                try (var is = Files.newInputStream(Path.of(credentialsPath))) {
                    credentials = GoogleCredentials.fromStream(is);
                }
            } else {
                credentials = GoogleCredentials.getApplicationDefault();
            }
            FirebaseApp.initializeApp(FirebaseOptions.builder().setCredentials(credentials).build());
        }
        return FirestoreClient.getFirestore();
    }
}
