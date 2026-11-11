+++
title = "Three readers"
kind = "experiment"
frame = "evidence"
define = "A model can read a string by counting its symbols, by giving each position its own weights, or by stepping along it with one shared set of weights, and each choice decides what the model can learn."
plates = ["compare-three-readers"]
see = ["order-blind-counts", "padding", "position", "embedding", "recurrent-network", "attention"]
sources = [
  { file = "411/weeks/week08_sequence_failure/lecture.md", heading = "Three ways to turn a string into numbers" },
  { file = "411/weeks/week08_sequence_failure/lecture.md", heading = "Reading a list" },
  { file = "411/weeks/week08_sequence_failure/lecture.md", heading = "Five tests for a model that reads strings" },
  { file = "411/weeks/week08_sequence_failure/lecture.md", heading = "Why the flattened model scores 0.78 on longer strings" },
  { file = "smolml/smolml/models/nn/README.md", heading = "The Neuron" },
]
+++

A network takes a fixed number of numbers in, but a string can be any length, so something has to turn the string into numbers first. Three ways of doing it are worth comparing.

The first reader **counts**: how many times each symbol appears, and nothing about where. The second **flattens**: it gives every position its own learned numbers, lays them side by side in one row and reads the row all at once. The third is **recurrent**: it steps along the string one symbol at a time, using the same small set of weights at every step and carrying a short summary of what it has read so far (see [[recurrent-network]]).{{note: A weight is the number a unit multiplies its input by; the model learns the weights. Explanation adapted from SmolML, models/nn (MIT).}}

To tell them apart, give all three one task. A string holds exactly one `S`, one `T` and otherwise `x`, and the question is whether `S` comes before `T`. The strings `SxxT` and `TxxS` have exactly the same counts, one `S`, one `T` and two `x`, so the counting reader sees them as the same input and can only guess (the pair is explained in [[order-blind-counts]]). The other two readers see order. Each is trained on the same 4,000 short strings and then scored on strings it has not seen, including strings it was built to find awkward: longer ones, and ones moved along by padding or a one-slot shift (see [[padding]] and [[position]]). Each score is the share answered right; guessing scores 0.50.{{note: Each score is an average over 10 runs from different random starting points.}}

The counting reader stays near 0.50 on every test, as it must. The flattened reader is perfect on new strings of the training lengths, 1.00, but falls to 0.78 on longer strings,{{from: compare-three-readers}} because the weights for the last four positions never saw a symbol in training. The recurrent reader scores 1.00 on longer strings, since its weights do not depend on the length, though it is shaky when the positions move. Counting throws away the order, flattening ties what it learns to positions, and the recurrent reader pays for its freedom with a summary of fixed size. The next step, [[attention]], is the field's answer to that.

{{plate compare-three-readers}}
