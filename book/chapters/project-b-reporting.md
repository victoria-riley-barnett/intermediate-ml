# Reporting a Result Another Person Can Check

The course ends in a room where each student gives a three-minute talk on what they built, and then takes a question about it. The talk is not a report of effort. It is a claim with its support attached: on this data, this model does this much better or worse than that simpler one, under this split, and here is what the result does not settle. Everything the course built is upstream of that sentence.

The problem is the gap between a notebook that produced a number and a stranger who can check the number. A run in a live session leaves an output cell and no account of what made it. A score on a slide, with no version, seed, split or setting beside it, is a claim about a run nobody can recover, including its author a month later. The fix is to print the things that produced the number in the same block of output as the number.

> **On the timeline.** The project is not a new row on the architectures timeline. It applies the whole timeline to data the course did not choose, and this appendix is about reporting what that produced. See [the architectures chapter](architectures.md).

The running example is a short-substring classifier on the gene-family corpus. Sequences from seven RefSeq gene families become frequencies of three-letter substrings. A held-out sequence is compared with the training sequences by distance, and it receives the majority label among its nearest neighbours. The output is one score, and a share-out wants to show that score. What has to be printed around it is the subject here.

This appendix spends checks built earlier: a metric tied to the cost of an error ([chapter 5](05-evaluation.md)), a split fixed before tuning ([chapter 7](07-generalization.md)), and a baseline on the same split ([the previous appendix](project-a-new-data.md)).

## A rerun is checkable only when versions, seed, split and parameter are printed with the score

The plate sets a 15-line listing beside the 5 lines it prints. An accent bracket covers four of those lines and leaves the score outside it.

{{figure code-provenance}}

The four bracketed lines hold the interpreter and library versions (python 3.10.2, numpy 2.2.6), the seed (0), the number of rows on each side of the split (3270 train, 1110 test), and the one setting the classifier ran at (5 neighbours). The fifth line is the score: 807 of 1110, which is 0.727.

Read the four lines before the number. The score alone cannot be recovered. A reader who has the versions, seed, split counts and setting can rebuild the run and reach the same figure. A reader who has only the figure can compare it with another figure and with nothing else. The demand is the one a methods section makes, and it is cheap, because the run already computed all four values.

The plate also shows the same listing with one number changed: 1 neighbour instead of 5, same seed and same split. It prints 0.884. A score that moves with a setting is not a property of the data, and an unstated setting leaves the reader unable to tell which of two numbers they are looking at.

The plate does not show a baseline on the same split, an argument for why the split keeps related sequences on one side, or where the data came from. Its description is careful about scope: the four printed items are what a CSC 411 project is graded on, and the plate does not claim that printing them makes a run reproducible in general.

## The talk is one claim and the order of the pipeline

A good talk has one sentence at its centre, which is the claim you want the audience to leave with. A useful form is: on this kind of data, this model does better, worse or no differently than this simple alternative, and here is what can be said about why. Write that sentence first. If you cannot fill it in, you have a pile of results.

The slides follow the order of the pipeline, translated into the moves of a lab meeting. The question and data play the part of the system you studied. The representation is your methods. The baseline and split are your controls and design. The model and diagnosis are your key figure. The conclusion and limits are your discussion. Make each slide title a full sentence stating that slide's point, and not a topic word.

On the data slide, say what one row is and what a wrong prediction costs. On the representation slide, show one raw example beside its numbers and say what was lost. Counting short substrings discards where in the sequence they occurred. A talk that ends with "the simple baseline wins" is a good talk if the evidence is honest.

## A claim has a scope, and the sentence should say it

Every claim holds under particular conditions. A score applies to data like the held-out set, and the question is always how like. Three habits decide the scope.

First, independence. If related rows sit on both sides of the split, the model may succeed by recognising the group. Say how the held-out rows were separated from the training rows.

Second, controls. A score with no baseline beside it is like a signal with no vehicle control. In an invented case with 90 healthy and 10 diseased samples, a rule that always says healthy scores 90 percent, so a model at 94 percent is four points ahead, not 94.

Third, repeat runs. Retraining with another seed is like a technical replicate: it measures the model's stability and adds no new samples from the world. If a change falls inside the spread across seeds, the report is "no detectable difference".

Say the claim and its limit in the same breath. Here are overclaims that sound natural, with rewrites in the voice of a limitations section. Bracketed items are placeholders for your own numbers.

- Overclaim: "The model reaches [x] percent accuracy, so it can identify diseased samples." Rewrite: "On the held-out set, [x] percent were labelled correctly; a baseline that always predicts the majority class reaches [y] percent. We make no claim about diagnostic use."
- Overclaim: "The attention map shows the model found the binding site." Rewrite: "Attention weight concentrated near [region]. We did not remove those positions and retest, so this describes the model and is not evidence about the binding site."
- Overclaim: "The classifier learned gene function." Rewrite: "Short-substring counts separated [family A] from [family B] with held-out recall [x]. This does not show that the model identifies function or evolutionary relationship."

A held-out score shows prediction, never mechanism. A model that separates two gene families from substring counts has separated them, and the score says nothing more.

