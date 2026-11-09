# Neural networks

Everything in this course before now has been a weighted sum: each feature times a weight, the products added, a bias on the end. The most complicated model in that family carries interaction terms. An interaction term is the product of two features with a weight of its own, written by hand. A house price might depend on size, on a pool, and on the two together. Each pair of features needs its own column, and a ring of points around the origin has no term in the family that expresses it.

The week's running example is that ring. Two features are drawn around the origin, and the label is one on a ring between two radii and zero everywhere else. There are eight hundred points. Every straight cut the lab tries gets about half the points right, which is also what naming the larger class gets. We then fit one problem three ways on the same data and the same loss: a line, crossed features built by hand, and a small network. The three differ only in who wrote the features.

> **On the timeline.** This chapter inherits the 1969 row of [the architectures chapter](architectures.md): XOR and the hidden layer that answers it. Minsky and Papert showed that no single flat cut separates XOR's four cases, but two cuts do, so a second layer of units would be enough. What the row changed was the block: a unit gets a partner layer between it and the output. In 1969 nothing could set that second layer's weights. Chapter 3 supplied the method that can.

## A neuron is a linear model plus one bend

A neuron takes inputs, multiplies each by a weight, adds the products, and adds a bias. That is a linear model. Then it passes the sum through an activation function, which is a fixed, parameter-free function applied to one number. The weights, the bias and the sum are unchanged. The output is no longer a straight function of the inputs. The lab says this twice on purpose, because a neuron being a linear model plus one bend is the whole of it.

Two activations do the week's work. Sigmoid squashes any sum into the interval between zero and one, which a number needs before it can be read as a probability. Its tails go flat, and the gradient goes with them. ReLU is `max(0, x)`: zero for a negative sum, the sum itself for a positive one, with one corner supplying the bend. Hidden layers get ReLU. A binary output gets sigmoid. Choosing an activation is a modeling choice, not an implementation detail.

## An activation between two layers is what stops them collapsing into one

Chapter 3 ended on an awkward demonstration: two layers with nothing between them compute what one layer computes, because two matrices in a row are one matrix. The lab runs the check again with an activation in the middle. With the identity between them, the stacked pair and the folded single layer agree to machine precision. With sigmoid, and again with ReLU, no single linear layer reproduces the stack.

The activation is the only nonlinear ingredient in a network. Remove it and every neuron, layer and network reduces to a line. Put it in and the second layer's parameters buy something the first layer's could not.

## The width of a layer is a column count, and the depth is how many rounds it composes

A layer is drawn as one circle per neuron, and the drawing reads as one computation per circle. It is not. Every neuron in a layer sees the same input, and only the weight vectors differ. Stack those vectors as the columns of one matrix and the layer becomes a single matrix multiply. The lab computes sixteen neurons one at a time and again as one `x @ W + b`, and the two agree to rounding. The width of the layer is the column count of `W`.

Shapes then read as architecture. Eight hundred examples enter as `(800, 2)`, leave a hidden layer of sixteen units as `(800, 16)`, and leave the output layer as `(800, 1)`. The first number never changes. The second is the one someone chose.

A second layer does not see the raw features at all. It combines the sixteen numbers the first layer built from them, which is what "hierarchical representation" means. Width buys bends in one round and depth buys composition. A wide shallow network is therefore not interchangeable with a narrow deep one, even at equal parameter counts. The hidden layer's sixteen outputs are features in the same sense as any column built by hand in a spreadsheet. The difference is that the network made them.

## A feed-forward network is a chain of Linear layers and activations, and nothing else

