# Autodifferentiation

Chapter 1 ended with a line whose numbers were chosen by hand. We picked a slope and an intercept, defended them out loud, and scored them. This chapter asks where those numbers should come from. The answer is the derivative of the loss, which is a measure of how the score changes when one parameter changes.

A concrete case makes this plain. Suppose you have four measurements and a line `y = w * x + b` that you want to fit to them. You could try many values of `w` and keep the best. With one parameter that is easy. With two parameters at eleven values each, it is 121 models, and with six it is over a million. Trying everything does not scale. Instead, you can stand at one value of `w`, ask which direction lowers the score, and take a step that way. The derivative answers the question, and autodifferentiation is how a computer finds it for us.

Our running example is the lab's. Forty points are generated from `y = 3x + 7` with noise added, so the right answer exists and is printed at the top of the notebook. The data has no units and no story, because the subject is the machinery. The penguins come back at the end of the lab, unscaled, where the same loop fails for a reason a later chapter owns.

By autodifferentiation we mean that the machine computes the derivative for us. A number is marked as worth tracking, the operations applied to it are recorded, and one call walks that record backwards. The call leaves an exact derivative in `.grad`. In this chapter we treat that as a service: one exact derivative per parameter, one pass, and no step size chosen by anyone. How the record is walked, and why the cost does not multiply with the number of parameters, is [chapter 3](03-backpropagation.md). The two chapters are a pair. Here the mechanism stays closed, and there it is opened.

> **On the timeline.** In 1958 the update rule appeared: a weight is moved by its error times its own input. The machinery that makes the same move work through many layers, reverse-mode differentiation, was described by Linnainmaa in 1970. This chapter inherits both, and what it changes is the input to learning: the numbers are no longer picked by hand but found by following a derivative. See [the architectures chapter](architectures.md).

## The loss is one number, and its derivative orders the candidate models

A model that predicts for every data point also makes an error at every data point. With forty points, that is forty numbers. Forty numbers cannot be compared with another forty, so they must become one number. That number is the loss, and smaller means better.

Mean squared error (MSE) is the loss we use. Subtract the truth from each prediction to get the error, square each error, and average the squares. Squaring does two jobs. It removes the signs, so an overestimate and an underestimate cannot cancel. It also makes large errors count more: an error of 3 contributes nine times as much as an error of 1.

The plate below does this on four rows. It then differentiates the result with respect to the weight. Each error reappears multiplied by its own input, the products are summed, and the sum is scaled into a slope. At the bottom of the bowl that slope is zero. On either side it has the opposite sign, so three candidate weights are ordered before any step is taken.

{{figure eq-mse}}

A derivative of the loss is not an average of errors with the signs kept. It is a weighted sum whose weights are the inputs. A badly fitted point far out therefore moves the fit more than an equally wrong point near zero.

The plate does not show noise. Its four rows lie exactly on `y = 3x + 7`, so its loss bottoms out exactly at the generating weight. The lab's forty points carry noise, so their loss bottoms out near that weight and not on it. A run that settles there has not failed. The plate is also a one-parameter model, with the bias held at its true value. The lab finds both numbers at once.

## One step subtracts the gradient, and the step size decides whether the walk arrives

The update rule is one line. The parameter becomes itself minus the learning rate times the derivative of the loss with respect to it. The learning rate is the step size, a number we choose. The minus sign carries the work. A derivative points in the direction the loss rises, so subtracting it moves the parameter the other way. A negative derivative is subtracted into an increase.

The plate below names the three symbols and takes four steps on a simple curve, the square of one parameter.

{{figure gradient-descent}}

Read the ratio between consecutive values. Every step is the same fraction of the one before, 0.8 here. The walk approaches the minimum and covers less ground each time. It reaches zero only while the step size is below one, and that condition is the difference between arriving and diverging.

Nothing in the rule fixes the learning rate. If it is too large, each step lands past the minimum on its higher side. The gradient there is larger and points back, and the loss grows by a steady factor. On a logarithmic axis that growth is a straight line. If it is too small, sixty steps barely move the weight, although the loss falls on every one. The unscaled penguins show what sets the value. Flipper lengths near 200 keep the gradients large, so the setting that worked here runs to infinity in a few steps.

## A step repeated is a loop, and the rail returns the weight

Gradient descent is that step repeated. The plate below draws a training loop as four stages from left to right: forward, loss, backward, update. One rail returns the weight from the last stage to the first. The rail carries the weight and nothing else. The derivative is computed again at the new weight, which makes this a loop and not a plan.

{{figure loop-gradient-descent}}

