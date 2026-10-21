// Focused regression tests for the final UI/UX improvements.
// Run: node scripts/final-ui-ux.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(path.join(root, 'src', p), 'utf8');
let passed = 0;
const ok = (name, cond) => {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  PASS: ${name}`);
};

// 1. Farm AI composer/layout logic (static guarantees)
{
  const page = src('pages/farm-ai/FarmAiPage.tsx');
  ok('composer prevents horizontal overflow', page.includes('overflow-x-hidden') && page.includes('min-w-0'));
  ok('composer keeps send button in-viewport', page.includes('shrink-0') && page.includes('aria-label'));
  ok('Enter submits, Shift+Enter newlines', page.includes("e.key === 'Enter'") && page.includes('!e.shiftKey'));
  ok('empty prompts blocked + send disabled while thinking', page.includes('!input.trim()') && page.includes('if (!q || thinking) return;'));
  ok('long content wraps', page.includes('break-words'));
}

// 2. Empty jobs vs fetch errors
{
  const svc = src('services/farmJobService.ts');
  ok('getPublicFarmJobs throws on failure (not silent [])', svc.includes('throw new Error'));
  const page = src('pages/farm-work/FarmWorkBoardPage.tsx');
  ok('empty-state copy present', page.includes('No Farm Jobs Listed Yet'));
  ok('filter-no-match copy present', page.includes('No jobs match your search.'));
  ok('clear filters action present', page.includes('Clear Filters'));
  ok('error + retry path present', page.includes('Could not load farm jobs') && page.includes('onRetry={fetchJobs}'));
}

// 2b. Inquiry count calculation
{
  const page = src('pages/farm-work/FarmWorkBoardPage.tsx');
  const svc = src('services/farmJobService.ts');
  ok('count looks up inquiry_count from myJobs (not from job directly)', page.includes('myJobs.find(ownedJob => ownedJob.id === job.id)?.inquiry_count'));
  ok('count does not read job.inquiry_count directly', !page.includes("job.inquiry_count"));
  ok('JobInquiryModal receives onSuccess callback', page.includes('onSuccess={() => fetchJobs()}'));
  ok('getFarmerJobs does not use nested job_inquiries select', !svc.includes("job_inquiries(id)"));
  ok('getFarmerJobs fetches inquiries separately', svc.includes('.in(\'job_id\', jobIds)'));
  ok('getFarmerJobs calculates inquiry counts per job', svc.includes('inquiryCounts[job.id]'));
}

// 3. Theme option removed — app is light-only (no toggle anywhere).
{
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  ok('no dark-mode toggle component', !existsSync(path.join(root, 'src', 'components', 'common', 'ThemeToggle.tsx')));
  ok('no theme provider', !existsSync(path.join(root, 'src', 'contexts', 'ThemeContext.tsx')));
  ok(
    'no toggle rendered',
    !src('components/layout/Header.tsx').includes('ThemeToggle') &&
    !src('components/layout/PublicShell.tsx').includes('ThemeToggle') &&
    !src('pages/LandingPage.tsx').includes('ThemeToggle') &&
    !src('pages/AuthPage.tsx').includes('ThemeToggle') &&
    !src('App.tsx').includes('ThemeToggle')
  );
  ok('startup forces light theme', html.includes("dataset.theme = 'light'"));
}

// 4. Reverse-geocode mapping + fallback
{
  ok('useReverseGeocode exists', existsSync(path.join(root, 'src', 'hooks', 'useReverseGeocode.ts')));
  const hook = src('hooks/useReverseGeocode.ts');
  ok('Nominatim reverse endpoint + caching', hook.includes('nominatim.openstreetmap.org/reverse') && hook.includes('localStorage'));
  ok('address formatter prefers locality', hook.includes('formatNominatimAddress') && hook.includes('village'));
  const weather = src('pages/weather/WeatherPage.tsx');
  ok('weather keeps farm name + coords as secondary', weather.includes('selectedFarm.name') && weather.includes('toFixed(4)'));
  ok('weather fetch still uses coordinates', weather.includes('useWeather(') && weather.includes('coords?.latitude'));
}

// 5. State/district dependency + validation
{
  ok('bundled dataset exists', existsSync(path.join(root, 'src', 'data', 'indianStates.ts')));
  const data = src('data/indianStates.ts');
  ok('all states present incl. Karnataka + UTs', data.includes("'Karnataka'") && data.includes("'Delhi'") && data.includes("'Ladakh'"));
  ok('district lookup + validation helpers', data.includes('getDistrictsForState') && data.includes('isValidStateDistrict'));
  const auth = src('pages/AuthPage.tsx');
  ok('registration uses dropdowns with placeholders', auth.includes('Select state/UT') && auth.includes('Select district'));
  ok('district disabled until state + cleared on change', auth.includes('disabled={!state}') && auth.includes("setDistrict('')"));
  ok('invalid combinations blocked', auth.includes('isValidStateDistrict'));
}

console.log(`\nAll ${passed} final UI/UX checks passed.`);
