package com.unikart.auth;

import com.unikart.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDtos.LoginResponse>> login(
            @RequestBody AuthDtos.LoginRequest req,
            HttpServletRequest request) {
        String ip = extractClientIp(request);
        AuthDtos.LoginResponse res = authService.login(req, ip);
        return ResponseEntity.ok(ApiResponse.success(res.getMessage(), res));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<ApiResponse<AuthDtos.LoginResponse>> verify2Fa(
            @RequestBody AuthDtos.Verify2FaRequest req,
            HttpServletRequest request) {
        String ip = extractClientIp(request);
        AuthDtos.LoginResponse res = authService.verify2Fa(req, ip);
        return ResponseEntity.ok(ApiResponse.success(res.getMessage(), res));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.LoginResponse>> register(
            @RequestBody AuthDtos.RegisterRequest req,
            HttpServletRequest request) {
        String ip = extractClientIp(request);
        AuthDtos.LoginResponse res = authService.register(req, ip);
        return ResponseEntity.ok(ApiResponse.success(res.getMessage(), res));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthDtos.UserProfileResponse>> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        String email = authentication.getName();
        AuthDtos.UserProfileResponse profile = authService.getCurrentUserProfile(email);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<AuthDtos.UserProfileResponse>> updateProfile(
            @RequestBody AuthDtos.UpdateProfileRequest req,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        String email = authentication.getName();
        AuthDtos.UserProfileResponse profile = authService.updateUserProfile(email, req);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
