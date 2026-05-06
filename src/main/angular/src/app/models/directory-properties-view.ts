import {DateTime} from 'luxon';
import {TransformDateTime} from '../misc/transform-date-time';
import {FileNodePropertiesView} from './file-node-properties-view';

export class DirectoryPropertiesView implements FileNodePropertiesView {

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
