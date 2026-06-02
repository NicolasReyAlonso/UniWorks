import * as firebase_private from '../../../private-conf/ngd-firebase.json';

export const environment = {
  production: true,
  backend_url: 'https://sys.nextgendem.eu',
  firebase_config: firebase_private.default,
  firebaseui_config: {
    enableFirestoreSync: true, // enable/disable autosync users with firestore
    toastMessageOnAuthSuccess: false, // whether to open/show a snackbar message on auth success - default : true
    toastMessageOnAuthError: false, // whether to open/show a snackbar message on auth error - default : true
    authGuardFallbackURL: 'login', // url for unauthenticated users - to use in combination with canActivate feature on a route
    authGuardLoggedInURL: 'logout', // url for authenticated users - to use in combination with canActivate feature on a route
    passwordMaxLength: 60, // `min/max` input parameters in components should be within this range.
    passwordMinLength: 8, // Password length min/max in forms independently of each componenet min/max.
    // Same as password but for the name
    nameMaxLength: 50,
    nameMinLength: 2,
    // If set, sign-in/up form is not available until email has been verified.
    // Plus protected routes are still protected even though user is connected.
    guardProtectedRoutesUntilEmailIsVerified: true,
    enableEmailVerification: true, // default: true
  }
};
