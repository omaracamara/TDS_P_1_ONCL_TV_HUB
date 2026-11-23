import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { Session } from "../models/session.model.js";
import { User, type Role } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import {
  createAccessToken,
  createRefreshToken,
  refreshTokenExpiresAt,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { hashRefreshToken, refreshTokenMatches } from "../utils/token-hash.js";

type Credentials = { email?: unknown; password?: unknown };

function readCredentials(body: Credentials): {
  email: string;
  password: string;
} {
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Provide a valid email and a password of at least 8 characters",
    );
  }

  return { email, password };
}

function publicUser(user: { _id: Types.ObjectId; email: string; role: Role }) {
  return { id: user._id.toString(), email: user.email, role: user.role };
}

async function createSessionTokens(
  user: { _id: Types.ObjectId; role: Role },
  userAgent?: string,
) {
  const sessionId = new Types.ObjectId();
  const userId = user._id.toString();
  const refreshToken = createRefreshToken(userId, sessionId.toString());

  await Session.create({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshTokenExpiresAt(),
    userAgent,
  });

  return { accessToken: createAccessToken(userId, user.role), refreshToken };
}

export const register: RequestHandler = async (request, response) => {
  const { email, password } = readCredentials(request.body);
  const existingUser = await User.exists({ email });
  if (existingUser)
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email already exists");

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, role: "USER" });
  const tokens = await createSessionTokens(user, request.get("user-agent"));
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  response.status(201).json({ user: publicUser(user) });
};

export const login: RequestHandler = async (request, response) => {
  const { email, password } = readCredentials(request.body);
  const user = await User.findOne({ email });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const tokens = await createSessionTokens(user, request.get("user-agent"));
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  response.json({ user: publicUser(user) });
};

export const refresh: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies.refreshToken;
  if (typeof refreshToken !== "string") {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is required");
  }

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const session = await Session.findById(payload.sid);
  const isValidSession =
    session &&
    session.userId.toString() === payload.sub &&
    !session.revokedAt &&
    session.expiresAt > new Date() &&
    refreshTokenMatches(refreshToken, session.refreshTokenHash);

  if (!isValidSession) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
  }

  const newRefreshToken = createRefreshToken(user.id, session.id);
  session.refreshTokenHash = hashRefreshToken(newRefreshToken);
  session.expiresAt = refreshTokenExpiresAt();
  await session.save();

  setAuthCookies(
    response,
    createAccessToken(user.id, user.role),
    newRefreshToken,
  );
  response.json({ user: publicUser(user) });
};

export const logout: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies.refreshToken;
  if (typeof refreshToken !== "string") {
    throw new AppError(401, "UNAUTHORIZED", "Refresh token is required");
  }

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  const session = await Session.findById(payload.sid);
  const isCurrentSession =
    session &&
    session.userId.toString() === payload.sub &&
    !session.revokedAt &&
    session.expiresAt > new Date() &&
    refreshTokenMatches(refreshToken, session.refreshTokenHash);

  if (!isCurrentSession) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired refresh token");
  }

  session.revokedAt = new Date();
  await session.save();
  clearAuthCookies(response);
  response.status(204).send();
};

export const logoutAll: RequestHandler = async (request, response) => {
  const auth = request.auth;
  if (!auth)
    throw new AppError(401, "UNAUTHORIZED", "Authentication is required");

  await Session.updateMany(
    { userId: auth.userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  clearAuthCookies(response);
  response.status(204).send();
};
