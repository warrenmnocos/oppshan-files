package com.oppshan.files.auth;

import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import org.htmlunit.SilentCssErrorHandler;
import org.htmlunit.WebClient;
import org.htmlunit.WebRequest;
import org.htmlunit.html.HtmlForm;
import org.htmlunit.html.HtmlPage;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.URL;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

@QuarkusTest
class SsoEndpointKeycloakTest {

    @TestHTTPResource
    URL applicationRoot;

    @Test
    void shouldCompleteOidcCodeFlowThroughKeycloakAndInvalidateSessionOnSignOut() throws Exception {
        try (final var webClient = newWebClient()) {
            final var loginForm = navigateToKeycloakLoginForm(webClient);

            final var afterSignIn = signInAsAlice(loginForm);

            assertThat("After Keycloak callback the browser ends up at the SPA shell",
                    afterSignIn.getUrl().toString(), containsString(applicationRoot.toString()));
            assertThat("OIDC session cookie is set after sign-in",
                    sessionCookieValue(webClient), is(not("")));

            final var meAfterSignIn = webClient.getPage(applicationRoot + "api/auth/me");
            assertThat("After sign-in /api/auth/me returns the authenticated user",
                    meAfterSignIn.getWebResponse().getStatusCode(), is(200));

            final var signOutResponse = postSignOut(webClient);
            assertThat("Sign-out redirects via 303",
                    signOutResponse.getWebResponse().getStatusCode(), is(200));

            final var meAfterSignOut = webClient.getPage(applicationRoot + "api/auth/me");
            assertThat("After sign-out /api/auth/me reverts to anonymous",
                    meAfterSignOut.getWebResponse().getStatusCode(), is(401));
        }
    }

    private HtmlForm navigateToKeycloakLoginForm(WebClient webClient) throws Exception {
        final HtmlPage page = webClient.getPage(applicationRoot + "sso/sign-in/oidc/google");
        if (page.getForms().isEmpty()) {
            throw new AssertionError("Expected Keycloak login form. Landed at "
                                     + page.getUrl() + " (status=" + page.getWebResponse().getStatusCode()
                                     + "); body head: " + page.asNormalizedText().substring(0, Math.min(500, page.asNormalizedText().length())));
        }

        return page.getForms().getFirst();
    }

    private HtmlPage signInAsAlice(HtmlForm loginForm) throws Exception {
        loginForm.getInputByName("username").setValue("alice");
        loginForm.getInputByName("password").setValue("alice");
        return loginForm.getButtonByName("login").click();
    }

    private HtmlPage postSignOut(WebClient webClient) throws Exception {
        final var request = new WebRequest(
                new URI(applicationRoot + "sso/sign-out").toURL(),
                org.htmlunit.HttpMethod.POST
        );
        return webClient.getPage(request);
    }

    private static String sessionCookieValue(WebClient webClient) {
        return webClient.getCookieManager().getCookies().stream()
                .filter(cookie -> cookie.getName().startsWith("q_session"))
                .map(org.htmlunit.util.Cookie::getValue)
                .findFirst()
                .orElse("");
    }

    private static WebClient newWebClient() {
        final var webClient = new WebClient();
        webClient.setCssErrorHandler(new SilentCssErrorHandler());
        webClient.getOptions().setThrowExceptionOnFailingStatusCode(false);
        webClient.getOptions().setThrowExceptionOnScriptError(false);
        webClient.getOptions().setRedirectEnabled(true);
        return webClient;
    }
}
