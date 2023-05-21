import {
  run
} from "./chunk-DOYLFRCE.js";

// src/action.ts
import * as core from "@actions/core";
import * as github from "@actions/github";
core.info(`context event: ${github.context.eventName}`);
core.info(`context action: ${github.context.action}`);
core.info(`payload action: ${github.context.payload.action}`);
try {
  run({
    contentPath: core.getInput("CONTENT_PATH", { required: true }),
    logger: core,
    notionPageId: core.getInput("NOTION_PAGE_ID", { required: true }),
    notionSecret: core.getInput("NOTION_SECRET", { required: true })
  });
} catch (error) {
  console.error(error);
  core.setFailed(error.message);
}