## By hand, in pure Python

This example is ours, written in the style of SmolML with plain loops; SmolML has no counterpart. It builds a toy two-class set (class 1 is richer in G), splits it, classifies by nearest neighbours, and prints the record before the score. The file is `book/code/project-b-reporting/record_then_score.py`.

```python
import sys, random
SEED, K = 0, 5
rng = random.Random(SEED)

def make(label):                      # toy: class 1 sequences are richer in G
    p = "ACGT" if label == 0 else "ACGTG"
    return "".join(rng.choice(p) for _ in range(30))

rows = [(make(i % 2), i % 2) for i in range(200)]
def counts(s): return [s.count(c) / len(s) for c in "ACGT"]
X = [(counts(s), y) for s, y in rows]
rng.shuffle(X)
test, train = X[:50], X[50:]          # split first, tune nothing on test

def predict(x, k):
    near = sorted(train, key=lambda r: sum((a - b) ** 2 for a, b in zip(x, r[0])))[:k]
    return int(sum(y for _, y in near) * 2 > k)

def score(k):
    right = sum(predict(x, k) == y for x, y in test)
    return right, len(test)

print("python", sys.version.split()[0], "| seed", SEED)
print("train", len(train), "test", len(test), "| k", K)
r, n = score(K); print(f"accuracy {r} of {n} = {r / n:.3f}")
r, n = score(3); print(f"same run, k=3: {r} of {n} = {r / n:.3f}")
```

```
python 3.13.18 | seed 0
train 150 test 50 | k 5
accuracy 36 of 50 = 0.720
same run, k=3: 39 of 50 = 0.780
```

The score moved from 0.720 to 0.780 when only the setting changed, which is the plate's point in miniature. With 50 test rows, three more correct answers is a difference you could not trust without more seeds. Note that choosing k by looking at the test score would itself leak the test set into the choice.

## The same thing in PyTorch

In the course path, the record is printed from the same notebook that trains the model:

```python
import sys, torch
print("python", sys.version.split()[0], "| torch", torch.__version__)
print("seed", seed, "| train", len(train_ds), "test", len(test_ds))
print("lr", lr, "epochs", epochs, "width", width)
print("accuracy", accuracy(model, test_dl))
```

Set `torch.manual_seed(seed)` before the model is built, print the seed with the result it produced, and report the spread over at least three seeds, not the best run. Every figure and table in the report should come from a notebook cell, because a number typed by hand is not evidence.

## Taking a hard question

A hard question is a free review. Listen to the whole question, repeat it in your own words, and answer its content. Questions are usually clarifying ("what is one row?"), about evidence ("how many seeds?") or about limits ("what would this fail on?"). The last kind deserves the most care, because answering it is the scope reasoning above.

When you do not know, say so and name the check you would run: "I split by image, not by patient, so I cannot rule out patient leakage; I would re-split by patient and see whether the score drops." That is a stronger answer than a confident guess. If a questioner has found a real flaw, the right reply is that it is a fair limit and what it does to your claim.

## What the run shows

The measured numbers here come from the code-provenance plate. With seed 0 and 5 neighbours, the held-out score was 807 of 1110, 0.727. With 1 neighbour, the same seed and the same split, it was 0.884. These are two numbers from one data file, and the only difference is a setting the output now carries.

## What you can now do

- Separate a run's score from the four lines that produced it, and say what each of the four pins.
- Write the record a stranger needs before the score: versions, seed, the row count of each split, and the setting that changes the result.
- Say what a bare score cannot support, such as a baseline, an argument for the split, or the data's source.
- Add one sentence to a claim that names what the result does not show.

## What is still missing

- Four printed items make one run recoverable, not reproducible in general. Nothing here pins the data file, the environment beyond two version numbers, or the machine.
- A recovered number is still a technical replicate. A spread over seeds cannot stand in for a new cohort.
- Choosing and checking the split itself is covered in [chapter 7](07-generalization.md) and [the previous appendix](project-a-new-data.md).

## Sources

- Gene-family corpus: `sequence\tclass`, 4,380 human, 1,682 chimp and 820 dog sequences in seven RefSeq gene families, mirrored from `raahuldatta/DNA-Sequencing-using-Machine-Learning-and-Deep-Learning-Algorithms` and fetched 2026-09-29. The mirror's licence is unverified; see `admin/SOURCES.md`.

## Questions

1. The plate brackets four printed lines and leaves the score outside. What does each of the four pin, and why is the score the only line that moves when they change?
2. The same listing at 1 neighbour prints 0.884 and at 5 prints 0.727. What does that say about reporting only one of them?
3. Rewrite "the model learned what distinguishes the two families" so that it states what was done, gives the number with its control, and names what was not tested.
4. Retraining at five seeds gives scores from 0.79 to 0.84, and a change moves the score from 0.81 to 0.83. What do you report, and why can more seeds not stand in for more data?
5. A questioner asks whether related sequences were on both sides of your split, and you did not check. What do you say?

Answers are in `book/code/project-b-reporting/answers.md`.
