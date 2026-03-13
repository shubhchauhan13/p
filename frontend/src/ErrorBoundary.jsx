import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px', color: '#ff6b6b', background: '#0a0b0f',
                    fontFamily: 'monospace', minHeight: '100vh'
                }}>
                    <h1 style={{ color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={28} /> React Crashed</h1>
                    <pre style={{
                        background: '#1a1b25', padding: '20px', borderRadius: '8px',
                        overflow: 'auto', whiteSpace: 'pre-wrap', color: '#f0f0f5'
                    }}>
                        {this.state.error?.toString()}
                        {'\n\n'}
                        {this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px', padding: '10px 20px', background: '#6366f1',
                            color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
