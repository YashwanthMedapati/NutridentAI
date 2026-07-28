import React from "react";

export function BadgesTab({ level, earnedBadges, allBadges }) {
  return (
    <div className="badges-tab">
      <div className="level-display-card">
        <span className="level-big-emoji">{level.emoji}</span>
        <div>
          <h3 className="level-display-name">{level.name}</h3>
          <p className="level-display-sub">{earnedBadges.length} / {allBadges.length} badges earned</p>
        </div>
        <div className="level-progress-bar-wrap">
          <div className="level-progress-track">
            <div className="level-progress-fill"
              style={{ width: `${(earnedBadges.length / allBadges.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {["Nutrition","Oral Health","Consistency","Weight"].map(cat => (
        <div key={cat} className="badge-category">
          <h3 className="badge-cat-title">{cat}</h3>
          <div className="badge-grid">
            {allBadges.filter(b => b.category === cat).map(badge => {
              const earned = earnedBadges.includes(badge.id);
              return (
                <div key={badge.id} className={`badge-card ${earned ? "earned" : "locked"}`}>
                  <span className="badge-emoji" style={{ opacity: earned ? 1 : 0.3 }}>
                    {badge.emoji}
                  </span>
                  <span className="badge-name">{badge.name}</span>
                  <span className="badge-desc">{badge.desc}</span>
                  {earned && <span className="badge-earned-tag">✓ Earned</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
