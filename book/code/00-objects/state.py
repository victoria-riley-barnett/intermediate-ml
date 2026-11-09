# Two objects that hold state: a number that remembers where it came from
# (the idea behind SmolML's Value) and a layer that holds its own weights
# (the idea behind SmolML's DenseLayer). Ours, much reduced.

class Value:
    def __init__(self, data, parents=()):
        self.data = data                 # state: the number itself
        self.parents = parents           # state: the values it was made from

    def __add__(self, other):            # behaviour: build a new Value
        return Value(self.data + other.data, (self, other))

    def __mul__(self, other):
        return Value(self.data * other.data, (self, other))


class DenseLayer:
    def __init__(self, weights, bias):
        self.weights = weights           # state: one weight per input
        self.bias = bias                 # state: one constant

    def forward(self, x):                # behaviour: weighted sum plus constant
        total = self.bias
        for w, xi in zip(self.weights, x):
            total += w * xi
        return total


a, b = Value(2.0), Value(3.0)
c = a * b + Value(1.0)
print("c.data =", c.data, "| made from", [p.data for p in c.parents])

layer = DenseLayer([0.5, -1.0], 0.25)
print("forward([4, 1]) =", layer.forward([4.0, 1.0]))
layer.weights[0] = 1.5                   # change the state ...
print("forward([4, 1]) =", layer.forward([4.0, 1.0]))   # ... same call, new answer

alias = layer                            # a second name, not a second layer
alias.bias = 0.0
print("layer.bias =", layer.bias)
