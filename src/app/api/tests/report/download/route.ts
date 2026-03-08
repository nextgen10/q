import { NextRequest, NextResponse } from 'next/server';

const PLAYWRIGHT_POM_API_BASE =
  process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const upstreamUrl = `${PLAYWRIGHT_POM_API_BASE}/api/tests/report/download`;

  try {
    const requestHeaders = new Headers();
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) requestHeaders.set('X-API-Key', apiKey);
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: requestHeaders,
      cache: 'no-store',
    });

    const body = await response.arrayBuffer();
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'transfer-encoding' && lower !== 'connection') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reach Playwright backend',
        upstream: upstreamUrl,
      },
      { status: 502 },
    );
  }
}
