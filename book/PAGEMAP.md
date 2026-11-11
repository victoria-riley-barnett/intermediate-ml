# Page map

Every page in the book, what it is, where it sits, and exactly what to cut it from.
Pages live in `book/pages/<slug>.md`. Chapters (`book/chapters/<stem>.toml`) list pages
in reading order; a page may sit in more than one chapter. See `CUTTING.md` for how
a page is cut.

## Source shorthand

| short | file |
|---|---|
| `Lnn § H` | `411/weeks/weeknn_*/lecture.md`, the section under heading H (and its sub-sections) |
| `Bnn § H` | `411/weeks/weeknn_*/lab.md`, heading H |
| `Inn/f § H` | `411/weeks/weeknn_*/instructor/f`, heading H (only where it explains, not plans) |
| `O03 § H` | `411/weeks/week03_backpropagation/week03 outline.md` |
| `NB03` | `intermediate-ml/03_backprop_lecture.ipynb` (markdown cells only) |
| `D:slug` | the plate's `<desc>` in `book/figures/slug.html` |
| `S:slug` | `411/admin/diagrams/specs/slug.md` |
| `C:file § H` | `411/chapters/file.md`: last resort, only where nothing above covers it |

All course paths are under `/Users/v/projects/teaching/`. Read-only.

Kinds: **concept**, **equation** (built on an `eq-*` plate), **architecture**, **experiment**
(a measured comparison), **code** (one runnable script in `book/code/`).
Frame: **R** representation, **T** transformation, **E** evidence.

A page marked *stub* has too little in her material; it gets one honest line and its plate.

## Pages

### Cluster A · weeks 00–01 (chapters 0, 1)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `learned-model` | concept | R | — | 0 | L00 § Why reach for a learned model at all; L00 § …continued; L00 § A rule you genuinely cannot write down |
| `data-model-evaluate` | concept | E | — | 0 | L00 § Data → Model → Evaluate; L00 § Data: a spam filter; L00 § Model: what can it even express?; L00 § Evaluate: did it work, for whom? |
| `program-state` | concept | R | trace-state | 0 | B00 § The stack; D:trace-state; S:trace-state |
| `class-and-object` | concept | R | code-object | 0 | L00 § Classes: bundling data with what's allowed to touch it; L00 § The same shape, everywhere; L00 § Reading the dot; B00 § Models are objects; D:code-object |
| `what-ml-is` | concept | R | — | 1 | L01 § What machine learning is; L01 § Data, a model, and a measure of wrong; L01 § What machine learning offers that statistics does not; L01 § What machine learning does not give you |
| `form-of-a-relationship` | concept | T | — | 1 | L01 § Choosing the form of the relationship; L01 § What each additional term costs; L01 § Machine learning and deep learning |
| `dot-product` | equation | T | eq-dot-product | 1, 11 | B00 § The dot product: multiply matching slots, then add; B01 § 4. Weighted sums; L11 § Similarity as a dot product; D:eq-dot-product |
| `matrix-multiply` | equation | T | eq-matrix-multiply | 1 | B00 § The grid; B01 § 6. What a matrix does; D:eq-matrix-multiply |
| `tensor-shape` | concept | R | trace-shape | 1 | B01 § 3. Columns into tensors; B01 § 5. Shape drills; B01 § Broadcasting; B01 § 8. Rank, and reading a pipeline by its shapes; D:trace-shape |
| `one-hot-encoding` | concept | R | — | 1 | B01 § 7. Encoding a category |
| `standardization` | equation | R | eq-mean-variance | 1 | D:eq-mean-variance; S:… (none); B02 § The same loop on real measurements (last paragraph, on rescaling) · *thin: may be short* |
| `code-objects` | code | — | — | 0 | `book/code/00-objects/state.py` |
| `code-line-and-shapes` | code | — | — | 1 | `book/code/01-linear-analysis/line_and_shapes.py` |

