export const errorHandler = (err, req, res, next) => {
  if (err.name === "ZodError") {
    const msg = err.issues?.[0]?.message || err.errors?.[0]?.message || "Validation error";
    return res.status(400).json({ success: false, message: msg, errors: err.issues || err.errors });
  }

  console.error(err.stack);
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
