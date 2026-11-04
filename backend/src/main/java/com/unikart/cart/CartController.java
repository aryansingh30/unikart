package com.unikart.cart;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.cart.CartDtos.*;
import com.unikart.common.ApiResponse;
import com.unikart.common.BusinessException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/cart")
public class CartController {

    private final CartService cartService;
    private final UserRepository userRepository;

    public CartController(CartService cartService, UserRepository userRepository) {
        this.cartService = cartService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getActiveCart(Authentication authentication) {
        User customer = resolveCustomer(authentication);
        return ResponseEntity.ok(ApiResponse.success("Active cart retrieved", cartService.getActiveCart(customer)));
    }

    @PostMapping("/lines")
    public ResponseEntity<ApiResponse<CartResponse>> addLineToCart(
            @Valid @RequestBody AddCartLineRequest request,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        CartResponse updated = cartService.addLineToCart(customer, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Line added to cart (stock is not reserved until checkout)", updated));
    }

    @PatchMapping("/lines/{cartLineId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateCartLine(
            @PathVariable UUID cartLineId,
            @Valid @RequestBody UpdateCartLineRequest request,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        return ResponseEntity.ok(ApiResponse.success("Cart line updated",
                cartService.updateCartLine(customer, cartLineId, request)));
    }

    @DeleteMapping("/lines/{cartLineId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeCartLine(
            @PathVariable UUID cartLineId,
            Authentication authentication) {
        User customer = resolveCustomer(authentication);
        return ResponseEntity.ok(ApiResponse.success("Cart line removed",
                cartService.removeCartLine(customer, cartLineId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<CartResponse>> clearCart(Authentication authentication) {
        User customer = resolveCustomer(authentication);
        return ResponseEntity.ok(ApiResponse.success("Cart cleared", cartService.clearCart(customer)));
    }

    private User resolveCustomer(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new BusinessException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED));
    }
}
