import {zIndexSectionData, zMedia, zPageAboutData, zPageDisclaimerData, zPageGeneralData, zPageOriginalsData, zSize, zType} from '@pg/core';
import {defineCollection, reference, z} from 'astro:content';

export const zAboutSectionsData = z.object({
  image: reference('images'),
  title: z.string().optional(),
});

export const zCommissionsData = z.object({
  title: z.string(),
});

export const zImagesData = z.object({
  alt: z.string(),
  height: zSize,
  src: z.string(),
  width: zSize,
});

export const zSetsData = z.object({
  image: reference('images'),
  title: z.string(),
});

export const zWorksData = z.object({
  date: z.coerce.date(),
  height: z.number().int().min(0),
  image: reference('images'),
  media: zMedia.array().min(0),
  stripe: z.string().optional(),
  thumbnail: reference('images').optional(),
  title: z.string(),
  type: zType,
  width: z.number().int().min(0),
});

export const collections = {
  'about-sections': defineCollection({type: 'content', schema: zAboutSectionsData}),
  commissions: defineCollection({type: 'content', schema: zCommissionsData}),
  images: defineCollection({type: 'data', schema: zImagesData}),
  'index-sections': defineCollection({type: 'content', schema: zIndexSectionData}),
  pages: defineCollection({type: 'content', schema: z.union([zPageAboutData, zPageDisclaimerData, zPageGeneralData, zPageOriginalsData])}),
  sets: defineCollection({type: 'content', schema: zSetsData}),
  works: defineCollection({type: 'data', schema: zWorksData}),
};
