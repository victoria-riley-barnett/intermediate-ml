# Neural networks

Everything in this course before now has been a weighted sum: features times weights, products added, a bias on the end. The most complicated model in that family carries interaction terms, a product of two features with its own weight written by hand — a house price that depends on size, on a pool, and on the two together. Each pair needs its own column, and a ring of points around the origin has no term in the family that expresses it.

A neuron is that same sum with one thing added at the end: an activation function. The weights, the bias and the sum are unchanged; the output is no longer a straight function of the inputs. The lab says it twice on purpose, because a neuron *being* a linear model plus one bend is the whole of it.

Two activations do the week's work. Sigmoid squashes a sum into the interval between zero and one, which a number needs before it can be read as a probability; its tails flatten and the gradient dies there. ReLU is `max(0, x)`: zero for a negative sum, the sum itself for a positive one, with one corner supplying the bend. Hidden layers get ReLU. A binary output gets sigmoid.

The running example is built in the notebook: two features drawn around the origin, a label that is one on a ring between two radii and zero everywhere else, eight hundred points. Every straight cut the lab tries gets about half the points right, which is what naming the larger class also gets. One problem is then fitted three ways — a line, crossed features built by hand, a small network — on the same data and the same loss, differing only in who wrote the features.

The title carries both halves of the week: a classifier's *class* is the label, and a Python *class* is the device that holds a piece of the training process. Chapter 3 supplied the first half of the pair this chapter completes, since two layers with nothing between them compute what one layer computes. Everything after this week is built from these objects.


## An activation between two layers is what stops them collapsing into one

Chapter 3 ended on an awkward demonstration: two layers with nothing between them compute what one layer computes, because two matrices in a row are one matrix. The lab re-runs the check with an activation in the middle. With the identity between them, the stacked pair and the folded layer agree to machine precision; with sigmoid, and again with ReLU, no single linear layer reproduces the stack.

The activation is the only nonlinear ingredient in a network. Remove it and every neuron, layer and network reduces to a line; put it in and the second layer's parameters buy something the first layer's could not.

## The width of a layer is a column count, and the depth is how many rounds it composes

A layer is drawn as one circle per neuron, and the drawing reads as one computation per circle. It is not. Every neuron in a layer sees the same input and only the weight vectors differ, so the vectors stack into one matrix and the layer becomes a single matrix multiply. Sixteen neurons computed one at a time and the same sixteen computed as one `x @ W + b` agree to rounding, and the width of the layer is the column count of `W`.

Shapes then read as architecture. Eight hundred examples enter as `(800, 2)`, leave a hidden layer of sixteen units as `(800, 16)`, and leave the output layer as `(800, 1)`. The first number never changes; the second is the one someone chose.

A second layer does not see the raw features at all: it combines the sixteen numbers the first layer built out of them, which is what "hierarchical representation" means. Width buys bends in one round and depth buys composition, so a wide shallow network is not interchangeable with a narrow deep one at equal parameter counts. And the hidden layer's sixteen outputs are features in the same sense as any column built by hand in a spreadsheet.

## A feed-forward network is a chain of Linear layers and activations, and nothing else

