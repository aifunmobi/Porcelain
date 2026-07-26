import React from 'react';

interface Props {
  appName: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Keeps one app's failure inside its own window.
 *
 * Apps are lazily loaded, so a chunk that fails to arrive throws during render.
 * Without a boundary that throw unmounts the whole React tree — the desktop,
 * the dock and every other open window go with it. This catches it at the
 * window edge instead.
 */
export class AppBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.appName}] crashed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="window__crash">
        <p className="window__crash-title">{this.props.appName} stopped responding.</p>
        <p className="window__crash-detail">{this.state.error.message}</p>
        <button className="is-primary" onClick={() => this.setState({ error: null })}>
          Try Again
        </button>
      </div>
    );
  }
}

export default AppBoundary;
