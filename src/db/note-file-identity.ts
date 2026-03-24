import { TFile } from "obsidian";
import { Topic } from "src/topic";
import { Granularity, MomentLike } from "src/ui/types";
import { getDateFromFilename } from "src/utils/daily-notes/utils";

const GRANULARITIES: Granularity[] = ["day", "week", "month", "year"];

export interface NoteFileIdentity {
  topicId: string;
  granularity: Granularity;
  noteDate: MomentLike;
}

function normalizeTopicIds(
  topics: Array<Pick<Topic, "id">> | string[],
): string[] {
  const topicIds = topics.map((topic) =>
    typeof topic === "string" ? topic : topic.id,
  );
  return [...new Set(topicIds)];
}

export function inferNoteIdentityFromFilename(
  filename: string,
  topics: Array<Pick<Topic, "id">> | string[],
): NoteFileIdentity | null {
  const matches: NoteFileIdentity[] = [];

  for (const topicId of normalizeTopicIds(topics)) {
    for (const granularity of GRANULARITIES) {
      const noteDate = getDateFromFilename(filename, granularity, topicId);
      if (!noteDate) {
        continue;
      }

      matches.push({ topicId, granularity, noteDate });
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

export function inferNoteIdentityFromFile(
  file: Pick<TFile, "basename">,
  topics: Array<Pick<Topic, "id">> | string[],
): NoteFileIdentity | null {
  return inferNoteIdentityFromFilename(file.basename, topics);
}

export { GRANULARITIES };
