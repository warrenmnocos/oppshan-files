import {Pipe, PipeTransform} from '@angular/core';
import {FileService} from '../services/file-service.service';

@Pipe({name: 'fileSize', standalone: true})
export class FileSizePipe implements PipeTransform {

  constructor(private readonly fileService: FileService) {
  }

  transform(bytes: number | null | undefined): string {
    return this.fileService.getFileSizeDisplay(bytes);
  }
}
