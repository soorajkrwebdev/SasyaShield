import { supabase, supabaseEnvIssue } from '../lib/supabase';
import {
  mapKnowledgeArticles,
  mapKnowledgeSources,
  type KnowledgeArticle,
  type KnowledgeArticleRow,
  type KnowledgeSource,
  type KnowledgeSourceRow,
} from '../lib/knowledgeHub';

export interface KnowledgeHubData {
  articles: KnowledgeArticle[];
  sources: KnowledgeSource[];
  error?: string;
  sourceWarning?: string;
}

export async function loadKnowledgeHubData(): Promise<KnowledgeHubData> {
  if (!supabase) {
    return {
      articles: [],
      sources: [],
      error: supabaseEnvIssue?.message ?? 'The knowledge library is unavailable.',
    };
  }

  try {
    const [articleResult, sourceResult] = await Promise.all([
      supabase
        .from('knowledge_articles')
        .select('id, title, category, summary, content, tags, read_minutes, source_name, source_url, last_verified, verification_status, is_published')
        .eq('is_published', true)
        .order('title', { ascending: true }),
      supabase
        .from('knowledge_sources')
        .select('id, name, organization, website_url, authority_type, description')
        .order('name', { ascending: true }),
    ]);

    if (articleResult.error) {
      return { articles: [], sources: [], error: articleResult.error.message };
    }

    const sources = sourceResult.error
      ? []
      : mapKnowledgeSources((sourceResult.data ?? []) as KnowledgeSourceRow[]);

    return {
      articles: mapKnowledgeArticles((articleResult.data ?? []) as KnowledgeArticleRow[], sources),
      sources,
      sourceWarning: sourceResult.error
        ? 'Source directory metadata could not be loaded. Stored article attributions remain available.'
        : undefined,
    };
  } catch (error) {
    return {
      articles: [],
      sources: [],
      error: error instanceof Error ? error.message : 'The knowledge library could not be loaded.',
    };
  }
}