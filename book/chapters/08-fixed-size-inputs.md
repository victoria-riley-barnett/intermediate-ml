# What a fixed-size input can and cannot learn

This week changes the shape of an example. Every example is a short string of symbols. It holds exactly one `S`, exactly one `T`, and the letter `x` everywhere else. The answer is `yes` when the `S` sits to the left of the `T`. `SxxT` and `TxxS` contain the same symbols in a different order, and the order is the whole of the answer.

Week 7 asked whether a model works on rows it has not seen, and those rows all kept the same shape. These do not. The strings differ in length, and the order inside them carries the label. The course has met this problem once already. Genes differ in length by orders of magnitude, and a weighted sum needs the same number of inputs every time, so the gene read of week 6 became a tally of five-letter windows. That step bought a fixed width and paid for it with position. What it paid is this chapter's subject.

The fixed width is not one model's accident. The number of inputs is decided when a network is built: it is the width of the first layer. No weight in that layer says what a longer input would mean, so a longer input cannot be handed to it at all. We build three readers of the same strings. The first counts symbols. The second puts the string into twelve slots and reads the slots as one row. The third reads the same slots in order and carries a summary forward as it goes.

The chapter turns on one sentence. A model's answer is a function of the numbers it receives, so two examples that arrive as the same numbers get the same answer. A representation that sends two examples to the same numbers is called **many-to-one**, and whatever it dropped is gone before any weight is trained. You can check for this without training anything. Name a pair of examples that the question treats differently, and ask whether the representation tells them apart. If you reverse every training string and flip every answer, the counts do not change but the answers become their opposites. Counting cannot answer an order question. It answers a presence question perfectly, even on strings longer than any it saw. A representation is never simply weak; it is weak for some questions and exact for others.

This chapter shows the failure and tells the kinds apart. It does not repair it. The repairs, and the one list that sorts them, belong to [the chapter on whole sequences](10-whole-sequences.md), and [the chapter on embeddings](09-embeddings.md) develops the numbers-for-symbols step that this chapter borrows. What we add here is padding, position, and five tests that separate one kind of failure from another.

> **On the timeline.** This chapter inherits the 1997 row: recurrence and the LSTM. That row changed the input, not the block. A network could now read a list of any length by applying one small cell at each step and carrying a state forward. Where the rows came from is in [the architectures chapter](architectures.md).

## A padded batch puts one read in three different slot arrangements

The first thing to settle is how strings become numbers. A character tokenizer gives each distinct symbol an integer id, with id 0 reserved for the pad. After that, strings of different lengths are made equal by padding: extra pad symbols fill the string out to a fixed length, here twelve, so that a whole batch can be stored as one rectangular array.

The plate below places one four-symbol read in a twelve-slot frame three ways. It is padded on the right, padded on the left, and shifted by one slot. The characters keep their order and their spacing, and the `T` sits three slots after the `S` in every row. The rows differ in one respect only: which slots the characters occupy. Under each character the plate prints the slot it landed in. A reader whose weights are tied to slot numbers receives three different inputs from one read.

{{figure trace-padding-shifts}}

A pad is a symbol like any other. It goes through the same weights and occupies a slot the model can see, so how many pads a string carries, and where they sit, are facts a reader can use. The same string padded on the other side is a different input, and for a reader whose weights belong to slot numbers it is as different as a different string. A **mask**, one flag per slot, separates a real symbol from a pad. The frame also truncates. A string longer than twelve slots loses its tail, and the lost symbol can be the one the answer depends on. No error is raised when this happens.

The plate shows arrangement and nothing else. No row is marked correct and no score appears. Whether a reader survives the arrangement is measured further down.

## One set of weights applied at every step reads a list of any length

The plate below unrolls one small cell over four steps. This is a **recurrent network**. The same input weights and the same state weights appear in every cell. The **state**, a short list of numbers, leaves each cell for the next one, and a zero state enters the first. The output leaves the top of each step. The bracket under the row of cells carries the point the labels cannot: one set of weights, reused. No path skips a cell, so every symbol passes through the same update on its way to the answer.

{{figure recurrent}}

That reuse is what we compare against. A flattened first layer gives every slot its own weights. The weight that reads slot 1 is not the weight that reads slot 2, and the number of weights grows with the frame. A rule learned for one slot is not available at another, and a slot that no training string filled is a slot whose weights never moved. In our runs the flattened first layer holds 6,208 numbers, which is 512 for each of the twelve slots. The recurrent reader's shared first layer holds 576, and that count does not depend on how long the string is.

The plate is architecture, not evidence. It carries no score, no string and no task. It also says nothing about what the carried state keeps or loses. A fixed number of numbers standing in for a prefix of any length is a bottleneck, and what that bottleneck costs is for the chapter on whole sequences.

