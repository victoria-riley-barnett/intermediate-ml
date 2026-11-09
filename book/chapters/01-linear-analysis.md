# Linear analysis

Machine learning is the answer to a question that cannot be written down as a rule. Unit conversion, tax, checking a DNA string for a start codon: each has a rule, and a program should hold the rule. Whether an email is spam does not. Every hand-written version carries thousands of exceptions, and the exceptions are the work. What exists instead is a large pile of examples people already sorted.

Three pieces recur in every week: the data, examples with the right answer attached; the model, the shape of the rule with the numbers left blank; and a measure of wrong, one number saying how badly a set of blanks does. Fitting chooses the blanks so that number gets small. A line through a scatter of points is a complete instance — pairs in, a straight relationship asserted, squared error as the measure.

The field also changes what counts as an answer. Statistics asks whether an effect is real and how large it is, and hands back a coefficient with assumptions attached. Machine learning asks what happens with the next one. The score is a measurement on data the model has never seen, which makes holding data back part of the method.

The running example is a table of penguins from the Palmer Archipelago: Adelie, Chinstrap and Gentoo, with bill length, bill depth, flipper length and body mass measured on each, and the island the bird was recorded on. A measurement is already a number. A species is a word, and a model only does arithmetic. The table also has holes in it, a few cells nobody filled.

Nothing is fitted in this week. What it installs is what every later week assumes: a table of numbers of a known shape, and the habit of checking shapes before trusting values. The ladder from a straight line to a stacked encoder is one of degree.


## A shape can be checked before any value is

