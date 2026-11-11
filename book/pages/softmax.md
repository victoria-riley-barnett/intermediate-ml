+++
title = "Softmax"
kind = "equation"
frame = "transformation"
define = "Softmax turns a row of scores into shares that are all positive and add up to one."
plates = ["eq-softmax"]
see = ["cross-entropy", "argmax", "logits", "decision-and-distribution"]
sources = [
  { file = "411/weeks/week06_multiclass/lecture.md", heading = "A distribution over families" },
  { file = "411/weeks/week06_multiclass/lecture.md", heading = "Exponentiate, then divide by the total" },
  { file = "411/weeks/week06_multiclass/lecture.md", heading = "The running example, as a distribution" },
  { file = "411/weeks/week06_multiclass/lecture.md", heading = "Large scores, and how not to blow up" },
  { file = "411/weeks/week06_multiclass/lecture.md", heading = "The distribution is not a promise" },
  { file = "smolml/smolml/utils/activation/README.md", heading = "Softmax" },
]
+++

A model that sorts genes into families first produces one raw score per family, called [[logits|logits]]. Scores can be any size and either sign, so they are hard to read as beliefs. Softmax turns them into a **distribution**: one number per family, each at least zero, all adding up to one. Each number is the share of belief the model gives to that family.{{note: Explanation adapted from SmolML, utils/activation (MIT).}}

It does this in two steps. First, take the exponential of every score, which is the number e (2.718) raised to that score.{{from: eq-softmax}} An exponential is always positive, so the signs disappear and larger scores stay larger. Second, add up all the exponentials and divide each one by that total. Dividing by the total is what forces the shares to add up to one.

Every share depends on every score, because the total reads them all. Change one score and the whole row moves. The order of the scores survives, though: the family with the biggest score still has the biggest share, so [[argmax]] names the same winner before and after.

Take the seven scores the course gives one gene, 2.0, 1.0, -1.0, 0.5, -0.3, 1.8 and 0.2.{{run: 06-multiclass/kmer_softmax.py | q = [0.37, 0.13, 0.02, 0.08, 0.04, 0.3, 0.06]}} Softmax turns them into shares of 0.37, 0.13, 0.02, 0.08, 0.04, 0.3 and 0.06, which add up to 1. The first family wins with 0.37. The sixth, the gene's true family, an ion channel, still gets 0.3.

{{plate eq-softmax}}

The plate works the same steps on three scores, 0, 1 and 2, so each stage can be read off.{{from: eq-softmax}}

One practical detail: the exponential of a large score is enormous and overflows a computer's number type. Subtracting the largest score from every score first gives exactly the same shares and nothing overflows.{{run: 06-multiclass/kmer_softmax.py | same softmax after adding 1000: [0.37, 0.13, 0.02, 0.08, 0.04, 0.3, 0.06]}}

Softmax does not promise that the top share is right. How confident the shares look depends on how spread out the scores are, and a model can be confident and wrong. See [[decision-and-distribution]] for reading a decision and a distribution together, and [[cross-entropy]] for the loss that compares these shares with the true family.