## Right inside the trained slots, at chance outside them

The plate below is the measurement of the week. Three readers of the same strings are scored on five tests, and each test moves one thing at a time. The tests are the training strings, new strings of the trained lengths, new strings longer than any training string, the same held-out strings padded on the left, and the same strings shifted by one slot. Training strings are four to eight symbols long, padded on the right. The longer strings are nine to twelve symbols. Each cell is an average over ten runs from different starting points, with the spread beside it. A score of 0.50 is guessing.

{{figure compare-three-readers}}

Start with the counting row. It confirms the argument that needed no training. Place does not enter its numbers, so its last three cells repeat one value, and every held-out cell sits near 0.50. Next is the flattened row, which is the one to study. It scores 1.00 on the two tests that use the lengths it trained on. It scores 0.78 on longer strings, 0.36 when the same strings are padded on the left, and 0.95 when they are shifted by one slot. The recurrent row scores 1.00 on longer strings, because its weights do not depend on length, but it drops to 0.76 and 0.91 on the two tests that move position. Those two cells carry spreads of 0.21 and 0.18, nearly as wide as the distance down to chance. The runs disagree with each other instead of agreeing on a lower rate. In every run the symbols are identical, and the pads are the only thing that moved.

The three failures are of different kinds, and telling them apart is the result of the week.

**The counting reader fails because of its representation.** The pair that shows it is `SxxT` beside `TxxS`. The code in the next section makes that pair concrete.

**The flattened reader fails because of its frame.** Training strings are four to eight symbols long and padded on the right, so the four highest slots only ever held pads. A twelve-slot read has 66 possible pairs of slots, and the training strings reached 28 of them. The other 38 were never reached, and the weights for them keep the values they started from. More data does not repair this. In a sweep over the training-set size, the longer-string score goes from 0.71 with 200 strings to 0.75 with 500, 0.77 with 1,000, and 0.79 with 4,000. What is missing is not data but an input that does not fix its length in advance.

The 0.78 on longer strings is not partial credit. It is an average over two different questions. About 57% of the longer strings keep both markers inside slots 1 to 8, and the reader answers those at 1.00. The other 43% put a marker into slots 9 to 12, where training never reached, and the reader answers those at 0.48, which is guessing. Of the two tests that move markers into the high slots for at least one string in five, left padding is the harsher: 91% of its strings do it, against 43% for the longer strings. A one-slot shift moves a marker out of the low slots for only 6% of strings, which is why the flattened reader barely notices it.

**The recurrent reader fails for neither of those reasons.** Its input carries order at any length. What hurts it is a padding convention it never saw in training. One case needs a different representation. The other needs a convention fixed and a run repeated, which is why the wide spread matters more than the low average.

Position, not motion, is what the flattened reader cannot absorb. A shift by one slot is nearly free for it, while left padding is not, and the symbols and their order are the same in both tests. The slots that break it are the ones training never filled. A repeated letter makes a related point with no padding at all. The word `hello` holds one letter twice, and the letter after it differs each time. A unit that sees only the current symbol returns the same numbers at both places, so position has to come from somewhere else. Where it comes from is what changes from one reader to the next.

## By hand, in pure Python

The code below goes from a string to ids, pads it, and counts its symbols. The tokenizer is adapted from SmolML's `smolml/preprocessing/tokenizers/tokenizers.py` (MIT), which reserves id 0 for padding in the same way: [source](https://github.com/rodmarkun/SmolML/blob/main/smolml/preprocessing/tokenizers/tokenizers.py). The padding and counting functions are ours. The file is `book/code/08-fixed-size-inputs/same_counts.py`.

```python
class CharacterTokenizer:
    def fit(self, corpus):
        self.token_to_id = {"<pad>": 0}              # id 0 is reserved for padding
        for ch in sorted(set(corpus)):
            self.token_to_id[ch] = len(self.token_to_id)
        return self
    def transform(self, text):
        return [self.token_to_id[ch] for ch in text]

def pad(ids, t_max=12, side="right"):
    ids = ids[:t_max]                                # truncation: the tail is lost silently
    fill = [0] * (t_max - len(ids))
    return ids + fill if side == "right" else fill + ids

def counts(ids):                                     # many-to-one: position is dropped
    tally = {}
    for i in ids:
        tally[i] = tally.get(i, 0) + 1
    return tally

tok = CharacterTokenizer().fit("STx")
a, b = tok.transform("SxxT"), tok.transform("TxxS")
print("ids:", tok.token_to_id)
print("SxxT ->", a, " TxxS ->", b)
print("counts equal:", counts(a) == counts(b))
for side in ("right", "left"):
    print(side, pad(a, side=side))
print("same string, left vs right padding equal:", pad(a) == pad(a, side="left"))
long = tok.transform("S" + "x" * 12 + "T")             # 14 symbols
print("14-symbol string, T survives padding to 12:", 2 in pad(long))
```

