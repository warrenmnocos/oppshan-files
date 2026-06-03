import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Breadcrumb } from './breadcrumb.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { DirectoryNavigationCommand } from '../../models/operation-commands';

describe('Breadcrumb', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Breadcrumb],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Breadcrumb);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('breadcrumbViews', [
      { uuid: 'root', name: 'Home', directory: true },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should fire DirectoryNavigationInitiated with the uuid on navigate', () => {
    const fixture = TestBed.createComponent(Breadcrumb);
    fixture.componentRef.setInput('loading', false);
    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    (
      fixture.componentInstance as unknown as { onNavigate: (uuid: string | null) => void }
    ).onNavigate('dir-1');

    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.DirectoryNavigationInitiated);
    expect((event.payload as DirectoryNavigationCommand).uuid).toBe('dir-1');
  });
});
