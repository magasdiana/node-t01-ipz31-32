function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function findConflicts(candidate, otherLessons, groups = []) {
  const conflicts = [];

  const candidateStart = toMinutes(candidate.start);
  const candidateEnd = candidateStart + candidate.duration;

  const groupById = new Map(groups.map((group) => [group.id, group]));

  for (const lesson of otherLessons) {
    if (lesson.day !== candidate.day) {
      continue;
    }

    const lessonStart = toMinutes(lesson.start);
    const lessonEnd = lessonStart + lesson.duration;

    const overlaps =
      candidateStart < lessonEnd && lessonStart < candidateEnd;

    if (!overlaps) {
      continue;
    }

    if (lesson.staffId === candidate.staffId) {
      conflicts.push({
        type: "teacher",
        lesson,
      });
    }

    if (lesson.groupId === candidate.groupId) {
      conflicts.push({
        type: "group",
        lesson,
      });
    }

    const candidateGroup = groupById.get(candidate.groupId);
    const lessonGroup = groupById.get(lesson.groupId);

    const candidateRoomId = candidate.roomId ?? candidateGroup?.roomId;
    const lessonRoomId = lesson.roomId ?? lessonGroup?.roomId;

    if (
      candidateRoomId != null &&
      lessonRoomId != null &&
      candidateRoomId === lessonRoomId
    ) {
      conflicts.push({
        type: "room",
        lesson,
      });
    }
  }

  return conflicts;
}
