# Evaluation: how you know a model works

A training run ends with a loss that has stopped falling. That number tells you the model fits the rows it was shown. It does not tell you the model works. Think of a student who has memorised last year's exam. A perfect score on that exam says little about the next one.

This chapter gives you the instruments that answer the second question. Measurement has two jobs. **Evaluation** judges a finished model on rows it has never seen: how often it is right, and what kind of wrong it is. **Analysis** opens the model up and asks what it built in the middle. Evaluation cannot see inside the model, and analysis cannot tell you whether the model is any good. This chapter is about evaluation.

The loss and the metric are two products of one idea. The loss is the version of the error that the optimizer can read: one number over the batch, smooth, and differentiable. A **metric** is the version a person can read: several numbers, often one per class, chosen to be trusted rather than differentiated. Chapter 3 called the loss the evaluation function. The metric is the other one.

The running example is built in the lab, and nothing is downloaded. It is a table of a thousand rows with four columns and one label. Two columns carry the signal. Two come from the same distribution but never enter the rule that makes the label. Noise inside that rule sends some rows to the other side whatever their markers say, so those rows cannot be labelled correctly by any model. Because we wrote the rule, we know how hard the problem is, and we know that two of the columns are worth nothing. Two hundred and fifty rows fit the model. Seven hundred and fifty are held back, and every number the lab reports comes from the held-back rows.

Chapters 3 and 4 built the network and put it inside objects. This chapter measures it. It stops where seven classes need one number per class, which is where chapter 6 starts. That is why the first plate below is a seven-class matrix. The lab uses two parts of the data: rows the parameters move on, and rows nothing touches. A third part, for choosing between models, arrives in chapter 7, together with the trap that these instruments walk into. A metric is only as honest as the rows under it.

> **On the timeline.** This chapter inherits the quiet years on the [architectures chapter](architectures.md) timeline, roughly 1994 to 2012. During them the field built few new architectures. It judged models instead on held-out benchmarks, and in 2012 the top five error on one of them was 15.3 percent against a next best of 26.2 percent. Neither the block nor the input changed here. What changed was how a model was scored.

## An accuracy of 0.978 still contains nineteen errors, and they are not spread evenly

The first plate opens one accuracy into its cells. It is a **confusion matrix**: a table with one row for each true class and one column for each class the model named, so one cell counts the rows with one particular true-and-named pair. Here the classes are seven gene families, and there are 876 held-out gene sequences. Panel A counts genes. Panel B divides each row by its own total. The accuracy at the foot of the plate is the diagonal over everything: 857 genes of 876.

{{figure metric-confusion}}

Read the plate by row first. A row divided by its own count is that family's **recall**, the share of the family's genes that the model found. The rows disagree widely. Transcription factor is near perfect at 99.6 percent. Ion channel keeps about four fifths of its 44 genes, 81.8 percent.

Then read it by column. Eleven of the nineteen errors sit in one column, the transcription factor column. That column is larger than the family's own row (291 genes named against 281 that are real), so the model names that family too readily. The largest single cell is six genes, an ion channel named as a GPCR. It is the most frequent confusion on the plate. The plate draws no conclusion from it, because six is a count and not a cost.

Three things the matrix cannot carry are worth stating. It has no weighting: with a flat cost each of the nineteen errors counts as one, and the matrix cannot say that a missed ion channel matters more than a mislabelled synthetase. It gives no mechanism: a count of outcomes does not say why one gene carried another family's name. And it describes one corpus, held out from the same source as the rest.

## Accuracy is the commonest class's share of the rows, so it describes the data before it describes the model

The second plate takes the same corpus before any model exists. The left panel draws each family's count on an axis whose full length is all 4,380 rows, so a bar's length is also that family's share of the rows. The right panel shows, for each family, the share of its rows that a rule with no model names right. That rule answers "transcription factor" every time and fits nothing.

{{figure metric-prevalence}}

The rule scores 1,343 of 4,380, which is 0.307. It gets every transcription factor right and every other family wrong. This gives an identity worth carrying. When classes are unequal, accuracy is the prevalence-weighted mean of the per-class recalls. Here that is 0.307 times 1.000 plus 0.693 times 0.000. Accuracy can be high simply because the large classes are easy, and the small classes are the ones it goes quiet about. That is the same asymmetry the confusion matrix showed, with the same weights behind it.

So report a metric beside a **baseline**: the score of the simplest model that could possibly work, on the same rows, measured the same way. Here the baseline names a family without looking at a gene. A model that reads 0.978 has the difference between 0.978 and 0.307 to explain. On a two-class screening problem the baseline is "call everyone healthy". It has high accuracy and zero recall, and recall is the number that exposes it.

The plate is careful about what it is not. No split is drawn. The null rule is given the class counts of the rows it is scored on, so its accuracy is the size of the floor and not a score on unseen rows. The plate recommends no correction to the metric. Every class has rows, so every zero recall on the plate is measured and not a division by zero.

