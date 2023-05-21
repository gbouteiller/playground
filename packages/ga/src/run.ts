import {Client} from '@notionhq/client';
import type {PageObjectResponse} from '@notionhq/client/build/src/api-endpoints';
import matter from 'gray-matter';
import fs from 'node:fs/promises';
import path from 'node:path';
import {NotionToMarkdown} from 'notion-to-md';
import {z} from 'zod';

function isChildDatabaseBlock(block: z.infer<typeof zBlock>): block is z.infer<typeof zBlockChildDatabase> {
  return block.type === 'child_database';
}

export async function run({contentPath, logger = console, notionPageId, notionSecret}: RunOpts) {
  const notion = new Client({auth: notionSecret});
  const n2m = new NotionToMarkdown({notionClient: notion});

  async function fetchCollections() {
    const blockId = z.string().parse(notionPageId);
    const data = await notion.blocks.children.list({block_id: blockId});
    const list = zBlockChildrenList.parse(data);
    return list.results.filter(isChildDatabaseBlock) as Collection[];
  }

  async function fetchItems(collections: Collection[]) {
    const items = await Promise.all(
      collections.map((collection) => notion.databases.query({database_id: collection.id}).then(({results}) => ({collection, results})))
    );
    return items.flatMap(({collection, results}) => results.map((item) => ({...item, collection})));
  }

  async function fileFrom({collection: {kind, slug: collection}, id, properties}: Item) {
    const allData = await Promise.all(Object.entries(properties).map(async ([key, value]) => [key, await valueFrom(value)]));
    const {slug, ...data} = Object.fromEntries(allData.filter(([_, value]) => value !== undefined));
    if (kind === 'data') return {content: JSON.stringify(data, undefined, 2), path: `${contentPath}/${collection}/${slug}.json`};
    const path = `${contentPath}/${collection}/${slug}.md`;
    const bodyBlocks = await n2m.pageToMarkdown(id);
    const body = n2m.toMarkdownString(bodyBlocks);
    const content = Buffer.from(matter.stringify(body.parent, data)).toString();
    return {content, path};
  }

  async function processItems(items: Item[]) {
    return Promise.all(items.map((item) => fileFrom(item)));
  }

  async function valueFrom({type, ...r}: PageObjectResponse['properties'][1]) {
    if (type === 'files' && r.files.length === 1) return r.files[0].file.url;
    if (type === 'rich_text' && r.rich_text.length === 1) return r.rich_text[0].plain_text;
    if (type === 'title' && r.title.length === 1) return r.title[0].plain_text;
    if (type === 'relation' && r.relation.length === 1) {
      const {properties} = await notion.pages.retrieve({page_id: r.relation[0].id});
      return valueFrom(properties.slug);
    }
    if (type !== 'formula') return r[type];
  }

  async function writeFiles(files: File[]) {
    const entries = await fs.readdir(contentPath, { withFileTypes: true });
    await Promise.all(entries.filter((entry) => entry.isDirectory()).map((dir) => fs.rm(dir.path, {recursive: true, force: true})));
    return Promise.all(
      files.map(async ({content, path: p}) => {
        await fs.mkdir(path.dirname(p), {recursive: true});
        await fs.writeFile(p, content, 'utf8');
      })
    );
  }

  logger.info('Fetching collections...');
  const collections = await fetchCollections();
  logger.info(`Found ${collections.length} collections, fetching items...`);
  const items = await fetchItems(collections);
  logger.info(`Found ${items.length} items, processing items...`);
  const files = await processItems(items);
  logger.info('Items processed, writing files...');
  await writeFiles(files);
  logger.info('Files written succesfully!');
}

// SCHEMAS =================================================================================================================================
export const zBlockAny = z.object({
  id: z.string(),
  type: z.string(),
});

export const zBlockChildDatabase = zBlockAny
  .extend({type: z.literal('child_database'), child_database: z.object({title: z.string()})})
  .transform(({child_database, id, type}) => {
    const [kind, slug] = child_database.title.split(':');
    return {kind, id, slug, type};
  });

export const zBlock = zBlockChildDatabase.or(zBlockAny);
export const zBlockChildrenList = z.object({results: z.array(zBlock)});