[A feed-forward network](#fig-feedforward) shows the whole object. The input is on the left and the prediction on the right, with rectangles and capsules between them. The white rectangles own weight matrices. The gray capsules own nothing. Each rectangle is a linear layer, with its bias and its multiply. Each capsule is an activation, holding no parameters and supplying the entire bend. Nothing loops back, nothing branches, and nothing carries over from the previous example. That is what *feed-forward* means. The shapes change at the rectangles and hold at the capsules. The key gives the equations in flow order and the equivalent `nn.Sequential` call.

{{figure feedforward}}

The plate is a wiring diagram, and its widths are that network's, not this week's sixteen. Its output is ten scores put through a softmax, wider than this week's single probability. It shows no data, no loss, no gradient, and no reason for any width.

## XOR is the smallest problem that one unit cannot solve and one hidden layer can

Before the ring, take the problem from the timeline row. XOR has four inputs, the pairs of zeros and ones, and the target is one exactly when the two inputs differ. Put the four points at the corners of a square. The two with target one sit on one diagonal and the two with target zero on the other. No straight line puts the first pair on one side and the second pair on the other.

The next section runs this in pure Python. A single sigmoid unit, trained for three thousand steps, ends with every output at 0.500 and a squared-error total of 1.0000. That is the exit from the ring problem again: when no line helps, gradient descent settles on the answer that guessing already pays. One hidden layer of four ReLU units, trained the same way, reaches a total of 0.0002 and calls all four cases correctly.

## One straight line cannot separate the ring, and one hidden layer closes a loop around it

[The same points, a boundary that bends](#fig-compare-linear-hidden) puts the comparison on one page. It shows sixty points on identical axes, with thirty filled points inside a ring of thirty hollow ones. Panel A fits a linear model and draws one straight line, with filled and hollow points on both sides of it. The count under it is one. Panel B adds one hidden layer of four units and draws a closed six-sided loop, with the filled points inside and every hollow point outside. The count under it is six.

{{figure compare-linear-hidden}}

Each corner is where one hidden unit crosses zero. A unit computes a weighted sum that the ReLU cuts off below zero, so each unit is a line with an off side. The loop is what the output layer's vote over four such lines looks like where the votes balance. At sixteen units the lab shows the same accumulation. One unit's vote draws a line no better than the three ruler cuts. Two units give a wedge. Eight give a fence around the ring, and sixteen give a fence that passes for a curve. A boundary of straight pieces need not be round. It needs to separate the points.

Read the loop as this run's polygon: six is what four units produced on sixty points. The plate also labels the classes the other way round from the lab. Its filled class is the interior, while the lab's positive class is the ring.

## Crossing features by hand gets the same bend and charges a table for it

The lab spends most of its length on the alternative. Chop each feature into bins, give every pair of bins its own feature, and learn one weight per cell. Six bins per feature makes thirty-six cells. Each point's row is then thirty-five zeros and a single one that names its cell.

That model works, and it can be read. Reshaping its weights back into the grid gives a picture of where the answer is one and where it is zero. The picture is the data that went in, and the staircase it draws is the grid showing through. Two costs come with it. Every cell learns alone, so a cell holding no training points keeps whatever weight it started with, and its neighbours cannot help it. And the table grows as a power of the feature count: six bins on four features is 1,296 columns, and twenty bins on two features is 400.

The parameter counts close the comparison honestly. The crossed table has 37 parameters, and the network has 65: sixteen units each with two weights and a bias, plus sixteen output weights and one output bias. The network carries more parameters than the table, not fewer, so it is not compressing anything. Its numbers went into building sixteen features, and the table's went into memorising thirty-six cells. What changed is who wrote the features.

## By hand, in pure Python

Here is XOR from the timeline row, with the autograd class from chapter 2 doing the gradients. The code is ours, written in the style of SmolML's `DenseLayer` (`smolml/models/nn/layer.py`, MIT, by Pablo Rodríguez Martín), which computes `activation(input @ weights + biases)`. See [SmolML on GitHub](https://github.com/rodmarkun/SmolML/blob/main/smolml/models/nn/layer.py). SmolML does this over arrays. We do it one number at a time, so each step is visible. The full file, including the `relu` and `sigmoid` helpers, is `book/code/04-neural-networks/xor.py`.

```python
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
```

Calling `train(0)` gives one linear unit and `train(4)` gives one hidden layer of four. The printed output:

```text
one linear unit  loss 1.0000
  x=[0, 0]  target 0  output 0.500  call 0
  x=[0, 1]  target 1  output 0.500  call 0
  x=[1, 0]  target 1  output 0.500  call 0
  x=[1, 1]  target 0  output 0.500  call 0
hidden layer of 4  loss 0.0002
  x=[0, 0]  target 0  output 0.005  call 0
  x=[0, 1]  target 1  output 0.993  call 1
  x=[1, 0]  target 1  output 0.994  call 1
  x=[1, 1]  target 0  output 0.007  call 0
```

The single unit cannot do better than 0.500 everywhere, so it gets two of four right by calling everything zero. The hidden layer gets all four. One caution comes from running other seeds. With `seed=2` and `seed=3` the hidden layer also trains to a total near 0.0002, but with `seed=1` it stays at a total of about 1.0. Training a network depends on where it starts, and an unlucky start can leave it stuck.

## A class holds one piece of the training process, and the loop gets shorter

The other half of the week starts from a complaint the lab states plainly. The model, the data and the training process have been one pile. They come apart into five objects. The same model trained the same way gives the same numbers at every step, and what changes is how much bookkeeping is hand-written.

The title carries both halves. A classifier's *class* is the label, and a Python *class* is the device that holds a piece of the training process.

A plain Python class comes first. It has parameters in `__init__` and a `forward` method, and nothing else. The gradient clearing and the update are still outside it. `nn.Module` moves those jobs inside, so `.parameters()` returns the list the loop used to spell out and `.zero_grad()` clears every gradient at once. `nn.Linear` and `nn.Sequential` take over the arithmetic, so `forward` reads as architecture: the parts of the feed-forward plate, read top to bottom. `TensorDataset` and `DataLoader` hand the data over in shuffled batches. The optimizers finish the ladder, from full-batch gradient descent, through the same update once per batch, to `torch.optim.Adam`. Adam adapts a step size per parameter from running averages of each gradient and its square. It is the default because it is robust to the learning rate, not because it is better.

The lab copies one rung's trained weights into the next and checks that the outputs match.

## The same thing in PyTorch

This is the course path so far: Dataset, DataLoader, batch, `nn.Module`, prediction, and loss. The metric stays missing until chapter 5. The sketch below is not run here, and the lab prints no numbers for it in the sources we have.

```python
from torch.utils.data import TensorDataset, DataLoader

ds = TensorDataset(X, t)                       # features and targets, indexed together
loader = DataLoader(ds, batch_size=64, shuffle=True)

class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(2, 16), nn.ReLU(),       # 16 neurons, 2 inputs each
            nn.Linear(16, 1), nn.Sigmoid(),    # one probability out
        )
    def forward(self, x):
        return self.layers(x)

model = MLP()
opt = torch.optim.Adam(model.parameters(), lr=0.03)
for epoch in range(120):
    for xb, tb in loader:
        opt.zero_grad()
        loss = ((model(xb) - tb) ** 2).mean()  # squared error, as in the lab
        loss.backward()
        opt.step()
```

Compare it with the pure-Python loop above. The three lines `zero_grad`, `backward` and `step` are the three jobs the `for p in params` lines did by hand.

## What you can now do

- Say why two layers with nothing between them are one layer, and what an activation changes.
- Read a network's shapes and separate the example count from the number someone chose.
- Name the parts of [A feed-forward network](#fig-feedforward) that own parameters and the parts that hold none.
- Say what one hidden unit computes, and why a boundary of straight pieces can enclose a region.
- Show in a few lines of Python that one linear unit cannot learn XOR and a small hidden layer can.

## What is still missing

- Everything here is binary, with one probability at the output and squared error as the loss. Chapter 6 widens the output to many classes.
- The accuracy figures come from points the model trained on. Chapter 5 gives the evaluation that says whether they mean anything, and chapter 7 asks why they may not.
- Nothing gives a procedure for choosing a width, a depth or a bin count. Chapter 7 returns to how much model is too much.
- The hidden units read back as straight lines: a boundary, not an explanation.

## Questions

1. Why do two linear layers with nothing between them compute the same thing as one layer? What must sit between them to change that?
2. A layer has 2 inputs and 16 units. What shape is its weight matrix, and what does the second number tell you about the layer?
3. Why can a single sigmoid unit not solve XOR, and what output did ours settle on?
4. The crossed-feature table had 37 parameters and the network 65. Why does the lab say the network is not compressing anything?
5. In the pure-Python example, which lines do `zero_grad`, `backward` and `step` replace in the PyTorch loop?
