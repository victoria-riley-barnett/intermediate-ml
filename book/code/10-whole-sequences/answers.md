# Answers: chapter 10, Why whole sequences are hard

1. The mean of the rows does not depend on their order, so both strings give identical vectors. Any model is a function of that vector, so it returns one answer for both. The label differs, so it is wrong on one of them, whatever the weights, depth or data.
2. 48 x 20 x 64 = 61,440 weights (plus biases). A string of length 60 gives 1200 inputs where the layer expects 960, so the first matrix multiply raises a shape error. It is an error, not a low score.
3. Span = 1 + depth x (k - 1). With k = 5 and depth 10 the span is 41, enough to cover two positions 40 apart, so about ten layers. Fewer layers (depth 9 gives 37) do not reach.
4. Each filter reports one number, its largest match count, which is 3 in both strings; only where the peak sits differs. The maximum discards the location. Pooling would have to keep the position of the two peaks (or compare them), which is a relation between distant positions.
5. It is a limit of training coverage. The flattened vector does differ between the pair (24 of 192 numbers on the plate), so the map can carry the order. The score splits between delivered slots and other quarters, which shows it learned where the motifs sat rather than which came first.
