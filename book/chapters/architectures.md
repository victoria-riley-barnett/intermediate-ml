# Architectures, and where each one came from

Eleven plates were drawn for one day of this course. The first three are a timeline from 1943 to 2022; the rest draw single members of one family, small enough to check by hand. Read in this order, they are one claim about where new work goes.

A network has two halves that can change. The **block** is the arrangement inside it: which weights exist, how many are shared across positions, what operations sit between them. The **input** is what the first layer is handed: its shape, its width, how many examples of it exist. Each era puts its new work on one of the two.

The running example is a stack that reads a grid of numbers and returns a fixed-width vector of scores — by the last plate, an encoder reading a protein as a sequence of residue ids. Each member is drawn at a size where the numbers can be followed: one image patch, four positions, one head.

This chapter is the map, not a step. It is not one of the failure-and-repair pairs; it is the ground the last pair stands on — what a fixed-size input cannot learn, and what a mixing operation over positions does instead.


## The first fifty years change the unit, never the input

[The lineage to 1997](#fig-lineage-a-1943-1997) is seven rows, and the domain column crosses neurophysiology, perception, mathematics, vision and sequence while the question does not.

{{figure lineage-a-1943-1997}}

In 1943 the inputs are counted at a threshold, the count and the wiring set by hand and never fitted. In 1958 a weight moves by the error times that weight's own input, which is learning. The 1969 row is usually read as a verdict on extra layers; it states an absence: no flat cut separates the four cases of XOR and two cuts do, and nothing then could set the second cut's weights. 1986 supplies that procedure rather than another unit. All seven rows are marked IDEA, and none touches the input.

## Fifteen years add no architecture, and three pieces arrive from outside

[The quiet years](#fig-quiet-years) is three lanes over one span, and the architecture lane is nearly empty between LSTM and AlexNet. The middle lane is what the field taught instead: hand-built features, then a simple model that beat a small network on the data then available. The bottom lane is what arrived from elsewhere — arithmetic for many layers, and a labelled set large enough that memorising it paid. Neither arrival is an idea about a block: both are input-side, and the middle lane is input work too. For fifteen years the block did not move.

{{figure quiet-years}}

## From 2012 the timeline separates new mechanisms from new inputs

The KIND column is the instrument here. IDEA adds a mechanism; APPLICATION spends mechanisms that already exist on a changed input. [The timeline from 2012](#fig-lineage-b-2012-2022) has exactly two APPLICATION rows.

{{figure lineage-b-2012-2022}}

The first is 2012, whose own text says it trains the same layers on far more data and compute. The second is 2020: attention over an alignment predicts a fold, the attention is the 2017 row's, and the input is what changed — one protein set against many relatives rather than one sequence alone. Between them the IDEA rows add mechanisms: a token given a vector fitted to its neighbours, a mechanism for making the input as much as for the block; a shortcut letting a block learn a correction to its own input; attention first attached to translation, of which only the encoder half is built here; and the transformer, where every position compares against every position.

So the last span changes both sides with one mechanism: what 2020 spends is the layer 2017 introduced. The plate runs on past that: its later rows and open column name work this course does not cover, and nothing here depends on them.

## A feed-forward stack has one shape and no order

[The feed-forward plate](#fig-feedforward) is the block at its plainest: three fitted layers and a softmax that is an operation, not a layer. Its input is one row of fixed width, and that row is all it can see: no order, no length, no repetition. Every other plate in the family is a decision about data this one cannot represent, paid for in parameters, in work, or in information lost.

{{figure feedforward}}

## One filter at every position pays for reach with a fixed window

[The convolutional plate](#fig-convolutional) changes the block in one place: one weight set reused at every position. A filter slid across the grid finds a pattern wherever it occurs, for one detector's worth of weights. That claims a local pattern means the same thing wherever it sits, which is what a biological motif licenses. The window is fixed, so a wider pattern needs another layer or a wider kernel, and the depth needed is set by the longest distance in the data, which nothing in the layer knows. At the border those inputs are missing: the output is undefined rather than zero, and padding is what fills it. After the flatten, position is gone, and the next layer reads cell order as arbitrary.

{{figure convolutional}}

## One window, nine products, one number, and no value at the border

[One convolution position](#fig-eq-conv-window) is the arithmetic to check that code against: nine products, one number, the same nine weights one cell along. At the edge the window either fits inside the image or it does not, and where it does not the value is undefined, not zero. A zero could be learned around; an undefined position is a gap the modeller closes.

{{figure eq-conv-window}}

## A recurrent cell carries a state and gives up parallel steps

[The recurrent plate](#fig-recurrent) applies one small network at every step, with the previous state as an extra input and the same three weight matrices each time, so length costs nothing in parameters. It buys reach the convolution cannot, since positions reach each other through the state, and it charges twice. The steps are sequential, and the gradient reaching the first step has passed through one product of the recurrent weight per step — the multiplication the 1997 row replaces with a sum, one failure seen from two sides.

{{figure recurrent}}

## When the target is the input, no label enters the loss

[The autoencoder](#fig-autoencoder) changes neither the block nor the input; it changes the target. The input goes in, comes back at its own width, and the loss compares the two. The narrow code is the decision: an encoder returning a wide input through a narrow code has had to select what to keep, and the decoder trains beside it, so the pair settle on a code useful to itself. A low reconstruction error says that code redraws the input roughly, and nothing about whether it carries what a label is about.

{{figure autoencoder}}

## Each position's output is a weighted average over every position

[One attention head](#fig-attention-worked) is the block changed to an operation dense in its input: each position's output is a weighted average of every position's value, with weights from that position's query scored against every key. Every row of weights sums to one, so an output cannot exceed the largest value it mixes. The scores are divided by the square root of the head width, which keeps a softmax soft as the width grows. And the map is dense: scores grow with the square of the length, so all positions are computed at once, and the recurrent plate's price in steps becomes a price in work and memory. The plate carries no notion of where a position sits: reorder the positions and every mixture reorders.

{{figure attention-worked}}

## The block stacks because its input and output shapes agree

[The encoder block](#fig-encoder-block) is those two sublayers with what neither had: each sits inside a residual branch, so the stream carries what arrived plus a correction learned on it, with the norm at the start of the branch. The shapes are the reason it repeats: input and output agree, attention mixes without changing the width, the feed-forward layer widens and returns. What it cannot do alone is in what it does not change: attention is blind to permutation, so order must arrive from outside, and nothing in the block looks past the sequence it is handed. That is why the set ends at an encoder.

{{figure encoder-block}}

## The composite prints the whole family in one checkable format

[The composite](../figures/architecture-day.html) is the eleven plates at drawing size, and its value is the repetition: constants in the header, each operation as an equation, a listing in code, a glossary of symbols. An architecture that fits on one page can be checked: a shape that disagrees with the code means one of the two is wrong. A white box owns weights that training fits; a grey box owns numbers it never touches — a window, a threshold, a pool, a padding, decided by the modeller and never reconsidered.

## What you can now do

- Take any row on either timeline and say whether it added a mechanism or spent one.
- Take any plate and name what it does with fixed weights facing unfixed-length input, and what it charges.
- Say what one encoder block does not supply: order, and anything past the sequence it is handed.

## What this does not give you

The plates state costs as counts and shapes; no run in this chapter compares two architectures, and a cost printed as a number is a fact about the arrangement, not a result.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- McCulloch & Pitts (1943). A logical calculus of the ideas immanent in nervous activity. *Bull. Math. Biophys.* 5, 115-133. doi:10.1007/BF02478259
- Rosenblatt (1958). The perceptron: a probabilistic model for information storage and organization in the brain. *Psychological Review* 65, 386-408. doi:10.1037/h0042519
- Rumelhart, Hinton & Williams (1986). Learning representations by back-propagating errors. *Nature* 323, 533-536. doi:10.1038/323533a0
- Hochreiter & Schmidhuber (1997). Long short-term memory. *Neural Computation* 9(8), 1735-1780. doi:10.1162/neco.1997.9.8.1735
- LeCun, Bottou, Bengio & Haffner (1998). Gradient-based learning applied to document recognition. *Proc. IEEE* 86(11), 2278-2324. doi:10.1109/5.726791
- Krizhevsky, Sutskever & Hinton. ImageNet classification with deep convolutional neural networks. *Comm. ACM* 60(6), 84-90 (2017 reprint of the 2012 paper). doi:10.1145/3065386
- Vaswani et al. (2017). Attention is all you need. arXiv:1706.03762
- Jumper et al. (2021). Highly accurate protein structure prediction with AlphaFold. *Nature* 596, 583-589. doi:10.1038/s41586-021-03819-2

## Questions

No verified questions exist for this chapter: no rubric was written for it, and none are printed here.

---

[Objects, and the shape of the work](00-objects.md) →
