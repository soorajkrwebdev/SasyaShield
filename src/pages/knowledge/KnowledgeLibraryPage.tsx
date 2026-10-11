import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  BookOpen,
  Search,
  ShieldCheck,
  Sprout,
  Bug,
  TestTube,
  Recycle,
  ExternalLink,
  Clock,
  Library,
  FileText,
  CloudSun,
  TrendingUp,
} from 'lucide-react';
import {
  filterKnowledgeArticles,
  getKnowledgeContentState,
  getVerificationPresentation,
  type KnowledgeArticle,
  type KnowledgeSource,
} from '../../lib/knowledgeHub';
import { loadKnowledgeHubData } from '../../services/knowledgeService';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Organic Farming': <Sprout className="w-4 h-4" />,
  'Pest & IPM': <Bug className="w-4 h-4" />,
  'Soil Health': <TestTube className="w-4 h-4" />,
  'Waste Management': <Recycle className="w-4 h-4" />,
  'Crop Management': <Sprout className="w-4 h-4" />,
  'Climate & Weather': <CloudSun className="w-4 h-4" />,
  'Market Awareness': <TrendingUp className="w-4 h-4" />,
  'Sustainable Agriculture': <ShieldCheck className="w-4 h-4" />,
};

const VERIFICATION_VARIANTS = {
  verified: 'emerald',
  'source-backed': 'blue',
  pending: 'amber',
  outdated: 'rose',
  educational: 'slate',
  unknown: 'slate',
} as const;

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function VerificationBadge({ article }: { article: KnowledgeArticle }) {
  const status = getVerificationPresentation(article);
  return (
    <Badge variant={VERIFICATION_VARIANTS[status.kind]} size="sm">
      {status.label}
    </Badge>
  );
}

