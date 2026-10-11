import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterKnowledgeArticles,
  getKnowledgeContentState,
  getVerificationPresentation,
  mapKnowledgeArticles,
  mapKnowledgeSources,
} from '../src/lib/knowledgeHub.ts';

const sourceRows = [{
  id: 'source-1',
  name: 'ICAR-CPCRI',
  organization: 'Central Plantation Crops Research Institute',
  website_url: 'https://cpcri.icar.gov.in',
  authority_type: 'Research institute',
  description: 'Plantation crop research.',
}];

const articleRow = (overrides = {}) => ({
  id: 'article-1',
  title: 'Soil cover planning',
  category: 'Soil Health',
  summary: 'A guide to soil cover.',
  content: [{ heading: 'Cover crops', points: ['Keep soil covered between seasons.'] }],
  tags: ['soil', 'cover'],
  read_minutes: 5,
  source_name: 'ICAR-CPCRI Soil Science Bulletin',
  source_url: 'https://cpcri.icar.gov.in/bulletin',
  last_verified: '2026-09-24',
  verification_status: 'General Agricultural Information',
  is_published: true,
  ...overrides,
});

test('maps published articles and excludes unpublished rows', () => {
  const articles = mapKnowledgeArticles([
    articleRow(),
    articleRow({ id: 'draft', is_published: false }),
  ], mapKnowledgeSources(sourceRows));

  assert.equal(articles.length, 1);
  assert.equal(articles[0].id, 'article-1');
  assert.equal(articles[0].sourceMetadata?.id, 'source-1');
});

test('maps source metadata only for a unique matching website origin', () => {
  const [source] = mapKnowledgeSources(sourceRows);
  const [article] = mapKnowledgeArticles([articleRow()], [source]);
  const ambiguous = mapKnowledgeSources([
    ...sourceRows,
    { ...sourceRows[0], id: 'source-2', name: 'Another source' },
  ]);
  const [ambiguousArticle] = mapKnowledgeArticles([articleRow()], ambiguous);

  assert.equal(article.sourceName, 'ICAR-CPCRI Soil Science Bulletin');
  assert.equal(article.sourceUrl, 'https://cpcri.icar.gov.in/bulletin');
  assert.equal(article.sourceMetadata?.organization, sourceRows[0].organization);
  assert.equal(ambiguousArticle.sourceMetadata, undefined);
});

test('keeps missing optional metadata empty without inventing a source', () => {
  const [article] = mapKnowledgeArticles([articleRow({
    content: null,
    tags: null,
    read_minutes: null,
    source_name: null,
    source_url: 'javascript:alert(1)',
    verification_status: null,
  })]);

  assert.deepEqual(article.sections, []);
  assert.deepEqual(article.tags, []);
  assert.equal(article.readMinutes, null);
  assert.equal(article.sourceName, null);
  assert.equal(article.sourceUrl, null);
  assert.equal(article.sourceMetadata, undefined);
  assert.equal(getVerificationPresentation(article).kind, 'unknown');
});

test('filters by category and article title, summary, tags, and content', () => {
  const articles = mapKnowledgeArticles([
    articleRow(),
    articleRow({
      id: 'other',
      title: 'Composting basics',
      category: 'Waste Management',
      summary: 'Composting crop residue.',
      content: [{ heading: 'Compost', points: ['Process crop residue.'] }],
      tags: ['compost'],
    }),
  ]);

  assert.deepEqual(filterKnowledgeArticles(articles, '  COVERED BETWEEN ', 'all').map(({ id }) => id), ['article-1']);
  assert.deepEqual(filterKnowledgeArticles(articles, 'soil', 'Soil Health').map(({ id }) => id), ['article-1']);
  assert.deepEqual(filterKnowledgeArticles(articles, '', 'Waste Management').map(({ id }) => id), ['other']);
});

