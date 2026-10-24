import { z } from "zod";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_FEED_LIMIT,
  ACTIVITY_FEED_MAX_LIMIT,
  ACTIVITY_RANGES,
} from "./domain/activity-feed";

export const listTeamActivitySchema = z.object({
  range: z.enum(ACTIVITY_RANGES).default("today"),
  actorId: z.string().uuid().optional(),
  category: z.enum(ACTIVITY_CATEGORIES).optional(),
  limit: z.number().int().min(1).max(ACTIVITY_FEED_MAX_LIMIT).default(ACTIVITY_FEED_LIMIT),
});

export type ListTeamActivityInput = z.input<typeof listTeamActivitySchema>;
export type ListTeamActivityParsed = z.output<typeof listTeamActivitySchema>;
