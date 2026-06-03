import { plainToInstance } from 'class-transformer';
import { BreadcrumbView } from './breadcrumb-view';

describe('BreadcrumbView', () => {
  it('should hydrate a plain object into a BreadcrumbView instance', () => {
    const view = plainToInstance(BreadcrumbView, {
      uuid: 'root',
      name: 'Home',
      directory: true,
    });

    expect(view).toBeInstanceOf(BreadcrumbView);
    expect(view.uuid).toBe('root');
    expect(view.name).toBe('Home');
    expect(view.directory).toBe(true);
  });
});
