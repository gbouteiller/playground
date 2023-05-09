import {zPostData} from '@pg/core';
import {defineCollection} from 'astro:content';

export const collections = {
  posts: defineCollection({schema: zPostData}),
};
