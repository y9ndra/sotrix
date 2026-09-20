import { Request, Response, NextFunction } from "express";

/**
 * Middleware to restrict mutating actions for the 1-click Demo Account.
 * Returns 403 Forbidden with standard code DEMO_ACCOUNT_RESTRICTED.
 */
export const blockDemoUser = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  if (req.user?.isDemo) {
    return res.status(403).json({
      success: false,
      code: "DEMO_ACCOUNT_RESTRICTED",
      message: "This demo account is view-only. Please create an account to interact.",
    });
  }
  next();
};
