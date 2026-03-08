import { Menu } from "obsidian";
import { granularityConfig } from "../granularity-config";
import { Granularity } from "../types";

export function addGranularityMenuItems(
  menu: Menu,
  currentGranularity: Granularity,
  onChangeGranularity?: (g: Granularity) => void
) {
  // --- 表示単位 ---
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle("表示単位").setIcon("calendar").setDisabled(true);
  });
  const granularities: Granularity[] = ["day", "week", "month", "year"];
  for (const g of granularities) {
    menu.addItem((item) => {
      item
        .setTitle(granularityConfig[g].menuLabel)
        .setChecked(currentGranularity === g)
        .onClick(() => {
          onChangeGranularity?.(g);
        });
    });
  }
}