test('distinguishes verification status without overstating authority', () => {
  const [base] = mapKnowledgeArticles([articleRow()]);
  const withStatus = (verificationStatus, sourceName = base.sourceName, sourceUrl = base.sourceUrl) => ({
    ...base,
    verificationStatus,
    sourceName,
    sourceUrl,
  });

  assert.equal(getVerificationPresentation(base).label, 'Educational information');
  assert.equal(getVerificationPresentation(withStatus('Needs Verification')).kind, 'pending');
  assert.equal(getVerificationPresentation(withStatus('Outdated')).kind, 'outdated');
  assert.equal(getVerificationPresentation(withStatus('Verified', null, null)).kind, 'pending');
  assert.equal(getVerificationPresentation(withStatus('Verified')).kind, 'verified');
  assert.equal(getVerificationPresentation(withStatus('Source-backed')).kind, 'source-backed');
});

test('derives loading, error, empty, and ready states', () => {
  assert.equal(getKnowledgeContentState(true, null, 2), 'loading');
  assert.equal(getKnowledgeContentState(false, 'Unavailable', 2), 'error');
  assert.equal(getKnowledgeContentState(false, null, 0), 'empty');
  assert.equal(getKnowledgeContentState(false, null, 2), 'ready');
});

test('verifies live schema articles, categories, search, and sources metadata', () => {
  const liveSources = mapKnowledgeSources([
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'ICAR',
      organization: 'Indian Council of Agricultural Research',
      website_url: 'https://icar.org.in',
      authority_type: 'Apex Agricultural Research Body',
      description: 'Coordinates agricultural education and research.',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      name: 'APEDA (NPOP)',
      organization: 'Agricultural and Processed Food Products Export Development Authority',
      website_url: 'https://apeda.gov.in',
      authority_type: 'National Organic Regulatory Authority',
      description: 'Regulates export and National Programme for Organic Production.',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      name: 'ICAR-CPCRI',
      organization: 'Central Plantation Crops Research Institute',
      website_url: 'https://cpcri.icar.gov.in',
      authority_type: 'National Plantation Crop Research Institute',
      description: 'Plantation crop research.',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      name: 'ICAR-IISR',
      organization: 'Indian Institute of Spices Research',
      website_url: 'https://spices.res.in',
      authority_type: 'National Spices Research Institute',
      description: 'Spices research.',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      name: 'CIBRC / DPPQS',
      organization: 'Central Insecticides Board & Registration Committee',
      website_url: 'https://ppqs.gov.in',
      authority_type: 'Statutory Pesticide Regulatory Board',
      description: 'Pesticide registration and label approvals.',
    },
  ]);

  const liveArticles = mapKnowledgeArticles([
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      title: 'Organic Conversion & Management Standards under NPOP',
      category: 'Organic Farming',
      summary: 'Authoritative breakdown of the National Programme for Organic Production conversion requirements, buffer demarcation, and farm audit registers.',
      content: [
        { heading: 'Conversion Periods Required', points: ['Under NPOP standards, annual field crops require a minimum of 2 years.'] },
        { heading: 'Buffer Zones & Contamination Prevention', points: ['Maintain a distinct boundary or physical vegetative barrier.'] },
      ],
      tags: ['organic', 'npop', 'certification'],
      read_minutes: 6,
      source_name: 'APEDA - National Programme for Organic Production (NPOP)',
      source_url: 'https://apeda.gov.in/organic',
      last_verified: '2026-09-24',
      verification_status: 'General Agricultural Information',
      is_published: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      title: 'Integrated Pest Management (IPM) Decision Hierarchy',
      category: 'Pest & IPM',
      summary: 'The ICAR-recommended step-by-step decision framework emphasizing prevention, biological agents, and judicious use of interventions.',
      content: [
        { heading: 'Hierarchy of Intervention', points: ['Step 1 - Cultural & Mechanical: Sanitation, yellow sticky traps.'] },
      ],
      tags: ['ipm', 'pest', 'biological-control'],
      read_minutes: 5,
      source_name: 'ICAR Integrated Pest Management Guidelines',
      source_url: 'https://icar.org.in',
      last_verified: '2026-09-24',
      verification_status: 'General Agricultural Information',
      is_published: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      title: 'Soil Organic Carbon Management in Plantation Agroforestry',
      category: 'Soil Health',
      summary: 'Methods to build and maintain soil organic carbon (SOC) levels above 1.0% in high-rainfall tropical plantation soils.',
      content: [
        { heading: 'Why Soil Organic Carbon Matters', points: ['SOC directly determines cation exchange capacity.'] },
      ],
      tags: ['soil', 'carbon', 'agroforestry'],
      read_minutes: 7,
      source_name: 'ICAR-CPCRI Soil Science Bulletin',
      source_url: 'https://cpcri.icar.gov.in',
      last_verified: '2026-09-24',
      verification_status: 'General Agricultural Information',
      is_published: true,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000004',
      title: 'Farm Residue Recycling & Vermicomposting Technology',
      category: 'Waste Management',
      summary: 'Standard operating procedure for converting farm crop residue, dried arecanut husks and cattle manure into vermicompost.',
      content: [
        { heading: 'Waste Segregation and Preparation', points: ['Segregate fibrous biomass from soft leaves and animal dung.'] },
      ],
      tags: ['waste', 'compost', 'vermicompost'],
      read_minutes: 5,
      source_name: 'ICAR-CPCRI Waste Management Technology',
      source_url: 'https://cpcri.icar.gov.in',
      last_verified: '2026-09-24',
      verification_status: 'General Agricultural Information',
      is_published: true,
    },
  ], liveSources);

  assert.equal(liveArticles.length, 4);
  assert.equal(liveSources.length, 5);

  // Category filtering
  assert.equal(filterKnowledgeArticles(liveArticles, '', 'Organic Farming').length, 1);
  assert.equal(filterKnowledgeArticles(liveArticles, '', 'Pest & IPM').length, 1);
  assert.equal(filterKnowledgeArticles(liveArticles, '', 'Soil Health').length, 1);
  assert.equal(filterKnowledgeArticles(liveArticles, '', 'Waste Management').length, 1);
  assert.equal(filterKnowledgeArticles(liveArticles, '', 'all').length, 4);

  // Search by title
  assert.equal(filterKnowledgeArticles(liveArticles, 'Vermicomposting', 'all').length, 1);
  // Search by summary phrase
  assert.equal(filterKnowledgeArticles(liveArticles, 'buffer demarcation', 'all').length, 1);
  // Search by content section point phrase
  assert.equal(filterKnowledgeArticles(liveArticles, 'yellow sticky traps', 'all').length, 1);
  // Search with no matching results
  assert.equal(filterKnowledgeArticles(liveArticles, 'nonexistent phrase xyz', 'all').length, 0);

  // Combined search and category filter
  assert.equal(filterKnowledgeArticles(liveArticles, 'organic', 'Organic Farming').length, 1);
  assert.equal(filterKnowledgeArticles(liveArticles, 'organic', 'Waste Management').length, 0);

  // Verification status mapping: General Agricultural Information -> educational
  for (const article of liveArticles) {
    const pres = getVerificationPresentation(article);
    assert.equal(pres.kind, 'educational');
    assert.equal(pres.label, 'Educational information');
    assert.equal(pres.detail, 'Not an official recommendation.');
  }

  // Live source metadata association
  const npop = liveArticles.find((a) => a.id === 'e0000000-0000-0000-0000-000000000001');
  assert.equal(npop?.sourceMetadata?.name, 'APEDA (NPOP)');

  const ipm = liveArticles.find((a) => a.id === 'e0000000-0000-0000-0000-000000000002');
  assert.equal(ipm?.sourceMetadata?.name, 'ICAR');

  const soil = liveArticles.find((a) => a.id === 'e0000000-0000-0000-0000-000000000003');
  assert.equal(soil?.sourceMetadata?.name, 'ICAR-CPCRI');
});