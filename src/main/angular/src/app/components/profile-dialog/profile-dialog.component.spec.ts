import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ProfileDialog } from './profile-dialog.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEvent } from '../../models/application-event';
import { ApplicationEventType } from '../../models/application-event-type';
import { UserAccountView } from '../../models/user-account-view';

function makeUser(): UserAccountView {
  const view = new UserAccountView();
  view.uuid = 'user-1';
  view.firstName = 'Ada';
  view.lastName = 'Lovelace';
  view.displayName = 'Ada Lovelace';
  view.email = 'ada@example.com';
  view.photoUrl = null;
  return view;
}

describe('ProfileDialog', () => {
  let bus: MessageBusService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileDialog],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
    bus = TestBed.inject(MessageBusService);
    bus.fireApplicationEvent(new ApplicationEvent(ApplicationEventType.ProfileShown, makeUser()));
  });

  it('should create and derive the full name and initials', () => {
    const fixture = TestBed.createComponent(ProfileDialog);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      fullName: () => string;
      initials: () => string;
    };
    expect(instance.fullName()).toBe('Ada Lovelace');
    expect(instance.initials()).toBe('AL');
  });

  it('should report no retrieved photo when photoUrl is null', () => {
    const fixture = TestBed.createComponent(ProfileDialog);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { photoRetrieved: boolean };
    expect(instance.photoRetrieved).toBe(false);
  });

  it('should fire ProfileHidden on close', () => {
    const fixture = TestBed.createComponent(ProfileDialog);
    fixture.detectChanges();
    const typeSpy = vi.spyOn(bus, 'fireApplicationEventOfType');

    (fixture.componentInstance as unknown as { onClose: () => void }).onClose();

    expect(typeSpy).toHaveBeenCalledWith(ApplicationEventType.ProfileHidden);
  });
});
