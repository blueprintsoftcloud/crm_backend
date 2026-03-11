// src/middleware/errorHandler.middleware.ts
// Central error handler — mounted LAST in server.ts.
// All controllers call next(err) instead of res.status(500) directly.
// AppError = expected/operational errors. Unknown errors get a generic 500 in production.

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger from "../utils/logger";

// Use this class to throw known errors from controllers
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Known operational errors (e.g. throw new AppError(404, 'Product not found'))
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Zod validation errors from validate() middleware
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation Error",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Prisma unique constraint violation (e.g. duplicate email)
  if ((err as any).code === "P2002") {
    const fields = (err as any).meta?.target as string[] | undefined;
    res.status(409).json({
      message: `A record with this ${fields?.join(", ") ?? "value"} already exists.`,
    });
    return;
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  // Unknown / unexpected errors
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message,
  });
};
