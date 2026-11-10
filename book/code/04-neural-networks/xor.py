import math, os, random, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from value import Value

def relu(v):
    out = Value(max(0.0, v.data), (v,))
    def backward(): v.grad += (v.data > 0) * out.grad
    out._backward = backward
    return out

def sigmoid(v):
    s = 1 / (1 + math.exp(-v.data))
    out = Value(s, (v,))
    def backward(): v.grad += s * (1 - s) * out.grad
    out._backward = backward
    return out

class Neuron:
    def __init__(self, n_in, act):
        self.w = [Value(random.uniform(-1, 1)) for _ in range(n_in)]
        self.b, self.act = Value(0.5), act
    def __call__(self, xs):
        return self.act(sum((w * x for w, x in zip(self.w, xs)), self.b))
    def params(self): return self.w + [self.b]

def train(n_hidden, steps=3000, lr=0.5, seed=0):
    random.seed(seed)
    hidden = [Neuron(2, relu) for _ in range(n_hidden)]
    out = Neuron(n_hidden if n_hidden else 2, sigmoid)
    predict = lambda x: out([h(x) for h in hidden] if hidden else x)
    params = [p for n in hidden + [out] for p in n.params()]
    data = [([0, 0], 0), ([0, 1], 1), ([1, 0], 1), ([1, 1], 0)]
    for _ in range(steps):
        for p in params: p.grad = 0.0
        loss = sum((predict(x) - y) ** 2 for x, y in data)
        loss.backward()
        for p in params: p.data -= lr * p.grad
    return loss.data, [predict(x).data for x, _ in data]

if __name__ == "__main__":
    for n in (0, 4):
        loss, outputs = train(n)
        label = "one linear unit" if n == 0 else "hidden layer of four"
        print("%s: loss %.4f, outputs %s" % (label, loss, ", ".join("%.3f" % x for x in outputs)))
