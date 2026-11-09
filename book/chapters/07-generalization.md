# Does the model work on new data?

Training asks one question: can the model fit the rows it was shown? The loss answers that question and no other. Whether the model works on rows it was not shown is a second question. Its answer depends on the model, and it also depends on how the data was cut into sets.

We start with a case small enough to check by hand. Four calibration standards (solutions of known concentration) give four readings: 0.11, 0.19, 0.32 and 0.38 at concentrations 1, 2, 3 and 4. We fit two curves to them, a straight line and a cubic. A cubic has four adjustable constants, exactly as many as there are standards, so it passes through every point. The line misses each standard slightly, by about 0.001, -0.013, 0.023 and -0.011. On these four points the cubic wins. Then we measure a fifth standard at concentration 5, and it reads 0.48. The line predicts 0.485, very close. The cubic predicts 0.25, which is wrong by nearly half the signal. Each reading was the true response plus a little instrument **noise**, a random error that would differ if we measured again. The line had too little freedom to chase the noise. The cubic had enough freedom to record it as if it were part of the curve. Fitting the accidents of one sample as if they were the pattern is called **overfitting**.

The same thing can happen at any scale. Our running example is the gene-family classifier. It reads a gene as 1,024 numbers, the share of the gene's overlapping 5-letter windows (5-mers) that are each possible 5-mer. It has one hidden layer, seven family scores, and a cross-entropy loss. After 60 epochs its loss on the genes it trained on is less than 0.001. That is the cubic passing through the four standards, and it tells us just as little about the next gene.

This chapter is the second half of a pair that turns a metric into evidence. The previous chapter built the measure: one score per family, softmax to turn scores into probabilities, and cross-entropy to compare them with the true family. This chapter asks what that measure is evidence about. That needs two things. We need a number computed on data the weights never touched, and we need proof that the data really was untouched. The second point turns out to matter most.

> **On the timeline.** This chapter inherits the 2012 row of the architectures timeline: the same layers trained on far more data, and memorising that paid. A network large enough to memorise its training set will do so, and only a held-out score can say whether it also learned something general. Dropout, which we use below, was one of the tools borrowed for that row. See [the architectures chapter](architectures.md).

## The split gives each set one job

The fifth standard was measured after the fit. For a real model we set such examples aside before training. They are **held-out** examples: rows with known answers that the model never uses to adjust its weights. We keep two held-out sets, because they have different jobs.

| set | changes the weights? | used to make choices? | purpose |
|---|---|---|---|
| training | yes | indirectly | fit the model |
| validation | no | yes | choose settings and the stopping point |
| test | no | no, until the end | report the finished choice |

The validation set is the one we look at while we work. We use it to decide between models, epoch counts and settings. Because every choice is made by looking at it, a validation score after many choices is a little flattering. The test set is scored once, after every choice is made. If the result disappoints and you change the model, the test genes have become validation data, and you need a fresh test set. A chemist validating an assay does the same: tune the cutoff on development samples, then run the blinded samples once.

Our 4,380 genes are cut into 2,628 for training, 876 for validation and 876 for test. The cut is **stratified**, which means each family has the same share in all three sets. From here on we look at the validation genes, and the test genes stay sealed until the end.

## Training loss keeps falling after held-out loss has turned up

The first plate plots both losses from one training run on one axis. A dashed rule marks the loss of an even guess over the seven families, which is ln 7, about 1.95. An untrained network should start near that rule, and ours did, at 1.94. A first loss far from it usually means a wiring mistake.

{{figure plot-curves}}

The training curve falls from 1.169 at epoch 1 to about 0.001 at epoch 60. The held-out curve falls with it, reaches its lowest value, 0.620, at epoch 10, and then climbs to 0.872. It ends far above its own minimum but below the dashed rule.

Read the shape after the minimum, not the distance between the curves. Held-out loss sits above training loss at every epoch, and that is expected. The weights were adjusted on the training rows and never on the held-out ones. The gap becomes a diagnosis only when the curves move in opposite directions, one falling while the other rises. That is what separates overfitting from learning. It also tells us which epoch to keep. **Early stopping** means keeping the parameters from the epoch with the lowest held-out loss, not the parameters from the last epoch. Real curves are bumpy, so one uptick is not yet a turn. Wait a few epochs to see whether the rise lasts.

