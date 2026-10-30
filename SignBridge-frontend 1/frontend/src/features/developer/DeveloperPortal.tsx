import React, { useState, useEffect } from 'react';
import {
  Code,
  Key,
  Webhook,
  Terminal,
  Copy,
  Check,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  Play,
  Send,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ApiKey, WebhookSubscription } from '../../types';

export const DeveloperPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'KEYS' | 'WEBHOOKS' | 'TESTER'>('KEYS');

  // Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(60);
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Interactive Tester state
  const [testEndpoint, setTestEndpoint] = useState<'SIGNS' | 'PREDICT' | 'TRANSLATE'>('TRANSLATE');
  const [testApiKey, setTestApiKey] = useState('');
  const [testSequenceInput, setTestSequenceInput] = useState('HELLO, HOW_YOU');
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerResult, setTesterResult] = useState<any>(null);
  const [testerError, setTesterError] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await api.listApiKeys();
      if (res.success && res.data) {
        setApiKeys(res.data);
        if (res.data.length > 0 && !testApiKey) {
          // If a key exists, use prefix placeholder
          setTestApiKey(res.data[0].keyPrefix);
        }
      }
    } catch (err: any) {
      console.error('Failed to load API keys', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createApiKey({
        name: newKeyName || 'Production B2B Key',
        rateLimitPerMin: Number(newKeyRateLimit) || 60
      });
      if (res.success && res.data?.secretKey) {
        setCreatedSecretKey(res.data.secretKey);
        setTestApiKey(res.data.secretKey);
        setShowCreateKeyModal(false);
        setNewKeyName('');
        await loadKeys();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to generate key.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error generating key.' });
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action is immediate and cannot be undone.')) return;
    try {
      const res = await api.revokeApiKey(keyId);
      if (res.success) {
        setMessage({ type: 'success', text: 'API key revoked successfully.' });
        await loadKeys();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to revoke key.' });
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.startsWith('https://')) {
      alert('Webhook URL must use secure HTTPS.');
      return;
    }
    try {
      const res = await api.registerWebhook({ targetUrl: webhookUrl });
      if (res.success && res.data) {
        setWebhooks(prev => [res.data!, ...prev]);
        setShowWebhookModal(false);
        setWebhookUrl('');
        setMessage({ type: 'success', text: 'Webhook subscription registered.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to register webhook.' });
    }
  };

  const runApiTest = async () => {
    setTesterLoading(true);
    setTesterResult(null);
    setTesterError(null);
    try {
      if (testEndpoint === 'SIGNS') {
        const res = await api.v1GetSigns();
        setTesterResult(res);
      } else if (testEndpoint === 'TRANSLATE') {
        const seq = testSequenceInput.split(',').map(s => s.trim().toUpperCase().replace(/\s+/g, '_')).filter(Boolean);
        const res = await api.v1TranslateSequence(seq, testApiKey);
        setTesterResult(res);
      } else if (testEndpoint === 'PREDICT') {
        // Send sample landmark coordinates
        const demoLandmarks = Array.from({ length: 21 }, (_, i) => ({
          x: 0.5 + (i % 5) * 0.02,
          y: 0.5 + Math.floor(i / 5) * 0.03,
          z: 0.005
        }));
        const res = await api.v1PredictSign(demoLandmarks, testApiKey);
        setTesterResult(res);
      }
    } catch (err: any) {
      setTesterError(err?.message || 'Request execution error.');
    } finally {
      setTesterLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              <Code className="w-4 h-4" /> B2B & Developer Platform
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">API & Integration Hub</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Integrate Indian Sign Language AI recognition, real-time grammar translation, and public verification directly into third-party apps, government portals, or learning management systems.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/developer/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-cyan-500" /> OpenAPI 3.0 Spec
            </a>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Generate API Key
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('KEYS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'KEYS'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> API Keys ({apiKeys.length})
          </button>
          <button
            onClick={() => setActiveTab('TESTER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'TESTER'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Interactive API Console
          </button>
          <button
            onClick={() => setActiveTab('WEBHOOKS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'WEBHOOKS'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" /> Webhook Subscriptions
          </button>
        </div>
      </header>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm font-bold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs">✕</button>
        </div>
      )}

      {/* Secret Key Revealed Modal */}
      {createdSecretKey && (
        <div className="rounded-3xl border border-amber-400 bg-amber-500/10 p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>Save Your Secret API Key</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            For security, this live API key is only displayed once. Please store it securely in your environment variables.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 text-amber-400 font-mono text-xs border border-amber-500/30 overflow-x-auto">
            <span className="flex-1">{createdSecretKey}</span>
            <button
              onClick={() => copyToClipboard(createdSecretKey)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 hover:bg-amber-400 transition"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: API KEYS */}
      {activeTab === 'KEYS' && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black">Active API Credentials</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tokens authenticated with Bearer or X-API-Key</p>
            </div>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> New Key
            </button>
          </div>

          {loadingKeys ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading credentials…</div>
          ) : apiKeys.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <p className="text-sm">No API keys created yet.</p>
              <button
                onClick={() => setShowCreateKeyModal(true)}
                className="mt-2 text-xs font-bold text-amber-500 hover:underline"
              >
                Generate an API key to access versioned ISL endpoints →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Prefix</th>
                    <th className="py-3 px-4">Rate Limit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apiKeys.map(k => (
                    <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold">{k.name}</td>
                      <td className="py-3 px-4 font-mono text-cyan-600 dark:text-cyan-400">{k.keyPrefix}…</td>
                      <td className="py-3 px-4">{k.rateLimitPerMin} req / min</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            k.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        {k.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-rose-500 hover:text-rose-400 font-bold flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: INTERACTIVE TESTER */}
      {activeTab === 'TESTER' && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <h2 className="text-base font-black">Live API Console & Endpoint Tester</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test versioned v1 REST endpoints with your active API key and verify live response payloads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'TRANSLATE', label: 'POST /v1/isl/translate', desc: 'Sign sequence to English sentence' },
              { id: 'PREDICT', label: 'POST /v1/isl/predict', desc: 'Hand landmark spatial inference' },
              { id: 'SIGNS', label: 'GET /v1/isl/signs', desc: 'ISL Canonical Vocabulary' }
            ].map(ep => (
              <button
                key={ep.id}
                type="button"
                onClick={() => setTestEndpoint(ep.id as any)}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  testEndpoint === ep.id
                    ? 'border-amber-500 bg-amber-500/10 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="text-xs font-mono">{ep.label}</div>
                <div className="text-[11px] text-slate-400 mt-1">{ep.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">X-API-Key</label>
              <input
                type="text"
                value={testApiKey}
                onChange={e => setTestApiKey(e.target.value)}
                placeholder="sb_live_..."
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs px-3.5 py-2.5"
              />
            </div>

            {testEndpoint === 'TRANSLATE' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Sign Sequence (Comma-separated)</label>
                <input
                  type="text"
                  value={testSequenceInput}
                  onChange={e => setTestSequenceInput(e.target.value)}
                  placeholder="e.g. HELLO, HOW_YOU"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs px-3.5 py-2.5 font-mono"
                />
              </div>
            )}

            <button
              onClick={runApiTest}
              disabled={testerLoading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {testerLoading ? 'Executing Request…' : 'Execute Request'}
            </button>
          </div>

          {/* Tester Results Display */}
          {(testerResult || testerError) && (
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
                <span>Response Payload</span>
                <span>Status: {testerError ? '500 Error' : '200 OK'}</span>
              </div>
              <pre className="overflow-x-auto text-emerald-400 whitespace-pre-wrap">
                {testerError ? testerError : JSON.stringify(testerResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: WEBHOOKS */}
      {activeTab === 'WEBHOOKS' && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black">Outbound Webhooks</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Receive real-time HTTPS events when certificates are issued or assessments are passed</p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Webhook
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <p className="text-sm">No webhooks registered.</p>
              <button
                onClick={() => setShowWebhookModal(true)}
                className="mt-2 text-xs font-bold text-amber-500 hover:underline"
              >
                Register an HTTPS webhook endpoint →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map(wh => (
                <div key={wh.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs font-bold">{wh.targetUrl}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Events: {wh.events.join(', ')}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                    {wh.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Generate B2B API Key</h3>
              <button onClick={() => setShowCreateKeyModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Key Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Mobile App Integration"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Rate Limit (Requests / minute)</label>
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={newKeyRateLimit}
                  onChange={e => setNewKeyRateLimit(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Register Outbound Webhook</h3>
              <button onClick={() => setShowWebhookModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>
            <form onSubmit={handleRegisterWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Target HTTPS URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/signbridge"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black"
                >
                  Register Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