Follow the weight printed below the diagram. It goes 0.0000, 2.0000, 3.0000, 3.5000, and on to 3.9375 after six passes. Each pass adds half of the distance still left to 4. The weight approaches its target and no finite number of passes reaches it. The first pass moves furthest and every later one moves less. That is the curve the lab plots: steep at the start, flattening as the gradient shrinks.

One piece of bookkeeping is not in the picture. `backward()` adds to `.grad` and does not replace it. A loop that does not clear it keeps a running total, and it steps with a direction that stopped being correct several passes earlier. The lab's optional exercise runs that version. The parameters circle the minimum and never arrive.

## The same steps as code, as printout, and as a curve

The plate below is the loop written out. It marks a parameter for tracking, squares it, calls `backward()`, hands the learning rate to an optimizer, and prints the parameter, loss and gradient before each step. The three printed columns move together. The gradient is largest at the first step, and so is the fall in the loss.

{{figure code-gd}}

The plot carries what the printout hides. The marked points crowd together as the parabola flattens, so equal numbers of steps buy unequal progress.

The plate hands the update to `torch.optim.SGD`, which does the arithmetic of `w - lr * w.grad` for us. The lab writes that arithmetic by hand, so it must do two jobs the optimizer does quietly. It wraps the update in `no_grad`, because the update is arithmetic done to a tracked tensor from outside the model's calculation and should not be recorded. It also clears `.grad` explicitly, because `.grad` accumulates.

## One weight's gradient is the error times the input it multiplies

So far there has been one parameter. The plate below carries the derivative to several. A layer with three inputs and one output is scored on a single example. The error between output and target is formed, and each weight's derivative comes back as that error times the input the weight acts on.

{{figure eq-weight-gradient}}

The row worth reading is the weight on the input that is zero. Its derivative is zero, so it does not move, although at 5 it is the largest of the three weights. The zero is a fact about that input on this example. It is not a verdict on the weight. If the input were zero in every example, the weight would never move.

The plate does not show where the error would come from if this layer were not the last one. Here the target is given, so the error is a subtraction. Behind a hidden layer there is no target, and whatever plays the role of the error has to be assembled from the layers in front. That assembly is the chain rule, and it is [chapter 3](03-backpropagation.md).

## By hand, in pure Python

PyTorch hides the mechanism, so first we build it ourselves. The helper is `book/code/value.py`, a small `Value` class adapted from SmolML's [`smolml/core/value.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/core/value.py) (MIT). A `Value` is one number that remembers how it was made. Adding, multiplying and raising to a power each record a small rule for passing a derivative back. Calling `backward()` on the final result applies those rules in reverse order.

The loss below is the plate's: the four noise-free rows, with the bias held at 7. The loss function follows the shape of SmolML's `mse_loss` in [`losses.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/utils/losses/losses.py), and the update is the one line of SGD from [`optimizers.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/utils/optimizers/optimizers.py). The file is `book/code/02-autodifferentiation/one_step.py`.

```python
from value import Value

xs = [0.8, 3.3, 6.7, 10.0]
ys = [3 * x + 7 for x in xs]          # no noise, so the true weight is exactly 3

def mse_loss(w, b):
    total = Value(0.0)
    for x, y in zip(xs, ys):
        error = w * x + b - y          # prediction minus truth
        total = total + error ** 2     # square it
    return total * (1 / len(xs))       # average

w, b = Value(2.6), 7.0                 # w is tracked; b is held at its true value
loss = mse_loss(w, b)
loss.backward()
print(f"loss {loss.data:.4f}   dL/dw {w.grad:.3f}")

lr = 0.01
w.data -= lr * w.grad                  # the update rule
print(f"w after one step: {w.data:.4f}")
```

```text
loss 6.2568   dL/dw -31.284
w after one step: 2.9128
```

Both numbers match the first plate: a loss of 6.2568 and a slope of -31.284 at a weight of 2.6. The step is 0.01 times the slope, so the weight rises to 2.9128, short of the bottom at 3.

The second script, `loop.py`, repeats this step with both `w` and `b` free, starting from `w = 2.0` and `b = 0.0`. It clears `.grad` before each `backward()`. With a learning rate of 0.01 it prints a loss of 160.9 at step 1, 12.58 at step 10, 4.211 at step 100 and 7.425e-05 at step 1000. By step 1000 `w` is 3.002 and `b` is 6.984, and by step 3000 they are 3.000 and 7.000. Notice that `b` converges much more slowly than `w`. Its derivative is not multiplied by an input as large as the weight's, so its steps are smaller.

