import { createClient } from '@supabase/supabase-js'
import { stdin, stdout } from 'node:process'
import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
const apiKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const agmarknetBaseUrl = 'https://api.agmarknet.gov.in/v1'
const agmarknetHeaders = {
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://agmarknet.gov.in',
  Referer: 'https://agmarknet.gov.in/',
  'User-Agent': 'Mozilla/5.0',
}
const commodityAliases = new Map([
  ['arecanut', 'Arecanut(Betelnut/Supari)'],
])
const requestedCrops = (process.env.MARKET_DATA_CROPS ?? 'Tomato')
  .split(',')
  .map((crop) => crop.trim())
  .filter(Boolean)
const year = Number(process.env.MARKET_DATA_YEAR ?? new Date().getUTCFullYear())
const month = Number(process.env.MARKET_DATA_MONTH ?? new Date().getUTCMonth() + 1)

function isServiceRoleKey(key) {
  if (key.startsWith('sb_secret_')) return true

  try {
    const payload = key.split('.')[1]
    if (!payload) return false
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'))?.role === 'service_role'
  } catch {
    return false
  }
}

function promptForPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Run this script in an interactive terminal.'))
  }

  emitKeypressEvents(stdin)
  stdin.setRawMode(true)
  stdin.resume()
  stdout.write('SmartFarm account password (input hidden): ')

  return new Promise((resolve, reject) => {
    let password = ''

    const finish = (error) => {
      stdin.off('keypress', onKeypress)
      stdin.setRawMode(false)
      stdout.write('\n')
      if (error) reject(error)
      else resolve(password)
    }

    const onKeypress = (character, key) => {
      if (key?.ctrl && key.name === 'c') {
        finish(new Error('Prompt canceled.'))
      } else if (key?.name === 'return' || key?.name === 'enter') {
        finish()
      } else if (key?.name === 'backspace') {
        password = Array.from(password).slice(0, -1).join('')
      } else if (character && !key?.ctrl && !key?.meta) {
        password += character
      }
    }

    stdin.on('keypress', onKeypress)
  })
}

function redact(value, secrets) {
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /access.?token|refresh.?token|password|authorization|api.?key|secret|service.?role/i.test(key)
        ? '[REDACTED]'
        : redact(item, secrets),
    ]))
  }
  if (typeof value === 'string') {
    return secrets.reduce((text, secret) => secret ? text.replaceAll(secret, '[REDACTED]') : text, value)
  }
  return value
}

async function main() {
  if (!supabaseUrl || !apiKey) {
    throw new Error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in .env.')
  }
  if (requestedCrops.length < 1 || requestedCrops.length > 5 ||
    !Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Provide 1 to 5 commodity names and a valid year/month.')
  }
  if (isServiceRoleKey(apiKey)) {
    throw new Error('A service-role/secret key is not allowed. Configure an anon or publishable key in .env.')
  }

  const filtersResponse = await fetch(`${agmarknetBaseUrl}/daily-price-arrival/filters`, {
    headers: agmarknetHeaders,
    signal: AbortSignal.timeout(8_000),
  })
  if (!filtersResponse.ok) throw new Error(`AGMARKNET filters returned HTTP ${filtersResponse.status}.`)
  const filters = await filtersResponse.json()
  if (filters?.status !== true || !Array.isArray(filters?.data?.state_data) || !Array.isArray(filters?.data?.cmdt_data)) {
    throw new Error('AGMARKNET filters response is invalid.')
  }
  const states = filters.data.state_data.filter((state) =>
    String(state.state_name ?? '').trim().toLowerCase() === 'karnataka'
  )
  if (states.length !== 1 || !/^\d+$/.test(String(states[0].state_id))) {
    throw new Error('Karnataka state metadata did not resolve uniquely.')
  }
  const stateId = Number(states[0].state_id)

  const commodityResolutions = requestedCrops.map((requestedName) => {
    const metadataName = commodityAliases.get(requestedName.toLowerCase()) ?? requestedName
    const matches = filters.data.cmdt_data.filter((commodity) =>
      String(commodity.cmdt_name ?? '').trim().toLowerCase() === metadataName.toLowerCase()
    )
    if (matches.length !== 1 || !/^\d+$/.test(String(matches[0]?.cmdt_id)) ||
      !/^\d+$/.test(String(matches[0]?.cmdt_group_id))) {
      return {
        requested_name: requestedName,
        error: matches.length === 0 ? 'commodity_not_found' : 'commodity_ambiguous_or_invalid_metadata',
      }
    }
    return {
      requested_name: requestedName,
      matched_name: String(matches[0].cmdt_name).trim(),
      cmdt_id: Number(matches[0].cmdt_id),
      cmdt_group_id: Number(matches[0].cmdt_group_id),
      match_type: metadataName.toLowerCase() === requestedName.toLowerCase() ? 'exact' : 'explicit_alias',
    }
  })

  const readline = createInterface({ input: stdin, output: stdout })
  const email = (await readline.question('SmartFarm account email: ')).trim()
  readline.close()
  const password = await promptForPassword()
  const client = createClient(supabaseUrl, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) {
    throw new Error('Sign-in failed; verify the account credentials and try again.')
  }

  const accessToken = data.session.access_token
  const baseUrl = supabaseUrl.replace(/\/+$/, '')
  const results = []
  for (const resolution of commodityResolutions) {
    if (resolution.error) {
      results.push({ ...resolution, skipped: true })
      continue
    }

    const ingestionStartedAt = new Date().toISOString()
    const response = await fetch(`${baseUrl}/functions/v1/market-data`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'targeted',
        crops: [resolution.matched_name],
        year,
        month,
      }),
    })

    let json
    try {
      json = await response.json()
    } catch {
      json = { error: 'Edge Function returned a non-JSON response.' }
    }

    const cropResult = {
      ...resolution,
      function_status: response.status,
      ingestion: json,
      database_verification: null,
    }
    if (response.ok) {
      const dateStart = `${year}-${String(month).padStart(2, '0')}-01`
      const dateEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
      const applyIngestionFilters = (query) => query
        .eq('crop', resolution.matched_name)
        .eq('state', String(states[0].state_name).trim())
        .eq('source_name', 'AGMARKNET')
        .gte('price_date', dateStart)
        .lte('price_date', dateEnd)
        .gte('fetched_at', ingestionStartedAt)
      const countResult = await applyIngestionFilters(client.from('market_prices')
        .select('crop', { count: 'exact', head: true }))
      const sampleResult = await applyIngestionFilters(client.from('market_prices')
        .select('crop,state,district,market,price_date,min_price,max_price,modal_price,unit,source_name,source_url,variety,grade,fetched_at'))
        .order('price_date', { ascending: true })
        .limit(3)
      cropResult.database_verification = {
        succeeded: !countResult.error && !sampleResult.error,
        rows_for_ingestion: countResult.count ?? null,
        sample_records: sampleResult.data ?? [],
        error: countResult.error?.message ?? sampleResult.error?.message ?? null,
      }
    }
    results.push(cropResult)
  }

  console.log(JSON.stringify(redact({
    state: { name: states[0].state_name, state_id: stateId },
    requested_year: year,
    requested_month: month,
    results,
  }, [apiKey, accessToken, password]), null, 2))
}

main().catch((error) => {
  console.error(`Test failed: ${error.message}`)
  process.exitCode = 1
})