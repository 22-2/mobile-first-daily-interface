import React from "react";
import { sprinkles, type Sprinkles } from "../../../styles/sprinkles.css";
import * as styles from "./Tag.css";

type TagProps = React.HTMLAttributes<HTMLSpanElement> & { spr?: Sprinkles };
type TagLabelProps = React.HTMLAttributes<HTMLSpanElement> & {
  spr?: Sprinkles;
};

export const Tag = ({ children, className, spr, ...rest }: TagProps) => {
  const classStr = [
    styles.container,
    className,
    spr ? sprinkles(spr) : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span role="status" className={classStr} {...rest}>
      {children}
    </span>
  );
};

export const TagLabel = ({
  children,
  className,
  spr,
  ...rest
}: TagLabelProps) => {
  const classStr = [styles.label, className, spr ? sprinkles(spr) : undefined]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classStr} {...rest}>
      {children}
    </span>
  );
};

export const TagLeftIcon = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    {...props}
    className={[styles.icon, styles.iconLeft, props.className]
      .filter(Boolean)
      .join(" ")}
  />
);

export const TagRightIcon = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    {...props}
    className={[styles.icon, styles.iconRight, props.className]
      .filter(Boolean)
      .join(" ")}
  />
);

// Named exports only
