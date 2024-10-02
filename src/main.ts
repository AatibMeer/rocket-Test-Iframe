import { enableProdMode } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';

import { SignAppModule } from './app/modules/sign-app/sign-app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}
const targetWindow: Window = window.parent || window;
targetWindow.postMessage('NDM_LOAD_STARTED', '*');
platformBrowser().bootstrapModule(SignAppModule)
  .catch(err => console.error(err));