// src/run.ts
import { Client } from "@notionhq/client";
import matter from "gray-matter";
import fs from "node:fs/promises";
import path from "node:path";
import { NotionToMarkdown } from "notion-to-md";
import { z } from "zod";
async function writeFiles(files) {
  return Promise.all(
    files.map(async ({ content, path: p }) => {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, content, "utf8");
    })
  );
}
function isChildDatabaseBlock(block) {
  return block.type === "child_database";
}
async function run({ contentPath, logger = console, notionPageId, notionSecret }) {
  const notion = new Client({ auth: notionSecret });
  const n2m = new NotionToMarkdown({ notionClient: notion });
  async function fetchCollections() {
    const blockId = z.string().parse(notionPageId);
    const data = await notion.blocks.children.list({ block_id: blockId });
    const list = zBlockChildrenList.parse(data);
    return list.results.filter(isChildDatabaseBlock);
  }
  async function fetchItems(collections2) {
    const items2 = await Promise.all(
      collections2.map((collection) => notion.databases.query({ database_id: collection.id }).then(({ results }) => ({ collection, results })))
    );
    return items2.flatMap(({ collection, results }) => results.map((item) => ({ ...item, collection })));
  }
  async function fileFrom({ collection: { kind, slug: collection }, id, properties }) {
    const allData = await Promise.all(Object.entries(properties).map(async ([key, value]) => [key, await valueFrom(value)]));
    const { slug, ...data } = Object.fromEntries(allData.filter(([_, value]) => value !== void 0));
    if (kind === "data")
      return { content: JSON.stringify(data, void 0, 2), path: `${contentPath}/${collection}/${slug}.json` };
    const path2 = `${contentPath}/${collection}/${slug}.md`;
    const bodyBlocks = await n2m.pageToMarkdown(id);
    const body = n2m.toMarkdownString(bodyBlocks);
    const content = Buffer.from(matter.stringify(body.parent, data)).toString();
    return { content, path: path2 };
  }
  async function processItems(items2) {
    return Promise.all(items2.map((item) => fileFrom(item)));
  }
  async function valueFrom({ type, ...r }) {
    if (type === "files" && r.files.length === 1)
      return r.files[0].file.url;
    if (type === "rich_text" && r.rich_text.length === 1)
      return r.rich_text[0].plain_text;
    if (type === "title" && r.title.length === 1)
      return r.title[0].plain_text;
    if (type === "relation" && r.relation.length === 1) {
      const { properties } = await notion.pages.retrieve({ page_id: r.relation[0].id });
      return valueFrom(properties.slug);
    }
    if (type !== "formula")
      return r[type];
  }
  logger.info("Fetching collections...");
  const collections = await fetchCollections();
  logger.info(`Found ${collections.length} collections, fetching items...`);
  const items = await fetchItems(collections);
  logger.info(`Found ${items.length} items, processing items...`);
  const files = await processItems(items);
  logger.info("Items processed, writing files...");
  await writeFiles(files);
  logger.info("Files written succesfully!");
}
var zBlockAny = z.object({
  id: z.string(),
  type: z.string()
});
var zBlockChildDatabase = zBlockAny.extend({ type: z.literal("child_database"), child_database: z.object({ title: z.string() }) }).transform(({ child_database, id, type }) => {
  const [kind, slug] = child_database.title.split(":");
  return { kind, id, slug, type };
});
var zBlock = zBlockChildDatabase.or(zBlockAny);
var zBlockChildrenList = z.object({ results: z.array(zBlock) });
var zCollection = z.object({
  id: z.string(),
  kind: z.enum(["content", "data"]),
  slug: z.string(),
  type: z.string()
});
var zFile = z.object({
  content: z.string(),
  path: z.string()
});
var zRunOpts = z.object({
  contentPath: z.string(),
  logger: z.object({ info: z.function().args(z.string()) }).optional(),
  notionPageId: z.string(),
  notionSecret: z.string()
});
var zItem = z.object({
  collection: zCollection,
  id: z.string(),
  properties: z.any()
});

export {
  run
};
