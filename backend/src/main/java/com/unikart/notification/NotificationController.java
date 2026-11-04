package com.unikart.notification;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications(Authentication authentication) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved",
                notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(user.getUserId())));
    }

    @RequestMapping(value = "/{notificationId}/read", method = {RequestMethod.POST, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<Notification>> markAsRead(
            @PathVariable UUID notificationId,
            Authentication authentication) {
        User user = resolveUser(authentication);
        Notification notif = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException("Notification not found"));
        if (!notif.getUser().getUserId().equals(user.getUserId())) {
            throw new BusinessException("Access denied");
        }
        notif.setRead(true);
        notif.setReadAt(Instant.now());
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", notificationRepository.save(notif)));
    }

    private User resolveUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Authentication required", org.springframework.http.HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("User not found", org.springframework.http.HttpStatus.UNAUTHORIZED));
    }
}
