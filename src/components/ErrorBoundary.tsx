import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

// Last line of defence: a crash inside one screen shows a friendly recovery
// page instead of a blank white screen in front of a driver or a jury member.
export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Необработена грешка в интерфейса:', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <h1 className="text-2xl font-bold">Възникна неочаквана грешка</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Данните Ви са в безопасност. Презаредете страницата, за да продължите.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-700"
        >
          Към началото
        </button>
      </main>
    );
  }
}
