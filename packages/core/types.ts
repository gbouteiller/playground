import type {z} from "zod";
import {zPost} from "./schemas";

export type Post = z.infer<typeof zPost>;