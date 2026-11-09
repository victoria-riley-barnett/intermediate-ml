# Giving tokens meaningful numbers

A network needs numbers, and a protein is a string of letters. In week 8 the letters became integer ids, and `nn.Embedding` turned each id into a row of eight learned numbers. That reader then placed the twelve rows side by side and gave every slot its own weight downstream. As a result, the padding decided which weights read which symbols. A held-out padding change exposed this; the training loss did not. The table was not the part that failed. The way the rows were combined was.

This week we keep the table and change the combination. The running example is a protein window. We look up the residues on either side of one position, average their rows into a single vector, and use a linear head to turn that vector into twenty scores, one per residue type. The residue in the middle is the target and is never one of the inputs. The invented window `A L V I D K G` carries the arithmetic. The lab builds the same kind of pairs from reviewed UniProt records, which are curated protein entries.

Three things change together: how a residue is represented, what the model is asked to predict, and what the architecture keeps. The mean keeps which neighbours were present and drops where each one sat.

> **On the timeline.** This chapter inherits the 2013 row of the architectures timeline: a token given a vector fitted to its neighbours. What changed was the input. A symbol stopped being a bare id and became a row of numbers that training adjusts. See [the architectures chapter](architectures.md).

This chapter is the first half of a pair. Averaging ignores order: shuffle the six ids and the pooled vector and the scores do not change. The model that repairs this arrives two weeks later, and nothing here fixes it. The training machinery does not move. The module, the trainer and the cross-entropy loss we already built hold a different architecture without change.

## An embedding lookup selects one row of a learnable table

The next plate draws the lookup alone, with no averaging and no head. An integer id tensor sits on the left. One cell is filled in the accent colour, and an arrow carries it into the table row with the same label. That row leaves as the front card of a stack, labelled with the id shape and the row width. The other rows stay in the table.

{{figure embedding}}

The id is an address, not a measurement. It comes from a fixed alphabet and says nothing about the residue: not its mass, not its charge, not its size. So neighbouring ids do not mean similar residues. The table stores one row of adjustable numbers per residue type, and the same row comes back wherever that residue occurs. You can also see the lookup as a one-hot row multiplied by the table, with the multiplications by zero skipped. A one-hot row is a list of zeros with a single 1 at the residue's position.

The plate does not show where the numbers came from. The initial rows are random, so closeness between two rows before training means nothing. Charge or mass could be supplied as an input feature in some other model. This table receives only ids and gradients. Whatever structure it ends up holding is put there by the prediction task.

## The target residue is never in its own context, and the mean forgets neighbour order

The next plate follows one prediction from start to finish on the invented window. The centre slot is marked held out and is never looked up. The six neighbours are looked up, pooled column by column into one row, and a linear head turns that row into one score per candidate residue. A score is not yet a probability; softmax turns the twenty scores into twenty probabilities that sum to 1.

{{figure trace-context-window}}

The plate makes two claims. First, the target's row does not enter the input. If it did, the model would be handed the answer and the loss would measure nothing. Second, the pooled row is the same for any arrangement of the six neighbours, because pooling adds each column and divides by the count, and addition has no order.

The second claim is where this design parts from week 8's flattened reader. Flattening kept which slot supplied which vector, and paid for it with a first layer tied to a fixed number of slots. The mean applies one function to every neighbour and works at any window length. The price is that `A L V D K G` and `G K D V L A` give the same context vector. The order is not compressed. It is discarded. The model is told what is nearby, not what sits next to what.

The numbers on the plate are chosen so the arithmetic stays readable. They were not produced by training. The six rows have only two nonzero coordinates each, the columns total 6 and 6, and the pooled row is `[1, 1, 0, 0, 0, 0, 0, 0]`. The head gives the target residue I the score ln 4, which is 1.386, and every other residue the score 0. Softmax then gives I a probability of 4/23, about 0.174, and each other residue 1/23, about 0.043. The denominator 23 is the sum of the exponentials: 4 plus nineteen 1s. It is not a vocabulary size.

