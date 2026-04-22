import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { RootComponent } from './app/core/components/root/root.component';

bootstrapApplication(RootComponent, appConfig).catch((err: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(err);
});
