import { TestBed } from '@angular/core/testing';
import { SignOut } from './sign-out.component';
import { MessageBusService } from '../../services/message-bus-service';
import { ApplicationEventType } from '../../models/application-event-type';

describe('SignOut', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignOut],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SignOut);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should fire SignOutInitiated on init', () => {
    const bus = TestBed.inject(MessageBusService);
    const spy = vi.spyOn(bus, 'fireApplicationEventOfType');

    const fixture = TestBed.createComponent(SignOut);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(ApplicationEventType.SignOutInitiated);
  });
});
