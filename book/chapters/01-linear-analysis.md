# Linear analysis

Some questions have a rule. Converting inches to centimetres, working out a tax bill, and checking whether a DNA string begins with a start codon all follow rules, and a program should simply hold the rule. Other questions do not. Whether an email is spam cannot be settled by any rule we can write, because every hand-written version has thousands of exceptions, and finding the exceptions is most of the work. What we do have is a large pile of emails that people have already sorted.

Machine learning is for the second kind of question. The instance we use throughout this book is a table of penguins from the Palmer Archipelago. There are three species (Adelie, Chinstrap and Gentoo), and for each bird the table gives bill length, bill depth, flipper length, body mass and the island where it was recorded. The question for this chapter is small: given a penguin's flipper length, what body mass should we expect? No one can write that as an exact rule, but we have measurements of 333 birds that show how the two go together.

> **On the timeline.** This chapter inherits the oldest row on [the architectures chapter](architectures.md)'s timeline, 1943 and 1958: a weighted sum of inputs. In 1943 the inputs were counted against a threshold with the wiring set by hand. In 1958 the weights were adjusted from the error, which is learning. Everything in this chapter is a weighted sum, and nothing is adjusted yet.

## Three pieces recur in every week

Every chapter has the same three pieces.

- **The data.** Examples, usually with the right answer attached to each one.
- **The model.** The shape of the rule, with the numbers left blank.
- **A measure of wrong.** One number that says how badly a particular choice of blanks does.

*Fitting* means choosing the blanks so that the measure of wrong gets small. If this sounds familiar, it should. A straight line through a scatter of points is a complete instance. The data are pairs of numbers, the model is a line, and the measure of wrong is the squared error. Fitting picks the slope and the intercept.

This changes what counts as an answer. Statistics usually asks whether an effect is real and how large it is, and it returns a coefficient with assumptions attached. Machine learning asks what will happen with the next example. The score is a measurement on data the model has never seen. That is why holding some data back is part of the method, and the last section of this chapter shows one way to get that wrong.

Nothing is fitted in this chapter. We do two jobs instead. We work one line out by hand, so that every later week has a concrete case to point back to. And we learn to read the shapes of the tables and arrays that every later week assumes.

## A line is fixed by two points

A line is written y = m x + b. Here x goes in and y comes out. The number m is the *slope* and b is the *intercept*. The slope is a rate: how much y rises when x rises by one. It comes from any two points on the line as rise over run, so it carries units. The intercept is the height of the line at x = 0.

Take two penguins. Bird A is an Adelie with a 192 mm flipper and a mass of 3.725 kg. Bird B is a Gentoo with a 212 mm flipper and a mass of 4.725 kg. From A to B the mass rises by 1.000 kg while the flipper lengthens by 20 mm, so the slope is 1.000 kg divided by 20 mm, or 0.0500 kg per mm. Said out loud, every extra millimetre of flipper goes with 50 more grams of penguin. Reading a number aloud with its units is the quickest check that it is plausible.

The slope fixes the tilt of the line but not its height. Rearranging gives b = y - m x, and using Bird A the intercept is 3.725 - 0.0500 × 192 = -5.875 kg. The code below confirms this, and our week-2 notebook rounds it to -5.87, which is the value we use from here on. A negative mass is meaningless, but we never evaluate this line at 0 mm. The intercept exists to put the line in the right place across the range where flippers actually fall.

You can see why it is needed with a 200 mm flipper. The slope alone gives 0.05 × 200 = 10 kg, far more than the 4.125 kg that the intercept brings it to, which is a plausible bird.

There is a catch. Two points can only ever agree with two points. In the notebook, three different pairs of real birds give three different lines: 0.0500 kg/mm with an intercept of -5.875, 0.0175 kg/mm with 0.325, and 0.0775 kg/mm with -11.263. Nothing yet tells us which pair to trust. Choosing the line that does best on all 333 birds at once needs a measure of wrong, and that is the work of [the next chapter](02-autodifferentiation.md).

## A prediction is the dot product of a row with a column of weights

