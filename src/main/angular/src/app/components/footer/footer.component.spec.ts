import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Footer } from './footer.component';

describe('Footer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideTranslateService({ lang: 'en' })],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Footer);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should link to the source repository', () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://github.com/warrenmnocos/oppshan-files');
  });

  it('should expose the current year as a signal', () => {
    const fixture = TestBed.createComponent(Footer);
    const instance = fixture.componentInstance as unknown as { currentYear: () => number };
    expect(instance.currentYear()).toBe(new Date().getFullYear());
  });
});
