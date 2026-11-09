# Multiclass and softmax

A gene belongs to exactly one family, and there are seven families. One yes or no question — is this an ion channel — fits in a single output. This week's question is different in kind. It asks which of seven names applies, and one number has no room for seven names. Nor is there an order to lean on: nothing puts synthetase between tyrosine kinase and ion channel, so no score can be read as a position on a line. The model holds one output per family, seven scores where the week before it held one.

One real human gene carries the argument from its first score to its last. It is an ion-channel gene, index 5 in a class order fixed for the whole week. Its bases become a vector of counts, the vector becomes seven scores through one linear layer, the scores become seven probabilities, and the loss reads the single probability the model gave the true family. In the worked numbers the largest score lands on the wrong family. Softmax keeps the order the linear layer set, the loss reads the one entry that matters, and the doubt spread across the rest of the row is what training moves against.

The data are RefSeq gene records: 4,380 human sequences labelled with one of seven families, with 1,682 chimp and 820 dog sequences beside them. The families are unequal: the largest holds about 5.6 times the sequences of the smallest, so naming the largest family for every gene already scores around three in ten. That is the floor, and the lab computes it before any model is fitted. Chimp and dog are other species' test sets, scored in the lab and returned to later.

The representation is a tally, and the tally is half of a pair. Counting short windows gives every gene the same width whatever its length, and discards where in the sequence the windows sat. This week runs on the width and does not notice the loss of position; the later chapter on fixed-size inputs is where strings differing only in order arrive as identical numbers. That is the repair to this half of the pair.

The lab takes the mechanism to a second model and to a comparison. It rebuilds Krish Naik's notebook — six-base windows, runs of four such words counted as columns, a multinomial naive Bayes over them — and scores it on human test, chimp and dog. Part B replaces that featurization with k-mer counts, trains the week's softmax classifier with no hidden layer and with hidden units, and searches the window length. Four graded questions read the resulting tables, with the dog column weighing most.


## A gene reaches the loss through five shapes, and the last step reads a single entry

[One sequence, five shapes](#fig-trace-kmer-gene) traces one sequence end to end: its letters, a count vector with one slot per distinct window of the chosen width, the seven scores a linear layer makes of it, the seven probabilities softmax makes of those, and the one scalar the loss returns. It is the only page in the week where all four operations sit together with numbers attached, and its key gives the constants, the operations in flow order and the equivalent PyTorch lines.

{{figure trace-kmer-gene}}

Read the middle against the end. The largest score belongs to one family and the true family is another, so the loss comes out above what an even spread over the families would cost, and the plate prints that comparison rather than leaving it to arithmetic. Two objects are being kept apart: the decision, which is the index of the largest score and is wrong, and the distribution, a full row that still holds mass on the true family and is what the loss reads. Most slots in the vector are zero, so the evidence sits in the windows that occurred.

The plate shows one gene and one weight matrix, given rather than trained: no batch, no gradient, no accuracy, no second sequence. Its window width is neither the lecture's nor the lab's default, which the plate states itself; a reader carrying shapes between the three should expect three vector lengths and take none of them as the course's setting.

## Softmax exponentiates the scores and divides by the total, which fixes the scale and not the ranking

[Softmax](#fig-eq-softmax) is the function alone: one exponential over the sum of all the exponentials, five symbols defined beneath it, and a worked row of three scores carried through their exponentials, their total and the division. Exponentiation makes every score positive and widens the gaps; dividing by the total makes the shares sum to one, which is what turns a row into a distribution.

{{figure eq-softmax}}

The step after the worked example is the one to follow. The largest score is subtracted from every score first, because the exponential of a large score overflows the number type and the ratio of two infinities is not a number. The same exponential then sits above and below the line, and dividing top and bottom by one constant leaves the fraction unchanged, so this is the same distribution computed a safer way, not an approximation. The operation cannot reorder: the exponential increases with its input, so the largest score keeps the largest probability.

The plate carries no data and no model, so it does not say whether the top probability is the chance the model is right. It normalizes a row; it does not calibrate one. Scores twice as large give a sharper distribution over the same ranking, and nothing here decides which a trained model should produce.

## Cross-entropy adds the class terms, and a one-hot truth leaves one of them standing

[Cross-entropy](#fig-eq-cross-entropy) works a four-class example: a target with all its mass on one class, a predicted distribution over the four, the four products of true mass times log predicted probability, and their sum with the sign flipped. Three products are printed as zeros, for the reason the plate gives — a true mass of zero kills whatever it multiplies — so the loss equals the negative log of the probability the prediction placed on the true class.

{{figure eq-cross-entropy}}

The surviving term has no ceiling and a slope that grows: a prediction putting almost nothing on the true class pays a large number, and pays more the surer it was of the wrong family. Squared error on a probability does the opposite, its slope shrinking exactly where the model is most confidently wrong. That is why the course scores a distribution with a log, for one output and for seven alike.

The plate stops at the loss. It does not draw the derivative, which for this pair of functions is the predicted distribution minus the truth: negative on the true class, positive on each of the others, sized by the probability given to each. That is the whole of one training step, and it has to be taken from the lecture. The plate also uses four classes and a distribution no model in this week produced; it is the week's arithmetic at a smaller class count.

## What you can now do

- Say why the output is one score per family, and why an unordered set of names cannot ride on one number.
- Derive a count vector's width from the window length, and say what the tally keeps and what it throws away.
- Trace one gene through the five shapes on [One sequence, five shapes](#fig-trace-kmer-gene), keeping the decision and the distribution apart.
- Say why subtracting the largest score inside softmax is exact, and why a softmax in front of `F.cross_entropy` scores something other than this week's loss.
- Read the lab's comparison of three models over human test, chimp and dog, and name from a per-family report which family is mistaken for which.

## What this does not give you

The representation is a bag of windows. Nothing here restores position or measures what the tally cost, so the accuracy is an accuracy about composition, not arrangement. The accuracies come from held-out human genes and two other species, which is transfer across individuals and species, not across families absent from training. A top probability is not a probability of being right: softmax normalizes a row, and the week never calibrates one. The window length is settled by searching three values against three accuracies, which is a comparison rather than a rule for choosing.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Gene-family corpus: `sequence\tclass`, 4,380 human / 1,682 chimp / 820 dog sequences in seven RefSeq gene families, mirrored from `raahuldatta/DNA-Sequencing-using-Machine-Learning-and-Deep-Learning-Algorithms` and fetched 2026-09-29. The mirror's licence is unverified: see SOURCES.md.

## Questions

Four questions are graded this week. The answers belong in the back matter, with the rest of the course's answer keys.

1. The majority baseline names one family for every gene. What does it score, and how far above it does the k-mer model sit on human test, chimp and dog? Which family does it recover most often on dog, and which least?
2. Take one mistake from a confusion table, or one wrongly named dog gene from `predict_proba`. Give the probability the model put on the family it chose and on the family the gene really belongs to, and say what makes the case hard.
3. Part B compares three models on the same three sets: the naive Bayes over word runs, the softmax classifier over k-mer counts, and the network with hidden units. Which belongs in a biologist's hands, and what do the comparison table and the loss plot say for it?
4. What did changing the window length do to the three accuracies, and what would be the next run?


---

← [Evaluation: how you know a model works](05-evaluation.md)  ·  [Does the model work on new data?](07-generalization.md) →