With one feature, a prediction is a slope times a flipper length plus an intercept. With four measurements per bird it is four slopes, each multiplying its own measurement, with the four contributions added and one intercept on the end. The multiplying-and-adding part has a name, the *dot product*.

[Dot product](#fig-eq-dot-product) pairs matching positions, multiplies each pair, and adds. The output is one number, whatever the length of the inputs. The sum is undefined when the lengths disagree, and the plate states that failure: a term is left with no partner.

{{figure eq-dot-product}}

In the plate, the vectors (2, 1, -3, 4) and (3, -2, 1, 1) give 6, -2, -3 and 4, which add to 5. In the model, one vector holds a bird's measurements and the other holds the weights. The weights are the blanks of the model, and fitting is what fills them in. In this chapter any weights we write are invented, so the predictions they produce mean nothing. They do have the shape of a real prediction.

The plate cannot tell you where the weights come from, whether a weight means anything, or whether the bird being scored resembles the birds that will arrive later.

## A matrix applies the same rule to every row at once

A table of birds is a stack of rows, one per bird. Scoring the whole table means taking the dot product of every row with the same weights. A matrix multiply does exactly that in one operation.

[Matrix multiply](#fig-eq-matrix-multiply) builds each output cell as one dot product: a row from the first grid against a column from the second. It then states the size rule, which is the part to carry away. The two inner numbers must match, and the result has the two outer numbers. A 2 by 3 grid times a 3 by 2 grid is a 2 by 2 grid. A 2 by 3 grid times another 2 by 3 grid has no matching inner size, so there is nothing to pair.

{{figure eq-matrix-multiply}}

The plate traces one cell by hand. Row 1 of A is 2, 1, 3 and column 2 of B is 2, 1, 5. The products are 4, 1 and 15, and they add to 20. When a multiply fails in practice, the error message names the two sizes that disagree, and you read the message, not the values. Conventions also differ about which side of the `@` the data sit on, so a failing multiply is often one transpose away from working.

## A shape can be checked before any value is

The next plate follows five lines of the week-1 lab and records, for each line, the shape it leaves, its data type and the axis it uses up: [A shape can be checked before any value is](#fig-trace-shape). A *shape* is the list of sizes along each axis, so a table of 344 rows and 7 columns has shape (344, 7). Rows are examples and columns are features. Every step either keeps both counts or removes one.

{{figure trace-shape}}

The table arrives as (344, 7). Dropping the rows that have a missing cell removes 11 rows (19 cells were missing, and some rows were missing more than one) and leaves (333, 7). Keeping four of the seven columns leaves (333, 4). One-hot encoding the species leaves (333, 3). Multiplying one one-hot row by the (3, 4) table of per-species means matches the inner 3s and leaves a vector of shape (4,).

The data type matters too. A column of whole numbers becomes an integer array, and an integer array will not multiply float weights.

The encoding step needs a person to decide. A model does arithmetic, and a species is a word. Numbering the species 0, 1 and 2 invents an order and a spacing that the birds do not have. One-hot encoding gives each species its own column and puts a single 1 in the column that applies, which replaces the invented order with separate switches. Sorting the names first keeps the column order fixed when someone reorders the rows. The price of the switches is that any two species sit at the same distance from each other, whether or not that is true of the birds. How the data is written down is its *representation*, and choosing one is already a modelling decision.

The last block of the plate names its limit. A product of shapes (333, 4) and (3,) is caught because the inner numbers disagree, before any value is read. But reordering the features list changes no shape at all, so a shape check cannot catch it.

## Standardising a feature is subtracting a mean and dividing by a spread

Flipper length varies by tens of millimetres, and body mass by hundreds or thousands of grams. A weight on one column and a weight on the other are not comparable until the columns are on the same scale. *Standardising* puts them there.

[Mean and variance](#fig-eq-mean-variance) defines the two statistics and then standardises one feature of four values, 3, 3, 7 and 7. They total 20, so the mean is 5. The deviations from the mean are -2, -2, 2 and 2, their squares total 16, and the variance is 16 divided by 4, which is 4. The square root, 2, is the spread, and the standard scores are -1, -1, 1 and 1. Five plus two times each score returns the original value.

{{figure eq-mean-variance}}

The plate also covers the degenerate case. A feature that never changes has variance 0, the rescale divides 0 by 0, and the usual fix is to set the spread to 1 and every score to 0. The plate divides by the count n. Some programs divide by n - 1 instead, and both conventions are in use.

In practice the lab's `standardize(T)` does this for a whole table. It must collapse the rows of each column, so that it returns one mean and one spread per column. Collapsing rows instead of columns is the common mistake.

## Where the standardisation statistics come from is a decision about the split

Back to holding data back. A *split* divides the rows into a training set, which the model may use to choose its numbers, and a held-out set, which it may not. The score on the held-out rows is the honest estimate of how the model does on the next bird.

The plate [The same split, one scaler](#fig-split-train-only) draws one split twice over the same 333 rows. The only difference is a bracket. In panel A, the mean and spread come from the 259 training rows only. In panel B they come from all 333 rows, including the 74 held-out ones. Look at the bracket first, and then at how little the two panels differ.

{{figure split-train-only}}

The statistics differ by at most 1.4% in any column. The held-out body-mass error is 254.4 g in panel A and 251.1 g in panel B, and 3 of the 74 held-out predictions change, the largest by 190 g. Over 20 different splits, the all-rows statistic scores lower on 9 and higher on 11, by 0.0 to 6.2 g. So in this data the leak is nearly harmless.

The rule does not rest on that measurement. Once the rescaling has read the held-out rows, the held-out score is no longer a score on unseen data, however small the shift. The leak is the principle, and the decimal is not. The plate does not cover other routes by which a held-out row can reach the fit, such as a duplicated record, related samples, or a column that quietly encodes the answer. Each of these can leak far more than a mean does.

## By hand, in pure Python

The code below does every calculation in this chapter with plain lists, so there is nothing hidden. Its shape and matrix-multiply functions follow SmolML's `smolml/core/ml_array.py` (MIT), which reads a shape off a nested list and refuses a multiply when the inner sizes differ. The line is ours. See [SmolML's `ml_array.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/core/ml_array.py). The file is `book/code/01-linear-analysis/line_and_shapes.py`.

```python
def shape(data):
    """(rows, columns, ...) read off a nested list, as MLArray._infer_shape does."""
    return (len(data),) + shape(data[0]) if isinstance(data, list) else ()

def dot(a, b):
    if shape(a) != shape(b):
        raise ValueError(f"cannot dot shapes {shape(a)} and {shape(b)}")
    return sum(x * y for x, y in zip(a, b))

def matmul(a, b):
    if shape(a)[1] != shape(b)[0]:
        raise ValueError(f"inner sizes differ: {shape(a)} and {shape(b)}")
    return [[dot(row, list(col)) for col in zip(*b)] for row in a]

(xa, ya), (xb, yb) = (192, 3.725), (212, 4.725)
m = (yb - ya) / (xb - xa)          # rise over run, kg per mm
b = ya - m * xa                    # where the line crosses x = 0
print(f"slope {m:.4f} kg/mm, intercept {b:.3f} kg")
print(f"flipper 200 mm -> {m * 200 + b:.3f} kg")
print("dot:", dot([2, 1, -3, 4], [3, -2, 1, 1]))
print("C12:", matmul([[2, 1, 3]], [[0, 2], [0, 1], [0, 5]]))

for bad in (lambda: dot([2, 1, -3, 4], [3, -2, 1]),
            lambda: matmul([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6]])):
    try:
        bad()
    except ValueError as err:
        print("caught:", err)
```

The file also includes short comments, and it prints this when run with plain `python3`:

```
slope 0.0500 kg/mm, intercept -5.875 kg
flipper 200 mm -> 4.125 kg
dot: 5
C12: [[0, 20]]
caught: cannot dot shapes (4,) and (3,)
caught: inner sizes differ: (2, 3) and (2, 3)
```

The zeros in the second matrix are placeholders for the cells the plate does not state. Only the column that matters, 2, 1, 5, comes from the plate, so the printed `C12` is the plate's 20. Both error messages name the sizes that disagree, which is all a shape check needs.

## The same thing in PyTorch

The course path runs from a table to a prediction in a fixed sequence: a Dataset holds the rows, a DataLoader hands them out in batches, a batch goes into an `nn.Module`, and the module returns a prediction that a metric then scores. This chapter reaches only the first and last parts of that path, and only as arrays.

PyTorch holds the same grids as *tensors*, which carry a `.shape` and a `.dtype`. The lab's four lines are roughly these:

```python
X = torch.tensor(df[features].to_numpy(), dtype=torch.float32)   # (333, 4)
w = torch.tensor([0.1, 0.2, 0.3, 0.4])                           # invented weights
y_hat = X @ w                                                    # (333,), one per bird
```

The `@` is the matrix multiply from above, the shape rules are the same ones, and a mismatch raises an error that names the two shapes. We do not print outputs for this snippet because we cannot run it here, and the weights are invented as before.

## What the run shows

The results in this chapter come from the plates and from the code above.

- The two-penguin line has slope 0.0500 kg/mm and intercept -5.875 kg, which gives 4.125 kg at 200 mm.
- A different pair of birds gives a different line, so two points are not enough.
- Dropping the rows with missing cells takes the table from (344, 7) to (333, 7).
- Standardising with the training rows only, or with all rows, changes the statistics by at most 1.4% and the held-out error from 254.4 g to 251.1 g in this one split. Over 20 splits neither choice wins reliably.

## What you can now do

- Say what makes a problem a machine learning problem rather than a programming one, and name a case from your own field where the rule cannot be written down.
- Name the data, the model and the measure of wrong for a simple fit.
- Compute a slope and an intercept from two points, and read them aloud with their units.
- Compute a dot product and a matrix multiply by hand, and state the shape of the result before running it.
- Read `.shape` and `.dtype` along a chain of operations and say which step will fail.
- Explain why numbering a category is not encoding it, and what the one-hot form costs.
- Standardise a column, and say which rows the mean must come from.

## What is still missing

- No loss is computed and no line is chosen from 333 birds. [Autodifferentiation](02-autodifferentiation.md) defines the measure of wrong and gives the first way to search for the best weights.
- Nothing is learned from the error yet. [Backpropagation](03-backpropagation.md) shows how the same idea scales to many weights.
- Nothing beyond a weighted sum is built. [Neural networks](04-neural-networks.md) stacks sums and adds the nonlinearity between them.
- The held-out score is mentioned but not measured properly. [Evaluation](05-evaluation.md) covers that, and [Generalization](07-generalization.md) covers what counts as new data.
- The limits that hold for everything built after this are only named: a model that predicts well may be reading something that merely travels alongside the cause, a network answers confidently on input unlike its training data, and the data requirement is usually larger than the data at hand. When the question is whether a treatment works, the trial and the regression remain the right answer.

## Sources

What the figures in this chapter rest on. `admin/SOURCES.md` holds the full registry.

- Gorman, Williams & Fraser (2014). Ecological sexual dimorphism and environmental variability within a community of Antarctic penguins. *PLoS ONE* 9(3), e90081. doi:10.1371/journal.pone.0090081
- Horst, Hill & Gorman (2022). Palmer Archipelago penguins data in the palmerpenguins R package. *The R Journal*. doi:10.32614/rj-2022-020

## Questions

Answers are in the back matter.

1. The lab drops every row holding a missing cell before anything is plotted or converted. State what that decision costs, and the condition under which it would be indefensible.
2. Numbering the three species 0, 1, 2 is not equivalent to giving each species its own column. Say what the numbering asserts, and what the one-hot version asserts about distances between species that the per-species means contradict.
3. `standardize(T)` must collapse columns rather than rows. Give the call that does it, the shape it returns, and what the printed per-column means and standard deviations should read.
4. `pd.get_dummies(..., drop_first=True)` is applied to the species column. How many columns come back, how is the dropped category represented, and is any information lost?
5. In the split plate the two sets of standardisation statistics differ by a fraction of a percent. Explain why the rule about which rows they come from does not depend on the size of that difference.
6. A third penguin pair gives a slope of 0.0775 kg/mm. State what that says in words, and why it does not show that the first pair's line is wrong.
7. A dot product of a four-number row with a weight vector of length three is attempted. Say what happens and why.