The cross-entropy loss for one example is minus the natural logarithm of the probability given to the true residue. Here that is the logarithm of 23/4, about 1.749. A uniform guess over twenty residues would cost ln 20, about 3.00. That figure is a reference point and not a promised starting loss, since random scores are not exactly equal.

One pooled row is a prediction about one position. It is not a description of a residue. The trained version is the lab's, and its loss curve says more. The loss falls and then flattens well above zero. That floor belongs to the task. Six neighbours do not determine the residue between them, so the best output available is a distribution over the plausible residues, and its entropy is paid on every example.

## Cosine similarity compares direction and cancels length

Once the table is trained, the question is what it holds. Answering it means comparing rows. The next plate shows why the comparison ignores length. We pair the entries and multiply each pair. We add the products to get the dot product. We measure each vector's own length. Then we divide the dot product by both lengths.

{{figure eq-cosine-similarity}}

The plate uses the vectors (3, 4) and (4, 3). Their dot product is 24 and each is 5 long, so the cosine similarity is 24/25, which is 0.96. Dividing by one length and then the other cancels whichever vector was longer. What survives is the angle between them. Cosine distance is one minus the similarity. It is 0 for the same direction, 1 for perpendicular vectors and 2 for opposite directions. The plate uses two-coordinate vectors so you can follow the arithmetic by hand. Rows of eight coordinates take the same four steps.

A zero vector is the exception. It has no direction, so its score is undefined rather than large.

The plate does not settle what a short distance means. The score describes a pair of rows. Whether it corresponds to anything chemical is a separate question about the task, the data and the training signal. The lab looks for a pattern, not a pair. It computes all twenty-by-twenty cosine distances and, for a few residues, prints the four nearest rows. Then it asks whether the near neighbours of a hydrophobic residue are also hydrophobic. These lists shift between runs.

## Similarity over two coordinates can disagree with similarity over all eight

Eight coordinates per row are more than anyone can look at. So the lab projects the twenty rows onto two directions and colours them by four classes: hydrophobic, charged, polar and special. The next plate shows what that projection costs. Both panels show the same three vectors. The left panel plots the first two coordinates at true angles, and there B points nearer to A than C does. The right panel puts both cosine values on one axis, and over all eight coordinates the ranking reverses.

{{figure plot-similarity}}

The vectors are constructed. A is `[1, 0, 0, 0, 0, 0, 0, 0]`, B is `[0.9, 0.1, 4, 0, 0, 0, 0, 0]` and C is `[0.8, 0.2, 0, 0, 0, 0, 0, 0]`. In the left view B is 6.3 degrees from A and C is 14.0 degrees. Over the first two coordinates the cosines are 0.9939 for A and B and 0.9701 for A and C. Over all eight, cos(A, B) is 0.2194 and cos(A, C) is 0.9701.

Ask which coordinate does the work. B's advantage in the left panel comes from the two coordinates that panel prints. Its direction in the full space is set by coordinate 3, which is 4 and makes up 95 percent of B's squared length. The left panel cannot show it. C's value is the same in both views because its remaining coordinates are zero. An ordering read off a picture is a property of the picture.

So a projected map does not rank rows, and a claim about which residues are close belongs in the full space. Even there, a nearest-neighbour list belongs to one run. Report the training data and the seed, and compare across runs. The lab centres each column first, so the picture shows how rows differ and not a shared offset. The decomposition it uses is ambiguous up to sign and rotation, so a second run can show the arrangement mirrored. The axes carry no units.

This plate does not show a trained embedding. Its three vectors are constructed, and the disagreement is arranged to be visible. The lab's map cannot settle whether the four colours gather either. It is one table from one run. A low training loss beside a tidy picture establishes neither accurate prediction on sequences the model has not seen nor anything biological.

## By hand, in pure Python

