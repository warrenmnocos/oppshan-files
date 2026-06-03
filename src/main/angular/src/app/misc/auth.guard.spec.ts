import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth-service.service';
import { UserAccountView } from '../models/user-account-view';

const SIGN_IN_TREE = {} as UrlTree;
const DRIVE_TREE = {} as UrlTree;
const PARSED_TREE = {} as UrlTree;
const USER = { uuid: 'u1' } as UserAccountView;

function configure(currentUser: UserAccountView | null): { router: Router } {
  const router = {
    createUrlTree: vi.fn((commands: string[]) =>
      commands[0] === '/drive' ? DRIVE_TREE : SIGN_IN_TREE,
    ),
    parseUrl: vi.fn(() => PARSED_TREE),
  } as unknown as Router;

  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { getCurrentUser: () => of(currentUser) } },
      { provide: Router, useValue: router },
    ],
  });

  return { router };
}

function runAuthGuard(state: RouterStateSnapshot): boolean | UrlTree {
  let result!: boolean | UrlTree;
  TestBed.runInInjectionContext(() => {
    (authGuard({} as never, state) as ReturnType<typeof of>).subscribe((v) => (result = v));
  });
  return result;
}

function runGuestGuard(): boolean | UrlTree {
  let result!: boolean | UrlTree;
  TestBed.runInInjectionContext(() => {
    (guestGuard({} as never, {} as RouterStateSnapshot) as ReturnType<typeof of>).subscribe(
      (v) => (result = v),
    );
  });
  return result;
}

describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should allow activation when a user is signed in and no redirect is stored', () => {
    configure(USER);
    expect(runAuthGuard({ url: '/drive' } as RouterStateSnapshot)).toBe(true);
  });

  it('should consume the stored redirect url and parse it when signed in', () => {
    const { router } = configure(USER);
    sessionStorage.setItem('oppshan_redirect_url', '/drive/folder');

    const result = runAuthGuard({ url: '/drive' } as RouterStateSnapshot);

    expect(router.parseUrl).toHaveBeenCalledWith('/drive/folder');
    expect(result).toBe(PARSED_TREE);
    expect(sessionStorage.getItem('oppshan_redirect_url')).toBeNull();
  });

  it('should redirect to sign-in and store the target url when not signed in', () => {
    const { router } = configure(null);

    const result = runAuthGuard({ url: '/drive/secret' } as RouterStateSnapshot);

    expect(result).toBe(SIGN_IN_TREE);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/sso/sign-in']);
    expect(sessionStorage.getItem('oppshan_redirect_url')).toBe('/drive/secret');
  });

  it('should not store a redirect url when the target is the root path', () => {
    configure(null);

    runAuthGuard({ url: '/' } as RouterStateSnapshot);

    expect(sessionStorage.getItem('oppshan_redirect_url')).toBeNull();
  });
});

describe('guestGuard', () => {
  it('should allow activation when no user is signed in', () => {
    configure(null);
    expect(runGuestGuard()).toBe(true);
  });

  it('should redirect to the drive when a user is already signed in', () => {
    const { router } = configure(USER);
    expect(runGuestGuard()).toBe(DRIVE_TREE);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/drive']);
  });
});
