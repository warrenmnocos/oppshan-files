package com.oppshan.files.file;

import com.google.common.base.MoreObjects;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.PathParam;

import java.io.Serial;
import java.io.Serializable;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Pattern;

@Valid
@RegisterForReflection
public class FileUploadRequest implements Serializable {

    private static final Pattern contentDispositionFilenamePattern = Pattern.compile("filename\\*?=\"?(?:UTF-8'')?([^\";]+)\"?");

    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    @PathParam("uuid")
    private UUID parentFileNodeUuid;

    @NotEmpty
    @HeaderParam("Content-Type")
    private String contentType;

    @NotEmpty
    @HeaderParam("Content-Disposition")
    private String contentDisposition;

    public UUID getParentFileNodeUuid() {
        return parentFileNodeUuid;
    }

    public String getContentType() {
        return contentType;
    }

    public String getContentDisposition() {
        return contentDisposition;
    }

    public String getContentFilename() {
        if (contentDisposition == null || contentDisposition.isEmpty()) {
            return "";
        }

        final var matcher = contentDispositionFilenamePattern.matcher(contentDisposition);
        if (matcher.find()) {
            return URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8);
        }

        return "";
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("contentType", contentType)
                .add("contentDisposition", contentDisposition)
                .toString();
    }
}