Two things about this run are missing from the plate. First, it plots loss only. Held-out accuracy is 0.86 near epoch 10 and 0.88 at epoch 60, so accuracy is still rising while loss climbs. The reason is that loss charges a wrong answer in proportion to how confident it was. At epoch 60 the network is wrong more confidently: when it is wrong it is on average 84% sure, against 66% near epoch 10. So the right stopping point depends on the use. If you need only the family name, the later epoch is fine. If you will act on how sure the network is, keep the epoch with the lowest loss. Decide before you look at the test set, and write the choice down.

Second, this is one run with one random seed. A single run cannot tell us whether the minimum at epoch 10 belongs to the task or to that particular draw. The last plate in this chapter answers that.

## The same rows, a wall in a different place

The next plate holds the data and the classifier fixed and changes one thing: which rows share a fold. A **fold** is one slice of the data held out in turn while the rest is used for training. The plate is a map of contamination. Each column is a group of homologous sequences (sequences that descend from a common ancestor and so resemble each other), four groups per family. Each row is a fold. A mark means that the group puts rows into that fold's held-out slice.

{{figure split-homology-leakage}}

In the first panel the folds are drawn at random. Every group sits partly in the fold and mostly in training, and held-out accuracy is 0.9998. In the second panel whole groups move together, so no group is ever on both sides, and held-out accuracy falls to 0.2978. Chance for seven families is 0.1429, so the second panel is above chance but far below the first.

Read the cells rather than the accuracies. Between the panels nothing the classifier sees has changed except the fold assignment. The size of the drop is therefore the measured size of what a random split rewards. A held-out row whose near-relatives sit in training is not a new row. Its score measures recognition of a family's sequence vocabulary, not prediction from an unseen example. The second panel is the honest one. It stays above chance, so something does carry across homologous groups, but far less than the random split suggested.

This failure has a name, **data leakage**: any route by which information about held-out rows reaches the model before the held-out score is computed. Three routes are common. One is preprocessing on everything: a mean, a cutoff or a vocabulary computed from all the data before the split has already seen the held-out rows. Another is related samples on both sides. With five blood samples from each of twenty patients, a random split by sample lets the model recognise the patient instead of the disease, so you split by patient. The third is exact duplicates, where a "new" example has a twin in training. No software warns you about any of these. Leakage never raises an error. It only makes the result look better than it is. So before splitting, name the unit you want to generalise across, such as patient, species, lab or sequencing run, and check that all of that unit's rows sit on one side.

The week's own file holds the third route in a small dose. It has 4,380 rows but only 3,629 different sequences, so some validation genes have an exact copy among the training genes. We separated the validation genes into those with a copy and those without, and scored each group. Of the 876 validation genes, 207 have a twin in training, and the network names every one of them correctly. On the other 669 it is right 84% of the time. The 0.88 over all validation genes mixes the two groups, so 0.84 is the better answer to the question of how well the network names a gene it has never seen. The test set needs the same check. There, 169 of the 876 genes have a training twin, and on the other 707 the network is right about 84% of the time. That is the number to report for an unseen gene.

Two limits apply. The plate's classifier is a multinomial naive Bayes model over the same 5-mer rows, not our network. It reports accuracy and no loss, so the plate does not measure the effect on our network. Our network's own audit is the twin check above, and it moves the score by a few points, not by the plate's large amount. That is because the file contaminates only part of the held-out set, while the plate puts a relative of every held-out row into training. Also, neither audit reaches near-copies that are not identical, and the plate's homologous grouping is given to it, not worked out by it.

## An intervention counts only if its gain exceeds the spread between runs

The last plate trains the same network on one split under two settings, dropout and no dropout, five seeds each. **Dropout** switches off a random half of the units in the hidden layer on each training step, here with probability 0.5. A unit is one small computing element that outputs a number, and switching it off means forcing that output to zero for that step. Because any unit may vanish, the network cannot rely on one unit to carry a quirk of the training data. Dropout is noise added during training only. It is not a gene knockout, which is a fixed change to a living system. Both settings have the same 528,391 weights, epochs and optimiser. A **seed** is the number that starts the random-number generator. Two runs that differ only in the seed begin from different random weights and see the batches in a different order.

