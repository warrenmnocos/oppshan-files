package com.oppshan.files.user;

import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.exception.MessageCode;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
@TestProfile(UserAccountServiceStorageCapacityTest.StorageExhaustedProfile.class)
class UserAccountServiceStorageCapacityTest {

    @Inject
    UserAccountService userAccountService;

    @Test
    void shouldThrowStorageCapacityExceededWhenCreatingNewUserWouldOverrunTotalStorage() {
        final var newSub = "capacity-exhausted-sub-" + UUID.randomUUID();
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "given_name", "Cap",
                "family_name", "Exhausted",
                "name", "Cap Exhausted",
                "email", "capacity@example.com",
                "picture", "https://example.com/cap.png"
        ));

        final var businessException = assertThrows(
                BusinessException.class,
                () -> userAccountService.createOrGetUserAccount(jwt)
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.STORAGE_CAPACITY_EXCEEDED));
    }

    public static class StorageExhaustedProfile implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "app.storage.user-max-bytes", "200000",
                    "app.storage.total-max-bytes", "100000"
            );
        }
    }

    private record TestGoogleJwt(String subject, Map<String, String> claims) implements JsonWebToken {

        @Override
        public String getName() {
            return subject;
        }

        @Override
        public Set<String> getClaimNames() {
            return claims.keySet();
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T getClaim(String claimName) {
            if ("sub".equals(claimName)) {
                return (T) subject;
            }
            return (T) claims.get(claimName);
        }

        @Override
        public String getRawToken() {
            return "";
        }

        @Override
        public String getIssuer() {
            return "https://test.invalid";
        }

        @Override
        public Set<String> getAudience() {
            return Set.of();
        }

        @Override
        public long getExpirationTime() {
            return Instant.now().plusSeconds(3600).getEpochSecond();
        }

        @Override
        public long getIssuedAtTime() {
            return Instant.now().getEpochSecond();
        }

        @Override
        public String getSubject() {
            return subject;
        }

        @Override
        public String getTokenID() {
            return UUID.randomUUID().toString();
        }

        @Override
        public Set<String> getGroups() {
            return Set.of();
        }
    }
}
