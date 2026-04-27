import {DateTime} from 'luxon';
import {TransformDateTime} from '../misc/transform-date-time';

export class FilePropertiesView {
  uuid!: string;
  name!: string;
  mimeType!: string;
  sizeBytes!: number;
  parentUuid!: string | null;
  parentName!: string | null;

  @TransformDateTime()
  createdAt!: DateTime;

  @TransformDateTime()
  lastModifiedAt!: DateTime;
}
