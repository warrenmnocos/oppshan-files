package com.oppshan.files.exception;

import com.fasterxml.jackson.annotation.JsonValue;

public enum MessageCode {

    AUTHENTICATION_REQUIRED("messages.errors.authenticationRequired"),
    STORAGE_CAPACITY_EXCEEDED("messages.errors.storageCapacityExceeded"),
    USER_NOT_FOUND("messages.errors.userNotFound"),
    SIGN_IN_FAILED("messages.errors.signInFailed"),
    DIRECTORY_NOT_FOUND("messages.errors.directoryNotFound"),
    FOLDER_NAME_NOT_UNIQUE("messages.errors.directoryNameNotUnique"),
    FOLDER_NAME_REQUIRED("messages.errors.directoryNameRequired"),
    ROOT_FOLDER_DELETION_NOT_ALLOWED("messages.errors.rootDirectoryDeletionNotAllowed"),
    ACCESS_DENIED("messages.errors.accessDenied"),
    UNKNOWN("messages.errors.unknown"),
    ;

    private final String value;

    MessageCode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}