The code below is the whole forward pass for the invented window, in plain Python. The id step follows the idea in SmolML's tokenizers, which build a `token_to_id` dictionary: [`smolml/preprocessing/tokenizers/tokenizers.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/preprocessing/tokenizers/tokenizers.py) (MIT). SmolML has no embedding table, so the table, the mean and the head are ours. The table holds the plate's chosen rows, not trained ones. The file is `book/code/09-embeddings/lookup_and_mean.py`.

```python
import math

ALPHABET = "ACDEFGHIKLMNPQRSTVWY"
token_to_id = {aa: i for i, aa in enumerate(ALPHABET)}

window = "ALVIDKG"                       # invented; centre residue I is the target
centre = len(window) // 2
context = window[:centre] + window[centre + 1:]
ids = [token_to_id[aa] for aa in context]
target = token_to_id[window[centre]]
print("ids:", ids, "target:", target)

table = [[0.0] * 8 for _ in ALPHABET]    # 20 rows x 8 numbers
for aa, (a, b) in zip("ALVDKG", [(2, 0), (1, 1), (0, 2), (2, 0), (1, 1), (0, 2)]):
    table[token_to_id[aa]][:2] = [a, b]

def pool(ids):                            # lookup, then mean column by column
    rows = [table[i] for i in ids]
    return [sum(col) / len(rows) for col in zip(*rows)]

head = [[0.0] * 8 for _ in ALPHABET]      # linear head: 20 scores from 8 numbers
head[target][0] = math.log(4)

def probabilities(ids):
    c = pool(ids)
    scores = [sum(w * x for w, x in zip(row, c)) for row in head]
    exps = [math.exp(s) for s in scores]
    return [e / sum(exps) for e in exps]

p = probabilities(ids)
print("pooled:", pool(ids))
print(f"P(I) = {p[target]:.3f}   loss = {-math.log(p[target]):.3f}")
print("same after reversing the neighbours:", probabilities(ids[::-1]) == p)

def cosine(u, v):
    dot = sum(a * b for a, b in zip(u, v))
    return dot / (math.sqrt(sum(a * a for a in u)) * math.sqrt(sum(b * b for b in v)))

L, D, A = (table[token_to_id[x]] for x in "LDA")
print(f"cos(L, A) = {cosine(L, A):.3f}   cos(A, D) = {cosine(A, D):.3f}")
```

```
ids: [0, 9, 17, 2, 8, 5] target: 7
pooled: [1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
P(I) = 0.174   loss = 1.749
same after reversing the neighbours: True
cos(L, A) = 0.707   cos(A, D) = 1.000
```

The first four lines match the plate: the ids, the pooled row, the probability 4/23 and the loss. The fifth line shows the order blindness directly. The last line is a warning about hand-chosen rows. A and D were given the same row, so their cosine is exactly 1, although alanine and aspartate are chemically unlike. The numbers in a table mean something only if training put it there.

## The same thing in PyTorch

In PyTorch the table is `nn.Embedding(20, 8)`, which holds 160 numbers, and the head is `nn.Linear(8, 20)`, which holds 180 including its biases. Together that is 340 numbers, shared across all windows. The course path is the one we already know, with a different module in the middle.

```python
class LitResidue(L.LightningModule):
    def __init__(self, embedding, head):
        super().__init__()
        self.embedding, self.head = embedding, head

    def forward(self, neighbour_ids):                # (B, 6)
        vectors = self.embedding(neighbour_ids)      # (B, 6, 8)
        context = vectors.mean(dim=1)                # (B, 8)
        return self.head(context)                    # (B, 20) raw scores

    def training_step(self, batch, batch_idx):
        neighbour_ids, centre_ids = batch
        return F.cross_entropy(self(neighbour_ids), centre_ids)
```

A `TensorDataset` holds the context ids and the centre ids together. A `DataLoader` groups them into batches of `B` examples, so a batch of contexts has shape `(B, 6)` and the targets have shape `(B,)`. The module turns a batch into scores of shape `(B, 20)`. The training step compares those scores with the targets, and `Trainer.fit` repeats the forward pass, the backward pass and the optimizer update. The metric here is the cross-entropy itself. `F.cross_entropy` takes raw scores and applies the log-softmax inside, so do not apply softmax before it.

