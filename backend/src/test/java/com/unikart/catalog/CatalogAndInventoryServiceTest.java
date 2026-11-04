package com.unikart.catalog;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.catalog.CatalogDtos.*;
import com.unikart.common.BusinessException;
import com.unikart.institution.Institution;
import com.unikart.institution.InstitutionRepository;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
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
class CatalogAndInventoryServiceTest {

    @Autowired
    private CatalogAndInventoryService catalogService;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    private Institution iitDelhi;
    private Institution nitTrichy;
    private Store iitStore;
    private Store nitStore;
    private User iitManager;
    private User nitManager;
    private User iitCustomer;

    @BeforeEach
    void setUp() {
        iitDelhi = institutionRepository.save(Institution.builder()
                .code("IITD")
                .name("IIT Delhi")
                .emailDomain("iitd.ac.in")
                .city("New Delhi")
                .state("Delhi")
                .address("Hauz Khas, New Delhi")
                .build());

        nitTrichy = institutionRepository.save(Institution.builder()
                .code("NITT")
                .name("NIT Trichy")
                .emailDomain("nitt.edu")
                .city("Tiruchirappalli")
                .state("Tamil Nadu")
                .address("Tanjore Main Road, Trichy")
                .build());

        iitStore = storeRepository.save(Store.builder()
                .institution(iitDelhi)
                .storeCode("IITD-MAIN")
                .name("Unikart IIT Delhi Store")
                .locationDetails("Student Activity Center, Ground Floor")
                .build());

        nitStore = storeRepository.save(Store.builder()
                .institution(nitTrichy)
                .storeCode("NITT-MAIN")
                .name("Unikart NIT Trichy Store")
                .locationDetails("Octagon Building")
                .build());

        iitManager = userRepository.save(User.builder()
                .institution(iitDelhi)
                .assignedStore(iitStore)
                .fullName("Rajesh Sharma")
                .email("manager.iitd@unikart.in")
                .phone("9876543210")
                .passwordHash("hashed")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        nitManager = userRepository.save(User.builder()
                .institution(nitTrichy)
                .assignedStore(nitStore)
                .fullName("Karthik Iyer")
                .email("manager.nitt@unikart.in")
                .phone("9876543211")
                .passwordHash("hashed")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        iitCustomer = userRepository.save(User.builder()
                .institution(iitDelhi)
                .institutionalId("2026CS101")
                .fullName("Aryan Singh")
                .email("aryan@iitd.ac.in")
                .phone("9876543212")
                .passwordHash("hashed")
                .role("CUSTOMER")
                .designation("STUDENT")
                .build());
    }

    @Test
    @DisplayName("AT-CAT-01 (CAT-06 / INV-04): Derived availability equals count of eligible AVAILABLE copies")
    void derivedAvailabilityMatchesEligibleCopies() {
        Item clrs = catalogService.createItem(CreateItemRequest.builder()
                .title("Introduction to Algorithms")
                .author("Cormen, Leiserson, Rivest, Stein")
                .isbnOrCode("978-0262046305")
                .category("BOOK")
                .subject("Computer Science")
                .courseCode("CSL356")
                .baseValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        ListingResponse listing = catalogService.createListing(iitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(clrs.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("750.00"))
                .baseItemValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        // Add 3 eligible copies (NEW, GOOD, FAIR) and 1 unavailable (BORROWED) copy
        for (int i = 1; i <= 3; i++) {
            catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                    .itemId(clrs.getItemId())
                    .copyCode("IITD-CLRS-00" + i)
                    .condition(i == 1 ? "NEW" : "GOOD")
                    .build(), iitManager);
        }
        CopyResponse fourthCopy = catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(clrs.getItemId())
                .copyCode("IITD-CLRS-004")
                .condition("GOOD")
                .build(), iitManager);

        catalogService.updateCopyStatus(fourthCopy.getCopyId(), UpdateCopyStatusRequest.builder()
                .condition("GOOD")
                .status("BORROWED")
                .allowedForSale(true)
                .allowedForBorrow(true)
                .build(), iitManager);

        ListingResponse refreshed = catalogService.getListingById(listing.getListingId(), iitDelhi.getInstitutionId());
        assertThat(refreshed.getAvailableForSaleCount()).isEqualTo(3L);
        assertThat(refreshed.getAvailableForBorrowCount()).isEqualTo(3L);
        assertThat(refreshed.getTotalAvailableCopies()).isEqualTo(3L);
        assertThat(refreshed.getBorrowFee14d()).isEqualByComparingTo("100.00");
        assertThat(refreshed.getBorrowFee30d()).isEqualByComparingTo("180.00");
        assertThat(refreshed.getBorrowFee45d()).isEqualByComparingTo("250.00");
        assertThat(refreshed.getDepositAmount()).isEqualByComparingTo("500.00");
        assertThat(refreshed.isSelfPickupAllowedForViewer()).isTrue();
        assertThat(refreshed.getAllowedFulfilmentOptions()).containsExactly("SELF_PICKUP", "DELIVERY");
    }

    @Test
    @DisplayName("CAT-04 & INV-02: Customers cannot create listings and Store Managers cannot access another store")
    void enforcesRoleAndStoreScopingOnInventory() {
        Item item = catalogService.createItem(CreateItemRequest.builder()
                .title("Database System Concepts")
                .author("Silberschatz, Korth")
                .isbnOrCode("978-0078022159")
                .category("BOOK")
                .subject("Databases")
                .courseCode("CSL332")
                .baseValue(new BigDecimal("800.00"))
                .build(), iitManager);

        // Customer trying to create listing -> Forbidden
        assertThatThrownBy(() -> catalogService.createListing(iitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(item.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("600.00"))
                .baseItemValue(new BigDecimal("800.00"))
                .build(), iitCustomer))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("CAT-04");

        // NIT Trichy Manager trying to add copy to IIT Delhi Store -> Forbidden (INV-02 / AUTH-04)
        assertThatThrownBy(() -> catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(item.getItemId())
                .copyCode("CROSS-STORE-01")
                .condition("NEW")
                .build(), nitManager))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("INV-02");
    }

    @Test
    @DisplayName("CAT-05: Customer can join waitlist when item has 0 available copies and is auto-notified on restock")
    void waitlistJoinAndAutoNotificationOnCopyAvailable() {
        Item notes = catalogService.createItem(CreateItemRequest.builder()
                .title("Operating Systems Lecture Notes")
                .author("Prof. Sorav Bansal")
                .isbnOrCode("IITD-NOTES-OS-2026")
                .category("NOTES")
                .subject("Operating Systems")
                .courseCode("COL331")
                .baseValue(new BigDecimal("300.00"))
                .build(), iitManager);

        ListingResponse listing = catalogService.createListing(iitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(notes.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("220.00"))
                .baseItemValue(new BigDecimal("300.00"))
                .build(), iitManager);

        // 0 copies initially -> join waitlist succeeds
        WaitlistResponse wl = catalogService.joinWaitlist(listing.getListingId(), iitCustomer);
        assertThat(wl.getStatus()).isEqualTo("WAITING");

        // Adding an available copy automatically transitions waitlist entry to NOTIFIED
        catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(notes.getItemId())
                .copyCode("IITD-OS-COPY-1")
                .condition("NEW")
                .build(), iitManager);

        List<ListingResponse> searchRes = catalogService.searchCatalog("Operating Systems", null, null, null, null, null, null, true, nitTrichy.getInstitutionId());
        assertThat(searchRes).hasSize(1);
        // Viewer from NIT Trichy viewing IIT Delhi listing sees DELIVERY only (FUL-04 / CAT-03)
        assertThat(searchRes.get(0).isSelfPickupAllowedForViewer()).isFalse();
        assertThat(searchRes.get(0).getAllowedFulfilmentOptions()).containsExactly("DELIVERY");
    }
}
