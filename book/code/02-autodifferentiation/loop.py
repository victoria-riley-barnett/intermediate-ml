# The loop: forward, loss, backward, update, with .grad cleared each time.
# Both w and b are free. Adapted from SmolML's SGD optimizer (MIT).
import sys; sys.path.insert(0, "..")
from value import Value

xs = [0.8, 3.3, 6.7, 10.0]
ys = [3 * x + 7 for x in xs]

def mse_loss(w, b):
    total = Value(0.0)
    for x, y in zip(xs, ys):
        total = total + (w * x + b - y) ** 2
    return total * (1 / len(xs))

def train(lr, steps, clear=True, show=()):
    w, b = Value(2.0), Value(0.0)
    for step in range(1, steps + 1):
        loss = mse_loss(w, b)
        if clear:
            w.grad = b.grad = 0.0      # backward() adds to .grad, so empty it
        loss.backward()
        if step in show:
            print(f"lr {lr}  step {step:>4}  loss {loss.data:.4g}  w {w.data:.3f}  b {b.data:.3f}")
        w.data -= lr * w.grad
        b.data -= lr * b.grad

train(0.01, 3000, show=(1, 10, 100, 1000, 3000))
train(0.03, 200, show=(1, 10, 200))
train(0.0005, 200, show=(1, 10, 200))
train(0.01, 200, clear=False, show=(10, 50, 100, 200))
