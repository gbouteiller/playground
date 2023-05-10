import {z} from 'zod';
import {zAstroEntry} from './to-externalise';

// ENUMS ===================================================================================================================================
export const layouts = ['portrait', 'landscape'] as const;
export const zLayout = z.enum(layouts);

export const medias = ['acrylic', 'ink', 'mixedMedia', 'oil', 'watercolor'] as const;
export const zMedia = z.enum(medias);

export const regions = ['reunion', 'mainland'] as const;
export const zRegion = z.enum(regions);

export const types = ['canvas', 'paper'] as const;
export const zType = z.enum(types);

// CORE ====================================================================================================================================
export const zSize = z.number().int().min(0);

// IMAGE ===================================================================================================================================
export const zImageData = z.object({
  alt: z.string(),
  height: zSize,
  src: z.string(),
  width: zSize,
});
export const zImageDto = zAstroEntry.extend({collection: z.literal('images'), data: zImageData});

// ABOUT SECTION ===========================================================================================================================
export const zAboutSectionData = z.object({
  image: z.string(),
  title: z.string().optional(),
});
export const zAboutSectionFlatDto = zAstroEntry.extend({data: zAboutSectionData});

// COLLECTION ==============================================================================================================================
export const zCollectionData = z.object({
  image: z.string(),
  title: z.string(),
});
export const zCollectionFlatDto = zAstroEntry.extend({data: zCollectionData});

// COMMISSION ==============================================================================================================================
export const zCommissionData = z.object({
  title: z.string(),
});
export const zCommissionDto = zAstroEntry.extend({data: zCommissionData});

// FORM ORDER ==============================================================================================================================
export const zFormOrder = z.object({
  animal: z.string().optional(),
  color1: z.string(),
  color2: z.string().optional(),
  color3: z.string().optional(),
  email: z.string().email(),
  forename: z.string(),
  hobbies: z.string().optional(),
  layout: zLayout,
  note: z.string().optional(),
  personality: z.string().optional(),
  region: zRegion,
  phone: z.string().optional(),
  surname: z.string(),
  works: z.string().array().length(2),
});

// FORM REQUEST ============================================================================================================================
export const zFormRequest = z.object({
  email: z.string().email(),
  forename: z.string(),
  message: z.string(),
  surname: z.string(),
});

// PAGE ABOUT ==============================================================================================================================
export const zPageAboutData = z.object({
  sections: z.string().array(),
});
export const zPageAboutDto = zAstroEntry.extend({data: zPageAboutData});

// PAGE DISCLAIMER =========================================================================================================================
export const zPageDisclaimerData = z.object({
  title: z.string(),
});
export const zPageDisclaimerDto = zAstroEntry.extend({data: zPageDisclaimerData});

// PAGE GENERAL ============================================================================================================================
export const zPageGeneralData = z.object({
  contact: z.object({
    email: z.string().email(),
    instagram: z.string(),
    phone: z.string(),
  }),
  logo: z.string(),
});
export const zPageGeneralFlatDto = zAstroEntry.extend({data: zPageGeneralData});

// PAGE INDEX ==============================================================================================================================
export const zIndexSectionAboutData = z.object({
  button: z.string(),
  image: z.string(),
  title: z.string().optional(),
});
export const zIndexSectionAboutFlatDto = zAstroEntry.extend({data: zIndexSectionAboutData});

export const zIndexSectionContactData = z.object({
  button: z.string(),
  quote: z.object({
    author: z.string().optional(),
    text: z.string().optional(),
  }),
  title: z.string().optional(),
});
export const zIndexSectionContactDto = zAstroEntry.extend({data: zIndexSectionContactData});

export const zIndexSectionHeroData = z.object({
  image: z.string(),
  title: z.string().optional(),
});
export const zIndexSectionHeroFlatDto = zAstroEntry.extend({data: zIndexSectionHeroData});

export const zIndexSectionLastWorksData = z.object({
  button: z.string(),
  count: z.number().int().min(0),
  title: z.string().optional(),
});
export const zIndexSectionLastWorksDto = zAstroEntry.extend({data: zIndexSectionLastWorksData});

export const zIndexSectionToOrderData = z.object({
  button: z.string(),
  images: z.string().array(),
  title: z.string().optional(),
});
export const zIndexSectionToOrderFlatDto = zAstroEntry.extend({data: zIndexSectionToOrderData});

export const zIndexSectionData = z.union([
  zIndexSectionAboutData,
  zIndexSectionContactData,
  zIndexSectionHeroData,
  zIndexSectionLastWorksData,
  zIndexSectionToOrderData,
]);

export const zIndexSectionDto = z.union([
  zIndexSectionAboutFlatDto,
  zIndexSectionContactDto,
  zIndexSectionHeroFlatDto,
  zIndexSectionLastWorksDto,
  zIndexSectionToOrderFlatDto,
]);

// PAGE ORIGINALS ==========================================================================================================================
export const zPageOriginalsData = z.object({
  title: z.string(),
});
export const zPageOriginalsDto = zAstroEntry.extend({data: zPageOriginalsData});

// WORK ====================================================================================================================================
export const zWorkData = z.object({
  date: z.coerce.date(),
  height: z.number().int().min(0),
  image: z.string(),
  media: zMedia.array().min(0),
  stripe: z.string().optional(),
  thumbnail: z.string().optional(),
  title: z.string(),
  type: zType,
  width: z.number().int().min(0),
});
export const zWorkFlatDto = zAstroEntry.extend({data: zWorkData});