### Cluster B · week 02 (chapter 2)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `loss` | concept | E | — | 2, 5 | B02 § What the loss measures (first two paragraphs); B02 § The loss as a function of the weight; L05 § Every learning system needs three things · **exemplar** |
| `mean-squared-error` | equation | E | eq-mse | 2 | B02 § What the loss measures (the squaring paragraphs); D:eq-mse; S:eq-mse |
| `derivative` | concept | T | — | 2 | B02 § Finding the direction |
| `gradient-descent` | equation | T | gradient-descent | 2 | B02 § One step, and then many (the update rule, the minus sign); D:gradient-descent |
| `training-loop` | concept | T | loop-gradient-descent, code-gd | 2, 4 | B02 § One step, and then many (backward, no_grad, zero_, converging); B04 § The whole training loop, assembled; L05 § The forward pass, the loss, and the update |
| `learning-rate` | experiment | T | — (multiple `learning-rates`) | 2 | B02 § The learning rate; L05 § The learning rate |
| `gradient-accumulation` | experiment | T | — (multiple `cleared-grad`) | 2 | B02 § One step, and then many (the w.grad.zero_() paragraphs and Aside) |
| `mean-absolute-error` | experiment | E | — (multiple `mean-median`) | 2 | B02 § Choosing a loss; B02 § Which value does each loss choose?; B02 § Which one should you actually use? |
| `feature-scale` | concept | R | — | 2 | B02 § The same loop on real measurements |
| `code-one-step`, `code-loop`, `code-mean-median` | code | — | — | 2 | the three scripts in `book/code/02-autodifferentiation/` |

### Cluster C · week 03 (chapter 3) · thin sources

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `chain-rule` | equation | T | eq-chain-rule | 3 | O03 (sections on the chain rule); NB03; D:eq-chain-rule; S:eq-chain-rule |
| `computation-graph` | concept | T | trace-backward-graph | 3 | O03; NB03 (recording, walking back); D:trace-backward-graph; S:trace-backward-graph |
| `weight-gradient` | equation | T | eq-weight-gradient | 2, 3 | D:eq-weight-gradient; B02 § The same loop on real measurements (the "two hundred times" paragraph); NB03 |
| `backward-cost` | concept | T | budget-backward-cost | 3 | D:budget-backward-cost; O03 · *may be a stub* |
| `code-trace` | code | — | — | 3 | `book/code/03-backpropagation/trace.py` |

### Cluster D · week 04 (chapter 4)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `neuron` | concept | T | — | 4 | B04 § Neurons; L05 § A neuron is that line, plus a bend |
| `layer` | concept | T | feedforward | 4 | B04 § Neural Networks; B04 § A layer is one matrix multiply |
| `width-and-depth` | concept | T | — | 4 | B04 § Width and depth buy different things |
| `activation` | concept | T | — | 4 | B04 § Activations, in detail |
| `three-representations` | experiment | R | compare-linear-hidden | 4 | B04 § One problem, three representations (and its four sub-sections); B04 § Why, in general, is it important…; D:compare-linear-hidden |
| `nn-module` | concept | T | — | 4 | B04 § Our new tool: nn.Module; B04 § First/Second/Third rung |
| `dataset-and-dataloader` | concept | R | — | 4, 5 | B04 § Fourth rung: Dataset and DataLoader; B05 § The DataLoader: 8 batches of 32 rows; L05 § Why we do it in batches |
| `optimizer` | concept | T | — | 4 | B04 § Fifth rung: optimizers, from GD to SGD to Adam; B05 § The optimizer |
| `code-xor` | code | — | — | 4 | `book/code/04-neural-networks/xor.py` |

### Cluster E · week 05 (chapter 5)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `three-things` | concept | — | — | 5 | L05 § Every learning system needs three things; L05 § What is new is not encoding |
| `parameter` | concept | R | — | 5 | L05 § A parameter is a number the model learns; L05 § Counting what it has to learn |
| `evaluation-and-analysis` | concept | E | — | 5 | L05 § The word evaluation means two different things; L05 § So there is a third word, and a picture; L05 § Analysis has a small, cheap toolkit |
| `data-splits` | concept | E | split-train-only | 1, 5, 7 | L05 § Three parts of your data; L05 § The rule in practice; L05 § When rows are not independent; L07 § The split gives each set one job; D:split-train-only |
| `confusion-counts` | equation | E | metric-confusion | 5 | L05 § The four counts; B05 § The confusion matrix: TP, FP, FN, TN; D:metric-confusion |
| `accuracy-precision-recall` | concept | E | — | 5 | L05 § The three metrics, in words; B05 § Context: the four counts, and the three metrics built from them |
| `baseline` | experiment | E | metric-prevalence, compare-baseline-first | 5 | L05 § Accuracy can be high while the model is useless; L05 § Every number needs a baseline; B05 § 2. The baseline; D:metric-prevalence |
| `decision-threshold` | experiment | E | metric-threshold | 5 | L05 § Which error is expensive; B05 § From a probability to a decision; B05 § 5. The cutoff, and which error you would rather make; D:metric-threshold |
| `the-unexamined-column` | experiment | E | — | 5 | L05 § What no metric can see; L05 § The finished model, as reported; L05 § The four counts, as printed; L05 § The column nobody examined; L05 § What that one column was carrying; L05 § The two lenses, side by side |
| `code-metrics` | code | — | — | 5 | `book/code/05-evaluation/metrics.py` |

