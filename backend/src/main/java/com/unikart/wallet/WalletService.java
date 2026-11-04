package com.unikart.wallet;
import java.util.Base64;
import com.unikart.auth.User;
import com.unikart.common.BusinessException;
import com.unikart.wallet.WalletDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final BankAccountRepository bankAccountRepository;

    public WalletService(
            WalletRepository walletRepository,
            WalletTransactionRepository walletTransactionRepository,
            BankAccountRepository bankAccountRepository) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.bankAccountRepository = bankAccountRepository;
    }

    @Transactional(readOnly = true)
    public WalletViewResponse getWalletView(User customer) {
        enforceCustomerRole(customer);
        Wallet wallet = getOrCreateWallet(customer);
        List<BankAccountResponse> banks = bankAccountRepository.findByUser_UserIdOrderByCreatedAtDesc(customer.getUserId())
                .stream().map(this::toBankResponse).collect(Collectors.toList());
        List<WalletTransactionResponse> txs = walletTransactionRepository.findByWallet_WalletIdOrderByCreatedAtDesc(wallet.getWalletId())
                .stream().map(this::toTxResponse).collect(Collectors.toList());

        return WalletViewResponse.builder()
                .walletId(wallet.getWalletId())
                .userId(customer.getUserId())
                .currency(wallet.getCurrency())
                .availableBalance(wallet.getAvailableBalance())
                .reservedBalance(wallet.getReservedBalance())
                .bankAccounts(banks)
                .transactions(txs)
                .build();
    }

    @Transactional
    public BankAccountResponse addBankAccount(User customer, AddBankAccountRequest req) {
        enforceCustomerRole(customer);
        String rawAcc = req.getAccountNumber().trim();
        String masked = rawAcc.length() > 4 ? "****" + rawAcc.substring(rawAcc.length() - 4) : "****" + rawAcc;
        String encrypted = Base64.getEncoder().encodeToString(rawAcc.getBytes()); // Simulated encryption at rest (WAL-06)

        BankAccount bank = BankAccount.builder()
                .user(customer)
                .accountHolderName(req.getAccountHolderName().trim())
                .bankName(req.getBankName().trim())
                .ifscCode(req.getIfscCode().trim().toUpperCase())
                .maskedAccountNumber(masked)
                .encryptedAccountNumber(encrypted)
                .verified(true)
                .primary(true)
                .build();
        return toBankResponse(bankAccountRepository.save(bank));
    }

    /**
     * WAL-04, WAL-07, WAL-10:
     * Redeem wallet balance to a validated bank account.
     * Reserves amount while PENDING, settles debit on success, releases reservation on failure.
     */
    @Transactional
    public WalletViewResponse redeemToBank(User customer, RedeemWalletRequest req) {
        enforceCustomerRole(customer);

        Optional<WalletTransaction> existingTx = walletTransactionRepository.findByIdempotencyKey(req.getIdempotencyKey().trim());
        if (existingTx.isPresent()) {
            return getWalletView(customer);
        }

        BigDecimal redeemAmt = req.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (redeemAmt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Redemption amount must be greater than zero");
        }

        Wallet wallet = getOrCreateWallet(customer);
        if (wallet.getAvailableBalance().compareTo(redeemAmt) < 0) {
            throw new BusinessException("WAL-08: Insufficient available balance for redemption. Available: ₹" + wallet.getAvailableBalance());
        }

        BankAccount bank = bankAccountRepository.findById(req.getBankAccountId())
                .orElseThrow(() -> new BusinessException("Bank account not found", HttpStatus.NOT_FOUND));
        if (!bank.getUser().getUserId().equals(customer.getUserId())) {
            throw new BusinessException("Bank account does not belong to you", HttpStatus.FORBIDDEN);
        }

        // Move funds from available to reserved balance during PENDING state (WAL-10)
        BigDecimal newAvail = wallet.getAvailableBalance().subtract(redeemAmt).setScale(2, RoundingMode.HALF_UP);
        BigDecimal newRes = wallet.getReservedBalance().add(redeemAmt).setScale(2, RoundingMode.HALF_UP);
        wallet.setAvailableBalance(newAvail);
        wallet.setReservedBalance(newRes);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        WalletTransaction wTx = WalletTransaction.builder()
                .wallet(wallet)
                .user(customer)
                .idempotencyKey(req.getIdempotencyKey().trim())
                .txType("BANK_REDEMPTION_DEBIT")
                .direction("DEBIT")
                .amount(redeemAmt)
                .state("SUCCESS") // Settled immediately in simulator
                .balanceAfter(newAvail)
                .reservedAfter(newRes)
                .referenceType("BANK_REDEMPTION")
                .referenceId(bank.getBankAccountId().toString())
                .bankAccountId(bank.getBankAccountId())
                .providerPayoutRef("PAYOUT-SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .description("Redemption to bank account " + bank.getMaskedAccountNumber())
                .build();
        walletTransactionRepository.save(wTx);

        // Clear reserved balance after success
        wallet.setReservedBalance(wallet.getReservedBalance().subtract(redeemAmt).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        return getWalletView(customer);
    }

    @Transactional
    public WalletViewResponse topUpWallet(User customer, TopUpWalletRequest req) {
        enforceCustomerRole(customer);
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Top-up amount must be greater than zero");
        }
        String idemp = (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank())
                ? req.getIdempotencyKey().trim()
                : "TOPUP-" + UUID.randomUUID();

        Optional<WalletTransaction> existing = walletTransactionRepository.findByIdempotencyKey(idemp);
        if (existing.isPresent()) {
            return getWalletView(customer);
        }

        Wallet wallet = getOrCreateWallet(customer);
        BigDecimal newBal = wallet.getAvailableBalance().add(req.getAmount()).setScale(2, RoundingMode.HALF_UP);
        wallet.setAvailableBalance(newBal);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        WalletTransaction wTx = WalletTransaction.builder()
                .wallet(wallet)
                .user(customer)
                .idempotencyKey(idemp)
                .txType("REFUND_CREDIT")
                .direction("CREDIT")
                .amount(req.getAmount())
                .state("SUCCESS")
                .balanceAfter(newBal)
                .reservedAfter(wallet.getReservedBalance())
                .referenceType("PAYMENT")
                .referenceId("PAY-TOPUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .description("Wallet top-up via UPI / Gateway")
                .build();
        walletTransactionRepository.save(wTx);
        return getWalletView(customer);
    }

    @Transactional
    public WalletViewResponse debitWallet(User customer, DebitWalletRequest req) {
        enforceCustomerRole(customer);
        BigDecimal amount = req.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Debit amount must be greater than zero");
        }
        Wallet wallet = getOrCreateWallet(customer);
        if (wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient wallet balance. Available: ₹" + wallet.getAvailableBalance());
        }
        BigDecimal newBal = wallet.getAvailableBalance().subtract(amount).setScale(2, RoundingMode.HALF_UP);
        wallet.setAvailableBalance(newBal);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        String idemp = (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank())
                ? req.getIdempotencyKey().trim()
                : "DEBIT-" + UUID.randomUUID();

        String txType = (req.getReferenceType() != null && req.getReferenceType().toUpperCase().contains("BORROW"))
                ? "BORROW_PAYMENT_DEBIT"
                : (req.getReferenceType() != null && req.getReferenceType().toUpperCase().contains("FINE"))
                ? "FINE_DUE_DEBIT"
                : "PURCHASE_DEBIT";

        WalletTransaction wTx = WalletTransaction.builder()
                .wallet(wallet)
                .user(customer)
                .idempotencyKey(idemp)
                .txType(txType)
                .direction("DEBIT")
                .amount(amount)
                .state("SUCCESS")
                .balanceAfter(newBal)
                .reservedAfter(wallet.getReservedBalance())
                .referenceType(req.getReferenceType() != null ? req.getReferenceType() : "PURCHASE")
                .referenceId(req.getReferenceId() != null ? req.getReferenceId() : "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .description(req.getDescription() != null ? req.getDescription() : "Store order wallet deduction")
                .build();
        walletTransactionRepository.save(wTx);
        return getWalletView(customer);
    }

    @Transactional
    public void creditWallet(User customer, BigDecimal amount, String txType, String refType, String refId, String desc) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
        Wallet wallet = getOrCreateWallet(customer);
        BigDecimal newBal = wallet.getAvailableBalance().add(amount).setScale(2, RoundingMode.HALF_UP);
        wallet.setAvailableBalance(newBal);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        WalletTransaction wTx = WalletTransaction.builder()
                .wallet(wallet)
                .user(customer)
                .idempotencyKey("CREDIT-" + UUID.randomUUID())
                .txType(txType != null ? txType : "REFUND_CREDIT")
                .direction("CREDIT")
                .amount(amount)
                .state("SUCCESS")
                .balanceAfter(newBal)
                .reservedAfter(wallet.getReservedBalance())
                .referenceType(refType != null ? refType : "SYSTEM")
                .referenceId(refId != null ? refId : UUID.randomUUID().toString())
                .description(desc != null ? desc : "Wallet credit")
                .build();
        walletTransactionRepository.save(wTx);
    }

    private Wallet getOrCreateWallet(User user) {
        return walletRepository.findByUser_UserId(user.getUserId())
                .orElseGet(() -> walletRepository.save(Wallet.builder()
                        .user(user)
                        .currency("INR")
                        .availableBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .reservedBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .build()));
    }

    private void enforceCustomerRole(User user) {
        if (user == null || !"CUSTOMER".equalsIgnoreCase(user.getRole())) {
            throw new BusinessException("Only Customers have wallets", HttpStatus.FORBIDDEN);
        }
    }

    private BankAccountResponse toBankResponse(BankAccount b) {
        return BankAccountResponse.builder()
                .bankAccountId(b.getBankAccountId())
                .accountHolderName(b.getAccountHolderName())
                .bankName(b.getBankName())
                .ifscCode(b.getIfscCode())
                .maskedAccountNumber(b.getMaskedAccountNumber())
                .verified(b.isVerified())
                .primary(b.isPrimary())
                .createdAt(b.getCreatedAt())
                .build();
    }

    private WalletTransactionResponse toTxResponse(WalletTransaction tx) {
        return WalletTransactionResponse.builder()
                .txId(tx.getTxId())
                .txType(tx.getTxType())
                .direction(tx.getDirection())
                .amount(tx.getAmount())
                .state(tx.getState())
                .balanceAfter(tx.getBalanceAfter())
                .referenceType(tx.getReferenceType())
                .referenceId(tx.getReferenceId())
                .description(tx.getDescription())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
