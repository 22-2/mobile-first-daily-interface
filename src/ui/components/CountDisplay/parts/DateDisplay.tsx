import { Box } from "@chakra-ui/react";
import { Menu } from "obsidian";
import { FC, useEffect, useMemo, useState } from "react";
import { UnderlinedClickable } from "src/ui/components/UnderlinedClickable";
import { GRANULARITY_CONFIG } from "src/ui/config/granularity-config";
import { addGranularityMenuItems } from "src/ui/menus/granularityMenu";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getMFDIViewCapabilities } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

const useGranularityMenu = () => {
    const { granularity, setGranularity } = useSettingsStore(
        useShallow((s) => ({
            granularity: s.granularity,
            setGranularity: s.setGranularity,
        })),
    );

    return (e: React.MouseEvent) => {
        if (!setGranularity) return;
        e.preventDefault();
        const menu = new Menu();
        addGranularityMenuItems(menu, granularity, (g) => setGranularity(g));
        menu.showAtMouseEvent(e as unknown as MouseEvent);
    };
};

const useFilterMenu = () => {
    const state = useSettingsStore(
        useShallow((s) => ({
            granularity: s.granularity,
            date: s.date,
            timeFilter: s.timeFilter,
            dateFilter: s.dateFilter,
            displayMode: s.displayMode,
            asTask: s.asTask,
            activeTopic: s.activeTopic,
            setTimeFilter: s.setTimeFilter,
            setDateFilter: s.setDateFilter,
        })),
    );
    const { setTimeFilter, setDateFilter } = state;

    return (e: React.MouseEvent) => {
        e.preventDefault();
        const menu = new Menu();
        addPeriodMenuItems(menu, state, {
            onChangeTimeFilter: (f) => setTimeFilter?.(f),
            onChangeDateFilter: (f) => setDateFilter?.(f),
        });
        menu.showAtMouseEvent(e as unknown as MouseEvent);
    };
};

export const DateDisplay: FC = () => {
    const { date, granularity, dateFilter, displayMode, viewNoteMode } =
        useSettingsStore(
            useShallow((s) => ({
                date: s.date,
                granularity: s.granularity,
                dateFilter: s.dateFilter,
                displayMode: s.displayMode,
                viewNoteMode: s.viewNoteMode,
            })),
        );
    const onClick = useFilterMenu();
    const onContextMenu = useGranularityMenu();
    const isFixedNote = viewNoteMode === "fixed";
    const [currentTime, setCurrentTime] = useState(() => window.moment());
    const capabilities = useMemo(
        () => getMFDIViewCapabilities({ noteMode: viewNoteMode }),
        [viewNoteMode],
    );

    useEffect(() => {
        if (!isFixedNote) return;

        const timer = window.setInterval(() => {
            setCurrentTime(window.moment());
        }, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, [isFixedNote]);

    if (
        isTimelineView(displayMode) ||
        (!capabilities.supportsDateNavigation && !capabilities.supportsPeriodMenus)
    )
        return null;

    const dateLabel = useMemo(() => {
        // fixedノートでは選択日ではなく「いま」を基準に絞るため、見出しも現在日時を表示する。
        if (isFixedNote) {
            return currentTime.format("YYYY-MM-DD HH:mm");
        }

        if (granularity !== "day" || dateFilter === "today") {
            return date.format(GRANULARITY_CONFIG[granularity].displayFormat);
        }

        const format = GRANULARITY_CONFIG.day.displayFormat;
        if (dateFilter === "this_week") {
            const start = date.clone().startOf("isoWeek");
            const end = date.clone().endOf("isoWeek");
            return `${start.format(format)} - ${end.format(format)}`;
        }

        const days = parseInt(dateFilter);
        if (!isNaN(days)) {
            const start = date.clone().subtract(days - 1, "days");
            const end = date.clone();
            return `${start.format(format)} - ${end.format(format)}`;
        }
        return date.format(GRANULARITY_CONFIG[granularity].displayFormat);
    }, [currentTime, date, granularity, dateFilter, isFixedNote]);

    return (
        <Box>
            <UnderlinedClickable
                onClick={onClick}
                onContextMenu={
                    capabilities.supportsDateNavigation ? onContextMenu : undefined
                }
            >
                {dateLabel}
            </UnderlinedClickable>
        </Box>
    );
};
