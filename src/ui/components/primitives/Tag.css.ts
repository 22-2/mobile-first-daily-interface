import { style } from "@vanilla-extract/css";

export const container = style({
  display: "inline-flex",
  verticalAlign: "top",
  alignItems: "center",
  maxWidth: "100%",
});

export const label = style({
  display: "inline-block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const icon = style({
  display: "inline-flex",
  verticalAlign: "top",
});

export const iconLeft = style({
  marginRight: "0.5rem",
});

export const iconRight = style({
  marginLeft: "0.5rem",
});
