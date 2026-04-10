package com.oppshan.files.file;

import io.quarkus.oidc.IdToken;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

@Path("api/directories")
@Authenticated
@RunOnVirtualThread
public class DirectoryResource {

    @Inject
    @IdToken
    JsonWebToken idToken;

    @Inject
    FileNodeService fileNodeService;

    @GET
    @Path("{uuid}/contents")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getContents(@PathParam("uuid") UUID directoryUuid) {
        return Response.ok(fileNodeService.getDirectoryContents(idToken, directoryUuid))
                .build();
    }

    @GET
    @Path("contents")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getContentsByPath(@QueryParam("path") @DefaultValue("") String path) {
        return Response.ok(fileNodeService.getDirectoryContentsByPath(idToken, path))
                .build();
    }
}
