// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import moment from "moment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteTimeline } from "./useInfiniteTimeline";

const useInfiniteQueryMock = vi.fn();
const createTimelinePageFetcherMock = vi.fn();
const fetchPageMock = vi.fn();
const addPathsMock = vi.fn();
const setPostsMock = vi.fn();
const setDateMock = vi.fn();
const loadFileMock = vi.fn(async (_path: string) => "");
const cachedReadFileMock = vi.fn(async () => "");

const settingsState = {
  activeTopic: "topic-a",
  displayMode: "timeline",
  date: moment("2026-03-15T00:00:00.000Z"),
  setDate: setDateMock,
  getEffectiveDate: () => settingsState.date.clone(),
};

vi.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: (...args: unknown[]) => useInfiniteQueryMock(...args),
}));

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: () => ({
    shell: {
      loadFile: loadFileMock,
      cachedReadFile: cachedReadFileMock,
    },
  }),
  useObsidianApp: () => ({}) ,
}));

vi.mock("src/ui/store/settingsStore", () => ({
  settingsStore: {
    getState: () => settingsState,
  },
  useSettingsStore: (selector: (state: typeof settingsState) => unknown) =>
    selector(settingsState),
}));

vi.mock("src/ui/store/postsStore", () => ({
  usePostsStore: (
    selector: (state: { setPosts: typeof setPostsMock }) => unknown,
  ) => selector({ setPosts: setPostsMock }),
}));

vi.mock("src/ui/store/noteStore", () => ({
  useNoteStore: (
    selector: (state: { addPaths: typeof addPathsMock }) => unknown,
  ) => selector({ addPaths: addPathsMock }),
}));

vi.mock("src/ui/utils/view-mode", () => ({
  isTimelineView: (mode: string) => mode === "timeline",
}));

vi.mock("./timelinePosts", () => ({
  TIMELINE_CACHE_INVALIDATE_MS: 3 * 60 * 1000,
  resolveTimelineCacheBucket: vi.fn(() => 123),
  resolveTimelineBaseDate: vi.fn(
    (pageParam: string | null, getEffectiveDate: () => moment.Moment) =>
      pageParam ? moment(pageParam) : getEffectiveDate(),
  ),
  createTimelinePageFetcher: (...args: unknown[]) =>
    createTimelinePageFetcherMock(...args),
}));

describe("useInfiniteTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    settingsState.activeTopic = "topic-a";
    settingsState.displayMode = "timeline";
    settingsState.date = moment("2026-03-15T00:00:00.000Z");

    fetchPageMock.mockResolvedValue({
      posts: [],
      paths: new Set<string>(),
      hasMore: false,
      lastSearchedDate: moment("2026-03-15T00:00:00.000Z"),
    });
    createTimelinePageFetcherMock.mockReturnValue(fetchPageMock);

    useInfiniteQueryMock.mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queryKey に日付キーを含め、日付跨ぎでクエリが切り替わる", () => {
    const { rerender } = renderHook(() => useInfiniteTimeline());

    const firstOptions = useInfiniteQueryMock.mock.calls[0][0];
    expect(firstOptions.queryKey).toEqual([
      "posts",
      "topic-a",
      "timeline",
      "123",
      "2026-03-15",
    ]);

    settingsState.date = moment("2026-03-16T00:00:00.000Z");
    rerender();

    const secondOptions = useInfiniteQueryMock.mock.calls[1][0];
    expect(secondOptions.queryKey).toEqual([
      "posts",
      "topic-a",
      "timeline",
      "123",
      "2026-03-16",
    ]);
  });

  it("タイムライン取得は cachedReadFile ではなく loadFile を使う", async () => {
    renderHook(() => useInfiniteTimeline());

    const deps = createTimelinePageFetcherMock.mock.calls[0][0];
    await deps.readFile({ path: "2026-03-15.md" });

    expect(loadFileMock).toHaveBeenCalledWith("2026-03-15.md");
    expect(cachedReadFileMock).not.toHaveBeenCalled();
  });

  it("タイムライン表示中に日付が変わったら setDate を呼ぶ", () => {
    settingsState.date = moment("2026-03-15T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-03-16T00:01:00.000Z"));

    renderHook(() => useInfiniteTimeline());

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(setDateMock).toHaveBeenCalledTimes(1);
    const calledMoment = setDateMock.mock.calls[0][0];
    expect(calledMoment.isSame(moment("2026-03-16T00:01:00.000Z"), "day")).toBe(
      true,
    );
  });
});
