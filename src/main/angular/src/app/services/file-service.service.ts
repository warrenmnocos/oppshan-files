import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {DirectoryContentsView} from '../models/directory-contents-view';
import {JsonMapper} from './json-mapper.service';
import {TranslateService} from '@ngx-translate/core';

@Injectable({providedIn: 'root'})
export class FileService {

  constructor(private readonly http: HttpClient,
              private readonly translateService: TranslateService,
              private readonly jsonMapper: JsonMapper) {
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
    return this.http.get<Record<string, unknown>>(`/api/directories/${directoryUuid}/contents`).pipe(
      map(raw => this.jsonMapper.deserialize(DirectoryContentsView, raw)),
    );
  }

  getDirectoryContentsByPath(path: string): Observable<DirectoryContentsView> {
    const params = new HttpParams().set('path', path);
    return this.http.get<Record<string, unknown>>('/api/directories/contents', {params}).pipe(
      map(raw => this.jsonMapper.deserialize(DirectoryContentsView, raw)),
    );
  }
}
