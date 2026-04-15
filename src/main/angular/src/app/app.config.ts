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
import {SignOutOutcomeApplicationEventListener} from './listeners/sign-out-outcome-application-event-listener.service';
import {
  NotificationRequiredApplicationEventListener
} from './listeners/notification-required-application-event-listener.service';
import {
  DirectoryCreateConfirmedApplicationEventListener
} from './listeners/directory-create-confirmed-application-event-listener.service';
import {
  DirectoryRenameConfirmedApplicationEventListener
} from './listeners/directory-rename-confirmed-application-event-listener.service';
import {
  DirectoryDeletionConfirmedApplicationEventListener
} from './listeners/directory-deletion-confirmed-application-event-listener.service';
import {MessageReactorService} from './services/message-reactor-service';
import {
  SignOutInitiatedApplicationEventListener
} from './listeners/sign-out-initiated-application-event-listener.service';
import {
  SignInInitiatedApplicationEventListener
} from './listeners/sign-in-initiated-application-event-listener.service';
import {
  DirectoryNavigationInitiatedApplicationEventListener
} from './listeners/directory-navigation-initiated-application-event-listener.service';

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
      useClass: SignInInitiatedApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: SignOutInitiatedApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: SignOutOutcomeApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: DirectoryNavigationInitiatedApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: DirectoryCreateConfirmedApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: DirectoryRenameConfirmedApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: DirectoryDeletionConfirmedApplicationEventListener,
      multi: true,
    },
    {
      provide: MESSAGE_LISTENERS,
      useClass: NotificationRequiredApplicationEventListener,
      multi: true,
    },
  ],
};
