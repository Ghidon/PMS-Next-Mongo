import { Schema, model, models, type Model, type InferSchemaType, type Types } from "mongoose";

const subTaskSchema = new Schema({
  taskId: { type: String },
  creator: { type: String },
  name: { type: String },
  title: { type: String },
  description: { type: String },
  active: { type: Boolean, default: true },
  status: { type: String },
  assigned: { type: String },
  dueDate: { type: Date },
  attachedFiles: [{ type: String }],
  allowedUsers: [{ type: String }],
  priority: { type: String },
  createdAt: { type: Date, default: () => new Date() }
});

type SubTaskSchemaType = InferSchemaType<typeof subTaskSchema>;
export type SubTaskContent = SubTaskSchemaType & { _id: Types.ObjectId };

const SubTaskContentModel: Model<SubTaskContent> =
  (models.SubTaskContent as Model<SubTaskContent>) ||
  model<SubTaskContent>("SubTaskContent", subTaskSchema, "subtaskcontents");

export default SubTaskContentModel;
