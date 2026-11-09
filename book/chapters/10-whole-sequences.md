# Why whole sequences are hard

The embedding table hands the network a grid: one row per position, one column per feature. The number of rows is the length of the sequence. A peptide arrives with sixty positions and a kinase with a few thousand. The classifier's first layer is a weight matrix, and its width was settled when the model was built. A grid of shape `(L, d)` with a variable `L` does not fit it.

So every remedy is a map from the grid to a vector of fixed width. This chapter owns the one list of such maps. It measures three of them on one task, and the next chapter adds a fourth. Choosing a map is a claim about what in the sequence carries the answer, and each of the three makes a different claim that the task can test.

> **On the timeline.** From 1989 to 1998 one idea kept returning: reuse one filter at every position of the input. That is a convolution, and the 1998 digit-reading network of LeCun and colleagues is its best-known form. It changed the block: a layer no longer holds separate weights for every position. See [the architectures chapter](architectures.md).

## Three maps reduce a grid to a fixed width

The first map averages the rows. You get `d` numbers whatever the length, at almost no cost, and every position contributes. It is also a proof rather than a performance report. A sum does not care what order its terms arrive in. Two strings that hold the same rows in a different order give the same `d` numbers, bit for bit. Any classifier on top, of any depth, with any weights and any data, must then give the same answer for both. If the label separates the pair, nothing can supply the difference, because it never reaches the model. Averaging is not a special case. Summing, taking a maximum, or any function of the multiset of rows (the rows with their order forgotten) has the same blind spot.

The second map flattens the grid into one long row. Order survives, nothing is discarded, and a linear layer on top can in principle compute any function of the ordered grid. Three costs come with it.

- The flattened width is the length times `d`. The first layer is built for one length, and a string of another length is a shape error, not a low score.
- Every position gets its own private block of weights, so the count grows with the length without bound. With 20 features per position and 64 hidden units, a length of 48 needs 61,440 first-layer weights and a length of 1024 needs 1,310,720. A motif learned at one offset must be learned again at every other offset.
- A label that depends on an event at position `i` together with an event at position `j` is a different conjunction for every pair. There are on the order of `L²` pairs, and nothing in the architecture says that two positions play the same role.

The third map slides a window. A small filter moves along the sequence with the same weights at every stop, and the results are then pooled. We take it up in the next two sections, because it is the map that looks most like a repair.

## The task is built so that only order carries the answer

The running example separates the maps with numbers. Every string is 48 positions long and holds exactly two three-residue motifs, `WWW` and `CCC`. The other positions are filled from the eighteen remaining residues, so no accidental run of three W or three C can occur. One motif starts in the first quarter of the string and the other in the last quarter. The label is which one comes first.

Take a positive string and exchange its two motifs. The result is a negative string that holds the same rows, ingredient for ingredient, with the opposite answer. That sentence is the whole design. Nothing that reads only the multiset of rows can tell the pair apart, and nothing that reads only a short neighbourhood sees both motifs at once.

Biology has this shape, without these numbers. Enhancers regulate promoters across tens of thousands of base pairs, with much of the sequence in between irrelevant. A dependency can hold between two short elements far apart on the genome, while a window of a few dozen bases on one of them sees nothing of the other. In a folded protein, the contacts that hold a domain together can join residues a hundred or more positions apart in the chain. What matters here is distance along the sequence, not any claim that sequence alone fixes structure.

This chapter follows the embedding chapter and comes before attention. It pairs with [fixed-size inputs](08-fixed-size-inputs.md), which named what a fixed-size input cannot express. This chapter corrects one point that chapter left open: reusing one set of weights at every position is not, by itself, the repair.

## One filter applied at every position finds a motif wherever it occurs

