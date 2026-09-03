export {
  AuthenticationError,
  AuthenticationService,
  AuthorizationError,
  createAuthenticationService,
  requireAuthenticatedUser,
  requireRole,
} from "./authentication.js";
export {
  getAdminTestIdentity,
  getAuthenticatedIdentity,
} from "./auth-endpoints.js";
export {
  AuthenticationConfigurationError,
  readEntraAuthenticationConfiguration,
  type AuthenticationEnvironment,
  type EntraAuthenticationConfiguration,
} from "./configuration.js";
export { EntraJwtAccessTokenValidator } from "./token-validator.js";
export { getRuntimeAuthenticationService } from "./runtime.js";
export type {
  AccessTokenValidator,
  AuthenticatedUser,
  AuthenticationRequest,
  HeaderReader,
} from "./types.js";
