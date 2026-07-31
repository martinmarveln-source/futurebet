// @ts-nocheck
/**
 * Generates all possible combinations of size 'k' from an array of selections.
 */
export function getCombinations(arr, k) {
  if (k === 1) return arr.map((item) => [item]);

  const combos = [];
  arr.forEach((item, index) => {
    const smallerCombos = getCombinations(arr.slice(index + 1), k - 1);
    smallerCombos.forEach((combo) => {
      combos.push([item, ...combo]);
    });
  });

  return combos;
}

/**
 * Calculates the total stake and maximum potential return for a specific bet type.
 * @param {Array} selections - The matches in the betslip [{ odds: 1.5 }, { odds: 2.0 }, ...]
 * @param {Number} comboSize - 1 for Single, 2 for Double, 3 for Treble, etc.
 * @param {Number} stakePerBet - The amount staked PER combination.
 */
export function calculateSystemBet(selections, comboSize, stakePerBet) {
  const combos = getCombinations(selections, comboSize);
  const numberOfBets = combos.length;
  const totalStake = numberOfBets * stakePerBet;

  let maxPotentialReturn = 0;

  combos.forEach((combo) => {
    // Multiply the odds of all selections in this specific combination
    const comboOdds = combo.reduce((acc, curr) => acc * Number(curr.odds), 1);
    maxPotentialReturn += comboOdds * stakePerBet;
  });

  return {
    label:
      comboSize === 1
        ? "Singles"
        : comboSize === 2
        ? "Doubles"
        : comboSize === 3
        ? "Trebles"
        : `${comboSize}-Fold`,
    numberOfBets,
    totalStake,
    maxPotentialReturn: Number(maxPotentialReturn.toFixed(2)),
  };
}