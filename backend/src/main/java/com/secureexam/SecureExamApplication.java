package com.secureexam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SecureExamApplication {
    public static void main(String[] args) {
        SpringApplication.run(SecureExamApplication.class, args);
    }
}
