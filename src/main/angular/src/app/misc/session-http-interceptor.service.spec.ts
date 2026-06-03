import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpHeaderResponse,
  HttpRequest,
  HttpResponse,
  HttpSentEvent,
} from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { SessionHttpInterceptor } from './session-http-interceptor.service';

function makeHandler(...events: HttpEvent<unknown>[]): { handle: ReturnType<typeof vi.fn> } {
  return { handle: vi.fn().mockReturnValue(of(...events)) };
}

describe('SessionHttpInterceptor', () => {
  let interceptor: SessionHttpInterceptor;
  let request: HttpRequest<unknown>;

  beforeEach(() => {
    interceptor = new SessionHttpInterceptor();
    request = new HttpRequest('GET', '/api/files/root/contents');
  });

  it('should append the X-Requested-With header to the forwarded request', () => {
    const handler = makeHandler(new HttpResponse({ status: 200 }));

    interceptor.intercept(request, handler as unknown as HttpHandler).subscribe();

    const forwarded = handler.handle.mock.calls[0][0] as HttpRequest<unknown>;
    expect(forwarded.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
  });

  it('should pass the full event stream through without filtering to HttpResponse', () => {
    const sent = { type: 0 } as HttpSentEvent;
    const header = new HttpHeaderResponse({ status: 200 });
    const response = new HttpResponse({ status: 200 });
    const handler = makeHandler(sent, header, response);

    const seen: HttpEvent<unknown>[] = [];
    interceptor
      .intercept(request, handler as unknown as HttpHandler)
      .subscribe((e) => seen.push(e));

    expect(seen).toEqual([sent, header, response]);
  });

  it('should re-throw error responses via catchError', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const handler = { handle: vi.fn().mockReturnValue(throwError(() => error)) };

    let caught: HttpErrorResponse | undefined;
    interceptor
      .intercept(request, handler as unknown as HttpHandler)
      .subscribe({ error: (e) => (caught = e) });

    expect(caught).toBe(error);
  });
});
