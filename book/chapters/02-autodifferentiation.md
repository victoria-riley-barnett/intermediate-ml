# Autodifferentiation

Week 1 ended with a line whose numbers were chosen by hand: a slope and an intercept picked, defended out loud, and scored. This week answers where those numbers come from — from the derivative of the loss with respect to the parameter.

The running example is the lab's. Forty points are generated from `y = 3x + 7` with noise added, so the right answer exists and is printed at the top of the notebook while the fit is made. The data carries no units and no story; the subject is the machinery. The penguins return at the end of the lab, unscaled, where the same loop fails for a reason a later week owns.

Autodifferentiation is the mechanism in the title: the machine computes the derivative. A tensor is marked as worth tracking, the operations applied to it are recorded, and one call walks that record backwards and leaves an exact derivative in `.grad`. The week treats this as a service — one exact derivative per parameter, one pass, no step size chosen by anyone. How the record is walked, and why the cost does not multiply with the number of parameters, is chapter 3. The two chapters are a pair: here the mechanism stays closed, there it is opened and named.

What the week settles is the vocabulary the rest of the course uses. What it does not settle is the chain: no model with a hidden layer appears.


## The loss is one number, and its derivative orders the candidate models

Forty errors have to become one number. Mean squared error subtracts the truth, squares each result, and averages. [Mean squared error](#fig-eq-mse) does that on four rows, then differentiates the result with respect to the weight, which is what the week is for. Each error reappears multiplied by its own input, the products are summed, and the sum is scaled into a slope. At the bottom that slope is zero; either side of it the sign is opposite, so three candidate weights are ordered before any step is taken.

{{figure eq-mse}}

A derivative of the loss is not an average of errors with the signs kept but a weighted sum whose weights are the inputs, so a badly fitted point far out moves the fit more than an equally wrong point near zero.

What the plate does not show is noise. Its four rows lie exactly on `y = 3x + 7`, so its loss bottoms out exactly at the generating weight. The lab's forty points carry noise, so their loss bottoms out near that weight rather than on it, and a run that settles there has not failed. The plate is also a one-parameter model, the bias pinned at its true value; the lab finds both numbers at once.

## One step subtracts the gradient, and the step size decides whether the walk arrives

The update rule is one line: the parameter becomes itself minus the learning rate times the derivative of the loss with respect to it. The minus sign carries the work. A derivative points in the direction the loss rises, so subtracting it moves the parameter the other way; a negative derivative is subtracted into an increase. [Gradient descent](#fig-gradient-descent) names the three symbols and takes four steps on a quadratic.

{{figure gradient-descent}}

Read the ratio between consecutive values: every step here is the same fraction of the one before, so the walk approaches the minimum and covers less ground each time. The plate's condition on the step size is the difference between arriving and diverging.

Nothing in the rule fixes that number. Too large, and each step lands past the minimum on its higher side; the gradient there is larger and points back, and the loss grows by a steady factor — a straight line on a logarithmic axis. Too small, and sixty steps barely move while the curve falls on every one. The unscaled penguins show what sets the value: flipper lengths near 200 keep the gradients large enough that the setting which worked here runs to infinity in a few steps.

## A step repeated is a loop, and the rail returns the weight

Gradient descent is that step repeated. [A training loop](#fig-loop-gradient-descent) draws four stages left to right — forward, loss, backward, update — with one rail returning the weight from the last stage to the first. The rail carries the weight and nothing else; the derivative is computed again at the new weight, which is what makes this a loop rather than a plan.

{{figure loop-gradient-descent}}

Follow the weight printed below the diagram. Each pass adds a fixed fraction of the distance still left, so the weight approaches its target and no finite number of passes reaches it; the first pass moves furthest and every later one less. That is the curve the lab plots: steep at the start, flattening as the gradient shrinks.

One piece of bookkeeping is not in the picture. `backward()` adds to `.grad` rather than replacing it, so a loop that does not clear it accumulates a running total and steps with a direction that stopped being correct several passes earlier. The lab's optional exercise runs that version: the parameters circle the minimum and never arrive.

## The same steps as code, as printout, and as a curve

[Six steps down a parabola](#fig-code-gd) is the loop written out: a parameter marked for tracking, a forward computation that squares it, `backward()`, an optimizer holding the learning rate, and a print of parameter, loss and gradient before each step. The three printed columns move together; the gradient is largest at the first step and the loss falls fastest there.

{{figure code-gd}}

The plot carries what the printout hides: the marked points crowd together as the parabola flattens, so equal numbers of steps buy unequal progress.

The plate hands the update to `torch.optim.SGD`, which clears the gradient on its way past. The lab writes the arithmetic out by hand, so it must do two jobs the optimizer does silently: wrap the update in `no_grad`, because it is arithmetic on a tracked tensor from outside the model's calculation, and clear `.grad` explicitly, because it accumulates.

## One weight's gradient is the error times the input it multiplies

[One weight's gradient](#fig-eq-weight-gradient) carries the derivative from one parameter to several. A layer with three inputs and one output is scored on a single example, the error between output and target is formed, and each weight's derivative comes back as that error times the input the weight acts on.

{{figure eq-weight-gradient}}

The row worth reading is the weight on the input that is zero. Its derivative is zero, so it does not move, although it is the largest of the three. The plate is exact about that zero: a fact about that input on this example, not a verdict on the weight. Were the input zero in every example, the weight would never move.

What the plate does not show is where the error would come from if this layer were not the last one. Here the target is given, so the error is a subtraction. Behind a hidden layer there is no target, and whatever plays the role of the error has to be assembled from the layers in front. That assembly is the chain rule, and it is chapter 3.

## What you can now do

- Say which tensors in a fit are given and which are chosen, and name the parameter the plate holds at its true value.
- Read the sign of a derivative as a direction: a negative derivative is subtracted into an increase.
- Write the loop as four stages and one returning rail, and map each onto its PyTorch line.
- Tell an oversized learning rate from an undersized one by the shape of the loss curve.
- Account for one added point pulling a squared-error fit and leaving an absolute-error fit in place.

## What this does not give you

- A way to choose the learning rate. Nothing here computes one; the lab tries a value, reads the curve and adjusts, and the unscaled penguins show it is set by the scale of the inputs.
- A derivative for anything deeper than one layer. The chain, with notation, is chapter 3.
- Any guarantee about the shape of the loss. Both examples have a single bottom, one because its data is noise-free and its model has one parameter. A bowl for a line is not a promise about a stack.
- A loss for categories. Both losses here predict a quantity; a category needs a different one, in a later week.

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

Five questions, answerable from this chapter and the week 2 lab. Answers belong in the back matter.

**Q1.** Fitting the lab's line involves four tensors — `x`, `y`, `w` and `b`. Which two does the procedure change, and which two are given?

**Q2.** A step is `w = w - lr * w.grad`, and `w.grad` is negative. What happens to `w`, and why does the minus sign produce that?

**Q3.** A loss curve falls smoothly and is still falling at step 60, having gone from about 35 to about 31. What should change?

**Q4.** In the oversized-learning-rate run the loss grows on every step. Describe what one step does to the weight, using the word overshoot and naming what is overshot.

**Q5.** One added point out of forty-one pulls the squared-error line towards it and leaves the absolute-error line nearly still. Explain why from the way each loss adds up its errors.


---

← [What ML is, and what this course does with it](01-linear-analysis.md)  ·  [Backpropagation: what a backward pass computes, and what it costs](03-backpropagation.md) →
