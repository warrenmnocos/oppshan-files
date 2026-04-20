package com.oppshan.files.file;

import com.oppshan.files.auth.UserSessionManager;
import io.quarkus.security.Authenticated;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
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

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response createDirectory(@Valid CreateDirectoryRequest request) {
        return Response.ok(fileNodeService.createDirectory(
                        userSessionManager.getSessionUserAccount().uuid(),
                        request
                ))
                .build();
    }

    @PATCH
    @Path("{uuid}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response renameDirectory(@PathParam("uuid")
                                    UUID directoryUuid,

                                    @Valid RenameDirectoryRequest request) {
        return Response.ok(fileNodeService.renameDirectory(
                        userSessionManager.getSessionUserAccount().uuid(),
                        directoryUuid,
                        request
                ))
                .build();
    }

    @DELETE
    @Path("{uuid}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteDirectory(@PathParam("uuid")
                                    UUID directoryUuid) {
        return Response.ok(fileNodeService.deleteDirectory(
                        userSessionManager.getSessionUserAccount().uuid(),
                        directoryUuid
                ))
                .build();
    }

    @GET
    @Path("{uuid}/properties")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getDirectoryProperties(@PathParam("uuid")
                                           UUID directoryUuid) {
        return Response.ok(fileNodeService.getDirectoryProperties(
                        userSessionManager.getSessionUserAccount().uuid(),
                        directoryUuid
                ))
                .build();
    }
}
