import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoPicker from './PhotoPicker';
import History from './History';

describe('PhotoPicker', () => {
  it('shows every photo from the page and selects the one tapped', () => {
    const onChange = vi.fn();
    const options = ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'];
    render(<PhotoPicker imageUrl={options[0]} options={options} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith('https://cdn.example/b.jpg');
  });

  it('keeps an uploaded photo selectable and offers upload + remove', () => {
    const onChange = vi.fn();
    const upload = 'data:image/jpeg;base64,' + 'A'.repeat(300);
    render(<PhotoPicker imageUrl={upload} options={['https://cdn.example/a.jpg']} onChange={onChange} />);
    expect(screen.getByLabelText('Your uploaded photo')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Upload your own photo')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Remove'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('Journal photos', () => {
  it('shows each coffee’s photo on its journal row, with a placeholder fallback', () => {
    const entries = [
      { id: '1', kind: 'brew', createdAt: new Date().toISOString(), coffeeData: { name: 'Guji', imageUrl: 'https://cdn.example/guji.jpg' }, brewData: {}, recipe: {} },
      { id: '2', kind: 'brew', createdAt: new Date().toISOString(), coffeeData: { name: 'Huila' }, brewData: {}, recipe: {} },
    ];
    const { container } = render(<History entries={entries} onOpen={() => {}} onDelete={() => {}} />);
    const imgs = [...container.querySelectorAll('img.journal-thumbnail')].map(i => i.getAttribute('src'));
    expect(imgs).toEqual(['https://cdn.example/guji.jpg', '/icons/coffee-placeholder.svg']);
  });
});

describe('PhotoPicker memory', () => {
  it('keeps the previous photo selectable after an upload replaces it', () => {
    const onChange = vi.fn();
    const saved = 'https://cdn.example/saved.jpg';
    const upload = 'data:image/jpeg;base64,' + 'B'.repeat(300);
    const { rerender } = render(<PhotoPicker imageUrl={saved} options={[]} onChange={onChange} />);
    rerender(<PhotoPicker imageUrl={upload} options={[]} onChange={onChange} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByLabelText('Your uploaded photo')).toHaveAttribute('aria-checked', 'true');
  });
});
