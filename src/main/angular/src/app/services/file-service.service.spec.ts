import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import { FileService } from './file-service.service';
import { JsonMapperService } from './json-mapper.service';
import { DirectoryContentsView } from '../models/directory-contents-view';

const UNIT_LABELS: Record<string, string> = {
  'misc.dataUnit.bytes': 'B',
  'misc.dataUnit.kilobytes': 'KB',
  'misc.dataUnit.megabytes': 'MB',
  'misc.dataUnit.gigabytes': 'GB',
};

describe('FileService', () => {
  let service: FileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FileService,
        JsonMapperService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => UNIT_LABELS[key] ?? key },
        },
      ],
    });
    service = TestBed.inject(FileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getFileSizeDisplay', () => {
    it('should render 0 for null, zero, or negative', () => {
      expect(service.getFileSizeDisplay(null)).toBe('0 B');
      expect(service.getFileSizeDisplay(0)).toBe('0 B');
      expect(service.getFileSizeDisplay(-5)).toBe('0 B');
    });

    it('should render whole numbers without a decimal', () => {
      expect(service.getFileSizeDisplay(1024)).toBe('1 KB');
      expect(service.getFileSizeDisplay(1048576)).toBe('1 MB');
    });

    it('should render fractional sizes to one decimal', () => {
      expect(service.getFileSizeDisplay(1536)).toBe('1.5 KB');
    });

    it('should clamp to the largest unit', () => {
      expect(service.getFileSizeDisplay(5 * 1024 ** 4)).toContain('GB');
    });
  });

  describe('HTTP methods', () => {
    it('should GET the contents endpoint and hydrate the view', () => {
      let result: DirectoryContentsView | undefined;
      service.getDirectoryContents('abc').subscribe((v) => (result = v));
      const req = httpMock.expectOne('/api/files/abc/contents');
      expect(req.request.method).toBe('GET');
      req.flush({ uuid: 'abc', name: 'Docs' });
      expect(result).toBeInstanceOf(DirectoryContentsView);
      expect(result?.uuid).toBe('abc');
    });

    it('should POST name and parentUuid when creating a directory', () => {
      service.createDirectory('New', 'parent-1').subscribe();
      const req = httpMock.expectOne('/api/files');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'New', parentUuid: 'parent-1' });
      req.flush({ uuid: 'x', name: 'New' });
    });

    it('should PATCH the uuid endpoint when renaming a directory', () => {
      service.renameDirectory('d1', 'Renamed').subscribe();
      const req = httpMock.expectOne('/api/files/d1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ name: 'Renamed' });
      req.flush({ uuid: 'd1', name: 'Renamed' });
    });

    it('should DELETE the uuid endpoint when deleting a file', () => {
      service.deleteFile('f1').subscribe();
      const req = httpMock.expectOne('/api/files/f1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ uuid: 'root', name: 'root' });
    });

    it('should request a blob with progress reporting when downloading', () => {
      service.downloadFile('f1').subscribe();
      const req = httpMock.expectOne('/api/files/f1/download');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.reportProgress).toBe(true);
      req.flush(new Blob(['data']));
    });
  });
});
