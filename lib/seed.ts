/* Demo graph: Malaysian automotive, gathered from the public sources below on 10 Oct 2026.
   Every fact cites one of these sources. The evidence extracts were condensed from the pages
   at ingestion, not copied verbatim; `npm run check` reports them as having no cached copy
   until a live research run re-fetches the page. */
import type { Answer, ClaimStatus, NoteType } from './types.ts';

export const SEED_DATE = '2026-10-10';

export interface SeedSource { id: string; title: string; url: string; published: string; type: string; company: string }
export interface SeedNote {
  id: string; type: Exclude<NoteType, 'Source'>; title: string; company: string; body: string;
  claims: [text: string, source: string, evidence: string, status: ClaimStatus][];
  links: [relation: string, to: string][];
}

export const SEED_SOURCES: SeedSource[] = [
  { id: 's_cb_my', title: 'CarBase — Tesla Model Y RWD (2026)', url: 'https://www.carbase.my/tesla/model-y/juniper/rear-wheel-drive-2026', published: '2026', type: 'price guide', company: 'Tesla' },
  { id: 's_pt_my', title: 'Paultan.org — Tesla Model Y buyer’s guide', url: 'https://paultan.org/research/tesla/model-y/', published: '2026', type: 'news', company: 'Tesla' },
  { id: 's_pt_bm', title: 'Paultan.org (BM) — Panduan Tesla Model Y', url: 'https://paultan.org/bm/panduan-kereta/tesla/model-y/', published: '2026', type: 'news', company: 'Tesla' },
  { id: 's_sc_lau', title: 'SoyaCincau — Model Y Juniper launch, Pavilion Damansara Heights', url: 'https://soyacincau.com/2025/02/18/new-tesla-model-y-juniper-malaysia-launch-pavilion-dh/', published: '2025-02-18', type: 'news', company: 'Tesla' },
  { id: 's_sc_del', title: 'SoyaCincau — Model Y Juniper deliveries nationwide', url: 'https://soyacincau.com/2025/05/20/tesla-model-y-2025-juniper-malaysia-deliveries-started-nationwide/', published: '2025-05-20', type: 'news', company: 'Tesla' },
  { id: 's_carz_y', title: 'Carz.com.my — 2025 Model Y facelift from RM195,450', url: 'https://www.carz.com.my/2025/2/launched-2025-tesla-model-y-juniper-facelift-from-rm195450', published: '2025-02', type: 'news', company: 'Tesla' },
  { id: 's_imoney', title: 'iMoney — Malaysia’s EV charger shortage', url: 'https://www.imoney.my/articles/malaysia-ev-charger-shortage-2026', published: '2026', type: 'news', company: 'Tesla' },
  { id: 's_zw_cc', title: 'ZigWheels — Toyota Corolla Cross Hybrid price', url: 'https://www.zigwheels.my/ms/new-cars/toyota/corolla-cross-hybrid/price', published: '2026', type: 'price guide', company: 'Toyota' },
  { id: 's_wc_grs', title: 'WapCar — 2026 Corolla Cross HEV GR-S, same RM149k price', url: 'https://www.wapcar.my/news/37663/amp', published: '2026-02', type: 'news', company: 'Toyota' },
  { id: 's_kosmo', title: 'Kosmo — Corolla Cross Hybrid launch, Bukit Raja assembly', url: 'https://www.kosmo.com.my/?p=223364', published: '2022', type: 'news', company: 'Toyota' },
  { id: 's_com_mt', title: 'CarsOfMalaysia — UMW Toyota July figures + Merdeka promos', url: 'https://carsofmalaysia.com/?p=28532', published: '2025-07', type: 'news', company: 'Toyota' },
  { id: 's_pt_eqa', title: 'Paultan.org — Mercedes-Benz EQA guide', url: 'https://paultan.org/research/mercedes-benz/eqa/', published: '2026', type: 'news', company: 'Mercedes-Benz' },
  { id: 's_cb_eqa', title: 'CarBase — EQA 250 AMG Line (2026)', url: 'https://www.carbase.my/mercedes-benz/eqa/h243/eqa-250-amg-line-2026', published: '2026', type: 'price guide', company: 'Mercedes-Benz' },
  { id: 's_ab_eqb', title: 'AutoBuzz — EQB 350 / EQC 400 prices confirmed', url: 'https://autobuzz.my/2022/09/09/mercedes-benz-eqb-350-and-eqc-400-prices-confirmed-rm-329k-and-rm389k/', published: '2022-09-09', type: 'news', company: 'Mercedes-Benz' },
  { id: 's_sc_byd', title: 'SoyaCincau — BYD Merdeka rebate: RM14k off Atto 3', url: 'https://soyacincau.com/2026/08/17/byd-atto3-sealion7-merdeka-rebate-rm14k-off/', published: '2026-08-17', type: 'news', company: 'BYD' },
  { id: 's_cb_myvi', title: 'CarBase — Perodua Myvi 1.3 G / 1.5 AV (2026)', url: 'https://www.carbase.my/perodua/myvi/d51a/1.3-g-2026', published: '2026', type: 'price guide', company: 'Perodua' },
  { id: 's_mm_qve', title: 'Malay Mail — PM launches Perodua QV-E', url: 'https://malaymail.com/news/malaysia/2025/12/01/anwar-hails-peroduas-rm800m-leap-as-qv-e-drives-malaysia-into-the-electric-age/200334', published: '2025-12-01', type: 'news', company: 'Perodua' },
  { id: 's_bloom', title: 'Bloomberg — Perodua unveils $19,000 EV, battery not included', url: 'https://www.bloomberg.com/news/articles/2025-12-01/malaysia-s-perodua-unveils-19-000-ev-battery-not-included', published: '2025-12-01', type: 'news', company: 'Perodua' },
  { id: 's_elec', title: 'Electrive — Perodua launches Malaysia’s first local EV', url: 'https://www.electrive.com/2025/12/10/perodua-launches-malaysias-first-locally-developed-electric-car', published: '2025-12-10', type: 'news', company: 'Perodua' },
  { id: 's_com_qve', title: 'CarsOfMalaysia — QV-E launched from RM80k (battery excluded)', url: 'https://carsofmalaysia.com/?p=29632', published: '2025-12', type: 'news', company: 'Perodua' },
  { id: 's_says', title: 'SAYS — Perodua’s first EV at RM80,000', url: 'https://says.com/my/tech/perodua-first-ev-rm80000-qve', published: '2025-12', type: 'news', company: 'Perodua' },
  { id: 's_bh_qve', title: 'Berita Harian — QV-E 2026 price revamp', url: 'https://www.bharian.com.my/amp/bisnes/auto/2026/06/1572299/bhplus', published: '2026-06', type: 'news', company: 'Perodua' },
  { id: 's_bt_mas', title: 'BusinessToday — Malaysia Autoshow back in June 2027', url: 'https://www.businesstoday.com.my/2026/09/21/malaysia-autoshow-is-back-in-june-2027/', published: '2026-09-21', type: 'news', company: '' },
  { id: 's_wc_mas', title: 'WapCar — Autoshow 2027 at MAEPS; 2026 gave way to KLIMS', url: 'https://www.wapcar.my/news/malaysia-autoshow-2027-set-for-june-at-maeps-serdang-754141', published: '2026-09', type: 'news', company: '' },
  { id: 's_ai_sh', title: 'AutoInternational — Penang & Johor Autoshows in 2026', url: 'https://autointernational.com.my/Penang%20and%20Johor%20Autoshows%20to%20be%20held%20in%202026%20%20%20-%2018%20Dec25.html', published: '2025-12-18', type: 'news', company: '' },
];

