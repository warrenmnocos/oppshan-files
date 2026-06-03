import { MessageCode } from './message-code';

describe('MessageCode', () => {
  it('should map error codes to messages.errors.* key paths', () => {
    expect(MessageCode.FileNotFound).toBe('messages.errors.fileNotFound');
    expect(MessageCode.DirectoryNameNotUnique).toBe('messages.errors.directoryNameNotUnique');
    expect(MessageCode.Unknown).toBe('messages.errors.unknown');
  });

  it('should map info codes to messages.info.* key paths', () => {
    expect(MessageCode.DirectoryCreated).toBe('messages.info.directoryCreated');
    expect(MessageCode.FileUploaded).toBe('messages.info.fileUploaded');
    expect(MessageCode.SignInSucceeded).toBe('messages.info.signInSucceeded');
  });

  it('should prefix every value with the messages namespace', () => {
    for (const value of Object.values(MessageCode)) {
      expect(value.startsWith('messages.')).toBe(true);
    }
  });
});