{{figure compare-regularizers}}

One panel draws a held-out loss curve for each run and prints each setting's mean in bold. The other panel reduces each run to its final held-out loss and puts the two groups on one axis, with a whisker from the lowest seed to the highest. The second panel carries the argument. We compare two distances: the gap between the group means, and the range across each group's own seeds. Without dropout the five seeds end between 0.8540 and 0.8894, with mean 0.8728. With dropout they end between 0.7802 and 0.7988, with mean 0.7876. The means are 0.0852 apart, which is 2.4 times the wider seed range. Every one of the 25 pairings of a plain run with a dropout run is ordered the same way. So the difference belongs to the setting and not to the draw. The first panel shows a second effect. The bold curves turn at different epochs, between 9 and 10 without dropout and between 14 and 17 with it, so dropout moves the stopping point later as well as lowering the floor.

The lab makes the same comparison with fewer runs. It uses three plain seeds and one dropout run. The plain runs' lowest validation losses differ by about 0.01, and the dropout run beats their average by about 0.035. A gain bigger than the spread is some evidence. One seed per setting can show a difference but cannot show a spread, so a single pair of numbers can be reported and cannot be called evidence.

The result is also narrower than "dropout improves the model". Dropout lowers held-out loss. It leaves held-out accuracy where it was, inside the range the seeds cover. Which of the two counts as the improvement depends on the use, the family name or the confidence in it. Make that choice on validation, by the measure the question needs, and then score the test set once.

The plate does not show why dropout helps, since that is a question about the network's insides and not about its curves. It does not show whether the ordering survives on another dataset, and it says nothing about seeds beyond the five it draws.

## By hand, in pure Python

SmolML has no split or dropout code, so this example is ours, written in the same plain style. It has three parts. `stratified_split` cuts row indexes 60/20/20 and keeps each label's share. `dropout` zeroes each value with probability `p` and scales the survivors by `1/(1-p)`, so the layer's average output stays the same. At evaluation time it does nothing. The last lines also run the twin check from the lab on a few toy sequences.

```python
# Ours, in the style of SmolML (no SmolML code for splits or dropout).
import random

def stratified_split(labels, fractions, seed):
    """Cut row indexes into train/val/test, keeping each label's share the same."""
    rng = random.Random(seed)
    parts = [[] for _ in fractions]
    for lab in sorted(set(labels)):
        rows = [i for i, l in enumerate(labels) if l == lab]
        rng.shuffle(rows)
        a = round(len(rows) * fractions[0])
        b = a + round(len(rows) * fractions[1])
        for part, cut in zip(parts, (rows[:a], rows[a:b], rows[b:])):
            part.extend(cut)
    return parts

def dropout(values, p, rng, training):
    """Zero each value with probability p; scale the rest by 1/(1-p). Off at eval."""
    if not training:
        return list(values)
    return [0.0 if rng.random() < p else v / (1 - p) for v in values]

labels = ["kinase"] * 10 + ["channel"] * 10
train, val, test = stratified_split(labels, (0.6, 0.2, 0.2), seed=42)
print("sizes", len(train), len(val), len(test))
print("channels in val:", sum(labels[i] == "channel" for i in val))

seqs = ["AAC", "GGT", "AAC", "TTA", "CCG", "GGT", "ACG", "TTA"]
seen = set(seqs[:5])
print("has_twin:", [s in seen for s in seqs[5:]])

h = [1.0, 2.0, 3.0, 4.0]
rng = random.Random(0)
print("train:", dropout(h, 0.5, rng, True))
print("train:", dropout(h, 0.5, rng, True))
print("eval: ", dropout(h, 0.5, rng, False))
print("eval: ", dropout(h, 0.5, rng, False))
```

Running it prints this.

```text
sizes 12 4 4
channels in val: 2
has_twin: [True, False, True]
train: [2.0, 4.0, 0.0, 0.0]
train: [2.0, 0.0, 6.0, 0.0]
eval:  [1.0, 2.0, 3.0, 4.0]
eval:  [1.0, 2.0, 3.0, 4.0]
```

