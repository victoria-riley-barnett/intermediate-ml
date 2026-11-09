# Attention

A sequence of forty-eight residues is read into a grid of forty-eight rows, each row a vector of features. The previous lessons produced that grid and then collapsed it: an average over the rows, a flattening into one long row, a window of neighbours carried along the sequence. Each collapse dropped the relation between distant positions, because nothing so far let one row consult another. Attention is the operation in which one row reads the others.

The lab's task fixes what reading has to mean. The alphabet is the twenty residues, two triples are held back from the filler, `WWW` and `CCC`, and every string is forty-eight positions long with one motif early and the other late; the label is 1 when `WWW` comes first. The counts are identical in both classes and only the arrangement differs, so the task turns on relating an early triple to a late one.

The week is the second half of two repairs. Week 8 showed that a reader handed counts of symbols cannot answer an order question at any amount of training. Week 9 gave each residue type one vector, identical wherever the residue sits, and averaged the vectors of its six neighbours; an unweighted average cannot say that one neighbour matters and another does not. Attention replaces both: a position's row becomes a weighted average over the whole sequence, the weights come from content, and once position enters the score, arrangement is inside the numbers. The course turns here: the grid stops being collapsed and becomes the representation.


## A score between two positions is a dot product

[Dot product](#fig-eq-dot-product) pairs two vectors of integers entry by entry, multiplies each pair and adds the products into one number. It is the only comparison the course has between two vectors, large when they point the same way. The plate also draws the case with no answer: with one vector longer, the last term has no partner.

{{figure eq-dot-product}}

So the quantities compared must share a width; the quantity mixed need not. The plate gives no reason for a particular pair to score high: a bare dot product is the same function of the rows whatever the task, and it is symmetric, so "*i* finds *j* relevant" and "*j* finds *i* relevant" are one event.

## One head, worked in numbers

[One attention head, by hand](#fig-attention-worked) takes a small grid of integers through the whole operation: three projections of the input, scores from query against key, those scores divided by the root of the head width, the row-wise softmax beside row sums that all read one, the output as those weights applied to value rows, and one score expanded term by term.

{{figure attention-worked}}

A row of weights summing to one makes the output a weighted average of value rows, at the input's width and in its units. The three panels are three matrices from one input: the score comes from query and key, the mixture over values. A position's advertisement and its contribution are separate, and the score of *i* against *j* need not equal that of *j* against *i*.

Nothing in the plate is trained — one head, no position, no loss — so it shows arithmetic, not that it helps.

## Dividing the scores by the root of the width keeps a row off one-hot

[Scaled dot product](#fig-eq-scaled-dot-product) works one query against three keys of width four and prints the weights twice: from the summed scores, and from the scores divided by the root of the width. The ranking of the keys is the same in both: dividing by a positive number cannot reorder them. What changes is how decided the row is — the divided row is flatter, its entropy closer to that of three equal shares.

{{figure eq-scaled-dot-product}}

The grounds are dimensional rather than empirical. A dot product over independent unit-variance entries has a mean square equal to the number of terms, so its typical size grows with the root of the width, and the division holds the typical score at one whatever the width. A softmax given far-apart scores puts almost all of a row's weight on one entry; its derivative goes near zero, and almost no gradient reaches the projections that made the scores. Flat enough to keep a gradient is the requirement. The plate draws no training and makes no accuracy claim.

## Every position is compared with every other in one step, at a cost that is the length

[Every position compared with every other](#fig-budget-t2) puts two ways to read a sequence side by side. Compared all at once, each position is matched against each position; read one at a time, the sequence costs one step per position. Both counts are plotted against length, a curve against a straight line whose factor is the length.

{{figure budget-t2}}

The pair count is the reach: a comparison between two positions takes one step however far apart they sit, which a window of neighbours cannot do, and that is why attention repairs week 10's receptive field rather than repeating it. The cost is explicit: one entry in the score matrix per ordered pair, growing with the square of the length.

The plate counts operations and nothing else — no time, no memory, no hardware — and it does not say why a long input is hard to represent, which was week 10's question.

## Several heads run several comparisons at the width of one

The week's plates draw one head; the lab builds several. The width is split into blocks, each running the same operation with its own projections at its own narrower width, and one output projection recombines them. A residue and its catalytic partner, a position and its neighbour, a motif and its reverse copy are different comparisons, and one bilinear form serving all of them lands on a compromise.

## The mixture is blind to order until position enters the scores

An attention head with no position information cannot tell two arrangements of the same residues apart. The weights come from content alone, so permuting the input rows permutes the output rows and alters nothing else. On the lab's task that is decisive: a `WWW`-first string and a `CCC`-first string hold the same multiset of residues, their mixtures are the same mixtures, and no classifier after them separates the two.

The repair is to add a position vector to each row before the projections. Query and key then carry the index as well as the content, two identical residues at different offsets produce different rows, and the score depends on where as well as on what. Placement matters: position added after attention labels a mixture whose routing is finished; added at the input, it reaches every later score in a stack.

The lab builds two models whose architectures differ in one respect. The permutation argument settles the outcome before either run: without the position table, both classes arrive as the same numbers and the model can only guess. This closes the repair week 8 opened.

## A mask removes terms from one average, and the row is renormalised

[A mask removes terms from one average](#fig-arch-mask) draws two weight grids over the same scores. On the left every position divides its row by all the keys; on the right the cells above the diagonal are struck through and each row divides only by the keys it keeps, renormalised so every row again sums to one. A third column prints, per row, the sum before that division: the number that is not one, and the reason the division belongs to the mask.

{{figure arch-mask}}

So a mask acts on the weights, not on the output — same scores, same softmax, a different set of contributors. The mask this course's encoder needs is the padding one. A batch is one rectangle of slots, and a pad sits in the same rows and columns as a real symbol, so without a mask every position's average mixes in the vectors written into pad slots; one flag per slot removes them.

The right panel is causal, and the course builds an encoder rather than a causal one, which the plate states. It does not say a position cannot reach another, or what the surviving terms carry.

## What you can now do

- State what a row of weights summing to one makes of an output row, and what a mask changes about it.
- Read one head from its matrices: which projections form the score, which is mixed, and why *i* against *j* need not score as *j* against *i*.
- Say what dividing by the root of the width does to a row of shares, and why a saturated row passes no gradient.
- Count all-pairs comparisons against a one-at-a-time read, and name what the count leaves out.
- Explain why permuting the input permutes the outputs, and where position has to be added to prevent it.

## What this does not give you

Attention is a mixing operation. Once its weights are fixed it is linear in the values, and per position it adds no capacity to transform what it receives. The projections learn only from the data given, and nothing here touches the encoding behind the grid.

One block is not an encoder. The lab names the two pieces still missing: a per-position feed-forward map, so a single position's mixture can be examined on its own, and each block's output added back onto its input with a normalisation, so depth adds instead of eroding. The reach is also bought at the square of the length, and nothing here removes that.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Vaswani et al. (2017). Attention is all you need. arXiv:1706.03762

## Questions

No verified questions for this week: no question rubric exists, and none are invented here.

---

← [Why Whole Sequences Are Hard](10-whole-sequences.md)  ·  [The Full Encoder](12-encoder.md) →
