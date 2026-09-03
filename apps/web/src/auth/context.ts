import { createContext } from "react";

import type { AuthContextValue } from "./types";

const unavailable = async () => {
  throw new Error("Microsoft Entra authentication is not configured.");
};

export const AuthContext = createContext<AuthContextValue>({
  state: "unconfigured",
  user: null,
  login: unavailable,
  logout: unavailable,
  getAccessToken: unavailable,
});
