package com.oppshan.files.file;

import com.google.common.base.MoreObjects;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.PathParam;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

public class RenameFileNodeRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    @PathParam("uuid")
    private UUID parentFileNodeUuid;

    @NotEmpty
    @Size(max = 255)
    private String name;

    public UUID getParentFileNodeUuid() {
        return parentFileNodeUuid;
    }

    public String getName() {
        return name;
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("parentFileNodeUuid", parentFileNodeUuid)
                .add("name", name)
                .toString();
    }
}