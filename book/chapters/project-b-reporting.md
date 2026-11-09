# Reporting a Result Another Person Can Check

The course ends in a room where each student has three minutes to say what they built and one minute to answer a question about it. The talk is not a report of effort. It is a claim with its support attached: on this data, this model does this much better or worse than that simpler one, under this split, and here is what the result does not settle. Everything the course built is upstream of that sentence.

The problem the week solves is the gap between a notebook that produced a number and a stranger who can check the number. A run in a live session leaves an output cell and no account of what made it. A score written on a slide without a version, a seed, a split and a setting is a claim about a run nobody can recover — including its author, a month later. Printing closes the gap: the things that produced the number appear in the same block of output as the number.

The running example is the course's short-substring classifier on the gene-family corpus. Sequences from seven RefSeq gene families become counts of three-letter substrings; a held-out sequence is compared against training sequences by distance and given the majority label among its nearest neighbours. The output is one score, and the score is what a share-out wants to show. What has to be printed around it is the subject here.

This chapter belongs to the evidence strand and is the last statement of it: a metric tied to the cost of an error in chapter 5, a split fixed before tuning in chapter 7, a baseline on held-out data in chapter 14. It is not a repair pair of its own; it spends the ones already built. The lab slot holds the share-out rather than a new notebook: the material is the previous week's notebook plus the talk that explains it: the notebook as the record, the talk as the claim.


## A rerun is checkable only when its versions, seed, split and parameter are printed with the score

[The score is the fifth line](#fig-code-provenance) sets a short listing beside the output it prints and brackets four lines of that output, leaving the score outside the bracket. The bracket holds the interpreter and library versions, the seed, the number of rows on each side of the held-out split, and the one setting the classifier was run at. The score is the fifth line, and it is the only line that moves when the other four change.

{{figure code-provenance}}

Read the gutter before the number. The plate's claim is not that the score is wrong but that the score alone is unrecoverable: a reader who has the version, the seed, the split counts and the setting can rebuild the run and arrive at the same figure, and a reader who has only the figure can compare it to another figure and to nothing else. The demand is the one a methods section makes, and it is cheap: the run already computed all four values.

The plate also carries a second form of the same run in which the neighbour count changes and the score changes with it. That is why a setting belongs in the record: a number that moves with a parameter is not a property of the data, and an unstated parameter leaves the reader unable to tell which of two numbers they are looking at. The plate's gaps are load-bearing too. It shows no baseline on the same split, no argument for why the split keeps copies of one sequence out of the training side, and nothing about where the data came from — source, licence, grouping field. Its own description is careful about scope: four printed items are what a course project is graded on, not a demonstration that printing them makes a run reproducible in general.

## What you can now do

- Separate a run's score from the four lines that produced it, and say what each of the four pins.
- Write the record a stranger needs before the score: interpreter and library versions, seed, the row count of each split, and the setting that changes the result.
- Say what a bare score cannot support — a baseline, an argument for the split, the data's source — and which of those the four printed items supply.
- Add one sentence to a claim naming what the result does not show, and keep it in the same breath as the claim.

## What this does not give you

Four printed items make one run recoverable, not reproducible in general. Nothing here pins the data file, the environment beyond two version numbers, or the machine, so a rerun elsewhere is a separate problem. A recovered number is still a technical replicate. Retraining at another seed measures the model's stability; it does not add samples from the world, and a spread over seeds cannot stand in for new data. The limit that ends the course stays in place: a held-out score shows prediction, never mechanism. A model that separates two gene families from short-substring counts has separated them, and nothing in the score says it identified a function or an evolutionary relationship.

*Grounded in the lab and the plates only; the week ships no lecture text.*

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Gene-family corpus: `sequence\tclass`, 4,380 human / 1,682 chimp / 820 dog sequences in seven RefSeq gene families, mirrored from `raahuldatta/DNA-Sequencing-using-Machine-Learning-and-Deep-Learning-Algorithms` and fetched 2026-09-29. The mirror's licence is unverified: see SOURCES.md.

## Questions

There are no verified questions for this week.


---

← [The method on data the course did not choose](project-a-new-data.md)
