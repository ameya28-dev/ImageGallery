# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre-jammy
WORKDIR /app
# Install FFmpeg for video frame extraction and metadata reading
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/image-gallery-0.0.1-SNAPSHOT.jar app.jar
# Bake in seed data (default demo images and metadata for local profile first-run)
COPY seed-data ./seed-data
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-jar", "app.jar"]
