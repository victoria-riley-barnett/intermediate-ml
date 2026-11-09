# What a fixed-size input can and cannot learn

The week replaces the shape of an example. Every example is a short string of symbols: exactly one `S`, exactly one `T`, and filler `x` elsewhere. The answer is `yes` when the `S` sits to the left of the `T`. `SxxT` and `TxxS` hold the same symbols in a different order, and the order is the whole of the answer.

Week 7 asked whether a model works on rows it has not seen, and its rows kept their shape. These do not: they differ in length, and the order inside them carries the label. The course met this problem once already. Genes differ in length by orders of magnitude, and a weighted sum needs a fixed number of inputs every time, so the gene read of week 6 became a tally of five-letter windows. That step bought a fixed width and paid for it with position, and what it paid is this week's subject.

The fixed width is not one model's accident. The number of inputs is settled when a network is built — the width of its first layer — and no weight in that layer says what a longer input would mean, so a longer input cannot be handed to it at all. Three readers are built on the task: symbol counts; the string in twelve slots, read as one row; the same slots read in order, with a summary carried forward.

The rest of the week turns on one sentence. A model's answer is a function of the numbers it receives, so two examples that arrive as the same numbers get the same answer. A representation that sends two examples to the same numbers is **many-to-one**, and whatever it dropped is gone before a weight is touched. The check needs no training: name a pair the question treats differently and ask whether the representation separates them. Reverse every training string and flip every answer: the counts are unchanged and the answers become their opposites. Counting cannot answer an order question, and it answers a presence question perfectly, even on strings longer than any it saw. A representation is never simply weak.

This chapter opens the pair that repairs order: it diagnoses, and the tenth chapter closes the pair by taking up the reader that carries a summary. The ninth develops the embedding this week borrows. What the week adds is padding, position, and five tests that separate one kind of failure from another.


## A padded batch puts one read in three different slot arrangements

[Padding decides which slot each symbol lands in](#fig-trace-padding-shifts) places one four-symbol read in a twelve-slot frame three ways: padded on the right, padded on the left, and shifted by one. The characters keep their order and their spacing — the `T` sits three slots after the `S` in every row — so the rows differ in one respect only, which slots the characters occupy. Under each character the plate prints the slot it landed in. A reader that indexes by position receives three different arrangements of one read.

{{figure trace-padding-shifts}}

Padding is what lets a batch be one array, and here the batch length is twelve. A pad is a symbol like any other: it goes through the same weights and occupies a slot the model can see, so how many pads a string carries and where they sit are facts a reader can use. The same string padded on the other side is a different input, and for a reader whose weights belong to slot numbers, as different as a different string. A mask, one flag per slot, separates a real symbol from a pad. The frame also truncates: a string longer than twelve slots loses its tail, and the dropped symbol can be the one the answer depends on, with no error raised.

The plate draws arrangement and nothing else: no row is marked correct, no score appears, and it makes no claim about failure. Whether a reader survives the arrangement is measured later.

## One set of weights applied at every step reads a list of any length

[A recurrent network](#fig-recurrent) unrolls one small cell over four steps. The same input weights and the same state weights appear at every cell, the state leaves each cell for the next, a zero state enters the first, and the output leaves the top of each step. The bracket under the row of cells says what the labels cannot: one set of weights, reused. No path bypasses a cell, so every symbol passes through the same update on its way to the answer.

{{figure recurrent}}

That reuse is the point of comparison. A flattened first layer gives every slot its own weights, so the weight reading slot 1 is not the weight reading slot 2, and the count of weights grows with the frame. A rule learned for one slot is not available at another, and a slot no training string filled is a slot whose weights never moved. Reuse is what stops the parameter count depending on the size of the input.

The plate is architecture, not evidence. It carries no score, no string and no task, and it says nothing about what the carried state keeps or loses. A fixed number of numbers standing in for a prefix of any length is a bottleneck, and what that bottleneck costs belongs to the tenth chapter.

## Right inside the trained slots, at chance outside them

[Right inside the frame, at chance outside it](#fig-compare-three-readers) is the week's measurement. Three readers of the same strings are scored on five tests that move one thing at a time: the training strings, new strings of the trained lengths, new strings longer than any training string, the same held-out strings padded on the left, and the same strings shifted one slot. Each cell is an average over repeated runs from different starting points, with the spread beside it.

{{figure compare-three-readers}}

The counting row confirms the argument that needed no training: place does not enter its numbers, and its last three cells repeat one value. The flattened row is the one to study. It is right on the two tests that use the lengths it trained on and lower on the two that move a marker into the high slots, which is what a reader indexing by slot should do when training reached only the low ones. Its longer-string cell is not partial credit — the plate splits it, and the split says the cell mixes a question the reader trained on with one it did not. The recurrent row is perfect on longer strings, because its weights do not depend on length, and it loses on both tests that move position. Two of its cells carry spreads nearly as wide as the distance from chance, so the runs disagree rather than agree on one rate: the symbols are identical in every run and the pads are the only thing that moved.

The three failures are of different kinds, and telling them apart is the week's result. The counting reader's failure is a limit of its representation, and the pair that shows it is `SxxT` beside `TxxS`. The flattened reader's failure is a limit of its frame. Training strings run from four to eight symbols padded on the right, so the four highest slots only ever held pads, and of the position pairs a twelve-slot read can use, twenty-eight were reached by training and thirty-eight were not. The unreached slots keep the values they started from. More training does not repair it: raising the training set from two hundred strings to four thousand moves the score by a few hundredths. What is missing is not data but an input that does not fix the length in advance. The recurrent reader's failure is neither of these. Its input carries order at any length, and a padding convention it never saw in training costs it most of its accuracy. One case needs a different representation; the other needs a convention fixed and a run repeated, which is why the wide spread matters more than the low average.

Position, not motion, is what the flattened reader cannot absorb. A one-slot shift is nearly free for it while left padding is not, and the symbols and their order are the same in both tests; the slots that break it are the ones training never filled. A repeated letter makes the same point with no padding involved: `hello` holds one letter twice, the letter after it differs each time, and a unit that sees only the current symbol returns the same numbers at both. Position has to come from somewhere, and where it comes from is what changes from one reader to the next.

## What you can now do

- Name a pair of examples the question treats differently and decide, without training, whether a representation separates them.
- Say why a counting representation cannot answer an order question at any amount of training, and which question it answers exactly.
- Read three arrangements of one read and say what each changes about the input.
- Predict, from the slots training reached, where a slot-indexing reader holds and where it drops to chance.
- Tell a limit of the input apart from a convention never tested, using the spread across runs to say which is which.

## What this does not give you

The symbols are invented. Nothing measured here says anything about genes, patient records or sentences, and no claim is made about a real long-range dependence: the task holds one relation between two markers, so the coverage counts belong to this generator and these lengths. The recurrence is handed over rather than built, and its measurements say what one training convention cost it, not that a recurrence handles long dependence. The repair itself is not in this chapter.

## Sources

None. Every figure in this chapter is derived from the delivered weeks and the course's own runs.

## Questions

No verified questions for this week: no question rubric exists, and none are invented here.


---

← [Does the model work on new data?](07-generalization.md)  ·  [Giving Tokens Meaningful Numbers](09-embeddings.md) →
