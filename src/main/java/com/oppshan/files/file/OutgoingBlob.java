package com.oppshan.files.file;

import jakarta.enterprise.inject.spi.CDI;

import javax.crypto.CipherInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.sql.Blob;
import java.sql.SQLException;
import java.util.Objects;

public class OutgoingBlob implements Blob {

    private final Blob delegate;

    private final FileContentCipherService fileContentCipherService;

    public OutgoingBlob(Blob delegate) {
        this.delegate = Objects.requireNonNull(delegate, "delegate is null");
        this.fileContentCipherService = CDI.current().select(FileContentCipherService.class).get();
    }

    @Override
    public InputStream getBinaryStream() throws SQLException {
        final var raw = delegate.getBinaryStream();
        final var ivLength = fileContentCipherService.getIvLength();
        final byte[] iv;
        try {
            iv = raw.readNBytes(ivLength);
        } catch (IOException ex) {
            throw new SQLException("Failed to read IV from blob", ex);
        }

        if (iv.length < ivLength) {
            throw new SQLException("Truncated blob: expected " + ivLength + "-byte IV, read " + iv.length);
        }

        try {
            final var cipher = fileContentCipherService.getDecryptCipher(iv);
            return new CipherInputStream(raw, cipher);
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
