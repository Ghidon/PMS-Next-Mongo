// models/TaskContent.ts
import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  type Types,
  type HydratedDocument,
  type UpdateQuery,
  type Query,
} from "mongoose";

const taskSchema = new Schema(
  {
    projectId: { type: String },
    creator: { type: String },
    name: { type: String },
    title: { type: String },
    description: { type: String },
    active: { type: Boolean, default: true },
    status: { type: String }, // legacy-friendly; normalized in hooks
    assigned: { type: String, default: "Unassigned" },
    dueDate: { type: Date },
    attachedFiles: [{ type: String }],
    allowedUsers: [{ type: String }],
    priority: { type: String },
    // createdAt is managed by timestamps
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// ---------- Helpers (typed, no `any`) ----------
function normalizeStatus(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return value ?? undefined;
  return value.trim().toLowerCase() === "stuck" ? "Blocked" : value;
}

function normalizeAssigned(value: string | undefined | null): string {
  const v = typeof value === "string" ? value.trim() : "";
  return v.length === 0 ? "Unassigned" : v;
}

function normalizeUpdateObject(
  update: UpdateQuery<TaskContent> | undefined
): void {
  if (!update) return;

  // Prefer $set if present, otherwise root-level keys
  const setObj = ("$set" in update && update.$set ? update.$set : undefined) as
    | Partial<TaskContent>
    | undefined;

  // STATUS
  const rawStatus =
    (setObj?.status as string | undefined) ??
    ((update as Partial<TaskContent>).status as string | undefined);

  const normalizedStatus = normalizeStatus(rawStatus);
  if (normalizedStatus !== undefined && normalizedStatus !== rawStatus) {
    if ("$set" in update && update.$set) {
      (update.$set as Partial<TaskContent>).status = normalizedStatus;
    } else {
      (update as Partial<TaskContent>).status = normalizedStatus;
    }
  }

  // ASSIGNED
  if (
    (setObj && Object.prototype.hasOwnProperty.call(setObj, "assigned")) ||
    Object.prototype.hasOwnProperty.call(update, "assigned")
  ) {
    const rawAssigned =
      (setObj?.assigned as string | undefined) ??
      ((update as Partial<TaskContent>).assigned as string | undefined);

    const normalizedAssigned = normalizeAssigned(rawAssigned);
    if ("$set" in update && update.$set) {
      (update.$set as Partial<TaskContent>).assigned = normalizedAssigned;
    } else {
      (update as Partial<TaskContent>).assigned = normalizedAssigned;
    }
  }
}

// ---------- Hooks (typed) ----------
taskSchema.pre("save", function (this: HydratedDocument<TaskContent>, next) {
  this.status = normalizeStatus(this.status) ?? this.status;
  this.assigned = normalizeAssigned(this.assigned);
  next();
});

taskSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (this: Query<unknown, TaskContent, object, TaskContent>, next) {
    const update = this.getUpdate() as UpdateQuery<TaskContent> | undefined;
    normalizeUpdateObject(update);
    next();
  }
);

// ---------- Indexes ----------
taskSchema.index({
  projectId: 1,
  status: 1,
  assigned: 1,
  dueDate: 1,
  updatedAt: -1,
  createdAt: -1,
});

type TaskSchemaType = InferSchemaType<typeof taskSchema>;
export type TaskContent = TaskSchemaType & { _id: Types.ObjectId };

const TaskContentModel: Model<TaskContent> =
  (models.TaskContent as Model<TaskContent>) ||
  model<TaskContent>("TaskContent", taskSchema, "taskcontents");

export default TaskContentModel;
