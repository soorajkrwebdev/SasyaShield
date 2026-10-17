import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { ORGANIC_TERMINOLOGY } from '../../lib/organicKnowledge';

type TermKey = keyof typeof ORGANIC_TERMINOLOGY;

const TERM_KEYS: TermKey[] = ['natural', 'organic-input', 'listed-in-standard', 'certified-product'];

const CERTIFICATION_STEPS = [
  {
    step: 1,
    title: 'Choose a Certification Body',
    description:
      'Apply to an APEDA-accredited certification body (CB). A list of accredited bodies is published on the APEDA website. The CB is your point of contact throughout the certification process.',
    note: 'This platform does not have a relationship with any certification body. Contact APEDA or accredited CBs directly.',
  },
  {
    step: 2,
    title: 'Farm Conversion Period',
    description:
      'Most organic standards require a conversion period (typically 2–3 years under NPOP) during which synthetic inputs must not be used. The CB will determine the applicable conversion start date based on your records.',
    note: 'Selecting "organic" or "in conversion" in your Sasyashield profile does not establish a conversion date with any certification body.',
  },
  {
    step: 3,
    title: 'Maintain Detailed Records',
    description:
      'Certification requires evidence-based farm records: field maps, input purchase receipts, application records, harvest records, and sales invoices. Inspectors review these during the annual audit.',
    note: 'Sasyashield farm records are farmer-managed tools. They are not automatically submitted to or verified by any certification body.',
  },
  {
    step: 4,
    title: 'Verify Inputs Before Use',
    description:
      'Every input used on the farm must be evaluated against the permitted-inputs list of the applicable standard (e.g. NPOP Annex 2). Check with your CB before introducing any new input.',
    note: 'The input library in this platform classifies materials by category. It does not confirm that a specific commercial product is permitted by your CB.',
  },
  {
    step: 5,
    title: 'Annual Inspection',
    description:
      'An accredited inspector visits the farm annually (and sometimes unannounced) to verify records, assess farm conditions, and confirm compliance with the standard.',
    note: '',
  },
  {
    step: 6,
    title: 'Certificate Issued',
    description:
      'If the CB is satisfied, a certificate is issued for the farm and specific crops. The certificate is valid for one year and must be renewed through continued compliance and re-inspection.',
    note: 'A certificate covers the farm and crop lot inspected — not all farms or all products of a farmer automatically.',
  },
];

const MYTHS = [
  {
    myth: '"I use only organic inputs, so my farm is organic certified."',
    reality:
      'Using inputs described as organic does not create certification. Certification requires application to an accredited body, a formal conversion period, records review, and physical inspection.',
  },
  {
    myth: '"My Sasyashield profile says \'organic\' — that means I am certified."',
    reality:
      'Your farming type selection in Sasyashield reflects your management approach as self-reported. It has no connection to APEDA accreditation or any third-party certification body.',
  },
  {
    myth: '"If an input is listed in NPOP Annex 2, any product of that type is automatically permitted."',
    reality:
      'NPOP Annex 2 lists material categories with conditions. Whether a specific commercial product meets those conditions depends on the product\'s manufacturing process, purity, and the certification body\'s evaluation.',
  },
  {
    myth: '"Organic farming and organic certification are the same thing."',
    reality:
      'Organic farming is a management approach. Organic certification is a formal, third-party verified system with legal implications for labelling and market claims. A farm can be managed organically without being certified.',
  },
];

export const OrganicCertificationSection: React.FC = () => {
  const [openTerm, setOpenTerm] = useState<TermKey | null>(null);
  const [showMythsAll, setShowMythsAll] = useState(false);

  return (
    <div className="space-y-8">
      {/* Regulatory notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-sm text-amber-900 block mb-1">
            Platform Scope Notice
          </strong>
          <p className="text-amber-800">
            Sasyashield is a farm management and agricultural knowledge platform. It{' '}
            <span className="font-bold underline">does not</span> issue, replace, or validate official organic
            certification. Organic certification in India is governed by authorised certification bodies
            under the{' '}
            <a
              href="https://apeda.gov.in/apedawebsite/organic/Organic_Products.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-900 underline"
            >
              National Programme for Organic Production (NPOP)
            </a>{' '}
            administered by APEDA, or through the{' '}
            <a
              href="https://pgsindia-ncof.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-900 underline"
            >
              PGS-India
            </a>{' '}
            participatory guarantee system.
          </p>
        </div>
      </div>

      {/* What terms mean */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Organic Terminology — What Each Term Actually Means
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          These four terms are not interchangeable. Using the wrong one can mislead buyers and create
          legal issues with APEDA and consumer protection authorities.
        </p>

        <div className="space-y-3">
          {TERM_KEYS.map(key => {
            const t = ORGANIC_TERMINOLOGY[key];
            const isOpen = openTerm === key;
            const borderColors: Record<TermKey, string> = {
              'natural':            'border-slate-200',
              'organic-input':      'border-emerald-200',
              'listed-in-standard': 'border-blue-200',
              'certified-product':  'border-indigo-200',
            };
            const headerColors: Record<TermKey, string> = {
              'natural':            'bg-slate-50 text-slate-800',
              'organic-input':      'bg-emerald-50 text-emerald-900',
              'listed-in-standard': 'bg-blue-50 text-blue-900',
              'certified-product':  'bg-indigo-50 text-indigo-900',
            };

            return (
              <div key={key} className={`rounded-2xl border ${borderColors[key]} overflow-hidden`}>
                <button
                  onClick={() => setOpenTerm(isOpen ? null : key)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between ${headerColors[key]} cursor-pointer`}
                >
                  <span className="font-bold text-sm">{t.term}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isOpen && (
                  <div className="px-4 py-3 bg-white space-y-2 text-xs">
                    <p className="text-slate-700 leading-relaxed">{t.definition}</p>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Practical example
                      </span>
                      <p className="text-slate-600">{t.example}</p>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Source: <span className="font-semibold">{t.source}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* How certification works */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          How Organic Certification Works (NPOP Process Overview)
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          A simplified overview of the NPOP certification pathway. Always confirm current requirements
          with your chosen accredited certification body — the process details may vary.
        </p>

        <div className="space-y-4">
          {CERTIFICATION_STEPS.map(s => (
            <div key={s.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                {s.step}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{s.description}</p>
                {s.note && (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                    <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{s.note}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
          <a
            href="https://apeda.gov.in/apedawebsite/organic/Organic_Products.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold hover:bg-emerald-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            APEDA / NPOP Official Page
          </a>
          <a
            href="https://pgsindia-ncof.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-semibold hover:bg-blue-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            PGS-India / NCOF Portal
          </a>
        </div>
      </div>

      {/* Common misconceptions */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Common Misconceptions About Organic Certification
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          These misunderstandings frequently arise. Clarity here protects farmers from legal risk.
        </p>

        <div className="space-y-4">
          {(showMythsAll ? MYTHS : MYTHS.slice(0, 2)).map((m, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-100 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-rose-900 italic">{m.myth}</span>
              </div>
              <div className="px-4 py-2.5 bg-emerald-50 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-emerald-900">{m.reality}</span>
              </div>
            </div>
          ))}
        </div>

        {!showMythsAll && (
          <button
            onClick={() => setShowMythsAll(true)}
            className="mt-4 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            Show all {MYTHS.length} misconceptions →
          </button>
        )}
      </div>
    </div>
  );
};
