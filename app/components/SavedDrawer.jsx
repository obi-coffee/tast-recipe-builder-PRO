/**
 * Saved recipes drawer, toggled from the header logo.
 */
export default function SavedDrawer({ savedRecipes, onLoad, onDelete }) {
  return (
    <div>
      {savedRecipes.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>
          No saved recipes yet. When you land on a recipe you love, it’ll show up here for quick access.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '4px' }}>
          {savedRecipes.map(saved => (
            <div key={saved.id} className="saved-recipe-row" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              transition: 'background 0.1s ease'
            }}>
              <img
                src={saved.coffeeData.imageUrl || '/icons/coffee-placeholder.svg'}
                alt=""
                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/icons/coffee-placeholder.svg'; }}
                className="recipe-thumbnail"
              />
              <button
                onClick={() => onLoad(saved)}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  flex: 1,
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ fontWeight: 500, fontSize: '14px' }}>
                  {saved.coffeeData.name || `${saved.coffeeData.origin} ${saved.coffeeData.variety}`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {saved.brewData.device} · {saved.recipe.dose}
                </div>
              </button>
              <button
                onClick={() => onDelete(saved.id)}
                aria-label={`Delete ${saved.coffeeData.name || 'saved recipe'}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <img src="/icons/close.svg" alt="" className="notion-icon notion-icon-sm notion-icon-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
