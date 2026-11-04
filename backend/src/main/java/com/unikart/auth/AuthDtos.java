package com.unikart.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

public class AuthDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginResponse {
        private String token;
        @Builder.Default
        private String tokenType = "Bearer";
        private boolean requires2Fa;
        private String tempToken;
        private String message;
        private UserProfileResponse user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        private String institutionCode; // e.g. MNNIT
        private String institutionalId; // e.g. 20224031
        private String fullName;
        private String email;
        private String phone;
        private String password;
        private String designation; // STUDENT or PROFESSOR
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Verify2FaRequest {
        private String tempToken;
        private String otp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProfileRequest {
        private String fullName;
        private String phone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        private String email;
        private String otp;
        private String newPassword;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileResponse {
        private UUID userId;
        private String email;
        private String fullName;
        private String role;
        private String designation;
        private String status;
        private UUID institutionId;
        private String institutionName;
        private String institutionCode;
        private UUID storeId;
        private String storeName;
        private BigDecimal walletBalance;
        private BigDecimal reservedBalance;
        private long activeBorrowsCount;
        private long unreadNotificationsCount;
    }
}
