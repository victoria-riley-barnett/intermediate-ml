# The full encoder

Week 11 gave us one attention operation. It makes three projections, builds a score matrix, divides by the square root of the head width, applies a softmax along the last axis, and takes a weighted average of value vectors. This lets positions read each other. Stacking such layers, though, fails in three separate ways.

The first failure is depth. Each layer is a nonlinear map, so information can only move forward by being re-encoded through another set of weights. During training, the gradient at the first layer is a product with one factor for each layer above it. If those factors shrink a vector on average, the product shrinks exponentially. The second failure is scale. Once we add each layer's output back into the running representation, that representation becomes a sum, and the variance of a sum grows with the number of terms. Values drift upward, and later layers receive inputs larger than their initial weights were set up for. The third failure is that attention only mixes. The output at a position is a weighted average of value vectors, and an average cannot decide anything about the position it lands on.

Our running example is the two-motif task. Each sequence has forty-eight positions drawn from the twenty-letter residue alphabet. Two three-letter motifs, `WWW` and `CCC`, appear in every sequence, and the filler letters are never `W` or `C`. The generator places one motif near the start and the other near the end, and the label says which came first. The letters present do not separate the classes; only their order does. Averaging the rows throws order away. Flattening the sequence pays a separate weight for every offset. A sliding window must fix its width before it sees the gap. This chapter wraps attention in a block that fixes all three failures, and the stack of such blocks is where this course's architecture ends: we build the encoder and stop there.

> **On the timeline.** The architectures timeline has three rows this chapter inherits. In 2015 residual connections (ResNet) let each block learn a correction to its input, with a shortcut wire that costs one addition and no extra weights. In 2017 the transformer used the same wire around attention and a per-position network. In 2020 the same attention was applied to proteins, where the input changed (an alignment of one protein with its relatives) and the block did not. See [the architectures chapter](architectures.md).

## The residual's derivative is one plus the branch's derivative

A residual connection changes a block from "output equals F of the input" to "output equals the input plus F of the input". We call F the branch and the added input the bypass. Differentiating gives one plus the branch's derivative. The plate works one scalar branch at three inputs, with the branch's own slope drawn below the table.

{{figure eq-residual}}

The bypass contributes a constant one at every input, whatever the branch has learned. So there is always one route from output back to input whose derivative is exactly one, at any depth. A deep stack is then not only a product of arbitrary factors, and each branch only has to learn a correction rather than a full re-encoding.

The plate also shows what the one does not do. It cannot shrink, but it does not bound the sum. At x = 0 the branch slope is -3 and the block's derivative is -2. The branch here is one constructed scalar function, not a trained layer, and the plate says nothing about where a normalisation sits.

A missing residual also gives no error message. Shapes still fit and attention rows still sum to one. In the lab you delete one residual line and the code still runs. The failure shows only in how the model trains.

## Normalisation is taken across the features of one row, and its scale and shift are learned

Layer normalisation fixes the scale problem. For one row, it subtracts the row's mean, divides by the row's standard deviation, then multiplies each feature by a learned number and adds another. The plate draws one row of thirty-two features and these three stages.

{{figure eq-layernorm}}

The mean and the standard deviation are one number each for the row. For this row they are 2.0 and 2.5. The two learned vectors, called gamma and beta, hold one number per feature, so they have 64 parameters between them. They are there to restore a scale and an offset that standardising removed. The plate sets them to something other than one and zero so the restoration is visible.

The axis matters more than the formula. Each row of a `(B, 48, 32)` tensor is one position's state, so the statistics come from the thirty-two features of that row, and no other row enters any number. Because the feature axis has a fixed size, its statistics mean the same thing at every position and every sequence length. If we took the same arithmetic down the sequence axis, one position's output would depend on which other positions were present and on how much padding the batch carried. Week 8 paid for that kind of dependence.

The row on the plate is constructed so the arithmetic is exact. It is not sampled from a trained model. It also cannot show why normalising helps, since that argument needs many rows, and it does not say where in the block the layer sits. The next section does.

