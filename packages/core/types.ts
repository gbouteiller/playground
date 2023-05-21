import type {z} from "zod";
import {zGithubEntry} from "./to-externalise";

export type Entry = z.infer<typeof zGithubEntry>;