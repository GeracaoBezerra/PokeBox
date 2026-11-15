import { AuthContext } from "./authContext";

export const AuthProvider = ({ service, children }) => (
  <AuthContext.Provider value={service}>{children}</AuthContext.Provider>
);
