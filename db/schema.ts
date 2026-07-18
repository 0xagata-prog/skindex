import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const themes = sqliteTable("themes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  author: text("author").notNull(),
  authorUrl: text("author_url").notNull(),
  platform: text("platform").notNull(),
  mode: text("mode").notNull(),
  description: text("description").notNull(),
  tags: text("tags").notNull(),
  palette: text("palette").notNull(),
  previewUrl: text("preview_url").notNull(),
  sourceUrl: text("source_url").notNull(),
  downloadUrl: text("download_url").notNull(),
  sourceName: text("source_name").notNull(),
  sourceRepo: text("source_repo").notNull(),
  stars: integer("stars").notNull().default(0),
  license: text("license").notNull().default("未声明"),
  verifiedVersion: text("verified_version").notNull().default("来源已核验"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("approved"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  themeName: text("theme_name").notNull(),
  authorName: text("author_name").notNull(),
  repoUrl: text("repo_url").notNull().unique(),
  platform: text("platform").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const themeProposals = sqliteTable("theme_proposals", {
  id: text("id").primaryKey(),
  themeName: text("theme_name").notNull(),
  authorName: text("author_name").notNull(),
  platform: text("platform").notNull(),
  notes: text("notes").notNull().default(""),
  palette: text("palette").notNull(),
  previewKey: text("preview_key").notNull(),
  previewMime: text("preview_mime").notNull(),
  sourceType: text("source_type").notNull().default("skill-generated"),
  consentAt: text("consent_at").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const themeRevisions = sqliteTable("theme_revisions", {
  id: text("id").primaryKey(),
  themeId: text("theme_id").notNull(),
  action: text("action").notNull(),
  snapshot: text("snapshot").notNull(),
  editorEmail: text("editor_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("theme_revisions_theme_idx").on(table.themeId, table.createdAt)]);
