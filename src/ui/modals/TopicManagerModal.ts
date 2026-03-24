import { App, Modal } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { Topic } from "src/topic";
import { TopicManagerView } from "src/ui/components/topics/TopicManagerView";

export class TopicManagerModal extends Modal {
  private root: Root;

  constructor(
    app: App,
    private topics: Topic[],
    private activeTopic: string,
    private onSave: (topics: Topic[], activeTopic: string) => Promise<void>,
  ) {
    super(app);
  }

  onOpen() {
    this.titleEl.setText("トピック管理");
    this.modalEl.setCssStyles({
      width: "480px",
    });
    this.root = createRoot(this.contentEl);
    this.root.render(
      React.createElement(TopicManagerView, {
        topics: this.topics,
        activeTopic: this.activeTopic,
        onSave: async (topics: Topic[], activeTopic: string) => {
          await this.onSave(topics, activeTopic);
          this.close();
        },
        onClose: () => this.close(),
      }),
    );
  }

  onClose() {
    this.root?.unmount();
    this.contentEl.empty();
  }
}
