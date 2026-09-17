package com.secureexam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CryptoService {
    private static final int PRIME = 257;
    private static final int TAG_BITS = 128;
    private final SecureRandom random = new SecureRandom();
    private final byte[] wrapKey;
    private final ObjectMapper mapper;

    public CryptoService(@Value("${app.key-share-wrap-secret}") String wrapSecret, ObjectMapper mapper) throws Exception {
        if (wrapSecret == null || wrapSecret.length() < 32) {
            throw new IllegalStateException("KEY_SHARE_WRAP_SECRET must be at least 32 characters");
        }
        this.wrapKey = MessageDigest.getInstance("SHA-256").digest(wrapSecret.getBytes(StandardCharsets.UTF_8));
        this.mapper = mapper;
    }

    public byte[] randomKey() {
        byte[] key = new byte[32];
        random.nextBytes(key);
        return key;
    }

    public Encrypted encryptPaper(byte[] key, byte[] plaintext, String aad) throws Exception {
        byte[] iv = new byte[12];
        random.nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        byte[] sealed = cipher.doFinal(plaintext);
        return new Encrypted(b64(sealed), b64(iv), "AES-256-GCM", Instant.now().toString());
    }

    public byte[] decryptPaper(byte[] key, String encryptedPayload, String iv, String aad) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, Base64.getDecoder().decode(iv)));
        cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
        return cipher.doFinal(Base64.getDecoder().decode(encryptedPayload));
    }

    public List<Share> split(byte[] secret) throws Exception {
        int[] coefficients = new int[secret.length];
        List<int[]> yValues = List.of(new int[secret.length], new int[secret.length], new int[secret.length]);
        for (int i = 0; i < secret.length; i++) {
            coefficients[i] = random.nextInt(PRIME);
            int s = Byte.toUnsignedInt(secret[i]);
            for (int x = 1; x <= 3; x++) {
                yValues.get(x - 1)[i] = mod(s + coefficients[i] * x);
            }
        }
        List<Share> shares = new ArrayList<>();
        for (int x = 1; x <= 3; x++) {
            shares.add(new Share(x, mapper.writeValueAsString(Map.of("x", x, "y", yValues.get(x - 1)))));
        }
        return shares;
    }

    public byte[] combine(List<String> encodedShares) throws Exception {
        if (encodedShares.size() < 2) {
            throw new IllegalArgumentException("At least two shares are required");
        }
        List<Map<String, Object>> parsed = new ArrayList<>();
        for (String encoded : encodedShares.subList(0, 2)) {
            parsed.add(mapper.readValue(encoded, Map.class));
        }
        int x1 = (int) parsed.get(0).get("x");
        int x2 = (int) parsed.get(1).get("x");
        if (x1 == x2) {
            throw new IllegalArgumentException("Shares must be distinct");
        }
        List<Integer> y1 = (List<Integer>) parsed.get(0).get("y");
        List<Integer> y2 = (List<Integer>) parsed.get(1).get("y");
        byte[] secret = new byte[y1.size()];
        for (int i = 0; i < y1.size(); i++) {
            int term1 = y1.get(i) * mod(-x2) * inv(mod(x1 - x2));
            int term2 = y2.get(i) * mod(-x1) * inv(mod(x2 - x1));
            int value = mod(term1 + term2);
            if (value > 255) {
                throw new IllegalStateException("Invalid reconstructed byte value: " + value);
            }
            secret[i] = (byte) value;
        }
        return secret;
    }

    public Encrypted wrapShare(String shareJson, String aad) throws Exception {
        return encryptPaper(wrapKey, shareJson.getBytes(StandardCharsets.UTF_8), aad);
    }

    public String unwrapShare(Map<String, Object> share) throws Exception {
        String aad = share.get("examId") + ":" + share.get("shareIndex");
        return new String(decryptPaper(wrapKey, (String) share.get("encryptedShare"), (String) share.get("iv"), aad), StandardCharsets.UTF_8);
    }

    private static int mod(int n) {
        int r = n % PRIME;
        return r < 0 ? r + PRIME : r;
    }

    private static int inv(int n) {
        for (int i = 1; i < PRIME; i++) {
            if (mod(n * i) == 1) return i;
        }
        throw new IllegalArgumentException("No inverse");
    }

    private static String b64(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }

    public record Encrypted(String encryptedPayload, String iv, String algorithm, String encryptedAt) {}
    public record Share(int index, String payload) {}
}

