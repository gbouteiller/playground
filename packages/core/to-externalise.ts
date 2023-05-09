import {z} from 'zod';

export const zGithubEntry = z.object({
  body: z.string(),
  collection: z.string(),
  data: z.any(),
  id: z.string(),
  slug: z.string(),
});

export const zAstroEntry = zGithubEntry.omit({id: true}).extend({
  render: z
    .function()
    .args()
    .returns(z.promise(z.object({Content: z.any()}))),
});
