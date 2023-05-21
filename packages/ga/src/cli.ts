import * as dotenv from 'dotenv';
import {run} from './run';

dotenv.config();

console.time('run');
try {
  run({
    contentPath: process.env.CONTENT_PATH,
    notionPageId: process.env.NOTION_PAGE_ID,
    notionSecret: process.env.NOTION_SECRET,
  });
} catch (error) {
  console.error(error);
}
console.timeEnd('run');