## A cutoff you chose prices the two errors against each other

Most classifiers end by producing a probability, and a person turns it into a decision with a **cutoff**: above it, call the row positive, below it, negative. The lab uses 0.5 and says plainly that this is a choice and not a fact about the data. The third plate puts three decision rules on the same 200 held-out screening rows. One square is one row, and the diseased rows are the top line of twenty. The first rule flags nothing. The other two are the same model at two cutoffs, one high and one low, and each prints its counts and the metrics built from them.

{{figure metric-threshold}}

First, the four counts. A **true positive** (TP) is a diseased row the model flagged. A **false negative** (FN) is a diseased row it missed. A **false positive** (FP) is a healthy row it flagged. A **true negative** (TN) is a healthy row it cleared. Every metric in this chapter is arithmetic on those four numbers, and the lab asks you to name the denominator each time:

| metric | the question | the arithmetic |
|---|---|---|
| accuracy | of all rows, how many were right? | (TP + TN) / every row |
| recall | of the rows that are truly positive, how many were found? | TP / (TP + FN) |
| precision | of the rows the model flagged, how many really are positive? | TP / (TP + FP) |

Now follow the cut downward. At 0.90 the model catches 3 of the 20 diseased rows. At 0.20 it catches 16. More diseased rows are caught, and more healthy rows are pulled in with them: 41 false alarms against 2. Recall rises from 0.150 to 0.800, and precision falls from 0.600 to 0.281. Accuracy goes the other way, from 0.905 to 0.775. The rule that flags nobody scores 0.900, higher than the low cut. So the headline number is largest exactly where the misses are worst. Precision on the do-nothing rule has no value, because no row was flagged. A metric with an empty denominator is not a metric.

Now price the errors. Suppose a missed case costs as much as ten unnecessary follow-up tests, and a false alarm costs one test. The three rules cost 200, 172 and 81. The two cuts have the same cost where 17 times the miss cost plus 2 equals 4 times the miss cost plus 41. That is a miss cost of 3 tests. Below it the high cut is cheaper, and above it the low cut is. The ratio of ten is a judgement about the problem, and no arithmetic on the plate supplies it.

The plate does not measure that ratio, does not say where the probabilities came from, and does not show a model being chosen. What it establishes is that "the model's accuracy" is shorthand. Between the two cuts the model did not change and the counts did, so the number belongs to a model and a cutoff together.

## By hand, in pure Python

