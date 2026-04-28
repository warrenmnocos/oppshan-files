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
    void incomingBlobThenOutgoingBlobRoundTripsPlaintextThroughEncryption() throws Exception {
        final var plaintext = "The quick brown fox jumps over the lazy dog".getBytes(StandardCharsets.UTF_8);

        final var encryptedBytes = readAllBytes(new IncomingBlob(new ByteArrayInputStream(plaintext)));
        assertThat(encryptedBytes, is(not(equalTo(plaintext))));

        final var decryptedBytes = readAllBytes(new OutgoingBlob(new SerialBlob(encryptedBytes)));
        assertThat(decryptedBytes, equalTo(plaintext));
    }

    @Test
    void incomingBlobEncryptedOutputBeginsWithRandomInitializationVector() throws Exception {
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
    void incomingBlobRefusesSecondConsumption() throws Exception {
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
    void roundTripPreservesLargerBinaryPayload() throws Exception {
        final var payload = new byte[8 * 1024];
        new Random(0xC0FFEEL).nextBytes(payload);

        final var encryptedBytes = readAllBytes(new IncomingBlob(new ByteArrayInputStream(payload)));
        final var decryptedBytes = readAllBytes(new OutgoingBlob(new SerialBlob(encryptedBytes)));

        assertThat(decryptedBytes, equalTo(payload));
    }

    @Test
    void outgoingBlobLengthExcludesInitializationVector() throws Exception {
        final var plaintext = "ten bytes!".getBytes(StandardCharsets.UTF_8);
        final var encryptedBytes = readAllBytes(new IncomingBlob(new ByteArrayInputStream(plaintext)));
        final var outgoingBlob = new OutgoingBlob(new SerialBlob(encryptedBytes));
        assertThat(outgoingBlob.length(), is((long) plaintext.length));
    }

    private static byte[] readAllBytes(java.sql.Blob blob) throws Exception {
        try (final var stream = blob.getBinaryStream()) {
            return stream.readAllBytes();
        }
    }
}
