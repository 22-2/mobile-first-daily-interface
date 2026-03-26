import { defineProperties, createSprinkles } from "@vanilla-extract/sprinkles";
import { vars } from "src/styles/theme.css";

// ステップ2: よく使うユーティリティ（スペーシング、表示、色、タイポなど）を定義します。
// 意図: ChakraのユーティリティPropsに似たDXを提供しつつ、インラインstyleを使わないようにする。

const space = {
  px: vars.space.px,
  "0": vars.space["0"],
  "1": vars.space["1"],
  "2": vars.space["2"],
  "3": vars.space["3"],
  "4": vars.space["4"],
  "6": vars.space["6"],
  "8": vars.space["8"],
};

// colors omitted intentionally (user requested minimal tokens, no color)

const fontSizes = {
  xs: vars.fontSize.xs,
  sm: vars.fontSize.sm,
  md: vars.fontSize.md,
  lg: vars.fontSize.lg,
};

const radii = {
  sm: vars.radii.sm,
  md: vars.radii.md,
  full: vars.radii.full,
};

// shadows omitted intentionally

const properties = defineProperties({
  properties: {
    display: ["block", "inline-block", "flex", "inline-flex", "grid", "none"],
    flexDirection: ["row", "column", "row-reverse", "column-reverse"],
    justifyContent: [
      "flex-start",
      "center",
      "flex-end",
      "space-between",
      "space-around",
    ],
    alignItems: ["flex-start", "center", "flex-end", "stretch"],
    gap: space,
    padding: space,
    paddingTop: space,
    paddingBottom: space,
    paddingLeft: space,
    paddingRight: space,
    margin: space,
    marginTop: space,
    marginBottom: space,
    marginLeft: space,
    marginRight: space,
    // background/color omitted
    fontSize: fontSizes,
    borderRadius: radii,
    // boxShadow omitted
    width: { container: vars.sizes.container },
    height: { auto: "auto" },
  },
  shorthands: {
    p: ["padding"],
    pt: ["paddingTop"],
    pb: ["paddingBottom"],
    pl: ["paddingLeft"],
    pr: ["paddingRight"],
    px: ["paddingLeft", "paddingRight"],
    py: ["paddingTop", "paddingBottom"],
    m: ["margin"],
    mt: ["marginTop"],
    mb: ["marginBottom"],
    ml: ["marginLeft"],
    mr: ["marginRight"],
    mx: ["marginLeft", "marginRight"],
    my: ["marginTop", "marginBottom"],
  },
});

export const sprinkles = createSprinkles(properties);

export type Sprinkles = Parameters<typeof sprinkles>[0];

export const compose = (
  ...args: Array<Sprinkles | false | null | undefined>
) => {
  return sprinkles(Object.assign({}, ...args.filter(Boolean)));
};
