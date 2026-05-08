package com.oppshan.files.auth;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;

@QuarkusTest
class SsoEndpointTest {

    @Test
    @TestSecurity(user = "test-user", roles = "user")
    void shouldRedirectToSignInPageWhenAuthenticatedUserSignsOut() {
        given()
                .redirects().follow(false)
                .when()
                .post("/sso/sign-out")
                .then()
                .statusCode(303)
                .header("Location", containsString("/sso/sign-in"));
    }

    @Test
    void shouldRedirectAnonymousSignOutAttemptToOidcProvider() {
        given()
                .redirects().follow(false)
                .when()
                .post("/sso/sign-out")
                .then()
                .statusCode(302)
                .header("Location", containsString("/realms/quarkus/protocol/openid-connect/auth"));
    }
}
