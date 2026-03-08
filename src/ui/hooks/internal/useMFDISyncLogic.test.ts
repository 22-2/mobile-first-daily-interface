import { describe, expect, test, vi } from "vitest";
import { handleThisWeekSyncOnSubmit } from "./useMFDISyncLogic";

describe("handleThisWeekSyncOnSubmit", () => {
  test("this_week モードで currentDailyNote が null の場合、updatePostsForWeek を呼び出す", async () => {
    const updatePostsForWeek = vi.fn().mockResolvedValue(new Set(["path.md"]));
    const setWeekNotePaths = vi.fn();

    handleThisWeekSyncOnSubmit({
      timeFilter: "this_week",
      currentDailyNote: null,
      activeTopic: "test-topic",
      updatePostsForWeek,
      setWeekNotePaths,
    });

    expect(updatePostsForWeek).toHaveBeenCalledWith("test-topic");

    // Promise の解決を待つ
    await new Promise(process.nextTick);
    expect(setWeekNotePaths).toHaveBeenCalledWith(new Set(["path.md"]));
  });

  test("this_week モードでない場合、何もしない", () => {
    const updatePostsForWeek = vi.fn();
    const setWeekNotePaths = vi.fn();

    handleThisWeekSyncOnSubmit({
      timeFilter: "all",
      currentDailyNote: null,
      activeTopic: "test-topic",
      updatePostsForWeek,
      setWeekNotePaths,
    });

    expect(updatePostsForWeek).not.toHaveBeenCalled();
  });

  test("currentDailyNote が既に存在する場合、何もしない", () => {
    const updatePostsForWeek = vi.fn();
    const setWeekNotePaths = vi.fn();

    handleThisWeekSyncOnSubmit({
      timeFilter: "this_week",
      currentDailyNote: { path: "existing.md" } as any,
      activeTopic: "test-topic",
      updatePostsForWeek,
      setWeekNotePaths,
    });

    expect(updatePostsForWeek).not.toHaveBeenCalled();
  });
});
