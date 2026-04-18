// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock server action
vi.mock('@/server/ringostat/actions', () => ({
  callGuest: vi.fn()
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock Icons to avoid SVG/tabler complexity
vi.mock('@/components/icons', () => ({
  Icons: {
    phone: ({ className }: { className?: string }) =>
      React.createElement('svg', { 'data-testid': 'phone-icon', className })
  }
}));

import { PhoneLink } from '@/components/shared/phone-link';
import { callGuest } from '@/server/ringostat/actions';
import { toast } from 'sonner';

const mockCallGuest = vi.mocked(callGuest);

describe('PhoneLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Null / falsy props ─────────────────────────────────

  it('returns null when phone is null', () => {
    const { container } = render(React.createElement(PhoneLink, { phone: null }));
    expect(container.firstChild).toBeNull();
  });

  it('returns null when phone is undefined', () => {
    const { container } = render(React.createElement(PhoneLink, { phone: undefined }));
    expect(container.firstChild).toBeNull();
  });

  it('returns null when phone is empty string', () => {
    const { container } = render(React.createElement(PhoneLink, { phone: '' }));
    expect(container.firstChild).toBeNull();
  });

  // ── Renders correctly ─────────────────────────────────

  it('renders phone number text when phone is provided', () => {
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    expect(screen.getByText('+380671234567')).toBeInTheDocument();
  });

  it('renders a button with the correct title attribute', () => {
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Натисніть щоб зателефонувати');
  });

  it('renders a phone icon inside the button', () => {
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    expect(screen.getByTestId('phone-icon')).toBeInTheDocument();
  });

  it('button type is "button" (not submit)', () => {
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  // ── Click: success ────────────────────────────────────

  it('calls callGuest with the phone number on click', async () => {
    mockCallGuest.mockResolvedValueOnce({ ok: true });
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(mockCallGuest).toHaveBeenCalledWith('+380671234567');
    });
  });

  it('shows toast.success when callGuest returns ok:true', async () => {
    mockCallGuest.mockResolvedValueOnce({ ok: true });
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Дзвінок ініційовано — очікуйте дзвінок на ваш телефон'
      );
    });
  });

  // ── Click: failure ────────────────────────────────────

  it('shows toast.error with provided error message when ok:false', async () => {
    mockCallGuest.mockResolvedValueOnce({ ok: false, error: 'No SIP extension' });
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No SIP extension');
    });
  });

  it('shows fallback toast.error message when error field is absent', async () => {
    mockCallGuest.mockResolvedValueOnce({ ok: false });
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Не вдалося ініціювати дзвінок');
    });
  });

  // ── Pending state ─────────────────────────────────────

  it('shows "Дзвоню..." text while call is pending', async () => {
    // Never resolves during this test
    mockCallGuest.mockImplementationOnce(() => new Promise(() => {}));
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Дзвоню...')).toBeInTheDocument();
    });
  });

  it('button is disabled while call is pending', async () => {
    mockCallGuest.mockImplementationOnce(() => new Promise(() => {}));
    render(React.createElement(PhoneLink, { phone: '+380671234567' }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
