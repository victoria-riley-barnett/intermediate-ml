# Adapted from SmolML's smolml/core/value.py (MIT); Value is book/code/value.py.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from value import Value

def loss_of(w):                       # the whole model: w -> *2 -> +1 -> square
    a = w * 2
    b = a + 1
    return a, b, b ** 2

w = Value(3.0)
a, b, L = loss_of(w)
print("forward record:", a.data, b.data, L.data)

L.backward()
print("gradient that arrived at each node (loss to w):")
for name, v in [("L", L), ("b", b), ("a", a), ("w", w)]:
    print(f"  {name}: {v.grad}")

print("local slopes: multiply", 2.0, " add", 1.0, " square", 2 * b.data)
print("their product:", 2.0 * 1.0 * (2 * b.data))

h = 1e-6                              # central finite difference of the same loss
fd = (loss_of(Value(3.0 + h))[2].data - loss_of(Value(3.0 - h))[2].data) / (2 * h)
print("finite difference:", round(fd, 4), "  by hand, 8w + 4:", 8 * 3 + 4)
