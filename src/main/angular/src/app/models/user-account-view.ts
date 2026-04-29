import {DateTime} from 'luxon';
import {TransformDateTime} from '../misc/transform-date-time';

export class UserAccountView {

  uuid!: string;

  firstName!: string;

  lastName!: string;

  email!: string;

  photoUrl!: string | null;

  usedStorageBytes!: number;

  maxStorageBytes!: number;

  maxFileUploadBytes!: number;

  rootFileNodeUuid!: string;

  @TransformDateTime()
  createdAt!: DateTime;

  @TransformDateTime()
  lastModifiedAt!: DateTime;
}
