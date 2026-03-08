'use client';

import React, { Suspense } from 'react';
import PomApp from '@/features/pom-components/PomApp';

export default function PlaywrightPomPage() {
  return (
    <Suspense fallback={null}>
      <PomApp />
    </Suspense>
  );
}
