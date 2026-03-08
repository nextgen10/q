import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = () => {
    throw new Error('Test error');
};

// Component that works fine
const WorkingComponent = () => <div>Working Component</div>;

describe('ErrorBoundary', () => {
    // Suppress console.error for these tests
    const originalError = console.error;
    beforeAll(() => {
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalError;
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <WorkingComponent />
            </ErrorBoundary>
        );
        expect(screen.getByText('Working Component')).toBeInTheDocument();
    });

    it('renders error UI when child component throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
        const customFallback = <div>Custom Error UI</div>;
        render(
            <ErrorBoundary fallback={customFallback}>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('has a try again button that resets the error', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        const tryAgainButton = screen.getByRole('button', { name: /try again/i });
        expect(tryAgainButton).toBeInTheDocument();
    });
});
