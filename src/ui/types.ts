import {
    DATE_FILTER_OPTIONS,
    TIME_FILTER_OPTIONS
} from "./config/filter-config";

export type MomentLike = ReturnType<typeof window.moment>;

export type Granularity = "day" | "week" | "month" | "year";

/** 時間単位のフィルター型を config から自動推論 */
export type TimeFilter = (typeof TIME_FILTER_OPTIONS)[number]["id"];

/** 日単位のフィルター型を config から自動推論 */
export type DateFilter = (typeof DATE_FILTER_OPTIONS)[number]["id"];

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
