import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ASAPH_JWT_SECRET_CHANGE_ME";

export interface TokenPayload {
  playerId: number;
  username: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