[A convolutional network](#fig-convolutional) is the architecture plate from the opening chapter, and here it carries the third map. Read the shapes under the stages. The spatial axes shrink, the channel axis grows, a flatten fixes the width, and only the batch axis stays a letter. The filter is drawn twice on the input, once on each of two non-overlapping fields, and each field yields one output cell. The weights are the same at both places.

{{figure convolutional}}

The gain is exact. A flattened first layer needs a separate set of weights for each position. A convolution needs one set, slid along the input. A motif is then detected wherever it occurs, for the weights of one detector instead of `L` of them. The parameter count no longer depends on the length, and the layer accepts a length it never saw. What you buy is stationarity (the same rule everywhere) and equivariance (a motif moved along the input moves its detection along with it). A sequence motif licenses both assumptions.

The plate shows architecture and no evidence. It holds no string, no task and no score. Its grid is two-dimensional, as in the image chapters, so it cannot say whether a convolution relates two distant positions. That question is arithmetic.

## An output depends on the window under it, so two distant positions cost depth

[One convolution position](#fig-eq-conv-window) is worked by hand on the plate. Nine products come from a nine-value window and sum to one number, y = -6, and the same nine weights are reused one cell to the right. The window is that output's receptive field, the set of inputs it can depend on. Its size is the kernel size, written `k`.

{{figure eq-conv-window}}

One layer of width `k` lets an output depend on `k` inputs. Each layer stacked behind it brings `k - 1` more positions into view, so the span after `depth` layers is `1 + depth * (k - 1)`. With a kernel of five, ten layers give a span of 41. An output that sees two positions forty apart therefore needs about ten mixing layers between the input and itself, and each of them must carry both signals forward intact.

Hold this against the eighth chapter's ladder. Shared weights do not put two distant positions into one operation. They put `k` neighbouring positions into one. The locality that makes a window good at motifs is the same property that makes binding distant positions a matter of piling up layers. The depth required is set by the longest distance in the data. It is not known when the model is built, and nothing in the layer bounds it.

The plate shows one position and stops at the border: with no padding, a window that runs off the image has no output. It carries no stack, no training and no argument that a depth is unreachable. Dilation, which spaces the filter's taps apart, widens the span faster than stacking does, and the plate is silent about it.

## All three reductions lose the order, each by its own mechanism

[The same 48 positions, three ways to a fixed width](#fig-compare-three-reductions) is the week's measurement. It uses one task, one linear read-out on top of each reduction, one loss, one optimiser, one seed, and a chance line in every cell. Each panel draws the same pair of rows: the same bases in the two blocks, with only their order exchanged.

{{figure compare-three-reductions}}

The averaging panel prints one number per base for each row, and the two rows give the same four numbers. This is the permutation argument arriving as a measurement. It widens the eighth chapter's result, where the failure belonged to one representation. Mean, sum and maximum all sit in the same class.

The flattening panel prints two vectors that differ, in 24 of 192 numbers, and every difference sits inside the 12 slots that hold a motif. So this reduction can carry the distinction. The scores still split: perfect on the placements that training delivered, and at chance on the other quarters. What the model learns is where the motifs sat, not which came first. This is the eighth chapter's coverage story with a structural half added.

The window panel is the sharpest. Its filter bank holds the two motifs themselves, which is the best case a window can be given. The largest match count is 6 in both rows, while the peak moves with the blocks. Pooling over positions deletes the only part of the answer that differs.

The plate does not show a window wide enough to hold both blocks. By the geometry above, such a window exists and it can classify, but it costs a filter whose span is the distance between the blocks. The plate also holds only one convolution layer, one pooling rule (a maximum here, a mean in the lab's model), a linear read-out, and a four-base alphabet with six-base motifs. The lab runs twenty residues and three-residue motifs. The mechanism carries over, but the scores belong to one instance.

## Attention is the fourth map, and it reduces nothing

Put the three side by side and the pattern is plain. Each one forces the whole grid through a fixed width, and each pays for it.

| Map | What it keeps | What it loses |
|---|---|---|
| Average the rows | every position, equally | all order |
| Flatten | all order and all positions | a free length; shared weights between positions |
| Slide a window and pool | local motifs, one detector for all places | any relation between positions farther apart than the window |

All three reduce the grid before anything compares positions. In none of them does position 5 meet position 40 inside one operation, so the link between them has to be rebuilt indirectly or not at all. The next chapter, [attention](11-attention.md), is the fourth member of the list and the odd one out. It reduces nothing. Every position is compared with every other, and the comparison itself is learned. This chapter does not show that it works. It shows what the other three cannot do, so that the need is clear.

## By hand, in pure Python

This code is ours, not adapted from SmolML, which has no sequence code. It is written in SmolML's style: plain lists, plain loops, one small function per idea. It builds one positive string and its matching negative, then applies all three reductions. The file is `book/code/10-whole-sequences/reductions.py`.

```python
RESIDUES = "ACDEFGHIKLMNPQRSTVWY"

def one_hot(s):                       # the grid: one row of 20 numbers per position
    return [[1.0 if r == c else 0.0 for c in RESIDUES] for r in s]

def average(grid):                    # (L, 20) -> 20 numbers
    L = len(grid)
    return [sum(row[j] for row in grid) / L for j in range(len(grid[0]))]

def flatten(grid):                    # (L, 20) -> L * 20 numbers
    return [x for row in grid for x in row]

def slide(grid, motif):               # match count at every start
    k = len(motif)
    return [sum(grid[i + t][RESIDUES.index(motif[t])] for t in range(k))
            for i in range(len(grid) - k + 1)]

# pos: WWW at 4, CCC at 38.  neg: the two motifs exchanged.
gp, gn = one_hot(pos), one_hot(neg)
print("average equal:", average(gp) == average(gn))
fp, fn = flatten(gp), flatten(gn)
print("flatten length:", len(fp), " differ in:", sum(a != b for a, b in zip(fp, fn)))
for name, g in (("pos", gp), ("neg", gn)):
    w, c = slide(g, "WWW"), slide(g, "CCC")
    print(name, "max W", max(w), "at", w.index(max(w)), "| max C", max(c), "at", c.index(max(c)))
```

The complete file builds `pos` and `neg` from a seeded random filler. The real output:

```
QRDLWWWMTPIVGMGFLYGMFENTYFPRNIYTSVLDYACCCTNKNEIK
QRDLCCCMTPIVGMGFLYGMFENTYFPRNIYTSVLDYAWWWTNKNEIK
average equal: True
flatten length: 960  differ in: 12
pos max W 3.0 at 4 | max C 3.0 at 38
neg max W 3.0 at 38 | max C 3.0 at 4
first layer weights, h=64: L=48 -> 61440  L=1024 -> 1310720
receptive field, k=5, depth 10: 41
```

Read it line by line. The averages are equal, so no classifier can separate the pair. The flattened vectors differ in 12 places, the 6 slots of each motif swapped, so the information is there. The window finds each motif with a full count of 3 in both strings. Only the location of the peak differs, and a maximum over positions throws the location away.

## The same thing in PyTorch

The course path is still Dataset, DataLoader, batch, `nn.Module`, prediction, metric. What changes this week is only the module. These are the lab's three models, shown here and not run in this book.

```python
class MeanPool(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(20, 2)
    def forward(self, x):                      # x: (B, L, 20)
        return self.fc(x.mean(dim=1))

class FlattenNet(nn.Module):
    def __init__(self, length=48, hidden=64):
        super().__init__()
        self.fc1 = nn.Linear(20 * length, hidden)
        self.fc2 = nn.Linear(hidden, 2)
    def forward(self, x):
        return self.fc2(F.relu(self.fc1(x.reshape(x.shape[0], -1))))

class WindowNet(nn.Module):
    def __init__(self, width, channels=32):
        super().__init__()
        self.conv = nn.Conv1d(20, channels, kernel_size=width)
        self.fc = nn.Linear(channels, 2)
    def forward(self, x):
        h = F.relu(self.conv(x.transpose(1, 2)))   # (B, 32, L - w + 1)
        return self.fc(h.mean(dim=2))
```

Feed `FlattenNet` a string of length 60 and the first matrix multiply raises a `RuntimeError`, because the layer was built for 48 times 20 inputs. `MeanPool` and `WindowNet` accept any length. The metric is accuracy on a held-out set, with 0.5 as the chance line, since the two labels are produced in equal numbers.

## What the run shows

The numbers come from the plate, not from this chapter's code. On one instance, with a linear read-out on each reduction, trained on 1500 strings and scored on 4000:

| Reduction | Delivered slots | Other quarters |
|---|---|---|
| Average | 0.4783 | 0.4925 |
| Flatten | 1.0000 | 0.4903 |
| Window (best-case filter bank) | 0.5000 | 0.5000 |

Chance is 0.5 in every cell. Averaging and the window sit at chance everywhere, for the reasons above. Flattening is perfect where training showed it the placements and at chance elsewhere, so it memorised positions.

## What you can now do

- Name a pair of strings the label treats differently and decide, without training, whether averaging, summing or maximising separates them.
- Say what a flattened first layer pays per position, and why a new length is an error at the first matrix multiply rather than a low score.
- State the receptive field of a stack of convolutions, and why relating two positions a given distance apart costs depth in proportion to that distance.
- Read the three panels of the reduction plate and say which failure is a limit of the map and which is a limit of training coverage.

## What is still missing

- A way to compare every position with every other, directly, without reducing first. [Attention](11-attention.md) supplies it.
- A reason to trust order once attention has it. Attention by itself ignores order, and positional information is added in the same chapter.
- The other pieces a full model needs around attention, which [the encoder chapter](12-encoder.md) assembles.
- Any claim about real enhancers or real contact maps. The toy is an instrument, not a model of a protein. Its only claim is that these three maps lose the information the label uses. The measurements cover one convolution layer, one pooling rule per model and a linear read-out, so no printed score transfers to a real sequence or to a choice between architectures.

## Sources

- LeCun, Bottou, Bengio & Haffner (1998). Gradient-based learning applied to document recognition. *Proc. IEEE* 86(11), 2278-2324. doi:10.1109/5.726791

## Questions

1. Two strings contain the same residues in a different order, and the label depends on the order. Why can a model that averages the rows never get both strings right, however much data it sees?
2. A flattened first layer is built for strings of length 48 with 20 features per position and 64 hidden units. How many first-layer weights is that, and what happens when it receives a string of length 60?
3. A convolution has kernel size 5. How many layers must be stacked before one output can depend on two positions 40 apart? State the rule you used.
4. In the toy task a window filter finds `WWW` with a full match in both a positive string and its matching negative. Why does pooling by maximum make the two strings look the same, and what would pooling have to keep to tell them apart?
5. Flattening scored 1.0000 on the delivered placements and 0.4903 on the other quarters. Is this a limit of the map or of the training data? Say what evidence in the chapter supports your answer.
