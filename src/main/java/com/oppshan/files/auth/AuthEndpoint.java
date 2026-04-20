package com.oppshan.files.auth;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

@Path("api/auth")
@ApplicationScoped
public class AuthEndpoint {

    private final UserSessionManager userSessionManager;

    @Inject
    public AuthEndpoint(UserSessionManager userSessionManager) {
        this.userSessionManager = userSessionManager;
    }

    @GET
    @Path("me")
    @Produces(MediaType.APPLICATION_JSON)
    public Response me() {
        if (userSessionManager.isSignedOut()) {
            return Response.status(Status.UNAUTHORIZED)
                    .entity(userSessionManager.getSessionUserAccount())
                    .build();
        }

        return Response.ok(userSessionManager.getSessionUserAccount()).build();
    }
}
