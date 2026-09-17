package com.secureexam.config;

import com.secureexam.service.ExamService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PurgeScheduler {
    private final ExamService exams;

    public PurgeScheduler(ExamService exams) {
        this.exams = exams;
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PurgeScheduler.class);

    @Scheduled(fixedDelay = 60000)
    void purgeExpiredExams() {
        try {
            exams.purgeExpired();
        } catch (Exception ex) {
            log.error("Failed to purge expired exams", ex);
        }
    }
}

