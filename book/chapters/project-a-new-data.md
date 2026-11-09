# The method on data the course did not choose

Every week before this one handed you a dataset and a question it could answer. The gene windows were rows, the gene families were labels, and the held-out set had already been checked for copies. The project removes that help. You choose the data and the question, and every check the course taught has to be run again on data that nobody in the course has looked at.

One requirement is fixed whatever you choose. Each example is an ordered sequence of items, such as nucleotides, amino acids or trials, and each sequence carries one label. The label should depend on where items sit, and not only on how many of each there are. The splice-junction starter dataset shows what that means. Each example is 60 nucleotides long, and a donor site is marked by the two letters `GT` at a fixed place just past the junction. A count of the four bases does not say where those two letters are. Before you start, find two sequences that hold the same items in a different order and carry different labels. If you cannot, position is not carrying the label, and the dataset or the target has to change.

> **On the timeline.** The project is not a new row on the architectures timeline. It applies the whole timeline, from counting items to the encoder, to data the course did not choose. See [the architectures chapter](architectures.md) for the rows it draws on.

This appendix spends the checks of earlier chapters rather than adding one: the metric of [chapter 5](05-evaluation.md) and the test of "new data" in [chapter 7](07-generalization.md). It is written against a familiar failure, a project that runs, prints a large number, and supports no sentence about the science.

## One held-out number reads as two verdicts against two baselines

A baseline is a simple rule that a model must beat. The plate below holds the held-out genes, the split and the metric fixed, and changes one thing at a time across three columns. Column A is a rule that fits nothing and names the commonest training family for every gene. Column B is the counting model from the multiclass chapter. Column C is that same model fitted again after each training gene is also added as its reverse complement.

{{figure compare-baseline-first}}

Read the third column twice. Against column A, it is far ahead: 564 genes more named right, out of 876. Against column B, the model it was derived from, it is 12 genes behind. Both statements are true of one number, 0.9646. A reported difference is therefore a statement about a named comparison, and that is why the do-nothing floor exists. A tie against a stated baseline is a finding.

The plate cannot show whether the 12-gene difference would survive a second run. Its key says the difference was not tested for repeatability, and only one split is drawn. Its rows are the course's gene windows, not your items.

## The split is only as honest as the field it groups on

A split is honest when no information about the held-out rows reaches the model before the test. The usual route is a group of related rows that land on both sides. In the splice-junction data, 1,475 distinct GenBank accessions hold the sequences, and 175 of them hold both an exon-to-intron and an intron-to-exon example. Those are the two ends of one intron. A split that deals rows at random will often put one end in training and the other in test, and the model can then succeed by recognising the accession rather than the junction. The fix is to split by the grouping field: whole accessions go to one side.

Write down the grouping field, then print an overlap check: the number of groups that appear in more than one split. It must print `0`. Also print the counts of each label in each split.

Zero is necessary and not sufficient. If you group on the recording rather than the subject, the check prints zero and the data still leaks, because one subject has several recordings. The split is not the only way in, either. A vocabulary, a normalisation constant or a set of principal components computed over all items before the cut carries held-out information across it, and no overlap check will see that. Fit every such choice on the training side only.

## By hand, in pure Python

The two checks fit in a few lines. This example is ours, written in the style of SmolML (no library, plain loops); SmolML has nothing for splitting. The data are toy: twelve groups of three near-copies, with the label set by a `GT` at positions 4 and 5. It first looks for an order pair, then compares a row split with a group split. The file is `book/code/project-a-new-data/grouped_split.py`.

```python
import random
rng = random.Random(0)

data = []
for g in range(12):
    base = "".join(rng.choice("ACGT") for _ in range(10))
    for _ in range(3):
        s = list(base)
        s[rng.randrange(10)] = rng.choice("ACGT")   # near-copies in one group
        s = "".join(s)
        data.append((f"g{g}", s, int(s[4:6] == "GT")))

pair = next(((a, b) for a in data for b in data
             if sorted(a[1]) == sorted(b[1]) and a[2] != b[2]), None)
print("order pair:", pair)

def overlap(train, test):
    return len({r[0] for r in train} & {r[0] for r in test})

rows = data[:]; rng.shuffle(rows)
print("row split   :", overlap(rows[:27], rows[27:]), "groups on both sides")
groups = sorted({r[0] for r in data}); rng.shuffle(groups)
test_g = set(groups[:3])
train = [r for r in data if r[0] not in test_g]
test = [r for r in data if r[0] in test_g]
print("group split :", overlap(train, test), "groups on both sides")
print("labels train:", sum(r[2] for r in train), "of", len(train))
print("labels test :", sum(r[2] for r in test), "of", len(test))
```

```
order pair: (('g1', 'CGAAGTAGCG', 1), ('g3', 'AGTACGAGCG', 0))
row split   : 7 groups on both sides
group split : 0 groups on both sides
labels train: 3 of 27
labels test : 4 of 9
```

