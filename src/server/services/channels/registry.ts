import type { ChannelType } from '@prisma/client';
import type { ChannelAdapter } from './adapter';

// =============================================================
// ADAPTER REGISTRY — maps ChannelType → ChannelAdapter instance
// Usage: getAdapter('TELEGRAM') → TelegramAdapter
// Tests override via registerAdapter('TELEGRAM', new FakeAdapter())
// =============================================================

const registry = new Map<ChannelType, ChannelAdapter>();

export function registerAdapter(type: ChannelType, adapter: ChannelAdapter): void {
  registry.set(type, adapter);
}

export function getAdapter(type: ChannelType): ChannelAdapter {
  const adapter = registry.get(type);
  if (!adapter) {
    throw new Error(`No adapter registered for channel type: ${type}`);
  }
  return adapter;
}

export function hasAdapter(type: ChannelType): boolean {
  return registry.has(type);
}

// =============================================================
// Bootstrap — import and register all real adapters at server startup
// Called from src/server/services/channels/index.ts
// =============================================================
let bootstrapped = false;

export async function bootstrapAdapters(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  // Phase 1: Non-Meta adapters
  const { TelegramAdapter } = await import('./adapters/telegram');
  const { EmailAdapter } = await import('./adapters/email');
  const { SmsAdapter } = await import('./adapters/sms');
  const { EchatViberAdapter, EchatTgPersonalAdapter } = await import('./adapters/echat');

  registerAdapter('TELEGRAM', new TelegramAdapter());
  registerAdapter('EMAIL', new EmailAdapter());
  registerAdapter('SMS', new SmsAdapter());
  registerAdapter('ECHAT_VIBER', new EchatViberAdapter());
  registerAdapter('ECHAT_TG_PERSONAL', new EchatTgPersonalAdapter());

  // Phase 2: Meta — not yet implemented
  // registerAdapter('FACEBOOK', new FacebookAdapter())
  // registerAdapter('INSTAGRAM', new InstagramAdapter())
  // registerAdapter('WHATSAPP', new WhatsAppAdapter())
}
