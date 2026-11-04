package com.unikart.admin;

import com.unikart.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/lifecycle")
public class LifecycleController {

    private final LifecycleScheduledTasks lifecycleTasks;

    public LifecycleController(LifecycleScheduledTasks lifecycleTasks) {
        this.lifecycleTasks = lifecycleTasks;
    }

    @PostMapping("/trigger-pickup-expiry")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerPickupExpiry() {
        int count = lifecycleTasks.processPickupExpiry();
        return ResponseEntity.ok(ApiResponse.success(
                "Pickup expiry job executed successfully",
                Map.of("expiredOrdersCount", count)
        ));
    }

    @PostMapping("/trigger-overdue-fines")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerOverdueFines() {
        int count = lifecycleTasks.processDailyOverdueFines();
        return ResponseEntity.ok(ApiResponse.success(
                "Overdue fines job executed successfully",
                Map.of("processedFinesCount", count)
        ));
    }

    @PostMapping("/trigger-dpdp-retention")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<ApiResponse<String>> triggerDpdpRetention() {
        lifecycleTasks.processDpdpDataRetention();
        return ResponseEntity.ok(ApiResponse.success(
                "DPDP data retention compliance job executed successfully",
                "Expired OTP tokens purged"
        ));
    }
}
