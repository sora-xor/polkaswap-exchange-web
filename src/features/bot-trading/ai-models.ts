/** Public provider model metadata. Credentials are never included in a catalog entry. */
export interface BotAiModel {
  id: string;
  name: string;
  createdAt: number;
  /** Advertised output ceiling (Claude catalog `max_tokens`), used to bound each request. */
  maxOutputTokens?: number;
}

/** Keep current text-generation models returned by the provider, excluding unrelated modalities/endpoints. */
export function parseBotAiModels(data: unknown, provider: 'openai' | 'claude'): BotAiModel[] {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { data?: unknown }).data))
    throw new Error('bots.labAi.modelsUnavailable');
  const models = new Map<string, BotAiModel>();
  for (const item of (data as { data: unknown[] }).data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = record.id;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9._:/-]{1,120}$/.test(id)) continue;
    if (
      provider === 'openai' &&
      (!/^(gpt-(?:[5-9]|[1-9]\d|4\.1|4o)|o[3-9])/.test(id) ||
        /audio|tts|realtime|transcri|search|image|deep-research|computer-use/.test(id))
    )
      continue;
    if (provider === 'claude' && !id.startsWith('claude-')) continue;
    const created = provider === 'openai' ? Number(record.created) * 1000 : Date.parse(String(record.created_at));
    const name =
      typeof record.display_name === 'string' && record.display_name.length <= 160
        ? record.display_name.replace(/[\u0000-\u001f\u007f]/g, '')
        : id;
    const maxOutputTokens =
      provider === 'claude' && Number.isSafeInteger(record.max_tokens) && (record.max_tokens as number) > 0
        ? (record.max_tokens as number)
        : undefined;
    models.set(id, {
      id,
      name,
      createdAt: Number.isFinite(created) ? created : 0,
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
    });
  }
  return [...models.values()].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}
