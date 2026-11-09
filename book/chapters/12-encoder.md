# The full encoder

Week 11 delivered one attention operation: three projections, a score matrix divided by the square root of the head width, a softmax along the last axis, and a weighted average of value vectors. It lets positions read each other, and it is a fixed amount of computation. Stacking it fails three times.

Depth fails. Each block is a nonlinear map, so information moves forward only by being re-encoded through another set of weights, and the gradient at the first block is a product of one Jacobian per block, which shrinks exponentially if those matrices shrink on average. Scale fails. Residual connections make the stream a running sum whose variance grows with the number of terms; activations drift upward and downstream layers receive inputs their initialisation did not anticipate. Mixing alone fails. The output at a position is a convex combination of value vectors, and a convex combination cannot decide anything about the position it lands on.

The running example is the two-motif task. Sequences are forty-eight positions over the twenty-letter residue alphabet. Two three-letter motifs, `WWW` and `CCC`, sit in every sequence, and filler letters are never `W` or `C`. The generator places one near the start, the other near the end, and the label names which came first. Nothing about which letters occur separates the classes; only their order does. Averaging the rows cannot represent that order, flattening charges every offset for its own weights, and a sliding window has to fix its width before it sees a gap.

This chapter is the second half of a pair. Chapter 11 built the mixing operation; this one wraps it in a block, adds residual routes, pins the scale of the stream, and supplies the per-position decision attention cannot make. Those additions make a stack trainable, and the stack is where the course's architecture ends: an encoder is all the course builds. A decoder and the objective that would train one to generate are outside, because every question this course asks — what shapes an operation has, what its derivative is, what evidence places a computation — is answered on the encoder side of that line.


## The residual's derivative is one plus the branch's derivative

[The residual connection's derivative](#fig-eq-residual) takes the block's formula apart at the level of the derivative. The bypass contributes a constant one at every input, the branch contributes whatever slope it has learned, and the block's derivative is their sum. The plate works one scalar branch at three inputs, and the curve below the table is that branch's own slope.

{{figure eq-residual}}

What it buys is a route from output to input whose derivative is exactly one, at any depth and whatever the branch has learned. A stack is then not only a product of arbitrary Jacobians, and the branch learns a correction to the identity rather than a full re-encoding. That is also why a missing residual produces no error: shapes still fit, attention rows still sum to one, and only the block's relative change of its input differs. The lab deletes one residual line and the run keeps working; the loss is where the omission appears.

What the plate does not show is a bound. The identity adds the same one everywhere and cannot shrink, but a branch slope below minus one still puts the block's derivative below zero, and the plate draws that case. It is one constructed scalar branch, not a trained sublayer, and says nothing about where a normalisation sits.

## Normalisation is taken across the features of one row, and its scale and shift are learned

[Layer normalisation](#fig-eq-layernorm) draws one row of thirty-two features and the arithmetic that acts on it: the row, the row standardised by its own mean and standard deviation, and the result of a per-feature multiply and add. The mean and the deviation are one number each, recomputed per row. The learned vectors are one number per feature, so they restore a scale and an offset the standardisation removed; the plate builds them as something other than one and zero so the restoration shows.

{{figure eq-layernorm}}

The axis matters more than the formula. Each row of a `(B, 48, 32)` tensor is one position's state, so the statistics come from the thirty-two features of that row, and no other row enters any number on the page. The feature axis has a fixed size by construction, so its statistic means the same thing at every position and every input length. Taking the same arithmetic down the sequence axis would make one position's representation depend on which other positions are present, and on how much padding the batch carried — the dependence week 8 paid for.

What the plate does not show is the mechanism. It draws a single row, so it cannot show the variance argument that motivates normalising, and it does not say where in the block the layer sits. The row's values are chosen so the arithmetic is exact, not sampled from a trained model, and the layer owns no parameter besides the two per-feature vectors.

## One block is two residual sublayers, and its output type equals its input type

[One encoder block](#fig-encoder-block) assembles the previous two claims. Left to right: a norm capsule, multi-head attention, an addition, a second norm, the feed-forward layer, a second addition, with the residual path carrying `x` around each of the two layers. The norm sits inside the residual branch, so the identity route passes through nothing — pre-normalisation. Placing it outside, `norm(x + F(x))`, rescales the residual path itself, so neither signal nor gradient keeps the scale it arrived with, and a deep stack then needs a warmup schedule. Pre-norm pays with one final normalisation before the readout.

{{figure encoder-block}}

The feed-forward layer is the only place where something is decided about a single position. It runs on each of the forty-eight rows independently with shared weights, widens the row, applies a nonlinearity and projects back. Delete it and the stack composes weighted averages, whose per-position action stays close to linear in the values, so extra depth buys little. Attention puts position 3 in contact with position 41; the feed-forward network asks what that contact means.

The third claim is about interface: output type equals input type, so blocks compose with no bookkeeping — each carries its own weights and an identical signature, and length enters only through the size of the score matrix. Depth becomes a free parameter. The plate is drawn at the published model's constants; the week's runs are narrower and shallower, and no claim depends on those numbers. What it cannot show is the capstone's composition: one block relating the two motifs, the next combining that relation with what the motifs are, a mean over the forty-eight positions, one linear layer to two scores. Mean pooling is blunt: it discards order at the last moment, which forces the blocks to put the answer into the vectors first.

## The attention map locates a candidate, and an ablation decides whether it matters

For one head the map is forty-eight by forty-eight, each row a distribution summing to one, and entry `(i, j)` is the share of position `i`'s mixing drawn from position `j`. Two summaries are available per layer and per head: the weight motif columns receive against the weight filler columns receive, and the mean entry from one motif's rows to the other's columns, against the uniform baseline. Both have a control — score one sequence's attention against another's motif positions and see whether the effect survives.

The stronger test is intervention. Zero the weights from one motif's rows to the other motif's columns, rerun, and see whether the prediction changes. The map proposes; the ablation decides. Attention weight is not contribution: a large weight on a vector the readout discards contributes little, and a small one can matter. Heads are not additive parts of one story; averaging them into one matrix is a presentation choice. A position may be attended because it is anomalous rather than because it is used, and a second block's map is computed on states that have already mixed, so an edge there may reflect a comparison made earlier.

## What you can now do

- Write the two lines of a pre-norm block, say what each residual branch adds back, and differentiate `x + F(x)` for a scalar branch: what the added one guarantees, and what it does not.
- Name the axis layer normalisation runs over in a `(B, T, d)` tensor, and explain why the other axis would make one position depend on which others are present.
- Show that a block maps `(B, 48, 32)` to `(B, 48, 32)`, and say why that permits stacking without making a stack train.
- Compute a motif-versus-filler attention ratio against the uniform baseline, and name the control and the ablation that would make it evidence.

## What this does not give you

The encoder is built for one task and one dataset. The label depends on the order of two motifs in a generated sequence, both motifs are always present, and pooling throws position away after the blocks have finished. Nothing here establishes behaviour on sequences drawn another way.

Two limitations carry over. Attention maps describe where a head drew from, not what the model used, so a map without an ablation is a place to look next. And a trained encoder is a set of weights and a table of residue vectors whose entries answer to the prediction task; chapter 9's caution about reading chemistry out of a learned table applies unchanged.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Vaswani et al. (2017). Attention is all you need. arXiv:1706.03762

## Questions

There are no verified questions for this week.


---

← [Attention](11-attention.md)  ·  [The method on data the course did not choose](project-a-new-data.md) →
