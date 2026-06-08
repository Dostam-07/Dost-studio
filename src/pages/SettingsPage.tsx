import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores/appStore';
import { ollamaService } from '@/services/ollama';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ModelPicker } from '@/components/settings/ModelPicker';
import { getSystemPrompt, setPromptOverrides } from '@/services/agents';
import type { OllamaModel } from '@/types';

const URL_REGEX = /^https?:\/\/.+/;

export function SettingsPage() {
  const { settings, updateSettings, loadSettings, setOllamaStatus, keyCredits, checkKeyCredits } = useAppStore();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('connecting');
  const [message, setMessage] = useState('');
  const [orStatus, setOrStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [orMessage, setOrMessage] = useState('');
  const [orImageStatus, setOrImageStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [orImageMessage, setOrImageMessage] = useState('');
  const [openRouterKeyStatus, setOpenRouterKeyStatus] = useState<Record<string, 'idle' | 'ok' | 'error'>>({});
  const [openRouterKeyMessages, setOpenRouterKeyMessages] = useState<Record<string, string>>({});
  const [lastUsedOpenRouterKey, setLastUsedOpenRouterKey] = useState<string | null>(ollamaService.lastOpenRouterKeyUsed);
  const [lastFallback, setLastFallback] = useState(ollamaService.lastFallback);

  const urlValid = useMemo(() => URL_REGEX.test(ollamaUrl), [ollamaUrl]);

  const openRouterKeys = useMemo(() => {
    const keys = Array.isArray(settings.openRouterKeys) && settings.openRouterKeys.length
      ? settings.openRouterKeys
      : settings.openRouterKey
        ? [settings.openRouterKey]
        : [];
    return keys.map((key) => key.trim()).filter(Boolean);
  }, [settings.openRouterKey, settings.openRouterKeys]);

  const maskedKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  };

  const promptTabs = ['planner', 'architect', 'coder'] as const;
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [activePromptTab, setActivePromptTab] = useState<typeof promptTabs[number]>('planner');
  const [promptEdits, setPromptEdits] = useState<Record<string, string>>({
    planner: settings.promptOverrides?.planner || '',
    architect: settings.promptOverrides?.architect || '',
    coder: settings.promptOverrides?.coder || '',
  });
  const [promptSaved, setPromptSaved] = useState<Record<string, boolean>>({});

  const savePromptOverride = (key: typeof promptTabs[number]) => {
    const clean = promptEdits[key]?.trim() || '';
    const overrides = { ...settings.promptOverrides };
    if (clean) overrides[key] = clean;
    else delete overrides[key];
    updateSettings({ promptOverrides: overrides });
    setPromptOverrides(overrides);
    localStorage.setItem('dost-studio-prompt-overrides', JSON.stringify(overrides));
    setPromptSaved((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => setPromptSaved((prev) => ({ ...prev, [key]: false })), 2000);
  };

  const resetPromptOverride = (key: typeof promptTabs[number]) => {
    setPromptEdits((prev) => ({ ...prev, [key]: '' }));
    const overrides = { ...settings.promptOverrides };
    delete overrides[key];
    updateSettings({ promptOverrides: overrides });
    setPromptOverrides(overrides);
    localStorage.setItem('dost-studio-prompt-overrides', JSON.stringify(overrides));
  };

  useEffect(() => {
    ollamaService.configureWithSettings(settings);
    setPromptOverrides(settings.promptOverrides || {});
    (async () => {
      const list = await ollamaService.listModels();
      if (list.length > 0) {
        setModels(list);
        setStatus('connected');
        setOllamaStatus('connected');
        const names = list.map((m) => m.name);
        const pick = (preferred: string[]): string => {
          for (const p of preferred) {
            const match = names.find((n) => n.startsWith(p));
            if (match) return match;
          }
          return names[0];
        };
        updateSettings({
          models: {
            planner: pick(['hermes', 'llama3', 'qwen3:4b', 'qwen3', 'deepseek-r1', 'qwen2.5-coder']),
            architect: pick(['hermes', 'llama3', 'qwen3:4b', 'qwen3', 'deepseek-r1', 'qwen2.5-coder']),
            coder: pick(['hermes', 'llama3', 'qwen2.5-coder:7b', 'qwen2.5-coder', 'deepseek-r1', 'qwen3']),
            vision: pick(['minicpm-v', 'llava', 'llava-llama3', 'qwen3', 'deepseek-r1']),
          },
        });
      } else if (settings.apiProvider === 'ollama') {
        setStatus('error');
        setOllamaStatus('disconnected');
        setMessage('Could not connect to Ollama. Make sure it is running (ollama serve)');
      } else {
        setStatus('connected');
        setOllamaStatus('connected');
        setMessage('Using OpenRouter — local models not applicable');
      }
    })();
  }, []);

  useEffect(() => {
    setLastFallback(ollamaService.lastFallback);
  }, [settings.apiProvider, settings.openRouterModel]);

  useEffect(() => {
    if (openRouterKeys.length > 0) {
      checkKeyCredits(openRouterKeys);
    }
  }, [openRouterKeys.length]);

  const pickBest = (names: string[], preferred: string[]): string => {
    for (const p of preferred) {
      const match = names.find((n) => n.startsWith(p));
      if (match) return match;
    }
    return names[0];
  };

  const fetchModels = async () => {
    if (!URL_REGEX.test(ollamaUrl)) {
      setStatus('error');
      setOllamaStatus('disconnected');
      setMessage('Invalid URL — must start with http:// or https://');
      return;
    }

    setStatus('connecting');
    setMessage('');

    // Configure the service with the new URL before testing
    ollamaService.setBaseUrl(ollamaUrl);

    const list = await ollamaService.listModels();
    if (list.length > 0) {
      setModels(list);
      setStatus('connected');
      setOllamaStatus('connected');
      updateSettings({ ollamaUrl });
      setMessage('');

      const names = list.map((m) => m.name);
      updateSettings({
        ollamaUrl,
        models: {
          planner: pickBest(names, ['hermes', 'llama3', 'qwen3:4b', 'qwen3', 'deepseek-r1', 'qwen2.5-coder']),
          architect: pickBest(names, ['hermes', 'llama3', 'qwen3:4b', 'qwen3', 'deepseek-r1', 'qwen2.5-coder']),
          coder: pickBest(names, ['hermes', 'llama3', 'qwen2.5-coder:7b', 'qwen2.5-coder', 'deepseek-r1', 'qwen3']),
          vision: pickBest(names, ['minicpm-v', 'llava', 'llava-llama3', 'qwen3', 'deepseek-r1']),
        },
      });
    } else {
      const ping = await ollamaService.ping();
      if (ping) {
        setStatus('connected');
        setOllamaStatus('connected');
        updateSettings({ ollamaUrl });
        setMessage('Connected but no models found. Pull a model first: ollama pull qwen3');
      } else {
        setStatus('error');
        setOllamaStatus('disconnected');
        setMessage('Could not connect to Ollama at ' + ollamaUrl + '. Make sure Ollama is running (ollama serve)');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your AI providers and models</p>
      </div>

      {/* AI Provider */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">✦</span>
            <div>
              <CardTitle className="text-base">AI Provider</CardTitle>
              <CardDescription>Use local Ollama or cloud models via OpenRouter</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${settings.apiProvider === 'ollama' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/30'}`}>
              <input type="radio" name="provider" value="ollama" checked={settings.apiProvider === 'ollama'} onChange={() => { updateSettings({ apiProvider: 'ollama' }); setOllamaStatus('checking'); }} className="sr-only" />
              <div className="font-medium text-sm flex items-center gap-2">
                <span>◉</span> Ollama (Local)
              </div>
              <div className="text-xs text-muted-foreground mt-1">Run models on your machine. Free, private, offline.</div>
            </label>
            <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${settings.apiProvider === 'openrouter' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/30'}`}>
              <input type="radio" name="provider" value="openrouter" checked={settings.apiProvider === 'openrouter'} onChange={() => { updateSettings({ apiProvider: 'openrouter' }); setOllamaStatus('connected'); }} className="sr-only" />
              <div className="font-medium text-sm flex items-center gap-2">
                <span>◇</span> OpenRouter (Cloud)
              </div>
              <div className="text-xs text-muted-foreground mt-1">Use powerful cloud models. Requires API key.</div>
            </label>
          </div>
          {settings.apiProvider === 'openrouter' && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">OpenRouter API Key</label>
                <textarea
                  value={Array.isArray(settings.openRouterKeys) && settings.openRouterKeys.length ? settings.openRouterKeys.join('\n') : settings.openRouterKey}
                  onChange={(e) => {
                    const raw = e.target.value || '';
                    const keys = raw.split(/[,\n\r]+/).map((k) => k.trim()).filter(Boolean);
                    updateSettings({ openRouterKey: keys[0] || '', openRouterKeys: keys });
                    setOrStatus('idle'); setOrMessage('');
                  }}
                  placeholder="sk-or-v1-... (comma or newline separated for multiple keys)"
                  className="min-h-[6rem] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Paste multiple OpenRouter API keys separated by commas or newlines to enable automatic rotation.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Model</label>
                <Input
                  value={settings.openRouterModel}
                  onChange={(e) => { updateSettings({ openRouterModel: e.target.value }); setOrStatus('idle'); setOrMessage(''); }}
                  placeholder="deepseek/deepseek-chat"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Free models: <code className="text-primary">deepseek/deepseek-chat</code> (recommended), <code className="text-primary">deepseek/deepseek-chat-v3-0324</code>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={orStatus === 'testing' || openRouterKeys.length === 0}
                    onClick={async () => {
                      setOrStatus('testing');
                      setOrMessage('');
                      const result = await ollamaService.testOpenRouterConnection(settings.openRouterKey, settings.openRouterModel);
                      setOrStatus(result.ok ? 'ok' : 'error');
                      setOrMessage(result.message);
                      setLastUsedOpenRouterKey(ollamaService.lastOpenRouterKeyUsed);
                    }}
                  >
                    {orStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={orImageStatus === 'testing' || openRouterKeys.length === 0}
                    onClick={async () => {
                      setOrImageStatus('testing');
                      setOrImageMessage('');
                      const res = await ollamaService.testOpenRouterImageSupport(settings.openRouterKey, settings.openRouterModel);
                      setOrImageStatus(res.ok ? 'ok' : 'error');
                      setOrImageMessage(res.message);
                      setLastUsedOpenRouterKey(ollamaService.lastOpenRouterKeyUsed);
                      setTimeout(() => setOrImageStatus('idle'), 4000);
                    }}
                  >
                    {orImageStatus === 'testing' ? 'Testing images...' : 'Test Vision'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={orStatus === 'testing' || orImageStatus === 'testing' || openRouterKeys.length === 0}
                    onClick={async () => {
                      setOpenRouterKeyStatus(() => Object.fromEntries(openRouterKeys.map((k) => [k, 'idle'])));
                      setOpenRouterKeyMessages({});
                      const results = await ollamaService.testOpenRouterKeys(settings.openRouterKey, settings.openRouterModel);
                      setOpenRouterKeyStatus((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.key, r.ok ? 'ok' : 'error'])) }));
                      setOpenRouterKeyMessages((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.key, r.message])) }));
                      setOrStatus(results.every((r) => r.ok) ? 'ok' : 'error');
                      setOrMessage(results.every((r) => r.ok) ? 'All keys valid' : 'Some keys failed');
                    }}
                  >
                    Test all keys
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {orStatus !== 'idle' && (
                    <span className={`text-xs flex items-center gap-1 ${orStatus === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${orStatus === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {orMessage}
                    </span>
                  )}
                  {orImageStatus !== 'idle' && (
                    <span className={`text-xs flex items-center gap-1 ${orImageStatus === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${orImageStatus === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {orImageMessage}
                    </span>
                  )}
                </div>
                {openRouterKeys.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">OpenRouter key status</div>
                    <div className="space-y-3">
                      {openRouterKeys.map((key) => {
                        const credits = keyCredits[key];
                        const pct = credits?.ok && credits.limit ? Math.round((1 - (credits.usage ?? 0) / credits.limit) * 100) : -1;
                        const barColor = pct >= 30 ? 'bg-emerald-500' : pct >= 10 ? 'bg-amber-500' : pct >= 0 ? 'bg-red-500' : 'bg-muted';
                        return (
                          <div key={key} className="text-sm">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <span>{maskedKey(key)}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {!credits ? 'Checking...'
                                  : !credits.ok ? credits.error?.slice(0, 30) || 'Error'
                                  : credits.limit ? `${pct}% left`
                                  : credits.isFree ? 'Free'
                                  : 'OK'}
                              </span>
                            </div>
                            {credits?.ok && credits.limit && (
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.max(pct, 0)}%` }} />
                              </div>
                            )}
                            {credits?.ok && credits.limit && (
                              <div className="text-[11px] text-muted-foreground/60 mt-0.5">
                                ${((credits.usage ?? 0) / 100).toFixed(2)} / ${(credits.limit / 100).toFixed(2)} used
                                {credits.rateLimit && ` · ${credits.rateLimit.requests} req/${credits.rateLimit.interval}`}
                              </div>
                            )}
                            {credits?.ok && !credits.limit && credits.isFree && (
                              <div className="text-[11px] text-emerald-500/70 mt-0.5">
                                Free tier {credits.rateLimit ? `· ${credits.rateLimit.requests} req/${credits.rateLimit.interval}` : ''}
                              </div>
                            )}
                            {openRouterKeyMessages[key] && (
                              <div className="text-xs text-muted-foreground mt-1">{openRouterKeyMessages[key]}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {lastUsedOpenRouterKey && (
                      <div className="text-xs text-muted-foreground mt-3">
                        Last successful key: {maskedKey(lastUsedOpenRouterKey)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Figma Integration */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">◇</span>
            <div>
              <CardTitle className="text-base">Figma Integration</CardTitle>
              <CardDescription>Import designs to generate React + TailwindCSS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Figma Access Token</label>
            <input
              type="password"
              value={settings.figmaAccessToken || ''}
              onChange={(e) => updateSettings({ figmaAccessToken: e.target.value })}
              placeholder="figd_... (create at figma.com/settings/tokens)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Generate a personal access token in Figma → Settings → Account → Personal Access Tokens.
              Used to import design tokens and frame hierarchies.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Deep Analysis (AI-powered) */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">🧠</span>
            <div>
              <CardTitle className="text-base">Deep Analysis</CardTitle>
              <CardDescription>AI-powered deep thinking (Kimi-style) for comprehensive research</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Deep Analysis</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-emerald-500 text-sm">✓</span>
              <p className="text-xs text-muted-foreground">
                Uses your <span className="text-emerald-500 font-medium">configured AI model</span> (Ollama or OpenRouter) to deeply analyze topics — no internet search needed, no API keys required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {lastFallback && (
        <Card className="mb-4 border-amber-300/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">⚠</span>
              <div>
                <CardTitle className="text-base">Last fallback</CardTitle>
                <CardDescription>OpenRouter fell back to a local Ollama model.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <strong>{lastFallback.from}</strong> → <strong>{lastFallback.to}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Original model: {lastFallback.originalModel}
            </p>
            <p className="text-xs text-muted-foreground">
              Reason: {lastFallback.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              At: {new Date(lastFallback.timestamp).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ollama Connection */}
      {settings.apiProvider === 'ollama' && (
        <Card className="mb-4 border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">◉</span>
              <div>
                <CardTitle className="text-base">Ollama Connection</CardTitle>
                <CardDescription>Configure your local Ollama instance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className={`w-full pr-8 ${ollamaUrl && !urlValid ? 'border-red-500' : ''}`}
                />
                {ollamaUrl && (
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm ${urlValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {urlValid ? '✓' : '✗'}
                  </span>
                )}
              </div>
              <Button onClick={fetchModels} variant="secondary" disabled={status === 'connecting' || !urlValid}>
                {status === 'connecting' ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
            {!urlValid && ollamaUrl && (
              <p className="text-xs text-red-400">URL must start with http:// or https://</p>
            )}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-muted-foreground">
                {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Connection failed' : 'Idle'}
              </span>
            </div>
            {message && <div className="text-xs text-muted-foreground">{message}</div>}

            {models.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Available Models ({models.length})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {models.map((m) => (
                    <div key={m.name} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                      <span className="font-mono text-xs">{m.name}</span>
                      <span className="text-muted-foreground text-xs">{m.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Model Configuration */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">⊞</span>
            <div>
              <CardTitle className="text-base">AI Models</CardTitle>
              <CardDescription>Configure which models each agent uses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ModelPicker
            label="Planner Agent"
            value={settings.models.planner}
            availableModels={models.map((m) => m.name)}
            onChange={(v) => updateSettings({ models: { ...settings.models, planner: v } })}
            dotColor="bg-blue-400"
            hint="deepseek-r1 recommended"
          />
          <ModelPicker
            label="Architect Agent"
            value={settings.models.architect}
            availableModels={models.map((m) => m.name)}
            onChange={(v) => updateSettings({ models: { ...settings.models, architect: v } })}
            dotColor="bg-emerald-400"
            hint="qwen3 recommended"
          />
          <ModelPicker
            label="Code Engineer"
            value={settings.models.coder}
            availableModels={models.map((m) => m.name)}
            onChange={(v) => updateSettings({ models: { ...settings.models, coder: v } })}
            dotColor="bg-purple-400"
            hint="qwen2.5-coder recommended"
          />
          <ModelPicker
            label="Vision Agent"
            value={settings.models.vision}
            availableModels={models.map((m) => m.name)}
            onChange={(v) => updateSettings({ models: { ...settings.models, vision: v } })}
            dotColor="bg-amber-400"
            hint="minicpm-v recommended"
          />
        </CardContent>
      </Card>

      {/* System Prompts */}
      <Card className="mb-4 border-border/60 shadow-sm">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setPromptEditorOpen(!promptEditorOpen)}>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">🧠</span>
            <div>
              <CardTitle className="text-base">System Prompts</CardTitle>
              <CardDescription>Customize agent system prompts — empty = use default</CardDescription>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{promptEditorOpen ? '▲' : '▼'}</span>
          </div>
        </CardHeader>
        {promptEditorOpen && (
          <CardContent className="space-y-4 border-t border-border/50 pt-4">
            <div className="flex gap-2 border-b border-border pb-2">
              {promptTabs.map((key) => (
                <button
                  key={key}
                  onClick={() => setActivePromptTab(key)}
                  className={`text-xs px-3 py-1 rounded-md transition ${activePromptTab === key ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{activePromptTab}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetPromptOverride(activePromptTab)}
                    className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    Reset to default
                  </button>
                  <button
                    onClick={() => savePromptOverride(activePromptTab)}
                    className="text-[10px] text-muted-foreground/80 bg-muted/30 px-2 py-1 rounded transition hover:bg-muted/50"
                  >
                    Save
                  </button>
                </div>
              </div>
              <textarea
                value={promptEdits[activePromptTab] || getSystemPrompt(activePromptTab)}
                onChange={(e) => setPromptEdits((prev) => ({ ...prev, [activePromptTab]: e.target.value }))}
                rows={8}
                className="w-full text-xs font-mono bg-muted/30 border border-border rounded p-2 resize-y text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder={`Default: ${getSystemPrompt(activePromptTab).slice(0, 80)}...`}
              />
              <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                <span>{promptSaved[activePromptTab] ? 'Saved' : 'Edit the prompt and click Save.'}</span>
                <span>{promptEdits[activePromptTab] ? 'Override active' : 'Using default prompt'}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* About */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">◈</span>
            <div>
              <CardTitle className="text-base">About</CardTitle>
              <CardDescription>Local-first AI-native product building platform</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-xs">0.1.0</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Tagline</span>
              <span className="text-xs">Think. Build. Iterate.</span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-3 pt-3 border-t border-border/50 leading-relaxed">
              Three intelligent agents with memory are better than ten agents without memory.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
