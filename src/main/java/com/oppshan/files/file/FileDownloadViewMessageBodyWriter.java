package com.oppshan.files.file;

import com.oppshan.files.exception.BusinessException;
import io.quarkus.narayana.jta.runtime.TransactionConfiguration;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.ext.MessageBodyWriter;
import jakarta.ws.rs.ext.Provider;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Provider
@Consumes(MediaType.WILDCARD)
@Produces(MediaType.WILDCARD)
@ApplicationScoped
public class FileDownloadViewMessageBodyWriter implements MessageBodyWriter<FileDownloadViewResolver> {

    @Override
    public boolean isWriteable(Class<?> type,
                               Type genericType,
                               Annotation[] annotations,
                               MediaType mediaType) {
        return FileDownloadViewResolver.class.isAssignableFrom(type);
    }

    @Override
    @Transactional
    @TransactionConfiguration(timeout = 12_000)
    public void writeTo(FileDownloadViewResolver fileDownloadViewResolver,
                        Class<?> type,
                        Type genericType,
                        Annotation[] annotations,
                        MediaType mediaType,
                        MultivaluedMap<String, Object> httpHeaders,
                        OutputStream contentOutputStream) throws WebApplicationException {
        final var fileDownloadView = fileDownloadViewResolver.getFileDownloadView();
        final var encodedName = URLEncoder.encode(fileDownloadView.filename(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        httpHeaders.putSingle("Content-Disposition", "attachment; filename=" + encodedName);
        httpHeaders.putSingle("Content-Type", fileDownloadView.mimeType());
        httpHeaders.putSingle("Content-Length", fileDownloadView.sizeBytes());
        try (final var contentInputStream = fileDownloadView.contentInputStream()) {
            contentInputStream.transferTo(contentOutputStream);
        } catch (IOException ex) {
            throw BusinessException.fileDownloadFailed(ex);
        }
    }
}
