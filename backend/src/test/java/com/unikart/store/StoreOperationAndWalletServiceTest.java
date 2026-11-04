package com.unikart.store;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.catalog.*;
import com.unikart.catalog.CatalogDtos.*;
import com.unikart.institution.Institution;
import com.unikart.institution.InstitutionRepository;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
import com.unikart.store.StoreOperationDtos.*;
import com.unikart.wallet.*;
import com.unikart.wallet.WalletDtos.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreOperationAndWalletServiceTest {

    @Autowired
    private StoreOperationService storeOperationService;

    @Autowired
    private WalletService walletService;

    @Autowired
    private CatalogAndInventoryService catalogService;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CopyRepository copyRepository;

    private Institution iitDelhi;
    private Store iitStore;
    private User iitManager;
    private User iitCustomer;
    private Item testItem;

    @BeforeEach
    void setUp() {
        iitDelhi = institutionRepository.save(Institution.builder()
                .code("IITD")
                .name("IIT Delhi")
                .emailDomain("iitd.ac.in")
                .city("New Delhi")
                .state("Delhi")
                .address("Hauz Khas")
                .build());

        iitStore = storeRepository.save(Store.builder()
                .institution(iitDelhi)
                .storeCode("IITD-MAIN")
                .name("Unikart IIT Delhi Store")
                .locationDetails("SAC")
                .build());

        iitManager = userRepository.save(User.builder()
                .institution(iitDelhi)
                .assignedStore(iitStore)
                .fullName("IIT Manager")
                .email("mgr@unikart.in")
                .phone("9111111111")
                .passwordHash("hash")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        iitCustomer = userRepository.save(User.builder()
                .institution(iitDelhi)
                .institutionalId("2026IS07")
                .fullName("Aryan Singh")
                .email("aryan@iitd.ac.in")
                .phone("9333333333")
                .passwordHash("hash")
                .role("CUSTOMER")
                .designation("STUDENT")
                .build());

        testItem = catalogService.createItem(CreateItemRequest.builder()
                .title("Clean Code")
                .author("Robert C. Martin")
                .isbnOrCode("978-0132350884")
                .category("BOOK")
                .subject("Software Engineering")
                .courseCode("CSL701")
                .baseValue(new BigDecimal("1000.00"))
                .build(), iitManager);
    }

    @Test
    @DisplayName("AT-SELL-01 (SELL-01..08): In-store sell submission valuation quote approval credits seller wallet and creates Copy and Listing")
    void sellToStoreApprovalCreditsWalletAndCreatesCopyAndListing() {
        SellSubmissionResponse submission = storeOperationService.createSellSubmission(
                iitStore.getStoreId(),
                CreateSellSubmissionRequest.builder()
                        .sellerEmail(iitCustomer.getEmail())
                        .visitNotes("Brought in person to store")
                        .lines(List.of(
                                SellLineQuoteInput.builder()
                                        .itemId(testItem.getItemId())
                                        .assessedCondition("GOOD")
                                        .quotedAmount(new BigDecimal("400.00"))
                                        .intendedListingType("BUY_AND_BORROW")
                                        .build()
                        ))
                        .build(),
                iitManager);

        assertThat(submission.getStatus()).isEqualTo("QUOTED");
        assertThat(submission.getTotalQuotedAmount()).isEqualByComparingTo("400.00");

        // Manager approves quote (SELL-04, SELL-05, SELL-07)
        SellSubmissionResponse approved = storeOperationService.decideSellSubmission(
                submission.getSubmissionId(),
                ManagerDecideSellRequest.builder()
                        .decisionAction("APPROVE")
                        .notes("Approved")
                        .build(),
                iitManager);

        assertThat(approved.getStatus()).isEqualTo("SELLER_ACCEPTED_APPROVED");
        assertThat(approved.getTotalApprovedPayout()).isEqualByComparingTo("400.00");

        // Verify seller wallet credited with ₹400
        WalletViewResponse wallet = walletService.getWalletView(iitCustomer);
        assertThat(wallet.getAvailableBalance()).isEqualByComparingTo("400.00");
        assertThat(wallet.getTransactions()).hasSize(1);
        assertThat(wallet.getTransactions().get(0).getTxType()).isEqualTo("SELLER_PAYOUT_CREDIT");

        // Verify new Copy created in store inventory
        List<CopyResponse> copies = catalogService.getStoreInventoryCopies(iitStore.getStoreId(), iitManager);
        assertThat(copies).hasSize(1);
        assertThat(copies.get(0).getCondition()).isEqualTo("GOOD");
        assertThat(copies.get(0).getAcquisitionSource()).isEqualTo("CUSTOMER_SELL");
    }

    @Test
    @DisplayName("WAL-04, WAL-07, WAL-10: Wallet redemption to validated bank account reserves funds and records successful payout")
    void walletRedemptionToBankAccount() {
        // First credit wallet via sell approval
        storeOperationService.createSellSubmission(
                iitStore.getStoreId(),
                CreateSellSubmissionRequest.builder()
                        .sellerEmail(iitCustomer.getEmail())
                        .lines(List.of(SellLineQuoteInput.builder()
                                .itemId(testItem.getItemId())
                                .assessedCondition("NEW")
                                .quotedAmount(new BigDecimal("500.00"))
                                .build()))
                        .build(),
                iitManager);

        storeOperationService.decideSellSubmission(
                storeOperationService.getCustomerSellSubmissions(iitCustomer).get(0).getSubmissionId(),
                ManagerDecideSellRequest.builder().decisionAction("APPROVE").build(),
                iitManager);

        // Add bank account
        BankAccountResponse bank = walletService.addBankAccount(iitCustomer, AddBankAccountRequest.builder()
                .accountHolderName("Aryan Singh")
                .bankName("State Bank of India")
                .ifscCode("SBIN0001234")
                .accountNumber("123456789012")
                .build());

        // Redeem ₹300 to bank account
        WalletViewResponse updated = walletService.redeemToBank(iitCustomer, RedeemWalletRequest.builder()
                .amount(new BigDecimal("300.00"))
                .bankAccountId(bank.getBankAccountId())
                .idempotencyKey("REDEEM-KEY-01")
                .build());

        assertThat(updated.getAvailableBalance()).isEqualByComparingTo("200.00"); // 500 - 300 = 200
        assertThat(updated.getTransactions()).hasSize(2); // Payout credit + bank debit
    }
}