The third script, `mean_median.py`, explains the last item of the lab's check zone. Take five readings, 4.0, 4.2, 4.1, 4.3 and 12.0. Searching candidate values on a grid, the squared error is smallest at 5.72, which is the mean. The absolute error is smallest at 4.2, which is the median. A squared loss sums squares, so the one far reading dominates and pulls the answer toward it. An absolute loss adds each error at its own size, so the far reading counts once and the answer stays with the group.

## The same thing in PyTorch

The course path is data, then a model, then a prediction, then a metric. At this point in the course the model is only a line, so the PyTorch version is the loop above with the bookkeeping done by the library. This snippet is shown and not run here, but its lines are the lab's.

```python
w = torch.tensor(2.0, requires_grad=True)   # mark as tracked
b = torch.tensor(0.0, requires_grad=True)
lr = 0.01

for step in range(60):
    loss = ((w * x + b - y) ** 2).mean()    # forward and loss
    loss.backward()                         # fills w.grad and b.grad
    with torch.no_grad():                   # the update is not recorded
        w -= lr * w.grad
        b -= lr * b.grad
        w.grad.zero_()                      # clear, because .grad accumulates
        b.grad.zero_()
```

`requires_grad=True` is the marking. `.grad` is where `backward()` leaves the answer. In practice you replace the update block with `torch.optim.SGD` and call `optimizer.step()` and `optimizer.zero_grad()`, as the code plate does. The Dataset and DataLoader pieces of the path have not yet been needed, since all forty points are used on every step.

## What the run shows

The lab fits the forty noisy points with this loop. After 60 steps the fitted loss is 2.06, with `w = 3.000` and `b = 6.989`. That is close to the `w = 3`, `b = 7` the data was built from. The lab's aside notes that the best line for these particular forty points is `w = 3.066`, `b = 6.549`, which differs from the generating line because the noise is real. A fit describes the sample it was given.

The oversized learning rate is the other run worth remembering. Its loss starts at 35.77 and is 1.633e+20 by step 24. With the four-row loss in `loop.py`, a learning rate of 0.03 gives the same story: the loss is 160.9 at step 1, 53,783.59 at step 10 and about 7e58 at step 200. A rate of 0.0005 goes the other way. The loss is 160.9 at step 1, 84.66 at step 10 and 12.44 at step 200, so it falls steadily and arrives far too slowly.

Leaving out the clearing of `.grad` gives a third failure. At a rate of 0.01 the loss is 125.8 at step 10, 17.19 at step 50, 68.68 at step 100 and 92.96 at step 200. It circles and never arrives.

The last result is about the choice of loss. With one added point out of forty-one, the squared-error line moves to `w = 3.527`, `b = 6.336`. The absolute-error line stays near `w = 2.998`, `b = 7.129`.

## What you can now do

- Say which tensors in a fit are given and which are chosen, and name the parameter the first plate holds at its true value.
- Read the sign of a derivative as a direction: a negative derivative is subtracted into an increase.
- Write the loop as four stages and one returning rail, and map each onto its PyTorch line.
- Tell an oversized learning rate from an undersized one by the shape of the loss curve.
- Account for one added point pulling a squared-error fit and leaving an absolute-error fit in place.

## What is still missing

- A way to choose the learning rate. Nothing here computes one. The lab tries a value, reads the curve and adjusts, and the unscaled penguins show it is set by the scale of the inputs. Chapter 4 adds optimizers such as Adam that are less sensitive to it.
- A derivative for anything deeper than one layer. The chain rule, with notation, is [chapter 3](03-backpropagation.md).
- Any guarantee about the shape of the loss. Both examples have a single bottom, because the data is noise-free and the model has one parameter. A bowl for a line is not a promise about a stack, and [chapter 4](04-neural-networks.md) is where models with hidden layers arrive.
- A loss for categories. Both losses here predict a quantity. A category needs a different one, in [chapter 6](06-multiclass.md).

## Questions

**Q1.** Fitting the lab's line involves four tensors: `x`, `y`, `w` and `b`. Which two does the procedure change, and which two are given?

**Q2.** A step is `w = w - lr * w.grad`, and `w.grad` is negative. What happens to `w`, and why does the minus sign produce that?

**Q3.** A loss curve falls smoothly and is still falling at step 60, having gone from about 35 to about 31. What should change?

**Q4.** In the oversized-learning-rate run the loss grows on every step. Describe what one step does to the weight, using the word overshoot and naming what is overshot.

**Q5.** One added point out of forty-one pulls the squared-error line towards it and leaves the absolute-error line nearly still. Explain why from the way each loss adds up its errors.
