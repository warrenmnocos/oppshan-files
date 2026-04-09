package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountService;
import io.quarkus.oidc.IdToken;
import io.quarkus.oidc.OidcSession;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.net.URI;

@Path("api/auth")
@RunOnVirtualThread
public class AuthResource {

    @IdToken
    @Inject
    JsonWebToken idToken;

    @Inject
    UserAccountService userService;

    @Inject
    OidcSession oidcSession;

    @GET
    @Path("login/{idpProviderName}")
    @Authenticated
    public Response login() {
        return Response.seeOther(URI.create("/")).build();
    }

    @GET
    @Path("callback/{idpProviderName}")
    @Authenticated
    public Response callback() {
        userService.processLogin(idToken);
        return Response.seeOther(URI.create("/")).build();
    }

    @GET
    @Path("me")
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    public Response me() {
        return Response.ok(userService.getAuthenticatedUser(idToken)).build();
    }

    @POST
    @Path("logout")
    @Authenticated
    public Response logout() {
        oidcSession.logout().await().indefinitely();
        return Response.seeOther(URI.create("/sign-in")).build();
    }
}