### Cluster F · week 06 (chapter 6)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `gene-family-data` | concept | R | — | 6, 7 | L06 § The gene family data; B06 § Chimp and dog |
| `class-label` | concept | R | — | 6 | L06 § Seven families are not seven amounts; L06 § One output, and a different loss |
| `k-mer-counts` | concept | R | trace-kmer-gene | 6, 8 | L06 § From a string to a fixed-length vector; B06 § Turning a sequence into a fixed-length vector: k-mer counts; D:trace-kmer-gene |
| `logits` | concept | T | — | 6 | L06 § A column of weights for every family; L06 § With a batch, the shapes tell the whole story; L06 § The logits are scores, not probabilities |
| `argmax` | concept | E | — | 6 | L06 § The decision is an argmax; L06 § Argmax is a staircase, so training cannot read it |
| `softmax` | equation | T | eq-softmax | 6, 11 | L06 § A distribution over families; L06 § Exponentiate, then divide by the total; L06 § The running example, as a distribution; L06 § Large scores, and how not to blow up; L06 § The distribution is not a promise; D:eq-softmax · **exemplar** |
| `cross-entropy` | equation | E | eq-cross-entropy | 6, 9 | L06 § Two distributions, same classes; L06 § One term survives, so the loss is one bar; L06 § The loss wants the mass on the right family; L06 § A mismatch between distributions…; D:eq-cross-entropy |
| `softmax-gradient` | concept | T | — | 6 | L06 § The gradient is the distribution minus the truth |
| `decision-and-distribution` | concept | E | — | 6 | L06 § The same decision, two different distributions; L06 § What the distribution does and does not say |
| `code-kmer-softmax` | code | — | — | 6 | `book/code/06-multiclass/kmer_softmax.py` |

### Cluster G · weeks 07–08 (chapters 7, 8)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `overfitting` | concept | E | — | 7 | L07 § A model can fit without learning the pattern |
| `learning-curves` | experiment | E | plot-curves | 7 | L07 § Learning curves show the useful part of training; B07 § 3 · Learning curves; D:plot-curves |
| `homology-leakage` | experiment | E | split-homology-leakage | 7 | L07 § What “new” means; B07 § 6 · What counts as new; D:split-homology-leakage |
| `dropout-and-seeds` | experiment | E | compare-regularizers | 7 | L07 § Reducing overfitting, briefly; B07 § 4 · Dropout and seeds; D:compare-regularizers |
| `order-blind-counts` | concept | R | — | 8 | L08 § What the input decides; L08 § The pair one representation cannot separate; L08 § What the k-mer tally keeps, and what it costs · **chapter 8 exemplar** |
| `three-readers` | experiment | E | compare-three-readers | 8 | L08 § Three ways to turn a string into numbers; L08 § Reading a list; L08 § Five tests for a model that reads strings; L08 § Why the flattened model scores 0.78 on longer strings; D:compare-three-readers · **exemplar** |
| `padding` | concept | R | trace-padding-shifts | 8 | L08 § Padding gives a batch one shape; D:trace-padding-shifts · **chapter 8 exemplar** |
| `position` | concept | R | — | 8 | L08 § Position is part of the input; L08 § Becoming sequence aware · **chapter 8 exemplar** |
| `recurrent-network` | architecture | T | recurrent | 8, ⌂ | L08 § Reading a list (the GRU paragraphs); D:recurrent · **chapter 8 exemplar** |
| `lightning` | concept | T | — | 8, 9 | L08 § The training loop moves into Lightning; L09 § The architecture inside Lightning |
| `code-split-dropout`, `code-same-counts` | code | — | — | 7, 8 | the scripts in `book/code/07-generalization/`, `book/code/08-fixed-size-inputs/` |

