import 'reflect-metadata';
import {Type} from 'class-transformer';
import {BreadcrumbView} from './breadcrumb-view';
import {FileNodeView} from './file-node-view';

export class DirectoryContentsView {

  uuid!: string;

  name!: string;

  parentUuid!: string | null;

  targetFileUuid!: string | null;

  @Type(() => BreadcrumbView)
  breadcrumbViews!: BreadcrumbView[];

  @Type(() => FileNodeView)
  childrenFileNodeViews!: FileNodeView[];
}