The plate follows five lines from the lab and records, for each, the shape it leaves, its dtype, and the axis it uses up: [A shape can be checked before any value is](#fig-trace-shape). Read the shape column as an inventory. Rows arrive as examples, columns as features, and every step either keeps both counts or removes one. Read dtype second: a column of whole numbers converts to an integer tensor, and an integer tensor will not multiply float weights.

{{figure trace-shape}}

The encoding is one of those five lines, and it needs a person. Species arrives as words; flipper lengths can be averaged and Adelie and Gentoo cannot. Numbering the species zero, one, two invents an order and a spacing the birds have not got, and everything fitted on that column acts on both. One column per species, a single 1 marking which applies, replaces the invented order with separate switches. Sorting the names first keeps column order fixed when somebody reorders the rows.

What the plate does not show is the price of the switches. The lab measures it: the species vectors share no slot, so any two sit at the same distance — Adelie as far from Gentoo as from Chinstrap — whether or not that is true of the birds, and the per-species means say it is not. No later training recovers a distinction the encoding declined to write down. How the data is written down is its representation, and choosing one is already a modeling decision.

## A prediction is the dot product of a row with a column of weights

[Dot product](#fig-eq-dot-product) pairs matching slots, multiplies, and adds. The output is one number whatever the input length, and the sum is undefined when the lengths disagree; the plate states that failure, a term left with no partner. In the lab, four measurements against four weights give one prediction with no loop, and the whole table against those weights gives every prediction at once.

{{figure eq-dot-product}}

The lab's weights are invented, so the predictions are meaningless on purpose. Their shape is the shape of a real prediction; filling in values is what fitting is for. Two uses recur. Centred and scaled, two vectors have Pearson's correlation as their dot product. And a one-hot vector against a table of per-species means pulls out one row: looking a value up and multiplying by a matrix are the same operation.

The plate is silent on where the numbers come from, and on whether a weight means anything, whether two features were on comparable scales, or whether the row being scored resembles the rows that will arrive later.

## A matrix applies the same rule to every row at once

[Matrix multiply](#fig-eq-matrix-multiply) computes one cell at a time and then states the size rule, which is the part to carry away: the two inner numbers must match, and what comes back has the two outer ones. A row of weights against a whole table is that rule applied to every row, so a mismatch names the two numbers that disagree. The message is read; the values are not.

{{figure eq-matrix-multiply}}

The lab also uses matrices on a cloud of points — a stretch, a rotation, a projection. Projection is the one to dwell on: two points land on the same output and no matrix undoes it, exactly as two numbers separated by equal steps average to the same value. Any step that reduces a dimension spends information to buy a smaller object. The plate shows the arithmetic and not that choice. Conventions differ on which side of the `@` the points sit, so a multiply that fails on shapes is often one transpose from working.

## Standardising a feature is subtracting a mean and dividing by a spread

[Mean and variance](#fig-eq-mean-variance) defines the two statistics, then standardises one feature: deviations from the mean, their squares, the mean of those squares, its square root, the standard scores. The plate also states the degenerate case. A feature that never changes has no spread, the rescale divides zero by zero, and the fix sets the spread to one and every score to zero.

{{figure eq-mean-variance}}

The reason to standardise is visible in the lab. Mass varies by hundreds of grams and bill depth by a few millimetres, so a weight on one column and a weight on the other are not comparable until the columns are. Zeroing one weight and then another changes the predictions by wildly different amounts, and that difference is the unit, not the importance. `standardize(T)` is this plate in broadcasting, and collapsing rows instead of columns is the miss.

The plate does not say whether the variance divides by the count or the count minus one — both conventions are in use, and it divides by the count — nor which rows the mean and spread are computed over.

## Where the standardisation statistics come from is a decision about the split

[The same split, a mean that saw the held-out rows](#fig-split-train-only) draws one split twice over the same rows. The only difference is the bracket: in one panel the mean and spread come from the training rows, in the other from every row including the held-out ones. Look at the bracket, then at how little the panels differ. The statistics move by a fraction of a percent, a handful of held-out predictions change, and over repeated splits the all-rows statistics come out better about as often as worse.

{{figure split-train-only}}

The rule does not rest on that measurement. Holding rows back is how the course finds out whether a model works on the next one; once the rescaling has read the held-out rows, the held-out score is no longer a score on unseen data, whatever the size of the shift. The leak is the principle, not the decimal. The plate does not cover the other channels by which a held-out row reaches the fitting — a duplicated record, related samples, a column that quietly encodes the label — each of which leaks more than a mean does.

## What you can now do

- Say what makes a problem a machine learning problem rather than a programming one, and name a case from your own field where the rule cannot be written down.
- Name the data, the model and the measure of wrong for a simple fit.
- Read `.shape`, `.dtype` and `.ndim` along a chain of operations and state the shape of a step before running it.
- Explain why numbering a category is not encoding it, and what the one-hot form costs.
- Standardise a column, state which rows the mean came from, and say when dropping rows is not defensible.

## What this does not give you

Nothing is fitted here: no loss, no gradient, no training loop. The one-hot cost stays open, and no later training repairs a claim the representation refused to carry. The limits the lecture names hold for everything built after this. A model that predicts well may be reading something that merely travels alongside the cause. A network answers confidently on input unlike what it trained on and reports no doubt. The data requirement is usually larger than the data at hand. And a wrong network is far harder to interrogate than a wrong regression; when the question is whether a treatment works, the trial and the regression remain the right answer.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Gorman, Williams & Fraser (2014). Ecological sexual dimorphism and environmental variability within a community of Antarctic penguins. *PLoS ONE* 9(3), e90081. doi:10.1371/journal.pone.0090081
- Horst, Hill & Gorman (2022). Palmer Archipelago penguins data in the palmerpenguins R package. *The R Journal*. doi:10.32614/rj-2022-020

## Questions

Answers belong in the back matter, not here.

1. The lab drops every row holding a missing cell before anything is plotted or converted. State what that decision costs, and the condition under which it would be indefensible.
2. Numbering the three species 0, 1, 2 is not equivalent to giving each species its own column. Say what the numbering asserts, and what the one-hot version asserts about distances between species that the per-species means contradict.
3. `standardize(T)` must collapse columns rather than rows. Give the call that does it, the shape it returns, and what the printed per-column means and standard deviations should read.
4. `pd.get_dummies(..., drop_first=True)` is applied to the species column. How many columns come back, how is the dropped category represented, and is any information lost?
5. In the split plate the two sets of standardisation statistics differ by a fraction of a percent. Explain why the rule about which rows they come from does not depend on the size of that difference.

---

← [Objects, and the shape of the work](00-objects.md)  ·  [The machine computes the derivative](02-autodifferentiation.md) →
