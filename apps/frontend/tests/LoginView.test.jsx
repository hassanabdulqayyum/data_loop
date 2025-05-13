/*
LoginView.test.jsx – very small smoke-test so CI fails if the component breaks.
It just renders the component and checks the email textbox exists.
*/
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginView from '../src/pages/LoginView.jsx';

it('renders email input', () => {
  render(<LoginView />);
  const emailInput = screen.getByPlaceholderText(/email/i);
  expect(emailInput).toBeInTheDocument();

  // New checks introduced in the 2025-05-13 visual polish update.
  const forgotLink = screen.getByText(/forgot password\?/i);
  expect(forgotLink).toBeInTheDocument();

  const loginBtn = screen.getByRole('button', { name: /login/i });
  // Button should be disabled because form fields are empty by default.
  expect(loginBtn).toBeDisabled();
}); 