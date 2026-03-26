import { FC, useMemo } from "react";
import { useFilteredPosts } from "src/ui/hooks/useFilteredPosts";
import { usePostsStore } from "src/ui/store/postsStore";
import { useSettingsStore } from "src/ui/store/settingsStore";
import { isArchived, isDeleted } from "src/ui/utils/post-metadata";
import { countVisibleRootPosts } from "src/ui/utils/thread-utils";
import { isTimelineView } from "src/ui/utils/view-mode";
import { getFixedNoteTitle } from "src/ui/view/state";
import { useShallow } from "zustand/shallow";

export const ResultCount: FC = () => {
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
        })),
    );
    const postsState = usePostsStore(
        useShallow((s) => ({
            posts: s.posts,
            tasks: s.tasks,
        })),
    );
    const filteredPosts = useFilteredPosts({
        posts: postsState.posts,
        ...settings,
    });
    const {
        granularity,
        asTask,
        dateFilter,
        timeFilter,
        displayMode,
        viewNoteMode,
        fixedNotePath,
    } = settings;
    const { posts, tasks } = postsState;

    const tasksCount = tasks.length;
    const filteredPostsCount = filteredPosts.length;
    const allPostsCount = useMemo(() => countVisibleRootPosts(
        posts.filter(
            (post) => !isArchived(post.metadata) && !isDeleted(post.metadata),
        ),
    ), [posts]);

    const showTotal =
        (dateFilter === "today" && timeFilter !== "all" && granularity === "day") ||
        isTimelineView(displayMode);
    const totalPart = showTotal ? `/${allPostsCount}` : "";

    if (viewNoteMode === "fixed") {
        return (
            <>
                {asTask
                    ? `${tasksCount} tasks in ${getFixedNoteTitle(fixedNotePath)}`
                    : `${filteredPostsCount} posts in ${getFixedNoteTitle(fixedNotePath)}`}
            </>
        );
    }

    return (
        <>
            {asTask
                ? `${tasksCount} tasks`
                : `${filteredPostsCount}${totalPart} posts`}
        </>
    );
};
