package com.oppshan.files.auth;

import io.quarkus.oidc.TenantResolver;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MultiTenantResolver implements TenantResolver {

    @Override
    public String resolve(RoutingContext context) {
        final var path = context.request().path();
        if (path.startsWith("/sso/sign-in/oidc/callback/")) {
            return path.substring("/sso/sign-in/oidc/callback/".length());
        } else if (path.startsWith("/sso/sign-in/oidc/")) {
            return path.substring("/sso/sign-in/oidc/".length());
        } else {
            return "google";
        }
    }
}
