import {HttpErrorResponse} from '@angular/common/http';
import {MessageCode} from '../models/message-code';
import {Severity} from '../models/severity';

export const NotificationDurationMs = 4000;

const FileIcons: Readonly<Record<string, string>> = {
  pdf: 'pdf',

  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  pages: 'document',

  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  ods: 'spreadsheet',
  csv: 'spreadsheet',
  tsv: 'spreadsheet',
  numbers: 'spreadsheet',

  key: 'presentation',
  ppt: 'presentation',
  pptx: 'presentation',
  odp: 'presentation',

  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  tiff: 'image',
  tif: 'image',
  ico: 'image',
  heic: 'image',
  heif: 'image',

  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  aac: 'audio',
  opus: 'audio',
  wma: 'audio',

  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  flv: 'video',
  wmv: 'video',
  m4v: 'video',

  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  tgz: 'archive',
  bz2: 'archive',
  rar: 'archive',
  '7z': 'archive',
  xz: 'archive',
  zst: 'archive',

  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',

  sql: 'script',
  yml: 'script',
  yaml: 'script',
  properties: 'script',
  sh: 'script',
  bash: 'script',
  zsh: 'script',
  cmd: 'script',
  bat: 'script',
  ps1: 'script',
  js: 'script',
  mjs: 'script',
  cjs: 'script',
  ts: 'script',
  tsx: 'script',
  jsx: 'script',
  py: 'script',
  rb: 'script',
  go: 'script',
  rs: 'script',
  java: 'script',
  kt: 'script',
  c: 'script',
  h: 'script',
  cpp: 'script',
  hpp: 'script',
  cs: 'script',
  php: 'script',
  json: 'script',
  xml: 'script',
  html: 'script',
  htm: 'script',
  xhtml: 'script',
  css: 'script',
  scss: 'script',
  toml: 'script',
  ini: 'script',
  env: 'script',
  conf: 'script',

  txt: 'text',
  log: 'text',

  p12: 'crypto',
  pfx: 'crypto',
  cer: 'crypto',
  cert: 'crypto',
  crt: 'crypto',
  pem: 'crypto',
  asc: 'crypto',
  gpg: 'crypto',
};

export function resolveFileIcon(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  const extension = dotIndex >= 0 ? filename.slice(dotIndex + 1).toLowerCase() : '';
  return FileIcons[extension] ?? 'file';
}

export function resolveMessageCode(error: HttpErrorResponse): MessageCode {
  const messageCode = error.headers.get('X-Message-Code') ?? error.error?.messageCode ?? error.message;
  return Object.values(MessageCode).find(code => code === messageCode) ?? MessageCode.Unknown;
}

export function resolveSeverity(messageCode: MessageCode): Severity {
  if (messageCode.startsWith('messages.info.')) {
    return Severity.Info;
  }

  if (messageCode.startsWith('messages.warning.')) {
    return Severity.Warning;
  }

  return Severity.Error;
}
