package com.oppshan.files.exception;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class BusinessExceptionMapper implements ExceptionMapper<BusinessException> {

    @Override
    public Response toResponse(BusinessException exception) {
        return Response.status(Status.BAD_REQUEST)
                .type(MediaType.APPLICATION_JSON)
                .header("X-Message-Code", exception.getErrorCode().getValue())
                .entity(new ErrorResponse(exception.getErrorCode()))
                .build();
    }
}
