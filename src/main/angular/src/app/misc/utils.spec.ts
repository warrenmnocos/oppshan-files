import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { MessageCode } from '../models/message-code';
import { Severity } from '../models/severity';
import { resolveFileIcon, resolveMessageCode, resolveSeverity } from './utils';

describe('resolveFileIcon', () => {
  it('should resolve by MIME subtype first', () => {
    expect(resolveFileIcon('whatever.bin', 'application/pdf')).toBe('pdf');
    expect(resolveFileIcon('photo', 'image/png')).toBe('image');
  });

  it('should fall back to the filename extension when the MIME subtype is unknown', () => {
    expect(resolveFileIcon('archive.zip', 'application/octet-stream')).toBe('archive');
    expect(resolveFileIcon('notes.md', 'application/octet-stream')).toBe('markdown');
  });

  it('should be case-insensitive on the extension', () => {
    expect(resolveFileIcon('PHOTO.JPG', 'application/octet-stream')).toBe('image');
  });

  it('should map an extensionless filename to the executable icon', () => {
    expect(resolveFileIcon('Makefile', 'application/x-thing')).toBe('executable');
  });

  it('should short-circuit an empty mimeType to the executable icon', () => {
    // mimeType '' yields extension '', which matches FileIcons[''] === 'executable'
    // and never reaches the filename fallback. Documents current behavior.
    expect(resolveFileIcon('notes.md', '')).toBe('executable');
  });

  it('should return the generic file icon when nothing matches', () => {
    expect(resolveFileIcon('mystery.qwerty', 'application/unknowntype')).toBe('file');
  });
});

describe('resolveMessageCode', () => {
  function errorWith(header: string | null, body: unknown): HttpErrorResponse {
    return new HttpErrorResponse({
      headers: new HttpHeaders(header ? { 'X-Message-Code': header } : {}),
      error: body,
      status: 400,
      statusText: 'Bad Request',
    });
  }

  it('should prefer the X-Message-Code header', () => {
    expect(resolveMessageCode(errorWith(MessageCode.FileNotFound, null))).toBe(
      MessageCode.FileNotFound,
    );
  });

  it('should fall back to the error body messageCode', () => {
    expect(
      resolveMessageCode(errorWith(null, { messageCode: MessageCode.DirectoryNameNotUnique })),
    ).toBe(MessageCode.DirectoryNameNotUnique);
  });

  it('should return Unknown when the code is unrecognized', () => {
    expect(resolveMessageCode(errorWith('not.a.real.code', null))).toBe(MessageCode.Unknown);
  });
});

describe('resolveSeverity', () => {
  it('should derive Info, Warning, and Error from the code prefix', () => {
    expect(resolveSeverity(MessageCode.DirectoryCreated)).toBe(Severity.Info);
    expect(resolveSeverity(MessageCode.FileNotFound)).toBe(Severity.Error);
    expect(resolveSeverity('messages.warning.something' as MessageCode)).toBe(Severity.Warning);
  });
});
