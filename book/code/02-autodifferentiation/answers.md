# Answers, chapter 2

**Q1.** The procedure changes `w` and `b`, the parameters. `x` and `y` are the data and are given. The true values 3 and 7 are not tensors in the fit; they only let us check the result.

**Q2.** `w` increases. The step subtracts `lr * w.grad`, and subtracting a negative number adds. A negative derivative means the loss falls as `w` rises, so moving up is correct.

**Q3.** Raise the learning rate or run more steps. A smooth, falling curve rules out overshoot; the steps are simply too small to arrive by step 60.

**Q4.** The step is so large that the weight jumps past the minimum of the loss and lands on the far side, where the loss is higher. The gradient there is larger and points back, so the next step overshoots again, further. The thing overshot is the bottom of the loss curve.

**Q5.** Squared error adds up squares, so one far-off point contributes a very large amount and the line moves to reduce it. Absolute error adds each error at its own size, so the same point counts once, like any other, and the line barely moves. The squared fit follows the mean; the absolute fit follows the median.
