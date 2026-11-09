# Backpropagation

Chapter 2 ran a loop: compute the loss, call `.backward()`, and move each weight a small step against the gradient it received. We took that call on trust. This chapter opens it. Here is the smallest case. A single weight `w` is doubled, then 1 is added, then the result is squared, so the loss is (2w + 1)². At w = 3 the loss is 49, and we want to know how fast it changes if we nudge w. PyTorch answers 28. How did it get 28 without anyone writing down a formula for the whole expression?

The answer is that a model is a chain of small operations, and each small operation knows its own slope. A forward pass runs the chain in order on one example. Backpropagation (also called the backward pass) runs the chain in reverse. At each step it takes that operation's slope, measured at the values the operation saw going forward, and multiplies it into a running product. The product that reaches a weight is the gradient of the loss with respect to that weight. No derivative of the whole model is ever written down.

> **On the timeline.** The row this chapter inherits is 1986: backpropagation. The 1986 paper by Rumelhart, Hinton and Williams showed that the method could train networks with hidden layers. The reverse-mode calculation itself is older: Linnainmaa published it in 1970, and Werbos applied it to networks in 1974. It changed neither the block nor the input of a network. It changed how a network with many weights is trained. See [the architectures chapter](architectures.md).

The models in this chapter are small on purpose, none larger than two layers, so that every number can be read. What they share is one object: a graph whose nodes still hold their forward values when the backward walk arrives. The week's question is whether local derivatives, multiplied along that graph, match the gradient we can observe by nudging a weight. We hold the architecture fixed here. Chapter 4 asks what happens when width, depth and activation change.

## The chain rule multiplies one local derivative per operation

