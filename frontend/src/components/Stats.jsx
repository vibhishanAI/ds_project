export default function Stats({ drivers, matchResult, onRemoveDriver }) {
  const results = Array.isArray(matchResult) ? matchResult : (matchResult ? [matchResult] : []);
  const matchedCount = results.length;

  return (
    <>
      {/* Match Result */}
      <div className="glass-card match-result">
        <div className="card-title">Match Results ({matchedCount})</div>
        <div className="match-scroll">
          {results.length > 0 ? (
            results.map((res, i) => {
              const x = res.point ? res.point[0] : '';
              const y = res.point ? res.point[1] : '';
              return (
                <div key={res.point ? `${x}-${y}` : i} className="match-card">
                  <div className="match-header">
                    <span>🎯</span> Matched Driver
                  </div>
                  <div className="match-details">
                    <div className="match-detail">
                      <span className="match-detail-label">Location</span>
                      <span className="match-detail-value">({x}, {y})</span>
                    </div>
                    {res.distance !== undefined && (
                      <div className="match-detail">
                        <span className="match-detail-label">Distance</span>
                        <span className="match-detail-value">{res.distance.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-match">No results found</div>
          )}
        </div>
      </div>

    </>
  );
}
