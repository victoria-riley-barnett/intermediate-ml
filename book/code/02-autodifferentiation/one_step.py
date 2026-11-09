# One weight, one backward() call, one step. Adapted from SmolML's
# smolml/core/value.py, smolml/utils/losses/losses.py and
# smolml/utils/optimizers/optimizers.py (MIT).
import sys; sys.path.insert(0, "..")
from value import Value

xs = [0.8, 3.3, 6.7, 10.0]
ys = [3 * x + 7 for x in xs]          # no noise, so the true weight is exactly 3

def mse_loss(w, b):
    total = Value(0.0)
    for x, y in zip(xs, ys):
        error = w * x + b - y          # prediction minus truth
        total = total + error ** 2     # square it
    return total * (1 / len(xs))       # average

w, b = Value(2.6), 7.0                 # w is tracked; b is held at its true value
loss = mse_loss(w, b)
loss.backward()
print(f"loss {loss.data:.4f}   dL/dw {w.grad:.3f}")

lr = 0.01
w.data -= lr * w.grad                  # the update rule
print(f"w after one step: {w.data:.4f}")
