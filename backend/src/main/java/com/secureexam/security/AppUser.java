package com.secureexam.security;

import java.security.Principal;
import java.util.Map;

public record AppUser(String uid, String email, String phoneNumber, String displayName, String role, String status, String studentGroup) implements Principal {
    public AppUser(String uid, String email, String phoneNumber, String displayName, String role, String status) {
        this(uid, email, phoneNumber, displayName, role, status, "");
    }

    public static AppUser from(String uid, Map<String, Object> data) {
        return new AppUser(
                uid,
                string(data.get("email")),
                string(data.get("phoneNumber")),
                string(data.getOrDefault("displayName", "")),
                string(data.get("role")),
                string(data.get("status")),
                string(data.getOrDefault("studentGroup", "")));
    }

    private static String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    @Override
    public String getName() {
        return uid;
    }
}

