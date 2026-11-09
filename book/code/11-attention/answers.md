# Answers: Attention

1. Position 4. Query 1 has scores (1, 0, -1, 3) against the four keys, so key 4 has the largest score, 3. After dividing by 2 and taking the softmax it holds 0.58 of the weight; the others hold 0.21, 0.13 and 0.08.

2. The row becomes flatter. The raw scores (1, 3, 5) give weights (0.016, 0.117, 0.867), with entropy 0.441; the divided scores give (0.090, 0.245, 0.665), with entropy 0.833, against 1.099 for three equal shares. This matters because a row that is nearly one-hot has almost no slope, so almost no gradient reaches the query and key projections and they cannot be corrected. Dividing by the root of the width keeps the typical score near one whatever the width.

3. The weights depend on content only, so permuting the input rows permutes the output rows and changes nothing else. A `WWW`-first string and a `CCC`-first string hold the same residues, so the set of output rows is the same, and any classifier after pooling sees the same numbers for both classes. Position must enter the scores, by adding a position vector to each row before the projections.

4. 12 × 12 = 144 comparisons against 12 steps. The ratio is 12, the length itself, so the ratio grows in step with the length: at length 24 it would be 576 against 24, a factor of 24. Reach (any two positions in one step) is paid for with the square of the length.

5. Row 1 keeps only one of its 12 cells, so before the division the kept weight is 0.05, the share it had in the full softmax. A row of weights must sum to one to be a weighted average. Dividing by 0.05 restores a sum of 1.00. Without it, row 1's output would be about a twentieth of its value row while row 12, which keeps everything, would be at full size, so rows would be on different scales.
