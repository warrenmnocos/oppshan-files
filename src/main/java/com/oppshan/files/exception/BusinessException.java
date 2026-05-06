package com.oppshan.files.exception;

import java.io.Serial;

public class BusinessException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final MessageCode messageCode;

    protected BusinessException(MessageCode messageCode) {
        super(messageCode.getValue());
        this.messageCode = messageCode;
    }

    protected BusinessException(MessageCode messageCode, Throwable cause) {
        super(messageCode.getValue(), cause);
        this.messageCode = messageCode;
    }

    public static BusinessException authenticationRequired() {
        return new BusinessException(MessageCode.AUTHENTICATION_REQUIRED);
    }

    public static BusinessException storageCapacityExceeded() {
        return new BusinessException(MessageCode.STORAGE_CAPACITY_EXCEEDED);
    }

    public static BusinessException directoryNotFound() {
        return new BusinessException(MessageCode.DIRECTORY_NOT_FOUND);
    }

    public static BusinessException userNotFound() {
        return new BusinessException(MessageCode.USER_NOT_FOUND);
    }

    public static BusinessException folderNameNotUnique() {
        return new BusinessException(MessageCode.FOLDER_NAME_NOT_UNIQUE);
    }

    public static BusinessException folderNameRequired() {
        return new BusinessException(MessageCode.FOLDER_NAME_REQUIRED);
    }

    public static BusinessException rootFolderDeletionNotAllowed() {
        return new BusinessException(MessageCode.ROOT_FOLDER_DELETION_NOT_ALLOWED);
    }

    public static BusinessException rootFolderModificationNotAllowed() {
        return new BusinessException(MessageCode.ROOT_FOLDER_MODIFICATION_NOT_ALLOWED);
    }

    public static BusinessException fileNotFound() {
        return new BusinessException(MessageCode.FILE_NOT_FOUND);
    }

    public static BusinessException fileNameNotUnique() {
        return new BusinessException(MessageCode.FILE_NAME_NOT_UNIQUE);
    }

    public static BusinessException fileNameRequired() {
        return new BusinessException(MessageCode.FILE_NAME_REQUIRED);
    }

    public static BusinessException fileSizeExceeded() {
        return new BusinessException(MessageCode.FILE_SIZE_EXCEEDED);
    }

    public static BusinessException fileQuotaExceeded() {
        return new BusinessException(MessageCode.FILE_QUOTA_EXCEEDED);
    }

    public static BusinessException fileDownloadFailed() {
        return new BusinessException(MessageCode.FILE_DOWNLOAD_FAILED);
    }

    public static BusinessException fileDownloadFailed(Exception ex) {
        return new BusinessException(MessageCode.FILE_DOWNLOAD_FAILED, ex);
    }

    public MessageCode getErrorCode() {
        return messageCode;
    }
}
