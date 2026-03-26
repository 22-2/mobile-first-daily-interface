import { useLiveQuery } from "dexie-react-hooks";
import { FC, useMemo } from "react";
import { MFDIDatabase } from "src/db/mfdi-db";
import { useAppContext } from "src/ui/context/AppContext";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isArchived, isDeleted } from "src/ui/utils/post-metadata";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

// ---- ヘルパー関数 ----

const queryMemoCount = (
    db: MFDIDatabase,
    activeTopic: string | undefined,
): Promise<number> => {
    if (activeTopic) {
        return db.memos
            .where("[topicId+archived+deleted]")
            .equals([activeTopic, false, false] as any)
            .count();
    }
    return db.memos
        .where("[archived+deleted]")
        .equals([false, false] as any)
        .count();
};

const formatCount = (
    count: number,
    total: string,
    asTask: boolean,
): string => (asTask ? `${count} tasks` : `${count}${total} posts`);

const formatFixedCount = (
    count: number,
    noteTitle: string,
    asTask: boolean,
): string =>
    asTask
        ? `${count} tasks in ${noteTitle}`
        : `${count} posts in ${noteTitle}`;

// ---- カスタムフック ----

const useResultCountState = () => {
    const settings = useSettingsStore(
        useShallow((s) => ({
            granularity: s.granularity,
            asTask: s.asTask,
            dateFilter: s.dateFilter,
            timeFilter: s.timeFilter,
            displayMode: s.displayMode,
            threadFocusRootId: s.threadFocusRootId,
            viewNoteMode: s.viewNoteMode,
            fixedNotePath: s.fixedNotePath,
            activeTopic: s.activeTopic,
        })),
    );
    const postsState = usePostsStore(
        useShallow((s) => ({ posts: s.posts, tasks: s.tasks })),
    );
    return { settings, postsState };
};

// ---- コンポーネント ----

export const ResultCount: FC = () => {
    const { settings, postsState } = useResultCountState();
    const {
        granularity,
        asTask,
        dateFilter,
        timeFilter,
        displayMode,
        viewNoteMode,
        fixedNotePath,
        activeTopic,
    } = settings;
    const { posts, tasks } = postsState;

    const filteredPosts = useFilteredPosts({ posts, ...settings });

    const { shell } = useAppContext();
    const db = useMemo(() => new MFDIDatabase(shell.getAppId()), [shell]);

    const dbTotalCount = useLiveQuery(
        () => queryMemoCount(db, activeTopic),
        [db, activeTopic],
    );

    const allPostsCount = useMemo(() => {
        if (isTimelineView(displayMode) && typeof dbTotalCount === "number") {
            return dbTotalCount;
        }
        return countVisibleRootPosts(
            posts.filter(
                (post) => !isArchived(post.metadata) && !isDeleted(post.metadata),
            ),
        );
    }, [posts, displayMode, dbTotalCount]);

    const showTotal =
        (dateFilter === "today" && timeFilter !== "all" && granularity === "day") ||
        isTimelineView(displayMode);
    const totalPart = showTotal ? `/${allPostsCount}` : "";

    if (viewNoteMode === "fixed") {
        return (
            <>{formatFixedCount(asTask ? tasks.length : filteredPosts.length, getFixedNoteTitle(fixedNotePath), asTask)}</>
        );
    }

    return (
        <>{formatCount(asTask ? tasks.length : filteredPosts.length, totalPart, asTask)}</>
    );
};