The lab trains this model with Adam for four thousand steps, in batches of 1024 examples, with a learning rate of 3e-3 that decays to zero along a cosine schedule. The seed fixes the shuffle and the starting table, so a rerun reproduces the curve.

## What the run shows

The lab's printed outputs are not part of the delivered sources, so we quote no trained numbers from it. Four things it is built to show can be stated without numbers.

- The starting loss is near ln 20, about 3.00, because the untrained scores are small and the softmax is close to uniform. The lab prints both values side by side.
- The loss falls quickly and then flattens well above zero. The floor belongs to the task.
- The nearest-neighbour lists and the map change from run to run. The pattern to look for is whether near neighbours of hydrophobic residues are also hydrophobic.
- Looking up leucine once for every occurrence in the protein with the most leucines returns rows that match to the last bit. The next section explains why.

## What this does not give you

The table is indexed by residue alone. Every leucine anywhere in the data looks up the same row, so a leucine in a hydrophobic core and one on a charged surface receive identical numbers. The pooled vector can change the prediction, but the lookup row stays blind to context. The window is six residues wide, so residues beyond it are absent rather than downweighted, and inside it the mean drops order.

The data path has a seam. The lab drops every character that is not one of the twenty standard residues. That can place two residues next to each other that were separated by an ambiguous letter in the record. Such a window is not a record of local adjacency. Also, a reviewed entry is a curated record, and a sequence can be inferred from genetic information rather than measured directly.

A learned table is not a substitution matrix either. BLOSUM62 is computed from residue pairs observed in aligned protein-family blocks, with clustering to reduce the weight of near-duplicate sequences. It scores twenty-by-twenty pairs, and a positive score means the pair occurs more often than background. The neighbour-prediction table is twenty rows of eight learned coordinates. Their evidence differs, so agreement between them is a comparison worth running, not a confirmation.

## What you can now do

- Follow a shape chain and say which array holds the target: ids into rows, rows into a pooled vector, the pooled vector into scores.
- Say what an embedding table is indexed by, and why an id is an address and not a measurement.
- Show that permuting the six neighbour ids leaves the pooled vector and the scores unchanged, and name what that costs the architecture.
- Compute a cosine similarity and a cosine distance by hand for two short vectors, and say what a zero vector does to the computation.
- Explain why a two-coordinate picture cannot settle which of two rows is nearer, and name what to report instead.

## What is still missing

- Order. The mean discards it. [Why whole sequences are hard](10-whole-sequences.md) compares three ways of reducing a sequence to a fixed width, and the attention chapter, [Attention](11-attention.md), weights positions against each other.
- Context-dependent rows. Two leucines still get one row. Chapter 11 gives each position a representation that depends on its neighbours.
- Evidence beyond one run. Held-out sequences and a split that respects protein families are needed before any claim about unseen proteins; [Evaluation](05-evaluation.md) and [Generalization](07-generalization.md) cover the habits.

## Questions

1. The id of leucine in the alphabet `ACDEFGHIKLMNPQRSTVWY` is 9 and the id of isoleucine is 7. Does that make them close? Say what the ids are and what they are not.
2. The six neighbour ids of a window are `[0, 9, 17, 2, 8, 5]`. Write them in the reverse order. What happens to the pooled vector, and to the twenty scores?
3. Compute the cosine similarity and the cosine distance of `[1, 0]` and `[2, 2]`. Then say what happens when one vector is `[0, 0]`.
4. A table of 20 rows and 8 columns feeds a head that maps 8 numbers to 20 scores, with biases. How many numbers does each part hold, and how many in all?
5. In the plate with vectors A, B and C, B looks nearer to A in two coordinates, but C is nearer in all eight. Which view should a claim about the model rest on, and why?
