import { Menu } from "obsidian";
import { MFDIViewHandler } from "../MFDIViewHandler";
import { Granularity, TimeFilter } from "../types";

export function addPaneMenuItems(
  menu: Menu,
  state: {
    asTask: boolean;
    granularity: Granularity;
    timeFilter: TimeFilter;
  },
  handlers: MFDIViewHandler
) {
  menu.addItem((item) => {
    item
      .setTitle("現在のノートを開く")
      .setIcon("external-link")
      .onClick(() => {
        handlers.onOpenDailyNoteAction?.();
      });
  });

  // --- トピック ---
  menu.addSeparator();
  menu.addItem((item) => {
    item
      .setTitle("トピックを管理...")
      .setIcon("folder-open")
      .onClick(() => {
        handlers.onOpenTopicManager?.();
      });
  });

  // --- 投稿モード ---
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle("投稿モード").setIcon("pencil").setDisabled(true);
  });
  menu.addItem((item) => {
    item
      .setTitle("メッセージ投稿モード")
      .setIcon("message-square")
      .setChecked(!state.asTask)
      .onClick(() => {
        handlers.onChangeAsTask?.(false);
      });
  });
  menu.addItem((item) => {
    item
      .setTitle("タスク投稿モード")
      .setIcon("check-circle")
      .setChecked(state.asTask)
      .onClick(() => {
        handlers.onChangeAsTask?.(true);
      });
  });

  // --- 表示期間 ---
  const showTimeFilter = state.granularity === "day" && !state.asTask;
  menu.addSeparator();
  menu.addItem((item) => {
    item.setTitle("表示期間").setIcon("clock").setDisabled(true);
  });
  const filters: TimeFilter[] = [
    "all",
    "latest",
    1,
    2,
    3,
    6,
    12,
    "this_week",
  ];
  for (const f of filters) {
    menu.addItem((item) => {
      const isChecked = showTimeFilter
        ? state.timeFilter === f
        : f === "all";
      item
        .setTitle(
          f === "all"
            ? "今日"
            : f === "latest"
            ? "最新のみ表示"
            : f === "this_week"
            ? "今週"
            : `直近${f}時間`
        )
        .setChecked(isChecked)
        .setDisabled(!showTimeFilter)
        .onClick(() => {
          handlers.onChangeTimeFilter?.(f);
        });
    });
  }
}