## One block is two residual sublayers, and its output type equals its input type

The block puts the pieces together. Reading the plate from left to right, we see a norm, multi-head attention, an addition, a second norm, a feed-forward layer, and a second addition. The residual path carries `x` around each of the two layers.

{{figure encoder-block}}

In code, the block is two lines:

```
x = x + attn(norm1(x))
x = x + ffn(norm2(x))
```

The norm sits inside the residual branch, so the identity route passes through nothing. This order is called pre-normalisation. The alternative, `norm(x + F(x))`, puts the norm on the residual path, so signal and gradient are rescaled at every block. A deep stack built that way needs a warmup schedule, a period of small step sizes at the start of training. Pre-norm avoids that need, but at a price: the stream grows without bound, so we add one final normalisation before the readout.

The feed-forward layer is the only place where something is decided about a single position. It runs on each of the forty-eight rows separately with the same weights. In the lab it widens each row from 32 to 128 features, applies a nonlinearity, and projects back to 32. Without it, a stack of attention layers would compose weighted averages, whose action on each position stays close to linear in the values, and extra depth would buy little. Attention puts position 3 in contact with position 41. The feed-forward layer asks what that contact means.

The block's last property concerns its interface. The input is `(B, 48, 32)` and so is the output. Because output type equals input type, blocks stack without any bookkeeping. Each block has its own weights and the same signature, and sequence length enters only through the size of the score matrix, so depth becomes a free choice. Stacking is possible by this shape alone, but shapes do not make a stack train; the residual routes and the norms do that.

The plate is drawn at the published model's constants: width 512 and six blocks, which is why its label reads L = 6. The week's own runs are narrower and shallower, and nothing we claim depends on those numbers. The capstone model is an embedding plus a learned position vector for each of the forty-eight places, a few blocks, a mean over positions, and one linear layer to two scores. Mean pooling is blunt: it discards order at the last moment, so the blocks must put the answer into the vectors first.

## The attention map locates a candidate, and an ablation decides whether it matters

For one head, the attention map is forty-eight by forty-eight. Each row sums to one, and entry `(i, j)` is the share of position `i`'s mixing taken from position `j`. We can reduce the map to two numbers per layer and head. The first is the weight the motif columns receive, compared with the weight the filler columns receive. The second is the mean entry from one motif's rows to the other motif's columns, compared with the uniform baseline of 1/48. Each has a control: score one sequence's attention against another sequence's motif positions, and see whether the effect survives.

The stronger test is intervention. Zero the weights from one motif's rows to the other motif's columns, rerun the model, and see whether the prediction changes. The map proposes a candidate. The ablation decides.

Attention weight is not contribution. A large weight on a vector the readout discards contributes little, and a small weight can matter. Heads are not additive parts of one story, and averaging them into one matrix is a choice about presentation. A position may be attended because it is unusual rather than because it is used. And a second block's map is computed on states that have already mixed, so an edge there may reflect a comparison made earlier.

## By hand, in pure Python

This example is ours, written in the style of SmolML, because SmolML has no layer norm or residual connection. It reuses our minimal `Value` class from `book/code/value.py`. Part one standardises a row. Part two compares the derivative at the input of a ten-block stack with and without the added `h`, using a weak branch whose slope is 0.1.

```python
import math, sys
sys.path.insert(0, "..")
from value import Value

def layer_norm(row, gamma, beta, eps=1e-5):
    d = len(row)
    mu = sum(row) / d                                  # one number per row
    var = sum((x - mu) ** 2 for x in row) / d          # population variance
    sigma = math.sqrt(var + eps)
    return [g * (x - mu) / sigma + b for x, g, b in zip(row, gamma, beta)]

row = [-1.5, 2.0, -1.0, 3.5, 0.0, 1.0, 2.0, 1.0]
out = layer_norm(row, [1.0] * 8, [0.0] * 8)
print("mean", round(sum(out) / 8, 4) + 0.0, "var", round(sum(v * v for v in out) / 8, 4))

def input_gradient(residual, depth=10, slope=0.1):
    x = Value(1.0)
    h = x
    for _ in range(depth):
        f = h * slope                      # a weak branch F(h) = 0.1 * h
        h = h + f if residual else f       # y = h + F(h)   or   y = F(h)
    h.backward()
    return x.grad

print("plain stack,    d output / d input =", input_gradient(False))
print("residual stack, d output / d input =", round(input_gradient(True), 4))
```

