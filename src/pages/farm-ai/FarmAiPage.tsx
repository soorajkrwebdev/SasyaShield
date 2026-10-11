import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Bot,
  Send,
  Loader2,
  Trash2,
  Plus,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Building2,
} from 'lucide-react';
import { useFarmData } from '../../contexts/FarmContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  generateFarmAiResponse,
  fetchAiConversations,
  saveAiConversation,
  deleteAiConversation,
  FarmAiContext,
} from '../../services/aiService';
import { AiMessageItem, AiConversationRecord, AiResponseType } from '../../types';


const QUICK_PROMPTS = [
  'What pest observations did I record recently?',
  'What IPM actions did I take?',
  'What pesticide applications did I record?',
  'Explain the pesticide advisory for my crop.',
  'What organic inputs are relevant to my arecanut crop?',
  'Explain vermicompost.',
  'What should I monitor after my pesticide application?',
  'What does my latest soil test show?',
  'What weather conditions are forecast around my farm?',
  'What market records exist for black pepper?',
  'What organic practices have I recorded?',
];

export const FarmAiPage: React.FC = () => {
  const { user } = useAuth();
  const {
    farms,
    crops,
    activities,
    inputs,
    pestObservations,
    ipmRecords,
    pesticideApplications,
    pestFollowUps,
    soilTests,
    waterTests,
    expenses,
    harvests,
    selectedFarm,
    setSelectedFarmId,
  } = useFarmData();

  // Multi-conversation state
  const [conversations, setConversations] = useState<AiConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('New Consultation');
  const [messages, setMessages] = useState<AiMessageItem[]>([
    {
      role: 'assistant',
      title: 'Namaste! I am your Farm AI Intelligence Layer',
      response_type: 'General Explanation',
      source_level: 1,
      content:
        'I am connected to your live farm database and grounded in verified agricultural research (ICAR, CPCRI, IISR, APEDA, CIBRC).\n\nI can answer questions regarding your pest observations, IPM decisions, pesticide applications, organic nutrition, soil test results, weather forecasts, and market data.',
      sections: [
        {
          heading: '4-Level Source Hierarchy Guarantee',
          points: [
            'Level 1: Verified agricultural knowledge (ICAR packages of practices, registered CIBRC labels).',
            'Level 2: Your verified farm records (pest observations, IPM records, soil cards).',
            'Level 3: Live external telemetry (Weather models & AGMARKNET market prices).',
            'Level 4: AI synthesis (strictly constrained to never override or contradict Level 1 sources).',
          ],
        },
        {
          heading: 'Absolute Safety Policy',
          points: [
            'Dosages, dilutions, pre-harvest intervals (PHI), and re-entry intervals (REI) are NEVER fabricated or hallucinated.',
            'Organic products are never claimed as "NPOP certified" without explicit certificate verification.',
          ],
        },
      ],
      sources: [
        {
          organization: 'ICAR / APEDA / CIBRC',
          document: 'Authoritative Agricultural Standards',
          reference: 'SmartFarm Grounded Intelligence',
          url: 'https://icar.org.in',
        },
      ],
      timestamp: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat window to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoadingHistory(true);
    try {
      const records = await fetchAiConversations(user.id);
      setConversations(records);
      // Only auto-load the latest conversation on first mount (when no conversation is active).
      // We read activeConversationId with a functional setter to avoid adding it as a dep.
      setActiveConversationId(prevId => {
        if (!prevId && records.length > 0) {
          const latest = records[0];
          setActiveTitle(latest.title);
          if (latest.messages && latest.messages.length > 0) {
            setMessages(latest.messages);
          }
          return latest.id;
        }
        return prevId;
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.id]); // activeConversationId intentionally excluded to avoid re-running on conv switches

  // Load conversation history on mount
  useEffect(() => {
    if (user?.id) {
      loadHistory();
    }
  }, [user?.id, loadHistory]);

  const handleSelectConversation = (conv: AiConversationRecord) => {
    setActiveConversationId(conv.id);
    setActiveTitle(conv.title);
    setMessages(conv.messages && conv.messages.length > 0 ? conv.messages : []);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setActiveTitle('New Consultation');
    setMessages([
      {
        role: 'assistant',
        title: 'New Farm Consultation Started',
        response_type: 'General Explanation',
        source_level: 1,
        content: `Ready to assist with your farm records and authoritative agricultural knowledge for ${selectedFarm ? selectedFarm.name : 'your farm'}.`,
        sections: [
          {
            heading: 'How can I assist today?',
            points: [
              'Review recent pest observations or IPM interventions.',
              'Explain label safety, PHI, or REI for plant protection products.',
              'Advise on organic compost, biofertilizers, or Jeevamrutha schedules.',
              'Analyze your latest soil health report.',
            ],
          },
        ],
        sources: [
          {
            organization: 'SmartFarm 2.0',
            document: 'Farm-Aware AI System',
            reference: 'Interactive Session',
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to delete this conversation record?')) {
      const ok = await deleteAiConversation(user.id, convId);
      if (ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (activeConversationId === convId) {
          handleNewConversation();
        }
      }
    }
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || thinking) return;

    setInput('');
    const userMsg: AiMessageItem = {
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setThinking(true);

    // Assemble rich farm context
    const aiContext: FarmAiContext = {
      farms,
      crops,
      activities,
      inputs,
      pestObservations,
      ipmRecords,
      pesticideApplications,
      pestFollowUps,
      soilTests,
      waterTests,
      expenses,
      harvests,
      selectedFarm,
      weather: null, // Weather data will be populated by coordinates in service
    };

    try {
      const response = await generateFarmAiResponse(q, aiContext);
      const updatedMessages = [...newMessages, response.message];
      setMessages(updatedMessages);

      // Persist conversation to Supabase
      if (user?.id) {
        const title = activeConversationId
          ? activeTitle
          : q.slice(0, 45) + (q.length > 45 ? '...' : '');

        const savedId = await saveAiConversation(
          user.id,
          activeConversationId,
          title,
          updatedMessages,
          { farm_id: selectedFarm?.id, crop_count: crops.length }
        );

        if (!activeConversationId && savedId) {
          setActiveConversationId(savedId);
          setActiveTitle(title);
          loadHistory();
        }
      }
    } catch (err) {
      console.error('AI chat error:', err);
      const errorMsg: AiMessageItem = {
        role: 'assistant',
        title: 'Advisory Processing Notice',
        response_type: 'Uncertain / Insufficient Evidence',
        source_level: 4,
        content: 'Unable to complete agricultural consultation at this moment. Please check your network connection or verify farm records.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setThinking(false);
    }
  };

  const getBadgeVariant = (type?: AiResponseType): 'emerald' | 'amber' | 'blue' | 'slate' | 'rose' | 'teal' => {
    switch (type) {
      case 'Farm Record':
        return 'emerald';
      case 'Agricultural Knowledge':
        return 'blue';
      case 'Weather Context':
        return 'blue';
      case 'Market Data':
        return 'amber';
      case 'Uncertain / Insufficient Evidence':
        return 'rose';
      default:
        return 'slate';
    }
  };

  const getSourceLevelBadge = (level?: number) => {
    switch (level) {
      case 1:
        return <Badge variant="blue">Level 1: Verified Ag Science</Badge>;
      case 2:
        return <Badge variant="emerald">Level 2: Farm Ledger</Badge>;
      case 3:
        return <Badge variant="indigo">Level 3: Live External Telemetry</Badge>;
      case 4:
        return <Badge variant="amber">Level 4: AI Synthesis</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Top Banner: Farm Selection & Safety Mandate */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-gray-900">Farm AI Intelligence Layer</h1>
              <Badge variant="emerald">Farm-Aware & Grounded</Badge>
            </div>
            <p className="text-xs text-gray-500">
              Zero hallucination of pesticide dosages, PHI, or REI. Fully grounded in ICAR, CPCRI, IISR, and your farm records.
            </p>
          </div>
        </div>

        {/* Farm Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-600">Active Farm Context:</span>
          <select
            value={selectedFarm?.id || ''}
            onChange={(e) => {
              setSelectedFarmId(e.target.value || null);
            }}
            className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">All Farms ({farms.length})</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} ({farm.farming_method || 'Standard'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chat Workspace with Sidebar */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Sidebar: Multi-Conversation History */}
        <div className="w-64 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col hidden lg:flex">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Consultations</span>
            </div>
            <button
              onClick={handleNewConversation}
              className="p-1 hover:bg-emerald-50 text-emerald-700 rounded-md transition-colors"
              title="New Consultation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Loading sessions...</span>
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No previous consultations.</p>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 font-medium border border-emerald-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="truncate">{c.title || 'Untitled Consultation'}</p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              className="w-full justify-center text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Consultation
            </Button>
          </div>
        </div>

        {/* Right Chat Column */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-h-0">
          {/* Chat Messages Viewport */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-xl p-4 ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                        : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-bl-none shadow-xs'
                    }`}
                  >
                    {/* Header for Assistant Messages */}
                    {!isUser && (
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-200/60">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-xs text-gray-900">
                            {m.title || 'Farm AI Advisory'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {m.response_type && (
                            <Badge variant={getBadgeVariant(m.response_type)}>
                              {m.response_type}
                            </Badge>
                          )}
                          {getSourceLevelBadge(m.source_level)}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed space-y-2">
                      {m.content}
                    </div>

                    {/* Structured Sections */}
                    {!isUser && m.sections && m.sections.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-2.5">
                        {m.sections.map((sec, sIdx) => (
                          <div key={sIdx} className="bg-white/80 p-2.5 rounded-lg border border-gray-200/60">
                            <p className="text-xs font-bold text-gray-800 mb-1 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                              {sec.heading}
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600 ml-1">
                              {sec.points.map((pt, pIdx) => (
                                <li key={pIdx} className="leading-snug">
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Grounded Source Cards */}
                    {!isUser && m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-200/60">
                        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-gray-600 mb-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Grounded Institutional Sources:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.sources.map((s, srcIdx) => (
                            <div
                              key={srcIdx}
                              className="inline-flex items-center space-x-1.5 bg-emerald-50/80 border border-emerald-200/80 px-2 py-1 rounded text-[11px] text-emerald-900"
                            >
                              <span className="font-semibold">{s.organization}</span>
                              <span className="text-emerald-700/80">— {s.document}</span>
                              {s.reference && (
                                <span className="text-emerald-600 text-[10px]">({s.reference})</span>
                              )}
                              {s.url && (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-900 inline-flex items-center ml-1"
                                >
                                  <ExternalLink className="w-3 h-3 ml-0.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-[10px] mt-2 text-right ${
                        isUser ? 'text-emerald-100' : 'text-gray-400'
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {thinking && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-600 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Cross-referencing farm records with ICAR/CPCRI/CIBRC knowledge repository...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Carousel */}
          <div className="p-2 bg-gray-50/70 border-t border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-gray-500 flex items-center pl-1">
              <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
              Quick:
            </span>
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={thinking}
                className="text-[11px] bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your pest observations, IPM decisions, pesticide safety, organic inputs..."
                disabled={thinking}
                className="flex-1 text-xs md:text-sm border border-gray-300 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-50"
              />
              <Button
                type="submit"
                disabled={thinking || !input.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {thinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              Advisories do not replace registered labels or qualified agricultural authorities. Never invent chemical dosages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FarmAiPage;
