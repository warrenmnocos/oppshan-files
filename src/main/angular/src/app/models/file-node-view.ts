import {DateTime} from 'luxon';
import {TransformDateTime} from '../misc/transform-date-time';

export class FileNodeView {

  uuid!: string;

  name!: string;

  mimeType!: string;

  directory!: boolean;

  sizeBytes!: number;

  parentUuid!: string | null;

  @TransformDateTime()
  createdAt!: DateTime;

  @TransformDateTime()
  lastModifiedAt!: DateTime;
}
