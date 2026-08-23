import { z } from "zod";
import { paginationQuerySchema, idParamSchema } from "./common.schema";

export const getNotificationsQuerySchema = paginationQuerySchema;
export const markReadParamsSchema = idParamSchema;

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
export type MarkReadParams = z.infer<typeof markReadParamsSchema>;
