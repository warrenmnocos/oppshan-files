package com.oppshan.files.file;

import com.google.common.base.MoreObjects;
import jakarta.validation.constraints.NotEmpty;
import jakarta.ws.rs.HeaderParam;

import java.io.Serial;
import java.io.Serializable;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

public class FileUploadRequest implements Serializable {

    private static final Pattern contentDispositionFilenamePattern = Pattern.compile("filename\\*?=\"?(?:UTF-8'')?([^\";]+)\"?");

    @Serial
    private static final long serialVersionUID = 1L;

    @NotEmpty
    @HeaderParam("Content-Type")
    private String contentType;

    @NotEmpty
    @HeaderParam("Content-Disposition")
    private String contentDisposition;

    public String getContentType() {
        return contentType;
    }

    public String getContentDisposition() {
        return contentDisposition;
    }

    public String getContentFilename() {
        final var matcher = contentDispositionFilenamePattern.matcher(contentDisposition);
        if (matcher.find()) {
            return URLDecoder.decode(matcher.group(1), StandardCharsets.UTF_8);
        }

        return null;
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("contentType", contentType)
                .add("contentDisposition", contentDisposition)
                .toString();
    }
}
