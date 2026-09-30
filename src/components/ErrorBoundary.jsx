import { Component } from "react";

/** Catches render errors anywhere below it and shows a friendly recovery screen. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="status-page">
        <div className="status-card">
          <h1>This page didn't load</h1>
          <p>Something went wrong on our end. You can try again or head back home.</p>
          <div className="status-actions">
            <button type="button" className="button button-primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <a href="/" className="button button-outline">Go home</a>
          </div>
        </div>
      </div>
    );
  }
}
