import { render, screen } from '@testing-library/react';
import App from './App';

describe('App shell', () => {
  it('renders root shell and primary regions/tabs', () => {
    render(<App />);

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('primary-header')).toBeInTheDocument();
    expect(screen.getByTestId('primary-tabs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Local' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('primary-content')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-region')).toBeInTheDocument();
    expect(screen.getByTestId('side-region')).toBeInTheDocument();
  });
});
