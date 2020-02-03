import * as JWT from "./types/jwtToken";

const secret = process.env.JWT_SECRET ?? "SECRET";
const options = {};

export const JWTTokenFromString = JWT.JWTTokenFromString(secret, options);
export const JWTTokenFromHeader = JWT.JWTTokenFromHeader(secret, options);
