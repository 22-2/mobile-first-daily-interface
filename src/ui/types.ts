export type MomentLike = ReturnType<typeof window.moment>;

export type Granularity = "day" | "week" | "month" | "year";

export type TimeFilter = 1 | 2 | 3 | 6 | 12 | "all" | "latest" | "this_week";

export interface Post {
  timestamp: MomentLike;
  message: string;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  kind: "thino";
}
