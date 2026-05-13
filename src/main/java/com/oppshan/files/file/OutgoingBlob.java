package com.oppshan.files.file;

import jakarta.enterprise.inject.spi.CDI;

import javax.crypto.CipherInputStream;
import java.io.BufferedInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.sql.Blob;
import java.sql.SQLException;
import java.util.Objects;

public class OutgoingBlob implements Blob {

    // CipherInputStream's internal ibuffer is hardcoded to 512 bytes, so each
    // .read() call returns at most ~512 bytes regardless of how much the caller
    // asks for. The BufferedInputStream below accumulates those 512-byte gulps
    // into 64 KB chunks before they reach transferTo()'s servlet-output write
    // loop, collapsing ~160,000 small writes per 80 MB download into ~1,250
    // large writes.
    private static final int STREAM_BUFFER_BYTES = 64 * 1024;

    private final Blob delegate;

    private final FileContentCipherService fileContentCipherService;

    public OutgoingBlob(Blob delegate) {
        this.delegate = Objects.requireNonNull(delegate, "delegate is null");
        this.fileContentCipherService = CDI.current().select(FileContentCipherService.class).get();
    }

    @Override
    public InputStream getBinaryStream() throws SQLException {
        try {
            final var raw = delegate.getBinaryStream();
            final var iv = raw.readNBytes(fileContentCipherService.getIvLength());
            final var cipher = fileContentCipherService.getDecryptCipher(iv);
            return new BufferedInputStream(new CipherInputStream(raw, cipher), STREAM_BUFFER_BYTES);
        } catch (Exception ex) {
            throw new SQLException("Decryption failed", ex);
        }
    }

    @Override
    public InputStream getBinaryStream(long pos, long length) {
        throw new UnsupportedOperationException();
    }

    @Override
    public long length() throws SQLException {
        return delegate.length() - fileContentCipherService.getIvLength();
    }

    @Override
    public byte[] getBytes(long pos, int length) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void free() throws SQLException {
        delegate.free();
    }

    @Override
    public long position(byte[] pattern, long start) {
        throw new UnsupportedOperationException();
    }

    @Override
    public long position(Blob pattern, long start) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int setBytes(long pos, byte[] bytes) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int setBytes(long pos, byte[] bytes, int offset, int len) {
        throw new UnsupportedOperationException();
    }

    @Override
    public OutputStream setBinaryStream(long pos) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void truncate(long len) {
        throw new UnsupportedOperationException();
    }
}
