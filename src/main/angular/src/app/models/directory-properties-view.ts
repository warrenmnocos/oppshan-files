import {DateTime} from 'luxon';
import {TransformDateTime} from '../misc/transform-date-time';

export class DirectoryPropertiesView {

  uuid!: string;

  name!: string;

  @TransformDateTime()
  createdAt!: DateTime;

  @TransformDateTime()
  lastModifiedAt!: DateTime;

  directoryCount!: number;

  fileCount!: number;

  totalSizeBytes!: number;
}
