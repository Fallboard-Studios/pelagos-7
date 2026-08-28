import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepperWithToggle } from './StepperWithToggle';
import type { StepperWithToggleSchema } from '@/types/controls';

const schema: StepperWithToggleSchema = { id: 'noteVariance', type: 'stepperToggle', min: 1, max: 8, humanLabel: 'Note Variance' };

describe('StepperWithToggle', () => {
  it('renders an actual Toggle (role="switch") and Stepper (increment/decrement buttons)', () => {
    render(<StepperWithToggle schema={schema} value={{ active: true, value: 3 }} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeTruthy();
    expect(screen.getByRole('button', { name: /increment/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /decrement/i })).toBeTruthy();
  });

  it('disables the Stepper controls when value.active is false', () => {
    render(<StepperWithToggle schema={schema} value={{ active: false, value: 3 }} onChange={() => {}} />);
    expect((screen.getByRole('button', { name: /increment/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables the Stepper controls when value.active is true', () => {
    render(<StepperWithToggle schema={schema} value={{ active: true, value: 3 }} onChange={() => {}} />);
    expect((screen.getByRole('button', { name: /increment/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls onChange with the full {active, value} shape when the toggle changes', () => {
    const onChange = vi.fn();
    render(<StepperWithToggle schema={schema} value={{ active: false, value: 3 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith({ active: true, value: 3 });
  });

  it('calls onChange with the full {active, value} shape when the stepper changes', () => {
    const onChange = vi.fn();
    render(<StepperWithToggle schema={schema} value={{ active: true, value: 3 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith({ active: true, value: 4 });
  });

  it('adds an isActive class to the component root when value.active is true', () => {
    const { container } = render(<StepperWithToggle schema={schema} value={{ active: true, value: 3 }} onChange={() => {}} />);
    expect(container.querySelector('.sc-stepper-toggle.isActive')).toBeTruthy();
  });

  it('omits the isActive class from the component root when value.active is false', () => {
    const { container } = render(<StepperWithToggle schema={schema} value={{ active: false, value: 3 }} onChange={() => {}} />);
    expect(container.querySelector('.sc-stepper-toggle.isActive')).toBeNull();
    expect(container.querySelector('.sc-stepper-toggle')).toBeTruthy();
  });

  it('is not disabled by default', () => {
    render(<StepperWithToggle schema={schema} value={{ active: true, value: 3 }} onChange={() => {}} />);
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables both the Toggle and the Stepper when disabled is true, even if value.active is true', () => {
    render(<StepperWithToggle schema={schema} value={{ active: true, value: 3 }} onChange={() => {}} disabled />);
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /increment/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
