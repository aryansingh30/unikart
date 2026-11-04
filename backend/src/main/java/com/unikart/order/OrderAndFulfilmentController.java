package com.unikart.order;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import com.unikart.order.OrderDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class OrderAndFulfilmentController {

    private final OrderAndFulfilmentService orderService;
    private final UserRepository userRepository;

    public OrderAndFulfilmentController(OrderAndFulfilmentService orderService, UserRepository userRepository) {
        this.orderService = orderService;
        this.userRepository = userRepository;
    }

    @PostMapping({"/orders/checkout", "/checkouts"})
    public ResponseEntity<ApiResponse<CheckoutResponse>> submitCheckout(
            @RequestBody(required = false) SubmitCheckoutRequest request,
            Authentication authentication) {
        User customer = resolveUser(authentication);
        if (request == null) {
            request = new SubmitCheckoutRequest();
        }
        CheckoutResponse created = orderService.submitCheckout(customer, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Checkout completed and copies allocated atomically", created));
    }

    @GetMapping({"/orders/my-orders", "/my-orders"})
    public ResponseEntity<ApiResponse<List<StoreOrderResponse>>> getMyStoreOrders(Authentication authentication) {
        User customer = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Customer orders retrieved",
                orderService.getCustomerStoreOrders(customer)));
    }

    @GetMapping("/checkouts")
    public ResponseEntity<ApiResponse<List<CheckoutResponse>>> getMyCheckouts(Authentication authentication) {
        User customer = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Customer checkouts retrieved",
                orderService.getCustomerCheckouts(customer)));
    }

    @PostMapping({"/orders/{storeOrderId}/cancel", "/store-orders/{storeOrderId}/cancel"})
    public ResponseEntity<ApiResponse<RefundResponse>> cancelStoreOrder(
            @PathVariable String storeOrderId,
            @RequestBody(required = false) CancelStoreOrderRequest request,
            Authentication authentication) {
        User customer = resolveUser(authentication);
        if (request == null) {
            request = new CancelStoreOrderRequest();
        }
        RefundResponse refund = orderService.cancelStoreOrderSafely(storeOrderId, request, customer);
        return ResponseEntity.ok(ApiResponse.success("StoreOrder cancelled and split refund settled", refund));
    }

    @GetMapping("/manager/stores/{storeId}/orders")
    public ResponseEntity<ApiResponse<List<StoreOrderResponse>>> getStoreOrders(
            @PathVariable UUID storeId,
            Authentication authentication) {
        User actor = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Store orders retrieved",
                orderService.getStoreOrdersForManager(storeId, actor)));
    }

    @PostMapping("/manager/orders/{storeOrderId}/ready-for-pickup")
    public ResponseEntity<ApiResponse<StoreOrderResponse>> markReadyForPickup(
            @PathVariable String storeOrderId,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Order marked Ready for Pickup (7-day window started)",
                orderService.markReadyForPickup(storeOrderId, manager)));
    }

    @PostMapping({"/manager/orders/{storeOrderId}/handover", "/manager/orders/{storeOrderId}/pickup-handover"})
    public ResponseEntity<ApiResponse<StoreOrderResponse>> completeSelfPickupHandover(
            @PathVariable String storeOrderId,
            @Valid @RequestBody HandoverVerifyRequest request,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Self-pickup OTP verified and handover completed",
                orderService.completeSelfPickupHandover(storeOrderId, request, manager)));
    }

    @PostMapping("/manager/orders/{storeOrderId}/no-show")
    public ResponseEntity<ApiResponse<RefundResponse>> processPickupNoShow(
            @PathVariable UUID storeOrderId,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("7-day pickup no-show processed and deposit settled less deduction",
                orderService.processPickupNoShowExpiry(storeOrderId, manager)));
    }

    @PostMapping("/manager/orders/{storeOrderId}/dispatch")
    public ResponseEntity<ApiResponse<StoreOrderResponse>> dispatchDeliveryOrder(
            @PathVariable UUID storeOrderId,
            @RequestParam String idempotencyKey,
            Authentication authentication) {
        User manager = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Delivery job created and StoreOrder dispatched",
                orderService.dispatchDeliveryOrder(storeOrderId, idempotencyKey, manager)));
    }

    @PostMapping("/delivery/webhook")
    public ResponseEntity<ApiResponse<StoreOrderResponse>> handleDeliveryWebhook(
            @Valid @RequestBody DeliveryWebhookRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Delivery webhook processed",
                orderService.handleDeliveryWebhook(request)));
    }

    private User resolveUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }
}
