# --- Build stage ---
FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Run as an unprivileged user. Containers default to root, which SonarQube
# reports as S6471 (CWE-250/CWE-284). The USER instruction has to be in the
# final stage: users created in a build stage are not carried over. Alpine's
# BusyBox provides addgroup/adduser.
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/target/*.jar app.jar

USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]