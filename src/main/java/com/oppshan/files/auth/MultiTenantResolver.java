package com.oppshan.files.auth;

import io.quarkus.oidc.TenantResolver;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MultiTenantResolver implements TenantResolver {

    @Override
    public String resolve(RoutingContext context) {
        final var path = context.request().path();
        if (path.startsWith("/api/auth/login/")) {
            return path.substring("/api/auth/login/".length());
        } else if (path.startsWith("/api/auth/callback/")) {
            return path.substring("/api/auth/callback/".length());
        } else {
            return "google";
        }
    }
}
