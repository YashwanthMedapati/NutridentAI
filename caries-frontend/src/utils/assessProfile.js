// Pure helper shared by the Risk Assessment wizard — no React.

export function buildCoachProfile(form, plan) {
  const current = Number(form.weight || 0);
  const goal = Number(form.goal_weight || current);
  return {
    age: form.RIDAGEYR || "",
    gender: form.RIAGENDR || "1",
    height: form.height || "",
    weight: form.weight || "",
    goal_weight: form.goal_weight || "",
    goal_type: goal < current ? "lose" : goal > current ? "gain" : "maintain",
    activity_level: form.activity_level || "sedentary",
    goal_date: form.goal_date || "",
    maintenance_calories: plan?.maintenance ? String(plan.maintenance) : "",
    calorie_target: plan?.target ? String(plan.target) : "",
    protein_target_g: plan?.macros?.protein_g ? String(plan.macros.protein_g) : "",
    carbs_target_g: plan?.macros?.carbs_g ? String(plan.macros.carbs_g) : "",
    fat_target_g: plan?.macros?.fat_g ? String(plan.macros.fat_g) : "",
    sugar_limit_g: plan?.macros?.sugar_g ? String(plan.macros.sugar_g) : "",
    fiber_target_g: plan?.macros?.fiber_g ? String(plan.macros.fiber_g) : "",
  };
}
