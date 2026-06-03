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
import java.util.OptionalLong;
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

    @HeaderParam("Content-Length")
    private Long contentLength;

    public UUID getParentFileNodeUuid() {
        return parentFileNodeUuid;
    }

    public FileUploadRequest setParentFileNodeUuid(UUID parentFileNodeUuid) {
        this.parentFileNodeUuid = parentFileNodeUuid;
        return this;
    }

    public String getContentType() {
        return contentType;
    }

    public FileUploadRequest setContentType(String contentType) {
        this.contentType = contentType;
        return this;
    }

    public String getContentDisposition() {
        return contentDisposition;
    }

    public FileUploadRequest setContentDisposition(String contentDisposition) {
        this.contentDisposition = contentDisposition;
        return this;
    }

    public OptionalLong getContentLength() {
        return contentLength == null ? OptionalLong.empty() : OptionalLong.of(contentLength);
    }

    public FileUploadRequest setContentLength(Long contentLength) {
        this.contentLength = contentLength;
        return this;
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
                .add("contentLength", contentLength)
                .toString();
    }
}
