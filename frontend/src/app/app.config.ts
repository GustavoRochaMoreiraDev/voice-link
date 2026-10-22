import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        (req, next) => {
          const modified = req.clone({
            setHeaders: {
              'ngrok-skip-browser-warning': 'true'
            }
          });
          return next(modified);
        }
      ])
    ),
    provideAnimations()
  ]
};
