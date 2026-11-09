# Why whole sequences are hard

The embedding table hands the network a grid: one row per position, one column per feature, and the number of rows is the length of the sequence. A peptide arrives with sixty and a kinase with a few thousand. The classifier's first layer is a weight matrix whose width was settled when it was built, so a grid of shape `(L, d)` with a variable `L` does not fit it. Every remedy is a map from the grid to a fixed-width vector, and the choice of map is a claim about what in the sequence carries the answer.

Three maps are the candidates. The first averages the rows: `d` numbers whatever the length, almost no cost, every position contributing. It is a proof rather than a performance report. A sum over positions does not care what order the terms arrive in, so two strings holding the same rows in a different order give the same `d` numbers, bit for bit, and any classifier — any depth, any weights, any data — returns the same answer for both. For a pair the label separates, nothing can supply the difference, because it never reaches the model. Mean is not the special case: every function of the multiset of rows inherits the same blind spot.

The second map flattens the grid into one row. Order survives, nothing is discarded, and a linear layer on top can in principle compute any function of the ordered grid. Three costs come with it. The flattened width is the length times `d`, so the first layer is built for one length, and another length is a shape error rather than a low score. Every position gets its own private block of weights, so the count grows with the length without bound and a motif learned at one offset must be learned again at every other. A label conjoining an event at `i` with one at `j` is a distinct conjunction for each of the `O(L²)` pairs, so nothing in the architecture says two positions play the same role.

The running example separates the maps with numbers. Every string is 48 positions long and holds exactly two three-residue motifs; the rest are drawn from the eighteen remaining residues, so no accidental run of three can occur. One block starts in the first quarter of the string and the other in the last, and the label is which one comes first. Take a positive string and exchange its two blocks: the result is a negative holding the same rows, ingredient for ingredient, with the opposite answer. That sentence is the whole design. Nothing reading the multiset of rows tells the pair apart, and nothing reading a local neighbourhood sees both motifs at once.

Biology has this shape without these numbers. Enhancers regulate promoters across tens of thousands of base pairs, with much of the intervening sequence irrelevant to the regulation, so a dependency can hold between two short elements far apart on the linear genome while a window of a few dozen bases on one of them sees nothing of the other. In a folded protein, the tertiary contacts holding a domain together can join residues a hundred or more apart in the chain. This week follows the embedding and precedes attention, and it pairs with the eighth chapter. That chapter named what a fixed-size input cannot express; this one measures three ways of fixing the width, and corrects it on a point it left open: reusing one set of weights at every position is not by itself the repair.


## One filter applied at every position finds a motif wherever it occurs

[A convolutional network](#fig-convolutional) is the opening chapter's architecture plate, and here it carries the third of the maps. Read the shapes under the stages: the spatial axes shrink, the channel axis grows, a flatten fixes the width, and only the batch axis stays a letter. The filter is drawn twice on the input, bracketed onto two non-overlapping fields, with one field yielding one output cell — the same weights applied at both places.

{{figure convolutional}}

The gain is exact. A flattened first layer needs a separate set of weights for each position; a convolution needs one set, slid. A motif is then detected wherever it occurs for one detector's worth of weights instead of `L`, the parameter count stops depending on the length, and the layer accepts a length it never saw. Stationarity and position-equivariance are what is bought, and a sequence motif licenses them.

The plate shows architecture and no evidence. It holds no string, no task and no score, and its grid is two-dimensional, as the image weeks drew it, so it cannot say whether a convolution relates two distant positions. That question is arithmetic.

## An output depends on the window under it, so two distant positions cost depth

[One convolution position](#fig-eq-conv-window) works a single output by hand: nine products from a nine-value window, summed to one number, and the same nine weights reused one cell along. The window is that output's receptive field, and its size is the kernel size. One layer of width `k` lets an output depend on `k` inputs; each layer behind it brings `k - 1` further positions into view, so the span is `1 + depth * (k - 1)`. With a kernel of five, an output that sees two positions forty apart needs about ten mixing layers between the input and itself, each of which must carry both signals forward intact.

{{figure eq-conv-window}}

This is the sentence to hold against the eighth chapter's ladder. Shared weights do not put two distant positions into one operation; they put `k` neighbouring positions into one. The locality that makes the window good at motifs is the same property that makes binding a matter of piling up layers, and the depth required is set by the longest distance in the data — not known at construction, and not bounded by anything in the layer.

The plate shows one position and stops at the border. It carries no stack, no training and no argument that a depth is unreachable; dilation widens the span faster than stacking does, and the plate is silent about it.

## All three reductions lose the order, each by the mechanism it was charged with

[The same 48 positions, three ways to a fixed width](#fig-compare-three-reductions) is the week's measurement. One task, one linear read-out on top of each reduction, one loss, one optimiser, one seed, and a chance line in every cell. Each panel draws the same pair: two rows holding the same bases in the two blocks, with only their order exchanged.

{{figure compare-three-reductions}}

The averaging panel prints one number per row per residue type, and the two rows give the same ones: the permutation argument arriving as a measurement. It widens the eighth chapter's result, where the failure was one representation's limitation; mean, sum and maximum all sit in that class. The flattening panel prints two vectors that differ, and every difference sits inside the slots that hold a motif — the reduction can carry the distinction — and the scores still split, right on the placements training delivered and at chance on the other quarters. What the frame learns is where the motifs sat, not which came first: the eighth chapter's coverage story with the structural half added. The window panel is the sharpest: its filter bank holds the two motifs themselves, the best case a window can be given, and the largest match count is the same in both rows while the peak moves with the blocks. Pooling over positions deletes the only part of the answer that differs.

What the plate does not show is a window wide enough to hold both blocks. By the geometry above, such a window exists and it classifies; it costs a filter whose span is the distance between the blocks. The plate also holds one convolution layer, one pooling rule — a maximum here, a mean in the lab's model — a linear read-out, and an instance drawn on a four-base alphabet with six-base motifs, while the lab runs twenty residues and three-residue motifs. The mechanism carries over; the scores belong to one instance.

## What you can now do

- Name a pair of strings the label treats differently and decide, without training, whether averaging, summing or maximising separates them.
- Say what a flattened first layer pays per position, and why a new length is an error at the first matrix multiply rather than a low score.
- State the receptive field of a stack of convolutions, and why relating two positions a given distance apart costs depth proportional to that distance.
- Read the three panels of the reduction plate — which rows are permutations, where the flattened vectors differ, why a pooled maximum cannot report which block came first — and say which failure is a limit of the map and which a limit of training coverage.

## What this does not give you

The toy is an instrument, not a model of a protein. Its only claim is that these three maps lose the information the label uses, in the ways described. Three maps are not all maps, and the measurements cover one convolution layer, one pooling rule per model and a linear read-out, so none of the printed scores transfers to a real enhancer, to a real contact map, or to a choice between architectures.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- LeCun, Bottou, Bengio & Haffner (1998). Gradient-based learning applied to document recognition. *Proc. IEEE* 86(11), 2278-2324. doi:10.1109/5.726791

## Questions

No verified questions for this week: no question rubric exists, and none are invented here.


---

← [Giving Tokens Meaningful Numbers](09-embeddings.md)  ·  [Attention](11-attention.md) →
