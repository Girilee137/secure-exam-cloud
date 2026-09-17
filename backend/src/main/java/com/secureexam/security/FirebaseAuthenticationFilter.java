package com.secureexam.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.secureexam.service.FirestoreService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {
    private final FirestoreService firestore;
    private final String firstAdminUid;

    public FirebaseAuthenticationFilter(FirestoreService firestore, @Value("${app.first-admin-uid}") String firstAdminUid) {
        this.firestore = firestore;
        this.firstAdminUid = firstAdminUid;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if ("/api/health".equals(request.getRequestURI()) || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        try {
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing bearer token");
                return;
            }
            FirebaseToken token = FirebaseAuth.getInstance().verifyIdToken(header.substring(7));
            String email = token.getEmail() == null ? "" : token.getEmail();
            Map<String, Object> data = firestore.get("users", token.getUid());
            if (data == null && token.getUid().equals(firstAdminUid)) {
                String phoneNumber = token.getClaims().get("phone_number") == null
                        ? ""
                        : String.valueOf(token.getClaims().get("phone_number"));
                data = Map.of(
                        "uid", token.getUid(),
                        "email", email,
                        "phoneNumber", phoneNumber,
                        "displayName", token.getName() == null ? "Initial Admin" : token.getName(),
                        "role", "ADMIN",
                        "status", "ACTIVE",
                        "createdAt", Instant.now().toString(),
                        "updatedAt", Instant.now().toString());
                firestore.set("users", token.getUid(), data);
            }
            if (data == null && "/api/auth/register".equals(request.getRequestURI())) {
                AppUser unregUser = new AppUser(token.getUid(), email, "", token.getName() == null ? "" : token.getName(), "STUDENT", "ACTIVE");
                var auth = new UsernamePasswordAuthenticationToken(
                        unregUser,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_AUTHENTICATED")));
                SecurityContextHolder.getContext().setAuthentication(auth);
                chain.doFilter(request, response);
                return;
            }
            if (data == null) {
                response.sendError(HttpServletResponse.SC_NOT_FOUND, "User profile is not registered");
                return;
            }
            if (!"ACTIVE".equals(data.get("status"))) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "User is not active");
                return;
            }
            AppUser user = AppUser.from(token.getUid(), data);
            var auth = new UsernamePasswordAuthenticationToken(
                    user,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));
            SecurityContextHolder.getContext().setAuthentication(auth);
            chain.doFilter(request, response);
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Firebase token");
        }
    }
}
