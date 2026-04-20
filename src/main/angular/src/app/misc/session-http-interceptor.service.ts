import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {filter, Observable, tap} from 'rxjs';
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
        filter((httpEvent): httpEvent is HttpResponse<any> => httpEvent instanceof HttpResponse),
        tap({
          next: (event) => {
            if (event.status === 499) {
              window.location.reload();
            }
          }
        })
      );
  }
}
