export interface KnowledgeSourceRow {
  id: string;
  name: string;
  organization: string;
  website_url: string | null;
  authority_type: string;
  description: string | null;
}

export interface KnowledgeArticleRow {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: unknown;
  tags: string[] | null;
  read_minutes: number | null;
  source_name: string | null;
  source_url: string | null;
  last_verified: string | null;
  verification_status: string | null;
  is_published: boolean;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  organization?: string;
  websiteUrl?: string;
  authorityType?: string;
  description?: string;
}

export interface KnowledgeSection {
  heading: string;
  points: string[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  sections: KnowledgeSection[];
  tags: string[];
  readMinutes: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceMetadata?: KnowledgeSource;
  lastVerified: string | null;
  verificationStatus: string | null;
}

export type KnowledgeContentState = 'loading' | 'error' | 'empty' | 'ready';

function safeHttpUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapSections(value: unknown): KnowledgeSection[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.heading !== 'string') return [];
    const points = Array.isArray(item.points)
      ? item.points.filter((point): point is string => typeof point === 'string')
      : [];

    return item.heading.trim() ? [{ heading: item.heading, points }] : [];
  });
}

export function mapKnowledgeSources(rows: KnowledgeSourceRow[]): KnowledgeSource[] {
  return rows.flatMap((row) => {
    const name = row.name?.trim();
    if (!name) return [];

    return [{
      id: row.id,
      name,
      organization: row.organization?.trim() || undefined,
      websiteUrl: safeHttpUrl(row.website_url),
      authorityType: row.authority_type?.trim() || undefined,
      description: row.description?.trim() || undefined,
    }];
  });
}

export function mapKnowledgeArticles(
  rows: KnowledgeArticleRow[],
  sources: KnowledgeSource[] = [],
): KnowledgeArticle[] {
  const sourcesByOrigin = new Map<string, KnowledgeSource[]>();
  for (const source of sources) {
    const origin = originOf(source.websiteUrl);
    if (!origin) continue;
    sourcesByOrigin.set(origin, [...(sourcesByOrigin.get(origin) ?? []), source]);
  }

  return rows.flatMap((row) => {
    if (row.is_published !== true) return [];

    const sourceUrl = safeHttpUrl(row.source_url) ?? null;
    const matchingSources = sourceUrl
      ? sourcesByOrigin.get(originOf(sourceUrl) ?? '') ?? []
      : [];

    return [{
      id: row.id,
      title: row.title,
      category: row.category,
      summary: row.summary,
      sections: mapSections(row.content),
      tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      readMinutes: typeof row.read_minutes === 'number' && row.read_minutes > 0 ? row.read_minutes : null,
      sourceName: row.source_name?.trim() || null,
      sourceUrl,
      sourceMetadata: matchingSources.length === 1 ? matchingSources[0] : undefined,
      lastVerified: row.last_verified,
      verificationStatus: row.verification_status?.trim() || null,
    }];
  });
}

export function filterKnowledgeArticles(
  articles: KnowledgeArticle[],
  search: string,
  category: string | 'all',
): KnowledgeArticle[] {
  const query = search.trim().toLocaleLowerCase();

  return articles.filter((article) => {
    if (category !== 'all' && article.category !== category) return false;
    if (!query) return true;

    const searchable = [
      article.title,
      article.summary,
      article.category,
      article.tags.join(' '),
      article.sections.map((section) => `${section.heading} ${section.points.join(' ')}`).join(' '),
      article.sourceName ?? '',
      article.sourceMetadata?.name ?? '',
      article.sourceMetadata?.organization ?? '',
    ].join(' ').toLocaleLowerCase();

    return searchable.includes(query);
  });
}

export interface VerificationPresentation {
  kind: 'verified' | 'source-backed' | 'pending' | 'outdated' | 'educational' | 'unknown';
  label: string;
  detail: string;
}

export function getVerificationPresentation(article: KnowledgeArticle): VerificationPresentation {
  const status = article.verificationStatus?.trim() ?? '';
  const normalized = status.toLocaleLowerCase();

  if (/outdated|expired|stale|review required/.test(normalized)) {
    return {
      kind: 'outdated',
      label: 'Outdated / review required',
      detail: status,
    };
  }

  if (/pending|needs verification|unverified|for review/.test(normalized)) {
    return {
      kind: 'pending',
      label: 'Pending verification',
      detail: status,
    };
  }

  if (/general agricultural information|educational/.test(normalized)) {
    return {
      kind: 'educational',
      label: 'Educational information',
      detail: 'Not an official recommendation.',
    };
  }

  if (/source[ -]backed/.test(normalized)) {
    return {
      kind: 'source-backed',
      label: 'Source-backed',
      detail: 'Stored as source-backed; this does not by itself mean the content is an official recommendation.',
    };
  }

  if (/^verified(?:\b|\s)/.test(normalized)) {
    if (article.sourceName && article.sourceUrl) {
      return {
        kind: 'verified',
        label: 'Verified against identified source',
        detail: status,
      };
    }

    return {
      kind: 'pending',
      label: 'Source details incomplete',
      detail: 'The stored verification status has no complete source name and link.',
    };
  }

  return {
    kind: 'unknown',
    label: status || 'Verification status unavailable',
    detail: 'Status is shown as stored; do not treat it as an official recommendation.',
  };
}

export function getKnowledgeContentState(
  loading: boolean,
  error: string | null,
  articleCount: number,
): KnowledgeContentState {
  if (loading) return 'loading';
  if (error) return 'error';
  return articleCount === 0 ? 'empty' : 'ready';
}