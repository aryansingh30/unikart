package com.unikart.cart;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.cart.CartDtos.*;
import com.unikart.catalog.*;
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

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CartServiceTest {

    @Autowired
    private CartService cartService;

    @Autowired
    private CatalogAndInventoryService catalogService;

    @Autowired
    private CopyRepository copyRepository;

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
    private ListingResponse iitListing;
    private ListingResponse nitListing;
    private CopyResponse singleIitCopy;

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
                .locationDetails("Student Activity Center")
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
                .fullName("IIT Manager")
                .email("mgr.iit@unikart.in")
                .phone("9000000001")
                .passwordHash("hash")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        nitManager = userRepository.save(User.builder()
                .institution(nitTrichy)
                .assignedStore(nitStore)
                .fullName("NIT Manager")
                .email("mgr.nit@unikart.in")
                .phone("9000000002")
                .passwordHash("hash")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        iitCustomer = userRepository.save(User.builder()
                .institution(iitDelhi)
                .institutionalId("2026IS07")
                .fullName("Aryan Singh")
                .email("aryan.singh@iitd.ac.in")
                .phone("9000000003")
                .passwordHash("hash")
                .role("CUSTOMER")
                .designation("STUDENT")
                .build());

        Item book1 = catalogService.createItem(CreateItemRequest.builder()
                .title("Designing Data-Intensive Applications")
                .author("Martin Kleppmann")
                .isbnOrCode("978-1449373320")
                .category("BOOK")
                .subject("Distributed Systems")
                .courseCode("CSL718")
                .baseValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        singleIitCopy = catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(book1.getItemId())
                .copyCode("IITD-DDIA-01")
                .condition("NEW")
                .build(), iitManager);

        iitListing = catalogService.createListing(iitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(book1.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("800.00"))
                .baseItemValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        Item book2 = catalogService.createItem(CreateItemRequest.builder()
                .title("Compilers: Principles, Techniques, and Tools")
                .author("Aho, Lam, Sethi, Ullman")
                .isbnOrCode("978-0321486813")
                .category("BOOK")
                .subject("Compiler Design")
                .courseCode("CSL411")
                .baseValue(new BigDecimal("1200.00"))
                .build(), nitManager);

        catalogService.createCopy(nitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(book2.getItemId())
                .copyCode("NITT-DRAGON-01")
                .condition("GOOD")
                .build(), nitManager);

        nitListing = catalogService.createListing(nitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(book2.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("900.00"))
                .baseItemValue(new BigDecimal("1200.00"))
                .build(), nitManager);
    }

    @Test
    @DisplayName("CART-01, CART-03, CART-04: Supports mixed purchase + borrow lines across multiple stores with store-grouped fulfilment rules")
    void mixedPurchaseAndBorrowMultiStoreCartGrouping() {
        // Add 1 Borrow line (30 days = 18% fee = 180, 50% deposit = 500) from own institution (IIT Delhi)
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_30")
                .quantity(1)
                .build());

        // Add 1 Purchase line (salePrice = 900) from cross-institution store (NIT Trichy)
        CartResponse cart = cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(nitListing.getListingId())
                .lineType("PURCHASE")
                .quantity(1)
                .build());

        assertThat(cart.getTotalLinesCount()).isEqualTo(2);
        assertThat(cart.getStoreGroups()).hasSize(2);

        // Group 1: IIT Delhi (same institution -> SELF_PICKUP and DELIVERY allowed)
        StoreCartGroupView iitGroup = cart.getStoreGroups().get(0);
        assertThat(iitGroup.isCrossInstitution()).isFalse();
        assertThat(iitGroup.isSelfPickupAllowed()).isTrue();
        assertThat(iitGroup.getAllowedFulfilmentMethods()).containsExactly("SELF_PICKUP", "DELIVERY");
        assertThat(iitGroup.getStoreItemsSubtotal()).isEqualByComparingTo("180.00");
        assertThat(iitGroup.getStoreDepositsTotal()).isEqualByComparingTo("500.00");

        // Group 2: NIT Trichy (cross-institution -> DELIVERY only, 80 INR fee)
        StoreCartGroupView nitGroup = cart.getStoreGroups().get(1);
        assertThat(nitGroup.isCrossInstitution()).isTrue();
        assertThat(nitGroup.isSelfPickupAllowed()).isFalse();
        assertThat(nitGroup.getAllowedFulfilmentMethods()).containsExactly("DELIVERY");
        assertThat(nitGroup.getEstimatedDeliveryFee()).isEqualByComparingTo("80.00");
        assertThat(nitGroup.getStoreItemsSubtotal()).isEqualByComparingTo("900.00");

        // Grand totals: items (180 + 900 = 1080) + deposit (500) + est delivery (80) = 1660.00
        assertThat(cart.getItemsSubtotal()).isEqualByComparingTo("1080.00");
        assertThat(cart.getTotalRefundableDeposit()).isEqualByComparingTo("500.00");
        assertThat(cart.getEstimatedDeliveryTotal()).isEqualByComparingTo("80.00");
        assertThat(cart.getEstimatedGrandTotal()).isEqualByComparingTo("1660.00");
    }

    @Test
    @DisplayName("CART-02 & BR-07: Adding a line to the cart does NOT reserve stock or mutate Copy status")
    void addingToCartDoesNotReserveCopyStock() {
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("PURCHASE")
                .quantity(1)
                .build());

        // Physical copy in database must remain AVAILABLE
        Copy copyInDb = copyRepository.findById(singleIitCopy.getCopyId()).orElseThrow();
        assertThat(copyInDb.getStatus()).isEqualTo("AVAILABLE");

        // If the copy is later borrowed/allocated by someone else, the cart dynamically reflects unavailability
        copyInDb.setStatus("BORROWED");
        copyRepository.save(copyInDb);

        CartResponse refreshedCart = cartService.getActiveCart(iitCustomer);
        assertThat(refreshedCart.isHasUnavailableLines()).isTrue();
        assertThat(refreshedCart.getStoreGroups().get(0).getLines().get(0).isCurrentlyAvailable()).isFalse();
    }

    @Test
    @DisplayName("PEN-04 & BOR-02: Blocked customers cannot add borrow lines, and invalid borrow durations are rejected")
    void blockedCustomerAndInvalidDurationValidation() {
        assertThatThrownBy(() -> cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_90")
                .quantity(1)
                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("BOR-02");

        iitCustomer.setBlockedFlag(true);
        userRepository.save(iitCustomer);

        assertThatThrownBy(() -> cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_14")
                .quantity(1)
                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("PEN-04");
    }
}
