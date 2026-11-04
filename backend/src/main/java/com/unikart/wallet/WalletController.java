package com.unikart.wallet;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import com.unikart.wallet.WalletDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/wallet")
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    public WalletController(WalletService walletService, UserRepository userRepository) {
        this.walletService = walletService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<WalletViewResponse>> getWallet(Authentication authentication) {
        User customer = resolveCustomer(authentication);
        return ResponseEntity.ok(ApiResponse.success("Wallet view retrieved", walletService.getWalletView(customer)));
    }

    @PostMapping("/bank-accounts")
    public ResponseEntity<ApiResponse<BankAccountResponse>> addBankAccount(
            @Valid @RequestBody AddBankAccountRequest request,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        BankAccountResponse bank = walletService.addBankAccount(customer, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Bank account added and validated securely", bank));
    }

    @PostMapping("/redeem")
    public ResponseEntity<ApiResponse<WalletViewResponse>> redeemToBank(
            @Valid @RequestBody RedeemWalletRequest request,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        WalletViewResponse updated = walletService.redeemToBank(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Wallet balance redeemed to bank account successfully", updated));
    }

    @PostMapping("/top-up")
    public ResponseEntity<ApiResponse<WalletViewResponse>> topUp(
            @Valid @RequestBody TopUpWalletRequest request,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        WalletViewResponse updated = walletService.topUpWallet(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Wallet balance topped up successfully", updated));
    }

    @PostMapping("/debit")
    public ResponseEntity<ApiResponse<WalletViewResponse>> debit(
            @Valid @RequestBody DebitWalletRequest request,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        WalletViewResponse updated = walletService.debitWallet(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Wallet balance debited successfully", updated));
    }

    private User resolveCustomer(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }
}
