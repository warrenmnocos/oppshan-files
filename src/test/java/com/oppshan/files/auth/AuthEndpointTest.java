package com.oppshan.files.auth;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class AuthEndpointTest {

    @Test
    void shouldReturnUnauthorizedWhenAnonymousCallerAsksForCurrentUser() {
        given()
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401)
                .body("firstName", equalTo("anonymous"));
    }
}
