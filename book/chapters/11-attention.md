# Attention

Suppose a protein is 48 residues long and you want to know whether a tryptophan triple (`WWW`) lies upstream of a cysteine triple (`CCC`). Each residue has already been turned into a short list of numbers, so the protein is a grid of 48 rows, one row per position. The earlier chapters used that grid and then collapsed it: an average over the rows, a flattening into one long row, or a window of neighbours slid along the sequence. Each collapse threw away the relation between two positions far apart, because nothing so far let one row look at another. Attention is the operation in which one row reads the others.

The lab sets the task. The alphabet is the twenty residues. Two triples, `WWW` and `CCC`, are kept out of the filler, and every string is 48 positions long with one motif early and the other late. The label is 1 when `WWW` comes first. Both classes contain the same residues, so counting residues cannot help. Only the arrangement differs, and a reader has to relate an early triple to a late one.

> **On the timeline.** The architectures timeline has two rows that this chapter inherits. In 2014 attention was added to translation models: a decoder that had been handed one summary vector was allowed to read all of the encoder's states at each output step. In 2017 the transformer removed the step-by-step recurrence and kept attention alone as the way positions exchange information. What changed is the block, not the input: the grid of rows stays a grid. See [the architectures chapter](architectures.md).

This week is the second half of two repairs. In chapter 8 a reader given only counts of symbols could not answer an order question, however long it trained. In chapter 9 each residue type got one vector, the same wherever the residue sits, and a position was summarised by averaging the vectors of its six neighbours. An unweighted average cannot say that one neighbour matters and another does not. Attention replaces both. Each position's row becomes a weighted average over the whole sequence, the weights come from content, and once position is added to the score, arrangement is inside the numbers. From here on the course stops collapsing the grid and treats it as the representation.

## A score between two positions is a dot product

A weighted average needs weights, and the weights have to be computed from the rows themselves, because which pair of positions matters changes from one sequence to the next. The first thing we need is a way to compare two rows. The only comparison we have is the dot product. It pairs two lists of numbers entry by entry, multiplies each pair, and adds the products into one number. It is large when the two lists point the same way.

{{figure eq-dot-product}}

In the plate the lists (2, 1, -3, 4) and (3, -2, 1, 1) give 6, -2, -3 and 4, which add to 5. The plate also shows the case with no answer: if one list is shorter, the last term has no partner. So the two things being compared must have the same width. The thing being mixed does not have to.

A bare dot product between two rows of the grid has two weaknesses. It is the same function of the rows whatever the task, so training cannot improve it. And it is symmetric: "position *i* finds *j* relevant" is the same number as "position *j* finds *i* relevant". Real relations often have a direction, and the fix is to compare rows only after passing them through learned maps.

## One head, worked in numbers

Each position gets three separate projections, which are three learned maps from its row to a new list of numbers. The query is what the position is looking for. The key is what a position advertises, so that a query can be matched against it. The value is what a position hands over once it has been matched. The score of *i* against *j* is the dot product of the query of *i* with the key of *j*. The output for *i* is a weighted average of the values, and the weights are the softmax of its row of scores. The softmax turns a row of scores into non-negative shares that sum to one, by exponentiating each score and dividing by the total.

The next plate takes a small grid of integers through that whole operation: Q, K and V, then the scores from query against key, the scores divided by the square root of the head width, the softmax of each row beside a column of row sums that all read 1.00, and the output. It also expands one score term by term.

{{figure attention-worked}}

Take the first query, (1, -1, 1, -1), and the first key, (0, -1, 0, 0). The score is 1·0 + (-1)·(-1) + 1·0 + (-1)·0 = 1, which is the top-left entry of the score grid. The head width is 4, so we divide by its square root, 2, and get 0.5. After the softmax, query 1 puts 0.58 of its weight on position 4, whose score was 3. Each of the four queries peaks at a different key.

Because each row of weights sums to one, the output is a weighted average of the value rows. It has the same width as the values, and its entries stay in the same units. It does not grow with the length of the sequence.

Keeping the key and the value apart matters. What decides relevance does not have to be what gets moved. A position can advertise one thing and deliver another, and training can adjust both. Keeping the query and the key apart gives direction: in the score grid, S12 is 0 and S21 is -1, so position 1 reading position 2 is not the same event as position 2 reading position 1.

The plate shows arithmetic and nothing else. It has one head, no position information and no loss, so it does not show that attention helps with anything.

## Dividing the scores by the root of the width keeps a row from becoming one-hot

Why divide by the square root of the width at all? The next plate works one query against three keys of width four and prints the weights twice: once from the raw scores (1, 3, 5), and once from the scores divided by 2.

{{figure eq-scaled-dot-product}}

The ranking of the keys is the same both ways, because dividing by a positive number cannot reorder anything. What changes is how decided the row is. The raw scores give weights (0.016, 0.117, 0.867). The divided scores give (0.090, 0.245, 0.665). The entropy, a measure of how spread out a row of shares is, is 0.441 for the raw row and 0.833 for the divided row. A row giving a third of its weight to each key would have 1.099. So the divided row is flatter. The layer uses the divided weights, and the output row is (1.42, 0.49, 0.18, 0.91).