With 20 rows, 10 per label, each set keeps half its rows in each label: 12 training, 4 validation and 4 test rows, with 2 channel rows in validation. The twin check marks the first and third of the last three sequences, because "GGT" and "TTA" are in the first five but "ACG" is not. In training mode two calls give different masks, and in eval mode two calls give identical output. That last pair is a quick test you can run on a real model. Score the same trained model twice on the same data. If the two numbers differ, dropout is still on.

## The same thing in PyTorch

The course path is now Dataset, DataLoader, batch, `nn.Module`, prediction and metric. This chapter adds the three sets and two switches. The split uses scikit-learn's `train_test_split` twice, and the model has a dropout layer and two modes.

```python
train_index, rest_index = train_test_split(index, test_size=0.40, random_state=42, stratify=labels)
val_index, test_index = train_test_split(rest_index, test_size=0.50, random_state=42, stratify=labels[rest_index])

class GeneNet(nn.Module):
    def __init__(self, hidden=512, p_drop=0.0):
        super().__init__()
        self.hidden = nn.Linear(1024, hidden)
        self.drop = nn.Dropout(p_drop)
        self.out = nn.Linear(hidden, 7)

    def forward(self, x):
        return self.out(self.drop(torch.relu(self.hidden(x))))

model.train()                        # dropout on, update on training batches
# ... one pass over the DataLoader ...
model.eval()                         # dropout off
with torch.no_grad():
    val_loss = F.cross_entropy(model(X_val), y_val).item()
```

The loop measures training and validation loss after every epoch and keeps a copy of the parameters from the epoch with the lowest validation loss. The seed is set with `torch.manual_seed(seed)` before the model is built.

## What the run shows

These are the measured results from the five seeds the lab trains. All numbers are on the 876 validation genes unless stated.

- Plain network: lowest validation loss 0.609 to 0.628 across five seeds, reached at epoch 9 or 10. At epoch 60 the loss is 0.854 to 0.889.
- Dropout 0.5: lowest validation loss 0.577 to 0.605, reached between epochs 14 and 17. At epoch 60 the loss is 0.780 to 0.799.
- Accuracy is about 0.88 for both settings at epoch 60, and the two ranges overlap.
- Genes with an identical training copy: 207 of 876 in validation, all named correctly. Genes without one: about 0.84.
- An even guess scores 1.95 in loss. The most common family alone would score 0.31 in accuracy on validation, so 0.88 is well above it.

## What you can now do

- Name the set a loss or accuracy was computed on, and say what claim that number does and does not support.
- Read a pair of loss curves and say whether the model is underfitting, learning or overfitting, and which epoch to keep for a stated use.
- Check a split for shared identity between held-out and training rows, and report the accuracy over rows with no counterpart.
- Judge an intervention against the spread between repeated runs, and score a test set once.

## What is still missing

- Every number here comes from one file of human gene sequences, from one source. A held-out score estimates performance on genes like those in that file. It says nothing about another lab's samples or another sequencing run. The project chapters ([a new dataset](project-a-new-data.md) and [reporting](project-b-reporting.md)) ask you to carry this over to data you choose.
- Near-copies that are not exact stay unaudited, and we have only one split and a handful of seeds. That is enough to order two settings and not enough to rank many.
- A gene here is a bag of 5-mer shares, and that representation throws away order. What a fixed-size input can and cannot learn is the question of [the next chapter](08-fixed-size-inputs.md).

## Questions

1. The lab's `diagnosis` is overfitting while the training loss has fallen to 0.0007. A classmate says that training loss shows the network names new genes correctly. What is wrong with the inference, and which printed number answers the question instead?
2. Step 4 computes `spread` and `gain`. What does a gain larger than the spread license, and what can one seed per setting not show?
3. Step 6 computes `acc_all` and `acc_no_twin`. Which one describes a gene the network has never seen, and why is the other flattering?
4. You choose between the plain and the dropout network on validation, score the test set once, then run the other network out of curiosity. What has the test set become, and what is needed before another test score means anything?
5. Dropout zeroes units during training and rescales the others. Why must `model.eval()` be called before scoring, and how can you check that you did?
