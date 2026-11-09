# Answers: Linear analysis

1. Every number afterwards describes only the surviving 333 of 344 rows, so any claim about "penguins" is really about penguins with complete records. The cost is small when the gaps are few and scattered. It is indefensible when rows go missing for a reason connected to what is being predicted, because the survivors are then a biased sample.
2. Numbering says Gentoo (2) is twice as far from Adelie (0) as Chinstrap (1) is, and that the species have an order. The one-hot version says every pair of species is equally far apart. The per-species means show this is not true of the birds, since the species differ by unequal amounts.
3. Collapse over rows with `T.mean(dim=0)` and `T.std(dim=0)` (axis 0). The result has shape (4,), one value per column, and the standardised table keeps shape (333, 4). The printed per-column means should be about 0 and the standard deviations about 1.
4. Two columns come back. The dropped species is represented by both columns being 0. No information is lost, since the third column is determined by the other two.
5. Because the point of a held-out set is that nothing in the fit has seen it. Computing statistics from held-out rows breaks that however small the change is. The rule exists to make the score trustworthy, not to prevent a large numerical shift.
6. It says that, for that pair, each extra millimetre of flipper goes with 77.5 g more mass. It does not show the first line is wrong because two points only ever agree with those two points. Choosing between lines needs a measure of wrong over all the birds.
7. The dot product is undefined, because the lengths 4 and 3 differ and one term has no partner. The code raises an error naming both shapes before any value is read.
