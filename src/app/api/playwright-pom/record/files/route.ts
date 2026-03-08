import { NextResponse } from 'next/server';

const PLAYWRIGHT_POM_API_BASE = process.env.PLAYWRIGHT_POM_API_BASE || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${PLAYWRIGHT_POM_API_BASE}/api/record/files`, {
      method: 'GET',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({ files: [] }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { files: [], error: error instanceof Error ? error.message : 'Failed to reach Playwright backend' },
      { status: 502 },
    );
  }
}
