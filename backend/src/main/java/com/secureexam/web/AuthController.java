package com.secureexam.web;

import com.secureexam.security.AppUser;
import com.secureexam.service.AdminBootstrapService;
import com.secureexam.service.FirestoreService;
import com.secureexam.web.Requests.RegisterRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final FirestoreService firestore;
    private final AdminBootstrapService adminBootstrap;

    public AuthController(FirestoreService firestore, AdminBootstrapService adminBootstrap) {
        this.firestore = firestore;
        this.adminBootstrap = adminBootstrap;
    }

    @GetMapping("/me")
    AppUser me(@AuthenticationPrincipal AppUser user) {
        return user;
    }

    @PostMapping("/bootstrap-admin")
    Map<String, Object> bootstrapAdmin() {
        adminBootstrap.bootstrapAdmin();
        return Map.of("status", "ok", "email", "admin@gmail.com");
    }

    @PostMapping("/register")
    AppUser register(@AuthenticationPrincipal AppUser principal, @Valid @RequestBody RegisterRequest body) throws Exception {
        Map<String, Object> existing = firestore.get("users", principal.uid());
        if (existing != null) {
            return AppUser.from(principal.uid(), existing);
        }
        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("uid", principal.uid());
        userData.put("email", principal.email() == null ? "" : principal.email());
        userData.put("phoneNumber", principal.phoneNumber() == null ? "" : principal.phoneNumber());
        userData.put("displayName", body.displayName() == null || body.displayName().isBlank()
                ? (principal.email() == null || principal.email().isBlank() ? "User" : principal.email())
                : body.displayName().trim());
        userData.put("role", body.role());
        userData.put("status", "ACTIVE");
        userData.put("createdAt", Instant.now().toString());
        userData.put("updatedAt", Instant.now().toString());
        firestore.set("users", principal.uid(), userData);
        return AppUser.from(principal.uid(), userData);
    }
}