Its real output:

```
mean 0.0 var 1.0
plain stack,    d output / d input = 1.0000000000000006e-10
residual stack, d output / d input = 2.5937
```

The plain stack multiplies ten slopes of 0.1 and ends at one ten-billionth. The residual stack multiplies ten factors of 1.1, so the gradient reaches the input intact. The standardised row has mean zero and variance one, as the plate claims. The source file is `book/code/12-encoder/layernorm_residual.py`.

## The same thing in PyTorch

The course path is dataset, data loader, batch, module, prediction, metric. In PyTorch, the block is the same two lines as above, written as a module:

```python
class Block(nn.Module):
    def __init__(self, width, n_heads, expansion=4):
        super().__init__()
        self.norm1 = nn.LayerNorm(width)
        self.attn = MultiHeadAttention(width, n_heads)
        self.norm2 = nn.LayerNorm(width)
        self.ffn = nn.Sequential(
            nn.Linear(width, expansion * width),
            nn.GELU(),
            nn.Linear(expansion * width, width),
        )

    def forward(self, x):
        x = x + self.attn(self.norm1(x))
        x = x + self.ffn(self.norm2(x))
        return x
```

The encoder embeds the ids, adds a learned vector for each position, runs the blocks, takes the mean over the forty-eight positions, and applies `nn.Linear(width, 2)`. A batch of ids of shape `(B, 48)` becomes `(B, 48, 32)`, keeps that shape through every block, becomes `(B, 32)` after pooling and `(B, 2)` at the output. The lab trains it with Adam and cross-entropy, and the metric is test accuracy on held-out sequences. The lab then measures the attention maps as described above.

## What you can now do

- Write the two lines of a pre-norm block, say what each residual branch adds back, and differentiate `x + F(x)` for a scalar branch: what the added one guarantees, and what it does not.
- Name the axis layer normalisation runs over in a `(B, T, d)` tensor, and explain why the other axis would make one position depend on which others are present.
- Show that a block maps `(B, 48, 32)` to `(B, 48, 32)`, and say why that permits stacking without making a stack train.
- Compute a motif-versus-filler attention ratio against the uniform baseline, and name the control and the ablation that would make it evidence.

## What is still missing

- This encoder is built for one task and one dataset. The label depends on the order of two motifs in a generated sequence, and both motifs are always present. Nothing here shows what happens on sequences drawn another way; [the first project](project-a-new-data.md) is where the method meets data the course did not choose.
- Attention maps show where a head drew from, not what the model used, so a map without an ablation is only a place to look next. [The reporting project](project-b-reporting.md) is where claims like these are written up with their controls.
- A trained encoder is a set of weights and a table of residue vectors whose entries answer to the prediction task. The caution from [chapter 9](09-embeddings.md) about reading chemistry out of a learned table applies unchanged.
- We stop at the encoder. A decoder, and the objective that would train one to generate, are outside the course.

## Sources

- Vaswani et al. (2017). Attention is all you need. arXiv:1706.03762

## Questions

1. Differentiate `x + F(x)` where `F(x) = x^3 - 3x`. What is the block's derivative at x = 0? What does the added one guarantee, and what does it not?
2. For the row in the layer-norm plate, what are the mean and standard deviation? Compute the first feature after standardising, and then after gamma = 1.5 and beta = -0.5.
3. Layer norm runs over the 32 features of each row. Why would running it down the 48 positions make a position's output depend on its neighbours?
4. Trace the shape through one block, including the width of the feed-forward layer. Why does this permit stacking, and what does it not give you?
5. What is the difference between pre-norm and post-norm? What does each do to the residual path, and what extra step does pre-norm need?

Answers are in `book/code/12-encoder/answers.md`.
