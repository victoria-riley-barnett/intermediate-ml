# Answers: the full encoder

1. Differentiating `x + F(x)` gives `1 + dF/dx`. At `x = 0` the branch slope is -3, so the block's derivative is 1 + (-3) = -2. The identity adds the same 1 everywhere, but it does not bound the sum: a branch slope below -1 makes the total negative. What the 1 guarantees is a route from output to input whose derivative is one; it does not guarantee that the whole derivative is positive or near one.

2. The mean of the row is 64.0 / 32 = 2.0. The squared deviations sum to 200.0, so the variance is 200.0 / 32 = 6.25 and sigma = 2.5. The first feature, -1.5, becomes (-1.5 - 2.0) / 2.5 = -1.4 after standardising. With gamma = 1.5 and beta = -0.5 it becomes 1.5 x (-1.4) + (-0.5) = -2.6. The learned vectors have 32 numbers each, 64 parameters in all.

3. The statistics are taken over the 32 features of each row. If they were taken down the 48 positions, each number would depend on which other positions are in the sequence, and on how much padding the batch carried, so one position's output would change when its neighbours changed. The feature axis has a fixed size by construction, so its statistics mean the same thing for every position and every length.

4. In a `(B, 48, 32)` input, attention maps to `(B, 48, 32)`, the feed-forward layer goes `(B, 48, 32)` to `(B, 48, 128)` and back to `(B, 48, 32)`, and each addition joins two tensors of identical shape. Because the output type equals the input type, blocks can be stacked with no reshaping. That makes depth possible to choose; it does not make a deep stack train. The residual routes and the normalisation do that work, and the lab's dropped residual shows the shapes alone cannot warn you.

5. Pre-norm puts the norm inside the branch: `x + attn(norm(x))`. The identity route then passes through nothing, so the stream keeps the scale and gradient it arrived with, which lets deep stacks train without a warmup schedule. Post-norm computes `norm(x + F(x))`, which rescales the residual path itself at every block. The price of pre-norm is that the stream is unbounded, so one final normalisation is needed before the readout.
