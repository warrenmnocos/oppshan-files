import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ErrorState } from './error-state.component';
import { MessageCode } from '../../models/message-code';

describe('ErrorState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorState],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
  });

  it('should create with a required messageCode input', () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('messageCode', MessageCode.DirectoryNotFound);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the bound messageCode through its input signal', () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('messageCode', MessageCode.FileNotFound);
    fixture.detectChanges();
    expect(fixture.componentInstance.messageCode()).toBe(MessageCode.FileNotFound);
  });
});
