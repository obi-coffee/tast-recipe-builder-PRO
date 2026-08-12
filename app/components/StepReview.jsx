import { ReviewLine } from './ui';

/**
 * Step 3 — Confirm details before generating the recipe.
 */
export default function StepReview({
  coffeeData, brewData,
  loading, onBack, onGenerate,
}) {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="eyebrow" style={{ marginBottom: '6px' }}>Step 3</div>
        <h2 className="page-title section-header" style={{
          fontSize: '28px',
          margin: '0 0 6px'
        }}>
          Confirm Details
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
          Review before generating
        </p>
      </div>

      <div className="notion-card" style={{
        padding: '20px',
        marginBottom: '12px'
      }}>
        <div className="eyebrow" style={{ marginBottom: '14px' }}>Coffee</div>
        <div style={{ display: 'grid', gap: '0', fontSize: '14px' }}>
          {coffeeData.name && <ReviewLine label="Name" value={coffeeData.name} />}
          {coffeeData.origin && <ReviewLine label="Origin" value={`${coffeeData.region ? coffeeData.region + ', ' : ''}${coffeeData.origin}`} />}
          {coffeeData.variety && <ReviewLine label="Variety" value={coffeeData.variety} />}
          {coffeeData.process && <ReviewLine label="Process" value={coffeeData.process} />}
          {coffeeData.roastLevel && <ReviewLine label="Roast" value={coffeeData.roastLevel} />}
        </div>
      </div>

      <div className="notion-card" style={{
        padding: '20px',
        marginBottom: 'var(--space-xl)'
      }}>
        <div className="eyebrow" style={{ marginBottom: '14px' }}>Setup</div>
        <div style={{ display: 'grid', gap: '0', fontSize: '14px' }}>
          <ReviewLine label="Grinder" value={brewData.grinder} />
          <ReviewLine label="Device" value={brewData.device} />
          <ReviewLine label="Target" value={`${brewData.targetWeight}g`} />
        </div>
      </div>

      <div className="cta-bar" style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onBack}
          className="notion-button-secondary"
          style={{
            padding: '14px 20px',
            fontSize: '15px'
          }}
        >
          Back
        </button>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="notion-button-primary"
          style={{
            flex: 1,
            padding: '14px',
            fontSize: '16px',
            cursor: loading ? 'wait' : 'pointer'
          }}
        >
          Generate Recipe
        </button>
      </div>
    </div>
  );
}
