+++
title = "Loss"
kind = "concept"
frame = "evidence"
define = "The loss is a single number that says how wrong a model is across all of its predictions, where smaller means better."
see = ["mean-squared-error", "gradient-descent", "training-loop", "three-things"]
sources = [
  { file = "411/weeks/week02_autodifferentiation/lab.md", heading = "What the loss measures" },
  { file = "411/weeks/week02_autodifferentiation/lab.md", heading = "The loss as a function of the weight" },
  { file = "411/weeks/week05_evaluation/lecture.md", heading = "Every learning system needs three things" },
  { file = "smolml/smolml/utils/losses/README.md", heading = "SmolML - Loss Functions: Measuring How Wrong We Are" },
]
+++

A model that makes a prediction for every data point also makes an error for every data point. With forty points that is forty separate numbers describing how wrong the model is, and forty numbers are hard to compare against another forty. So they are reduced to one. That single number is the **loss**, and the convention is that smaller means better.{{note: Explanation adapted from SmolML, utils/losses (MIT). It also calls this number the cost, or the error.}}

The loss is the evaluation job among the [[three-things]] every learning system needs: a representation (what the model is), an evaluation (how wrong it is), and an optimization (how it improves). It is the version of the evaluation that the optimization can read, because one number lets us ask which of two models is better.

The usual recipe has three steps. Take the error at each point, which is the prediction minus the truth. Square it. Average the squares. This is [[mean-squared-error]], and the squaring is explained on its own page. Here is what it does to a few errors:

| error | squared |
|---|---|
| -1 | 1 |
| +2 | 4 |
| -3 | 9 |

An error of -3 is three times the size of an error of -1, but it adds nine times as much to the loss.{{note: Table from the Week 2 lab, "What the loss measures".}} Squaring also makes every error positive, so a +2 and a -2 cannot cancel each other out.

Now a small example. Suppose the data lie exactly on the line y = 3x + 7, at four values of x. A model that guesses a slope a little under 3 is wrong at every point, and scoring all four predictions together gives a loss of 6.2568.{{run: 02-autodifferentiation/one_step.py | loss 6.2568}} At a slope of 3 it would be zero. Every choice of slope is a whole model, scored against all the data at once, and the loss lets us line those models up and pick the lowest.

The loss does not say whether the model is good enough for the job; metrics, the version a person can read, do that (see [[evaluation-and-analysis]]). Nor does it move the model. Following the loss downhill is the work of [[gradient-descent]], repeated in the [[training-loop]].