[A feed-forward network](#fig-feedforward) shows the whole object: input on the left, prediction on the right, and between them rectangles and capsules. The white rectangles own weight matrices and the gray capsules own nothing. Each rectangle is a linear layer with its bias and its multiply; each capsule is an activation, holding no parameters and supplying the entire bend. Nothing loops back, nothing branches, nothing carries over from the previous example, which is what *feed-forward* means. The shapes move at the rectangles and hold at the capsules, and the key gives the equations in flow order and the equivalent `nn.Sequential` call.

{{figure feedforward}}

The plate is a wiring diagram. Its output prints ten scores put through a softmax, a wider output than this week's single probability, and its widths are that network's rather than this week's sixteen. It shows no data, no loss, no gradient, and no reason for any width.

## One straight line cannot separate the ring, and one hidden layer closes a loop around it

[The same points, a boundary that bends](#fig-compare-linear-hidden) puts the week's comparison on one page: sixty points on identical axes, thirty filled ones inside a ring of thirty hollow. Panel A fits a linear model and draws one straight line, with filled and hollow points on both sides of it; the count under it is one. Panel B adds one hidden layer of four units and draws a closed six-sided loop, filled points inside and every hollow point outside; the count under it is six.

{{figure compare-linear-hidden}}

Each corner is where one hidden unit crosses zero. A unit computes a weighted sum that the ReLU cuts off below zero, so each unit is a line with an off side, and the loop is what the output layer's vote over four such lines looks like where the votes balance. At sixteen units the lab shows the same accumulation: one unit's vote draws a line no better than the three ruler cuts, two a wedge, eight a fence around the ring, sixteen a fence that passes for a curve. A boundary of straight pieces need not be round; it needs to separate the points.

Read the loop as this run's polygon: six is what four units produced on sixty points. The plate also labels the classes the other way round from the lab: its filled class is the interior, the lab's positive class the ring.

## Crossing features by hand gets the same bend and charges a table for it

The lab spends most of its length on the alternative. Chop each feature into bins, give every pair of bins its own feature, and learn one weight per cell: six bins per feature makes thirty-six cells, and each point's row is thirty-five zeros and a single one naming its cell.

That model works, and it can be read. Reshaping its weights back into the grid gives a picture of where the answer is one and where it is zero, and the picture is the data that went in; the staircase it draws is the grid showing through. Two costs come with it. Every cell learns alone, so a cell holding no training points keeps whatever weight it started with and its neighbours cannot help it. And the table grows as a power of the feature count: over a thousand columns at four features, four hundred on two features at twenty bins.

The parameter counts close the comparison honestly. The network carries more parameters than the table, not fewer, and it is not compressing anything: its numbers went into building sixteen features, the table's into memorising thirty-six cells. What changed is who wrote the features.

## A class holds one piece of the training process, and the loop gets shorter

The other half of the week starts from a complaint the lab states plainly: the model, the data and the training process have been one pile. They come apart into five objects, and the same model trained the same way gives the same numbers at every step; what changes is how much bookkeeping is hand-written.

A plain Python class comes first: parameters in `__init__`, a `forward` method, and nothing else, the gradient clearing and the update still outside it. `nn.Module` moves those jobs inside, so `.parameters()` returns the list the loop used to spell out and `.zero_grad()` clears every gradient at once. `nn.Linear` and `nn.Sequential` take over the arithmetic, so `forward` reads as architecture: the parts of the feed-forward plate, read top to bottom. `TensorDataset` and `DataLoader` hand the data over in shuffled batches. The optimizers finish the ladder, from full-batch gradient descent through the same update once per batch to `torch.optim.Adam`, which adapts a step size per parameter from running averages of each gradient and its square. Adam is the default because it is robust to the learning rate, not because it is better.

The end state is a model, a loader, an optimizer, a loss and a loop: ten lines, every step inside an object that can be named and replaced. The lab copies one rung's trained weights into the next and checks the outputs match.

## What you can now do

- Say why two layers with nothing between them are one layer, and what an activation changes.
- Read a network's shapes and separate the example count from the number someone chose.
- Name the parts of [A feed-forward network](#fig-feedforward) that own parameters and the parts that hold none.
- Say what one hidden unit computes, and why a straight-piece boundary can enclose a region.

## What this does not give you

Everything here is binary, with one probability at the output and squared error as the loss, and the accuracy figures come from the points the model trained on. Nothing gives a procedure for a width, a depth or a bin count, and the hidden units read back as straight lines: a boundary, not an explanation.

*Grounded in the lab and the plates only; the week ships no lecture text.*

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

There are no verified questions for this week, so none are printed here.


---

← [Backpropagation: what a backward pass computes, and what it costs](03-backpropagation.md)  ·  [Evaluation: how you know a model works](05-evaluation.md) →