export const KnowledgeLibraryPage: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [readerArticle, setReaderArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceWarning, setSourceWarning] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    void loadKnowledgeHubData().then((result) => {
      if (!active) return;
      setArticles(result.articles);
      setSources(result.sources);
      setError(result.error ?? null);
      setSourceWarning(result.sourceWarning);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [retryCount]);

  const categories = useMemo(
    () => [...new Set(articles.map((article) => article.category))].sort((a, b) => a.localeCompare(b)),
    [articles],
  );
  const totalReadMinutes = useMemo(
    () => articles.reduce((sum, article) => sum + (article.readMinutes ?? 0), 0),
    [articles],
  );
  const filteredArticles = useMemo(
    () => filterKnowledgeArticles(articles, search, activeCategory),
    [articles, search, activeCategory],
  );
  const contentState = getKnowledgeContentState(loading, error, articles.length);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryCount((count) => count + 1);
  };

  const resetFilters = () => {
    setSearch('');
    setActiveCategory('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Knowledge Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Agricultural articles and source metadata from the knowledge library
          </p>
        </div>
        <Badge variant="slate" size="sm">Database library</Badge>
      </div>

      <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/70 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-emerald-800 text-sm">Reference information, not a store</h4>
          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
            Article verification labels and source details reflect stored records. Educational or unverified
            material is not an official recommendation; confirm current requirements with the identified source.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-tight">{articles.length}</p>
            <p className="text-[11px] text-slate-500">Published articles</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-tight">{totalReadMinutes} min</p>
            <p className="text-[11px] text-slate-500">Listed reading time</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-tight">{sources.length}</p>
            <p className="text-[11px] text-slate-500">Source records</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3">
        <div className="flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles, summaries, tags, and article content..."
            aria-label="Search articles"
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search query"
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            All ({articles.length})
          </button>
          {categories.map((category) => {
            const count = articles.filter((article) => article.category === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors cursor-pointer ${
                  activeCategory === category
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {CATEGORY_ICONS[category] ?? <BookOpen className="w-4 h-4" />}
                {category} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {sourceWarning && (
        <div role="status" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
          {sourceWarning}
        </div>
      )}

      {contentState === 'loading' ? (
        <div role="status" className="py-16 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading agricultural articles...
        </div>
      ) : contentState === 'error' ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Knowledge library unavailable"
          description={error ?? 'The article library could not be loaded.'}
          actionText="Retry"
          onAction={retry}
        />
      ) : contentState === 'empty' ? (
        <EmptyState
          icon={<Library className="w-8 h-8" />}
          title="No published articles yet"
          description="Published articles will appear here when they are available in the knowledge library."
        />
      ) : filteredArticles.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title="No matching articles"
          description="Try a different keyword or clear the filters to browse the library."
          actionText="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setReaderArticle(article)}
              className="text-left bg-white rounded-2xl border border-slate-200/70 p-4 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5">
                  {CATEGORY_ICONS[article.category] ?? <BookOpen className="w-4 h-4" />}
                  {article.category}
                </span>
                <VerificationBadge article={article} />
              </div>

              <h3 className="text-sm font-bold text-slate-800 leading-snug">{article.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed flex-1">{article.summary}</p>

              <div className="flex flex-wrap gap-1 mt-3">
                {article.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-full px-1.5 py-0.5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 w-full">
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {article.readMinutes ? `${article.readMinutes} min read` : 'Reading time unavailable'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <BookOpen className="w-3.5 h-3.5" />
                  Read
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ExternalLink className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">Sources in the library</h3>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Source names, authority descriptions, and links are displayed from stored source records.
        </p>
        {sources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.map((source) => (
              <div key={source.id} className="rounded-xl border border-slate-200/70 p-3">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-snug">{source.name}</p>
                    {source.organization && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{source.organization}</p>
                    )}
                    {source.authorityType && (
                      <p className="text-[10px] text-slate-500 mt-1">{source.authorityType}</p>
                    )}
                    {source.description && (
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{source.description}</p>
                    )}
                    {source.websiteUrl ? (
                      <a
                        href={source.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[10px] text-emerald-700 mt-1 truncate hover:underline"
                      >
                        {source.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="block text-[10px] text-slate-400 mt-1">Website not recorded</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sourceWarning ? (
          <p className="text-xs text-slate-500">Source directory details are currently unavailable.</p>
        ) : (
          <p className="text-xs text-slate-500">No source records are currently available.</p>
        )}
      </div>

      <Modal
        isOpen={readerArticle !== null}
        onClose={() => setReaderArticle(null)}
        title={readerArticle?.title ?? ''}
        subtitle={
          readerArticle
            ? `${readerArticle.category}${readerArticle.readMinutes ? ` - ${readerArticle.readMinutes} min read` : ''}`
            : undefined
        }
        maxWidth="2xl"
      >
        {readerArticle && (
          <div className="space-y-5">
            <div className="bg-emerald-50/60 rounded-xl border border-emerald-200/60 p-3">
              <p className="text-xs text-emerald-800 leading-relaxed">{readerArticle.summary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge article={readerArticle} />
              {readerArticle.lastVerified && (
                <span className="text-[11px] text-slate-500">Last checked: {formatDate(readerArticle.lastVerified)}</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{getVerificationPresentation(readerArticle).detail}</p>

            {readerArticle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {readerArticle.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-full px-2 py-0.5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {readerArticle.sections.length > 0 ? readerArticle.sections.map((section) => (
              <div key={section.heading}>
                <h4 className="text-sm font-bold text-slate-800 mb-2">{section.heading}</h4>
                {section.points.length > 0 && (
                  <ul className="space-y-1.5">
                    {section.points.map((point, index) => (
                      <li key={`${section.heading}-${index}`} className="text-[13px] text-slate-600 flex gap-2 leading-relaxed">
                        <span className="text-emerald-500 shrink-0">-</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )) : (
              <p className="text-xs text-slate-500">No structured article content is stored.</p>
            )}

            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Stored source attribution</p>
              {readerArticle.sourceName ? (
                <p className="text-xs font-semibold text-slate-700">{readerArticle.sourceName}</p>
              ) : (
                <p className="text-xs text-slate-500">No source name is recorded for this article.</p>
              )}
              {readerArticle.sourceUrl ? (
                <a
                  href={readerArticle.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 mt-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open article source
                </a>
              ) : (
                <p className="text-xs text-slate-500 mt-1">No source link is recorded for this article.</p>
              )}
              {readerArticle.sourceMetadata && (
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                  <p className="text-xs font-semibold text-slate-700">{readerArticle.sourceMetadata.name}</p>
                  {readerArticle.sourceMetadata.organization && (
                    <p className="text-[11px] text-slate-600">{readerArticle.sourceMetadata.organization}</p>
                  )}
                  {readerArticle.sourceMetadata.authorityType && (
                    <p className="text-[11px] text-slate-500">{readerArticle.sourceMetadata.authorityType}</p>
                  )}
                  {readerArticle.sourceMetadata.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">{readerArticle.sourceMetadata.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};