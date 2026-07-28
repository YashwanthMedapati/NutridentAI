import React from "react";

export default function Tips() {
  const tips = [
    { icon: "🪥", cat: "Brushing",  title: "Brush twice daily",              body: "Use fluoride toothpaste and brush for at least 2 minutes each time, especially before bed." },
    { icon: "🧵", cat: "Flossing",  title: "Floss daily",                    body: "Plaque between teeth causes up to 35% of cavities. Floss once a day, ideally at night." },
    { icon: "💧", cat: "Hydration", title: "Drink water after meals",        body: "Water rinses away sugar residue and stimulates saliva production to neutralise mouth acids." },
    { icon: "🥛", cat: "Diet",      title: "Eat calcium-rich foods",         body: "Dairy, leafy greens, and fortified plant milks supply calcium that remineralises enamel." },
    { icon: "⏰", cat: "Habits",    title: "Limit snacking frequency",       body: "Each eating occasion triggers 20 minutes of acid attack. Reduce snacking to reduce total acid exposure time." },
    { icon: "🍬", cat: "Diet",      title: "Cut sugary drinks",              body: "Soda, juice, and energy drinks bathe teeth in sugar for hours. Swap for water or unsweetened tea." },
    { icon: "🌿", cat: "Diet",      title: "Eat crunchy vegetables",         body: "Raw carrots, celery, and apples stimulate saliva and mechanically clean teeth while you eat." },
    { icon: "🚬", cat: "Lifestyle", title: "Avoid tobacco",                  body: "Smoking and chewing tobacco reduce saliva and cause bacterial imbalance — two major caries accelerators." },
    { icon: "🦷", cat: "Care",      title: "Use fluoride mouthwash",         body: "Fluoride rinse after brushing provides additional enamel protection, especially for high-risk individuals." },
    { icon: "📅", cat: "Care",      title: "Regular dental check-ups",       body: "Visit a dentist every 6 months for professional cleaning and early detection of caries before they progress." },
    { icon: "🍫", cat: "Diet",      title: "Dark chocolate over milk choc",  body: "Dark chocolate has less sugar and contains theobromine, which may actually harden enamel." },
    { icon: "🧀", cat: "Diet",      title: "Finish meals with cheese",       body: "Cheese raises mouth pH and provides calcium — ending meals with a small piece can reduce acid damage." },
  ];

  const cats = [...new Set(tips.map(t => t.cat))];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Oral Health Tips</h1>
        <p className="page-sub">Evidence-based practices to protect your teeth and reduce caries risk.</p>
      </div>
      {cats.map(cat => (
        <div key={cat} className="tips-section">
          <h2 className="tips-cat">{cat}</h2>
          <div className="tips-grid">
            {tips.filter(t => t.cat === cat).map(({ icon, title, body }) => (
              <div className="tip-card" key={title}>
                <span className="tip-icon">{icon}</span>
                <h3 className="tip-title">{title}</h3>
                <p className="tip-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
