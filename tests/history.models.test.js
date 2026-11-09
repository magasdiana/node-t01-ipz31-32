import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
    historyEntrySchema,
    buildHistoryEntry,
    maskSensitive,
} from "../src/lib/historySchema.js";

describe("QA History Models & Schema Validation (FR-34 - FR-36, T2-T4)", () => {
    it("T3: HistoryEntry table has only id (PK) and data (Json) fields", () => {
        const historyModel = Prisma.dmmf.datamodel.models.find(
            (m) => m.name === "HistoryEntry"
        );

        assert.ok(historyModel, "HistoryEntry model must be defined in Prisma schema");
        assert.strictEqual(
            historyModel.fields.length,
            2,
            "HistoryEntry model must contain strictly 2 fields: id and data"
        );

        const idField = historyModel.fields.find((f) => f.name === "id");
        assert.ok(idField, "HistoryEntry must have an id field");
        assert.strictEqual(idField.isId, true, "id must be primary key");

        const dataField = historyModel.fields.find((f) => f.name === "data");
        assert.ok(dataField, "HistoryEntry must have a data field");
        assert.strictEqual(dataField.type, "Json", "data field must be Json type");
    });

    it("FR-34: all audited models in datamodel are eligible for audit logging", () => {
        const models = Prisma.dmmf.datamodel.models;
        const auditedModels = models.filter((m) => m.name !== "HistoryEntry");

        const expectedAudited = [
            "Room",
            "Group",
            "Child",
            "Staff",
            "Subject",
            "StaffSubject",
            "Lesson",
            "Payment",
            "PriceSettings",
            "PriceHistory",
        ];

        for (const name of expectedAudited) {
            const exists = auditedModels.some((m) => m.name === name);
            assert.ok(exists, `Model ${name} must be present in Prisma datamodel for audit`);
        }

        assert.ok(
            auditedModels.length >= 10,
            `Expected at least 10 audited models, found ${auditedModels.length}`
        );
    });

    it("T4 & Zod: valid history entry data passes Zod schema validation", () => {
        const validEntry = {
            entity: "child",
            entityId: 1,
            action: "create",
            changes: {
                before: null,
                after: { id: 1, name: "Іванко" },
            },
            changedFields: [],
            createdAt: new Date().toISOString(),
            requestId: "test-req-123",
            actor: null,
            source: "api",
        };

        const parsed = historyEntrySchema.safeParse(validEntry);
        assert.strictEqual(parsed.success, true, "Valid history entry must pass validation");
    });

    it("T4 & Zod: invalid history entry without mandatory fields is rejected", () => {
        const invalidEntry = {
            entity: "child",
            action: "unknown_action",
        };

        const parsed = historyEntrySchema.safeParse(invalidEntry);
        assert.strictEqual(parsed.success, false, "Invalid history entry must be rejected");
    });

    it("FR-36: maskSensitive hides passwords and tokens in audit snapshots", () => {
        const rawData = {
            id: 5,
            login: "admin",
            passwordHash: "super-secret-hash-123",
            token: "secret-token-xyz",
        };

        const masked = maskSensitive(rawData);
        assert.strictEqual(masked.passwordHash, "***", "passwordHash must be masked");
        assert.strictEqual(masked.token, "***", "token must be masked");
        assert.strictEqual(masked.login, "admin", "regular fields remain intact");
    });
});