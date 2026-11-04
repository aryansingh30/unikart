package com.unikart.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey jwtSecret;
    private final long jwtExpirationMs;
    private final long tempTokenExpirationMs = 300000; // 5 minutes for 2FA temp token

    public JwtTokenProvider(
            @Value("${unikart.jwt.secret}") String secretKey,
            @Value("${unikart.jwt.expiration-ms}") long expirationMs) {
        this.jwtSecret = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.jwtExpirationMs = expirationMs;
    }

    public String generateToken(Authentication authentication) {
        org.springframework.security.core.userdetails.User userPrincipal = 
            (org.springframework.security.core.userdetails.User) authentication.getPrincipal();
        
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(jwtSecret)
                .compact();
    }

    public String generateTokenFromUser(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        var builder = Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getUserId().toString())
                .claim("role", user.getRole())
                .claim("fullName", user.getFullName())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(jwtSecret);

        if (user.getInstitution() != null) {
            builder.claim("institutionId", user.getInstitution().getInstitutionId().toString());
        }
        if (user.getAssignedStore() != null) {
            builder.claim("storeId", user.getAssignedStore().getStoreId().toString());
        }

        return builder.compact();
    }

    public String generateTemp2FaToken(String email, UUID userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + tempTokenExpirationMs);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId.toString())
                .claim("purpose", "STAFF_2FA_TEMP")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(jwtSecret)
                .compact();
    }

    public String getUsernameFromJWT(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(jwtSecret)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public String getClaim(String token, String claimKey) {
        Claims claims = Jwts.parser()
                .verifyWith(jwtSecret)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Object val = claims.get(claimKey);
        return val != null ? val.toString() : null;
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(jwtSecret).build().parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
