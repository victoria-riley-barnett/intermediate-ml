# Layer norm and a residual add, written the way SmolML writes things: plain
# Python, no libraries. This one is ours; SmolML has no layer norm.
import math, sys
sys.path.insert(0, "..")
from value import Value

def layer_norm(row, gamma, beta, eps=1e-5):
    d = len(row)
    mu = sum(row) / d                                  # one number per row
    var = sum((x - mu) ** 2 for x in row) / d          # population variance
    sigma = math.sqrt(var + eps)
    return [g * (x - mu) / sigma + b for x, g, b in zip(row, gamma, beta)]

row = [-1.5, 2.0, -1.0, 3.5, 0.0, 1.0, 2.0, 1.0]
out = layer_norm(row, [1.0] * 8, [0.0] * 8)
print("mean", round(sum(out) / 8, 4) + 0.0, "var", round(sum(v * v for v in out) / 8, 4))

def input_gradient(residual, depth=10, slope=0.1):
    x = Value(1.0)
    h = x
    for _ in range(depth):
        f = h * slope                      # a weak branch F(h) = 0.1 * h
        h = h + f if residual else f       # y = h + F(h)   or   y = F(h)
    h.backward()
    return x.grad

print("plain stack,    d output / d input =", input_gradient(False))
print("residual stack, d output / d input =", round(input_gradient(True), 4))
