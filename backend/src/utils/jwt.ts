import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  userId: string;
  role: string;
  province?: string;
  district?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sign = (payload: JWTPayload, secret: string, expiresIn: string): string =>
  (jwt.sign as any)(payload, secret, { expiresIn });

export const signAccessToken = (payload: JWTPayload): string =>
  sign(payload, config.jwt.secret, config.jwt.expiresIn);

export const signRefreshToken = (payload: JWTPayload): string =>
  sign(payload, config.jwt.refreshSecret, config.jwt.refreshExpiresIn);

export const verifyAccessToken = (token: string): JWTPayload =>
  jwt.verify(token, config.jwt.secret) as JWTPayload;

export const verifyRefreshToken = (token: string): JWTPayload =>
  jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
