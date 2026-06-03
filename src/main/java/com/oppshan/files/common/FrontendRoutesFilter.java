package com.oppshan.files.common;

import io.quarkus.vertx.web.RouteFilter;
import io.vertx.core.http.HttpMethod;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.regex.Pattern;

@ApplicationScoped
public class FrontendRoutesFilter {

    private static final Pattern oidcRedirectPattern = Pattern.compile(ApplicationUriResolver.SSO_SIGN_IN_OIDC.getUriString() + "/.+");

    private static final Pattern staticAssetPattern = Pattern.compile(
            ".+\\.(js|mjs|css|html|htm|json|map|webmanifest|wasm|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|txt|xml|pdf)$",
            Pattern.CASE_INSENSITIVE
    );

    @RouteFilter(100)
    public void filter(RoutingContext rc) {
        final var path = rc.normalizedPath();
        final var method = rc.request().method();
        if (isBackendPath(path, method)) {
            rc.next();
            return;
        }

        rc.reroute("/index.html");
    }

    private boolean isBackendPath(String path,
                                  HttpMethod httpMethod) {
        if (path.startsWith(ApplicationUriResolver.API.getUriString())
            || path.startsWith("/q")
            || staticAssetPattern.matcher(path).matches()) {
            return true;
        }

        if (path.startsWith(ApplicationUriResolver.SSO_SIGN_OUT.getUriString()) && HttpMethod.POST.equals(httpMethod)) {
            return true;
        }

        return oidcRedirectPattern.matcher(path).matches();
    }
}