### Cluster H · weeks 09–10 (chapters 9, 10)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `embedding` | architecture | R | embedding | 9, 8 | L09 § What stays the same, and what changes; L09 § A lookup table with learnable rows; L08 § The eight numbers per symbol are an embedding; D:embedding |
| `context-window` | concept | R | trace-context-window | 9 | L09 § A protein supplies its own missing-letter task (and sub-sections); B09 § 2. Turn positions into training pairs; D:trace-context-window |
| `mean-pooling` | concept | T | — | 9, 10 | L09 § The six vectors become a context; L10 § Average the rows; B10 § 3. Model 1: average the rows |
| `cosine-similarity` | equation | E | eq-cosine-similarity | 9 | B09 § 5. Read the table; D:eq-cosine-similarity; S:eq-cosine-similarity |
| `similarity-map` | experiment | E | plot-similarity | 9 | B09 § 6. Draw the table; B09 § 7. The catch; L09 § What would count as evidence?; D:plot-similarity |
| `blosum` | concept | E | — | 9 | L09 § A related biological reference: BLOSUM |
| `one-row-per-residue` | concept | R | — | 9 | L09 § What the table cannot see |
| `fixed-width` | concept | R | — | 10 | L10 § The shape of the object; B10 § 2. One set of helpers for all three models |
| `flatten` | concept | T | — | 10 | L10 § Flatten; B10 § 4. Model 2: flatten |
| `sliding-window` | equation | T | eq-conv-window | 10, ⌂ | L10 § Slide a window; B10 § 5. Model 3: slide a window; D:eq-conv-window |
| `three-reductions` | experiment | E | compare-three-reductions | 10 | L10 § A controlled toy; B10 § 1. A task that is only about order; B10 § 6. What each model can and cannot do; B10 § 7. What the three share; D:compare-three-reductions |
| `long-range-dependencies` | concept | R | — | 10 | L10 § Where biology does this |
| `code-lookup-and-mean`, `code-reductions` | code | — | — | 9, 10 | the scripts in `book/code/09-embeddings/`, `book/code/10-whole-sequences/` |

### Cluster I · weeks 11–12 (chapters 11, 12)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `attention` | concept | T | — | 11 | L11 § A weighted average over positions; L11 § The whole operation; L11 § What this repairs |
| `motif-order-task` | experiment | R | — | 11, 12 | B11 § 1. A task with two motifs; L12 § Three things attention cannot do alone (the task paragraph) |
| `queries-keys-values` | architecture | T | attention-worked | 11, ⌂ | L11 § Three roles per position; B11 § 3. Step two: queries, keys and values; B12 § 2 · Queries, keys, and values; D:attention-worked |
| `scaled-dot-product` | equation | T | eq-scaled-dot-product | 11 | L11 § Why the scores are divided by the square root of the width; B11 § 4. Step 3a; B12 § 4 · Scale, then turn scores into shares; D:eq-scaled-dot-product |
| `attention-heads` | concept | T | — | 11 | L11 § Several comparisons at once; B11 § 5. Step 3b: several heads |
| `positional-vectors` | concept | R | — | 11, 12 | L11 § Order; B11 § 6. Step 3c: position |
| `attention-cost` | concept | T | budget-t2 | 11 | D:budget-t2; S:budget-t2 · *may be a stub* |
| `attention-mask` | concept | T | arch-mask | 11 | D:arch-mask; S:arch-mask · *may be a stub* |
| `residual-connection` | equation | T | eq-residual | 12 | L12 § Three things attention cannot do alone (the depth paragraph); L12 § The block, and the order inside it; D:eq-residual; S:eq-residual |
| `layer-norm` | equation | T | eq-layernorm | 12 | L12 § The block, and the order inside it (normalisation); D:eq-layernorm; S:eq-layernorm |
| `encoder-block` | architecture | T | encoder-block | 12, ⌂ | L12 § The block, and the order inside it; L12 § Why the shapes are the point; D:encoder-block |
| `attention-map-and-ablation` | experiment | E | — | 12 | L12 § The capstone; L12 § Reading the map; L12 § What the four questions came to; B11 § 7. Reading the map |
| `code-one-head`, `code-layernorm-residual` | code | — | — | 11, 12 | the scripts in `book/code/11-attention/`, `book/code/12-encoder/` |