export const SEED_NOTES: SeedNote[] = [
  { id: 'c_toyota', type: 'Company', title: 'UMW Toyota Motor', company: 'Toyota',
    body: 'Toyota’s Malaysian distributor. Assembles the Corolla Cross Hybrid locally and launched the Vios Hybrid and Corolla Cross HEV GR-S in early 2026.',
    claims: [
      ['Launched the Vios Hybrid in January 2026 and the Corolla Cross HEV GR-S in February 2026.', 's_com_mt', 'Product news roundup: Vios Hybrid launched Jan 2026; Corolla Cross HEV GR-S Feb 2026 at an unchanged price.', 'verified'],
      ['The Corolla Cross Hybrid is assembled at ASSB, Bukit Raja, Selangor.', 's_kosmo', 'Launch coverage: hybrid pre-production at ASSB, UMW Toyota Motor’s assembly plant in Bukit Raja, Selangor.', 'verified']],
    links: [['makes', 'p_cc'], ['makes', 'p_vios'], ['runs', 'cm_toy'], ['competes_with', 'c_perodua'], ['competes_with', 'c_tesla']] },
  { id: 'p_cc', type: 'Product', title: 'Corolla Cross', company: 'Toyota',
    body: 'B/C-segment SUV, petrol and hybrid. The 2026 HEV GR-S update kept the previous price.',
    claims: [['The 2026 Corolla Cross HEV GR-S arrived with GR styling updates at the same ≈RM149k price.', 's_wc_grs', 'WapCar: updated 2026 Corolla Cross HEV GR-S, new GR visual updates, same price of RM149k.', 'verified']],
    links: [['made_by', 'c_toyota'], ['has_price', 'pr_cc']] },
  { id: 'p_vios', type: 'Product', title: 'Vios Hybrid', company: 'Toyota',
    body: 'B-segment sedan; the hybrid variant joined the range in January 2026.',
    claims: [['UMW Toyota launched the Vios Hybrid in January 2026.', 's_com_mt', 'News roundup: Vios Hybrid launched January 2026.', 'verified']],
    links: [['made_by', 'c_toyota']] },
  { id: 'pr_cc', type: 'Price', title: 'Corolla Cross price (MY)', company: 'Toyota',
    body: 'RM133,800 (1.8 V) to RM148,800 (1.8 HEV GR-Sport).',
    claims: [['Corolla Cross spans RM133,800 (1.8 V) to RM148,800 (1.8 HEV GR-Sport).', 's_zw_cc', 'ZigWheels price list: base RM133,800 for the 1.8 V; RM148,800 for the 1.8 HEV GR-Sport.', 'verified']],
    links: [['price_of', 'p_cc']] },
  { id: 'cm_toy', type: 'Campaign', title: 'Toyota Merdeka rebates ’25', company: 'Toyota',
    body: '2025 Merdeka campaign: RM8,000 off Vios, RM6,000 off Corolla Cross. A year old — kept as stale until a current promo is found.',
    claims: [['The 2025 Merdeka campaign offered RM8,000 off the Vios and RM6,000 off the Corolla Cross.', 's_com_mt', 'July 2025 roundup of UMW Toyota’s Merdeka campaign: rebates of RM8,000 (Vios) and RM6,000 (Corolla Cross).', 'stale']],
    links: [['run_by', 'c_toyota'], ['promotes', 'p_vios'], ['promotes', 'p_cc']] },

  { id: 'c_tesla', type: 'Company', title: 'Tesla Malaysia', company: 'Tesla',
    body: 'Direct-sales EV brand. The Model Y Juniper launched at Pavilion Damansara Heights in Feb 2025; deliveries went nationwide from May 2025.',
    claims: [
      ['Launched the Model Y Juniper in Malaysia at Pavilion Damansara Heights in February 2025.', 's_sc_lau', 'SoyaCincau launch report, 18 Feb 2025.', 'verified'],
      ['Model Y Juniper deliveries started nationwide in May 2025.', 's_sc_del', 'SoyaCincau, 20 May 2025: deliveries started nationwide.', 'verified'],
      ['Context: Malaysia had 5,839 public chargers as of 31 Mar 2026 (3,868 AC + 1,971 DC), still concentrated in the Klang Valley.', 's_imoney', 'iMoney citing the MEVnet dashboard: 5,839 public chargers as of 31 March 2026; infrastructure heavily concentrated in the Klang Valley. Single source — flagged for a second check.', 'verified']],
    links: [['makes', 'p_my'], ['competes_with', 'c_byd'], ['competes_with', 'c_merc']] },
  { id: 'p_my', type: 'Product', title: 'Model Y', company: 'Tesla',
    body: 'Electric SUV (Juniper generation). For 2026 the Long Range AWD left the local line-up and the six-seat Model Y L arrived.',
    claims: [
      ['For 2026, the Long Range AWD leaves the line-up and the six-seat Model Y L arrives, listed at RM260,000.', 's_pt_bm', 'Paultan BM guide: Model Y L (6 seats) at RM260,000; Long Range AWD dropped.', 'verified'],
      ['RWD specs: 0–100 km/h in 5.9s, up to 466 km range, 5 seats.', 's_cb_my', 'CarBase spec sheet for the RWD variant.', 'verified']],
    links: [['made_by', 'c_tesla'], ['has_price', 'pr_my']] },
  { id: 'pr_my', type: 'Price', title: 'Model Y price (MY)', company: 'Tesla',
    body: 'Two live figures for the entry RWD: RM198,000 (CarBase, Paultan EN) and RM195,450 (Paultan BM, Carz). Both kept until confirmed.',
    claims: [
      ['Model Y RWD is listed at RM198,000 (2026).', 's_cb_my', 'CarBase: RWD (2026) at RM198,000 across Peninsular Malaysia; Paultan EN guide shows the same RM198,000–RM263,000 range.', 'conflicting'],
      ['Model Y entry price is RM195,450.', 's_pt_bm', 'Paultan BM guide: entry at RM195,450; matches the Feb 2025 launch price reported by Carz.', 'conflicting'],
      ['The 2025 Model Y facelift launched from RM195,450.', 's_carz_y', 'Carz.com.my headline: launched 2025 Tesla Model Y Juniper facelift from RM195,450.', 'conflicting']],
    links: [['price_of', 'p_my']] },

  { id: 'c_merc', type: 'Company', title: 'Mercedes-Benz Malaysia', company: 'Mercedes-Benz',
    body: 'Premium brand; its EQ electric range in Malaysia currently centres on the EQA.',
    claims: [['The EQA 250 AMG Line is the only EQA variant sold locally, unchanged for 2026.', 's_pt_eqa', 'Paultan EQA guide: single local variant, nothing changed for 2026.', 'verified']],
    links: [['makes', 'p_eqa'], ['makes', 'p_eqb'], ['competes_with', 'c_tesla']] },
  { id: 'p_eqa', type: 'Product', title: 'EQA 250 AMG Line', company: 'Mercedes-Benz',
    body: 'Compact electric SUV: 66.5 kWh battery, 188 hp, up to 429 km claimed range.',
    claims: [['EQA 250: 66.5 kWh battery, 188 hp front motor, up to 429 km claimed range.', 's_cb_eqa', 'CarBase 2026 listing: 66.5 kWh, 188 hp/375 Nm, 429 km.', 'verified']],
    links: [['made_by', 'c_merc'], ['has_price', 'pr_eqa']] },
  { id: 'pr_eqa', type: 'Price', title: 'EQA price (MY)', company: 'Mercedes-Benz',
    body: 'RM296,888 for 2026.',
    claims: [['EQA 250 AMG Line is priced at RM296,888 (2026).', 's_pt_eqa', 'Paultan: priced from RM296,888; CarBase lists the same figure.', 'verified']],
    links: [['price_of', 'p_eqa']] },
  { id: 'p_eqb', type: 'Product', title: 'EQB 350 4MATIC', company: 'Mercedes-Benz',
    body: 'Seven-seat electric SUV. No price newer than the 2022 launch was found — marked stale.',
    claims: [['EQB 350 4MATIC launched at RM328,888 (2022); no newer local price found.', 's_ab_eqb', 'AutoBuzz, Sep 2022: EQB 350 confirmed at RM329k on-the-road without insurance. Nothing newer surfaced — stale.', 'stale']],
    links: [['made_by', 'c_merc'], ['has_price', 'pr_eqb']] },
  { id: 'pr_eqb', type: 'Price', title: 'EQB price (MY)', company: 'Mercedes-Benz',
    body: 'RM328,888 at the 2022 launch; treat as stale.',
    claims: [['EQB 350 4MATIC: RM328,888 at launch (Sep 2022).', 's_ab_eqb', 'AutoBuzz: confirmed recommended retail price RM328,888.', 'stale']],
    links: [['price_of', 'p_eqb']] },

  { id: 'c_byd', type: 'Company', title: 'BYD Malaysia', company: 'BYD',
    body: 'EV volume challenger (distributed by Sime Darby Beyond Auto). Ran an aggressive Merdeka rebate campaign in August 2026.',
    claims: [['Ran the “Merdeka Dreams Deal” rebate campaign in August 2026.', 's_sc_byd', 'SoyaCincau, 17 Aug 2026: Merdeka Dreams Deal across Atto 3 and Sealion 7.', 'verified']],
    links: [['makes', 'p_atto'], ['makes', 'p_sl7'], ['runs', 'cm_byd'], ['competes_with', 'c_tesla'], ['competes_with', 'c_perodua']] },
  { id: 'p_atto', type: 'Product', title: 'Atto 3', company: 'BYD',
    body: 'Compact electric SUV, Ultra and Premium variants.',
    claims: [['Atto 3 normal RRP: RM125,800 (Ultra) and RM138,800 (Premium).', 's_sc_byd', 'SoyaCincau: normal RRP RM125,800 / RM138,800 before the Merdeka rebate.', 'verified']],
    links: [['made_by', 'c_byd'], ['has_price', 'pr_atto'], ['promoted_by', 'cm_byd']] },
  { id: 'pr_atto', type: 'Price', title: 'Atto 3 price (MY)', company: 'BYD',
    body: 'RM125,800–RM138,800 RRP; RM111,800–RM124,800 during the August rebate.',
    claims: [['During the Merdeka deal the Atto 3 sold from RM111,800 (Ultra) and RM124,800 (Premium) — RM14,000 off.', 's_sc_byd', 'SoyaCincau: savings of RM14,000; post-promo prices RM111,800 and RM124,800.', 'verified']],
    links: [['price_of', 'p_atto']] },
  { id: 'p_sl7', type: 'Product', title: 'Sealion 7', company: 'BYD',
    body: 'Electric SUV in three variants: Dynamic, Premium, Performance.',
    claims: [['Sealion 7 rebate pricing: Dynamic RM159,800, Premium RM181,800, Performance RM197,800.', 's_sc_byd', 'SoyaCincau: Dynamic RM159,800 (save RM4,000), Premium RM181,800 (save RM7,000), Performance RM197,800 (save RM6,000).', 'verified']],
    links: [['made_by', 'c_byd'], ['has_price', 'pr_sl7'], ['promoted_by', 'cm_byd']] },
  { id: 'pr_sl7', type: 'Price', title: 'Sealion 7 price (MY)', company: 'BYD',
    body: 'RM159,800–RM197,800 under the August rebate.',
    claims: [['Sealion 7 spans RM159,800–RM197,800 under the August 2026 rebate.', 's_sc_byd', 'Variant prices from the Merdeka Dreams Deal report.', 'verified']],
    links: [['price_of', 'p_sl7']] },
  { id: 'cm_byd', type: 'Campaign', title: 'Merdeka Dreams Deal', company: 'BYD',
    body: 'August 2026 rebate: up to RM14,000 off Atto 3, up to RM7,000 off Sealion 7. End date unconfirmed; likely closed by October — marked stale.',
    claims: [['Up to RM14,000 off the Atto 3 and up to RM7,000 off the Sealion 7 (Aug 2026); end date unconfirmed.', 's_sc_byd', 'SoyaCincau: “unclear how long this promo will last”; likely through end September 2026.', 'stale']],
    links: [['run_by', 'c_byd'], ['promotes', 'p_atto'], ['promotes', 'p_sl7']] },

  { id: 'c_perodua', type: 'Company', title: 'Perodua', company: 'Perodua',
    body: 'Malaysia’s national carmaker and volume leader. Launched the country’s first locally developed EV, the QV-E, in December 2025.',
    claims: [['The QV-E was officially launched by the Prime Minister on 1 December 2025.', 's_mm_qve', 'Malay Mail, 1 Dec 2025: PM launches the QV-E; an “RM800m leap” into the electric age.', 'verified']],
    links: [['makes', 'p_myvi'], ['makes', 'p_qve'], ['runs', 'cm_baas'], ['competes_with', 'c_toyota'], ['competes_with', 'c_byd']] },
  { id: 'p_myvi', type: 'Product', title: 'Myvi', company: 'Perodua',
    body: 'Best-selling hatchback; D51A generation, 1.3 and 1.5 litre, five variants.',
    claims: [['The Myvi range runs five variants with 1.3/1.5 engines and CVT.', 's_cb_myvi', 'CarBase D51A listings, 2026.', 'verified']],
    links: [['made_by', 'c_perodua'], ['has_price', 'pr_myvi']] },
  { id: 'pr_myvi', type: 'Price', title: 'Myvi price (MY)', company: 'Perodua',
    body: 'RM46,500 (1.3 G without PSDA) to RM59,900 (1.5 AV), Peninsular Malaysia.',
    claims: [['Myvi spans RM46,500 to RM59,900 in Peninsular Malaysia.', 's_cb_myvi', 'CarBase: 1.3 G without PSDA RM46,500; 1.3 G RM48,500; 1.5 AV RM59,900.', 'verified']],
    links: [['price_of', 'p_myvi']] },
  { id: 'p_qve', type: 'Product', title: 'QV-E', company: 'Perodua',
    body: 'Malaysia’s first locally developed EV. 52.5 kWh LFP battery; range figures differ between sources.',
    claims: [
      ['QV-E range: up to 445 km (subject to conditions).', 's_says', 'SAYS: 52.5 kWh LFP battery, up to 445 km depending on driving style, temperature and road conditions.', 'conflicting'],
      ['QV-E range: up to 370 km (WLTP).', 's_elec', 'Electrive: up to 370 km WLTP.', 'conflicting']],
    links: [['made_by', 'c_perodua'], ['has_price', 'pr_qve'], ['promoted_by', 'cm_baas']] },
  { id: 'pr_qve', type: 'Price', title: 'QV-E price (MY)', company: 'Perodua',
    body: 'Launched at RM80,000 excluding battery (Dec 2025); repriced in June 2026 — list RM93,999 full / RM69,999 BaaS, with a promo at RM87,499 / RM63,499 until end September.',
    claims: [
      ['Launch price: RM80,000 excluding insurance and battery (Dec 2025).', 's_com_qve', 'CarsOfMalaysia: QV-E launched from RM80k, battery not included; Bloomberg ran the same figure.', 'verified'],
      ['June 2026 list prices: RM93,999 full ownership, or RM69,999 + RM215/month battery subscription (9 years).', 's_bh_qve', 'Berita Harian (Bernama): RM93,999 full; BaaS RM69,999 + RM215/month incl. tax; promo RM87,499/RM63,499 valid until end September.', 'verified']],
    links: [['price_of', 'p_qve']] },
  { id: 'cm_baas', type: 'Campaign', title: 'QV-E battery subscription', company: 'Perodua',
    body: 'Battery-as-a-Service: the car is sold without its battery, which is leased monthly — a first for Malaysia.',
    claims: [
      ['At launch the battery lease was RM275/month (RM297 with 8% SST).', 's_bloom', 'Bloomberg: battery subscription at RM275 per month; RM297 including tax per another report.', 'verified'],
      ['From June 2026 the subscription is RM215/month including tax.', 's_bh_qve', 'Berita Harian: BaaS at RM215 monthly including tax over nine years.', 'verified']],
    links: [['run_by', 'c_perodua'], ['promotes', 'p_qve']] },

  { id: 'e_klims', type: 'Event', title: 'KLIMS 2026', company: '',
    body: 'Kuala Lumpur International Motor Show, hosted by the Malaysian Automotive Association. The Malaysia Autoshow stepped back in 2026 to make way for it. Brand lists for the tracked companies: not found yet.',
    claims: [['The Malaysia Autoshow took a step back in 2026 to give way to KLIMS 2026.', 's_bt_mas', 'BusinessToday, 21 Sep 2026: “in 2026, the Malaysia Autoshow will take a step back to give way to … KLIMS 2026.”', 'verified']],
    links: [] },
  { id: 'e_mas27', type: 'Event', title: 'Malaysia Autoshow 2027', company: '',
    body: 'Set for 4–8 June 2027 at MAEPS, Serdang. Regional Penang (May 2026) and Johor (Aug 2026) editions ran in between.',
    claims: [
      ['Malaysia Autoshow 2027 runs 4–8 June 2027 at MAEPS, Serdang.', 's_wc_mas', 'WapCar, Sep 2026: 2027 edition set for 4–8 June at MAEPS.', 'verified'],
      ['Penang Autoshow was scheduled for May 2026 and Johor Autoshow for August 2026.', 's_ai_sh', 'AutoInternational, Dec 2025: regional editions announced for 2026.', 'verified']],
    links: [] },
];