Running it prints:

```
ids: {'<pad>': 0, 'S': 1, 'T': 2, 'x': 3}
SxxT -> [1, 3, 3, 2]  TxxS -> [2, 3, 3, 1]
counts equal: True
right [1, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0]
left [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 2]
same string, left vs right padding equal: False
14-symbol string, T survives padding to 12: False
```

The two strings have the same counts, so any model fed only counts must give them the same answer. That is the whole argument for the counting reader, and no training was needed to make it. The same string padded on each side gives two different rows. The last line shows the silent cut: the `T` of the long string is gone, and nothing complained.

## The same thing in PyTorch

The course path is the one from earlier weeks: a `Dataset` that returns a padded id tensor and a label, a `DataLoader` that stacks them into a batch, an `nn.Module`, a prediction, and a metric. The only new part is the module. We do not print outputs here, because this sandbox has no PyTorch; the scores in the next section are from the course's own runs.

```python
import torch.nn as nn

class Counts(nn.Module):                  # reader 1: symbol counts, no order
    def __init__(self): super().__init__(); self.out = nn.Linear(9, 2)
    def forward(self, ids):               # ids: (batch, 12)
        c = nn.functional.one_hot(ids, 9).sum(dim=1).float()
        return self.out(c)

class Flat(nn.Module):                    # reader 2: twelve slots as one row
    def __init__(self): super().__init__(); self.net = nn.Sequential(nn.Linear(12 * 9, 64), nn.ReLU(), nn.Linear(64, 2))
    def forward(self, ids):
        return self.net(nn.functional.one_hot(ids, 9).float().flatten(1))

class Recurrent(nn.Module):               # reader 3: a GRU, one cell reused
    def __init__(self): super().__init__(); self.gru = nn.GRU(9, 64, batch_first=True); self.out = nn.Linear(64, 2)
    def forward(self, ids):
        _, h = self.gru(nn.functional.one_hot(ids, 9).float())
        return self.out(h[-1])
```

The metric is accuracy: the share of strings answered right, with 0.50 as the guessing line.

## What the run shows

The run behind the plate used ten starting points, 4,000 training strings, 2,000 held-out strings per test, and 60 passes over the data. Its figures are transcribed from the course's printed results block, to three decimals, so we quote them as printed and do not claim per-run rows.

- Counting scores 0.573 on training strings and about 0.52 on held-out ones. The reversal check holds: the counts of the reversed strings are equal and the labels differ.
- The flattened reader scores 1.000 on training and fresh strings, 0.784 on longer ones, and 0.964 on shifted ones.
- The recurrent reader scores 1.000 on training, fresh and longer strings.
- A reader that only asks whether an `S` is present scores 1.000 on all three of the length tests, including longer strings. A presence question survives a representation that an order question does not.

## What you can now do

- Name a pair of examples the question treats differently and decide, without training, whether a representation separates them.
- Say why a counting representation cannot answer an order question at any amount of training, and which question it answers exactly.
- Read three arrangements of one read and say what each changes about the input.
- Predict, from the slots training reached, where a slot-indexing reader holds and where it drops to chance.
- Tell a limit of the input apart from a convention never tested, using the spread across runs to say which is which.

## What is still missing

- The symbols are invented. Nothing measured here says anything about genes, patient records or sentences, and the task holds one relation between two markers, so the slot counts belong to this generator and these lengths.
- The recurrence is handed over, not built. Its measurements show what one training convention cost it, not that a recurrence handles long dependence. What its carried state keeps and loses is taken up in [the chapter on whole sequences](10-whole-sequences.md).
- The repairs, and the single list that sorts them, are in that same chapter.
- A way to give each symbol numbers that carry meaning, instead of a bare id, is in [the chapter on embeddings](09-embeddings.md).

## Questions

1. `SxxT` and `TxxS` have identical symbol counts. Write down one other pair of strings from this task that a counting reader also cannot tell apart, and one pair it can tell apart.
2. Training strings were four to eight symbols long and padded on the right. Which slots held only pads during training, and what do the weights for those slots look like at the end?
3. The flattened reader scores 0.78 on longer strings. Explain why this is not "78% of the way to understanding", and say which two groups of strings the number averages over.
4. Left padding drops the flattened reader to 0.36 but a one-slot shift costs it little. Both change slots. What is different about the slots involved?
5. The recurrent reader's left-padded score is 0.76 with a spread of 0.21. Would you retrain with more data or change the padding convention first? Say what each choice assumes.
