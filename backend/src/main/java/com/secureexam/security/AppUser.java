package com.secureexam.security;

import java.security.Principal;
import java.util.Map;

public record AppUser(String uid, String email, String phoneNumber, String displayName, String role, String status) implements Principal {
    public static AppUser from(String uid, Map<String, Object> data) {
        return new AppUser(
                uid,
                string(data.get("email")),
                string(data.get("phoneNumber")),
                string(data.getOrDefault("displayName", "")),
                string(data.get("role")),
                string(data.get("status")));
    }

    private static String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    @Override
    public String getName() {
        return uid;
    }
}

