import { EXERCISES } from "./exercise-catalog";
export { EXERCISES } from "./exercise-catalog";
export function recommendExercises(skills: string[]) {
  const normalized = new Set(skills.map((skill) => skill.toLowerCase()));
  return EXERCISES.map((exercise, index) => ({ ...exercise, matchedSkills: exercise.resumeSignals.filter((skill) => normalized.has(skill.toLowerCase())), order: index }))
    .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length || a.order - b.order);
}
