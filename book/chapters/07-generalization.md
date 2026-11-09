# Does the model work on new data?

Training asks one question: can the model fit the rows it was shown. A loss value answers that and no other. Whether the model works on rows it was not shown is a second question, and its answer is a property of the model together with the way the data was cut.

The week begins with a case small enough to check by hand. Four calibration standards give four readings, and two curves are fitted: a line and a cubic. The cubic has as many adjustable constants as there are standards, so it passes through all four and beats the line on them. A fifth standard reverses the verdict: the line lands close, the cubic misses by nearly half the signal. The readings carried instrument noise, and the fitted set could not show it.

At the course's scale the same reversal is the risk. The running example is the gene-family classifier: a gene read as the share of each 5-letter window it contains, one hidden layer, seven family scores, cross-entropy loss. Its loss on the genes it trained on falls to almost nothing — the four standards again, and as uninformative about the next gene.

This chapter is the second half of the pair that turns a metric into evidence. The first half built the measure: one score per family, softmax to make it a distribution, cross-entropy to compare it with the true family. This half asks what that measure is evidence about, which takes two things it cannot supply: a number computed on data the weights never touched, and proof that the data really was untouched. The week's largest measurement is on the second point, and it goes against a random split.


## Training loss keeps falling after held-out loss has turned up

[Training loss, held-out loss, and the gap](#fig-plot-curves) plots both losses from one training run on one axis, with a dashed rule marking the loss of an even guess over the seven families. The training curve falls to almost zero and stays. The held-out curve falls with it, bottoms at epoch 10, then climbs back, ending far above its own minimum but below the rule.

{{figure plot-curves}}

Read the shape after the minimum, not the distance between the curves. Held-out loss sits above training loss at every epoch, which is expected: the weights were adjusted on the training rows and never on the held-out ones. The distance becomes a diagnosis only when the curves move oppositely — one falling while the other turns up. That motion separates overfitting from learning and makes the epoch of the minimum the epoch to keep; early stopping keeps those parameters, not the last ones. One uptick is not yet a turn.

Two things belong to this run and are missing from the plate. It plots loss only, and here held-out accuracy still rises at the last epoch while held-out loss climbs, because loss charges a wrong answer in proportion to its confidence and the late network is wrong more confidently. So the stopping point depends on the use: the family name, or the confidence attached to it. And one seed cannot say whether the minimum's epoch belongs to the task or to that draw; the last plate is the week's answer.

## The same rows, a wall in a different place

[The same rows, a wall in a different place](#fig-split-homology-leakage) holds the data and the classifier fixed and changes one thing: which rows share a fold. The grid is a map of contamination. Columns are groups of homologous sequences, four per family; rows are folds; a mark means that group contributes rows to that fold's held-out slice. Where folds are drawn at random, every column sits partly in the fold and mostly in training, and held-out accuracy is near perfect. Where whole groups move as units, no group is on both sides, and held-out accuracy falls to a little above the even-guess rate for seven families.

{{figure split-homology-leakage}}

Read the cells rather than the accuracies. Between the panels nothing the classifier sees has changed except the fold assignment, so the size of the drop is the measured size of what a random split rewards. A held-out row whose near-relatives sit in training is not a new row; its score measures recognition of a family's sequence vocabulary, not prediction from an unseen example. The second panel is the honest one, and it stays above chance — something does carry across homologous groups, much less than the random split reported.

The week's own file holds the same defect in a smaller dose. It contains more rows than distinct sequences, so some held-out genes have an exact copy among the training genes. The lab separates the held-out genes into those with a copy and those without and scores each group: the copies are named correctly almost without exception, the rest score several points lower, and the lower figure is what to report for an unseen gene. The plate puts a relative of every held-out row into training; the lab's file contaminates part of the held-out set only, which is why its two numbers sit close together and the plate's do not.

What the plate does not show is the network. Its classifier is a multinomial naive Bayes model over the same 5-mer rows, held fixed across both panels so the fold assignment is the only variable, and it reports accuracy and no loss. The effect on the week's network is therefore not what this plate measures; the network's own audit is the lab's, and the lab reports it as a difference of a few points. Neither audit reaches near-copies that are not identical. The homologous grouping is given to the plate, not derived by it.

## An intervention counts only if its gain exceeds the spread between runs

[Dropout lowers held-out loss by more than the seeds vary](#fig-compare-regularizers) trains the same network on one split under two settings, dropout at probability 0.5 and none, five seeds each, with the same weight count, epochs and optimiser. One panel draws a held-out loss curve per run and prints each setting's mean bold. The other reduces each run to its final held-out loss and lays the two groups on one axis, whisker from lowest seed to highest.

{{figure compare-regularizers}}

The second panel carries the argument, and it is a comparison of two distances: the gap between the group means against the range across each group's own seeds. The means are further apart than the wider seed range, and every pairing of a plain run with a dropout run is ordered the same way, so the difference belongs to the setting rather than the draw. The first panel adds a second effect: the bold curves turn at different epochs, so dropout moves the stopping point later as well as the floor lower.

The lab runs the same comparison with one seed per setting, enough to compute a difference and not enough to compute a spread. A single pair of numbers can be reported; only repeated runs can be called evidence. The week's result is also narrower than "dropout improves the model" suggests: dropout lowers held-out loss and leaves held-out accuracy where it was, inside the range the seeds cover. Which of the two counts as the improvement follows from the use, the family name or the confidence in it. The choice is made on validation by the measure the question needs; the test set is scored once, afterwards, for that reason.

What the plate does not show: why dropout helps, a question about internals rather than curves; whether the ordering survives on another dataset; or anything beyond the seeds it draws. A weight-decay run at the same weight count sits in the key and is not drawn, so no regularizers are ranked. Loss is the only measure it plots.

## What you can now do

- Name the set a loss or accuracy was computed on, and what claim that number does and does not support.
- Read a pair of loss curves and say whether the model is underfitting, learning or overfitting, and which epoch to keep for a stated use.
- Check a split for shared identity between held-out and training rows, and report the accuracy over rows with no counterpart.
- Judge an intervention against the spread between repeated runs, and score a test set once.

## What this does not give you

Every number in the week comes from one file of human gene sequences, from one source, cut by one pair of stratified splits. A held-out score estimates performance on genes like those in that file; it says nothing about another lab's samples or another sequencing run, and the plate on folds shows how far such a score moves when the cut alone changes. Copies that are not exact stay unaudited. The seed evidence covers one split and a handful of runs, enough to order two settings, not enough to rank regularizers. What the representation discards is the next chapter's question: a gene here is a bag of 5-mer shares.

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

Four questions, answerable from this chapter and the lab. Answers belong in the back matter.

1. The lab's `diagnosis` is overfitting while the training loss has fallen to 0.0007. A classmate says that training loss shows the network names new genes correctly. What is wrong with the inference, and which printed number answers the question instead?
2. Step 4 computes `spread` and `gain`. What does a gain larger than the spread license, and what can one seed per setting not show?
3. Step 6 computes `acc_all` and `acc_no_twin`. Which one describes a gene the network has never seen, and why is the other flattering?
4. You choose between the plain and the dropout network on validation, score the test set once, then run the other network out of curiosity. What has the test set become, and what is needed before another test score means anything?


---

← [Multiclass and softmax](06-multiclass.md)  ·  [What a fixed-size input can and cannot learn](08-fixed-size-inputs.md) →
