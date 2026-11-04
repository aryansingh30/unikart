package com.unikart.wallet;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class WalletDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddBankAccountRequest {
        @NotBlank(message = "Account holder name is required")
        private String accountHolderName;

        @NotBlank(message = "Bank name is required")
        private String bankName;

        @NotBlank(message = "IFSC code is required")
        private String ifscCode;

        @NotBlank(message = "Account number is required")
        private String accountNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RedeemWalletRequest {
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.0", message = "Redemption amount must be at least 1.00 INR")
        private BigDecimal amount;

        @NotNull(message = "Bank account ID is required")
        private UUID bankAccountId;

        @NotBlank(message = "Idempotency key is required")
        private String idempotencyKey;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopUpWalletRequest {
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.0", message = "Top-up amount must be at least 1.00 INR")
        private BigDecimal amount;

        private String idempotencyKey;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DebitWalletRequest {
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Debit amount must be greater than zero")
        private BigDecimal amount;

        private String idempotencyKey;
        private String referenceType;
        private String referenceId;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletTransactionResponse {
        private UUID txId;
        private String txType;
        private String direction;
        private BigDecimal amount;
        private String state;
        private BigDecimal balanceAfter;
        private String referenceType;
        private String referenceId;
        private String description;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BankAccountResponse {
        private UUID bankAccountId;
        private String accountHolderName;
        private String bankName;
        private String ifscCode;
        private String maskedAccountNumber;
        private boolean verified;
        private boolean primary;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletViewResponse {
        private UUID walletId;
        private UUID userId;
        private String currency;
        private BigDecimal availableBalance;
        private BigDecimal reservedBalance;
        private List<BankAccountResponse> bankAccounts;
        private List<WalletTransactionResponse> transactions;
    }
}
