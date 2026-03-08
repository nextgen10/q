import { NextResponse } from 'next/server';

const PLAYWRIGHT_POM_API_BASE =
  process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

export async function GET() {
  const upstreamUrl = `${PLAYWRIGHT_POM_API_BASE}/api/tests/report/download`;

  try {
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    const body = await response.arrayBuffer();
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'transfer-encoding' && lower !== 'connection') {
        headers.set(key, value);
      }
    });

    return new NextResponse(body, {
      status: response.status,
      headers,
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
