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
}); 