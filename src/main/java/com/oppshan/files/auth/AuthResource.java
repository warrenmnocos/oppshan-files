package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountService;
import io.quarkus.oidc.IdToken;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.net.URI;

@Path("/")
@RunOnVirtualThread
public class AuthResource {

    @IdToken
    @Inject
    JsonWebToken idToken;

    @Inject
    SecurityIdentity identity;

    @Inject
    UserAccountService userService;

    @GET
    @Path("api/auth/login")
    @Authenticated
    public Response login() {
        return Response.seeOther(URI.create("/")).build();
    }

    @GET
    @Path("api/auth/callback")
    @Authenticated
    public Response callback() {
        userService.processLogin(idToken);
        return Response.seeOther(URI.create("/")).build();
    }

    @GET
    @Path("api/auth/me")
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    public Response me() {
        return Response.ok(userService.getAuthenticatedUser(idToken)).build();
    }
}
