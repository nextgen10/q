import { NextRequest, NextResponse } from 'next/server';

const PLAYWRIGHT_POM_API_BASE = process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const response = await fetch(`${PLAYWRIGHT_POM_API_BASE}/api/locators/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({ status: 'error', detail: 'Invalid backend response' }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', detail: error instanceof Error ? error.message : 'Failed to reach Playwright backend' },
      { status: 502 },
    );
  }
}
