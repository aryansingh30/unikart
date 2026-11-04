package com.unikart.store;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.borrow.BorrowAndFineDtos.BorrowRecordResponse;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import com.unikart.store.StoreOperationDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class StoreOperationController {

    private final StoreOperationService storeService;
    private final UserRepository userRepository;

    public StoreOperationController(StoreOperationService storeService, UserRepository userRepository) {
        this.storeService = storeService;
        this.userRepository = userRepository;
    }

    @PostMapping("/manager/stores/{storeId}/sell-submissions")
    public ResponseEntity<ApiResponse<SellSubmissionResponse>> createSellSubmission(
            @PathVariable UUID storeId,
            @Valid @RequestBody CreateSellSubmissionRequest request,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        SellSubmissionResponse resp = storeService.createSellSubmission(storeId, request, manager);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Sell submission created and valuation quoted", resp));
    }

    @PatchMapping("/manager/sell-submissions/{submissionId}/decision")
    public ResponseEntity<ApiResponse<SellSubmissionResponse>> decideSellSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody ManagerDecideSellRequest request,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        SellSubmissionResponse resp = storeService.decideSellSubmission(submissionId, request, manager);
        return ResponseEntity.ok(ApiResponse.success("Sell submission decision recorded", resp));
    }

    @GetMapping("/manager/stores/{storeId}/sell-submissions")
    public ResponseEntity<ApiResponse<List<SellSubmissionResponse>>> getStoreSellSubmissions(
            @PathVariable UUID storeId,
            Authentication authentication) {
        User actor = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Store sell submissions retrieved",
                storeService.getStoreSellSubmissions(storeId, actor)));
    }

    @GetMapping("/customer/sell-submissions")
    public ResponseEntity<ApiResponse<List<SellSubmissionResponse>>> getMySellSubmissions(Authentication authentication) {
        User customer = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Customer sell submissions retrieved",
                storeService.getCustomerSellSubmissions(customer)));
    }

    @GetMapping("/manager/overview")
    public ResponseEntity<ApiResponse<ManagerOverviewResponse>> getManagerOverview(Authentication authentication) {
        User manager = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Manager overview retrieved",
                storeService.getManagerOverview(manager)));
    }

    @GetMapping("/manager/pages/{page}")
    public ResponseEntity<ApiResponse<ManagerPageResponse>> getManagerPageData(
            @PathVariable String page,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Manager page data retrieved",
                storeService.getManagerPageData(page, manager)));
    }

    @PostMapping({"/manager/borrows/{borrowId}/handover", "/manager/borrowings/{borrowId}/handover", "/borrows/{borrowId}/handover"})
    public ResponseEntity<ApiResponse<BorrowRecordResponse>> approveAndHandoverBorrow(
            @PathVariable String borrowId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        String otpCode = body != null ? body.get("otpCode") : null;
        return ResponseEntity.ok(ApiResponse.success("Borrowing approved and handed over successfully",
                storeService.approveAndHandoverBorrow(borrowId, otpCode, manager)));
    }

    private User resolveUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }
}
