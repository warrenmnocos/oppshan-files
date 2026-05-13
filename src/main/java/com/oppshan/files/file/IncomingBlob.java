package com.oppshan.files.file;

import jakarta.enterprise.inject.spi.CDI;

import javax.crypto.CipherInputStream;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.SequenceInputStream;
import java.sql.Blob;
import java.sql.SQLException;
import java.util.Objects;

public class IncomingBlob implements Blob {

    // Same rationale as OutgoingBlob: CipherInputStream's 512-byte ibuffer caps
    // each .read() call. PG JDBC's createBlob reads from this stream when
    // writing to pg_largeobject; without buffering, every lo_write protocol
    // call carries only ~512 bytes. The wrap below accumulates encrypted bytes
    // into 64 KB chunks so PG JDBC sees fewer, larger writes.
    private static final int STREAM_BUFFER_BYTES = 64 * 1024;

    private final InputStream sourceStream;

    private final byte[] iv;

    private final FileContentCipherService fileContentCipherService;

    private boolean consumed;

    public IncomingBlob(InputStream sourceStream) {
        this.sourceStream = Objects.requireNonNull(sourceStream, "sourceStream is null");
        fileContentCipherService = CDI.current().select(FileContentCipherService.class).get();
        iv = fileContentCipherService.generateIv();
    }

    @Override
    public InputStream getBinaryStream() throws SQLException {
        if (consumed) {
            throw new SQLException("Stream already consumed");
        }

        consumed = true;

        try {
            final var cipher = fileContentCipherService.getEncryptCipher(iv);
            final var ivStream = new ByteArrayInputStream(iv);
            final var encrypted = new CipherInputStream(sourceStream, cipher);
            return new BufferedInputStream(new SequenceInputStream(ivStream, encrypted), STREAM_BUFFER_BYTES);
        } catch (Exception ex) {
            throw new SQLException("Encryption failed", ex);
        }
    }

    @Override
    public InputStream getBinaryStream(long pos, long length) {
        throw new UnsupportedOperationException();
    }

    @Override
    public long length() throws SQLException {
        return -1;
    }

    @Override
    public byte[] getBytes(long pos, int length) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void free() throws SQLException {
        // Nothing to free — stream lifecycle managed externally
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
