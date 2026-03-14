import { Moment } from "moment";
import {
  DATE_FILTER_OPTIONS,
  TIME_FILTER_OPTIONS,
} from "src/ui/config/filter-config";
import { DISPLAY_MODE } from "src/ui/config/consntants";

export type MomentLike = Moment;

export type Granularity = "day" | "week" | "month" | "year";

/** 時間単位のフィルター型を config から自動推論 */
export type TimeFilter = (typeof TIME_FILTER_OPTIONS)[number]["id"];

/** 日単位のフィルター型を config から自動推論 */
export type DateFilter = (typeof DATE_FILTER_OPTIONS)[number]["id"];

export type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];

export interface Post {
  timestamp: MomentLike;
  message: string;
  metadata: Record<string, string>;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  kind: "thino";
  path: string;
}
