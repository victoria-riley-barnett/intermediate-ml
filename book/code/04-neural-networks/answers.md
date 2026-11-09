# Answers: Neural networks

1. Two matrices in a row multiply into one matrix, and the biases fold into one bias, so the stack is a single linear layer. An activation function such as sigmoid or ReLU between them stops the folding. With either in the middle, no single linear layer reproduces the stack.
2. The weight matrix is 2 by 16. The second number is the column count, which is the width of the layer: 16 neurons.
3. XOR's two target-one points lie on one diagonal of the square and the two target-zero points on the other, so no straight line separates them. A single sigmoid unit is a line with a squashed output. Ours settled on 0.500 for all four inputs, with a squared-error total of 1.0000.
4. The network's 65 numbers (16 units times 2 weights, 16 biases, 16 output weights, 1 output bias) went into building 16 features. The table's 37 numbers went into memorising 36 cells. The network has more parameters, not fewer. What changed is who wrote the features.
5. In the PyTorch loop, `opt.zero_grad()` replaces `for p in params: p.grad = 0.0`, `loss.backward()` is the same call, and `opt.step()` replaces `for p in params: p.data -= lr * p.grad`.
