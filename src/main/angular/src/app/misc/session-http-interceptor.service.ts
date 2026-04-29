import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import {catchError, Observable, tap, throwError} from 'rxjs';
import {Injectable} from '@angular/core';

@Injectable()
export class SessionHttpInterceptor implements HttpInterceptor {

  intercept(httpRequest: HttpRequest<any>,
            httpHandler: HttpHandler): Observable<HttpEvent<any>> {
    const newHttpRequest = httpRequest.clone({
      headers: httpRequest.headers.append('X-Requested-With', 'XMLHttpRequest')
    });
    return httpHandler.handle(newHttpRequest)
      .pipe(
        tap({
          next: (httpEvent) => {
            if (httpEvent instanceof HttpResponse && httpEvent.status === 499) {
              window.location.reload();
            }
          }
        }),
        catchError((httpErrorResponse: HttpErrorResponse) => {
          if (httpErrorResponse.status === 0) {
            window.location.reload();
          }
          return throwError(() => httpErrorResponse);
        })
      );
  }
}