Nothing in this chapter needs a library. The code below counts the four cells and builds the three metrics from them. SmolML has no metrics module, so this example is ours. It is written in the same style as SmolML (`smolml/core/value.py` is the model, see [the repository](https://github.com/rodmarkun/SmolML/blob/main/smolml/core/value.py), MIT): one small function per idea, each commented with what it counts. Save it as `book/code/05-evaluation/metrics.py` and run it with plain `python3`.

```python
def counts(y_true, y_pred):
    """Return the four counts (tp, fp, fn, tn) for labels that are 0 or 1."""
    tp = fp = fn = tn = 0
    for t, p in zip(y_true, y_pred):
        if t == 1 and p == 1: tp += 1
        elif t == 0 and p == 1: fp += 1
        elif t == 1 and p == 0: fn += 1
        else: tn += 1
    return tp, fp, fn, tn

def ratio(top, bottom):
    """A metric with an empty denominator has no value, so say so."""
    return None if bottom == 0 else round(top / bottom, 3)

def report(y_true, y_pred):
    tp, fp, fn, tn = counts(y_true, y_pred)
    return {"TP": tp, "FP": fp, "FN": fn, "TN": tn,
            "accuracy": ratio(tp + tn, tp + fp + fn + tn),
            "recall": ratio(tp, tp + fn),        # denominator: rows that are truly 1
            "precision": ratio(tp, tp + fp)}     # denominator: rows the model called 1

# Ten rows, invented to give the counts the lab found by hand.
true_10 = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
pred_10 = [1, 1, 1, 1, 0, 1, 1, 0, 0, 0]
print(report(true_10, pred_10))

# The rule with no model, on a nine-to-one slice: 20 ones, 180 zeros.
y = [1] * 20 + [0] * 180
print(report(y, [0] * 200))

# The plate's high cut: 3 caught, 17 missed, 2 false alarms, 178 cleared.
pred = [1] * 3 + [0] * 17 + [1] * 2 + [0] * 178
print(report(y, pred))
```

The output is:

```
{'TP': 4, 'FP': 2, 'FN': 1, 'TN': 3, 'accuracy': 0.7, 'recall': 0.8, 'precision': 0.667}
{'TP': 0, 'FP': 0, 'FN': 20, 'TN': 180, 'accuracy': 0.9, 'recall': 0.0, 'precision': None}
{'TP': 3, 'FP': 2, 'FN': 17, 'TN': 178, 'accuracy': 0.905, 'recall': 0.15, 'precision': 0.6}
```

The first line is the lab's by-hand count: TP 4, FP 2, FN 1, TN 3. Recall is 4/5 = 0.8, because the denominator counts the rows that are truly positive (4 found and 1 missed). Precision is 4/6, because its denominator counts the six rows the model flagged. The second line is the do-nothing rule on a nine-to-one slice. It scores 0.9 on accuracy and 0.0 on recall, and its precision is `None`, which is the code's way of saying the denominator is empty. The third line reproduces the high cut on the plate from its four counts.

## The same thing in PyTorch

The lab's path runs from a table to a metric in six steps. The sketch below is the lab's model and measurement, shown without printed output because it cannot be run in this book's build.

```python
X_train_t = torch.tensor(X_train)                       # numpy table -> tensor
y_train_t = torch.tensor(y_train).reshape(-1, 1)        # labels as a column
loader = DataLoader(TensorDataset(X_train_t, y_train_t),
                    batch_size=32, shuffle=True)        # Dataset -> DataLoader

class MLP(nn.Module):                                   # 4 in, 64 hidden, 1 out
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(nn.Linear(4, 64), nn.ReLU(),
                                    nn.Linear(64, 1), nn.Sigmoid())
    def forward(self, x):
        return self.layers(x)

model = MLP()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
for epoch in range(200):
    for x_batch, y_batch in loader:                     # batch
        optimizer.zero_grad()
        loss = ((model(x_batch) - y_batch) ** 2).mean()
        loss.backward()
        optimizer.step()

with torch.no_grad():
    p_test = model(X_test_t).numpy().ravel()            # prediction: a probability per row
pred_test = (p_test > 0.5).astype(int)                  # the cutoff
print(report(y_test, pred_test))                        # metric
```

Three details are worth knowing. The model has 385 parameters: 4 x 64 + 64 = 320 in the first layer and 64 + 1 = 65 in the second. The 250 training rows make 8 batches of 32 (the last holds 26), so 200 epochs is 1,600 updates. And `report` in the lab is the function above with scikit-learn's `confusion_matrix` doing the counting. One trap is specific to that library: `confusion_matrix(...).ravel()` returns the counts in the order tn, fp, fn, tp. Unpacking them as tp, fp, fn, tn gives a wrong answer with no error message.

## What the run shows

These numbers are the ones the lab text reports for its seed.

- On the training rows the model scores accuracy 0.8800. On the 750 held-back rows it scores 0.8213. The model does better on the rows it learned from, by about six points. The gap is small, which says the model learned the shape of the rule and not the individual rows.
- On a nine-to-one slice of the held-back rows (180 zeros and 20 ones), the rule that always answers 0 scores accuracy 0.9000 while catching none of the twenty. The trained model scores 0.8450. Accuracy ranks the two the wrong way round, and recall says so.
- Counted by hand on ten rows, the lab finds TP 4, FP 2, FN 1, TN 3.

The lab also asks you to shrink the training set from 250 rows to 25 and measure again. The training score then climbs and the held-back score falls. The lab does not print those numbers, so we give none.

## What you can now do

- Turn a confusion matrix of any size into four counts, and get the three metrics from them, naming each denominator.
- Say what a rule with no model scores on a class distribution, and report a model beside it rather than alone.
- Explain why a metric computed on the rows that moved the parameters says nothing about a new row.
- Move a cutoff, name which error grows and which metric rises, and state the assumption behind the direction.
- Say what evaluation cannot see, and name the second lens.

## What is still missing

- The lab splits its rows once: 250 to fit and 750 held back, with the same 750 behind every number. Nothing here uses a third set to choose between models or settings, so a number can still be chosen and reported on the same rows. [Chapter 7](07-generalization.md) takes this up.
- Only accuracy, recall and precision are measured. Every other metric or curve is left to [chapter 7](07-generalization.md).
- The confusion matrix here is read, not computed for many classes. One number per class, and the model that produces seven of them, are in [chapter 6](06-multiclass.md).
- The second lens is named and not used. The week's closing case is a model whose reported recall depended on a patient identifier sitting in the feature matrix. The instruments in this chapter read that model as good, because every number in it was computed correctly. What caught it was a look at the columns, which is analysis. No plate here performs that look, and [chapter 7](07-generalization.md) shows what leakage does to a held-out score.

## Questions

1. On ten held-out rows the lab counts TP 4, FP 2, FN 1, TN 3. Which metric is 4/5, and what does its denominator count?
2. A rule that answers "healthy" every time has high accuracy and zero recall. Which single number in the report exposes it?
3. Take the low cutoff on the plate of three decision rules: give its four counts, then name the metric that rose against the high cutoff and the one that fell.
4. If a missed case costs more than a false alarm, which count do you want smaller, and which way do you move the cutoff? Name the metric that rises and the one that falls.
5. The lab measures accuracy on 250 training rows and again on 750 held-back rows. Which belongs in a report, and what single change to the split makes the other visibly misleading?
