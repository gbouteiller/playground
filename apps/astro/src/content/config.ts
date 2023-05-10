import {
  zAboutSectionData,
  zCollectionData,
  zCommissionData,
  zImageData,
  zIndexSectionData,
  zPageAboutData,
  zPageDisclaimerData,
  zPageGeneralData,
  zPageOriginalsData,
  zWorkData,
} from '@pg/core';
import {defineCollection, z} from 'astro:content';

export const collections = {
  'about-sections': defineCollection({schema: zAboutSectionData}),
  collections: defineCollection({schema: zCollectionData}),
  commissions: defineCollection({schema: zCommissionData}),
  images: defineCollection({schema: zImageData}),
  'index-sections': defineCollection({schema: zIndexSectionData}),
  pages: defineCollection({schema: z.union([zPageAboutData, zPageDisclaimerData, zPageGeneralData, zPageOriginalsData])}),
  works: defineCollection({schema: zWorkData}),
};
