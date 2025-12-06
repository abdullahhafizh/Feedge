/**
 * Monitoring hooks for external integrations.
 *
 * This module provides a simple interface for sending events to external
 * monitoring services (webhooks, logging services, etc.) without coupling
 * the core pipeline to specific implementations.
 *
 * Usage:
 * - Set MONITORING_WEBHOOK_URL env var to enable webhook notifications
 * - Call reportEvent() from anywhere to send monitoring data
 * - Events are sent asynchronously and failures are logged but not thrown
 */

import { createLogger } from './logger.js';

const logger = createLogger('monitoring');

export type EventSeverity = 'info' | 'warning' | 'error';

export interface MonitoringEvent {
  type: string;
  severity: EventSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

// Get webhook URL from environment (optional)
const WEBHOOK_URL = typeof process !== 'undefined' 
  ? process.env.MONITORING_WEBHOOK_URL 
  : undefined;

/**
 * Report an event to external monitoring.
 * This is fire-and-forget - failures are logged but don't affect the caller.
 */
export async function reportEvent(event: MonitoringEvent): Promise<void> {
  const fullEvent = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  // Always log locally
  const logMethod = event.severity === 'error' ? 'error' 
    : event.severity === 'warning' ? 'warn' 
    : 'info';
  logger[logMethod](`[${event.type}] ${event.message}`, event.metadata ?? {});

  // Send to webhook if configured
  if (WEBHOOK_URL) {
    try {
      await sendToWebhook(WEBHOOK_URL, fullEvent);
    } catch (err) {
      logger.debug('Webhook send failed', { error: String(err) });
    }
  }
}

/**
 * Send event to a webhook URL.
 * Used internally - can be replaced with other transports.
 */
async function sendToWebhook(url: string, event: MonitoringEvent): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.debug('Webhook returned error', { status: response.status });
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convenience helpers for common event types.
 */
export const MonitoringEvents = {
  pipelineSuccess: (feedUrl: string, postCount: number) =>
    reportEvent({
      type: 'PIPELINE_SUCCESS',
      severity: 'info',
      message: `Badge generated successfully`,
      metadata: { feedUrl, postCount },
    }),

  pipelineError: (feedUrl: string, error: string) =>
    reportEvent({
      type: 'PIPELINE_ERROR',
      severity: 'error',
      message: `Badge generation failed`,
      metadata: { feedUrl, error },
    }),

  securityViolation: (username: string, reason: string) =>
    reportEvent({
      type: 'SECURITY_VIOLATION',
      severity: 'warning',
      message: `Security check failed`,
      metadata: { username, reason },
    }),

  rateLimitHit: (pattern: string) =>
    reportEvent({
      type: 'RATE_LIMIT',
      severity: 'warning',
      message: `Rate limit triggered`,
      metadata: { pattern },
    }),
};
