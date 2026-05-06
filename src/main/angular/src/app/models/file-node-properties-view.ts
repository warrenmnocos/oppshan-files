import {DateTime} from 'luxon';

export interface FileNodePropertiesView {

  uuid: string;

  name: string;

  createdAt: DateTime;

  lastModifiedAt: DateTime;
}
