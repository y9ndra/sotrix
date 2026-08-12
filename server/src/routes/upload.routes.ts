import { Router } from "express";
import upload from "../middleware/upload.middleware";

const router = Router();

router.post(
  "/upload",
  upload.single("image"),
  (req, res) => {
    console.log(req.file);
    console.log(req.body);

    res.json({
      message: "Upload successful",
      file: req.file,
      body: req.body,
    });
  }
);

export default router;
