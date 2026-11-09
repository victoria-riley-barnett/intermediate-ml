# The method on data the course did not choose

Every week before this one handed over a dataset and the question it could answer, with the checks already fitted: gene windows as rows, families as labels, a held-out set whose copies had been counted. The project separates the two: the student chooses the data and the question, and each check is fitted again to data nobody in the course vetted.

One question is fixed whatever the dataset: whether the label survives the reduction of a sequence to a fixed-width vector. Each approved dataset supplies an ordered sequence of items, one label, and a label that belongs to a position rather than to the bag. On the electrocardiogram records the label is a diagnosis, defined on intervals between waveform landmarks: the segment after the QRS is not the evidence the segment before it is. Two positions marked on one real record, and a sentence on what changes if they swap, is the mechanism the project stands on.

The running example is the student's own approved dataset; the plate below is the one place the course's corpus appears, for its arithmetic rather than its biology. The week sits after the encoder week, belongs to no failure-and-repair pair, and spends them: chapter 6's measure and chapter 7's test of it, re-run on data the course did not pick. It is built against a project that runs, prints a large number, and supports no sentence about the science.


## One held-out number reads as two verdicts against two baselines

[One held-out number, two baselines, two verdicts](#fig-compare-baseline-first) holds the held-out genes, the split and the metric fixed and varies one thing at a time down three columns: a rule that fits nothing and names the commonest training family, the week-06 counting model, and that model fitted again with each training gene's reverse complement added.

{{figure compare-baseline-first}}

The lesson is in the third column, far ahead of the do-nothing rule and behind the model it was derived from. Both readings are true of one number, so a reported difference is a statement about a named comparison. The do-nothing floor exists for that, and a tie against a stated baseline is a finding.

What the plate does not show is whether its difference survives a second run: the key says it was not tested for repeatability, and one split is drawn. Its rows are the course's gene windows, not the project's items.

## The split is only as honest as the field it groups on

The split asks for the grouping field that leaks — `patient_id` for the electrocardiogram records, the subject for the other two datasets — and an overlap check printing zero for every pair, with counts per split and per label. Zero is necessary and not sufficient: grouping on the recording rather than the subject prints zero while the data leaks. Nor is the split the only route in. A vocabulary, a normalisation constant or a component basis computed over all items before the cut carries held-out rows across it, and no overlap check sees that.

## Four models one line apart, and a spread beside each difference

A0 reads the target item alone; A1 averages the item vectors and loses order; A2 is the encoder as delivered, its head mean-pooling on purpose; A3 reads the last position instead of the average, so `x[:, -1]` against `x.mean(dim=1)` is the whole of the difference. Matched in width, epochs and optimiser, the differences are attributable: A3 − A0 is what history buys the target item, A2 − A1 attention against averaging, A3 − A2 the readout. Three seeds at least, one split, the spread beside each difference; a difference under the spread is not detectable.

## One test, one control that can come out the other way, one claim a number could break

The test is a question the four models did not answer. The control's value is stated before the result and would differ if the explanation were wrong; a second run with nothing contrasted is not a control. The limit belongs to the test, not the project.

The claim is one sentence: a population, the split, a number with its spread, a comparison, and where it stops applying. It is written so a result could show it wrong, one named comparison of two printed numbers. Held-out accuracy shows that information about the label is present, not why, so a mechanistic or clinical claim sits outside it. A tie against the spread, reported as a tie, is the strongest form.

## What you can now do

- Say which baseline a held-out score is measured against, and what a second one would say.
- Name a dataset's grouping field, and read an overlap of zero as necessary, not sufficient.
- Judge a difference against the seed spread, and report a tie when it covers.
- State a control's expected value before the run, and the comparison that would falsify it.

## What this does not give you

The numbers belong to one dataset, one split, three seeds. Nothing says the finding holds at another site, species or year; no check inside one file supplies that cohort. The method tests whether a label survives a reduction; it does not establish the mechanism behind the label, or whether the reduction suited the question.

*Grounded in the lab and the plates only; the week ships no lecture text.*

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Gene-family corpus: `sequence\tclass`, 4,380 human / 1,682 chimp / 820 dog sequences in seven RefSeq gene families, mirrored from `raahuldatta/DNA-Sequencing-using-Machine-Learning-and-Deep-Learning-Algorithms` and fetched 2026-09-29. The mirror's licence is unverified: see SOURCES.md.

## Questions

Four questions, answerable from this chapter. Answers belong in the back matter.

1. A project reports held-out accuracy above its do-nothing baseline. What has to be named before that number is a verdict, and what does the plate's third column show about the same number read against two baselines?
2. An overlap check on the grouping field prints zero for every pair of splits. Which two leaks can still be open, and which one does no overlap check catch?
3. A change moves the mean score by less than the spread across three seeds. What is the correct report, and why is the best seed not one of the results?
4. What makes a control a control rather than a second run of the same model, and what does it mean for a limit to be a limit of the test?


---

← [The Full Encoder](12-encoder.md)  ·  [Reporting a Result Another Person Can Check](project-b-reporting.md) →
