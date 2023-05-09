import {z} from 'zod';
import {zAstroEntry} from './to-externalise';

export const zPostData = z.object({
  createdAt: z.date(),
  published: z.boolean(),
  title: z.string(),
  updatedAt: z.date(),
});

export const zPost = zAstroEntry.extend({data: zPostData});
