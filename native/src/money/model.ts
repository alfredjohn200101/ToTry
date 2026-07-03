// Stewardship — calm command over money, framed as freedom not anxiety. Savings goals and debt
// payoff, plus the moat: the money reclaimed from vices (computed in the Fight) becomes a reason
// the streak matters. Leads with freedom regained, not what's owed.
import { get, set } from '@/data/store';

export type SavingsGoal = { id: string; name: string; target: number; saved: number };
export type Debt = { id: string; name: string; balance: number; start: number };

const GKEY = 'money.goals';
const DKEY = 'money.debts';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function getGoals(): SavingsGoal[] {
  return get<SavingsGoal[]>(GKEY, []);
}
export function saveGoals(g: SavingsGoal[]): void {
  set(GKEY, g);
}
export function getDebts(): Debt[] {
  return get<Debt[]>(DKEY, []);
}
export function saveDebts(d: Debt[]): void {
  set(DKEY, d);
}

export function makeGoal(name: string, target: number): SavingsGoal {
  return { id: uid(), name: name.trim(), target: Math.max(0, target), saved: 0 };
}
export function addToGoal(goals: SavingsGoal[], id: string, amount: number): SavingsGoal[] {
  return goals.map((g) => (g.id === id ? { ...g, saved: Math.max(0, g.saved + amount) } : g));
}
export function removeGoal(goals: SavingsGoal[], id: string): SavingsGoal[] {
  return goals.filter((g) => g.id !== id);
}

export function makeDebt(name: string, balance: number): Debt {
  const b = Math.max(0, balance);
  return { id: uid(), name: name.trim(), balance: b, start: b };
}
export function payDebt(debts: Debt[], id: string, amount: number): Debt[] {
  return debts.map((d) => (d.id === id ? { ...d, balance: Math.max(0, d.balance - amount) } : d));
}
export function removeDebt(debts: Debt[], id: string): Debt[] {
  return debts.filter((d) => d.id !== id);
}

export const totalSaved = (g: SavingsGoal[]) => g.reduce((s, x) => s + x.saved, 0);
export const totalDebt = (d: Debt[]) => d.reduce((s, x) => s + x.balance, 0);
export const totalPaidOff = (d: Debt[]) => d.reduce((s, x) => s + Math.max(0, x.start - x.balance), 0);
export const pct = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
