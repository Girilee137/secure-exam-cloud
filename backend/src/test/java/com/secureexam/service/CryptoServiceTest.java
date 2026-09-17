package com.secureexam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class CryptoServiceTest {
    @Test
    void shamirSharesReconstructWithAnyTwoShares() throws Exception {
        CryptoService crypto = new CryptoService("12345678901234567890123456789012", new ObjectMapper());
        byte[] key = crypto.randomKey();
        List<CryptoService.Share> shares = crypto.split(key);

        assertArrayEquals(key, crypto.combine(List.of(shares.get(0).payload(), shares.get(1).payload())));
        assertArrayEquals(key, crypto.combine(List.of(shares.get(0).payload(), shares.get(2).payload())));
        assertArrayEquals(key, crypto.combine(List.of(shares.get(1).payload(), shares.get(2).payload())));
    }

    @Test
    void aesGcmRoundTripUsesAuthenticatedData() throws Exception {
        CryptoService crypto = new CryptoService("12345678901234567890123456789012", new ObjectMapper());
        byte[] key = crypto.randomKey();
        byte[] plaintext = "secure paper".getBytes(StandardCharsets.UTF_8);

        CryptoService.Encrypted encrypted = crypto.encryptPaper(key, plaintext, "exam-1");

        assertEquals("secure paper", new String(
                crypto.decryptPaper(key, encrypted.encryptedPayload(), encrypted.iv(), "exam-1"),
                StandardCharsets.UTF_8));
    }
}

