import {
  AuthenticationService,
  createAuthenticationService,
} from "./authentication.js";

let authenticationService: AuthenticationService | undefined;

/**
 * Lazily creates one validator so its signing-key cache can be reused.
 * The anonymous health endpoint never calls this function.
 */
export function getRuntimeAuthenticationService(): AuthenticationService {
  authenticationService ??= createAuthenticationService(process.env);
  return authenticationService;
}
