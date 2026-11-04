package com.unikart.borrow;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.borrow.BorrowAndFineDtos.*;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class BorrowAndFineController {

    private final BorrowAndFineService borrowService;
    private final UserRepository userRepository;

    public BorrowAndFineController(BorrowAndFineService borrowService, UserRepository userRepository) {
        this.borrowService = borrowService;
        this.userRepository = userRepository;
    }

    @GetMapping({"/borrow/my-borrows", "/borrows", "/my-borrows"})
    public ResponseEntity<ApiResponse<List<BorrowRecordResponse>>> getMyBorrows(Authentication authentication) {
        User customer = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Customer borrows retrieved", borrowService.getCustomerBorrows(customer)));
    }

    @PostMapping({"/borrow/{borrowId}/renew", "/borrows/{borrowId}/renew"})
    public ResponseEntity<ApiResponse<BorrowRecordResponse>> renewBorrow(
            @PathVariable UUID borrowId,
            @Valid @RequestBody RenewBorrowRequest request,
            Authentication authentication) {
        User customer = resolveUser(authentication);
        BorrowRecordResponse renewed = borrowService.renewBorrow(borrowId, request, customer);
        return ResponseEntity.ok(ApiResponse.success("Borrow renewed successfully", renewed));
    }

    @PostMapping({"/borrow/{borrowId}/return-initiate", "/borrows/{borrowId}/return-initiate"})
    public ResponseEntity<ApiResponse<BorrowRecordResponse>> initiateReturn(
            @PathVariable UUID borrowId,
            @Valid @RequestBody ReturnInitiateRequest request,
            Authentication authentication) {
        User customer = resolveUser(authentication);
        BorrowRecordResponse returned = borrowService.initiateReturn(borrowId, request, customer);
        return ResponseEntity.ok(ApiResponse.success("Return initiated", returned));
    }

    @PostMapping("/manager/borrows/{borrowId}/inspect")
    public ResponseEntity<ApiResponse<BorrowRecordResponse>> inspectReturn(
            @PathVariable UUID borrowId,
            @Valid @RequestBody InspectReturnRequest request,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        BorrowRecordResponse inspected = borrowService.inspectReturn(borrowId, request, manager);
        return ResponseEntity.ok(ApiResponse.success("Return inspected, deposit settled, and fine assessed", inspected));
    }

    @GetMapping({"/borrow/my-fines", "/fines", "/my-fines"})
    public ResponseEntity<ApiResponse<List<FineResponse>>> getMyFines(Authentication authentication) {
        User customer = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Customer fines retrieved", borrowService.getCustomerFines(customer)));
    }

    @PostMapping({"/borrow/fines/{fineId}/dispute", "/borrow/{borrowId}/dispute", "/fines/{fineId}/dispute"})
    public ResponseEntity<ApiResponse<FineResponse>> disputeFine(
            @PathVariable UUID fineId,
            @Valid @RequestBody DisputeFineRequest request,
            Authentication authentication) {
        User customer = resolveUser(authentication);
        FineResponse dispute = borrowService.disputeFine(fineId, request, customer);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Fine dispute submitted successfully (borrow block temporarily suspended)", dispute));
    }

    @PatchMapping("/manager/disputes/{disputeId}/review")
    public ResponseEntity<ApiResponse<FineResponse>> reviewDispute(
            @PathVariable UUID disputeId,
            @Valid @RequestBody ReviewDisputeRequest request,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        FineResponse reviewed = borrowService.reviewDispute(disputeId, request, manager);
        return ResponseEntity.ok(ApiResponse.success("Fine dispute reviewed", reviewed));
    }

    private User resolveUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }
}
