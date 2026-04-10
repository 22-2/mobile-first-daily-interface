import type { FC } from "node_modules/@types/react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { HStack } from "src/ui/components/primitives";

export const NavButton: FC<{
  direction: "left" | "right";
  onClick: () => void;
}> = ({ direction, onClick }) => {
  return (
    <HStack
      className={`mfdi-nav-button mfdi-nav-button-${direction} cursor-pointer ${direction === "left" ? "flex-row" : "flex-row-reverse"} gap-0`}
      onClick={onClick}
    >
      <ObsidianIcon name={`chevron-${direction}`} boxSize="1.5em" />
    </HStack>
  );
};
