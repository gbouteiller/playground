declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly CONTENT_PATH: string;
      readonly NOTION_PAGE_ID: string;
      readonly NOTION_SECRET: string;
    }
  }
}

export default undefined;