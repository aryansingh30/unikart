# Multi-stage Docker build for Java 17 Spring Boot Backend
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /workspace

# Copy Maven wrapper and dependencies specification
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

# Copy source code and build jar
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Non-root user for security
RUN useradd -m -u 1001 appuser
USER appuser

COPY --from=builder /workspace/target/unikart-backend-2.0.0.jar app.jar

ENV PORT=8088
EXPOSE 8088

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
