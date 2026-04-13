package com.oppshan.files.file;

import com.oppshan.files.auth.UserSessionManager;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

@Path("api/directories")
@Authenticated
@ApplicationScoped
@RunOnVirtualThread
public class DirectoryEndpoint {

    private final UserSessionManager userSessionManager;

    private final FileNodeService fileNodeService;

    @Inject
    public DirectoryEndpoint(UserSessionManager userSessionManager,
                             FileNodeService fileNodeService) {
        this.userSessionManager = userSessionManager;
        this.fileNodeService = fileNodeService;
    }

    @GET
    @Path("{uuid}/contents")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getContents(@PathParam("uuid")
                                UUID directoryUuid) {
        return Response.ok(fileNodeService.getDirectoryContents(
                        userSessionManager.getSessionUserAccount().uuid(),
                        directoryUuid
                ))
                .build();
    }

    @GET
    @Path("contents")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getContentsByPath(@QueryParam("path")
                                      @DefaultValue("")
                                      String path) {
        return Response.ok(fileNodeService.getDirectoryContents(
                        userSessionManager.getSessionUserAccount().uuid(),
                        path
                ))
                .build();
    }
}