### Cluster J · the architectures timeline (opening chapter)

| slug | kind | frame | plates | chapters | cut from |
|---|---|---|---|---|---|
| `lineage-1943-1997` | architecture | — | lineage-a-1943-1997 | ⌂ | D:lineage-a-1943-1997; C:00-architectures (the 1943–1997 rows) |
| `the-quiet-years` | architecture | — | quiet-years | ⌂ | D:quiet-years; C:00-architectures |
| `lineage-2012-2022` | architecture | — | lineage-b-2012-2022 | ⌂ | D:lineage-b-2012-2022; C:00-architectures |
| `feedforward-network` | architecture | T | feedforward | ⌂, 4 | D:feedforward; B04 § Neural Networks; C:00-architectures |
| `convolutional-network` | architecture | T | convolutional | ⌂, 10 | D:convolutional; L10 § Slide a window; C:00-architectures |
| `autoencoder` | architecture | T | autoencoder | ⌂ | D:autoencoder · *stub: no course text* |

Not placed: `architecture-day` (an event composite of the plates above) and `code-provenance`
(final-project material, removed from the book).

## Chapters

Order of pages within each chapter. Shared pages appear in full in each chapter that lists them.

| chapter | pages, in order |
|---|---|
| ⌂ architectures | lineage-1943-1997, the-quiet-years, lineage-2012-2022, feedforward-network, convolutional-network, sliding-window, recurrent-network, autoencoder, queries-keys-values, encoder-block |
| 0 objects | learned-model, data-model-evaluate, program-state, class-and-object, code-objects |
| 1 linear-analysis | what-ml-is, form-of-a-relationship, data-splits, dot-product, matrix-multiply, tensor-shape, one-hot-encoding, standardization, code-line-and-shapes |
| 2 autodifferentiation | loss, mean-squared-error, derivative, gradient-descent, training-loop, gradient-accumulation, learning-rate, mean-absolute-error, feature-scale, weight-gradient, code-one-step, code-loop, code-mean-median |
| 3 backpropagation | chain-rule, computation-graph, weight-gradient, backward-cost, code-trace |
| 4 neural-networks | neuron, layer, width-and-depth, activation, feedforward-network, three-representations, nn-module, dataset-and-dataloader, optimizer, training-loop, code-xor |
| 5 evaluation | three-things, parameter, evaluation-and-analysis, data-splits, confusion-counts, accuracy-precision-recall, baseline, decision-threshold, the-unexamined-column, code-metrics |
| 6 multiclass | gene-family-data, class-label, k-mer-counts, logits, argmax, softmax, cross-entropy, softmax-gradient, decision-and-distribution, code-kmer-softmax |
| 7 generalization | overfitting, data-splits, learning-curves, homology-leakage, dropout-and-seeds, code-split-dropout |
| 8 fixed-size-inputs | order-blind-counts, k-mer-counts, three-readers, embedding, recurrent-network, padding, position, lightning, code-same-counts |
| 9 embeddings | embedding, context-window, mean-pooling, cross-entropy, cosine-similarity, similarity-map, blosum, one-row-per-residue, code-lookup-and-mean |
| 10 whole-sequences | fixed-width, mean-pooling, flatten, sliding-window, convolutional-network, three-reductions, long-range-dependencies, code-reductions |
| 11 attention | motif-order-task, attention, dot-product, queries-keys-values, scaled-dot-product, softmax, attention-heads, positional-vectors, attention-cost, attention-mask, code-one-head |
| 12 encoder | motif-order-task, residual-connection, layer-norm, encoder-block, positional-vectors, attention-map-and-ablation, code-layernorm-residual |

A page shared by several chapters is transcluded whole in each. Chapter 8's exemplar pages
(order-blind-counts, three-readers, padding, position, recurrent-network) and `loss`
and `softmax` are cut by hand before the fan-out.
