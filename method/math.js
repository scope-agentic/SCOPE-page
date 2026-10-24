// The paper's bounded coefficient (Eq. 8) and pairwise preference (Eq. 10).
export function distillationSignal(gap, selected = true, alpha = 2.5, bound = 1) {
  return selected ? bound * Math.tanh(alpha * gap / bound) : 0;
}
export function pairwiseBonus(length, otherSuccessfulLengths, success = true, temperature = 0.1) {
  if (!success) return 0;
  if (!otherSuccessfulLengths.length) return .5;
  return otherSuccessfulLengths.reduce((sum, other) => sum + 1 / (1 + Math.exp((Math.log(length) - Math.log(other)) / temperature)), 0) / otherSuccessfulLengths.length;
}
