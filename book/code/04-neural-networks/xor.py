import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from value import Value          # the shared autograd class (book/code/value.py)

def relu(v):                      # max(0, x): one corner supplies the bend
    out = Value(max(0.0, v.data), (v,))
    def _backward(): v.grad += (v.data > 0) * out.grad
    out._backward = _backward
    return out

def sigmoid(v):                   # squash a sum into (0, 1)
    s = 1 / (1 + math.exp(-v.data))
    out = Value(s, (v,))
    def _backward(): v.grad += s * (1 - s) * out.grad
    out._backward = _backward
    return out

class Neuron:                     # a weighted sum and a bias, then an activation
    def __init__(self, n_in, act):
        self.w = [Value(random.uniform(-1, 1)) for _ in range(n_in)]
        self.b = Value(0.5)
        self.act = act
    def __call__(self, xs):
        return self.act(sum((w * x for w, x in zip(self.w, xs)), self.b))
    def params(self):
        return self.w + [self.b]

def train(n_hidden, steps=3000, lr=0.5, seed=0):
    random.seed(seed)
    hidden = [Neuron(2, relu) for _ in range(n_hidden)]
    out = Neuron(n_hidden if n_hidden else 2, sigmoid)
    def predict(x):
        return out([h(x) for h in hidden] if hidden else x)
    params = [p for n in hidden + [out] for p in n.params()]
    data = [([0, 0], 0), ([0, 1], 1), ([1, 0], 1), ([1, 1], 0)]   # XOR
    for _ in range(steps):
        for p in params: p.grad = 0.0
        loss = sum((predict(x) - y) ** 2 for x, y in data)
        loss.backward()
        for p in params: p.data -= lr * p.grad
    return [(x, y, predict(x).data) for x, y in data], loss.data

if __name__ == "__main__":
    for n_hidden in (0, 4):
        rows, loss = train(n_hidden)
        print(("one linear unit" if n_hidden == 0 else "hidden layer of %d" % n_hidden), " loss %.4f" % loss)
        for x, y, p in rows:
            print("  x=%s  target %d  output %.3f  call %d" % (x, y, p, p > 0.5))
