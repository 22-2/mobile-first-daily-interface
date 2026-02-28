export type MomentLike = ReturnType<typeof window.moment>;

export type Granularity = "day" | "week" | "month" | "year";

export interface Post {
  timestamp: MomentLike;
  message: string;
  offset: number;
  startOffset: number;
  endOffset: number;
  bodyStartOffset: number;
  kind: "codeblock" | "header" | "thino";
}
