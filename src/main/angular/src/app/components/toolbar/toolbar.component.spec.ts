import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Toolbar } from './toolbar.component';
import { UserAccountView } from '../../models/user-account-view';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';

type Internals = {
  initials: string;
  storagePercent: number;
  photoRetrieved: boolean;
  toggleDropdown: () => void;
  signOut: () => void;
  onProfileClicked: () => void;
  onPhotoError: () => void;
};

function buildUser(overrides: Partial<UserAccountView>): UserAccountView {
  return Object.assign(
    new UserAccountView(),
    {
      uuid: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      photoUrl: null,
      usedStorageBytes: 0,
      maxStorageBytes: 0,
      maxFileUploadBytes: 0,
      rootFileNodeUuid: 'root',
    },
    overrides,
  );
}

describe('Toolbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toolbar],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Toolbar);
    fixture.componentRef.setInput('userAccountView', null);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive initials from first and last name', () => {
    const fixture = TestBed.createComponent(Toolbar);
    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ firstName: 'Grace', lastName: 'Hopper' }),
    );
    const instance = fixture.componentInstance as unknown as Internals;
    expect(instance.initials).toBe('GH');
  });

  it('should fall back to displayName initial when names are absent', () => {
    const fixture = TestBed.createComponent(Toolbar);
    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ firstName: null, lastName: null, displayName: 'octocat' }),
    );
    const instance = fixture.componentInstance as unknown as Internals;
    expect(instance.initials).toBe('O');
  });

  it('should compute storage percent and avoid divide-by-zero', () => {
    const fixture = TestBed.createComponent(Toolbar);
    const instance = fixture.componentInstance as unknown as Internals;

    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ usedStorageBytes: 25, maxStorageBytes: 100 }),
    );
    expect(instance.storagePercent).toBe(25);

    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ usedStorageBytes: 25, maxStorageBytes: 0 }),
    );
    expect(instance.storagePercent).toBe(0);
  });

  it('should fire SignOutInitiated on signOut', () => {
    const fixture = TestBed.createComponent(Toolbar);
    fixture.componentRef.setInput('userAccountView', buildUser({}));
    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as Internals).signOut();

    expect(spy).toHaveBeenCalledWith(ApplicationEventType.SignOutInitiated);
  });

  it('should fire ProfileShown with the current user on profile click', () => {
    const user = buildUser({});
    const fixture = TestBed.createComponent(Toolbar);
    fixture.componentRef.setInput('userAccountView', user);
    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEvent');

    (fixture.componentInstance as unknown as Internals).onProfileClicked();

    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0] as ApplicationEvent;
    expect(event.type).toBe(ApplicationEventType.ProfileShown);
    expect(event.payload).toBe(user);
  });

  it('should mark the photo as failed and hide it after a load error', () => {
    const fixture = TestBed.createComponent(Toolbar);
    fixture.componentRef.setInput(
      'userAccountView',
      buildUser({ photoUrl: 'https://example.com/p.png' }),
    );
    const instance = fixture.componentInstance as unknown as Internals;

    expect(instance.photoRetrieved).toBe(true);
    instance.onPhotoError();
    expect(instance.photoRetrieved).toBe(false);
  });
});