A derivative is a slope: how much the output changes for a small change in an input. The chain rule says that when one operation feeds another, the slope of the whole is the product of the slopes of the parts. [The chain rule](#fig-eq-chain-rule) writes the derivative of the loss with respect to a weight as a product of three factors, one per operation in the composition.

{{figure eq-chain-rule}}

Look at how the plate builds its example. One layer has weights (1, 5, 2) and sees inputs (2, 0, 3). The target is 5 and the output is 8. Each factor is the slope of exactly one operation, evaluated at the values that operation received. The loss's slope needs only the output and the target: 8 − 5 = 3. The multiply's slope is the input vector (2, 0, 3). The middle factor is 1 because its operation passes its input through unchanged. It is 1 because of that operation, not because the chain rule drops a term. The product is 3 · 1 · (2, 0, 3) = (6, 0, 9).

Two things follow. A zero in any factor zeroes the product, which is why the weight that sees the input 0 gets gradient 0. And no factor refers to any operation but its own, which lets the same product be assembled at every node of a much larger graph.

The plate does not say in which order to apply the rule across many operations. Its model also has no bias term and no nonlinearity, so it shows the rule but not yet the walk.

## The graph you build forward is the one you walk back

Now we use a model with a hidden layer. [The graph you build forward is the one you walk back](#fig-trace-backward-graph) runs one example through five stages twice. The first panel reads left to right and leaves every intermediate value on the graph: the hidden sums, the activations, the output sum, the output and the loss. The second panel walks the same five stages right to left. At each node it prints three things: the gradient that arrived, the node's own local derivative, and their product. That product is what the node hands to the stage before it.

{{figure trace-backward-graph}}

The forward numbers are easy to follow. The example has inputs 1.00 and 0.50. A 3 by 2 grid of weights turns them into three hidden sums of 0.5000, -0.1000 and 0.7500. A logistic function, which squeezes any number into the range between 0 and 1, turns those into activations of 0.6225, 0.4750 and 0.6792. Three more weights, 0.90, -0.70 and 0.40, combine the activations into an output sum of 0.5494. A second logistic gives the output 0.6340. Against the target 0.10 the squared loss is 0.1426.

Going back, the loss hands down the difference between output and target, 0.5340. The output logistic multiplies that by its own slope, 0.2320, and passes on 0.1239. The output sum multiplies 0.1239 by each activation to fill the three weight gradients, and by each weight to pass 0.1115, -0.0867 and 0.0496 down. Each hidden logistic multiplies what arrives by its own slope, giving 0.0262, -0.0216 and 0.0108. Each hidden sum then multiplies by the inputs and fills the 3 by 2 grid of weight gradients.

The same step repeats at every node because the rule is local. A logistic multiplies by its slope, which can be written in terms of its own output. A sum multiplies by whatever sits on the other side of each term, once to fill that term's weight gradient and once to hand a gradient down. Nothing at a node consults the rest of the model.

Two consequences come from the forward panel. First, weights receive gradients and inputs do not. The input is data, and nothing about it is updated. Second, the local derivatives are taken at the forward values, so those values must still exist when the walk reaches the node. This is why PyTorch records each operation together with the values that flowed through it.

Every gradient in the plate was checked against a central finite difference of the same loss before the figure was drawn. A finite difference nudges a weight a tiny amount up and down, reruns the forward pass, and divides the change in loss by the size of the nudge. That check turns the reverse walk from a claim into evidence.

The plate shows one example and no update. The weights are fixed, the gradient is reported, and nothing says whether that direction is worth following.

## Two sums back for every one forward

A fair worry is cost. If the backward pass is a second computation, how much does a training step cost? [Two sums back for every one forward](#fig-budget-backward-cost) counts multiplies. The network reads three numbers, passes them through a 4 by 3 weight matrix, a ReLU, and a 2 by 4 weight matrix, and writes two numbers. It has 20 weights: 12 in the first matrix and 8 in the second.

{{figure budget-backward-cost}}

The forward sweep applies each weight once, so it costs 12 + 8 = 20 multiplies. The backward sweep applies each weight twice at the second layer. One weighted sum makes that layer's weight gradients (8 multiplies). Another makes the gradient handed to the layer before (8 more). The first layer needs only its weight gradients (12). The gradient into the input is never computed, because the input is data. Backward therefore costs 28 multiplies against 20 forward, a ratio of 1.40. Forward plus backward is 48 multiplies, or 2.40 forward passes. A step costs a small multiple of a forward pass, not a forward pass per weight.

The second panel is about models in general, not this one. Let s be the first layer's share of all weights. The step cost is the line 3 − s, measured in forward passes, and the backward cost is the line 2 − s. So the step cost lies between 2 and 3 for every model. The dots carry the same stack out to 1, 2, 4, 8, 16 and 32 hidden layers, and the cost does not climb. The accounting is per weight rather than per layer, so depth adds stages but not price. The drawn model sits at s = 0.60 and costs 2.40 forward passes.

Multiplies do not measure everything. The forward values must be held in memory for the walk. A count of multiplies is not a time. And none of this says whether a step made the loss smaller, or how far to go.

## By hand, in pure Python

We can build the whole mechanism in a few lines. The class `Value` in `book/code/value.py` is a number that remembers its parents and the rule for passing a gradient back to them. It is adapted from SmolML's [`smolml/core/value.py`](https://github.com/rodmarkun/SmolML/blob/main/smolml/core/value.py) (MIT), including its `backward()` method. That method first orders the nodes so that each one comes after everything it depends on, which is called a topological sort. It then visits them in reverse. The example below applies it to the (2w + 1)² model at w = 3. The source is `book/code/03-backpropagation/trace.py`.

```python
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
```

Running it prints:

```
forward record: 6.0 7.0 49.0
gradient that arrived at each node (loss to w):
  L: 1.0
  b: 14.0
  a: 14.0
  w: 28.0
local slopes: multiply 2.0  add 1.0  square 14.0
their product: 28.0
finite difference: 28.0   by hand, 8w + 4: 28
```

Read it from the top. The forward record is 6, 7, 49: the doubled value, the shifted value, and the loss. The backward walk starts with a 1 at the loss, because the loss changes by one unit when itself changes by one unit. The square's slope is twice the 7 it saw, which is 14, so 14 arrives at the addition. Adding passes slopes through unchanged, so 14 arrives at the multiply. The multiply's slope with respect to w is the other factor, 2, so 28 arrives at w. The local slopes 2, 1 and 14 multiply to 28.

Three independent routes agree. The backward walk gives 28. The product of the local slopes gives 28. And a hand derivative does too: expanding gives 4w² + 4w + 1, whose slope is 8w + 4, which is 28 at w = 3. The finite difference lands on the same number. Notice that the square's slope used the value 7, which existed only during the forward pass. That is the reason the graph keeps its values.

## The same thing in PyTorch

PyTorch does the same bookkeeping, for tensors instead of single numbers. The course path so far runs Dataset, DataLoader, batch, `nn.Module`, prediction and metric, with a loss and an update added in chapter 2. This chapter adds nothing to that path. It explains the one call inside it. The same miniature model looks like this.

```python
import torch

w = torch.tensor(3.0, requires_grad=True)
step1 = w * 2
step2 = step1 + 1
step3 = step2 ** 2
step3.backward()
print(w.grad.item())   # 28.0, the same number
```

Setting `requires_grad=True` tells PyTorch to record the graph around `w`. Each line stores an operation and the values it saw. Calling `.backward()` on the result walks that record in reverse and leaves one gradient, shaped like the weight, in `w.grad`. In a full model that is `p.grad` for every parameter `p`. Because `backward()` adds into `.grad` rather than replacing it, a training loop clears the gradients between steps.

PyTorch is not the only way to get derivatives. A style called forward mode carries slopes forward alongside the values. For a model with many weights and one loss, the backward style is the cheaper one, and it is the one `.backward()` uses.

## What you can now do

- Write a weight's gradient as a product of one local derivative per operation, and say what each factor was evaluated at.
- Read a computation graph forward for values and backward for gradients, naming at each node the arriving gradient and the local derivative.
- Say why every weight receives a gradient and the model's input does not.
- State the cost of one training step in forward passes, and why it does not grow with depth.
- Check a hand-derived gradient against a central finite difference of the same loss.

## What is still missing

- Nothing here says how large a step to take, or whether following the gradient reduces the loss on new data. [Chapter 4](04-neural-networks.md) trains a network and begins to ask.
- The models here are small. Width, depth and the choice of activation are the subject of [chapter 4](04-neural-networks.md).
- The loss used here is squared error. Losses for choosing between several classes come in [chapter 6](06-multiclass.md).
- A low training loss does not show that a model works on new data. [Chapter 7](07-generalization.md) takes that up.

## Sources

What the figures in this chapter rest on, checked against the publisher. `admin/SOURCES.md` holds the full registry and the identifiers that were rejected.

- Rumelhart, Hinton & Williams (1986). Learning representations by back-propagating errors. *Nature* 323, 533-536. doi:10.1038/323533a0

## Questions

1. Run the (2w + 1)² model by hand at w = 1. Write the forward record, the three local slopes, their product, and check it against 8w + 4.
2. The square's local slope at w = 3 used the value 7. Why must a backward pass have access to that value, and what would go wrong if the graph threw forward values away?
3. In the chain rule plate, the second weight sees the input 0 and its gradient is 0. Explain this from the three factors. Does it mean the weight does not matter?
4. Suppose a two-layer network had 10 weights in each layer. Count the forward multiplies, the backward multiplies and the step cost in forward passes, using the counting rule from the budget plate.
5. In the backward plate, the output is 0.6340 and the loss hands back 0.5340. Compute the output logistic's slope, the gradient it passes on, and then the gradient of the loss with respect to the first output weight, whose hidden activation is 0.6225.
