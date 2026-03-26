import { Menu } from "obsidian";
import { FC } from "react";
import { UnderlinedClickable } from "src/ui/components/UnderlinedClickable";
import { useAppContext } from "src/ui/context/AppContext";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { useShallow } from "zustand/shallow";

export const TopicDisplay: FC = () => {
    const { settings } = useAppContext();
    const {
        activeTopic,
        setActiveTopic: onTopicChange,
        viewNoteMode,
    } = useSettingsStore(
        useShallow((s) => ({
            activeTopic: s.activeTopic,
            setActiveTopic: s.setActiveTopic,
            viewNoteMode: s.viewNoteMode,
        })),
    );

    if (viewNoteMode === "fixed") return null;

    const activeTopicName = settings.topics.find(
        (t) => t.id === activeTopic,
    )?.title;
    const topics = settings.topics;

    if (!activeTopicName) return null;

    return (
        <>
            {" in "}
            <UnderlinedClickable
                onClick={(e: React.MouseEvent) => {
                    if (!topics || !onTopicChange) return;
                    e.preventDefault();
                    const menu = new Menu();
                    menu.addSeparator();
                    menu.addItem((item) => {
                        item.setTitle("トピック").setIcon("tag").setDisabled(true);
                    });
                    topics
                        .filter((t) => !t.archived)
                        .forEach((topic) => {
                            menu.addItem((item) =>
                                item
                                    .setTitle(topic.title)
                                    .setChecked(topic.title === activeTopicName)
                                    .onClick(() => onTopicChange(topic.id)),
                            );
                        });
                    menu.showAtMouseEvent(e as unknown as MouseEvent);
                }}
            >
                {activeTopicName}
            </UnderlinedClickable>
        </>
    );
};
