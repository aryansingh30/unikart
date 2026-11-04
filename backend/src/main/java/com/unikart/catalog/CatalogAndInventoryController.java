package com.unikart.catalog;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.catalog.CatalogDtos.*;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
public class CatalogAndInventoryController {

    private final CatalogAndInventoryService catalogService;
    private final UserRepository userRepository;

    public CatalogAndInventoryController(CatalogAndInventoryService catalogService, UserRepository userRepository) {
        this.catalogService = catalogService;
        this.userRepository = userRepository;
    }

    @GetMapping("/catalog/listings")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> searchListings(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) UUID storeId,
            @RequestParam(required = false) String listingType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String condition,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "false") boolean inStockOnly,
            Authentication authentication) {

        User viewer = resolveUser(authentication, false);
        UUID viewerInstId = (viewer != null && viewer.getInstitution() != null)
                ? viewer.getInstitution().getInstitutionId() : null;

        List<ListingResponse> results = catalogService.searchCatalog(
                query, institutionId, storeId, listingType, category, condition, maxPrice, inStockOnly, viewerInstId);
        return ResponseEntity.ok(ApiResponse.success("Catalog listings retrieved", results));
    }

    @GetMapping("/catalog/listings/{listingId}")
    public ResponseEntity<ApiResponse<ListingResponse>> getListingById(
            @PathVariable UUID listingId,
            Authentication authentication) {
        User viewer = resolveUser(authentication, false);
        UUID viewerInstId = (viewer != null && viewer.getInstitution() != null)
                ? viewer.getInstitution().getInstitutionId() : null;
        return ResponseEntity.ok(ApiResponse.success("Listing details retrieved",
                catalogService.getListingById(listingId, viewerInstId)));
    }

    @PostMapping("/catalog/listings/{listingId}/waitlist")
    public ResponseEntity<ApiResponse<WaitlistResponse>> joinWaitlist(
            @PathVariable UUID listingId,
            Authentication authentication) {
        User customer = resolveUser(authentication, true);
        WaitlistResponse resp = catalogService.joinWaitlist(listingId, customer);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Joined waitlist successfully", resp));
    }

    @GetMapping("/catalog/items/{itemId}/reviews")
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> getItemReviews(@PathVariable UUID itemId) {
        ReviewSummaryResponse summary = catalogService.getReviewsForItem(itemId);
        return ResponseEntity.ok(ApiResponse.success("Item reviews retrieved", summary));
    }

    @PostMapping("/catalog/items/{itemId}/reviews")
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> submitItemReview(
            @PathVariable UUID itemId,
            @Valid @RequestBody SubmitReviewRequest request,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        ReviewSummaryResponse summary = catalogService.submitReview(itemId, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review submitted successfully", summary));
    }

    @PostMapping("/manager/items")
    public ResponseEntity<ApiResponse<Item>> createItem(
            @Valid @RequestBody CreateItemRequest request,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        Item created = catalogService.createItem(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Item created successfully", created));
    }

    @PostMapping("/manager/stores/{storeId}/copies")
    public ResponseEntity<ApiResponse<CopyResponse>> createCopy(
            @PathVariable UUID storeId,
            @Valid @RequestBody CreateCopyRequest request,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        CopyResponse created = catalogService.createCopy(storeId, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Physical copy added to inventory", created));
    }

    @PatchMapping("/manager/copies/{copyId}")
    public ResponseEntity<ApiResponse<CopyResponse>> updateCopyStatus(
            @PathVariable UUID copyId,
            @Valid @RequestBody UpdateCopyStatusRequest request,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        CopyResponse updated = catalogService.updateCopyStatus(copyId, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Copy status updated", updated));
    }

    @GetMapping("/manager/stores/{storeId}/copies")
    public ResponseEntity<ApiResponse<List<CopyResponse>>> getStoreCopies(
            @PathVariable UUID storeId,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        return ResponseEntity.ok(ApiResponse.success("Store inventory copies retrieved",
                catalogService.getStoreInventoryCopies(storeId, actor)));
    }

    @PostMapping("/manager/stores/{storeId}/listings")
    public ResponseEntity<ApiResponse<ListingResponse>> createListing(
            @PathVariable UUID storeId,
            @Valid @RequestBody CreateListingRequest request,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        ListingResponse created = catalogService.createListing(storeId, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Store listing published", created));
    }

    @PostMapping({"/manager/stores/{storeId}/items-for-sale", "/manager/items-for-sale"})
    public ResponseEntity<ApiResponse<ListingResponse>> createItemForSale(
            @PathVariable(required = false) UUID storeId,
            @Valid @RequestBody CreateItemForSaleRequest request,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        UUID targetStoreId = storeId != null ? storeId : (actor.getAssignedStore() != null ? actor.getAssignedStore().getStoreId() : null);
        ListingResponse created = catalogService.createItemForSale(targetStoreId, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Item and copies published for sale", created));
    }

    @DeleteMapping("/manager/listings/{listingId}")
    public ResponseEntity<ApiResponse<Void>> deleteListing(
            @PathVariable String listingId,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        catalogService.deleteListingByIdOrCode(listingId, actor);
        return ResponseEntity.ok(ApiResponse.success("Listing removed from sale", null));
    }

    @DeleteMapping("/manager/copies/{copyId}")
    public ResponseEntity<ApiResponse<Void>> deleteCopy(
            @PathVariable String copyId,
            Authentication authentication) {
        User actor = resolveUser(authentication, true);
        catalogService.deleteCopyByIdOrCode(copyId, actor);
        return ResponseEntity.ok(ApiResponse.success("Inventory copy withdrawn", null));
    }

    private User resolveUser(Authentication auth, boolean required) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            if (required) {
                throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
            }
            return null;
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("Authenticated user not found", HttpStatus.UNAUTHORIZED));
    }
}
