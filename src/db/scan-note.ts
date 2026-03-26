import moment from "moment";
import { MemoRecord } from "src/db/mfdi-db";
import { DATE_FORMAT, DATE_TIME_FORMAT } from "src/ui/config/date-formats";
import { getPostTags, isArchived, isDeleted } from "src/ui/utils/post-metadata";
import { parseThinoEntries } from "src/utils/thino";
import { ScannableNote } from "./worker-api";

function resolveMemoTimestamp(
  noteDate: string,
  time: string,
  metadata: Record<string, string>,
): string {
  if (metadata.posted) {
    const posted = moment(metadata.posted);
    if (posted.isValid()) {
      return posted.toISOString();
    }
  }

  const noteDay = moment(noteDate);
  if (!noteDay.isValid()) {
    return new Date(0).toISOString();
  }

  const parsed = time.includes("-")
    ? moment(time, DATE_TIME_FORMAT, true)
    : moment(`${noteDay.format(DATE_FORMAT)} ${time}`, DATE_TIME_FORMAT, true);

  return parsed.isValid() ? parsed.toISOString() : noteDay.toISOString();
}

export function buildMemoRecordsForNote(file: ScannableNote): MemoRecord[] {
  return parseThinoEntries(file.content).map((entry) => {
    const createdAt = resolveMemoTimestamp(
      file.noteDate,
      entry.time,
      entry.metadata,
    );

    return {
      id: `${file.path}:${entry.startOffset}`,
      path: file.path,
      noteName: file.noteName,
      topicId: file.topicId,
      noteGranularity: file.noteGranularity,
      content: entry.message,
      tags: getPostTags(entry.metadata),
      metadataJson: JSON.stringify(entry.metadata),
      createdAt,
      updatedAt: createdAt,
      archived: isArchived(entry.metadata) ? 1 : 0,
      deleted: isDeleted(entry.metadata) ? 1 : 0,
    };
  });
}
