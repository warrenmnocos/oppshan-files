package com.oppshan.files;

import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/hello")
@Authenticated
public class GreetingResource {

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    @RunOnVirtualThread
    public String hello() {
        return "Hello from Quarkus REST";
    }
}
