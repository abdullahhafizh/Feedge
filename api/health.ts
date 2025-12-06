import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCacheStats } from '../src/security/validator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stats = getCacheStats();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cache: stats,
  });
}