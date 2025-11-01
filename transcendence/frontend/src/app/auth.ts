// export type { AuthUser } from "./mock-auth";
// export { getAuth, mockSignIn as signIn, mockSignOut as signOut } from "./mock-auth";

// When converting from mock-auth to real-auth:
// export { getAuth, signIn, signOut } from "./real-auth";

export type { AuthUser } from "./real-auth";
export { getAuth, signIn, signOut, register, getToken, getProfile, guestLogin } from "./real-auth";