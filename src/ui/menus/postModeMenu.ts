import { Menu } from "obsidian";

export function addPostModeMenuItems(
  menu: Menu,
  asTask: boolean,
  onChangeAsTask: (asTask: boolean) => void,
) {
  menu.addItem((item) => {
    item.setTitle("投稿モード").setIcon("pencil").setDisabled(true);
  });
  menu.addItem((item) => {
    item
      .setTitle("メッセージ投稿モード")
      .setIcon("message-square")
      .setChecked(!asTask)
      .onClick(() => {
        onChangeAsTask(false);
      });
  });
  menu.addItem((item) => {
    item
      .setTitle("タスク投稿モード")
      .setIcon("check-circle")
      .setChecked(asTask)
      .onClick(() => {
        onChangeAsTask(true);
      });
  });
}
