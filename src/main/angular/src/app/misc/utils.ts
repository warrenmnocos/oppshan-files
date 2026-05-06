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
  ovpn: 'script',

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

  '': 'executable',
  exe: 'executable',
  msi: 'executable',
  appx: 'executable',
  msix: 'executable',
  app: 'executable',
  dmg: 'executable',
  pkg: 'executable',
  deb: 'executable',
  rpm: 'executable',
  appimage: 'executable',
  snap: 'executable',
  flatpak: 'executable',
  apk: 'executable',
  jar: 'executable',
  ear: 'executable',
  war: 'executable',
  bin: 'executable',
  run: 'executable',

  dll: 'library',
  so: 'library',
  dylib: 'library',
  ko: 'library',
  o: 'library',
  obj: 'library',

  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
  eot: 'font',
  fon: 'font',
  fnt: 'font',
  pfb: 'font',
  pfm: 'font',

  epub: 'ebook',
  mobi: 'ebook',
  azw: 'ebook',
  azw3: 'ebook',
  azw4: 'ebook',
  kfx: 'ebook',
  fb2: 'ebook',
  ibooks: 'ebook',
  lit: 'ebook',
  lrf: 'ebook',
  pdb: 'ebook',

  db: 'database',
  sqlite: 'database',
  sqlite3: 'database',
  sqlitedb: 'database',
  mdb: 'database',
  accdb: 'database',
  dbf: 'database',
  myd: 'database',
  frm: 'database',
  ibd: 'database',
  parquet: 'database',
  avro: 'database',
  orc: 'database',

  iso: 'disk',
  img: 'disk',
  vhd: 'disk',
  vhdx: 'disk',
  vmdk: 'disk',
  qcow: 'disk',
  qcow2: 'disk',
  vdi: 'disk',
  ova: 'disk',
  ovf: 'disk',
  cue: 'disk',
  toast: 'disk',
  daa: 'disk',

  stl: 'model',
  fbx: 'model',
  gltf: 'model',
  glb: 'model',
  dae: 'model',
  blend: 'model',
  '3ds': 'model',
  '3mf': 'model',
  ply: 'model',
  x3d: 'model',
  step: 'model',
  stp: 'model',
  iges: 'model',
  igs: 'model',
  usdz: 'model',
  usd: 'model',
  abc: 'model',

  ai: 'design',
  eps: 'design',
  psd: 'design',
  psb: 'design',
  fig: 'design',
  sketch: 'design',
  xd: 'design',
  indd: 'design',
  idml: 'design',
  afdesign: 'design',
  afphoto: 'design',
  afpub: 'design',
  cdr: 'design',
  xcf: 'design',
  kra: 'design',
};

export function resolveFileIcon(name: string,
                                mimeType: string): string {
  let slashIndex = mimeType.lastIndexOf('/');
  let extension = slashIndex >= 0 ? mimeType.slice(slashIndex + 1).toLowerCase() : '';
  let fileIcon = FileIcons[extension];
  if (!fileIcon) {
    slashIndex = name.lastIndexOf('.');
    extension = slashIndex >= 0 ? name.slice(slashIndex + 1).toLowerCase() : '';
  }

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
