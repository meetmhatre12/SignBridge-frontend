import React from 'react';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message: string }

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected application error.' };
  }

  componentDidCatch(error: unknown) {
    console.error('[SignBridge] Unhandled UI error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-5">
        <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-7 shadow-xl text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl">!</div>
          <h1 className="mt-4 text-2xl font-black text-slate-900">This section needs a refresh</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">SignBridge stopped this screen safely instead of leaving a broken or frozen interface.</p>
          <button onClick={() => window.location.reload()} className="mt-5 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-black">Refresh SignBridge</button>
          <p className="mt-3 text-[10px] text-slate-400 break-words">{this.state.message}</p>
        </div>
      </div>
    );
  }
}