The order pair holds the same ten letters, and one carries the `GT` at the right place while the other does not. The row split leaves seven groups on both sides. The group split leaves none. The label counts also show why they must be printed: the toy test side has 4 positives in 9, while the training side has 3 in 27.

## Four models one line apart, and a spread beside each difference

The project compares four models, each one line away from the next, so that a difference can be attributed. A0 reads only the target item. A1 averages the item vectors and loses order. A2 is the encoder from chapter 12, whose head averages over positions on purpose. A3 reads the last position instead of the average. In PyTorch, the whole difference between A2 and A3 is one line:

```python
pooled = x.mean(dim=1)     # A2: average over positions
pooled = x[:, -1]          # A3: read the last position only
```

Keep width, epochs and optimiser the same across the four. Then A3 minus A0 is what history buys the target item, A2 minus A1 is attention against averaging, and A3 minus A2 is the readout. Run at least three seeds on one split and put the spread beside every difference. A seed is a number that fixes the random starting weights and the order of examples, so changing it shows how much training alone wobbles. If a difference is smaller than that spread, you cannot detect it, and the right report is a tie.

Seeds are like repeated measurements of one sample. They show the procedure's stability. They do not replace a new cohort, and a single dataset cannot supply one.

## One test, one control that can come out the other way, one claim a number could break

The test is a question the four models did not answer, such as "does the model need the two positions around the junction?" A control is a run whose result you state before you see it, and which would differ if your explanation were wrong. A second run of the same model with nothing contrasted is not a control. The limit of a test belongs to the test, not to the project: say what the test could not have shown.

The claim is one sentence. It names a population, the split, a number with its spread, a comparison, and where the claim stops applying. It is written so that one result could show it wrong: two printed numbers, one named comparison. Held-out accuracy shows that information about the label is present in the representation. It does not show why, so a mechanistic or clinical sentence is outside what the number supports.

## The same thing in PyTorch

The path is the one the course built: a `Dataset` that returns one encoded sequence and its label, a `DataLoader` that stacks them into batches, an `nn.Module`, a prediction, and a metric on the held-out split.

```python
train_ds = SeqDataset(train_rows)      # __getitem__ returns (ids, label)
test_ds = SeqDataset(test_rows)
train_dl = DataLoader(train_ds, batch_size=64, shuffle=True)
for ids, y in train_dl:                # ids: (batch, length)
    logits = model(ids)                # model is A0, A1, A2 or A3
    loss = loss_fn(logits, y)
```

What changes in the project is that you write `SeqDataset` yourself, including the encoding, the grouped split and the overlap print. Nothing in the batch loop changes.

## What the run shows

The only measured numbers in this appendix come from the gene-family plate, not from a project. On the same 876 held-out genes, the do-nothing rule scored 0.3208, the counting model 0.9783 and the reverse-complement variant 0.9646. The three numbers support one lesson: read a score against a named baseline, and do not treat a 12-gene difference as established from a single split.

## What you can now do

- Say which baseline a held-out score is measured against, and what a second baseline would say.
- Name a dataset's grouping field, and read an overlap of zero as necessary but not sufficient.
- Judge a difference against the spread across seeds, and report a tie when the spread covers it.
- State a control's expected value before the run, and name the result that would falsify the claim.

## What is still missing

- The numbers belong to one dataset, one split and a few seeds. Nothing here says the finding holds at another site, species or year. A held-out score shows prediction, not mechanism.
- Writing the result up so that another person can rerun it is the subject of [the next appendix](project-b-reporting.md).
- The encoders behind A2 are explained in [chapter 11](11-attention.md) and [chapter 12](12-encoder.md).

## Sources

- Gene-family corpus: `sequence\tclass`, 4,380 human, 1,682 chimp and 820 dog sequences in seven RefSeq gene families, mirrored from `raahuldatta/DNA-Sequencing-using-Machine-Learning-and-Deep-Learning-Algorithms` and fetched 2026-09-29. The mirror's licence is unverified; see `admin/SOURCES.md`.
- Splice-junction starter dataset: 3,190 sequences of 60 nucleotides, UCI Machine Learning Repository, CC BY 4.0, DOI 10.24432/C5M888.

## Questions

1. A project reports held-out accuracy above its do-nothing baseline. What has to be named before that number is a verdict, and what does the plate's third column show about the same number read against two baselines?
2. An overlap check on the grouping field prints zero for every pair of splits. Which two leaks can still be open, and which one does no overlap check catch?
3. A change moves the mean score by less than the spread across three seeds. What is the correct report, and why is the best seed not one of the results?
4. What makes a control a control rather than a second run of the same model, and what does it mean for a limit to be a limit of the test?
5. Your dataset has 600 sequences from 30 subjects. Which field do you group on, and why would the recording identifier be the wrong choice if each subject has several recordings?

Answers are in `book/code/project-a-new-data/answers.md`.
