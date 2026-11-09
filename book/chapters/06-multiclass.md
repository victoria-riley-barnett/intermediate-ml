# Multiclass and softmax

A gene belongs to exactly one family, and this week there are seven. A yes or no question, such as "is this gene an ion channel", needs one output: a single score. The question this week is different. It asks which of seven names applies, and one number has no room for seven names.

There is also no order to lean on. Nothing puts synthetase between tyrosine kinase and ion channel, so no single score can be read as a position on a line. The model therefore holds one score per family: seven scores, where last week's model held one. The raw scores are called logits. A logit can be any real number, positive or negative.

One real human gene carries the argument through the chapter, an ion-channel gene. The families are numbered 0 to 6 in a fixed order: GPCR, tyrosine kinase, tyrosine phosphatase, synthetase, synthase, ion channel, transcription factor. Ion channel is index 5. The gene's bases become a vector of counts. The vector becomes seven scores through one linear layer. The scores become seven probabilities. The loss then reads the one probability the model gave the true family.

In the worked numbers the largest score lands on the wrong family: GPCR, index 0. That is the point of the example. The decision (the index of the largest score) is wrong, but the model still put real weight on the right family, and that weight is what the loss reads and what training moves.

The data are RefSeq gene records: 4,380 human sequences, each labelled with one of the seven families. Beside them are 1,682 chimp and 820 dog sequences. The families are unequal in size. The largest holds about 5.6 times as many sequences as the smallest, so naming the largest family for every gene already scores around three in ten. That is the floor, and the lab computes it before any model is fitted. Chimp and dog are test sets from other species. The lab scores them, and a later chapter returns to them.

> **On the timeline.** This chapter inherits the last row of the feed-forward plate: the softmax head. The block is unchanged, a linear layer with an optional hidden layer, but the head now returns one score per class instead of one in total, and the input is a count of short DNA windows instead of a table of numbers. See [the architectures chapter](architectures.md).

## Counting windows gives every gene the same width

A gene can be any length, but a linear layer needs the same number of inputs every time. We get a fixed width by counting k-mers. A k-mer is a window of `k` consecutive bases. We slide the window along the sequence one base at a time and count how often each distinct window occurs.

There are 4 letters, so there are 4 to the power `k` distinct windows. Those are the columns of the count vector. For `k = 2` there are 16 columns. For `k = 5` there are 1,024. For `k = 6`, the lab's default, there are 4,096. A sequence of `L` bases has `L - k + 1` windows, so the counts for one gene sum to that number.

The width depends only on `k`, never on the gene's length. That is the gain. The cost is that the count says nothing about where a window sat in the sequence. Two sequences with the same windows in a different order give the same vector. This week we use the width and accept the loss. The chapter on fixed-size inputs is where that loss starts to matter.

The lab searches three window lengths, 5, 6 and 7, and the split of the human data is 3,504 training genes and 876 test genes. At the default `k = 6` the training matrix is 3,504 by 4,096.

## A gene reaches the loss through five shapes, and the last step reads a single entry

