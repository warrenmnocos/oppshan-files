import {Pipe, PipeTransform} from '@angular/core';
import {UserAccountView} from '../models/user-account-view';

@Pipe({name: 'storageBar'})
export class StorageBarPipe implements PipeTransform {
  transform(user: UserAccountView): string {
    return `${this.formatBytes(user.usedStorageBytes)} / ${this.formatBytes(user.maxStorageBytes)}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0.0';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(0)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  }
}