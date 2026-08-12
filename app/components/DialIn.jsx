import { DIAL_IN_ISSUES } from '../data/brewing-options';

/**
 * Dial-In input form — quick-select issue chips plus a free-text box.
 * Shown inside RecipeView when the user enters dial-in mode.
 */
export default function DialIn({ dialInFeedback, setDialInFeedback, onCancel, onSubmit, dialingIn }) {
  return (
    <div className="fade-in notion-card" style={{
      padding: '20px',
      marginBottom: 'var(--space-lg)',
      borderRadius: 'var(--radius-xl)'
    }}>
      <div className="eyebrow" style={{ marginBottom: '12px' }}>
        Dial It In
      </div>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        What&apos;s not working with your cup?
      </p>
      <div className="dial-in-issues" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {DIAL_IN_ISSUES.map(issue => (
          <button
            key={issue}
            onClick={() => setDialInFeedback(prev => prev ? `${prev}, ${issue.toLowerCase()}` : issue.toLowerCase())}
            className={`dial-in-btn${dialInFeedback.includes(issue.toLowerCase()) ? ' active' : ''}`}
          >
            {issue}
          </button>
        ))}
      </div>
      <textarea
        value={dialInFeedback}
        onChange={e => setDialInFeedback(e.target.value)}
        placeholder="Describe what you're tasting or experiencing..."
        className="notion-input"
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: '14px',
          minHeight: '80px',
          resize: 'vertical',
          marginBottom: '12px'
        }}
      />
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          className="notion-button-secondary"
          style={{
            padding: '14px 20px',
            fontSize: '15px'
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!dialInFeedback.trim() || dialingIn}
          className="notion-button-primary"
          style={{
            flex: 1,
            padding: '14px',
            fontSize: '16px'
          }}
        >
          Dial It In
        </button>
      </div>
    </div>
  );
}