[One sequence, five shapes](#fig-trace-kmer-gene) follows one DNA sequence from its letters to a single loss number. Look first at the vector of counts, then at the seven logits, then at the seven probabilities, and last at the loss. It is the only page this week where all four operations appear together with numbers.

{{figure trace-kmer-gene}}

The plate uses its own gene and its own given weight matrix, not the ion-channel gene above. Its sequence has 420 bases, so with `k = 5` there are 416 windows, spread over 1,024 columns. Only 337 of the 1,024 slots are above zero. The linear layer is 1,024 by 7, and it gives the logits +0.99, +0.84, +1.56, -1.62, +0.23, -0.87 and +0.26. Softmax turns them into probabilities that sum to exactly 1.0000. The true class in this plate is 4 (synthase), and the model gave it a probability of 0.0973. The loss is the negative log of that, 2.3300.

Now compare the middle with the end. The largest logit belongs to class 2, not class 4, so the decision is wrong. The loss, 2.3300, is also above the loss of a uniform guess, which is ln 7 = 1.9459. A model that spread its belief evenly over seven families would have scored better on this gene than this one did.

Two things are kept apart here. The decision is one index. The distribution is a whole row of seven numbers, and it is the row that the loss reads.

The plate has no batch, no gradient and no accuracy, and its weights are given, not trained. Its window width, `k = 5`, is chosen so that you can hold 1,024 slots in your head. It is not the lab's default. Expect three different vector lengths across the plate, the lecture and the lab, and treat none of them as the course's setting.

## Softmax exponentiates the scores and divides by the total

Softmax turns a row of logits into a row of probabilities. It does this in two steps. First it raises `e`, which is about 2.718, to the power of each score. This makes every value positive and widens the gaps between large and small scores. Then it divides each value by the total of all of them, so that the row sums to one.

[Softmax](#fig-eq-softmax) shows the formula with its symbols defined, and a worked row of three scores, 0, 1 and 2.

{{figure eq-softmax}}

On those three scores the exponentials are 1.000, 2.718 and 7.389. They add to 11.107. Dividing each by 11.107 gives 0.090, 0.245 and 0.665, which add to 1.000.

There is one practical step. The exponential of a large score overflows the number type and becomes infinity, and infinity divided by infinity is not a number. So the code first subtracts the largest score from every score. The same constant then appears above and below the fraction, and it cancels. This is the same distribution computed more safely, not an approximation. The last line of the code below checks it by adding 1000 to every score.

Softmax cannot reorder the scores. The exponential only goes up as its input goes up, so the largest score always keeps the largest probability.

The plate has no model and no data, so it cannot tell you whether a top probability is the chance of being right. Softmax normalizes a row; it does not calibrate one. A distribution of 0.97 on one family can still be wrong.

## Cross-entropy reads one entry when the truth is one-hot

The true answer for a gene is a one-hot distribution: all of its mass is on one family and none on the others. Cross-entropy compares the predicted distribution with it. For each class it multiplies the true mass by the log of the predicted probability, adds the terms, and flips the sign.

[Cross-entropy](#fig-eq-cross-entropy) works a four-class example. The target is (0, 0, 1, 0) and the prediction is (0.250, 0.125, 0.500, 0.125).

{{figure eq-cross-entropy}}

Three of the four products are zero, because a true mass of zero kills whatever it multiplies. The one left is the log of 0.500, which is -0.6931. With the sign flipped, the loss is 0.6931. So with a one-hot truth, the loss is simply the negative log of the probability given to the true class.

That one term has no ceiling. A model that puts almost nothing on the true class pays a large cost, and the surer it was of a wrong family, the more it pays. Squared error behaves the other way: its slope flattens just where the model is confidently wrong. That is why we score a distribution with a log.

The lecture's ion-channel gene shows the scale. Its true class gets a probability of 0.30, so the loss is 1.20. A probability of 0.99 on the true class costs 0.01. A probability of 0.10 costs 2.30, and 0.01 costs 4.61.

The plate stops at the loss. It does not draw the derivative. For softmax followed by cross-entropy, the derivative with respect to the logits is the predicted distribution minus the one-hot truth. It is negative on the true class and positive on every other class. That one line is a whole training step, and the code below prints it.

## The lab's model is a naive Bayes classifier, and the lecture's is a logit model

The lecture teaches logits: a linear layer whose weights are learned by lowering the cross-entropy. The lab's TEACH section instead uses scikit-learn's `MultinomialNB`, following Krish Naik's notebook, and Part B then adds the softmax classifier. The two are related, and the relationship is worth stating.

Multinomial naive Bayes also produces one score per class, and that score is a linear function of the counts: a per-class constant plus the counts weighted by per-class numbers. Pass those scores through softmax and you have a distribution over the families. The structure is the same as a linear layer followed by softmax.

The difference is where the weights come from. Naive Bayes computes them by counting how often each column appears in each family's training genes, with a smoothing constant `alpha` (the lab uses 0.1). No gradient is involved. The softmax classifier starts from arbitrary weights and adjusts them to lower the cross-entropy. The two models can therefore disagree, and the lab compares them directly.

Their inputs differ too. Krish's featurization takes six-base words and counts runs of four such words in a row as columns, which gives 232,414 columns. Part B counts plain k-mers, 4,096 columns at `k = 6`.

## By hand, in pure Python

The code below counts 2-mers in a 12-base string, then runs the lecture's seven logits through softmax, cross-entropy and the gradient. The softmax follows the shape of SmolML's `softmax` in [`smolml/utils/activation/activation.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/utils/activation/activation.py), including the subtraction of the largest score. The loss follows `categorical_cross_entropy` in [`smolml/utils/losses/losses.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/utils/losses/losses.py) (MIT). The k-mer counter and the gradient line are ours. The file is `book/code/06-multiclass/kmer_softmax.py`.

```python
import math
from itertools import product

def kmer_counts(seq, k):
    columns = ["".join(p) for p in product("ACGT", repeat=k)]   # 4**k columns, fixed order
    counts = {c: 0 for c in columns}
    for i in range(len(seq) - k + 1):
        counts[seq[i:i + k]] += 1
    return counts

def softmax(z):
    top = max(z)                       # subtract the largest score: same answer, no overflow
    exps = [math.exp(s - top) for s in z]
    total = sum(exps)
    return [e / total for e in exps]

def cross_entropy(q, true_class):
    return -math.log(max(q[true_class], 1e-15))   # one-hot truth leaves one term

seq = "ACGTACGTTAGC"
counts = kmer_counts(seq, 2)
print(len(seq), "bases ->", sum(counts.values()), "windows,", len(counts), "columns")
print({k: v for k, v in counts.items() if v})

z = [2.0, 1.0, -1.0, 0.5, -0.3, 1.8, 0.2]         # seven logits from the lecture
q = softmax(z)
print("q =", [round(p, 2) for p in q], " sum =", round(sum(q), 4))
print("decision:", q.index(max(q)), " true class: 5")
print("loss:", round(cross_entropy(q, 5), 2))
y = [1 if i == 5 else 0 for i in range(7)]
print("q - y =", [round(p - t, 2) for p, t in zip(q, y)])
print("same softmax after adding 1000:", [round(p, 2) for p in softmax([s + 1000 for s in z])])
```

Running it prints:

```
12 bases -> 11 windows, 16 columns
{'AC': 2, 'AG': 1, 'CG': 2, 'GC': 1, 'GT': 2, 'TA': 2, 'TT': 1}
q = [0.37, 0.13, 0.02, 0.08, 0.04, 0.3, 0.06]  sum = 1.0
decision: 0  true class: 5
loss: 1.2
q - y = [0.37, 0.13, 0.02, 0.08, 0.04, -0.7, 0.06]
same softmax after adding 1000: [0.37, 0.13, 0.02, 0.08, 0.04, 0.3, 0.06]
```

Read it from the top. Twelve bases give 11 windows, and 16 columns because `4 ** 2 = 16`. The decision is index 0, but the true class is 5, which holds 0.30 of the mass. The loss is 1.20. The gradient is -0.70 on the true class and positive everywhere else, so one step would raise the ion-channel score and lower the rest.

## The same thing in PyTorch

The course path is Dataset, DataLoader, batch, `nn.Module`, prediction, metric. This week the lab stops short of a full DataLoader: it turns the counts into one tensor and trains on all genes at once. Each row of counts is first converted to percentages of that gene's k-mers, so that long and short genes are on the same scale.

```python
model = nn.Linear(4096, 7)                     # softmax classifier, no hidden layer
# model = nn.Sequential(nn.Linear(4096, 64), nn.ReLU(), nn.Linear(64, 7))   # with hidden units
logits = model(X)                              # one logit per family per gene
loss = F.cross_entropy(logits, y)              # y holds family numbers 0 to 6
decision = logits.argmax(dim=1)                # which family
distribution = logits.softmax(dim=1)           # how sure
```

Two details matter. `F.cross_entropy` takes the logits, not probabilities, because it applies the softmax and the log inside, in a stable way. If you put your own softmax in front of it, you score a softmax of a softmax, which is not this week's loss. And the labels are plain integers, not one-hot rows; the one-hot form is implied.

The training loop uses Adam with a learning rate of 0.05 for 200 epochs. The hidden-unit version uses 64 hidden units.

## What you can now do

- Say why the output is one score per family, and why an unordered set of names cannot ride on a single number.
- Derive a count vector's width from the window length, and say what the tally keeps and what it throws away.
- Trace one gene through the five shapes on [One sequence, five shapes](#fig-trace-kmer-gene), keeping the decision and the distribution apart.
- Say why subtracting the largest score inside softmax is exact, and why a softmax in front of `F.cross_entropy` scores something other than this week's loss.
- State how multinomial naive Bayes and the softmax classifier are alike and where they differ.
- Read the lab's comparison of three models over human test, chimp and dog, and name from a per-family report which family is mistaken for which.

## What is still missing

- Position. The representation is a bag of windows, and strings that differ only in order become the same vector. The chapter on fixed-size inputs ([08-fixed-size-inputs.md](08-fixed-size-inputs.md)) is where this bites.
- Calibration. A top probability is not the chance of being right. Softmax normalizes a row, and nothing this week checks the probabilities against outcomes.
- Transfer. The accuracies come from held-out human genes and from two other species. That is transfer across individuals and species, not across families that are absent from training. Whether a score on held-out genes can be trusted is taken up in [07-generalization.md](07-generalization.md).
- A rule for choosing `k`. The lab compares three window lengths against three accuracies. That is a comparison, not a rule.
- Learned representations. Fixed counts are chosen by hand. [09-embeddings.md](09-embeddings.md) starts on letting the model learn the representation.

## Sources

The gene-family corpus is `sequence\tclass`, with 4,380 human, 1,682 chimp and 820 dog sequences in seven RefSeq gene families. It was mirrored from `raahuldatta/DNA-Sequencing-using-Machine-Learning-and-Deep-Learning-Algorithms` and fetched 2026-09-29. The mirror's licence is unverified; `admin/SOURCES.md` holds the registry.

## Questions

Four questions are graded this week. The answers are in the back matter with the rest of the course's answer keys.

1. The majority baseline names one family for every gene. What does it score, and how far above it does the k-mer model sit on human test, chimp and dog? Which family does it recover most often on dog, and which least?
2. Take one mistake from a confusion table, or one wrongly named dog gene from `predict_proba`. Give the probability the model put on the family it chose and on the family the gene really belongs to, and say what makes the case hard.
3. Part B compares three models on the same three sets: the naive Bayes over word runs, the softmax classifier over k-mer counts, and the network with hidden units. Which belongs in a biologist's hands, and what do the comparison table and the loss plot say for it?
4. What did changing the window length do to the three accuracies, and what would be the next run?
5. A sequence has 300 bases. How many windows does it have at `k = 6`, and how many columns does its count vector have?
6. Two genes both have their largest score on tyrosine kinase. One has a probability of 0.97 there and the other 0.40. What does the loss tell you that the decision does not?
