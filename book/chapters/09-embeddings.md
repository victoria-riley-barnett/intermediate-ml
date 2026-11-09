# Giving tokens meaningful numbers

Week 8's sequence reader already used an embedding: `nn.Embedding` gave each symbol eight learned numbers. It then placed the twelve slot vectors side by side and gave every slot its own downstream weight, so the padding decided which weights read which symbols. A held-out padding change exposed that dependence; the training loss did not. The table was not the part that failed. The combination was.

This week keeps the table and changes the combination. The running example is a protein window: the residues either side of one position are looked up as rows of eight numbers, averaged into one vector, and a linear head turns that vector into scores over the twenty residue types. The residue in the middle is the target, never among the inputs. The invented window `A L V I D K G` carries the arithmetic; the lab builds the same pairs from reviewed UniProt records.

Three things move together: the representation, the task, and what the architecture keeps, since the mean keeps which neighbours were present and drops where each one sat.

This chapter is the first half of a pair. Averaging is order-blind — permuting the six ids leaves the pooled vector and the scores unchanged — and the model that repairs that blindness arrives two weeks later. Nothing here fixes it. The training machinery does not move: the module, the trainer and the cross-entropy measure the course already built hold a different architecture without alteration.


## An embedding lookup selects one row of a learnable table

[An embedding lookup](#fig-embedding) draws the operation alone, with no averaging and no head. An integer id tensor sits on the left; one cell is filled in accent, and an arrow carries it into the table row bearing the same label, which leaves as the front card of a stack labelled by the id shape and the row width. The unselected rows stay in the table.

{{figure embedding}}

The id is an address, not a measurement. It comes from a fixed alphabet and says nothing about the residue — not its mass, not its charge, not its size — so adjacent ids do not make similar residues. The table stores one row of adjustable numbers per residue type, returned unchanged wherever that residue occurs, and the lookup is a one-hot row multiplied by the table with the zeros skipped.

What the plate does not show is where those numbers came from. The initial rows are random, and closeness before training has no established meaning. Charge or mass could be an input feature elsewhere; this table receives ids and gradient, and whatever structure it holds is put there by the prediction task.

## The target residue is never in its own context, and the mean forgets neighbour order

[The target residue is never in its own context](#fig-trace-context-window) runs one prediction end to end on the week's invented window. The centre slot is marked held out and is never looked up; the neighbours on both sides are looked up, pooled column by column into one row, and a linear head turns that row into one score per candidate residue.

{{figure trace-context-window}}

The claim has two halves. The target's row does not enter the input: if it did, the model would be handed the answer and the loss would measure nothing. And the pooled row is the same for any arrangement of the six neighbours, because pooling sums each column and divides by the count, and addition has no order.

That second half is where this architecture parts company with week 8's flattened reader. Flattening preserved which slot supplied which vector and paid for it with a first layer tied to a fixed slot count. The mean applies one function to every neighbour and works at any window length; the price is that `A L V D K G` and `G K D V L A` give one context vector. Order is not compressed, it is discarded: the model is told what is nearby, not what sits next to what.

The plate's rows are chosen so the arithmetic stays readable, not produced by training, and one pooled row is a prediction about one position, not a description of a residue. The trained version is the lab's, and its loss curve says more: the loss falls, then flattens well above zero. That floor belongs to the task. Six neighbours do not determine the residue between them, and the best output available is a distribution over the plausible ones.

## Cosine similarity compares direction and cancels length

Once the table is trained, the question is what it holds, which means comparing rows. [Cosine similarity](#fig-eq-cosine-similarity) shows why the comparison ignores length. Entries are paired into products, the products added into a dot product, each vector measured on its own, and the dot product divided by both lengths.

{{figure eq-cosine-similarity}}

Dividing by one length and then the other cancels whichever vector was longer, so what survives is the angle. Cosine distance is one minus that score, reading zero for the same direction and two for opposite directions. The plate's vectors are two integers each so the arithmetic can be followed by hand; eight-coordinate rows take the same four steps. A zero vector is the exception: no direction, and a score undefined rather than large.

What the plate does not settle is what a short distance means. The score is a property of a pair of rows; whether it corresponds to anything chemical is a separate question about the task, the data and the training signal. The lab looks for a pattern rather than a pair — whether a hydrophobic residue's neighbours are also hydrophobic — and the lists shift between runs.

## Similarity over two coordinates can disagree with similarity over all eight

Eight coordinates per row are more than a reader can look at, so the lab projects the twenty rows onto two directions and colours them by four classes. [Similarity over two coordinates can disagree with similarity over all eight](#fig-plot-similarity) prices that projection. Both panels show the same three vectors: the left plots the first two coordinates at true angles, and there B points nearer to A than C does; the right lays both cosine values on one axis, and over all eight the ranking reverses.

{{figure plot-similarity}}

Read the reversal as a question about which coordinate does the work. B's advantage in the left panel comes entirely from coordinates that panel prints; its direction in the full space is set by a coordinate it cannot show. C's value is identical in both views because its remaining coordinates are zero. An ordering by picture is a property of the picture.

A projected map therefore does not rank rows, and a claim about which residues are close belongs in the full space. Even there, a nearest-neighbour list belongs to a run: the training data, the seed and a comparison across runs go beside it. The lab centres each column first, so the picture is about how rows differ, not a shared offset, and the decomposition is ambiguous up to sign and rotation, so a second run can show the arrangement mirrored. The axes carry no units.

What this plate does not show is a trained embedding. Its three vectors are constructed, not the result of any fit, and the disagreement is arranged for legibility. Nor can the lab's map settle what it invites: whether the four colours gather is one table from one run, and a low training loss beside a tidy picture establishes neither prediction on untrained sequences nor anything biological.

## What you can now do

- Follow a shape chain and say which array holds the target: ids into rows, rows into a pooled vector, the pooled vector into scores.
- Say what an embedding table is indexed by, and why an id is an address rather than a measurement.
- Show that permuting the six neighbour ids leaves the pooled vector and the scores unchanged, and name what that costs the architecture.
- Compute a cosine similarity and a cosine distance by hand for two short vectors, and say what a zero vector does to the computation.
- Explain why a two-coordinate picture cannot settle which of two rows is nearer, and name what to report instead.

## What this does not give you

The table is indexed by residue alone. Every leucine anywhere in the data looks up the same row, so a leucine in a hydrophobic core and one on a charged surface receive identical numbers; the lab checks this by looking the residue up once per occurrence and finding the rows equal to the last bit. The pooled vector can change the prediction while the lookup row stays context-free. The window is six residues wide, so residues beyond it are absent rather than downweighted, and inside it the mean drops order.

The data path has a seam. Dropping every character that is not one of the twenty standard residues can place two residues next to each other that were separated by an ambiguous letter in the record; such a window is not a record of local adjacency. A reviewed entry is a curated record, and a sequence can be inferred from genetic information rather than measured directly.

A learned table is also not a substitution matrix. BLOSUM62 is computed from residue pairs observed in aligned protein-family blocks, with clustering to reduce the weight of near-duplicates, and scores twenty-by-twenty pairs; a positive score means a pair occurs more often than background. The neighbour-prediction table is twenty rows of eight learned coordinates. Their evidence differs, so agreement is a comparison worth running, not a confirmation.

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

There are no verified questions for this week.


---

← [What a fixed-size input can and cannot learn](08-fixed-size-inputs.md)  ·  [Why Whole Sequences Are Hard](10-whole-sequences.md) →
