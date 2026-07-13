import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET!);

        (req as any).user = decodedToken;

        next();
    } catch (error: any) {
        return res.status(401).json({ message: error.message || "Internal server error" });
    }
}