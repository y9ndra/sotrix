import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        }));
        const detailedMessage =
          issues.map((issue) => issue.message).join(". ") || "Validation error";

        return res.status(400).json({
          message: detailedMessage,
          errors: issues,
        });
      }
      return next(error);
    }
  };
};
