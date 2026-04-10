import {Pipe, PipeTransform} from '@angular/core';
import {UserAccountView} from '../models/user-account-view';
import {FileService} from '../services/file-service.service';

@Pipe({name: 'storageBar', standalone: true})
export class StorageBarPipe implements PipeTransform {

  constructor(private readonly fileService: FileService) {
  }

  transform(userAccountView: UserAccountView | null | undefined): string {
    if (!userAccountView) {
      return '';
    }

    return `${this.fileService.getFileSizeDisplay(userAccountView.usedStorageBytes)} / ${this.fileService.getFileSizeDisplay(userAccountView.maxStorageBytes)}`;
  }
}
