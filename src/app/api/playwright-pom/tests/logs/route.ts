import { NextRequest, NextResponse } from 'next/server';

const PLAYWRIGHT_POM_API_BASE = process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const offset = request.nextUrl.searchParams.get('offset') || '0';
    const headers = new Headers();
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) headers.set('X-API-Key', apiKey);
    const response = await fetch(`${PLAYWRIGHT_POM_API_BASE}/api/tests/logs?offset=${encodeURIComponent(offset)}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({ content: '', offset: Number(offset) || 0, is_complete: true }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        content: '',
        offset: Number(request.nextUrl.searchParams.get('offset') || '0') || 0,
        is_complete: true,
        error: error instanceof Error ? error.message : 'Failed to reach Playwright backend',
      },
      { status: 502 },
    );
  }
}