/* Claim ids are `<note id>.<n>`, so the example runs below can cite them. */
const s = (text: string, cites: string[], inference = false) => ({ text, cites, ...(inference ? { inference } : {}) });

export const SEED_RUNS: { id: string; question: string; mode: 'answer' | 'report'; answer: Answer }[] = [
  { id: 'example-model-y', mode: 'answer',
    question: 'We sell Toyota in Klang Valley. Should we add Tesla Model Y to the floor, or will it eat into our Corolla Cross buyers?',
    answer: {
      title: 'Should we stock Tesla Model Y?',
      lead: s('Model Y sits a full price bracket above your Corolla Cross — the nearer fight for an EV buyer is BYD, not your own floor.', ['pr_my.1', 'pr_cc.1', 'pr_sl7.1'], true),
      sections: [{ sentences: [
        s('Model Y RWD is listed at RM198,000 for 2026, while two other sources give an entry price of RM195,450 — the figures conflict.', ['pr_my.1', 'pr_my.2', 'pr_my.3']),
        s('Your top Corolla Cross, the 1.8 HEV GR-Sport, is RM148,800, roughly RM50,000 below Model Y.', ['pr_cc.1', 'pr_my.1']),
        s('BYD’s Sealion 7 sold from RM159,800 under its August 2026 Merdeka rebate, which also took up to RM14,000 off the Atto 3.', ['pr_sl7.1', 'cm_byd.1']),
        s('The Mercedes-Benz EQA sits far above at RM296,888.', ['pr_eqa.1']),
        s('Malaysia had 5,839 public chargers as of 31 March 2026, concentrated in the Klang Valley; this rests on a single source so far.', ['c_tesla.3']),
        s('A small Model Y allocation would reach step-up buyers you lose at the top of the Corolla Cross range, while your nearer volume risk is BYD’s rebate cycle.', ['pr_cc.1', 'pr_my.1', 'cm_byd.1'], true),
      ] }],
      not_found: [],
    } },
  { id: 'example-report', mode: 'report',
    question: 'Competitor brief: should a Toyota dealer in Klang Valley add Tesla Model Y?',
    answer: {
      title: 'Should a Toyota dealer in Klang Valley add Tesla Model Y?',
      lead: s('Run a small Model Y trial alongside Corolla Cross for one quarter, and prepare an answer to BYD’s rebates before year end.', ['pr_my.1', 'pr_cc.1', 'cm_byd.1'], true),
      sections: [
        { heading: 'Where Model Y sits', sentences: [
          s('Model Y RWD is listed at RM198,000 for 2026, with two other sources giving RM195,450 — the figures conflict.', ['pr_my.1', 'pr_my.2', 'pr_my.3']),
          s('Deliveries of the current Juniper generation have run nationwide since May 2025.', ['c_tesla.2']),
          s('That is about RM50,000 above the Corolla Cross 1.8 HEV GR-Sport at RM148,800 — a step-up purchase, not a floor swap.', ['pr_cc.1', 'pr_my.1'], true) ] },
        { heading: 'Rivals by price', sentences: [
          s('BYD Sealion 7 Dynamic: RM159,800 under the August 2026 rebate.', ['pr_sl7.1']),
          s('Mercedes-Benz EQA 250 AMG Line: RM296,888.', ['pr_eqa.1']),
          s('Perodua QV-E: RM69,999 plus a RM215/month battery subscription since June 2026.', ['pr_qve.2']) ] },
        { heading: 'Risks to watch', sentences: [
          s('BYD’s Merdeka campaign cut up to RM14,000 off the Atto 3 and RM7,000 off the Sealion 7; its end date is unconfirmed.', ['cm_byd.1']),
          s('Perodua’s QV-E has been repriced since its RM80,000 launch, so the entry-EV floor is still moving.', ['pr_qve.1', 'pr_qve.2']),
          s('The national charger count of 5,839 (March 2026) rests on one source so far.', ['c_tesla.3']) ] },
      ],
      not_found: [],
    } },
];
