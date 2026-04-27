package com.oppshan.files.file;

import com.oppshan.files.auth.UserSessionManager;
import io.quarkus.security.Authenticated;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.BeanParam;
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
import jakarta.ws.rs.core.Response.Status;

import java.io.InputStream;
import java.util.UUID;

@Path("api/files")
@Authenticated
@ApplicationScoped
public class FileSystemEndpoint {

    private final UserSessionManager userSessionManager;

    private final FileNodeService fileNodeService;

    @Inject
    public FileSystemEndpoint(UserSessionManager userSessionManager,
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
        return Response.status(Status.CREATED)
                .entity(fileNodeService.createDirectory(
                        userSessionManager.getSessionUserAccount().uuid(),
                        request
                ))
                .build();
    }

    @PATCH
    @Path("{uuid}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response renameFileNode(@Valid
                                   @BeanParam
                                   RenameFileNodeRequest request) {
        return Response.ok(fileNodeService.renameFileNode(
                        userSessionManager.getSessionUserAccount().uuid(),
                        request
                ))
                .build();
    }

    @DELETE
    @Path("{uuid}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteFileNode(@PathParam("uuid")
                                   UUID nodeUuid) {
        final var directoryContentsView = fileNodeService.deleteFileNode(
                userSessionManager.getSessionUserAccount().uuid(),
                nodeUuid
        );
        userSessionManager.refreshSessionUserAccount();
        return Response.ok(directoryContentsView).build();
    }

    @GET
    @Path("{uuid}/properties")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getFileNodeProperties(@PathParam("uuid")
                                          UUID nodeUuid) {
        return Response.ok(fileNodeService.getFileNodePropertiesView(
                        userSessionManager.getSessionUserAccount().uuid(),
                        nodeUuid
                ))
                .build();
    }

    @POST
    @Path("{uuid}/upload")
    @Consumes(MediaType.WILDCARD)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadFile(@Valid
                               @BeanParam
                               FileUploadRequest request,

                               InputStream bodyStream) {
        final var directoryContentsView = fileNodeService.uploadFile(
                userSessionManager.getSessionUserAccount().uuid(),
                request.getParentFileNodeUuid(),
                request.getContentFilename(),
                request.getContentType(),
                bodyStream
        );
        userSessionManager.refreshSessionUserAccount();
        return Response.status(Status.CREATED)
                .entity(directoryContentsView)
                .build();
    }

    @GET
    @Path("{uuid}/download")
    @Produces(MediaType.WILDCARD)
    public FileDownloadViewResolver downloadFile(@PathParam("uuid") UUID fileUuid) {
        return fileNodeService.getFileDownloadViewResolver(
                userSessionManager.getSessionUserAccount().uuid(),
                fileUuid
        );
    }
}