export const zCollection = z.object({
  id: z.string(),
  kind: z.enum(['content', 'data']),
  slug: z.string(),
  type: z.string(),
});

export const zFile = z.object({
  content: z.string(),
  path: z.string(),
});

export const zRunOpts = z.object({
  contentPath: z.string(),
  logger: z.object({info: z.function().args(z.string())}).optional(),
  notionPageId: z.string(),
  notionSecret: z.string(),
});

export const zItem = z.object({
  collection: zCollection,
  id: z.string(),
  properties: z.any(),
});

// TYPES ===================================================================================================================================
export type Collection = z.infer<typeof zCollection>;
export type File = z.infer<typeof zFile>;
export type RunOpts = z.infer<typeof zRunOpts>;
export type Item = z.infer<typeof zItem>;

export type DateResponse = {start: string; end: string | null; time_zone: TimeZoneRequest | null};
export type PagePropNumber = {type: 'number'; number: number | null; id: string};
export type PagePropUrl = {type: 'url'; url: string | null; id: string};
export type PagePropSelect = {type: 'select'; select: SelectPropertyResponse | null; id: string};
export type PagePropMultiSelect = {type: 'multi_select'; multi_select: SelectPropertyResponse[]; id: string};
export type PagePropStatus = {type: 'status'; status: SelectPropertyResponse | null; id: string};
export type PagePropDate = {type: 'date'; date: DateResponse | null; id: string};
export type PagePropEmail = {type: 'email'; email: string | null; id: string};
export type PagePropPhoneNumber = {type: 'phone_number'; phone_number: string | null; id: string};
export type PagePropCheckbox = {type: 'checkbox'; checkbox: boolean; id: string};

export type PagePropFiles = {
  type: 'files';
  files: Array<
    | {file: {url: string; expiry_time: string}; name: StringRequest; type?: 'file'}
    | {external: {url: TextRequest}; name: StringRequest; type?: 'external'}
  >;
  id: string;
};

export type PagePropCreatedBy = {type: 'created_by'; created_by: PartialUserObjectResponse | UserObjectResponse; id: string};
export type PagePropCreatedTime = {type: 'created_time'; created_time: string; id: string};
export type PagePropLastEditedBy = {type: 'last_edited_by'; last_edited_by: PartialUserObjectResponse | UserObjectResponse; id: string};
export type PagePropLastEditedType = {type: 'last_edited_time'; last_edited_time: string; id: string};
export type PagePropFormula = {type: 'formula'; formula: FormulaPropertyResponse; id: string};
export type PagePropTitle = {type: 'title'; title: RichTextItemResponse[]; id: string};
export type PagePropRichText = {type: 'rich_text'; rich_text: RichTextItemResponse[]; id: string};
export type PagePropPeople = {type: 'people'; people: (PartialUserObjectResponse | UserObjectResponse)[]; id: string};
export type PagePropRelation = {type: 'relation'; relation: {id: string}[]; id: string};
export type PagePropRollup = {
  type: 'rollup';
  rollup:
    | {type: 'number'; number: number | null; function: RollupFunction}
    | {type: 'date'; date: DateResponse | null; function: RollupFunction}
    | {
        type: 'array';
        array: Array<
          | {type: 'title'; title: Array<RichTextItemResponse>}
          | {type: 'rich_text'; rich_text: Array<RichTextItemResponse>}
          | {type: 'people'; people: Array<PartialUserObjectResponse | UserObjectResponse>}
          | {type: 'relation'; relation: {id: string}[]}
        >;
        function: RollupFunction;
      };
  id: string;
};

