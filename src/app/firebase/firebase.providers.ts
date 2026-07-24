import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.config';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');

function createFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Registers Firebase App + Firestore for DI.
 * Future services can inject FIRESTORE (or FIREBASE_APP) without re-initializing.
 */
export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_APP,
      useFactory: createFirebaseApp,
    },
    {
      provide: FIRESTORE,
      deps: [FIREBASE_APP],
      useFactory: (app: FirebaseApp): Firestore => getFirestore(app),
    },
  ]);
}
