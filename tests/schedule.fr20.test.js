import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { generateSchedule } from "../src/modules/schedules/schedules.generator.js";
import { intervalsOverlap } from "../src/lib/time.js";

describe("QA Schedule FR-20 Validation", () => {
    // Тестовий контекст: 3 групи, 5 гуртків, достатня кількість викладачів
    const groups = [
        { id: 1, roomId: 101 },
        { id: 2, roomId: 102 },
        { id: 3, roomId: 103 },
    ];

    const subjects = [
        { id: 1, name: "Малювання" },
        { id: 2, name: "Музика" },
        { id: 3, name: "Англійська мова" },
        { id: 4, name: "Хореографія" },
        { id: 5, name: "Робототехніка" },
    ];

    const teachers = [
        { id: 1, subjectIds: [1, 2] },
        { id: 2, subjectIds: [2, 3] },
        { id: 3, subjectIds: [3, 4] },
        { id: 4, subjectIds: [4, 5] },
        { id: 5, subjectIds: [1, 5] },
    ];

    const { lessons, unscheduled } = generateSchedule({
        groups,
        subjects,
        teachers,
    });

    it("FR-20: all 5 subjects are scheduled for each group without unscheduled entries", () => {
        assert.strictEqual(
            unscheduled.length,
            0,
            `All lessons must be scheduled. Unscheduled: ${JSON.stringify(unscheduled)}`
        );

        for (const group of groups) {
            const groupLessons = lessons.filter((l) => l.groupId === group.id);
            const scheduledSubjectIds = new Set(groupLessons.map((l) => l.subjectId));

            assert.strictEqual(
                scheduledSubjectIds.size,
                5,
                `Group ${group.id} must have all 5 unique subjects scheduled`
            );

            for (const subject of subjects) {
                assert.ok(
                    scheduledSubjectIds.has(subject.id),
                    `Group ${group.id} must have subject ${subject.id} (${subject.name})`
                );
            }
        }
    });

    it("FR-20: no group has more than 2 lessons per day", () => {
        const countsByGroupAndDay = new Map();

        for (const lesson of lessons) {
            const key = `${lesson.groupId}_${lesson.day}`;
            const count = (countsByGroupAndDay.get(key) || 0) + 1;
            countsByGroupAndDay.set(key, count);

            assert.ok(
                count <= 2,
                `Group ${lesson.groupId} has ${count} lessons on day ${lesson.day} (max 2 allowed)`
            );
        }
    });

    it("FR-20: no schedule overlaps for teachers, groups, or rooms", () => {
        for (let i = 0; i < lessons.length; i += 1) {
            for (let j = i + 1; j < lessons.length; j += 1) {
                const l1 = lessons[i];
                const l2 = lessons[j];

                if (l1.day !== l2.day) continue;

                const overlaps = intervalsOverlap(
                    l1.startTime,
                    l1.endTime,
                    l2.startTime,
                    l2.endTime
                );

                if (overlaps) {
                    assert.notStrictEqual(
                        l1.teacherId,
                        l2.teacherId,
                        `Teacher conflict on day ${l1.day}: teacher ${l1.teacherId} in lessons ${l1.id} & ${l2.id}`
                    );
                    assert.notStrictEqual(
                        l1.groupId,
                        l2.groupId,
                        `Group conflict on day ${l1.day}: group ${l1.groupId} has simultaneous lessons ${l1.id} & ${l2.id}`
                    );
                    assert.notStrictEqual(
                        l1.roomId,
                        l2.roomId,
                        `Room conflict on day ${l1.day}: room ${l1.roomId} is double-booked in lessons ${l1.id} & ${l2.id}`
                    );
                }
            }
        }
    });
});