The reason is a matter of size rather than something measured. A dot product adds up as many terms as the width. If the entries are independent and have unit variance, the square of the sum has an average equal to the number of terms. So the typical score grows with the square root of the width, and dividing by that root holds the typical score near one whatever the width.

This matters because of what a softmax does with large scores. If one score leads the others by a lot, the softmax gives it nearly all the weight, and the row is almost one-hot. In that regime the softmax is almost flat in its inputs, so a small change in any score hardly changes the row. The gradient that flows back to the projections that made the scores is then close to zero, and training cannot correct them. We need a row flat enough to keep a gradient. The plate draws no training and makes no claim about accuracy.

## Every position is compared with every other in one step, at a cost that is the length

The next plate sets two ways of reading a sequence side by side. When positions are compared all at once, each position is matched against every position. When the sequence is read one position at a time, as a recurrent model does, it takes one step per position.

{{figure budget-t2}}

At the length of 12 that the course used, all-pairs comparison is 12 × 12 = 144 comparisons, and reading one at a time is 12 steps. Plotted against length, the first is the curve T squared and the second is the line T, and the factor between them is T itself.

The pair count is the reach. A comparison between two positions takes one step however far apart they sit. A window of neighbours cannot do that: to connect two positions farther apart than its width, it needs a stack of layers that grows with the distance. This is why attention repairs the receptive-field limit of the previous chapter rather than repeating it. The cost is explicit. The score matrix has one entry for each ordered pair of positions, so it grows with the square of the length, and nothing in this chapter removes that.

The plate counts operations and nothing more. It counts no time, no memory and no hardware, and it does not say why a long input is hard to represent. That was the previous chapter's question.

## Several heads run several comparisons at the width of one

The plates draw one head. The lab builds several. The width is cut into blocks. With 32 features and 4 heads, each head works at width 8. Each head runs the same operation with its own query, key and value projections, and one output projection recombines the results back to width 32.

The point of heads is separate comparisons. A residue and its catalytic partner, a position and its immediate neighbour, a motif and its reverse copy are different relations. A single head has one score function, and if it must serve all of them it lands on a compromise. With several heads, each can place its score on a different relation, and the output projection decides how to combine them. Heads divide the width rather than multiplying the cost: four heads of width 8 cost about the same as one head of width 32.

## The mixture is blind to order until position enters the scores

An attention head with no position information cannot tell two arrangements of the same residues apart. Its weights come from content alone. If you permute the rows of the input, the rows of the output are permuted in the same way and nothing else changes. Every output row is a weighted average of value rows, and reordering the sequence only relabels which average sits at which index.

On the lab's task that is decisive. A `WWW`-first string and a `CCC`-first string hold the same residues, so their mixtures are the same set of mixtures, and no classifier placed after them can tell the two apart. The code below checks this on the plate's head.

The repair is to add a position vector to each row before the projections. The query and the key then carry the index as well as the content. Two identical residues at different offsets give different rows, and the score depends on where as well as on what. Placement matters. If position is added after attention, it only labels a mixture whose routing is already finished. If it is added at the input, it reaches every later score in a stack of blocks.

The lab builds two models that differ in only this respect, one with a learned table of position vectors and one without. The permutation argument settles the outcome of the second before it is run: both classes arrive as the same numbers, so the model can only guess. This closes the repair that chapter 8 opened.

## A mask removes terms from one average, and the row is renormalised

Sometimes a position should not be allowed to read some of the others. The next plate draws two grids of weights over the same 144 scores. On the left, every position divides its row by all 12 keys. On the right, the 66 cells above the diagonal are struck through, and each row divides only by the keys it keeps, 78 cells in all. Every row again sums to 1.00. A third column prints, for each row, the sum before that division: 0.05 in row 1 and 1.00 in row 12.

{{figure arch-mask}}

That column is the number that is not one, and it is why the division belongs to the mask. The mask acts on the weights, not on the output. It uses the same scores and the same softmax, with a different set of contributors.

The mask this course's encoder needs is the padding mask. A batch is one rectangle, and a pad slot sits in the same rows and columns as a real symbol. Without a mask, every position's average would mix in the vectors written into pad slots. One flag per slot removes them. The right grid in the plate is a causal mask, in which each position reads only earlier ones. The course builds an encoder, not a causal model, and the plate says so. It does not say that a position can never reach another, and it does not say what the surviving terms carry.

## By hand, in pure Python

SmolML has no attention code, so this example is ours. It is written in the same style: lists of floats and `math.exp`, with no libraries. The file is `book/code/11-attention/one_head.py`. It uses the numbers of the worked plate, so you can check it against the figure.

