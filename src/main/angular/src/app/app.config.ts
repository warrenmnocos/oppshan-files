import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer
} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {provideRouter} from '@angular/router';
import {provideTranslateService} from '@ngx-translate/core';
import {provideTranslateHttpLoader} from '@ngx-translate/http-loader';

import {routes} from './app.routes';
import {MESSAGE_LISTENERS} from './listeners/message-listener';
import {SignOutApplicationEventListener} from './listeners/sign-out-application-event-listener';
import {MessageReactorService} from './services/message-reactor-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    provideTranslateService({
      lang: 'en',
      loader: provideTranslateHttpLoader({prefix: '/i18n/', suffix: '.json'}),
    }),
    provideEnvironmentInitializer(() => {
      inject(MessageReactorService).start();
    }),
    {
      provide: MESSAGE_LISTENERS,
      useClass: SignOutApplicationEventListener,
      multi: true,
    }
  ],
};
