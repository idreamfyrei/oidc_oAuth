import multer from "multer";
import { ZodError } from "zod";
import ApiError from "../utils/api-error.js";

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed.",
      details: error.flatten(),
    });
    return;
  }

  console.error({
    message: error?.message,
    stack: error?.stack,
    method: req.method,
    path: req.originalUrl,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};

export default errorHandler;
