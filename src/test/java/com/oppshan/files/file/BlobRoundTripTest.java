package com.oppshan.files.file;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.serial.SerialBlob;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.Random;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

@QuarkusTest
class BlobRoundTripTest {

    @Test
    void shouldPerformEncryptionAndDecryptionSuccessfully() throws Exception {
        final var plaintext = "The quick brown fox jumps over the lazy dog".getBytes(StandardCharsets.UTF_8);

        final var encryptedBytes = readAllBytes(new IncomingBlob(new ByteArrayInputStream(plaintext)));
        assertThat(encryptedBytes, is(not(equalTo(plaintext))));

        final var decryptedBytes = readAllBytes(new OutgoingBlob(new SerialBlob(encryptedBytes)));
        assertThat(decryptedBytes, equalTo(plaintext));
    }

    @Test
    void shouldBeginEncryptedOutputWithRandomInitializationVector() throws Exception {
        final var plaintextOne = "first stream content".getBytes(StandardCharsets.UTF_8);
        final var plaintextTwo = "first stream content".getBytes(StandardCharsets.UTF_8);

        final var encryptedOne = readAllBytes(new IncomingBlob(new ByteArrayInputStream(plaintextOne)));
        final var encryptedTwo = readAllBytes(new IncomingBlob(new ByteArrayInputStream(plaintextTwo)));

        final var ivOne = new byte[16];
        final var ivTwo = new byte[16];
        System.arraycopy(encryptedOne, 0, ivOne, 0, 16);
        System.arraycopy(encryptedTwo, 0, ivTwo, 0, 16);

        assertThat(java.util.Arrays.equals(ivOne, ivTwo), is(false));
    }

    @Test
    void shouldRefuseSecondConsumptionOfIncomingBlob() throws Exception {
        final var incomingBlob = new IncomingBlob(new ByteArrayInputStream("payload".getBytes(StandardCharsets.UTF_8)));
        try (final var firstStream = incomingBlob.getBinaryStream()) {
            firstStream.readAllBytes();
        }

        try {
            incomingBlob.getBinaryStream();
            throw new AssertionError("Expected SQLException on second getBinaryStream() call");
        } catch (SQLException expected) {
            assertThat(expected.getMessage(), is(equalTo("Stream already consumed")));
        }
    }

    @Test
    void shouldPreserveLargerBinaryPayloadAfterRoundTrip() throws Exception {
        final var payload = new byte[8 * 1024];
        new Random(0xC0FFEEL).nextBytes(payload);

        final var encryptedBytes = readAllBytes(new IncomingBlob(new ByteArrayInputStream(payload)));
        final var decryptedBytes = readAllBytes(new OutgoingBlob(new SerialBlob(encryptedBytes)));

        assertThat(decryptedBytes, equalTo(payload));
    }

    @Test
    void shouldExcludeInitializationVectorFromOutgoingBlobLength() throws Exception {
        final var plaintext = "ten bytes!".getBytes(StandardCharsets.UTF_8);
        final var encryptedBytes = readAllBytes(new IncomingBlob(new ByteArrayInputStream(plaintext)));
        final var outgoingBlob = new OutgoingBlob(new SerialBlob(encryptedBytes));
        assertThat(outgoingBlob.length(), is((long) plaintext.length));
    }

    @Test
    void shouldThrowDescriptiveSqlExceptionWhenBlobHasFewerBytesThanIvLength() throws Exception {
        final var shortDelegate = new SerialBlob(new byte[] {0x01, 0x02, 0x03});
        final var outgoingBlob = new OutgoingBlob(shortDelegate);

        final var thrown = org.junit.jupiter.api.Assertions.assertThrows(
                SQLException.class,
                outgoingBlob::getBinaryStream
        );
        assertThat(thrown.getMessage(), org.hamcrest.Matchers.startsWith("Truncated blob"));
    }

    @Test
    void shouldThrowFailedToReadIvSqlExceptionWhenDelegateStreamRaisesIoException() throws Exception {
        final var throwingBlob = new ThrowingDelegateBlob();
        final var outgoingBlob = new OutgoingBlob(throwingBlob);

        final var thrown = org.junit.jupiter.api.Assertions.assertThrows(
                SQLException.class,
                outgoingBlob::getBinaryStream
        );
        assertThat(thrown.getMessage(), is(equalTo("Failed to read IV from blob")));
    }

    private static byte[] readAllBytes(java.sql.Blob blob) throws Exception {
        try (final var stream = blob.getBinaryStream()) {
            return stream.readAllBytes();
        }
    }

    private static final class ThrowingDelegateBlob extends SerialBlob {

        ThrowingDelegateBlob() throws SQLException {
            super(new byte[0]);
        }

        @Override
        public java.io.InputStream getBinaryStream() {
            return new java.io.InputStream() {
                @Override
                public int read() throws java.io.IOException {
                    throw new java.io.IOException("simulated IO failure");
                }

                @Override
                public int read(byte[] buffer, int offset, int length) throws java.io.IOException {
                    throw new java.io.IOException("simulated IO failure");
                }
            };
        }
    }
}