```python
import math

Q = [[1, -1, 1, -1], [1, 1, -2, 2], [0, -2, 1, 0], [-2, 2, 1, -1]]
K = [[0, -1, 0, 0], [1, 1, -2, -2], [-1, 1, -1, -2], [2, 0, 0, -1]]
V = [[1, 1, 1, 2], [0, 3, 2, 3], [3, 0, 2, 1], [2, 1, 3, 1]]

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def softmax(row):
    exps = [math.exp(s) for s in row]
    total = sum(exps)
    return [e / total for e in exps]

def head(Q, K, V):
    root_d = math.sqrt(len(K[0]))
    S = [[dot(q, k) for k in K] for q in Q]                       # scores
    A = [softmax([s / root_d for s in row]) for row in S]         # weights
    Y = [[sum(a * v[c] for a, v in zip(row, V)) for c in range(len(V[0]))]
         for row in A]                                            # mixtures
    return S, A, Y

S, A, Y = head(Q, K, V)
perm = [1, 0, 2, 3]
_, _, Y2 = head([Q[i] for i in perm], [K[i] for i in perm], [V[i] for i in perm])
```

The file also prints the results. Here is its real output.

```text
S  [[1, 0, -1, 3], [-1, 2, -2, 0], [2, -4, -3, 0], [-2, 0, 5, -3]]
A  [[0.21, 0.13, 0.08, 0.58], [0.13, 0.58, 0.08, 0.21], [0.67, 0.03, 0.05, 0.25], [0.03, 0.07, 0.88, 0.02]]
row sums [1.0, 1.0, 1.0, 1.0]
Y  [[1.61, 1.18, 2.37, 1.47], [0.79, 2.08, 2.08, 2.29], [1.32, 1.01, 1.58, 1.73], [2.71, 0.26, 1.99, 1.17]]
permuted output is the permuted rows: True
```

Every number matches the plate: the scores, the weights to two decimals, the row sums and the output. The last line is the order argument in action. We swapped the first two input rows, and the output rows swapped in exactly the same way. Nothing in the head noticed the order.

## The same thing in PyTorch

The course path is dataset, loader, batch, module, prediction, metric. This week the module is new. The lab's batch is a tensor of integer residue ids of shape (batch, 48), with labels of shape (batch,). The multi-head block is below.

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.to_q = nn.Linear(d_model, d_model)
        self.to_k = nn.Linear(d_model, d_model)
        self.to_v = nn.Linear(d_model, d_model)
        self.project = nn.Linear(d_model, d_model)

    def forward(self, x):
        b, t, d = x.shape
        split = lambda m: m(x).view(b, t, self.n_heads, self.d_head).transpose(1, 2)
        q, k, v = split(self.to_q), split(self.to_k), split(self.to_v)
        scores = q @ k.transpose(-2, -1) / math.sqrt(self.d_head)
        shares = torch.softmax(scores, dim=-1)
        merged = (shares @ v).transpose(1, 2).contiguous().view(b, t, d)
        return self.project(merged), shares
```

The three `nn.Linear` layers are the three projections. The line with `q @ k.transpose` is every pairwise dot product at once, and `shares @ v` is the weighted average. `F.scaled_dot_product_attention` does the same arithmetic in one call, as the plate's key shows. No loop over positions appears anywhere.

The lab's encoder embeds the residues, prepends one learned summary row, adds a position table (in one of the two models), runs this block, and classifies from the summary row's output. The prediction is two scores, one per class, and the metric is accuracy on held-out strings.

The sources contain no printed accuracy for this lab and no run log, so we quote none. The lab asks you to compare the two runs and explain the result, and the permutation argument tells you what to expect from the model without positions.

## What you can now do

- State what a row of weights summing to one makes of an output row, and what a mask changes about it.
- Read one head from its matrices: which projections form the score, which one is mixed, and why *i* against *j* need not score the same as *j* against *i*.
- Say what dividing by the root of the width does to a row of shares, and why a saturated row passes almost no gradient.
- Count all-pairs comparisons against a one-at-a-time read, and name what the count leaves out.
- Explain why permuting the input permutes the outputs, and where position has to be added to prevent it.

## What is still missing

- Attention only mixes. Once its weights are fixed it is linear in the values, and per position it adds no capacity to transform what it receives. A small per-position feed-forward map is needed so a single position's mixture can be examined on its own. [The Full Encoder](12-encoder.md) adds it.
- A stack of attention blocks keeps rewriting each row as a mixture. Adding each block's output back onto its input, with a normalisation, lets depth add rather than erode. [The Full Encoder](12-encoder.md) picks this up too.
- The projections learn only from the data given, and nothing here touches the encoding behind the grid. The choice of encoding came from [Embeddings](09-embeddings.md).
- The reach is bought at the square of the length, and nothing here removes that cost.

## Questions

1. In the worked plate, query 1 puts the largest weight on which key position, and what in the score grid explains it?
2. The plate for the scaled dot product shows the ranking of the keys unchanged after dividing by 2. What does change, and why does that matter for training?
3. Why can a head with no position information not solve the `WWW`-first versus `CCC`-first task, even though its weights are computed from content?
4. At a length of 12, how many comparisons does all-pairs attention make, and how many steps does reading one position at a time take? What is the ratio, and what does it do as the length grows?
5. In the causal mask plate, row 1 has a pre-division sum of 0.05. Why are the kept weights divided by that sum, and what would go wrong if they were not?

## Sources

- Vaswani et al. (2017). Attention is all you need. arXiv:1706.03762
