const ENDPOINT = 'https://api.agmarknet.gov.in/v1/daily-price-arrival/filters';

type ResponseType = 'JSON' | 'API error' | 'connection error' | 'non-JSON';

type ConnectivityResult = {
  status: number | null;
  reachable: boolean;
  responseType: ResponseType;
  topLevelFields: string[];
  connectionRefused: boolean;
};

function jsonResponse(result: ConnectivityResult): Response {
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async () => {
  const result: ConnectivityResult = {
    status: null,
    reachable: false,
    responseType: 'connection error',
    topLevelFields: [],
    connectionRefused: false,
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://agmarknet.gov.in',
        Referer: 'https://agmarknet.gov.in/',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    result.status = response.status;
    result.reachable = true;

    if (response.status !== 200) {
      result.responseType = 'API error';
      return jsonResponse(result);
    }

    try {
      const payload: unknown = await response.json();
      result.responseType = 'JSON';
      if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
        result.topLevelFields = Object.keys(payload).filter((field) => field.length <= 100).slice(0, 50);
      }
    } catch {
      result.responseType = 'non-JSON';
    }

    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.connectionRefused = /connection refused|econnrefused|actively refused/i.test(message);
    return jsonResponse(result);
  }
});
