package com.oppshan.files.file;

import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.usertype.UserType;

import java.io.Serializable;
import java.sql.Blob;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

public class EncryptedBlobUserType implements UserType<Blob> {

    @Override
    public int getSqlType() {
        return Types.BLOB;
    }

    @Override
    public Class<Blob> returnedClass() {
        return Blob.class;
    }

    @Override
    public Blob nullSafeGet(ResultSet rs,
                            int position,
                            WrapperOptions wrapperOptions) throws SQLException {
        final var raw = rs.getBlob(position);
        if (raw == null) {
            return null;
        }

        return new OutgoingBlob(raw);
    }

    @Override
    public void nullSafeSet(PreparedStatement st,
                            Blob value,
                            int index,
                            WrapperOptions wrapperOptions) throws SQLException {
        if (value == null) {
            st.setNull(index, Types.BLOB);
            return;
        }

        if (!(value instanceof IncomingBlob)) {
            value = new IncomingBlob(value.getBinaryStream());
        }

        st.setBinaryStream(index, value.getBinaryStream());
    }

    @Override
    public boolean isMutable() {
        return false;
    }

    @Override
    public Blob deepCopy(Blob value) {
        return value;
    }

    @Override
    public boolean equals(Blob x, Blob y) {
        return x == y;
    }

    @Override
    public int hashCode(Blob x) {
        return System.identityHashCode(x);
    }

    @Override
    public Serializable disassemble(Blob value) {
        return null;
    }

    @Override
    public Blob assemble(Serializable cached, Object owner) {
        return null;
    }

    @Override
    public Blob replace(Blob detached, Blob managed, Object owner) {
        return detached;
    }
}
