# Evaluation: how you know a model works

A training run ends with a loss that has stopped falling. That number says the model fits the rows it was shown. It does not say the model works. This week supplies the instruments that answer the second question and separates the two jobs inside measurement. **Evaluation** judges a finished model on rows it has never seen: how often it is right, and what kind of wrong it is. **Analysis** opens the model up and asks what it built in the middle. Evaluation cannot see inside the model; analysis cannot tell you whether the model is any good.

The loss and the metric are two products of one idea. The loss is the version of the error the optimizer can read: one scalar over the batch, smooth, differentiable. A metric is the version a person can read: several numbers, per class, chosen to be trusted rather than differentiated. Week 3 called the loss the evaluation function. The metric is the other one.

The running example is built in the lab and nothing is downloaded. A thousand rows, four columns, one label. Two columns carry the signal; two come from the same distribution and never enter the rule that makes the label; noise inside that rule sends a share of rows to the other side whatever their markers say, so those rows are unlabelable by construction. Because we wrote the rule, the ceiling on any score is known — and a column that looks like the others may be worth nothing. Two hundred and fifty rows fit the model, seven hundred and fifty are held back, and every number the lab reports comes from the held-back rows.

Chapters 3 and 4 built the network and put it inside objects. This chapter measures it, and stops where seven classes need one number per class — which is where chapter 6 starts, and why the first plate below is a seven-class matrix. The week names three parts of the data and uses two: rows the parameters move on, and rows nothing touches. A validation set arrives in chapter 7. This chapter supplies the instruments; chapter 7 shows the trap they walk into. A metric is only as honest as the rows under it.


## An accuracy of 0.978 still contains nineteen errors, and they are not spread evenly

[Eight ion channels named wrong, inside an accuracy of 0.978](#fig-metric-confusion) opens one accuracy into its cells. Seven rows for the true gene family, seven columns for the family the model named, one cell per gene, over 876 held-out sequences. Panel A counts genes; panel B divides each row by its own total. The accuracy at the foot of the plate is the diagonal over everything.

{{figure metric-confusion}}

Read the plate by row. A row divided by its own count is that family's recall, and the rows disagree widely: transcription factor near perfect, ion channel keeping about four fifths of its forty-four genes. Read it by column as well. Eleven of the nineteen errors sit in one column, and that column is larger than the family's own row, so the model names that family too readily. The largest single cell is six genes, an ion channel named a GPCR. It is the commonest confusion on the plate, and the plate draws no conclusion from it: six is a count, not a cost.

What the matrix cannot carry is the weighting. With a flat cost each of the nineteen errors costs one, and the plate totals them that way — it cannot say that a missed ion channel matters more than a mislabelled synthetase. It gives no mechanism: a count of outcomes does not say why one gene carried another family's name. And it describes one corpus, held out from the same source as the rest.

## Accuracy is the commonest class’s share of the rows, so it describes the data before it describes the model

[Accuracy is the commonest family’s share of the rows](#fig-metric-prevalence) takes the same corpus before any model exists. The left panel draws each family's count on an axis whose full length is all 4,380 rows, so a bar's length is also its prevalence. The right panel gives, for each family, the share of its rows that a rule with no model names right: the rule that answers "transcription factor" every time and fits nothing.

{{figure metric-prevalence}}

That pooled number is an identity worth carrying: accuracy over unequal classes is the prevalence-weighted mean of the per-class recalls. It can be high because the large classes are easy, and the small classes are the ones it goes quiet about — the asymmetry the confusion matrix showed, with the same weights behind it. So report a metric beside a **baseline**: the score of the simplest model that could possibly work, on the same rows, measured the same way. Here the baseline names a family without looking at a gene, and a model reading 0.978 has the difference to explain. On a two-class screening problem that baseline is "call everyone healthy", high accuracy and zero recall, and **recall** exposes it.

The plate is careful about what it is not. No split is drawn: the null rule is given the class counts of the rows it is scored on, so its accuracy is the size of the floor, not a score on unseen rows. The plate recommends no correction to the metric. Every class here has rows, so every zero recall on the plate is measured rather than a division by zero.

## A cutoff you chose prices the two errors against each other

[Right ninety percent of the time, and useless](#fig-metric-threshold) puts three decision rules on the same 200 held-out screening rows, one square to a row, with the diseased rows as the top line. The first rule flags nothing. The other two are the same model at two cutoffs on its probability, one high and one low, each printing its counts and the metrics built from them.

{{figure metric-threshold}}

Follow the cut downward. More diseased rows are caught and more healthy ones are pulled in with them: recall rises, precision falls. Accuracy is highest for the rule that finds nobody and lower for the cut that catches most of the cases, so the headline number is largest exactly where the misses are worst. Precision on the do-nothing rule has no value, because no row was flagged, and a metric with an empty denominator is not a metric. Counting a missed case as ten follow-up tests ranks the three rules, and the two cuts change places at a cost ratio of 3: below it the high cut is cheaper, above it the low cut. That ratio is a judgement about the problem, and no arithmetic on the plate supplies it.

The plate does not measure the ratio, does not say where the probabilities came from, and does not show a model being chosen. What it establishes is that "the model's accuracy" is shorthand: between the two cuts the model did not change and the counts did, so the number belongs to a model and a cutoff together.

## What you can now do

- Turn a confusion matrix of any size into four counts, and get the three metrics from them, naming each denominator.
- Say what a rule with no model scores on a class distribution, and report a model beside it rather than alone.
- Explain why a metric computed on the rows that moved the parameters says nothing about a new row.
- Move a cutoff, name which error grows and which metric rises, and state the assumption behind the direction.
- Say what evaluation cannot see, and name the second lens.

## What this does not give you

The lab splits its rows once: 250 to fit, 750 held back, and the same 750 for every number in the session. Nothing here uses a third set to choose between models or settings, so a number can still be chosen and reported on the same rows. That is chapter 7's subject, and so is every metric or curve beyond accuracy, recall and precision, which is all this week measures.

The second lens is named and not used. The week's closing case is a model whose reported recall depended on a patient identifier sitting in the feature matrix, and the instruments in this chapter read that model as good: every number in it was computed correctly. What caught it was a look at the columns, which is analysis, and which no plate here performs.

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

Answerable from this chapter and the lab. Answers belong in the back matter.

1. On ten held-out rows the lab counts TP 4, FP 2, FN 1, TN 3. Which metric is 4/5, and what does its denominator count?
2. A rule that answers "healthy" every time has high accuracy and zero recall. Which single number in the report exposes it?
3. Take the low cutoff on the plate of three decision rules: give its four counts, then name the metric that rose against the high cutoff and the one that fell.
4. If a missed case costs more than a false alarm, which count do you want smaller, and which way do you move the cutoff? Name the metric that rises and the one that falls.
5. The lab measures accuracy on 250 training rows and again on 750 held-back rows. Which belongs in a report, and what single change to the split makes the other visibly misleading?


---

← [Neural networks and new classes](04-neural-networks.md)  ·  [Multiclass and softmax](06-multiclass.md) →
