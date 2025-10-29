import {
  Schema,
  model,
  models,
  type Model,
  type Types,
} from "mongoose";

/**
 * Base fields stored on a project.
 * Note: we do NOT declare createdAt/updatedAt here; those come from timestamps.
 */
const projectSchema = new Schema(
  {
    creator: { type: String },
    name: { type: String },
    title: { type: String },
    description: { type: String },
    active: { type: Boolean, default: true },
    selectedFile: { type: String }, // may be base64 or URL depending on your flow
    admins: [{ type: String }],
    managers: [{ type: String }],
    users: [{ type: String }],    
  },
  {
    timestamps: true, // ✅ adds createdAt + updatedAt automatically
  }
);

// (Optional) helpful for “most recent” sorting in lists
projectSchema.index({ updatedAt: -1 });

/** Strong TS type for consumers (includes timestamps) */
export type ProjectContent = {
  _id: Types.ObjectId;
  creator?: string;
  name?: string;
  title?: string;
  description?: string;
  active?: boolean;
  selectedFile?: string;
  admins?: string[];
  managers?: string[];
  users?: string[];
  createdAt: Date;   // from timestamps
  updatedAt: Date;   // from timestamps
};

// Bind to existing collection: "projectcontents"
const ProjectContentModel: Model<ProjectContent> =
  (models.ProjectContent as Model<ProjectContent>) ||
  model<ProjectContent>("ProjectContent", projectSchema, "projectcontents");

export default ProjectContentModel;
