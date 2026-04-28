import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpHeaders, HttpParams} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {DirectoryContentsView} from '../models/directory-contents-view';
import {DirectoryPropertiesView} from '../models/directory-properties-view';
import {FilePropertiesView} from '../models/file-properties-view';
import {JsonMapperService} from './json-mapper.service';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class FileService {

  constructor(private readonly http: HttpClient,
              private readonly translateService: TranslateService,
              private readonly jsonMapperService: JsonMapperService) {
  }

  getFileSizeDisplay(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) {
      return `0 ${this.translateService.instant('misc.dataUnit.bytes')}`;
    }

    const units = [
      this.translateService.instant('misc.dataUnit.bytes'),
      this.translateService.instant('misc.dataUnit.kilobytes'),
      this.translateService.instant('misc.dataUnit.megabytes'),
      this.translateService.instant('misc.dataUnit.gigabytes'),
    ];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, power);
    return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[power]}`;
  }

  getDirectoryContents(directoryUuid: string): Observable<DirectoryContentsView> {
    return this.http.get<Record<string, unknown>>(`/api/files/${directoryUuid}/contents`).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  getDirectoryContentsByPath(path: string): Observable<DirectoryContentsView> {
    const params = new HttpParams().set('path', path);
    return this.http.get<Record<string, unknown>>('/api/files/contents', {params}).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  createDirectory(name: string, parentUuid: string): Observable<DirectoryContentsView> {
    return this.http.post<Record<string, unknown>>('/api/files', {name, parentUuid}).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  renameDirectory(uuid: string, name: string): Observable<DirectoryContentsView> {
    return this.http.patch<Record<string, unknown>>(`/api/files/${uuid}`, {name}).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  deleteDirectory(uuid: string): Observable<DirectoryContentsView> {
    return this.http.delete<Record<string, unknown>>(`/api/files/${uuid}`).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  getDirectoryProperties(uuid: string): Observable<DirectoryPropertiesView> {
    return this.http.get<Record<string, unknown>>(`/api/files/${uuid}/properties`).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryPropertiesView, raw)),
    );
  }

  uploadFile(parentUuid: string,
             file: File): Observable<HttpEvent<DirectoryContentsView>> {
    const headers = new HttpHeaders({
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });
    return this.http.post<DirectoryContentsView>(
      `/api/files/${parentUuid}/upload`,
      file,
      {headers, reportProgress: true, observe: 'events'},
    );
  }

  downloadFile(uuid: string): Observable<HttpEvent<Blob>> {
    return this.http.get(`/api/files/${uuid}/download`, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events',
    });
  }

  renameFile(uuid: string, name: string): Observable<DirectoryContentsView> {
    return this.http.patch<Record<string, unknown>>(`/api/files/${uuid}`, {name}).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  deleteFile(uuid: string): Observable<DirectoryContentsView> {
    return this.http.delete<Record<string, unknown>>(`/api/files/${uuid}`).pipe(
      map(raw => this.jsonMapperService.deserialize(DirectoryContentsView, raw)),
    );
  }

  getFileProperties(uuid: string): Observable<FilePropertiesView> {
    return this.http.get<Record<string, unknown>>(`/api/files/${uuid}/properties`).pipe(
      map(raw => this.jsonMapperService.deserialize(FilePropertiesView, raw)),
    );
  }
}
