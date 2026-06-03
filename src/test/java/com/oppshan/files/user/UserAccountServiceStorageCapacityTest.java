package com.oppshan.files.user;

import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.exception.MessageCode;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.BDDMockito.given;

@QuarkusTest
@TestProfile(UserAccountServiceStorageCapacityTest.StorageExhaustedProfile.class)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserAccountServiceStorageCapacityTest {

    @Inject
    UserAccountService userAccountService;

    @Mock
    JsonWebToken jwt;

    @Test
    void shouldThrowStorageCapacityExceededWhenCreatingNewUserWouldOverrunTotalStorage() {
        final var newSub = "capacity-exhausted-sub-" + UUID.randomUUID();
        stubJwtClaims(newSub, Map.of(
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

    private void stubJwtClaims(String sub, Map<String, String> claims) {
        given(jwt.getSubject()).willReturn(sub);
        given(jwt.<String>getClaim("sub")).willReturn(sub);
        claims.forEach((claimName, claimValue) ->
                given(jwt.<String>getClaim(claimName)).willReturn(claimValue));
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
}
