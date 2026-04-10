import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('mounts LocalScreen as the primary local tab path', () => {
    render(<App />);

    expect(screen.getByTestId('local-screen')).toBeInTheDocument();
    expect(screen.getByTestId('local-top-toolbar')).toBeInTheDocument();
  });
});
