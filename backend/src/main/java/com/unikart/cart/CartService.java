package com.unikart.cart;

import com.unikart.auth.User;
import com.unikart.cart.CartDtos.*;
import com.unikart.catalog.CopyRepository;
import com.unikart.catalog.Item;
import com.unikart.catalog.Listing;
import com.unikart.catalog.ListingRepository;
import com.unikart.common.BusinessException;
import com.unikart.institution.Store;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CartService {

    private static final Set<String> VALID_BORROW_DURATIONS = Set.of("DAYS_14", "DAYS_30", "DAYS_45");
    private static final BigDecimal INTRA_INST_DELIVERY_FEE = new BigDecimal("40.00");
    private static final BigDecimal CROSS_INST_DELIVERY_FEE = new BigDecimal("80.00");

    private final CartRepository cartRepository;
    private final CartLineRepository cartLineRepository;
    private final ListingRepository listingRepository;
    private final CopyRepository copyRepository;

    public CartService(
            CartRepository cartRepository,
            CartLineRepository cartLineRepository,
            ListingRepository listingRepository,
            CopyRepository copyRepository) {
        this.cartRepository = cartRepository;
        this.cartLineRepository = cartLineRepository;
        this.listingRepository = listingRepository;
        this.copyRepository = copyRepository;
    }

    /**
     * C-07: Retrieve or initialize the single ACTIVE cart for a Customer.
     */
    @Transactional
    public CartResponse getActiveCart(User customer) {
        enforceCustomerRole(customer);
        Cart cart = getOrCreateActiveCartEntity(customer);
        return buildCartResponse(cart, customer);
    }

    /**
     * CART-01, CART-02, BOR-02, BR-07:
     * Add a PURCHASE or BORROW line to the cart.
     * IMPORTANT (CART-02 & BR-07): Adding a line to the cart does NOT reserve or mutate Copy records.
     */
    @Transactional
    public CartResponse addLineToCart(User customer, AddCartLineRequest req) {
        enforceCustomerRole(customer);

        String lineType = req.getLineType().trim().toUpperCase(Locale.ROOT);
        if (!"PURCHASE".equals(lineType) && !"BORROW".equals(lineType)) {
            throw new BusinessException("Invalid lineType: must be PURCHASE or BORROW (CART-01)");
        }

        String borrowDuration = null;
        if ("BORROW".equals(lineType)) {
            if (req.getBorrowDuration() == null || req.getBorrowDuration().isBlank()) {
                throw new BusinessException("Borrow duration is required for BORROW cart lines (CART-01)");
            }
            borrowDuration = normalizeDuration(req.getBorrowDuration());
            if (!VALID_BORROW_DURATIONS.contains(borrowDuration)) {
                throw new BusinessException("Invalid borrow duration: must be DAYS_14, DAYS_30, or DAYS_45 (BOR-02)");
            }
            if (customer.isBlockedFlag()) {
                throw new BusinessException("Your account is blocked from placing new borrow requests due to unpaid undisputed dues (PEN-04)", HttpStatus.FORBIDDEN);
            }
        } else if (req.getBorrowDuration() != null && !req.getBorrowDuration().isBlank()) {
            throw new BusinessException("Purchase cart lines must not specify a borrow duration (CART-01)");
        }

        Listing listing = listingRepository.findByIdWithDetails(req.getListingId())
                .orElseThrow(() -> new BusinessException("Listing not found", HttpStatus.NOT_FOUND));

        if (!"ACTIVE".equalsIgnoreCase(listing.getStatus())) {
            throw new BusinessException("Listing is not active");
        }

        if ("PURCHASE".equals(lineType) && "BORROW_ONLY".equalsIgnoreCase(listing.getListingType())) {
            throw new BusinessException("This listing is available for borrowing only, not purchase");
        }
        if ("BORROW".equals(lineType) && "BUY_ONLY".equalsIgnoreCase(listing.getListingType())) {
            throw new BusinessException("This listing is available for purchase only, not borrowing");
        }

        Cart cart = getOrCreateActiveCartEntity(customer);

        Optional<CartLine> existingLineOpt = cartLineRepository.findByCart_CartIdAndListing_ListingIdAndLineTypeAndBorrowDuration(
                cart.getCartId(), listing.getListingId(), lineType, borrowDuration);

        if (existingLineOpt.isPresent()) {
            CartLine existing = existingLineOpt.get();
            existing.setQuantity(existing.getQuantity() + req.getQuantity());
            existing.setUpdatedAt(Instant.now());
            cartLineRepository.save(existing);
        } else {
            CartLine newLine = CartLine.builder()
                    .cart(cart)
                    .listing(listing)
                    .lineType(lineType)
                    .borrowDuration(borrowDuration)
                    .quantity(req.getQuantity())
                    .build();
            cart.getLines().add(newLine);
            cartLineRepository.save(newLine);
        }

        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);

        return buildCartResponse(cart, customer);
    }

    /**
     * Update quantity or borrow duration of an existing CartLine.
     */
    @Transactional
    public CartResponse updateCartLine(User customer, UUID cartLineId, UpdateCartLineRequest req) {
        enforceCustomerRole(customer);
        Cart cart = getOrCreateActiveCartEntity(customer);

        CartLine line = cartLineRepository.findById(cartLineId)
                .orElseThrow(() -> new BusinessException("Cart line not found", HttpStatus.NOT_FOUND));

        if (!line.getCart().getCartId().equals(cart.getCartId())) {
            throw new BusinessException("Cart line does not belong to your active cart", HttpStatus.FORBIDDEN);
        }

        if ("BORROW".equals(line.getLineType()) && req.getBorrowDuration() != null && !req.getBorrowDuration().isBlank()) {
            String normalized = normalizeDuration(req.getBorrowDuration());
            if (!VALID_BORROW_DURATIONS.contains(normalized)) {
                throw new BusinessException("Invalid borrow duration: must be DAYS_14, DAYS_30, or DAYS_45 (BOR-02)");
            }
            line.setBorrowDuration(normalized);
        }

        line.setQuantity(req.getQuantity());
        line.setUpdatedAt(Instant.now());
        cartLineRepository.save(line);

        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return buildCartResponse(cart, customer);
    }

    /**
     * Remove a single line from the customer's active cart.
     */
    @Transactional
    public CartResponse removeCartLine(User customer, UUID cartLineId) {
        enforceCustomerRole(customer);
        Cart cart = getOrCreateActiveCartEntity(customer);

        CartLine line = cartLineRepository.findById(cartLineId)
                .orElseThrow(() -> new BusinessException("Cart line not found", HttpStatus.NOT_FOUND));

        if (!line.getCart().getCartId().equals(cart.getCartId())) {
            throw new BusinessException("Cart line does not belong to your active cart", HttpStatus.FORBIDDEN);
        }

        cart.getLines().remove(line);
        cartLineRepository.delete(line);
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);

        return buildCartResponse(cart, customer);
    }

    /**
     * Clear all lines from the customer's active cart.
     */
    @Transactional
    public CartResponse clearCart(User customer) {
        enforceCustomerRole(customer);
        Cart cart = getOrCreateActiveCartEntity(customer);
        cart.getLines().clear();
        cart.setUpdatedAt(Instant.now());
        cartRepository.save(cart);
        return buildCartResponse(cart, customer);
    }

    @Transactional
    public Cart getOrCreateActiveCartEntity(User customer) {
        return cartRepository.findActiveCartWithLinesByUserId(customer.getUserId())
                .orElseGet(() -> cartRepository.save(Cart.builder()
                        .user(customer)
                        .status("ACTIVE")
                        .build()));
    }

    private CartResponse buildCartResponse(Cart cart, User customer) {
        UUID customerInstId = customer.getInstitution() != null ? customer.getInstitution().getInstitutionId() : null;
        List<CartLine> sortedLines = cartLineRepository.findByCart_CartIdOrderByCreatedAtAsc(cart.getCartId());

        Map<UUID, List<CartLine>> linesByStore = new LinkedHashMap<>();
        for (CartLine cl : sortedLines) {
            UUID storeId = cl.getListing().getStore().getStoreId();
            linesByStore.computeIfAbsent(storeId, k -> new ArrayList<>()).add(cl);
        }

        List<StoreCartGroupView> storeGroups = new ArrayList<>();
        BigDecimal grandItemsSubtotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandDepositTotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandEstimatedDelivery = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        int totalUnits = 0;
        boolean anyUnavailable = false;

        for (Map.Entry<UUID, List<CartLine>> entry : linesByStore.entrySet()) {
            List<CartLine> storeLines = entry.getValue();
            Store store = storeLines.get(0).getListing().getStore();
            UUID storeInstId = store.getInstitution().getInstitutionId();
            boolean isCrossInst = customerInstId == null || !customerInstId.equals(storeInstId);

            // CART-03 & FUL-04: Self Pickup is permitted only when the store belongs to the customer's institution
            List<String> allowedFulfilment = isCrossInst
                    ? List.of("DELIVERY")
                    : List.of("SELF_PICKUP", "DELIVERY");
            String defaultFulfilment = isCrossInst ? "DELIVERY" : "SELF_PICKUP";
            BigDecimal estDeliveryFee = isCrossInst ? CROSS_INST_DELIVERY_FEE : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            BigDecimal storeSubtotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            BigDecimal storeDeposits = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            List<CartLineView> lineViews = new ArrayList<>();

            for (CartLine cl : storeLines) {
                Listing listing = cl.getListing();
                Item item = listing.getItem();
                BigDecimal qty = BigDecimal.valueOf(cl.getQuantity());
                totalUnits += cl.getQuantity();

                BigDecimal unitPriceOrFee;
                BigDecimal unitDeposit;
                long eligibleCount;

                if ("PURCHASE".equals(cl.getLineType())) {
                    unitPriceOrFee = listing.getSalePrice().setScale(2, RoundingMode.HALF_UP);
                    unitDeposit = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                    eligibleCount = copyRepository.countEligibleCopiesForSale(item.getItemId(), store.getStoreId());
                } else {
                    BigDecimal feePct = resolveBorrowFeePct(listing, cl.getBorrowDuration());
                    unitPriceOrFee = listing.getBaseItemValue()
                            .multiply(feePct)
                            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                    unitDeposit = listing.getBaseItemValue()
                            .multiply(listing.getDepositPct())
                            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                    eligibleCount = copyRepository.countEligibleCopiesForBorrow(item.getItemId(), store.getStoreId());
                }

                boolean available = eligibleCount >= cl.getQuantity();
                if (!available) {
                    anyUnavailable = true;
                }

                BigDecimal lineSub = unitPriceOrFee.multiply(qty).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineDep = unitDeposit.multiply(qty).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineTot = lineSub.add(lineDep).setScale(2, RoundingMode.HALF_UP);

                storeSubtotal = storeSubtotal.add(lineSub);
                storeDeposits = storeDeposits.add(lineDep);

                lineViews.add(CartLineView.builder()
                        .cartLineId(cl.getCartLineId())
                        .listingId(listing.getListingId())
                        .itemId(item.getItemId())
                        .title(item.getTitle())
                        .author(item.getAuthor())
                        .isbnOrCode(item.getIsbnOrCode())
                        .category(item.getCategory())
                        .coverImageUrl(item.getCoverImageUrl())
                        .storeId(store.getStoreId())
                        .storeCode(store.getStoreCode())
                        .storeName(store.getName())
                        .institutionId(storeInstId)
                        .institutionName(store.getInstitution().getName())
                        .lineType(cl.getLineType())
                        .borrowDuration(cl.getBorrowDuration())
                        .quantity(cl.getQuantity())
                        .unitItemValue(listing.getBaseItemValue())
                        .unitPriceOrFee(unitPriceOrFee)
                        .unitDeposit(unitDeposit)
                        .lineSubtotal(lineSub)
                        .lineDepositTotal(lineDep)
                        .lineTotal(lineTot)
                        .currentAvailableCopies(eligibleCount)
                        .currentlyAvailable(available)
                        .build());
            }

            grandItemsSubtotal = grandItemsSubtotal.add(storeSubtotal);
            grandDepositTotal = grandDepositTotal.add(storeDeposits);
            grandEstimatedDelivery = grandEstimatedDelivery.add(estDeliveryFee);

            storeGroups.add(StoreCartGroupView.builder()
                    .storeId(store.getStoreId())
                    .storeCode(store.getStoreCode())
                    .storeName(store.getName())
                    .institutionId(storeInstId)
                    .institutionCode(store.getInstitution().getCode())
                    .institutionName(store.getInstitution().getName())
                    .isCrossInstitution(isCrossInst)
                    .selfPickupAllowed(!isCrossInst)
                    .allowedFulfilmentMethods(allowedFulfilment)
                    .defaultFulfilmentMethod(defaultFulfilment)
                    .estimatedDeliveryFee(estDeliveryFee)
                    .storeItemsSubtotal(storeSubtotal)
                    .storeDepositsTotal(storeDeposits)
                    .lines(lineViews)
                    .build());
        }

        BigDecimal estimatedGrand = grandItemsSubtotal.add(grandDepositTotal).add(grandEstimatedDelivery)
                .setScale(2, RoundingMode.HALF_UP);

        return CartResponse.builder()
                .cartId(cart.getCartId())
                .userId(customer.getUserId())
                .status(cart.getStatus())
                .totalLinesCount(sortedLines.size())
                .totalUnitsCount(totalUnits)
                .storeGroups(storeGroups)
                .itemsSubtotal(grandItemsSubtotal)
                .totalRefundableDeposit(grandDepositTotal)
                .estimatedDeliveryTotal(grandEstimatedDelivery)
                .estimatedGrandTotal(estimatedGrand)
                .hasUnavailableLines(anyUnavailable)
                .reservationNotice("CART-02: Adding items to your cart does not reserve stock. Final copy allocation occurs atomically upon payment.")
                .build();
    }

    private BigDecimal resolveBorrowFeePct(Listing listing, String duration) {
        if ("DAYS_14".equals(duration)) {
            return listing.getBorrowFeePct14d();
        } else if ("DAYS_30".equals(duration)) {
            return listing.getBorrowFeePct30d();
        } else if ("DAYS_45".equals(duration)) {
            return listing.getBorrowFeePct45d();
        }
        throw new BusinessException("Unsupported borrow duration: " + duration);
    }

    private String normalizeDuration(String raw) {
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if ("14_DAYS".equals(upper) || "14D".equals(upper) || "14".equals(upper)) return "DAYS_14";
        if ("30_DAYS".equals(upper) || "1_MONTH".equals(upper) || "30D".equals(upper) || "30".equals(upper)) return "DAYS_30";
        if ("45_DAYS".equals(upper) || "45D".equals(upper) || "45".equals(upper)) return "DAYS_45";
        return upper;
    }

    private void enforceCustomerRole(User user) {
        if (user == null || !"CUSTOMER".equalsIgnoreCase(user.getRole())) {
            throw new BusinessException("Only authorised Customers may use a shopping cart", HttpStatus.FORBIDDEN);
        }
    }
}
