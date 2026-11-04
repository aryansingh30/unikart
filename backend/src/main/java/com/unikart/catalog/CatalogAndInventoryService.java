package com.unikart.catalog;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.catalog.CatalogDtos.*;
import com.unikart.common.BusinessException;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CatalogAndInventoryService {

    private final ItemRepository itemRepository;
    private final CopyRepository copyRepository;
    private final ListingRepository listingRepository;
    private final WaitlistEntryRepository waitlistEntryRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final BookReviewRepository bookReviewRepository;

    public CatalogAndInventoryService(
            ItemRepository itemRepository,
            CopyRepository copyRepository,
            ListingRepository listingRepository,
            WaitlistEntryRepository waitlistEntryRepository,
            StoreRepository storeRepository,
            UserRepository userRepository,
            BookReviewRepository bookReviewRepository) {
        this.itemRepository = itemRepository;
        this.copyRepository = copyRepository;
        this.listingRepository = listingRepository;
        this.waitlistEntryRepository = waitlistEntryRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.bookReviewRepository = bookReviewRepository;
    }

    /**
     * CAT-01, CAT-02, CAT-03, CAT-06, INV-04:
     * Search across participating stores with derived availability calculated from eligible Copy records.
     */
    @Transactional(readOnly = true)
    public List<ListingResponse> searchCatalog(
            String query,
            UUID institutionId,
            UUID storeId,
            String listingType,
            String category,
            String condition,
            BigDecimal maxPrice,
            boolean inStockOnly,
            UUID viewerInstitutionId) {

        List<Listing> activeListings = listingRepository.findAllActiveWithItemAndStore();
        String normalizedQuery = query != null ? query.trim().toLowerCase(Locale.ROOT) : "";

        return activeListings.stream()
                .filter(l -> {
                    if (institutionId != null && !l.getStore().getInstitution().getInstitutionId().equals(institutionId)) {
                        return false;
                    }
                    if (storeId != null && !l.getStore().getStoreId().equals(storeId)) {
                        return false;
                    }
                    if (listingType != null && !listingType.isBlank()) {
                        if ("BUY".equalsIgnoreCase(listingType) && "BORROW_ONLY".equalsIgnoreCase(l.getListingType())) {
                            return false;
                        }
                        if ("BORROW".equalsIgnoreCase(listingType) && "BUY_ONLY".equalsIgnoreCase(l.getListingType())) {
                            return false;
                        }
                        if (!"BUY".equalsIgnoreCase(listingType) && !"BORROW".equalsIgnoreCase(listingType)
                                && !l.getListingType().equalsIgnoreCase(listingType)) {
                            return false;
                        }
                    }
                    if (category != null && !category.isBlank() && !l.getItem().getCategory().equalsIgnoreCase(category)) {
                        return false;
                    }
                    if (maxPrice != null && l.getSalePrice().compareTo(maxPrice) > 0) {
                        return false;
                    }
                    if (!normalizedQuery.isEmpty()) {
                        Item item = l.getItem();
                        boolean matches = item.getTitle().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                                || item.getAuthor().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                                || item.getIsbnOrCode().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                                || item.getSubject().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                                || item.getCourseCode().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                                || (item.getDescription() != null && item.getDescription().toLowerCase(Locale.ROOT).contains(normalizedQuery));
                        if (!matches) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(l -> toListingResponse(l, viewerInstitutionId))
                .filter(resp -> {
                    if (condition != null && !condition.isBlank()) {
                        if (!resp.getAvailableConditions().contains(condition.toUpperCase(Locale.ROOT))
                                && !condition.equalsIgnoreCase(resp.getBestAvailableCondition())) {
                            return false;
                        }
                    }
                    if (inStockOnly && resp.getTotalAvailableCopies() <= 0) {
                        return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ListingResponse getListingById(UUID listingId, UUID viewerInstitutionId) {
        Listing listing = listingRepository.findByIdWithDetails(listingId)
                .orElseThrow(() -> new BusinessException("Listing not found", HttpStatus.NOT_FOUND));
        return toListingResponse(listing, viewerInstitutionId);
    }

    /**
     * CAT-04, INV-02: Only Store Managers (for their own store) or Platform Admins can create items/copies/listings.
     */
    @Transactional
    public Item createItem(CreateItemRequest req, User actor) {
        enforceStaffRole(actor);
        if (itemRepository.existsByIsbnOrCodeIgnoreCase(req.getIsbnOrCode())) {
            throw new BusinessException("Item with ISBN/code already exists: " + req.getIsbnOrCode(), HttpStatus.CONFLICT);
        }
        Item item = Item.builder()
                .title(req.getTitle().trim())
                .author(req.getAuthor().trim())
                .isbnOrCode(req.getIsbnOrCode().trim())
                .category(req.getCategory().toUpperCase(Locale.ROOT))
                .formatType("PHYSICAL")
                .subject(req.getSubject().trim())
                .courseCode(req.getCourseCode().trim())
                .semester(req.getSemester())
                .publisher(req.getPublisher())
                .edition(req.getEdition())
                .publicationYear(req.getPublicationYear())
                .description(req.getDescription())
                .coverImageUrl(req.getCoverImageUrl())
                .baseValue(req.getBaseValue())
                .status("ACTIVE")
                .build();
        return itemRepository.save(item);
    }

    /**
     * INV-01, INV-02: Store Manager adds a physical Copy to their assigned store (or Admin specifies store).
     */
    @Transactional
    public CopyResponse createCopy(UUID storeId, CreateCopyRequest req, User actor) {
        Store store = resolveAndAuthorizeStoreAccess(storeId, actor);
        Item item = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new BusinessException("Item not found", HttpStatus.NOT_FOUND));

        if (copyRepository.findByCopyCodeIgnoreCase(req.getCopyCode()).isPresent()) {
            throw new BusinessException("Duplicate Copy Code: " + req.getCopyCode(), HttpStatus.CONFLICT);
        }

        Copy copy = Copy.builder()
                .copyCode(req.getCopyCode().trim())
                .item(item)
                .store(store)
                .condition(req.getCondition().toUpperCase(Locale.ROOT))
                .status("AVAILABLE")
                .allowedForSale(req.isAllowedForSale())
                .allowedForBorrow(req.isAllowedForBorrow())
                .acquisitionSource(req.getAcquisitionSource() != null ? req.getAcquisitionSource() : "STORE_PROCUREMENT")
                .conditionNotes(req.getConditionNotes())
                .build();

        Copy saved = copyRepository.save(copy);
        notifyWaitlistIfBorrowableCopyAvailable(item.getItemId(), store.getStoreId());
        return toCopyResponse(saved);
    }

    /**
     * INV-01, INV-02, INV-05: Update physical Copy condition or status.
     */
    @Transactional
    public CopyResponse updateCopyStatus(UUID copyId, UpdateCopyStatusRequest req, User actor) {
        Copy copy = copyRepository.findById(copyId)
                .orElseThrow(() -> new BusinessException("Copy not found", HttpStatus.NOT_FOUND));
        resolveAndAuthorizeStoreAccess(copy.getStore().getStoreId(), actor);

        String previousStatus = copy.getStatus();
        copy.setCondition(req.getCondition().toUpperCase(Locale.ROOT));
        copy.setStatus(req.getStatus().toUpperCase(Locale.ROOT));
        copy.setAllowedForSale(req.isAllowedForSale());
        copy.setAllowedForBorrow(req.isAllowedForBorrow());
        copy.setConditionNotes(req.getConditionNotes());
        copy.setUpdatedAt(Instant.now());

        Copy saved = copyRepository.save(copy);
        if (!"AVAILABLE".equals(previousStatus) && "AVAILABLE".equals(saved.getStatus())) {
            notifyWaitlistIfBorrowableCopyAvailable(saved.getItem().getItemId(), saved.getStore().getStoreId());
        }
        return toCopyResponse(saved);
    }

    /**
     * CAT-04, INV-02, INV-03, C-05: Create or publish a store-level Listing for an Item.
     */
    @Transactional
    public ListingResponse createListing(UUID storeId, CreateListingRequest req, User actor) {
        Store store = resolveAndAuthorizeStoreAccess(storeId, actor);
        Item item = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new BusinessException("Item not found", HttpStatus.NOT_FOUND));

        if (listingRepository.findByItem_ItemIdAndStore_StoreIdAndStatus(item.getItemId(), store.getStoreId(), "ACTIVE").isPresent()) {
            throw new BusinessException("An ACTIVE listing already exists for this Item in this Store (C-05)", HttpStatus.CONFLICT);
        }

        Listing listing = Listing.builder()
                .item(item)
                .store(store)
                .listingType(req.getListingType().toUpperCase(Locale.ROOT))
                .salePrice(req.getSalePrice())
                .baseItemValue(req.getBaseItemValue())
                .borrowFeePct14d(req.getBorrowFeePct14d())
                .borrowFeePct30d(req.getBorrowFeePct30d())
                .borrowFeePct45d(req.getBorrowFeePct45d())
                .depositPct(req.getDepositPct())
                .lowStockThreshold(req.getLowStockThreshold())
                .status("ACTIVE")
                .createdBy(actor)
                .build();

        Listing saved = listingRepository.save(listing);
        return toListingResponse(saved, actor.getInstitution() != null ? actor.getInstitution().getInstitutionId() : null);
    }

    /**
     * CAT-05: Customer joins waitlist when a borrowable listing has 0 eligible borrow copies.
     */
    @Transactional
    public WaitlistResponse joinWaitlist(UUID listingId, User customer) {
        Listing listing = listingRepository.findByIdWithDetails(listingId)
                .orElseThrow(() -> new BusinessException("Listing not found", HttpStatus.NOT_FOUND));

        if ("BUY_ONLY".equalsIgnoreCase(listing.getListingType())) {
            throw new BusinessException("Waitlist is only supported for borrowable items (CAT-05)");
        }

        long availableToBorrow = copyRepository.countEligibleCopiesForBorrow(
                listing.getItem().getItemId(), listing.getStore().getStoreId());
        if (availableToBorrow > 0) {
            throw new BusinessException("Copies are currently available to borrow; waitlist is only for unavailable items (CAT-05)");
        }

        Optional<WaitlistEntry> existing = waitlistEntryRepository.findByUser_UserIdAndItem_ItemIdAndStore_StoreIdAndStatusIn(
                customer.getUserId(),
                listing.getItem().getItemId(),
                listing.getStore().getStoreId(),
                List.of("WAITING", "NOTIFIED"));
        if (existing.isPresent()) {
            throw new BusinessException("You are already on the waitlist for this item", HttpStatus.CONFLICT);
        }

        WaitlistEntry entry = WaitlistEntry.builder()
                .user(customer)
                .item(listing.getItem())
                .store(listing.getStore())
                .status("WAITING")
                .build();
        WaitlistEntry saved = waitlistEntryRepository.save(entry);

        return WaitlistResponse.builder()
                .waitlistId(saved.getWaitlistId())
                .itemId(saved.getItem().getItemId())
                .itemTitle(saved.getItem().getTitle())
                .storeId(saved.getStore().getStoreId())
                .storeName(saved.getStore().getName())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .notifiedAt(saved.getNotifiedAt())
                .build();
    }

    /**
     * CAT-05: Triggered when a borrowable Copy becomes AVAILABLE in a store.
     */
    @Transactional
    public void notifyWaitlistIfBorrowableCopyAvailable(UUID itemId, UUID storeId) {
        long eligibleCount = copyRepository.countEligibleCopiesForBorrow(itemId, storeId);
        if (eligibleCount > 0) {
            List<WaitlistEntry> waitingList = waitlistEntryRepository
                    .findByItem_ItemIdAndStore_StoreIdAndStatusOrderByCreatedAtAsc(itemId, storeId, "WAITING");
            for (WaitlistEntry entry : waitingList) {
                entry.setStatus("NOTIFIED");
                entry.setNotifiedAt(Instant.now());
                waitlistEntryRepository.save(entry);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<CopyResponse> getStoreInventoryCopies(UUID storeId, User actor) {
        Store store = resolveAndAuthorizeStoreAccess(storeId, actor);
        return copyRepository.findByStore_StoreIdOrderByCreatedAtDesc(store.getStoreId())
                .stream()
                .map(this::toCopyResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ListingResponse createItemForSale(UUID requestedStoreId, CreateItemForSaleRequest req, User actor) {
        Store store = resolveAndAuthorizeStoreAccess(requestedStoreId, actor);

        String isbn = (req.getIsbnOrCode() != null && !req.getIsbnOrCode().isBlank())
                ? req.getIsbnOrCode().trim()
                : "ISBN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        BigDecimal baseVal = req.getBaseItemValue() != null && req.getBaseItemValue().compareTo(BigDecimal.ZERO) > 0
                ? req.getBaseItemValue()
                : req.getSalePrice().multiply(new BigDecimal("1.25")).setScale(2, RoundingMode.HALF_UP);

        String rawCategory = (req.getCategory() != null && !req.getCategory().isBlank()) ? req.getCategory().trim() : "BOOK";
        final String finalCategory;
        if (rawCategory.toUpperCase(Locale.ROOT).contains("NOTE")) {
            finalCategory = "NOTES";
        } else if (rawCategory.toUpperCase(Locale.ROOT).contains("STUDY")
                || rawCategory.toUpperCase(Locale.ROOT).contains("MATERIAL")
                || rawCategory.toUpperCase(Locale.ROOT).contains("EXAM")
                || rawCategory.toUpperCase(Locale.ROOT).contains("PAPERS")) {
            finalCategory = "STUDY_MATERIAL";
        } else {
            finalCategory = "BOOK";
        }
        String subject = rawCategory;

        Item item = itemRepository.findByIsbnOrCodeIgnoreCase(isbn)
                .orElseGet(() -> itemRepository.save(Item.builder()
                        .title(req.getTitle().trim())
                        .author(req.getAuthor().trim())
                        .isbnOrCode(isbn)
                        .category(finalCategory)
                        .subject(subject)
                        .courseCode("CS101")
                        .baseValue(baseVal)
                        .coverImageUrl(req.getCoverImageUrl() != null && !req.getCoverImageUrl().isBlank() ? req.getCoverImageUrl() : "/covers/algorithms.png")
                        .build()));

        String listingType = (req.getListingType() != null && !req.getListingType().isBlank())
                ? req.getListingType().toUpperCase(Locale.ROOT).replace(' ', '_')
                : "BUY_AND_BORROW";

        Listing listing = listingRepository.findByItem_ItemIdAndStore_StoreIdAndStatus(item.getItemId(), store.getStoreId(), "ACTIVE")
                .orElseGet(() -> listingRepository.save(Listing.builder()
                        .item(item)
                        .store(store)
                        .listingType(listingType)
                        .salePrice(req.getSalePrice())
                        .baseItemValue(baseVal)
                        .borrowFeePct14d(new BigDecimal("10.00"))
                        .borrowFeePct30d(new BigDecimal("18.00"))
                        .borrowFeePct45d(new BigDecimal("25.00"))
                        .depositPct(new BigDecimal("50.00"))
                        .lowStockThreshold(2)
                        .status("ACTIVE")
                        .createdBy(actor)
                        .build()));

        listing.setSalePrice(req.getSalePrice());
        listing.setBaseItemValue(baseVal);
        listing.setListingType(listingType);
        listingRepository.save(listing);

        int stock = (req.getInitialStock() != null && req.getInitialStock() > 0) ? req.getInitialStock() : 1;
        String rawCond = (req.getCondition() != null && !req.getCondition().isBlank())
                ? req.getCondition().toUpperCase(Locale.ROOT).trim()
                : "GOOD";
        String cond = "GOOD";
        if (rawCond.contains("NEW")) {
            cond = rawCond.contains("LIKE") ? "GOOD" : "NEW";
        } else if (rawCond.contains("FAIR")) {
            cond = "FAIR";
        } else if (rawCond.contains("DAMAG")) {
            cond = "DAMAGED";
        }

        for (int i = 0; i < stock; i++) {
            String copyCode = "CPY-" + store.getStoreCode() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            copyRepository.save(Copy.builder()
                    .item(item)
                    .store(store)
                    .copyCode(copyCode)
                    .condition(cond)
                    .status("AVAILABLE")
                    .allowedForSale(!"BORROW_ONLY".equalsIgnoreCase(listingType))
                    .allowedForBorrow(!"BUY_ONLY".equalsIgnoreCase(listingType))
                    .acquisitionSource("STORE_PROCUREMENT")
                    .build());
        }

        return toListingResponse(listing, store.getInstitution() != null ? store.getInstitution().getInstitutionId() : null);
    }

    @Transactional
    public void deleteListingByIdOrCode(String identifier, User actor) {
        Listing listing = null;
        try {
            UUID id = UUID.fromString(identifier);
            listing = listingRepository.findById(id).orElse(null);
        } catch (IllegalArgumentException ignored) {}

        if (listing == null) {
            String clean = identifier.replace("LST-", "");
            listing = listingRepository.findAll().stream()
                    .filter(l -> l.getListingId().toString().toLowerCase().startsWith(clean.toLowerCase()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Listing not found: " + identifier, HttpStatus.NOT_FOUND));
        }
        resolveAndAuthorizeStoreAccess(listing.getStore().getStoreId(), actor);
        listing.setStatus("ARCHIVED");
        listingRepository.save(listing);
    }

    @Transactional
    public void deleteCopyByIdOrCode(String identifier, User actor) {
        Copy copy = null;
        try {
            UUID id = UUID.fromString(identifier);
            copy = copyRepository.findById(id).orElse(null);
        } catch (IllegalArgumentException ignored) {}

        if (copy == null) {
            copy = copyRepository.findByCopyCodeIgnoreCase(identifier).orElse(null);
        }
        if (copy == null) {
            copy = copyRepository.findAll().stream()
                    .filter(c -> c.getCopyId().toString().toLowerCase().startsWith(identifier.toLowerCase()) ||
                            (c.getCopyCode() != null && c.getCopyCode().equalsIgnoreCase(identifier)))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Copy not found: " + identifier, HttpStatus.NOT_FOUND));
        }
        resolveAndAuthorizeStoreAccess(copy.getStore().getStoreId(), actor);
        copy.setStatus("WITHDRAWN");
        copy.setAllowedForSale(false);
        copy.setAllowedForBorrow(false);
        copyRepository.save(copy);
    }

    private Store resolveAndAuthorizeStoreAccess(UUID requestedStoreId, User actor) {
        enforceStaffRole(actor);
        if ("STORE_MANAGER".equalsIgnoreCase(actor.getRole())) {
            if (actor.getAssignedStore() == null) {
                List<Store> all = storeRepository.findAll();
                if (!all.isEmpty()) return all.get(0);
                throw new BusinessException("Store Manager has no assigned store", HttpStatus.FORBIDDEN);
            }
            if (requestedStoreId != null && !actor.getAssignedStore().getStoreId().equals(requestedStoreId)) {
                throw new BusinessException("AUTH-04 / INV-02 violation: Store Manager cannot manage another store's inventory", HttpStatus.FORBIDDEN);
            }
            return actor.getAssignedStore();
        }
        if (requestedStoreId == null) {
            List<Store> all = storeRepository.findAll();
            if (!all.isEmpty()) return all.get(0);
            throw new BusinessException("Store ID is required for Platform Admin inventory actions");
        }
        return storeRepository.findById(requestedStoreId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
    }

    private void enforceStaffRole(User actor) {
        if (actor == null || (!"STORE_MANAGER".equalsIgnoreCase(actor.getRole()) && !"PLATFORM_ADMIN".equalsIgnoreCase(actor.getRole()))) {
            throw new BusinessException("CAT-04 violation: Only Store Managers or Platform Admins may manage catalog/listings", HttpStatus.FORBIDDEN);
        }
    }

    private ListingResponse toListingResponse(Listing l, UUID viewerInstitutionId) {
        Item item = l.getItem();
        Store store = l.getStore();
        UUID storeInstId = store.getInstitution().getInstitutionId();

        List<Copy> availableCopies = copyRepository.findAvailableCopiesForListing(item.getItemId(), store.getStoreId());
        long saleCount = "BORROW_ONLY".equalsIgnoreCase(l.getListingType()) ? 0 :
                availableCopies.stream().filter(Copy::isAllowedForSale).count();
        long borrowCount = "BUY_ONLY".equalsIgnoreCase(l.getListingType()) ? 0 :
                availableCopies.stream().filter(Copy::isAllowedForBorrow).count();

        List<String> conditions = availableCopies.stream()
                .map(Copy::getCondition)
                .distinct()
                .collect(Collectors.toList());

        String bestCondition = conditions.contains("NEW") ? "NEW"
                : conditions.contains("GOOD") ? "GOOD"
                : conditions.contains("FAIR") ? "FAIR"
                : "GOOD";

        boolean sameInstitution = viewerInstitutionId != null && viewerInstitutionId.equals(storeInstId);
        List<String> fulfilmentOptions = sameInstitution
                ? List.of("SELF_PICKUP", "DELIVERY")
                : List.of("DELIVERY"); // FUL-04 & BR-12: Cross-institution is delivery-only

        BigDecimal baseVal = l.getBaseItemValue();
        BigDecimal fee14 = baseVal.multiply(l.getBorrowFeePct14d()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal fee30 = baseVal.multiply(l.getBorrowFeePct30d()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal fee45 = baseVal.multiply(l.getBorrowFeePct45d()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal deposit = baseVal.multiply(l.getDepositPct()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        long totalEligible = Math.max(saleCount, borrowCount);

        Double avgRating = bookReviewRepository.getAverageRatingByItemId(item.getItemId());
        long revCount = bookReviewRepository.countByItem_ItemId(item.getItemId());
        Double effectiveRating = (revCount > 0 && avgRating != null) ? Math.round(avgRating * 10.0) / 10.0 : null;

        return ListingResponse.builder()
                .listingId(l.getListingId())
                .itemId(item.getItemId())
                .title(item.getTitle())
                .author(item.getAuthor())
                .isbnOrCode(item.getIsbnOrCode())
                .category(item.getCategory())
                .subject(item.getSubject())
                .courseCode(item.getCourseCode())
                .semester(item.getSemester())
                .publisher(item.getPublisher())
                .edition(item.getEdition())
                .publicationYear(item.getPublicationYear())
                .description(item.getDescription())
                .coverImageUrl(item.getCoverImageUrl())
                .storeId(store.getStoreId())
                .storeCode(store.getStoreCode())
                .storeName(store.getName())
                .institutionId(storeInstId)
                .institutionCode(store.getInstitution().getCode())
                .institutionName(store.getInstitution().getName())
                .listingType(l.getListingType())
                .salePrice(l.getSalePrice())
                .baseItemValue(baseVal)
                .borrowFee14d(fee14)
                .borrowFee30d(fee30)
                .borrowFee45d(fee45)
                .depositAmount(deposit)
                .availableForSaleCount(saleCount)
                .availableForBorrowCount(borrowCount)
                .totalAvailableCopies(totalEligible)
                .bestAvailableCondition(bestCondition)
                .availableConditions(conditions)
                .lowStock(totalEligible <= l.getLowStockThreshold())
                .selfPickupAllowedForViewer(sameInstitution)
                .allowedFulfilmentOptions(fulfilmentOptions)
                .status(l.getStatus())
                .averageRating(effectiveRating)
                .reviewsCount((int) revCount)
                .build();
    }

    private CopyResponse toCopyResponse(Copy c) {
        return CopyResponse.builder()
                .copyId(c.getCopyId())
                .copyCode(c.getCopyCode())
                .itemId(c.getItem().getItemId())
                .itemTitle(c.getItem().getTitle())
                .isbnOrCode(c.getItem().getIsbnOrCode())
                .storeId(c.getStore().getStoreId())
                .storeCode(c.getStore().getStoreCode())
                .condition(c.getCondition())
                .status(c.getStatus())
                .allowedForSale(c.isAllowedForSale())
                .allowedForBorrow(c.isAllowedForBorrow())
                .acquisitionSource(c.getAcquisitionSource())
                .conditionNotes(c.getConditionNotes())
                .createdAt(c.getCreatedAt())
                .build();
    }

    public ReviewSummaryResponse getReviewsForItem(UUID itemId) {
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException("Item not found", HttpStatus.NOT_FOUND));

        List<BookReview> reviews = bookReviewRepository.findByItem_ItemIdOrderByCreatedAtDesc(itemId);
        Double avg = bookReviewRepository.getAverageRatingByItemId(itemId);
        double avgRating = (!reviews.isEmpty() && avg != null) ? Math.round(avg * 10.0) / 10.0 : 0.0;

        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            int star = i;
            long count = reviews.stream().filter(r -> r.getRating() == star).count();
            breakdown.put(star, count);
        }

        List<ReviewDto> dtos = reviews.stream().map(r -> ReviewDto.builder()
                .reviewId(r.getReviewId())
                .itemId(r.getItem().getItemId())
                .userId(r.getUser().getUserId())
                .reviewerName(r.getReviewerName() != null ? r.getReviewerName() : r.getUser().getFullName())
                .institutionCode(r.getInstitutionCode() != null ? r.getInstitutionCode() : (r.getUser().getInstitution() != null ? r.getUser().getInstitution().getCode() : "CAMPUS"))
                .rating(r.getRating())
                .reviewText(r.getReviewText())
                .verifiedBuyer(r.isVerifiedBuyer())
                .createdAt(r.getCreatedAt())
                .build()).collect(Collectors.toList());

        return ReviewSummaryResponse.builder()
                .itemId(itemId)
                .averageRating(avgRating)
                .totalReviews(reviews.size())
                .ratingBreakdown(breakdown)
                .reviews(dtos)
                .build();
    }

    @Transactional
    public ReviewSummaryResponse submitReview(UUID itemId, SubmitReviewRequest req, User actor) {
        if (actor == null) {
            throw new BusinessException("Authentication required to submit review", HttpStatus.UNAUTHORIZED);
        }
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException("Item not found", HttpStatus.NOT_FOUND));

        BookReview review = bookReviewRepository.findByUser_UserIdAndItem_ItemId(actor.getUserId(), itemId)
                .orElse(BookReview.builder().item(item).user(actor).build());

        review.setRating(req.getRating());
        review.setReviewText(req.getReviewText() != null ? req.getReviewText().trim() : "");
        review.setReviewerName(actor.getFullName());
        review.setInstitutionCode(actor.getInstitution() != null ? actor.getInstitution().getCode() : "CAMPUS");
        review.setVerifiedBuyer(true);
        review.setUpdatedAt(Instant.now());
        bookReviewRepository.save(review);

        return getReviewsForItem(itemId);
    }
}