export type StringRequest = string;
export type SelectColor = 'default' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';
export type SelectPropertyResponse = {id: StringRequest; name: StringRequest; color: SelectColor};
export type TextRequest = string;
export type TimeZoneRequest =
  | 'Africa/Abidjan'
  | 'Africa/Accra'
  | 'Africa/Addis_Ababa'
  | 'Africa/Algiers'
  | 'Africa/Asmara'
  | 'Africa/Asmera'
  | 'Africa/Bamako'
  | 'Africa/Bangui'
  | 'Africa/Banjul'
  | 'Africa/Bissau'
  | 'Africa/Blantyre'
  | 'Africa/Brazzaville'
  | 'Africa/Bujumbura'
  | 'Africa/Cairo'
  | 'Africa/Casablanca'
  | 'Africa/Ceuta'
  | 'Africa/Conakry'
  | 'Africa/Dakar'
  | 'Africa/Dar_es_Salaam'
  | 'Africa/Djibouti'
  | 'Africa/Douala'
  | 'Africa/El_Aaiun'
  | 'Africa/Freetown'
  | 'Africa/Gaborone'
  | 'Africa/Harare'
  | 'Africa/Johannesburg'
  | 'Africa/Juba'
  | 'Africa/Kampala'
  | 'Africa/Khartoum'
  | 'Africa/Kigali'
  | 'Africa/Kinshasa'
  | 'Africa/Lagos'
  | 'Africa/Libreville'
  | 'Africa/Lome'
  | 'Africa/Luanda'
  | 'Africa/Lubumbashi'
  | 'Africa/Lusaka'
  | 'Africa/Malabo'
  | 'Africa/Maputo'
  | 'Africa/Maseru'
  | 'Africa/Mbabane'
  | 'Africa/Mogadishu'
  | 'Africa/Monrovia'
  | 'Africa/Nairobi'
  | 'Africa/Ndjamena'
  | 'Africa/Niamey'
  | 'Africa/Nouakchott'
  | 'Africa/Ouagadougou'
  | 'Africa/Porto-Novo'
  | 'Africa/Sao_Tome'
  | 'Africa/Timbuktu'
  | 'Africa/Tripoli'
  | 'Africa/Tunis'
  | 'Africa/Windhoek'
  | 'America/Adak'
  | 'America/Anchorage'
  | 'America/Anguilla'
  | 'America/Antigua'
  | 'America/Araguaina'
  | 'America/Argentina/Buenos_Aires'
  | 'America/Argentina/Catamarca'
  | 'America/Argentina/ComodRivadavia'
  | 'America/Argentina/Cordoba'
  | 'America/Argentina/Jujuy'
  | 'America/Argentina/La_Rioja'
  | 'America/Argentina/Mendoza'
  | 'America/Argentina/Rio_Gallegos'
  | 'America/Argentina/Salta'
  | 'America/Argentina/San_Juan'
  | 'America/Argentina/San_Luis'
  | 'America/Argentina/Tucuman'
  | 'America/Argentina/Ushuaia'
  | 'America/Aruba'
  | 'America/Asuncion'
  | 'America/Atikokan'
  | 'America/Atka'
  | 'America/Bahia'
  | 'America/Bahia_Banderas'
  | 'America/Barbados'
  | 'America/Belem'
  | 'America/Belize'
  | 'America/Blanc-Sablon'
  | 'America/Boa_Vista'
  | 'America/Bogota'
  | 'America/Boise'
  | 'America/Buenos_Aires'
  | 'America/Cambridge_Bay'
  | 'America/Campo_Grande'
  | 'America/Cancun'
  | 'America/Caracas'
  | 'America/Catamarca'
  | 'America/Cayenne'
  | 'America/Cayman'
  | 'America/Chicago'
  | 'America/Chihuahua'
  | 'America/Coral_Harbour'
  | 'America/Cordoba'
  | 'America/Costa_Rica'
  | 'America/Creston'
  | 'America/Cuiaba'
  | 'America/Curacao'
  | 'America/Danmarkshavn'
  | 'America/Dawson'
  | 'America/Dawson_Creek'
  | 'America/Denver'
  | 'America/Detroit'
  | 'America/Dominica'
  | 'America/Edmonton'
  | 'America/Eirunepe'
  | 'America/El_Salvador'
  | 'America/Ensenada'
  | 'America/Fort_Nelson'
  | 'America/Fort_Wayne'
  | 'America/Fortaleza'
  | 'America/Glace_Bay'
  | 'America/Godthab'
  | 'America/Goose_Bay'
  | 'America/Grand_Turk'
  | 'America/Grenada'
  | 'America/Guadeloupe'
  | 'America/Guatemala'
  | 'America/Guayaquil'
  | 'America/Guyana'
  | 'America/Halifax'
  | 'America/Havana'
  | 'America/Hermosillo'
  | 'America/Indiana/Indianapolis'
  | 'America/Indiana/Knox'
  | 'America/Indiana/Marengo'
  | 'America/Indiana/Petersburg'
  | 'America/Indiana/Tell_City'
  | 'America/Indiana/Vevay'
  | 'America/Indiana/Vincennes'
  | 'America/Indiana/Winamac'
  | 'America/Indianapolis'
  | 'America/Inuvik'
  | 'America/Iqaluit'
  | 'America/Jamaica'
  | 'America/Jujuy'
  | 'America/Juneau'
  | 'America/Kentucky/Louisville'
  | 'America/Kentucky/Monticello'
  | 'America/Knox_IN'
  | 'America/Kralendijk'
  | 'America/La_Paz'
  | 'America/Lima'
  | 'America/Los_Angeles'
  | 'America/Louisville'
  | 'America/Lower_Princes'
  | 'America/Maceio'
  | 'America/Managua'
  | 'America/Manaus'
  | 'America/Marigot'
  | 'America/Martinique'
  | 'America/Matamoros'
  | 'America/Mazatlan'
  | 'America/Mendoza'
  | 'America/Menominee'
  | 'America/Merida'
  | 'America/Metlakatla'
  | 'America/Mexico_City'
  | 'America/Miquelon'
  | 'America/Moncton'
  | 'America/Monterrey'
  | 'America/Montevideo'
  | 'America/Montreal'
  | 'America/Montserrat'
  | 'America/Nassau'
  | 'America/New_York'
  | 'America/Nipigon'
  | 'America/Nome'
  | 'America/Noronha'
  | 'America/North_Dakota/Beulah'
  | 'America/North_Dakota/Center'
  | 'America/North_Dakota/New_Salem'
  | 'America/Ojinaga'
  | 'America/Panama'
  | 'America/Pangnirtung'
  | 'America/Paramaribo'
  | 'America/Phoenix'
  | 'America/Port-au-Prince'
  | 'America/Port_of_Spain'
  | 'America/Porto_Acre'
  | 'America/Porto_Velho'
  | 'America/Puerto_Rico'
  | 'America/Punta_Arenas'
  | 'America/Rainy_River'
  | 'America/Rankin_Inlet'
  | 'America/Recife'
  | 'America/Regina'
  | 'America/Resolute'
  | 'America/Rio_Branco'
  | 'America/Rosario'
  | 'America/Santa_Isabel'
  | 'America/Santarem'
  | 'America/Santiago'
  | 'America/Santo_Domingo'
  | 'America/Sao_Paulo'
  | 'America/Scoresbysund'
  | 'America/Shiprock'
  | 'America/Sitka'
  | 'America/St_Barthelemy'
  | 'America/St_Johns'
  | 'America/St_Kitts'
  | 'America/St_Lucia'
  | 'America/St_Thomas'
  | 'America/St_Vincent'
  | 'America/Swift_Current'
  | 'America/Tegucigalpa'
  | 'America/Thule'
  | 'America/Thunder_Bay'
  | 'America/Tijuana'
  | 'America/Toronto'
  | 'America/Tortola'
  | 'America/Vancouver'
  | 'America/Virgin'
  | 'America/Whitehorse'
  | 'America/Winnipeg'
  | 'America/Yakutat'
  | 'America/Yellowknife'
  | 'Antarctica/Casey'
  | 'Antarctica/Davis'
  | 'Antarctica/DumontDUrville'
  | 'Antarctica/Macquarie'
  | 'Antarctica/Mawson'
  | 'Antarctica/McMurdo'
  | 'Antarctica/Palmer'
  | 'Antarctica/Rothera'
  | 'Antarctica/South_Pole'
  | 'Antarctica/Syowa'
  | 'Antarctica/Troll'
  | 'Antarctica/Vostok'
  | 'Arctic/Longyearbyen'
  | 'Asia/Aden'
  | 'Asia/Almaty'
  | 'Asia/Amman'
  | 'Asia/Anadyr'
  | 'Asia/Aqtau'
  | 'Asia/Aqtobe'
  | 'Asia/Ashgabat'
  | 'Asia/Ashkhabad'
  | 'Asia/Atyrau'
  | 'Asia/Baghdad'
  | 'Asia/Bahrain'
  | 'Asia/Baku'
  | 'Asia/Bangkok'
  | 'Asia/Barnaul'
  | 'Asia/Beirut'
  | 'Asia/Bishkek'
  | 'Asia/Brunei'
  | 'Asia/Calcutta'
  | 'Asia/Chita'
  | 'Asia/Choibalsan'
  | 'Asia/Chongqing'
  | 'Asia/Chungking'
  | 'Asia/Colombo'
  | 'Asia/Dacca'
  | 'Asia/Damascus'
  | 'Asia/Dhaka'
  | 'Asia/Dili'
  | 'Asia/Dubai'
  | 'Asia/Dushanbe'
  | 'Asia/Famagusta'
  | 'Asia/Gaza'
  | 'Asia/Harbin'
  | 'Asia/Hebron'
  | 'Asia/Ho_Chi_Minh'
  | 'Asia/Hong_Kong'
  | 'Asia/Hovd'
  | 'Asia/Irkutsk'
  | 'Asia/Istanbul'
  | 'Asia/Jakarta'
  | 'Asia/Jayapura'
  | 'Asia/Jerusalem'
  | 'Asia/Kabul'
  | 'Asia/Kamchatka'
  | 'Asia/Karachi'
  | 'Asia/Kashgar'
  | 'Asia/Kathmandu'
  | 'Asia/Katmandu'
  | 'Asia/Khandyga'
  | 'Asia/Kolkata'
  | 'Asia/Krasnoyarsk'
  | 'Asia/Kuala_Lumpur'
  | 'Asia/Kuching'
  | 'Asia/Kuwait'
  | 'Asia/Macao'
  | 'Asia/Macau'
  | 'Asia/Magadan'
  | 'Asia/Makassar'
  | 'Asia/Manila'
  | 'Asia/Muscat'
  | 'Asia/Nicosia'
  | 'Asia/Novokuznetsk'
  | 'Asia/Novosibirsk'
  | 'Asia/Omsk'
  | 'Asia/Oral'
  | 'Asia/Phnom_Penh'
  | 'Asia/Pontianak'
  | 'Asia/Pyongyang'
  | 'Asia/Qatar'
  | 'Asia/Qostanay'
  | 'Asia/Qyzylorda'
  | 'Asia/Rangoon'
  | 'Asia/Riyadh'
  | 'Asia/Saigon'
  | 'Asia/Sakhalin'
  | 'Asia/Samarkand'
  | 'Asia/Seoul'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Srednekolymsk'
  | 'Asia/Taipei'
  | 'Asia/Tashkent'
  | 'Asia/Tbilisi'
  | 'Asia/Tehran'
  | 'Asia/Tel_Aviv'
  | 'Asia/Thimbu'
  | 'Asia/Thimphu'
  | 'Asia/Tokyo'
  | 'Asia/Tomsk'
  | 'Asia/Ujung_Pandang'
  | 'Asia/Ulaanbaatar'
  | 'Asia/Ulan_Bator'
  | 'Asia/Urumqi'
  | 'Asia/Ust-Nera'
  | 'Asia/Vientiane'
  | 'Asia/Vladivostok'
  | 'Asia/Yakutsk'
  | 'Asia/Yangon'
  | 'Asia/Yekaterinburg'
  | 'Asia/Yerevan'
  | 'Atlantic/Azores'
  | 'Atlantic/Bermuda'
  | 'Atlantic/Canary'
  | 'Atlantic/Cape_Verde'
  | 'Atlantic/Faeroe'
  | 'Atlantic/Faroe'
  | 'Atlantic/Jan_Mayen'
  | 'Atlantic/Madeira'
  | 'Atlantic/Reykjavik'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/St_Helena'
  | 'Atlantic/Stanley'
  | 'Australia/ACT'
  | 'Australia/Adelaide'
  | 'Australia/Brisbane'
  | 'Australia/Broken_Hill'
  | 'Australia/Canberra'
  | 'Australia/Currie'
  | 'Australia/Darwin'
  | 'Australia/Eucla'
  | 'Australia/Hobart'
  | 'Australia/LHI'
  | 'Australia/Lindeman'
  | 'Australia/Lord_Howe'
  | 'Australia/Melbourne'
  | 'Australia/NSW'
  | 'Australia/North'
  | 'Australia/Perth'
  | 'Australia/Queensland'
  | 'Australia/South'
  | 'Australia/Sydney'
  | 'Australia/Tasmania'
  | 'Australia/Victoria'
  | 'Australia/West'
  | 'Australia/Yancowinna'
  | 'Brazil/Acre'
  | 'Brazil/DeNoronha'
  | 'Brazil/East'
  | 'Brazil/West'
  | 'CET'
  | 'CST6CDT'
  | 'Canada/Atlantic'
  | 'Canada/Central'
  | 'Canada/Eastern'
  | 'Canada/Mountain'
  | 'Canada/Newfoundland'
  | 'Canada/Pacific'
  | 'Canada/Saskatchewan'
  | 'Canada/Yukon'
  | 'Chile/Continental'
  | 'Chile/EasterIsland'
  | 'Cuba'
  | 'EET'
  | 'EST'
  | 'EST5EDT'
  | 'Egypt'
  | 'Eire'
  | 'Etc/GMT'
  | 'Etc/GMT+0'
  | 'Etc/GMT+1'
  | 'Etc/GMT+10'
  | 'Etc/GMT+11'
  | 'Etc/GMT+12'
  | 'Etc/GMT+2'
  | 'Etc/GMT+3'
  | 'Etc/GMT+4'
  | 'Etc/GMT+5'
  | 'Etc/GMT+6'
  | 'Etc/GMT+7'
  | 'Etc/GMT+8'
  | 'Etc/GMT+9'
  | 'Etc/GMT-0'
  | 'Etc/GMT-1'
  | 'Etc/GMT-10'
  | 'Etc/GMT-11'
  | 'Etc/GMT-12'
  | 'Etc/GMT-13'
  | 'Etc/GMT-14'
  | 'Etc/GMT-2'
  | 'Etc/GMT-3'
  | 'Etc/GMT-4'
  | 'Etc/GMT-5'
  | 'Etc/GMT-6'
  | 'Etc/GMT-7'
  | 'Etc/GMT-8'
  | 'Etc/GMT-9'
  | 'Etc/GMT0'
  | 'Etc/Greenwich'
  | 'Etc/UCT'
  | 'Etc/UTC'
  | 'Etc/Universal'
  | 'Etc/Zulu'
  | 'Europe/Amsterdam'
  | 'Europe/Andorra'
  | 'Europe/Astrakhan'
  | 'Europe/Athens'
  | 'Europe/Belfast'
  | 'Europe/Belgrade'
  | 'Europe/Berlin'
  | 'Europe/Bratislava'
  | 'Europe/Brussels'
  | 'Europe/Bucharest'
  | 'Europe/Budapest'
  | 'Europe/Busingen'
  | 'Europe/Chisinau'
  | 'Europe/Copenhagen'
  | 'Europe/Dublin'
  | 'Europe/Gibraltar'
  | 'Europe/Guernsey'
  | 'Europe/Helsinki'
  | 'Europe/Isle_of_Man'
  | 'Europe/Istanbul'
  | 'Europe/Jersey'
  | 'Europe/Kaliningrad'
  | 'Europe/Kiev'
  | 'Europe/Kirov'
  | 'Europe/Lisbon'
  | 'Europe/Ljubljana'
  | 'Europe/London'
  | 'Europe/Luxembourg'
  | 'Europe/Madrid'
  | 'Europe/Malta'
  | 'Europe/Mariehamn'
  | 'Europe/Minsk'
  | 'Europe/Monaco'
  | 'Europe/Moscow'
  | 'Europe/Nicosia'
  | 'Europe/Oslo'
  | 'Europe/Paris'
  | 'Europe/Podgorica'
  | 'Europe/Prague'
  | 'Europe/Riga'
  | 'Europe/Rome'
  | 'Europe/Samara'
  | 'Europe/San_Marino'
  | 'Europe/Sarajevo'
  | 'Europe/Saratov'
  | 'Europe/Simferopol'
  | 'Europe/Skopje'
  | 'Europe/Sofia'
  | 'Europe/Stockholm'
  | 'Europe/Tallinn'
  | 'Europe/Tirane'
  | 'Europe/Tiraspol'
  | 'Europe/Ulyanovsk'
  | 'Europe/Uzhgorod'
  | 'Europe/Vaduz'
  | 'Europe/Vatican'
  | 'Europe/Vienna'
  | 'Europe/Vilnius'
  | 'Europe/Volgograd'
  | 'Europe/Warsaw'
  | 'Europe/Zagreb'
  | 'Europe/Zaporozhye'
  | 'Europe/Zurich'
  | 'GB'
  | 'GB-Eire'
  | 'GMT'
  | 'GMT+0'
  | 'GMT-0'
  | 'GMT0'
  | 'Greenwich'
  | 'HST'
  | 'Hongkong'
  | 'Iceland'
  | 'Indian/Antananarivo'
  | 'Indian/Chagos'
  | 'Indian/Christmas'
  | 'Indian/Cocos'
  | 'Indian/Comoro'
  | 'Indian/Kerguelen'
  | 'Indian/Mahe'
  | 'Indian/Maldives'
  | 'Indian/Mauritius'
  | 'Indian/Mayotte'
  | 'Indian/Reunion'
  | 'Iran'
  | 'Israel'
  | 'Jamaica'
  | 'Japan'
  | 'Kwajalein'
  | 'Libya'
  | 'MET'
  | 'MST'
  | 'MST7MDT'
  | 'Mexico/BajaNorte'
  | 'Mexico/BajaSur'
  | 'Mexico/General'
  | 'NZ'
  | 'NZ-CHAT'
  | 'Navajo'
  | 'PRC'
  | 'PST8PDT'
  | 'Pacific/Apia'
  | 'Pacific/Auckland'
  | 'Pacific/Bougainville'
  | 'Pacific/Chatham'
  | 'Pacific/Chuuk'
  | 'Pacific/Easter'
  | 'Pacific/Efate'
  | 'Pacific/Enderbury'
  | 'Pacific/Fakaofo'
  | 'Pacific/Fiji'
  | 'Pacific/Funafuti'
  | 'Pacific/Galapagos'
  | 'Pacific/Gambier'
  | 'Pacific/Guadalcanal'
  | 'Pacific/Guam'
  | 'Pacific/Honolulu'
  | 'Pacific/Johnston'
  | 'Pacific/Kiritimati'
  | 'Pacific/Kosrae'
  | 'Pacific/Kwajalein'
  | 'Pacific/Majuro'
  | 'Pacific/Marquesas'
  | 'Pacific/Midway'
  | 'Pacific/Nauru'
  | 'Pacific/Niue'
  | 'Pacific/Norfolk'
  | 'Pacific/Noumea'
  | 'Pacific/Pago_Pago'
  | 'Pacific/Palau'
  | 'Pacific/Pitcairn'
  | 'Pacific/Pohnpei'
  | 'Pacific/Ponape'
  | 'Pacific/Port_Moresby'
  | 'Pacific/Rarotonga'
  | 'Pacific/Saipan'
  | 'Pacific/Samoa'
  | 'Pacific/Tahiti'
  | 'Pacific/Tarawa'
  | 'Pacific/Tongatapu'
  | 'Pacific/Truk'
  | 'Pacific/Wake'
  | 'Pacific/Wallis'
  | 'Pacific/Yap'
  | 'Poland'
  | 'Portugal'
  | 'ROC'
  | 'ROK'
  | 'Singapore'
  | 'Turkey'
  | 'UCT'
  | 'US/Alaska'
  | 'US/Aleutian'
  | 'US/Arizona'
  | 'US/Central'
  | 'US/East-Indiana'
  | 'US/Eastern'
  | 'US/Hawaii'
  | 'US/Indiana-Starke'
  | 'US/Michigan'
  | 'US/Mountain'
  | 'US/Pacific'
  | 'US/Pacific-New'
  | 'US/Samoa'
  | 'UTC'
  | 'Universal'
  | 'W-SU'
  | 'WET'
  | 'Zulu';
