import React from "react";
import { MealSection } from "./MealSection";

const MEAL_ICONS = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snacks: "🍎" };

export function MealsTab({ kcal, carioColor, cario, meals, addFoodToMeal, removeFoodFromMeal }) {
  return (
    <div className="meals-tab">
      <div className="meals-summary-row">
        <div className="meals-stat"><span className="ms-val">{Math.round(kcal)}</span><span className="ms-lab">kcal today</span></div>
        <div className="meals-stat"><span className="ms-val" style={{ color: carioColor }}>{cario.label}</span><span className="ms-lab">cariogenic load</span></div>
        <div className="meals-stat"><span className="ms-val">{Object.values(meals).flat().length}</span><span className="ms-lab">items logged</span></div>
      </div>

      {Object.entries(MEAL_ICONS).map(([mealName, icon]) => (
        <MealSection
          key={mealName}
          mealName={mealName}
          icon={icon}
          items={meals[mealName] || []}
          onAdd={addFoodToMeal}
          onRemove={removeFoodFromMeal}
        />
      ))}
    </div>
  );
}
