export {
  AuthenticationError,
  AuthenticationService,
  AuthorizationError,
  createAuthenticationService,
  requireAuthenticatedUser,
  requireRole,
} from "./authentication.js";
export {
  AuthenticationConfigurationError,
  readEntraAuthenticationConfiguration,
  type AuthenticationEnvironment,
  type EntraAuthenticationConfiguration,
} from "./configuration.js";
export { EntraJwtAccessTokenValidator } from "./token-validator.js";
export type {
  AccessTokenValidator,
  AuthenticatedUser,
  AuthenticationRequest,
  HeaderReader,
} from "./types.js";
