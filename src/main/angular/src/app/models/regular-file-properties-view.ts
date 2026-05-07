import {DateTime} from 'luxon';
import {TransformDateTime} from '../misc/transform-date-time';
import {FileNodePropertiesView} from './file-node-properties-view';

export class RegularFilePropertiesView implements FileNodePropertiesView {

  uuid!: string;

  name!: string;

  mimeType!: string;

  sizeBytes!: number;

  parentUuid!: string;

  parentName!: string;

  @TransformDateTime()
  createdAt!: DateTime;

  @TransformDateTime()
  lastModifiedAt!: DateTime;
}
