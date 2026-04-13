package com.oppshan.files.auth;

import com.oppshan.files.common.ApplicationUriResolver;
import com.oppshan.files.exception.BusinessException;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriBuilder;

@Path("sso")
@Authenticated
@ApplicationScoped
@RunOnVirtualThread
public class SsoEndpoint {

    private final UserSessionManager userSessionManager;

    @Inject
    public SsoEndpoint(UserSessionManager userSessionManager) {
        this.userSessionManager = userSessionManager;
    }

    @GET
    @Path("sign-in")
    public Response signIn() {
        return Response.seeOther(ApplicationUriResolver.HOME.getUri()).build();
    }

    @GET
    @Path("sign-in/oidc/{idpProviderName}")
    public Response signInViaOidc() {
        return Response.seeOther(ApplicationUriResolver.HOME.getUri()).build();
    }

    @GET
    @Path("sign-in/oidc/callback/{idpProviderName}")
    public Response signInViaOidcCallback() {
        try {
            userSessionManager.getSessionUserAccount();
            return Response.seeOther(ApplicationUriResolver.HOME.getUri()).build();
        } catch (BusinessException ex) {
            userSessionManager.signOut();
            return Response.seeOther(
                            UriBuilder.fromUri(ApplicationUriResolver.SSO_SIGN_IN.getUri())
                                    .queryParam("message", ex.getErrorCode().getValue())
                                    .build()
                    )
                    .build();
        }
    }

    @POST
    @Path("sign-out")
    public Response signOut() {
        userSessionManager.signOut();
        return Response.seeOther(ApplicationUriResolver.SSO_SIGN_IN.getUri()).build();
    }
}
