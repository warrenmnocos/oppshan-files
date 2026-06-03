package com.oppshan.files.common;

import io.vertx.core.http.HttpMethod;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.ext.web.RoutingContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FrontendRoutesFilterTest {

    @Mock
    RoutingContext routingContext;

    @Mock
    HttpServerRequest httpServerRequest;

    @Test
    void shouldRerouteToIndexHtmlWhenPathContainsDotInsideFolderName() {
        givenRequest("/files/2026.05/contents", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).reroute("/index.html");
        verify(routingContext, never()).next();
    }

    @Test
    void shouldRerouteToIndexHtmlWhenPathIsDottedFolderNameDirectly() {
        givenRequest("/files/2026.05", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).reroute("/index.html");
        verify(routingContext, never()).next();
    }

    @Test
    void shouldDelegateToNextWhenPathEndsWithJsExtension() {
        givenRequest("/assets/main-ABCDEF.js", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).next();
        verify(routingContext, never()).reroute("/index.html");
    }

    @Test
    void shouldDelegateToNextWhenPathEndsWithSvgExtension() {
        givenRequest("/icons/folder.svg", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).next();
        verify(routingContext, never()).reroute("/index.html");
    }

    @Test
    void shouldDelegateToNextWhenPathStartsWithApiPrefix() {
        givenRequest("/api/files/00000000-0000-0000-0000-000000000000/contents", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).next();
        verify(routingContext, never()).reroute("/index.html");
    }

    @Test
    void shouldDelegateToNextWhenPathStartsWithQuarkusDevPrefix() {
        givenRequest("/q/health", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).next();
        verify(routingContext, never()).reroute("/index.html");
    }

    @Test
    void shouldDelegateToNextWhenPathIsSignOutPost() {
        givenRequest("/sso/sign-out", HttpMethod.POST);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).next();
        verify(routingContext, never()).reroute("/index.html");
    }

    @Test
    void shouldDelegateToNextWhenPathIsOidcRedirect() {
        givenRequest("/sso/sign-in/oidc/google", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).next();
        verify(routingContext, never()).reroute("/index.html");
    }

    @Test
    void shouldRerouteToIndexHtmlForPlainSpaRoutes() {
        givenRequest("/files/00000000-0000-0000-0000-000000000000", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).reroute("/index.html");
        verify(routingContext, never()).next();
    }

    @Test
    void shouldRerouteToIndexHtmlForRootPath() {
        givenRequest("/", HttpMethod.GET);

        new FrontendRoutesFilter().filter(routingContext);

        verify(routingContext).reroute("/index.html");
        verify(routingContext, never()).next();
    }

    private void givenRequest(String path, HttpMethod method) {
        given(routingContext.normalizedPath()).willReturn(path);
        given(routingContext.request()).willReturn(httpServerRequest);
        given(httpServerRequest.method()).willReturn(method);
    }
}
